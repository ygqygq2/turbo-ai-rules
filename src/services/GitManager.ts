/**
 * Git 管理服务
 */

import * as path from 'path';
import simpleGit, { SimpleGit, SimpleGitOptions } from 'simple-git';
import * as vscode from 'vscode';

import type { GitAuthentication, RuleSource } from '../types/config';
import { ErrorCodes, GitError } from '../types/errors';
import type { GitStatus, PullResult } from '../types/git';
import {
  DEFAULT_BRANCH,
  GIT_CLONE_DEPTH,
  GLOBAL_CACHE_DIR,
  SOURCES_CACHE_DIR,
} from '../utils/constants';
import { ensureDir, pathExists, safeRemove } from '../utils/fileSystem';
import { Logger } from '../utils/logger';
import { expandHome } from '../utils/path';
import { validateBranchName, validateGitUrl } from '../utils/validator';
import { LocalConfigManager } from './LocalConfigManager';

/**
 * Git 管理器
 */
export class GitManager {
  private static instance: GitManager;
  private gitInstances: Map<string, SimpleGit> = new Map();
  private globalCachePath: string;
  private localConfigManager: LocalConfigManager;

  private constructor() {
    // 全局缓存路径：~/.cache/turbo-ai-rules/sources/ (或 XDG_CACHE_HOME)
    this.globalCachePath = path.join(GLOBAL_CACHE_DIR, SOURCES_CACHE_DIR);
    this.localConfigManager = LocalConfigManager.getInstance();
  }

  /**
   * 获取 GitManager 实例
   */
  public static getInstance(): GitManager {
    if (!GitManager.instance) {
      GitManager.instance = new GitManager();
    }
    return GitManager.instance;
  }

  /**
   * 获取全局缓存路径
   */
  public getGlobalCachePath(): string {
    return this.globalCachePath;
  }

  /**
   * 获取源的本地路径
   */
  public getSourcePath(sourceId: string): string {
    return path.join(this.globalCachePath, sourceId);
  }

  /**
   * 获取或创建 Git 实例
   * @param repoPath 仓库路径
   * @param authentication 认证配置（可选，用于 SSH）
   */
  private getGitInstance(repoPath: string, authentication?: GitAuthentication): SimpleGit {
    const cacheKey = `${repoPath}:${authentication?.type || 'none'}`;
    if (!this.gitInstances.has(cacheKey)) {
      const options: Partial<SimpleGitOptions> = {
        baseDir: repoPath,
        binary: 'git',
        maxConcurrentProcesses: 6,
      };

      // SSH 认证配置
      if (authentication?.type === 'ssh') {
        const sshCommand = this.buildSshCommand(authentication);
        if (sshCommand) {
          options.config = ['core.sshCommand=' + sshCommand];
        }
      }

      this.gitInstances.set(cacheKey, simpleGit(options));
    }
    return this.gitInstances.get(cacheKey)!;
  }

  /**
   * 构建 SSH 命令
   * @param authentication SSH 认证配置
   * @returns SSH 命令字符串
   */
  private buildSshCommand(authentication: GitAuthentication): string | null {
    if (authentication.type !== 'ssh') {
      return null;
    }

    const parts: string[] = ['ssh'];

    // 使用自定义 SSH key
    if (authentication.sshKeyPath) {
      const keyPath = expandHome(authentication.sshKeyPath);
      parts.push('-i', keyPath);
    }

    // 其他 SSH 选项
    parts.push('-o', 'StrictHostKeyChecking=no'); // 可选：跳过主机验证（不太安全）
    parts.push('-o', 'UserKnownHostsFile=/dev/null'); // 可选：不保存 known_hosts

    return parts.join(' ');
  }

  /**
   * 构建认证后的 Git URL（用于 HTTPS token）
   * @param gitUrl 原始 Git URL
   * @param authentication 认证配置
   * @returns 认证后的 URL 或原 URL
   */
  private buildAuthenticatedUrl(gitUrl: string, authentication?: GitAuthentication): string {
    if (!authentication || authentication.type !== 'token' || !authentication.token) {
      return gitUrl;
    }

    // 支持 HTTPS URL 的 token 嵌入
    // 例如：https://github.com/user/repo.git -> https://<token>@github.com/user/repo.git
    const httpsMatch = gitUrl.match(/^https:\/\/([^/]+)(\/.*\.git)$/);
    if (httpsMatch) {
      const [, host, path] = httpsMatch;
      return `https://${authentication.token}@${host}${path}`;
    }

    // 不支持的 URL 格式，返回原值
    return gitUrl;
  }

  /**
   * 验证 Git URL
   */
  public validateGitUrl(url: string): boolean {
    return validateGitUrl(url);
  }

  /**
   * 获取源的认证配置
   * @param sourceId 源 ID
   * @returns 认证配置或 undefined
   */
  private async getAuthentication(sourceId: string): Promise<GitAuthentication | undefined> {
    // 从 VSCode 配置读取
    const configKey = `turbo-ai-rules.sources.${sourceId}.authentication`;
    const auth = vscode.workspace.getConfiguration().get<GitAuthentication>(configKey);
    return auth;
  }

  /**
   * 测试 Git 仓库连接（快速验证）
   * @param gitUrl Git 仓库 URL
   * @param authentication 认证配置
   * @param timeoutMs 超时时间（毫秒），默认 10 秒
   * @returns 是否可访问
   */
  public async testConnection(
    gitUrl: string,
    authentication?: GitAuthentication,
    timeoutMs: number = 10000,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      Logger.info('Testing Git connection', { gitUrl, authType: authentication?.type || 'none' });

      // 构建认证后的 URL
      let testUrl = gitUrl;
      const options: string[] = [];

      if (authentication?.type === 'token') {
        testUrl = this.buildAuthenticatedUrl(gitUrl, authentication);
      } else if (authentication?.type === 'ssh') {
        const sshCommand = this.buildSshCommand(authentication);
        if (sshCommand) {
          options.push('-c', `core.sshCommand=${sshCommand}`);
        }
      }

      // 使用 ls-remote 测试连接（不克隆，只获取远程信息）
      const git = simpleGit();

      // 创建带超时的 Promise
      const testPromise = git.listRemote([...options, testUrl]);

      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), timeoutMs);
      });

      await Promise.race([testPromise, timeoutPromise]);

      Logger.info('Git connection test successful', { gitUrl });
      return { success: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      Logger.warn('Git connection test failed', { gitUrl, error: message });

      // 提供更友好的错误信息
      let friendlyError = message;
      if (message.includes('timeout') || message.includes('Connection timeout')) {
        friendlyError = 'Connection timeout - repository may not exist or network is slow';
      } else if (message.includes('Authentication failed') || message.includes('403')) {
        friendlyError = 'Authentication failed - check your credentials';
      } else if (message.includes('not found') || message.includes('404')) {
        friendlyError = 'Repository not found - check the URL';
      } else if (message.includes('Network is unreachable') || message.includes('ENOTFOUND')) {
        friendlyError = 'Network error - check your internet connection';
      }

      return { success: false, error: friendlyError };
    }
  }

  /**
   * 克隆仓库
   * @param source 规则源配置
   * @param timeoutMs 超时时间（毫秒），默认 60 秒
   */
  public async cloneRepository(source: RuleSource, timeoutMs: number = 60000): Promise<string> {
    try {
      // 验证 URL
      if (!this.validateGitUrl(source.gitUrl)) {
        throw new GitError(
          `Invalid Git URL: ${source.gitUrl}`,
          'invalid-url',
          ErrorCodes.GIT_INVALID_URL,
        );
      }

      // 确保全局缓存目录存在
      await ensureDir(this.globalCachePath);

      const targetPath = this.getSourcePath(source.id);

      // 检查是否已经存在
      if (await pathExists(targetPath)) {
        Logger.info('Repository already exists, skipping clone', {
          sourceId: source.id,
          path: targetPath,
        });
        return targetPath;
      }

      // 获取认证配置
      const authentication = await this.getAuthentication(source.id);

      Logger.info('Cloning repository', {
        sourceId: source.id,
        gitUrl: source.gitUrl,
        branch: source.branch || DEFAULT_BRANCH,
        authType: authentication?.type || 'none',
        timeoutMs,
      });

      const git = simpleGit();
      const branch = source.branch || DEFAULT_BRANCH;

      // 克隆选项
      const cloneOptions: string[] = ['--depth', GIT_CLONE_DEPTH.toString(), '--branch', branch];

      // 构建认证后的 URL（HTTPS token）或使用原 URL（SSH/none）
      let cloneUrl = source.gitUrl;
      if (authentication?.type === 'token') {
        cloneUrl = this.buildAuthenticatedUrl(source.gitUrl, authentication);
      } else if (authentication?.type === 'ssh') {
        // SSH：配置 core.sshCommand
        const sshCommand = this.buildSshCommand(authentication);
        if (sshCommand) {
          cloneOptions.push('-c', `core.sshCommand=${sshCommand}`);
        }
      }

      // 添加超时控制
      const clonePromise = git.clone(cloneUrl, targetPath, cloneOptions);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Clone operation timeout')), timeoutMs);
      });

      await Promise.race([clonePromise, timeoutPromise]);

      Logger.info('Repository cloned successfully', {
        sourceId: source.id,
        path: targetPath,
      });

      return targetPath;
    } catch (error) {
      Logger.error('Failed to clone repository', error as Error, {
        sourceId: source.id,
        gitUrl: source.gitUrl,
      });

      throw new GitError(
        `Failed to clone repository: ${source.gitUrl}`,
        'clone-failed',
        ErrorCodes.GIT_CLONE_FAILED,
        error as Error,
      );
    }
  }

  /**
   * 拉取更新
   * @param sourceId 规则源 ID
   * @param branch 分支名称
   * @param timeoutMs 超时时间（毫秒），默认 30 秒
   */
  public async pullUpdates(
    sourceId: string,
    branch?: string,
    timeoutMs: number = 30000,
  ): Promise<PullResult> {
    try {
      const repoPath = this.getSourcePath(sourceId);

      // 检查仓库是否存在
      if (!(await pathExists(repoPath))) {
        throw new GitError(
          `Repository not found: ${sourceId}`,
          'pull-failed',
          ErrorCodes.GIT_PULL_FAILED,
        );
      }

      Logger.info('Pulling updates', { sourceId, branch, timeoutMs });

      // 获取认证配置
      const authentication = await this.getAuthentication(sourceId);
      const git = this.getGitInstance(repoPath, authentication);

      // 获取当前提交 SHA
      const beforeSha = await git.revparse(['HEAD']);

      // 拉取更新（添加超时控制）
      const branchToPull = branch || DEFAULT_BRANCH;
      const pullPromise = git.pull('origin', branchToPull);
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Pull operation timeout')), timeoutMs);
      });

      await Promise.race([pullPromise, timeoutPromise]);

      // 获取更新后的提交 SHA
      const afterSha = await git.revparse(['HEAD']);

      const hasUpdates = beforeSha !== afterSha;

      if (hasUpdates) {
        // 获取更新的文件列表
        const diff = await git.diff([beforeSha, afterSha, '--name-only']);
        const updatedFiles = diff.split('\n').filter((f) => f.trim() !== '');

        Logger.info('Updates pulled successfully', {
          sourceId,
          filesChanged: updatedFiles.length,
        });

        return {
          success: true,
          hasUpdates: true,
          updatedFiles,
        };
      }

      Logger.info('No updates available', { sourceId });

      return {
        success: true,
        hasUpdates: false,
      };
    } catch (error) {
      Logger.error('Failed to pull updates', error as Error, { sourceId });

      return {
        success: false,
        hasUpdates: false,
        error: (error as Error).message,
      };
    }
  }

  /**
   * 获取仓库状态
   */
  public async getRepoStatus(sourceId: string): Promise<GitStatus | null> {
    try {
      const repoPath = this.getSourcePath(sourceId);

      if (!(await pathExists(repoPath))) {
        return null;
      }

      const git = this.getGitInstance(repoPath);

      // 获取当前分支
      const branch = await git.revparse(['--abbrev-ref', 'HEAD']);

      // 获取状态
      const status = await git.status();

      // 获取最后一次提交信息
      const log = await git.log({ maxCount: 1 });
      const lastCommit = log.latest;

      return {
        path: repoPath,
        branch: branch.trim(),
        isDirty: !status.isClean(),
        hasRemoteUpdate: false, // 需要 fetch 才能知道
        lastCommitSha: lastCommit?.hash,
        lastCommitDate: lastCommit?.date ? new Date(lastCommit.date) : undefined,
      };
    } catch (error) {
      Logger.error('Failed to get repository status', error as Error, {
        sourceId,
      });
      return null;
    }
  }

  /**
   * 切换分支
   */
  public async switchBranch(sourceId: string, branch: string): Promise<void> {
    try {
      if (!validateBranchName(branch)) {
        throw new GitError(
          `Invalid branch name: ${branch}`,
          'branch-not-found',
          ErrorCodes.GIT_BRANCH_NOT_FOUND,
        );
      }

      const repoPath = this.getSourcePath(sourceId);

      if (!(await pathExists(repoPath))) {
        throw new GitError(
          `Repository not found: ${sourceId}`,
          'branch-not-found',
          ErrorCodes.GIT_BRANCH_NOT_FOUND,
        );
      }

      Logger.info('Switching branch', { sourceId, branch });

      const git = this.getGitInstance(repoPath);
      await git.checkout(branch);

      Logger.info('Branch switched successfully', { sourceId, branch });
    } catch (error) {
      Logger.error('Failed to switch branch', error as Error, {
        sourceId,
        branch,
      });

      throw new GitError(
        `Failed to switch branch: ${branch}`,
        'branch-not-found',
        ErrorCodes.GIT_BRANCH_NOT_FOUND,
        error as Error,
      );
    }
  }

  /**
   * 清理源的本地缓存
   */
  public async cleanCache(sourceId: string): Promise<void> {
    try {
      const repoPath = this.getSourcePath(sourceId);

      if (await pathExists(repoPath)) {
        await safeRemove(repoPath);
        Logger.info('Cache cleaned', { sourceId });
      }

      // 清理 Git 实例
      this.gitInstances.delete(repoPath);
    } catch (error) {
      Logger.error('Failed to clean cache', error as Error, { sourceId });
      throw new GitError(
        `Failed to clean cache: ${sourceId}`,
        'unknown',
        ErrorCodes.SYSTEM_IO_ERROR,
        error as Error,
      );
    }
  }

  /**
   * 清理所有缓存
   */
  public async cleanAllCache(): Promise<void> {
    try {
      await safeRemove(this.globalCachePath);
      this.gitInstances.clear();
      Logger.info('All cache cleaned');
    } catch (error) {
      Logger.error('Failed to clean all cache', error as Error);
      throw new GitError(
        'Failed to clean all cache',
        'unknown',
        ErrorCodes.SYSTEM_IO_ERROR,
        error as Error,
      );
    }
  }

  /**
   * 检查仓库是否存在
   */
  public async repositoryExists(sourceId: string): Promise<boolean> {
    const repoPath = this.getSourcePath(sourceId);
    return await pathExists(repoPath);
  }
}
