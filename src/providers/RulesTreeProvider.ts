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
  }

  private getTooltip(): string {
    switch (this.data.type) {
      case 'source':
        return this.data.source
          ? `${this.data.source.gitUrl}\nBranch: ${this.data.source.branch}`
          : '';
      case 'rule':
        return this.data.rule
          ? `ID: ${this.data.rule.id}\n${this.data.rule.metadata.description || ''}`
          : '';
      case 'tag':
        return `Tag: ${this.data.tag}`;
      default:
        return '';
    }
  }

  private getIcon(): vscode.ThemeIcon {
    switch (this.data.type) {
      case 'source':
        return this.data.source?.enabled
          ? new vscode.ThemeIcon('repo')
          : new vscode.ThemeIcon('repo', new vscode.ThemeColor('disabledForeground'));
      case 'rule':
        const priority = this.data.rule?.metadata.priority;
        if (priority === 'high') {
          return new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
        } else if (priority === 'medium') {
          return new vscode.ThemeIcon('warning', new vscode.ThemeColor('warningForeground'));
        }
        return new vscode.ThemeIcon('file');
      case 'tag':
        return new vscode.ThemeIcon('tag');
      default:
        return new vscode.ThemeIcon('question');
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
    const sources = await this.configManager.getSources();

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
