/**
 * 状态栏提供者
 * 显示同步状态和快捷操作
 */

import * as vscode from 'vscode';

import { RulesManager } from '../services/RulesManager';
import { WorkspaceStateManager } from '../services/WorkspaceStateManager';
import { t } from '../utils/i18n';
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
      // ✅ 从 allSourceSyncStats 获取，避免额外调用 getSources
      const allSourceSyncStats = await stateManager.getAllSourceSyncStats();

      const syncTimes: Date[] = [];
      for (const sourceId of Object.keys(allSourceSyncStats)) {
        const sourceStats = allSourceSyncStats[sourceId];
        if (sourceStats?.lastSyncTime) {
          const date = new Date(sourceStats.lastSyncTime);
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
    let totalSyncedRules = 0;
    let syncedSourceCount = 0;
    let sourceCount = 0;

    // 如果内存中没有规则，尝试从 WorkspaceState 加载统计信息
    if (stats.totalRules === 0) {
      try {
        const stateManager = WorkspaceStateManager.getInstance();
        const cachedStats = await stateManager.getRulesStats();
        if (cachedStats.totalRules > 0 || cachedStats.totalSyncedRules > 0) {
          stats = {
            ...stats,
            totalRules: cachedStats.totalRules,
            sourceCount: cachedStats.sourceCount,
            enabledSourceCount: cachedStats.enabledSourceCount,
          };
          totalSyncedRules = cachedStats.totalSyncedRules;
          syncedSourceCount = cachedStats.syncedSourceCount;
          sourceCount = cachedStats.sourceCount;
        }
      } catch (_error) {
        // 忽略错误，使用默认值
      }
    } else {
      // 使用内存中的统计
      sourceCount = stats.sourceCount;

      // 从 WorkspaceState 获取已同步规则数
      try {
        const stateManager = WorkspaceStateManager.getInstance();
        const cachedStats = await stateManager.getRulesStats();
        totalSyncedRules = cachedStats.totalSyncedRules;
        syncedSourceCount = cachedStats.syncedSourceCount;
      } catch (_error) {
        // 忽略错误
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
        text = t('statusBar.loading');
        tooltip = t('statusBar.initializing');
        break;

      case 'syncing':
        icon = '$(sync~spin)';
        if (this.syncProgress) {
          const { completed, total, currentSource, operation } = this.syncProgress;
          text = t('statusBar.syncingProgress', completed, total);
          tooltip = t(
            'statusBar.tooltip.syncingDetail',
            completed,
            total,
            currentSource || '',
            operation || '',
          );
        } else {
          text = t('statusBar.syncing');
          tooltip = t('statusBar.tooltip.syncing');
        }
        break;

      case 'success': {
        icon = '✅'; // 绿色勾
        text = `${totalSyncedRules}R·${syncedSourceCount}/${sourceCount}S`;
        tooltip = await this.getSuccessTooltip(totalSyncedRules, syncedSourceCount, sourceCount);
        backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;
      }

      case 'error':
        icon = '$(error)';
        text = t('statusBar.syncFailed');
        tooltip = t('statusBar.tooltip.failed');
        backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;

      case 'idle':
      default:
        // 保持使用 logo 图标
        if (stats.totalRules > 0 || totalSyncedRules > 0) {
          // 显示已同步规则数和源数
          text = `${totalSyncedRules}R·${syncedSourceCount}/${sourceCount}S`;
          tooltip = await this.getIdleTooltip(totalSyncedRules, syncedSourceCount, sourceCount);
          // 如果有冲突，显示警告颜色
          if (stats.conflictCount > 0) {
            icon = '⚠️'; // 警告
            backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
          }
        } else {
          text = t('statusBar.noRules');
          tooltip = t('statusBar.tooltip.idle', 0, 0, 0);
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
   * @description 获取成功状态的提示
   * @return {Promise<string>}
   * @param totalSyncedRules {number}
   * @param syncedSourceCount {number}
   * @param sourceCount {number}
   */
  private async getSuccessTooltip(
    totalSyncedRules: number,
    syncedSourceCount: number,
    sourceCount: number,
  ): Promise<string> {
    const lines = [t('statusBar.tooltip.syncSuccess'), '', t('statusBar.tooltip.statsTitle')];

    // 添加规则和 Skills 统计
    try {
      const stateManager = WorkspaceStateManager.getInstance();
      const cachedStats = await stateManager.getRulesStats();

      // 规则统计（带适配器数量）
      lines.push(
        t('statusBar.tooltip.syncedRules', totalSyncedRules, cachedStats.syncedRulesAdapterCount),
      );

      // Skills 统计
      if (cachedStats.totalSyncedSkills !== undefined && cachedStats.totalSyncedSkills > 0) {
        lines.push(
          t(
            'statusBar.tooltip.syncedSkills',
            cachedStats.totalSyncedSkills,
            cachedStats.syncedSkillsAdapterCount || 0,
          ),
        );
      }
    } catch (_error) {
      // 降级到不带适配器数量的显示
      lines.push(t('statusBar.tooltip.syncedRules', totalSyncedRules, 0));
    }

    // 规则源统计
    lines.push(t('statusBar.tooltip.sources', syncedSourceCount, sourceCount));

    // 添加各规则源详情
    const sourceDetails = await this.getSourceDetails();
    if (sourceDetails.length > 0) {
      lines.push('');
      lines.push(t('statusBar.tooltip.sourcesTitle'));
      lines.push(...sourceDetails);
    }

    if (this.lastSyncTime) {
      lines.push('');
      lines.push(t('statusBar.tooltip.lastSync', this.formatTime(this.lastSyncTime)));
    }

    lines.push('');
    lines.push(t('statusBar.clickToOpen'));

    return lines.join('\n');
  }

  /**
   * @description 获取空闲状态的提示
   * @return {Promise<string>}
   * @param totalSyncedRules {number}
   * @param syncedSourceCount {number}
   * @param sourceCount {number}
   */
  private async getIdleTooltip(
    totalSyncedRules: number,
    syncedSourceCount: number,
    sourceCount: number,
  ): Promise<string> {
    const lines = ['Turbo AI Rules', '', t('statusBar.tooltip.statsTitle')];

    // 添加规则和 Skills 统计
    try {
      const stateManager = WorkspaceStateManager.getInstance();
      const cachedStats = await stateManager.getRulesStats();

      // 规则统计（带适配器数量）
      lines.push(
        t('statusBar.tooltip.syncedRules', totalSyncedRules, cachedStats.syncedRulesAdapterCount),
      );

      // Skills 统计
      if (cachedStats.totalSyncedSkills !== undefined && cachedStats.totalSyncedSkills > 0) {
        lines.push(
          t(
            'statusBar.tooltip.syncedSkills',
            cachedStats.totalSyncedSkills,
            cachedStats.syncedSkillsAdapterCount || 0,
          ),
        );
      }
    } catch (_error) {
      // 降级到不带适配器数量的显示
      lines.push(t('statusBar.tooltip.syncedRules', totalSyncedRules, 0));
    }

    // 规则源统计
    lines.push(t('statusBar.tooltip.sources', syncedSourceCount, sourceCount));

    // 添加各规则源详情
    const sourceDetails = await this.getSourceDetails();
    if (sourceDetails.length > 0) {
      lines.push('');
      lines.push(t('statusBar.tooltip.sourcesTitle'));
      lines.push(...sourceDetails);
    }

    if (this.lastSyncTime) {
      lines.push('');
      lines.push(t('statusBar.tooltip.lastSync', this.formatTime(this.lastSyncTime)));
    }

    lines.push('');
    lines.push(t('statusBar.clickToOpen'));

    return lines.join('\n');
  }

  /**
   * @description 获取各规则源的详细信息
   * @return {Promise<string[]>}
   */
  private async getSourceDetails(): Promise<string[]> {
    const lines: string[] = [];

    try {
      const configManager = (await import('../services/ConfigManager')).ConfigManager.getInstance();
      const stateManager = WorkspaceStateManager.getInstance();

      const sources = configManager.getSources();
      const allSourceSyncStats = await stateManager.getAllSourceSyncStats();

      for (const source of sources) {
        const stats = allSourceSyncStats[source.id];

        if (!stats) {
          // 未同步过
          lines.push(`  ⏳ ${source.name} (${t('statusBar.tooltip.sourceNever')})`);
        } else if (stats.syncStatus === 'success') {
          // 同步成功
          const timeStr = this.formatTime(new Date(stats.lastSyncTime));
          lines.push(
            `  ✅ ${source.name} (${t('statusBar.tooltip.sourceSuccess', stats.syncedRulesCount, timeStr)})`,
          );
        } else if (stats.syncStatus === 'failed') {
          // 同步失败
          lines.push(`  ❌ ${source.name} (${t('statusBar.tooltip.sourceFailed')})`);
        }
      }
    } catch (_error) {
      // 忽略错误
    }

    return lines;
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
      return t('time.justNow');
    } else if (minutes < 60) {
      return t('time.minutesAgo', minutes);
    } else if (hours < 24) {
      return t('time.hoursAgo', hours);
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
