/**
 * 共享选择状态管理器
 * 负责工作区级别的选择状态文件的读写
 * 职责：
 * - 检查共享模式配置
 * - 读写工作区选择文件（.turbo-ai-rules/selections.json）
 * - 导入导出选择状态
 * - .gitignore 自动管理
 */

import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS, CONFIG_PREFIX } from '../utils/constants';
import { ensureDir, pathExists, safeReadFile, safeWriteFile } from '../utils/fileSystem';
import { ensureIgnored, removeIgnored } from '../utils/gitignore';
import { Logger } from '../utils/logger';
import type { RuleSelection, RuleSelections } from './WorkspaceDataManager';

/**
 * 共享选择管理器
 */
export class SharedSelectionManager {
  private static instance: SharedSelectionManager;

  private constructor() {}

  /**
   * @description 获取 SharedSelectionManager 实例
   * @return {SharedSelectionManager}
   */
  public static getInstance(): SharedSelectionManager {
    if (!SharedSelectionManager.instance) {
      SharedSelectionManager.instance = new SharedSelectionManager();
    }
    return SharedSelectionManager.instance;
  }

  /**
   * @description 检查是否启用共享选择状态
   * @param workspaceFolder {vscode.WorkspaceFolder} 工作区文件夹
   * @return {boolean}
   */
  public isEnabled(workspaceFolder?: vscode.WorkspaceFolder): boolean {
    const config = vscode.workspace.getConfiguration(CONFIG_PREFIX, workspaceFolder?.uri);
    return config.get<boolean>(CONFIG_KEYS.ENABLE_SHARED_SELECTION, false);
  }

  /**
   * @description 获取共享选择文件的完整路径
   * @param workspacePath {string} 工作区路径
   * @return {string} 共享选择文件路径
   */
  public getFilePath(workspacePath: string): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.find(
      (folder) => folder.uri.fsPath === workspacePath,
    );
    const config = vscode.workspace.getConfiguration(CONFIG_PREFIX, workspaceFolder?.uri);
    const relativePath = config.get<string>(
      CONFIG_KEYS.SELECTION_FILE_PATH,
      '.turbo-ai-rules/selections.json',
    );
    return path.join(workspacePath, relativePath);
  }

  /**
   * @description 从工作区文件加载共享选择状态
   * @param workspacePath {string} 工作区路径
   * @return {Promise<RuleSelections | null>} 共享选择数据
   */
  public async load(workspacePath: string): Promise<RuleSelections | null> {
    const filePath = this.getFilePath(workspacePath);

    if (!(await pathExists(filePath))) {
      Logger.debug('Shared selection file not found', { filePath });
      return null;
    }

    try {
      const content = await safeReadFile(filePath);
      const data = JSON.parse(content) as RuleSelections;

      Logger.info('Loaded shared selection state from workspace', {
        filePath,
        sourcesCount: Object.keys(data.selections).length,
      });

      return data;
    } catch (error) {
      Logger.error('Failed to load shared selection state', error as Error, { filePath });
      return null;
    }
  }

  /**
   * @description 保存共享选择状态到工作区文件
   * @param workspacePath {string} 工作区路径
   * @param selections {Map<string, Set<string>>} 内存选择状态
   * @return {Promise<void>}
   */
  public async save(workspacePath: string, selections: Map<string, Set<string>>): Promise<void> {
    const filePath = this.getFilePath(workspacePath);

    // 确保目录存在
    await ensureDir(path.dirname(filePath));

    // 构建共享选择数据（内存中已经是相对路径）
    const selectionsData: { [sourceId: string]: RuleSelection } = {};

    for (const [sourceId, selectedPaths] of selections.entries()) {
      selectionsData[sourceId] = {
        paths: Array.from(selectedPaths),
      };
    }

    const data: RuleSelections = {
      version: 1,
      workspacePath: '.', // 使用相对路径，避免泄露敏感信息
      lastUpdated: new Date().toISOString(),
      selections: selectionsData,
    };

    try {
      await safeWriteFile(filePath, JSON.stringify(data, null, 2));

      Logger.info('Saved shared selection state to workspace', {
        filePath,
        sourcesCount: Object.keys(selectionsData).length,
      });

      // 管理 .gitignore
      await this.manageGitignore(workspacePath);
    } catch (error) {
      Logger.error('Failed to save shared selection state', error as Error, { filePath });
      throw error;
    }
  }

  /**
   * @description 导入工作区选择状态到内存
   * @param workspacePath {string} 工作区路径
   * @param currentSelections {Map<string, Set<string>>} 当前内存选择状态
   * @param mergeMode {'replace' | 'merge'} 合并模式
   * @return {Promise<Map<string, Set<string>>>} 导入后的选择状态
   */
  public async import(
    workspacePath: string,
    currentSelections: Map<string, Set<string>>,
    mergeMode: 'replace' | 'merge' = 'replace',
  ): Promise<Map<string, Set<string>>> {
    const sharedData = await this.load(workspacePath);
    if (!sharedData) {
      return new Map(currentSelections);
    }

    const result = new Map(mergeMode === 'replace' ? [] : currentSelections);

    for (const [sourceId, selection] of Object.entries(sharedData.selections)) {
      if (selection.paths) {
        // 磁盘存储的已经是相对路径，直接使用
        const paths = selection.paths;

        if (mergeMode === 'replace' || !result.has(sourceId)) {
          result.set(sourceId, new Set(paths));
        } else {
          // merge 模式：合并路径
          const existing = result.get(sourceId)!;
          paths.forEach((p) => existing.add(p));
        }
      }
    }

    Logger.info('Imported shared selection state', {
      workspacePath,
      sourcesCount: result.size,
      mergeMode,
    });

    return result;
  }

  /**
   * @description 导出当前选择状态到工作区文件
   * @param workspacePath {string} 工作区路径
   * @param selections {Map<string, Set<string>>} 内存选择状态
   * @return {Promise<void>}
   */
  public async export(workspacePath: string, selections: Map<string, Set<string>>): Promise<void> {
    await this.save(workspacePath, selections);
  }

  /**
   * @description 管理 .gitignore（根据配置自动添加/移除）
   * @param workspacePath {string} 工作区路径
   * @return {Promise<void>}
   */
  private async manageGitignore(workspacePath: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.find(
      (folder) => folder.uri.fsPath === workspacePath,
    );

    if (!workspaceFolder) {
      return;
    }

    const config = vscode.workspace.getConfiguration(CONFIG_PREFIX, workspaceFolder.uri);
    const autoGitignore = config.get<boolean>(CONFIG_KEYS.STORAGE_AUTO_GITIGNORE, true);
    const enabled = this.isEnabled(workspaceFolder);
    const relativePath = config.get<string>(
      CONFIG_KEYS.SELECTION_FILE_PATH,
      '.turbo-ai-rules/selections.json',
    );

    try {
      if (!enabled && autoGitignore) {
        // 共享模式关闭：从 .gitignore 移除
        await removeIgnored(workspacePath, [relativePath]);
        Logger.debug('Removed shared selection file from .gitignore', { relativePath });
      } else if (!enabled && !autoGitignore) {
        // 共享模式关闭且不自动管理：添加到 .gitignore（不提交）
        await ensureIgnored(workspacePath, [relativePath]);
        Logger.debug('Added shared selection file to .gitignore', { relativePath });
      }
      // 如果 enabled=true：文件应该被提交，确保不在 .gitignore 中
      else if (enabled) {
        // 移除可能存在的忽略规则
        await removeIgnored(workspacePath, [relativePath]);

        // 如果父目录被忽略，需要添加 allow 规则（以 ! 开头）
        await this.ensureAllowRuleIfNeeded(workspacePath, relativePath);

        Logger.debug('Ensured shared selection file can be committed', { relativePath });
      }
    } catch (error) {
      Logger.warn('Failed to manage .gitignore for shared selection', {
        error: String(error),
        relativePath,
      });
    }
  }

  /**
   * @description 如果父目录被忽略，添加 allow 规则以确保文件可提交
   * @param workspacePath {string} 工作区路径
   * @param relativePath {string} 文件相对路径
   * @return {Promise<void>}
   */
  private async ensureAllowRuleIfNeeded(
    workspacePath: string,
    relativePath: string,
  ): Promise<void> {
    const gitignorePath = path.join(workspacePath, '.gitignore');

    // 检查 .gitignore 是否存在
    if (!(await pathExists(gitignorePath))) {
      return;
    }

    const content = await safeReadFile(gitignorePath);
    const lines = content.split('\n').map((l) => l.trim());

    // 检查父目录是否被忽略
    const dirPath = path.dirname(relativePath);
    const parentIgnorePatterns = [dirPath + '/', dirPath, '/' + dirPath + '/', '/' + dirPath];

    const isParentIgnored = parentIgnorePatterns.some((pattern) => lines.includes(pattern));

    if (isParentIgnored) {
      // 父目录被忽略，需要添加 allow 规则
      const allowRule = `!${relativePath}`;

      // 检查是否已存在 allow 规则
      if (!lines.includes(allowRule)) {
        // 在 turbo-ai-rules 标记块中添加 allow 规则
        const { ensureIgnored } = await import('../utils/gitignore');
        const { GITIGNORE_MARKER } = await import('../utils/constants');

        // 读取现有模式
        const markerIndex = lines.findIndex((line) => line.includes(GITIGNORE_MARKER));
        const existingPatterns: string[] = [];

        if (markerIndex !== -1) {
          for (let i = markerIndex + 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') break;
            existingPatterns.push(line);
          }
        }

        // 添加 allow 规则（如果不存在）
        if (!existingPatterns.includes(allowRule)) {
          existingPatterns.push(allowRule);
          await ensureIgnored(workspacePath, existingPatterns);
          Logger.info('Added allow rule for shared selection file', { allowRule, relativePath });
        }
      }
    }
  }

  /**
   * @description 初始化共享选择（首次启用时）
   * @param workspacePath {string} 工作区路径
   * @param currentSelections {Map<string, Set<string>>} 当前内存选择状态
   * @return {Promise<void>}
   */
  public async initialize(
    workspacePath: string,
    currentSelections: Map<string, Set<string>>,
  ): Promise<void> {
    // 检查是否已存在共享文件
    const filePath = this.getFilePath(workspacePath);
    const exists = await pathExists(filePath);

    if (exists) {
      Logger.info('Shared selection file already exists, skipping initialization', { filePath });
      return;
    }

    // 创建新文件
    await this.save(workspacePath, currentSelections);
    Logger.info('Initialized shared selection file', { filePath });
  }
}
