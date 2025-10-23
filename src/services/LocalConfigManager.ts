/**
 * 本地配置管理服务
 * 管理存储在文件系统中的配置（不同步到 VSCode Settings Sync）
 * 包括认证信息（token、SSH key）等敏感数据
 */

import * as fs from 'fs-extra';
import * as path from 'path';

import type { GitAuthentication, LocalSourceConfig } from '../types/config';
import { SystemError } from '../types/errors';
import { GLOBAL_CONFIG_DIR, PROJECT_CONFIG_DIR } from '../utils/constants';
import { ensureDir, pathExists, safeReadFile, safeWriteFile } from '../utils/fileSystem';
import { Logger } from '../utils/logger';

/**
 * 本地配置文件名
 */
const CONFIG_FILE_NAME = 'sources.json';

/**
 * 本地配置存储
 */
interface LocalConfig {
  /** 版本号 */
  version: string;
  /** 源配置列表 */
  sources: LocalSourceConfig[];
}

/**
 * 本地配置管理器
 */
export class LocalConfigManager {
  private static instance: LocalConfigManager;
  private globalConfigPath: string;
  private projectConfigPath?: string;

  private constructor() {
    this.globalConfigPath = path.join(GLOBAL_CONFIG_DIR, CONFIG_FILE_NAME);
  }

  /**
   * 获取本地配置管理器实例
   */
  public static getInstance(): LocalConfigManager {
    if (!LocalConfigManager.instance) {
      LocalConfigManager.instance = new LocalConfigManager();
    }
    return LocalConfigManager.instance;
  }

  /**
   * 设置项目配置路径
   * @param workspaceRoot 工作区根目录
   */
  public setProjectConfigPath(workspaceRoot: string): void {
    this.projectConfigPath = path.join(workspaceRoot, PROJECT_CONFIG_DIR, CONFIG_FILE_NAME);
  }

  /**
   * 初始化配置目录
   */
  private async ensureConfigDirs(): Promise<void> {
    await ensureDir(GLOBAL_CONFIG_DIR);

    if (this.projectConfigPath) {
      const projectDir = path.dirname(this.projectConfigPath);
      await ensureDir(projectDir);
    }
  }

  /**
   * 读取配置文件
   * @param configPath 配置文件路径
   * @returns 配置对象
   */
  private async readConfig(configPath: string): Promise<LocalConfig> {
    try {
      if (!(await pathExists(configPath))) {
        return { version: '1.0.0', sources: [] };
      }

      const content = await safeReadFile(configPath);
      return JSON.parse(content) as LocalConfig;
    } catch (error) {
      Logger.warn('Failed to read local config', { configPath, error: String(error) });
      return { version: '1.0.0', sources: [] };
    }
  }

  /**
   * 写入配置文件
   * @param configPath 配置文件路径
   * @param config 配置对象
   */
  private async writeConfig(configPath: string, config: LocalConfig): Promise<void> {
    try {
      await this.ensureConfigDirs();
      const content = JSON.stringify(config, null, 2);
      await safeWriteFile(configPath, content);
    } catch (error) {
      throw new SystemError(
        `Failed to write local config: ${configPath}`,
        'TAI-5003',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 获取源的认证配置
   * @param sourceId 源 ID
   * @param useProject 是否使用项目级配置
   * @returns 认证配置或 undefined
   */
  public async getSourceAuth(
    sourceId: string,
    useProject: boolean = true,
  ): Promise<GitAuthentication | undefined> {
    // 优先从项目级配置读取
    if (useProject && this.projectConfigPath) {
      const projectConfig = await this.readConfig(this.projectConfigPath);
      const projectSource = projectConfig.sources.find((s) => s.sourceId === sourceId);
      if (projectSource?.authentication) {
        return projectSource.authentication;
      }
    }

    // 从全局配置读取
    const globalConfig = await this.readConfig(this.globalConfigPath);
    const globalSource = globalConfig.sources.find((s) => s.sourceId === sourceId);
    return globalSource?.authentication;
  }

  /**
   * 保存源的认证配置
   * @param sourceId 源 ID
   * @param authentication 认证配置
   * @param useProject 是否保存到项目级配置
   */
  public async setSourceAuth(
    sourceId: string,
    authentication: GitAuthentication,
    useProject: boolean = false,
  ): Promise<void> {
    const configPath =
      useProject && this.projectConfigPath ? this.projectConfigPath : this.globalConfigPath;

    const config = await this.readConfig(configPath);

    // 查找现有源配置
    const existingIndex = config.sources.findIndex((s) => s.sourceId === sourceId);

    if (existingIndex >= 0) {
      // 更新现有配置
      config.sources[existingIndex].authentication = authentication;
    } else {
      // 添加新配置
      config.sources.push({
        sourceId,
        authentication,
      });
    }

    await this.writeConfig(configPath, config);

    Logger.info('Source authentication saved', {
      sourceId,
      type: authentication.type,
      scope: useProject ? 'project' : 'global',
    });
  }

  /**
   * 删除源的认证配置
   * @param sourceId 源 ID
   */
  public async deleteSourceAuth(sourceId: string): Promise<void> {
    // 从项目级配置删除
    if (this.projectConfigPath) {
      const projectConfig = await this.readConfig(this.projectConfigPath);
      const filteredSources = projectConfig.sources.filter((s) => s.sourceId !== sourceId);
      if (filteredSources.length !== projectConfig.sources.length) {
        projectConfig.sources = filteredSources;
        await this.writeConfig(this.projectConfigPath, projectConfig);
      }
    }

    // 从全局配置删除
    const globalConfig = await this.readConfig(this.globalConfigPath);
    const filteredSources = globalConfig.sources.filter((s) => s.sourceId !== sourceId);
    if (filteredSources.length !== globalConfig.sources.length) {
      globalConfig.sources = filteredSources;
      await this.writeConfig(this.globalConfigPath, globalConfig);
    }

    Logger.info('Source authentication deleted', { sourceId });
  }

  /**
   * 获取全部源的认证配置
   * @returns 源认证配置列表
   */
  public async getAllSourceAuths(): Promise<LocalSourceConfig[]> {
    const globalConfig = await this.readConfig(this.globalConfigPath);
    const sources = [...globalConfig.sources];

    // 合并项目级配置（项目级优先）
    if (this.projectConfigPath) {
      const projectConfig = await this.readConfig(this.projectConfigPath);
      for (const projectSource of projectConfig.sources) {
        const existingIndex = sources.findIndex((s) => s.sourceId === projectSource.sourceId);
        if (existingIndex >= 0) {
          sources[existingIndex] = projectSource; // 项目级覆盖全局
        } else {
          sources.push(projectSource);
        }
      }
    }

    return sources;
  }

  /**
   * 清理所有配置
   */
  public async clearAll(): Promise<void> {
    if (await pathExists(this.globalConfigPath)) {
      await fs.remove(this.globalConfigPath);
    }

    if (this.projectConfigPath && (await pathExists(this.projectConfigPath))) {
      await fs.remove(this.projectConfigPath);
    }

    Logger.info('All local config cleared');
  }
}
