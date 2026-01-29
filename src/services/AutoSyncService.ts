/**
 * 自动同步服务
 * 负责定时自动同步规则源
 */

import * as vscode from 'vscode';

import type { AdapterConfig } from '../types/config';
import { Logger } from '../utils/logger';
import { ConfigManager } from './ConfigManager';

/**
 * 自动同步服务类
 */
export class AutoSyncService {
  private static instance: AutoSyncService | undefined;
  private syncTimer: NodeJS.Timeout | undefined;
  private isEnabled: boolean = false;
  private intervalMinutes: number = 0;
  private disposables: vscode.Disposable[] = [];

  private constructor() {
    // 监听配置变化
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (
          e.affectsConfiguration('turbo-ai-rules.sync.auto') ||
          e.affectsConfiguration('turbo-ai-rules.sync.interval')
        ) {
          Logger.debug('Auto-sync configuration changed, restarting timer');
          this.restart();
        }
      }),
    );
  }

  /**
   * @description 获取单例实例
   * @return default {AutoSyncService}
   */
  public static getInstance(): AutoSyncService {
    if (!AutoSyncService.instance) {
      AutoSyncService.instance = new AutoSyncService();
    }
    return AutoSyncService.instance;
  }

  /**
   * @description 启动自动同步
   * @return default {Promise<void>}
   */
  public async start(): Promise<void> {
    try {
      const configManager = ConfigManager.getInstance();
      const config = await configManager.getConfig();

      this.isEnabled = config.sync.auto || false;
      this.intervalMinutes = config.sync.interval || 60;

      if (!this.isEnabled) {
        Logger.debug('Auto-sync is disabled');
        return;
      }

      if (this.intervalMinutes <= 0) {
        Logger.warn('Auto-sync interval must be greater than 0', {
          interval: this.intervalMinutes,
        });
        return;
      }

      // 清除现有定时器
      this.stop();

      // 设置新的定时器
      const intervalMs = this.intervalMinutes * 60 * 1000;
      this.syncTimer = setInterval(() => {
        this.performSync();
      }, intervalMs);

      Logger.info('Auto-sync started', {
        interval: `${this.intervalMinutes} minutes`,
      });
    } catch (error) {
      Logger.error('Failed to start auto-sync', error instanceof Error ? error : undefined);
    }
  }

  /**
   * @description 停止自动同步
   * @return default {void}
   */
  public stop(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
      Logger.debug('Auto-sync timer stopped');
    }
  }

  /**
   * @description 重启自动同步
   * @return default {Promise<void>}
   */
  public async restart(): Promise<void> {
    this.stop();
    await this.start();
  }

  /**
   * @description 执行同步操作
   * @return default {Promise<void>}
   */
  private async performSync(): Promise<void> {
    try {
      Logger.info('🔄 Auto-sync triggered', { interval: `${this.intervalMinutes} minutes` });

      // 检查是否有工作区
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        Logger.debug('No workspace folder, skipping auto-sync');
        return;
      }

      // 检查是否有启用的规则源
      const configManager = ConfigManager.getInstance();
      const sources = configManager.getSources();
      const enabledSources = sources.filter((s) => s.enabled);

      if (enabledSources.length === 0) {
        Logger.debug('No enabled sources, skipping auto-sync');
        return;
      }

      // 获取需要自动更新的适配器列表
      const autoUpdateAdapters = await this.getAutoUpdateAdapters();

      if (autoUpdateAdapters.length === 0) {
        Logger.debug('No adapters with autoUpdate enabled, skipping auto-sync');
        return;
      }

      // 执行同步命令，只同步启用了 autoUpdate 的适配器
      Logger.info('▶️ Executing auto-sync command', {
        enabledSourcesCount: enabledSources.length,
        autoUpdateAdapters: autoUpdateAdapters.join(', '),
      });
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules', {
        targetAdapters: autoUpdateAdapters,
      });

      Logger.info('✅ Auto-sync completed successfully', {
        syncedSources: enabledSources.length,
        updatedAdapters: autoUpdateAdapters.length,
      });
    } catch (error) {
      Logger.error('Auto-sync failed', error instanceof Error ? error : undefined);
      // 不显示错误通知，避免打扰用户
    }
  }

  /**
   * @description 获取启用了 autoUpdate 的适配器列表
   * @return {Promise<string[]>}
   */
  private async getAutoUpdateAdapters(): Promise<string[]> {
    const configManager = ConfigManager.getInstance();
    const config = await configManager.getConfig();
    const autoUpdateAdapters: string[] = [];

    // 加载适配器映射数据（持久化数据）
    const { WorkspaceDataManager } = await import('./WorkspaceDataManager');
    const workspaceDataManager = WorkspaceDataManager.getInstance();
    const adapterMappings = await workspaceDataManager.readAdapterMappings();

    // 遍历所有适配器配置
    const allAdapters = new Map<string, AdapterConfig>();

    // 预设适配器
    for (const [key, value] of Object.entries(config.adapters)) {
      if (key === 'custom' || !value || typeof value !== 'object' || Array.isArray(value)) {
        continue;
      }
      allAdapters.set(key, value as AdapterConfig);
    }

    // 自定义适配器
    if (config.adapters.custom && Array.isArray(config.adapters.custom)) {
      for (const customAdapter of config.adapters.custom) {
        allAdapters.set(customAdapter.id, customAdapter);
      }
    }

    // 过滤出满足条件的适配器
    for (const [adapterId, adapterConfig] of allAdapters) {
      // 1. 适配器必须启用
      if (!adapterConfig.enabled) {
        continue;
      }

      // 2. 适配器必须有持久化数据（至少手动同步过一次）
      if (!adapterMappings || !adapterMappings.mappings[adapterId]) {
        Logger.debug(`Adapter ${adapterId} has no persisted data, skipping auto-update`);
        continue;
      }

      // 3. 检查 autoUpdate 配置
      // - 如果明确设置为 true，则参与自动同步
      // - 如果明确设置为 false，则不参与自动同步
      // - 如果未设置（undefined），则继承全局 sync.auto 配置
      const autoUpdate = adapterConfig.autoUpdate ?? config.sync.auto ?? false;

      if (autoUpdate) {
        autoUpdateAdapters.push(adapterId);
      }
    }

    Logger.debug('Auto-update adapters filtered', {
      total: allAdapters.size,
      autoUpdate: autoUpdateAdapters.length,
      adapters: autoUpdateAdapters.join(', '),
    });

    return autoUpdateAdapters;
  }

  /**
   * @description 销毁服务
   * @return default {void}
   */
  public dispose(): void {
    this.stop();
    this.disposables.forEach((d) => d.dispose());
    this.disposables = [];
    AutoSyncService.instance = undefined;
  }
}
