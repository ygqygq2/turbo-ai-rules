/**
 * 配置管理服务
 */

import * as vscode from 'vscode';

import type {
  AdaptersConfig,
  CustomAdapterConfig,
  ExtensionConfig,
  ParserConfig,
  RuleSource,
  StorageConfig,
  SyncConfig,
} from '../types/config';
import { DEFAULT_CONFIG } from '../types/config';
import { ConfigError, ErrorCodes } from '../types/errors';
import { mergeById } from '../utils/configMerge';
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
   * @param resource 资源 URI（用于指定 workspace folder）
   */
  private getVscodeConfig(resource?: vscode.Uri): vscode.WorkspaceConfiguration {
    return vscode.workspace.getConfiguration(CONFIG_PREFIX, resource);
  }

  /**
   * 获取完整配置
   * @param resource 资源 URI（用于指定 workspace folder）
   */
  public getConfig(resource?: vscode.Uri): ExtensionConfig {
    try {
      const vscodeConfig = this.getVscodeConfig(resource);

      // 使用 getSources 方法获取规则源（支持从 workspace state 或配置文件读取）
      const sources = this.getSources(resource);

      // 先按 VS Code 默认合并规则获取适配器对象
      const adapters = vscodeConfig.get<AdaptersConfig>('adapters', DEFAULT_CONFIG.adapters);

      // 对 adapters.custom（数组）执行显式合并：Folder > Workspace > Global
      const customInspection = vscodeConfig.inspect<CustomAdapterConfig[]>('adapters.custom');
      if (customInspection) {
        const mergedCustom = mergeById(
          customInspection.workspaceFolderValue,
          customInspection.workspaceValue,
          customInspection.globalValue,
        );
        if (mergedCustom.length > 0) {
          adapters.custom = mergedCustom;
        }
      }

      const config: ExtensionConfig = {
        sources,
        storage: vscodeConfig.get<StorageConfig>('storage', DEFAULT_CONFIG.storage),
        adapters,
        sync: vscodeConfig.get<SyncConfig>('sync', DEFAULT_CONFIG.sync),
        parser: vscodeConfig.get<ParserConfig>('parser', DEFAULT_CONFIG.parser),
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
   * 所有配置都写入 VSCode settings（workspace 或 global）
   */
  public async updateConfig(
    section: keyof ExtensionConfig,
    value: ExtensionConfig[keyof ExtensionConfig],
    global = false,
  ): Promise<void> {
    try {
      const vscodeConfig = this.getVscodeConfig();
      const target = global
        ? vscode.ConfigurationTarget.Global
        : vscode.ConfigurationTarget.Workspace;

      await vscodeConfig.update(section, value, target);
      Logger.info('Configuration updated', { section, global });
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
   * VSCode 自动处理配置优先级（Workspace Folder > Workspace > Global）
   * @param resource 资源 URI（用于指定 workspace folder）
   * @return {RuleSource[]} 规则源数组
   */
  public getSources(resource?: vscode.Uri): RuleSource[] {
    const vscodeConfig = this.getVscodeConfig(resource);

    // 使用 inspect 分别读取各层级值并显式合并（数组不会被 VSCode 自动合并）
    const inspection = vscodeConfig.inspect<RuleSource[]>('sources');
    const folder = inspection?.workspaceFolderValue || [];
    const workspace = inspection?.workspaceValue || [];
    const global = inspection?.globalValue || [];

    const merged = mergeById<RuleSource>(folder, workspace, global);

    Logger.debug('getSources', {
      resourceUri: resource?.toString(),
      count: merged.length,
    });

    return merged;
  }

  /**
   * 获取启用的规则源
   * @param resource 资源 URI（用于指定 workspace folder）
   */
  public getEnabledSources(resource?: vscode.Uri): RuleSource[] {
    return this.getSources(resource).filter((source) => source.enabled);
  }

  /**
   * 根据 ID 获取规则源
   */
  public getSourceById(id: string): RuleSource | undefined {
    return this.getSources().find((source) => source.id === id);
  }

  /**
   * 添加规则源（只写入 Workspace 配置）
   */
  public async addSource(source: RuleSource): Promise<void> {
    try {
      // 检查当前生效的源（VSCode 已处理优先级）
      const allSources = this.getSources();
      const existing = allSources.find((s) => s.id === source.id);

      if (existing) {
        throw new ConfigError(
          `Source "${existing.name}" (ID: ${source.id}) already exists. ` +
            `Please use a different repository or edit the existing source.`,
          ErrorCodes.CONFIG_MISSING_FIELD,
        );
      }

      // 只获取 Workspace 层级的源进行追加
      const vscodeConfig = this.getVscodeConfig();
      const inspection = vscodeConfig.inspect<RuleSource[]>('sources');
      const workspaceSources = inspection?.workspaceValue || [];

      // 添加到 Workspace
      const newSources = [...workspaceSources, source];
      await this.updateConfig('sources', newSources, false); // false = Workspace

      Logger.info('Source added to workspace', { sourceId: source.id });
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
   * 更新规则源（只更新 Workspace 配置中的源）
   */
  public async updateSource(id: string, updates: Partial<RuleSource>): Promise<void> {
    try {
      // 1. 检查源是否存在（从当前生效的源中查找）
      const allSources = this.getSources();
      const existingSource = allSources.find((s) => s.id === id);

      if (!existingSource) {
        throw new ConfigError(`Source with ID '${id}' not found`, ErrorCodes.CONFIG_MISSING_FIELD);
      }

      // 2. 只获取 Workspace 层级的源进行更新
      const vscodeConfig = this.getVscodeConfig();
      const inspection = vscodeConfig.inspect<RuleSource[]>('sources');
      const workspaceSources = inspection?.workspaceValue || [];

      const inWorkspace = workspaceSources.some((s) => s.id === id);

      // 3. 如果源不在 Workspace 中（说明来自 Global），提示用户手动修改
      if (!inWorkspace) {
        throw new ConfigError(
          `Source "${existingSource.name}" (ID: ${id}) is not in workspace settings. ` +
            `This extension only modifies workspace settings. ` +
            `Please edit the source manually via File > Preferences > Settings.`,
          ErrorCodes.CONFIG_INVALID_FORMAT,
        );
      }

      // 4. 更新 Workspace 中的源
      const updatedWorkspaceSources = workspaceSources.map((s) =>
        s.id === id ? { ...s, ...updates } : s,
      );

      await this.updateConfig('sources', updatedWorkspaceSources, false); // false = Workspace

      Logger.info('Source updated in workspace', { sourceId: id });
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
   * 删除规则源（只从 Workspace 配置删除）
   */
  public async removeSource(id: string): Promise<void> {
    try {
      // 1. 检查源是否存在
      const allSources = this.getSources();
      const existingSource = allSources.find((s) => s.id === id);

      if (!existingSource) {
        throw new ConfigError(`Source with ID '${id}' not found`, ErrorCodes.CONFIG_MISSING_FIELD);
      }

      // 2. 只获取 Workspace 层级的源
      const vscodeConfig = this.getVscodeConfig();
      const inspection = vscodeConfig.inspect<RuleSource[]>('sources');
      const workspaceSources = inspection?.workspaceValue || [];

      const inWorkspace = workspaceSources.some((s) => s.id === id);

      // 3. 如果源不在 Workspace 中，提示用户手动删除
      if (!inWorkspace) {
        throw new ConfigError(
          `Source "${existingSource.name}" (ID: ${id}) is not in workspace settings. ` +
            `This extension only modifies workspace settings. ` +
            `Please remove it manually via File > Preferences > Settings.`,
          ErrorCodes.CONFIG_INVALID_FORMAT,
        );
      }

      // 4. 从 Workspace 中删除
      const newWorkspaceSources = workspaceSources.filter((s) => s.id !== id);
      await this.updateConfig('sources', newWorkspaceSources, false); // false = Workspace

      // 5. 删除 Secret Storage 中的 token（如果存在）
      await this.deleteToken(id);

      Logger.info('Source removed from workspace', { sourceId: id });
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
