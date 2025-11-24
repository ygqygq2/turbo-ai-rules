/**
 * 自动同步服务
 * 负责定时自动同步规则源
 */

import * as vscode from 'vscode';

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

      // 执行同步命令
      Logger.info('▶️ Executing auto-sync command', { enabledSourcesCount: enabledSources.length });
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

      Logger.info('✅ Auto-sync completed successfully', {
        syncedSources: enabledSources.length,
      });
    } catch (error) {
      Logger.error('Auto-sync failed', error instanceof Error ? error : undefined);
      // 不显示错误通知，避免打扰用户
    }
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
