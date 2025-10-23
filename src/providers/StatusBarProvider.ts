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
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * 状态栏提供者
 */
export class StatusBarProvider {
  private statusBarItem: vscode.StatusBarItem;
  private syncStatus: SyncStatus = 'idle';
  private lastSyncTime?: Date;

  constructor(private rulesManager: RulesManager) {
    this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    this.statusBarItem.command = 'turbo-ai-rules.showMenu';
    this.updateStatusBar();
    this.statusBarItem.show();
  }

  /**
   * 设置同步状态
   */
  public setSyncStatus(status: SyncStatus): void {
    this.syncStatus = status;

    if (status === 'success') {
      this.lastSyncTime = new Date();
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

    switch (this.syncStatus) {
      case 'syncing':
        icon = '$(sync~spin)';
        text = 'Syncing...';
        tooltip = 'Syncing AI rules from configured sources';
        break;

      case 'success':
        icon = '$(check)';
        text = `${stats.totalRules} Rules`;
        tooltip = this.getSuccessTooltip(stats);
        break;

      case 'error':
        icon = '$(error)';
        text = 'Sync Failed';
        tooltip = 'Failed to sync AI rules. Click to retry.';
        break;

      case 'idle':
      default:
        if (stats.totalRules > 0) {
          text = `${stats.totalRules} Rules`;
          tooltip = this.getIdleTooltip(stats);
        } else {
          text = 'No Rules';
          tooltip = 'No AI rules configured. Click to add sources.';
        }
        break;
    }

    this.statusBarItem.text = `${icon} ${text}`;
    this.statusBarItem.tooltip = tooltip;

    // 根据状态设置颜色
    if (this.syncStatus === 'error') {
      this.statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
    } else if (this.syncStatus === 'success') {
      this.statusBarItem.backgroundColor = undefined;
    } else {
      this.statusBarItem.backgroundColor = undefined;
    }
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
    const items: vscode.QuickPickItem[] = [
      {
        label: '$(sync) Sync Rules',
        description: 'Sync rules from all configured sources',
        detail: 'Fetch and update AI rules',
      },
      {
        label: '$(add) Add Source',
        description: 'Add a new rule source',
        detail: 'Configure a Git repository as a rule source',
      },
      {
        label: '$(search) Search Rules',
        description: 'Search in all rules',
        detail: 'Find rules by keywords, tags, or content',
      },
      {
        label: '$(file-code) Generate Configs',
        description: 'Generate AI tool config files',
        detail: 'Create .cursorrules, .copilot-instructions.md, etc.',
      },
      {
        label: '$(settings-gear) Manage Sources',
        description: 'Manage configured sources',
        detail: 'Enable/disable, edit, or remove sources',
      },
      {
        label: '$(info) Show Statistics',
        description: 'View rules statistics',
        detail: 'See total rules, sources, conflicts, etc.',
      },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Turbo AI Rules - Select an action',
    });

    if (!selected) {
      return;
    }

    // 执行相应的命令
    if (selected.label.includes('Sync')) {
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    } else if (selected.label.includes('Add Source')) {
      await vscode.commands.executeCommand('turbo-ai-rules.addSource');
    } else if (selected.label.includes('Search')) {
      await vscode.commands.executeCommand('turbo-ai-rules.searchRules');
    } else if (selected.label.includes('Generate')) {
      await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
    } else if (selected.label.includes('Manage')) {
      await vscode.commands.executeCommand('turbo-ai-rules.manageSource');
    } else if (selected.label.includes('Statistics')) {
      await this.showStatistics();
    }
  }

  /**
   * 显示统计信息
   */
  private async showStatistics(): Promise<void> {
    try {
      const stats = this.rulesManager.getStats();
      const conflicts = this.rulesManager.detectConflicts();

      const lines = [
        '📊 **Turbo AI Rules Statistics**',
        '',
        `📚 **Total Rules:** ${stats.totalRules}`,
        `📦 **Sources:** ${stats.sourceCount}`,
        `💾 **Cache Size:** ${stats.cacheSize}`,
        `⚠️  **Conflicts:** ${stats.conflictCount}`,
      ];

      if (this.lastSyncTime) {
        lines.push('');
        lines.push(`🕒 **Last Sync:** ${this.lastSyncTime.toLocaleString()}`);
      }

      if (conflicts.length > 0) {
        lines.push('');
        lines.push('**Conflict Details:**');
        for (const conflict of conflicts.slice(0, 5)) {
          lines.push(`- ${conflict.ruleId} (${conflict.conflictingRules.length} duplicates)`);
        }
        if (conflicts.length > 5) {
          lines.push(`... and ${conflicts.length - 5} more`);
        }
      }

      const content = lines.join('\n');

      vscode.window.showInformationMessage(content, { modal: false });
      Logger.info('Statistics displayed', stats);
    } catch (error) {
      Logger.error('Failed to show statistics', error instanceof Error ? error : undefined);
      vscode.window.showErrorMessage('Failed to retrieve statistics');
    }
  }

  /**
   * 释放资源
   */
  public dispose(): void {
    this.statusBarItem.dispose();
  }
}
