/**
 * 规则树视图提供者
 * 在侧边栏显示规则源和规则列表
 */

import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { RulesManager } from '../services/RulesManager';
import type { RuleSource } from '../types/config';
import type { ParsedRule } from '../types/rules';
import { Logger } from '../utils/logger';

/**
 * 树节点类型
 */
type TreeItemType = 'source' | 'rule' | 'tag' | 'empty';

/**
 * 树节点数据
 */
interface TreeItemData {
  type: TreeItemType;
  source?: RuleSource;
  rule?: ParsedRule;
  tag?: string;
  label: string;
}

/**
 * 规则树项
 */
class RuleTreeItem extends vscode.TreeItem {
  constructor(
    public readonly data: TreeItemData,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
  ) {
    super(data.label, collapsibleState);

    this.tooltip = this.getTooltip();
    this.iconPath = this.getIcon();
    this.contextValue = data.type;
    this.command = this.getCommand();
    this.description = this.getDescription();
  }

  private getTooltip(): string {
    switch (this.data.type) {
      case 'source': {
        if (!this.data.source) return '';
        const source = this.data.source;
        const lines = [
          `📦 ${source.name || 'Unnamed Source'}`,
          `🔗 ${source.gitUrl}`,
          `🌿 Branch: ${source.branch || 'main'}`,
          `📁 Path: ${source.subPath || '/'}`,
          `⚡ Status: ${source.enabled ? 'Enabled' : 'Disabled'}`,
        ];
        if (source.authentication?.token) {
          lines.push('🔑 Private repository');
        }
        return lines.join('\n');
      }
      case 'rule': {
        if (!this.data.rule) return '';
        const rule = this.data.rule;
        const ruleTip = [
          `📝 ${rule.title}`,
          `🆔 ID: ${rule.id}`,
          `⚡ Priority: ${rule.metadata.priority || 'normal'}`,
        ];
        if (rule.metadata.tags && rule.metadata.tags.length > 0) {
          ruleTip.push(`🏷️ Tags: ${rule.metadata.tags.join(', ')}`);
        }
        if (rule.metadata.description) {
          ruleTip.push(`📄 ${rule.metadata.description}`);
        }
        return ruleTip.join('\n');
      }
      case 'tag':
        return `🏷️ Tag: ${this.data.tag}`;
      case 'empty':
        return 'No items to display';
      default:
        return '';
    }
  }

  private getIcon(): vscode.ThemeIcon {
    switch (this.data.type) {
      case 'source':
        if (!this.data.source?.enabled) {
          return new vscode.ThemeIcon('repo', new vscode.ThemeColor('disabledForeground'));
        }
        // 根据源的状态显示不同图标
        return new vscode.ThemeIcon('repo', new vscode.ThemeColor('charts-blue'));
      case 'rule': {
        const priority = this.data.rule?.metadata.priority;
        // 根据优先级显示不同的图标和颜色
        switch (priority) {
          case 'high':
            return new vscode.ThemeIcon('flame', new vscode.ThemeColor('errorForeground'));
          case 'medium':
            return new vscode.ThemeIcon('warning', new vscode.ThemeColor('warningForeground'));
          case 'low':
            return new vscode.ThemeIcon('info', new vscode.ThemeColor('descriptionForeground'));
          default:
            return new vscode.ThemeIcon('file-text', new vscode.ThemeColor('foreground'));
        }
      }
      case 'tag':
        return new vscode.ThemeIcon('tag', new vscode.ThemeColor('charts-purple'));
      case 'empty':
        return new vscode.ThemeIcon('info', new vscode.ThemeColor('descriptionForeground'));
      default:
        return new vscode.ThemeIcon('question');
    }
  }

  private getDescription(): string | undefined {
    switch (this.data.type) {
      case 'source': {
        if (!this.data.source) return undefined;
        const status = this.data.source.enabled ? '✓' : '✗';
        return `${status} ${this.data.source.branch || 'main'}`;
      }
      case 'rule': {
        if (!this.data.rule) return undefined;
        const priority = this.data.rule.metadata.priority;
        const tags = this.data.rule.metadata.tags;
        const parts = [];
        if (priority) {
          parts.push(priority.toUpperCase());
        }
        if (tags && tags.length > 0) {
          parts.push(tags.slice(0, 2).join(', '));
          if (tags.length > 2) {
            parts.push(`+${tags.length - 2}`);
          }
        }
        return parts.length > 0 ? parts.join(' • ') : undefined;
      }
      case 'tag':
        return undefined;
      default:
        return undefined;
    }
  }

  private getCommand(): vscode.Command | undefined {
    if (this.data.type === 'rule' && this.data.rule) {
      return {
        command: 'turbo-ai-rules.showRuleDetail',
        title: 'Show Rule Detail',
        arguments: [this.data.rule],
      };
    }
    return undefined;
  }
}

/**
 * 规则树数据提供者
 */
export class RulesTreeProvider implements vscode.TreeDataProvider<RuleTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<RuleTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(
    private configManager: ConfigManager,
    private rulesManager: RulesManager,
  ) {}

  /**
   * 刷新树视图
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * 获取树项
   */
  getTreeItem(element: RuleTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * 获取子节点
   */
  async getChildren(element?: RuleTreeItem): Promise<RuleTreeItem[]> {
    try {
      if (!element) {
        // 根节点：显示所有源
        return await this.getRootItems();
      }

      switch (element.data.type) {
        case 'source':
          // 源节点：显示该源的规则
          return await this.getSourceRules(element.data.source!);
        case 'tag':
          // 标签节点：显示该标签的规则
          return await this.getTagRules(element.data.tag!);
        default:
          return [];
      }
    } catch (error) {
      Logger.error('Failed to get tree children', error instanceof Error ? error : undefined);
      return [];
    }
  }

  /**
   * 获取根节点
   */
  private async getRootItems(): Promise<RuleTreeItem[]> {
    // 获取当前活动的 workspace folder
    let workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const activeWorkspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
      if (activeWorkspaceFolder) {
        workspaceFolder = activeWorkspaceFolder;
      }
    }

    const sources = this.configManager.getSources(workspaceFolder?.uri);

    if (sources.length === 0) {
      return [
        new RuleTreeItem(
          {
            type: 'empty',
            label: 'No sources configured',
          },
          vscode.TreeItemCollapsibleState.None,
        ),
      ];
    }

    return sources.map(
      (source) =>
        new RuleTreeItem(
          {
            type: 'source',
            source,
            label: source.name || source.gitUrl,
          },
          vscode.TreeItemCollapsibleState.Collapsed,
        ),
    );
  }

  /**
   * 获取源的规则
   */
  private async getSourceRules(source: RuleSource): Promise<RuleTreeItem[]> {
    const rules = this.rulesManager.getRulesBySource(source.id);

    if (rules.length === 0) {
      return [
        new RuleTreeItem(
          {
            type: 'empty',
            label: 'No rules (sync to fetch)',
          },
          vscode.TreeItemCollapsibleState.None,
        ),
      ];
    }

    return rules.map(
      (rule) =>
        new RuleTreeItem(
          {
            type: 'rule',
            rule,
            label: rule.title,
          },
          vscode.TreeItemCollapsibleState.None,
        ),
    );
  }

  /**
   * 获取标签的规则
   */
  private async getTagRules(tag: string): Promise<RuleTreeItem[]> {
    const rules = this.rulesManager.filterByTags([tag]);

    return rules.map(
      (rule) =>
        new RuleTreeItem(
          {
            type: 'rule',
            rule,
            label: rule.title,
          },
          vscode.TreeItemCollapsibleState.None,
        ),
    );
  }
}
