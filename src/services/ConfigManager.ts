/**
 * 配置管理服务
 */

import * as vscode from 'vscode';

import type {
  AdaptersConfig,
  ExtensionConfig,
  RuleSource,
  StorageConfig,
  SyncConfig,
} from '../types/config';
import { DEFAULT_CONFIG } from '../types/config';
import { ConfigError, ErrorCodes } from '../types/errors';
import { CONFIG_PREFIX } from '../utils/constants';
import { Logger } from '../utils/logger';
import { validateConfig } from '../utils/validator';

/**
 * 配置管理器
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private context: vscode.ExtensionContext;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * 获取配置管理器实例
   */
  public static getInstance(context?: vscode.ExtensionContext): ConfigManager {
    if (!ConfigManager.instance) {
      if (!context) {
        throw new Error('ConfigManager requires ExtensionContext for initialization');
      }
      ConfigManager.instance = new ConfigManager(context);
    }
    return ConfigManager.instance;
  }

  /**
   * 获取 VSCode 配置对象
   */
  private getVscodeConfig(): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(CONFIG_PREFIX);
  }

  /**
   * 获取完整配置
   */
  public getConfig(): ExtensionConfig {
    try {
      const vscodeConfig = this.getVscodeConfig();

      // 从 workspace state 获取 sources（不是 VSCode 配置）
      const sources = this.context.workspaceState.get<RuleSource[]>(
        'sources',
        DEFAULT_CONFIG.sources,
      );

      const config: ExtensionConfig = {
        sources,
        storage: vscodeConfig.get<StorageConfig>('storage', DEFAULT_CONFIG.storage),
        adapters: vscodeConfig.get<AdaptersConfig>('adapters', DEFAULT_CONFIG.adapters),
        sync: vscodeConfig.get<SyncConfig>('sync', DEFAULT_CONFIG.sync),
      };

      // 验证配置
      const validation = validateConfig(config);
      if (!validation.valid) {
        Logger.warn('Invalid configuration detected', {
          errors: validation.errors,
        });
        // 返回默认配置
        return DEFAULT_CONFIG;
      }

      return config;
    } catch (error) {
      Logger.error('Failed to get configuration', error as Error);
      throw new ConfigError(
        'Failed to get configuration',
        ErrorCodes.CONFIG_MISSING,
        error as Error,
      );
    }
  }

  /**
   * 更新配置
   * sources 使用 workspace state，其他配置使用 VSCode 配置
   */
  public async updateConfig(
    section: keyof ExtensionConfig,
    value: any,
    global = false,
  ): Promise<void> {
    try {
      if (section === 'sources') {
        // sources 存储在 workspace state 中
        await this.context.workspaceState.update('sources', value);
        Logger.info('Sources updated in workspace state');
      } else {
        // 其他配置存储在 VSCode 配置中
        const vscodeConfig = this.getVscodeConfig();
        const target = global
          ? vscode.ConfigurationTarget.Global
          : vscode.ConfigurationTarget.Workspace;

        await vscodeConfig.update(section, value, target);
        Logger.info('Configuration updated', { section, global });
      }
    } catch (error) {
      Logger.error('Failed to update configuration', error as Error, {
        section,
      });
      throw new ConfigError(
        `Failed to update configuration: ${section}`,
        ErrorCodes.CONFIG_INVALID_FORMAT,
        error as Error,
      );
    }
  }

  /**
   * 获取所有规则源
   */
  public getSources(): RuleSource[] {
    const sources = this.context.workspaceState.get<RuleSource[]>('sources');
    // 如果未初始化，返回空数组
    return sources || [];
  }

  /**
   * 获取启用的规则源
   */
  public getEnabledSources(): RuleSource[] {
    return this.getSources().filter((source) => source.enabled);
  }

  /**
   * 根据 ID 获取规则源
   */
  public getSourceById(id: string): RuleSource | undefined {
    return this.getSources().find((source) => source.id === id);
  }

  /**
   * 添加规则源
   */
  public async addSource(source: RuleSource): Promise<void> {
    try {
      const sources = this.getSources();

      // 检查 ID 是否已存在
      if (sources.some((s) => s.id === source.id)) {
        throw new ConfigError(
          `Source with ID '${source.id}' already exists`,
          ErrorCodes.CONFIG_MISSING_FIELD,
        );
      }

      // 添加新源
      const newSources = [...sources, source];
      await this.updateConfig('sources', newSources);

      Logger.info('Source added', { sourceId: source.id });
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }
      Logger.error('Failed to add source', error as Error, {
        sourceId: source.id,
      });
      throw new ConfigError(
        'Failed to add source',
        ErrorCodes.CONFIG_INVALID_FORMAT,
        error as Error,
      );
    }
  }

  /**
   * 更新规则源
   */
  public async updateSource(id: string, updates: Partial<RuleSource>): Promise<void> {
    try {
      const sources = this.getSources();
      const index = sources.findIndex((s) => s.id === id);

      if (index === -1) {
        throw new ConfigError(`Source with ID '${id}' not found`, ErrorCodes.CONFIG_MISSING_FIELD);
      }

      // 更新源
      const newSources = [...sources];
      newSources[index] = { ...newSources[index], ...updates };
      await this.updateConfig('sources', newSources);

      Logger.info('Source updated', { sourceId: id });
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }
      Logger.error('Failed to update source', error as Error, { sourceId: id });
      throw new ConfigError(
        'Failed to update source',
        ErrorCodes.CONFIG_INVALID_FORMAT,
        error as Error,
      );
    }
  }

  /**
   * 删除规则源
   */
  public async removeSource(id: string): Promise<void> {
    try {
      const sources = this.getSources();
      const newSources = sources.filter((s) => s.id !== id);

      if (newSources.length === sources.length) {
        throw new ConfigError(`Source with ID '${id}' not found`, ErrorCodes.CONFIG_MISSING_FIELD);
      }

      await this.updateConfig('sources', newSources);

      Logger.info('Source removed', { sourceId: id });
    } catch (error) {
      if (error instanceof ConfigError) {
        throw error;
      }
      Logger.error('Failed to remove source', error as Error, { sourceId: id });
      throw new ConfigError(
        'Failed to remove source',
        ErrorCodes.CONFIG_INVALID_FORMAT,
        error as Error,
      );
    }
  }

  /**
   * 获取存储配置
   */
  public getStorageConfig(): StorageConfig {
    return this.getConfig().storage;
  }

  /**
   * 获取适配器配置
   */
  public getAdaptersConfig(): AdaptersConfig {
    return this.getConfig().adapters;
  }

  /**
   * 获取同步配置
   */
  public getSyncConfig(): SyncConfig {
    return this.getConfig().sync;
  }

  /**
   * 存储 Token 到 Secret Storage
   */
  public async storeToken(sourceId: string, token: string): Promise<void> {
    try {
      const key = `${CONFIG_PREFIX}.token.${sourceId}`;
      await this.context.secrets.store(key, token);
      Logger.info('Token stored', { sourceId });
    } catch (error) {
      Logger.error('Failed to store token', error as Error, { sourceId });
      throw new ConfigError(
        'Failed to store token',
        ErrorCodes.CONFIG_INVALID_FORMAT,
        error as Error,
      );
    }
  }

  /**
   * 从 Secret Storage 读取 Token
   */
  public async getToken(sourceId: string): Promise<string | undefined> {
    try {
      const key = `${CONFIG_PREFIX}.token.${sourceId}`;
      return await this.context.secrets.get(key);
    } catch (error) {
      Logger.error('Failed to get token', error as Error, { sourceId });
      return undefined;
    }
  }

  /**
   * 从 Secret Storage 删除 Token
   */
  public async deleteToken(sourceId: string): Promise<void> {
    try {
      const key = `${CONFIG_PREFIX}.token.${sourceId}`;
      await this.context.secrets.delete(key);
      Logger.info('Token deleted', { sourceId });
    } catch (error) {
      Logger.error('Failed to delete token', error as Error, { sourceId });
    }
  }

  /**
   * 重置为默认配置
   */
  public async resetToDefault(): Promise<void> {
    try {
      await this.updateConfig('sources', DEFAULT_CONFIG.sources);
      await this.updateConfig('storage', DEFAULT_CONFIG.storage);
      await this.updateConfig('adapters', DEFAULT_CONFIG.adapters);
      await this.updateConfig('sync', DEFAULT_CONFIG.sync);

      Logger.info('Configuration reset to default');
      vscode.window.showInformationMessage('Configuration reset to default values');
    } catch (error) {
      Logger.error('Failed to reset configuration', error as Error);
      throw new ConfigError(
        'Failed to reset configuration',
        ErrorCodes.CONFIG_INVALID_FORMAT,
        error as Error,
      );
    }
  }
}
