/**
 * 状态栏提供者
 * 显示同步状态和快捷操作
 */

import * as vscode from 'vscode';

import { RulesManager } from '../services/RulesManager';
import { WorkspaceStateManager } from '../services/WorkspaceStateManager';
import { Logger } from '../utils/logger';

/**
 * 同步状态
 */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'initializing';

/**
 * 同步进度信息
 */
export interface SyncProgress {
  /** 当前处理的源 */
  currentSource?: string;
  /** 已完成的源数量 */
  completed: number;
  /** 总源数量 */
  total: number;
  /** 当前操作描述 */
  operation?: string;
}

/**
 * 状态栏提供者
 */
export class StatusBarProvider {
  private static instance: StatusBarProvider | undefined;
  private statusBarItem: vscode.StatusBarItem;
  private syncStatus: SyncStatus = 'initializing';
  private lastSyncTime?: Date;
  private syncProgress?: SyncProgress;
  private updateTimer?: NodeJS.Timeout;

  private constructor(private rulesManager: RulesManager) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'workbench.view.extension.turbo-ai-rules';
    this.updateStatusBar();
    this.statusBarItem.show();

    // 异步加载最后同步时间
    this.loadLastSyncTime();

    // 延迟设置为 idle 状态，避免闪烁
    setTimeout(() => {
      if (this.syncStatus === 'initializing') {
        this.setSyncStatus('idle');
      }
    }, 1000);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(rulesManager?: RulesManager): StatusBarProvider {
    if (!StatusBarProvider.instance) {
      if (!rulesManager) {
        throw new Error('RulesManager is required for first initialization');
      }
      StatusBarProvider.instance = new StatusBarProvider(rulesManager);
    }
    return StatusBarProvider.instance;
  }

  /**
   * 加载最后同步时间（从 WorkspaceStateManager 读取）
   */
  private async loadLastSyncTime(): Promise<void> {
    try {
      const stateManager = WorkspaceStateManager.getInstance();

      // 获取统计信息并触发更新
      const stats = await stateManager.getRulesStats();
      if (stats.totalRules > 0) {
        // 有统计数据，触发一次更新显示
        this.updateStatusBar();
        Logger.debug('Loaded rules stats from workspace state', stats);
      }

      // 获取所有源的最后同步时间，取最近的一个
      const configManager = (await import('../services/ConfigManager')).ConfigManager.getInstance();
      const sources = configManager.getSources();

      const syncTimes: Date[] = [];
      for (const source of sources) {
        const timeStr = await stateManager.getLastSyncTime(source.id);
        if (timeStr) {
          const date = new Date(timeStr);
          if (!isNaN(date.getTime())) {
            syncTimes.push(date);
          }
        }
      }

      if (syncTimes.length > 0) {
        this.lastSyncTime = new Date(Math.max(...syncTimes.map((d) => d.getTime())));
        this.updateStatusBar();
        Logger.debug('Loaded last sync time from workspace state', {
          lastSyncTime: this.lastSyncTime,
        });
      }
    } catch (error) {
      Logger.error('Failed to load last sync time', error instanceof Error ? error : undefined);
    }
  }
  /**
   * 设置同步状态
   */
  public setSyncStatus(status: SyncStatus, progress?: SyncProgress): void {
    this.syncStatus = status;
    this.syncProgress = progress;

    if (status === 'success') {
      this.lastSyncTime = new Date();
      this.syncProgress = undefined;

      // 成功状态显示3秒后自动转为 idle
      if (this.updateTimer) {
        clearTimeout(this.updateTimer);
      }
      this.updateTimer = setTimeout(() => {
        if (this.syncStatus === 'success') {
          this.setSyncStatus('idle');
        }
      }, 3000);
    } else if (status === 'error') {
      this.syncProgress = undefined;

      // 错误状态显示10秒后自动转为 idle
      if (this.updateTimer) {
        clearTimeout(this.updateTimer);
      }
      this.updateTimer = setTimeout(() => {
        if (this.syncStatus === 'error') {
          this.setSyncStatus('idle');
        }
      }, 10000);
    } else if (status === 'idle') {
      this.syncProgress = undefined;
      if (this.updateTimer) {
        clearTimeout(this.updateTimer);
        this.updateTimer = undefined;
      }
    }

    this.updateStatusBar();
  }

  /**
   * 更新状态栏
   */
  private async updateStatusBar(): Promise<void> {
    let stats = this.rulesManager.getStats();

    // 如果内存中没有规则，尝试从 WorkspaceState 加载统计信息
    if (stats.totalRules === 0) {
      try {
        const stateManager = WorkspaceStateManager.getInstance();
        const cachedStats = await stateManager.getRulesStats();
        if (cachedStats.totalRules > 0) {
          stats = {
            ...stats,
            totalRules: cachedStats.totalRules,
            sourceCount: cachedStats.sourceCount,
            enabledSourceCount: cachedStats.enabledSourceCount,
          };
        }
      } catch (_error) {
        // 忽略错误，使用默认值
      }
    }

    // 图标和文本
    let icon = this.getLogoIcon();
    let text = `AI Rules`;
    let tooltip = 'Turbo AI Rules';
    let backgroundColor: vscode.ThemeColor | undefined;

    switch (this.syncStatus) {
      case 'initializing':
        icon = '⏳'; // 沙漏
        text = vscode.l10n.t('statusBar.loading');
        tooltip = vscode.l10n.t('statusBar.initializing');
        break;

      case 'syncing':
        icon = '$(sync~spin)';
        if (this.syncProgress) {
          const { completed, total, currentSource, operation } = this.syncProgress;
          text = vscode.l10n.t('statusBar.syncingProgress', completed, total);
          tooltip = vscode.l10n.t(
            'statusBar.tooltip.syncingDetail',
            completed,
            total,
            currentSource || '',
            operation || '',
          );
        } else {
          text = vscode.l10n.t('statusBar.syncing');
          tooltip = vscode.l10n.t('statusBar.tooltip.syncing');
        }
        break;

      case 'success': {
        icon = '✅'; // 绿色勾
        const enabledCount = stats.enabledSourceCount || stats.sourceCount;
        text = `${stats.totalRules}R·${enabledCount}S`;
        tooltip = this.getSuccessTooltip(stats);
        backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;
      }

      case 'error':
        icon = '$(error)';
        text = vscode.l10n.t('statusBar.syncFailed');
        tooltip = vscode.l10n.t('statusBar.tooltip.failed');
        backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;

      case 'idle':
      default:
        // 保持使用 logo 图标
        if (stats.totalRules > 0) {
          // 显示规则数和启用的源数
          const enabledCount = stats.enabledSourceCount || stats.sourceCount;
          text = `${stats.totalRules}R·${enabledCount}S`;
          tooltip = this.getIdleTooltip(stats);
          // 如果有冲突，显示警告颜色
          if (stats.conflictCount > 0) {
            icon = '⚠️'; // 警告
            backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
          }
        } else {
          text = vscode.l10n.t('statusBar.noRules');
          tooltip = vscode.l10n.t('statusBar.tooltip.idle', 0, 0, 0);
        }
        break;
    }

    this.statusBarItem.text = `${icon} ${text}`;
    this.statusBarItem.tooltip = tooltip;
    this.statusBarItem.backgroundColor = backgroundColor;
  }

  /**
   * 获取 Logo 图标
   */
  private getLogoIcon(): string {
    // 使用注册的自定义图标字体
    return '$(turbo-ai-rules-logo)';
  }

  /**
   * 获取成功状态的提示
   */
  private getSuccessTooltip(stats: {
    totalRules: number;
    sourceCount: number;
    cacheSize: number;
    conflictCount: number;
    enabledSourceCount?: number;
  }): string {
    const enabledCount = stats.enabledSourceCount || stats.sourceCount;
    const lines = [
      vscode.l10n.t('statusBar.tooltip.success', stats.totalRules, enabledCount, stats.sourceCount),
    ];

    if (stats.cacheSize) {
      lines.push(vscode.l10n.t('statusBar.tooltip.cache', stats.cacheSize));
    }

    if (stats.conflictCount > 0) {
      lines.push(vscode.l10n.t('statusBar.tooltip.conflicts', stats.conflictCount));
    }

    if (this.lastSyncTime) {
      lines.push('');
      lines.push(vscode.l10n.t('statusBar.tooltip.justNow'));
    }

    lines.push('');
    lines.push(vscode.l10n.t('statusBar.clickToOpen'));

    return lines.join('\n');
  }

  /**
   * 获取空闲状态的提示
   */
  private getIdleTooltip(stats: {
    totalRules: number;
    sourceCount: number;
    cacheSize: number;
    conflictCount: number;
    enabledSourceCount?: number;
  }): string {
    const enabledCount = stats.enabledSourceCount || stats.sourceCount;
    const lines = [
      vscode.l10n.t('statusBar.tooltip.idle', stats.totalRules, enabledCount, stats.sourceCount),
    ];

    if (stats.cacheSize) {
      lines.push(vscode.l10n.t('statusBar.tooltip.cache', stats.cacheSize));
    }

    if (stats.conflictCount > 0) {
      lines.push(vscode.l10n.t('statusBar.tooltip.conflicts', stats.conflictCount));
    }

    if (this.lastSyncTime) {
      lines.push('');
      lines.push(vscode.l10n.t('statusBar.tooltip.lastSync', this.formatTime(this.lastSyncTime)));
    }

    lines.push('');
    lines.push(vscode.l10n.t('statusBar.clickToOpen'));

    return lines.join('\n');
  }

  /**
   * 格式化时间
   */
  private formatTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) {
      return vscode.l10n.t('time.justNow');
    } else if (minutes < 60) {
      return vscode.l10n.t('time.minutesAgo', minutes);
    } else if (hours < 24) {
      return vscode.l10n.t('time.hoursAgo', hours);
    } else {
      return date.toLocaleString();
    }
  }

  /**
   * 释放资源
   */
  public dispose(): void {
    if (this.updateTimer) {
      clearTimeout(this.updateTimer);
    }
    this.statusBarItem.dispose();
  }
}
