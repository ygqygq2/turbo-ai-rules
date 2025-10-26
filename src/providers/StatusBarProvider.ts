/**
 * 状态栏提供者
 * 显示同步状态和快捷操作
 */

import * as vscode from 'vscode';

import { RulesManager } from '../services/RulesManager';
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
  private statusBarItem: vscode.StatusBarItem;
  private syncStatus: SyncStatus = 'initializing';
  private lastSyncTime?: Date;
  private syncProgress?: SyncProgress;
  private updateTimer?: NodeJS.Timeout;

  constructor(private rulesManager: RulesManager) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'turbo-ai-rules.showMenu';
    this.updateStatusBar();
    this.statusBarItem.show();

    // 延迟设置为 idle 状态，避免闪烁
    setTimeout(() => {
      if (this.syncStatus === 'initializing') {
        this.setSyncStatus('idle');
      }
    }, 1000);
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
  private updateStatusBar(): void {
    const stats = this.rulesManager.getStats();

    // 图标和文本
    let icon = '$(file-code)';
    let text = `AI Rules`;
    let tooltip = 'Turbo AI Rules';
    let backgroundColor: vscode.ThemeColor | undefined;

    switch (this.syncStatus) {
      case 'initializing':
        icon = '$(loading~spin)';
        text = 'Loading...';
        tooltip = 'Initializing Turbo AI Rules';
        break;

      case 'syncing':
        icon = '$(sync~spin)';
        if (this.syncProgress) {
          const { completed, total, currentSource, operation } = this.syncProgress;
          text = `Syncing ${completed}/${total}`;
          tooltip = [
            'Syncing AI rules from configured sources',
            '',
            `Progress: ${completed}/${total} sources`,
            currentSource ? `Current: ${currentSource}` : '',
            operation ? `Operation: ${operation}` : '',
          ]
            .filter(Boolean)
            .join('\n');
        } else {
          text = 'Syncing...';
          tooltip = 'Syncing AI rules from configured sources';
        }
        break;

      case 'success':
        icon = '$(check)';
        text = `✓ ${stats.totalRules} Rules`;
        tooltip = this.getSuccessTooltip(stats);
        backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
        break;

      case 'error':
        icon = '$(error)';
        text = 'Sync Failed';
        tooltip = 'Failed to sync AI rules. Click to retry or view details.';
        backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
        break;

      case 'idle':
      default:
        icon = '$(file-code)';
        if (stats.totalRules > 0) {
          text = `${stats.totalRules} Rules`;
          tooltip = this.getIdleTooltip(stats);
          // 如果有冲突，显示警告颜色
          if (stats.conflictCount > 0) {
            icon = '$(warning)';
            backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
          }
        } else {
          text = 'No Rules';
          tooltip = 'No AI rules configured. Click to add sources and get started.';
        }
        break;
    }

    this.statusBarItem.text = `${icon} ${text}`;
    this.statusBarItem.tooltip = tooltip;
    this.statusBarItem.backgroundColor = backgroundColor;
  }

  /**
   * 获取成功状态的提示
   */
  private getSuccessTooltip(stats: {
    totalRules: number;
    sourceCount: number;
    cacheSize: number;
    conflictCount: number;
  }): string {
    const lines = [
      'Turbo AI Rules',
      '',
      `📚 Total Rules: ${stats.totalRules}`,
      `📦 Sources: ${stats.sourceCount}`,
      `💾 Cache Size: ${stats.cacheSize}`,
    ];

    if (stats.conflictCount > 0) {
      lines.push(`⚠️  Conflicts: ${stats.conflictCount}`);
    }

    if (this.lastSyncTime) {
      lines.push('');
      lines.push(`Last sync: ${this.formatTime(this.lastSyncTime)}`);
    }

    lines.push('');
    lines.push('Click to show menu');

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
  }): string {
    const lines = [
      'Turbo AI Rules',
      '',
      `📚 Total Rules: ${stats.totalRules}`,
      `📦 Sources: ${stats.sourceCount}`,
    ];

    if (stats.conflictCount > 0) {
      lines.push(`⚠️  Conflicts: ${stats.conflictCount}`);
    }

    lines.push('');
    lines.push('Click to show menu');

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
      return 'just now';
    } else if (minutes < 60) {
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleString();
    }
  }

  /**
   * 显示快捷菜单
   */
  public async showMenu(): Promise<void> {
    const stats = this.rulesManager.getStats();
    const items: vscode.QuickPickItem[] = [];

    // 根据当前状态动态生成菜单项
    if (this.syncStatus === 'syncing') {
      items.push({
        label: '$(loading~spin) Syncing in Progress...',
        description: 'Please wait for sync to complete',
        detail: 'Cannot perform other operations while syncing',
      });
    } else {
      // 同步操作
      items.push({
        label: '$(sync) Sync Rules',
        description: `Sync rules from ${stats.sourceCount} configured source${
          stats.sourceCount !== 1 ? 's' : ''
        }`,
        detail: 'Fetch and update AI rules from all enabled sources',
      });

      // 如果有错误，优先显示重试选项
      if (this.syncStatus === 'error') {
        items.push({
          label: '$(refresh) Retry Sync',
          description: 'Retry the failed sync operation',
          detail: 'Attempt to sync rules again',
        });
      }
    }

    // 源管理
    items.push(
      {
        label: '$(add) Add Source',
        description: 'Add a new rule source',
        detail: 'Configure a Git repository as a new rule source',
      },
      {
        label: '$(settings-gear) Manage Sources',
        description: `Manage ${stats.sourceCount} configured source${
          stats.sourceCount !== 1 ? 's' : ''
        }`,
        detail: 'Enable/disable, edit, or remove existing sources',
      },
    );

    // 规则操作（只有在有规则时显示）
    if (stats.totalRules > 0) {
      items.push(
        {
          label: '$(search) Search Rules',
          description: `Search in ${stats.totalRules} rule${stats.totalRules !== 1 ? 's' : ''}`,
          detail: 'Find rules by keywords, tags, or content',
        },
        {
          label: '$(file-code) Generate Configs',
          description: 'Generate AI tool config files',
          detail: 'Create .cursorrules, .copilot-instructions.md, etc.',
        },
      );
    }

    // 冲突管理（如果有冲突）
    if (stats.conflictCount > 0) {
      items.push({
        label: '$(warning) Resolve Conflicts',
        description: `${stats.conflictCount} rule conflict${
          stats.conflictCount !== 1 ? 's' : ''
        } detected`,
        detail: 'View and resolve rule conflicts',
      });
    }

    // 统计和信息
    items.push(
      {
        label: '$(graph) Show Statistics',
        description: 'View detailed statistics',
        detail: `Rules: ${stats.totalRules}, Sources: ${stats.sourceCount}, Cache: ${stats.cacheSize}`,
      },
      {
        label: '$(question) Help & Documentation',
        description: 'Open help documentation',
        detail: 'Learn how to use Turbo AI Rules effectively',
      },
    );

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Turbo AI Rules - Select an action',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selected) {
      return;
    }

    try {
      // 执行相应的命令
      if (selected.label.includes('Sync') && !selected.label.includes('Syncing in Progress')) {
        await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      } else if (selected.label.includes('Retry')) {
        await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      } else if (selected.label.includes('Add Source')) {
        await vscode.commands.executeCommand('turbo-ai-rules.addSource');
      } else if (selected.label.includes('Search')) {
        await vscode.commands.executeCommand('turbo-ai-rules.searchRules');
      } else if (selected.label.includes('Generate')) {
        await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
      } else if (selected.label.includes('Manage')) {
        await vscode.commands.executeCommand('turbo-ai-rules.manageSource');
      } else if (selected.label.includes('Resolve Conflicts')) {
        await this.showConflicts();
      } else if (selected.label.includes('Statistics')) {
        await this.showStatistics();
      } else if (selected.label.includes('Help')) {
        await this.showHelp();
      }
    } catch (error) {
      Logger.error('Failed to execute menu command', error instanceof Error ? error : undefined);
      vscode.window.showErrorMessage(
        `Failed to execute command: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 显示统计信息
   */
  private async showStatistics(): Promise<void> {
    // 调用新的统计视图 Webview
    await vscode.commands.executeCommand('turbo-ai-rules.showStatistics');
  }

  /**
   * 显示冲突详情
   */
  private async showConflicts(): Promise<void> {
    try {
      const conflicts = this.rulesManager.detectConflicts();

      if (conflicts.length === 0) {
        vscode.window.showInformationMessage('No rule conflicts detected.');
        return;
      }

      const conflictItems: vscode.QuickPickItem[] = conflicts.map((conflict) => ({
        label: `⚠️ ${conflict.ruleId}`,
        description: `${conflict.conflictingRules.length} conflicting rules`,
        detail: `Type: ${conflict.type} - ${conflict.conflictingRules
          .map((r) => r.sourceId)
          .join(', ')}`,
      }));

      const selected = await vscode.window.showQuickPick(conflictItems, {
        placeHolder: 'Select a conflict to resolve',
        ignoreFocusOut: true,
      });

      if (selected) {
        // 这里可以添加详细的冲突解决逻辑
        vscode.window.showInformationMessage(
          `Conflict resolution for "${selected.label}" - Feature coming soon!`,
        );
      }
    } catch (error) {
      Logger.error('Failed to show conflicts', error instanceof Error ? error : undefined);
      vscode.window.showErrorMessage('Failed to retrieve conflict information');
    }
  }

  /**
   * 显示帮助信息
   */
  private async showHelp(): Promise<void> {
    const helpItems: vscode.QuickPickItem[] = [
      {
        label: '$(book) User Guide',
        description: 'Complete user guide and documentation',
        detail: 'Learn how to configure and use Turbo AI Rules',
      },
      {
        label: '$(question) FAQ',
        description: 'Frequently asked questions',
        detail: 'Common questions and troubleshooting',
      },
      {
        label: '$(github) GitHub Repository',
        description: 'View source code and contribute',
        detail: 'Report issues, request features, and contribute',
      },
      {
        label: '$(comment-discussion) Community',
        description: 'Join discussions and get help',
        detail: 'Connect with other users and developers',
      },
    ];

    const selected = await vscode.window.showQuickPick(helpItems, {
      placeHolder: 'Get help with Turbo AI Rules',
    });

    if (selected) {
      if (selected.label.includes('User Guide')) {
        vscode.env.openExternal(
          vscode.Uri.parse(
            'https://github.com/ygqygq2/turbo-ai-rules/blob/main/docs/user-guide/README.md',
          ),
        );
      } else if (selected.label.includes('FAQ')) {
        vscode.env.openExternal(
          vscode.Uri.parse(
            'https://github.com/ygqygq2/turbo-ai-rules/blob/main/docs/user-guide/04-faq.md',
          ),
        );
      } else if (selected.label.includes('GitHub')) {
        vscode.env.openExternal(vscode.Uri.parse('https://github.com/ygqygq2/turbo-ai-rules'));
      } else if (selected.label.includes('Community')) {
        vscode.env.openExternal(
          vscode.Uri.parse('https://github.com/ygqygq2/turbo-ai-rules/discussions'),
        );
      }
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
