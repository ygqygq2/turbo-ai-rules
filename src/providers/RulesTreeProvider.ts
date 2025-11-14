/**
 * 规则树视图提供者
 * 在侧边栏显示规则源和规则列表
 */

import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { RulesManager } from '../services/RulesManager';
import { SelectionChannelManager } from '../services/SelectionChannelManager';
import { WorkspaceDataManager } from '../services/WorkspaceDataManager';
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
  // 规则选择状态（仅用于源节点）
  selectedCount?: number;
  totalCount?: number;
  // 规则是否被选中（仅用于规则节点）
  isSelected?: boolean;
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

    // 为规则节点添加复选框
    if (data.type === 'rule') {
      this.checkboxState = data.isSelected
        ? vscode.TreeItemCheckboxState.Checked
        : vscode.TreeItemCheckboxState.Unchecked;
    }
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
          // 禁用的源：使用灰色的 repo 图标
          return new vscode.ThemeIcon('repo', new vscode.ThemeColor('disabledForeground'));
        }
        // 启用的源：使用蓝色的 repo-check 图标
        return new vscode.ThemeIcon('repo-check', new vscode.ThemeColor('charts.blue'));
      case 'rule': {
        // 如果规则被选中，使用带勾选的图标
        if (this.data.isSelected) {
          const priority = this.data.rule?.metadata.priority;
          // 根据优先级显示不同的图标和颜色
          switch (priority) {
            case 'high':
              return new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('errorForeground'));
            case 'medium':
              return new vscode.ThemeIcon(
                'pass-filled',
                new vscode.ThemeColor('warningForeground'),
              );
            case 'low':
              return new vscode.ThemeIcon(
                'pass-filled',
                new vscode.ThemeColor('descriptionForeground'),
              );
            default:
              return new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('foreground'));
          }
        }

        // 未选中的规则使用普通图标
        const priority = this.data.rule?.metadata.priority;
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
        const parts = [];

        // 状态标记
        if (this.data.source.enabled) {
          parts.push('✅ 已启用');
        } else {
          parts.push('❌ 已禁用');
        }

        // 分支信息
        parts.push(this.data.source.branch || 'main');

        // 规则选择状态
        if (this.data.selectedCount !== undefined && this.data.totalCount !== undefined) {
          if (this.data.totalCount === 0) {
            parts.push('📭 无规则');
          } else if (this.data.selectedCount === 0) {
            parts.push('⚠️ 未选择');
          } else if (this.data.selectedCount === this.data.totalCount) {
            parts.push(`✅ 全部已选 (${this.data.totalCount})`);
          } else {
            parts.push(`📊 ${this.data.selectedCount}/${this.data.totalCount} 已选`);
          }
        }

        return parts.join(' • ');
      }
      case 'rule': {
        if (!this.data.rule) return undefined;
        const parts = [];

        // 选择状态标记
        if (this.data.isSelected) {
          parts.push('✓ 已选');
        }

        const priority = this.data.rule.metadata.priority;
        const tags = this.data.rule.metadata.tags;

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
  private workspaceDataManager: WorkspaceDataManager;
  private channelManager: SelectionChannelManager;
  private refreshTimeout?: NodeJS.Timeout;

  constructor(private configManager: ConfigManager, private rulesManager: RulesManager) {
    this.workspaceDataManager = WorkspaceDataManager.getInstance();
    this.channelManager = SelectionChannelManager.getInstance();

    // 监听活动编辑器变化，自动刷新树视图（切换工作区文件夹时更新源列表）
    vscode.window.onDidChangeActiveTextEditor(() => {
      this.refresh();
    });
  }

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
   * @description 处理复选框状态变更（内存更新 + 延时落盘）
   * @return {Promise<void>}
   * @param items {readonly [RuleTreeItem, vscode.TreeItemCheckboxState][]}
   */
  async handleCheckboxChange(
    items: readonly [RuleTreeItem, vscode.TreeItemCheckboxState][],
  ): Promise<void> {
    try {
      const changesBySource = new Map<string, Set<string>>();

      // 收集每个源的选择变更
      for (const [item, checkState] of items) {
        if (item.data.type !== 'rule' || !item.data.rule?.filePath) continue;

        const sourceId = item.data.rule.sourceId;
        const filePath = item.data.rule.filePath;

        if (!changesBySource.has(sourceId)) {
          // 优先从内存状态获取，其次从持久化存储
          const memoryState = this.channelManager.getMemoryState(sourceId);
          if (memoryState) {
            changesBySource.set(sourceId, new Set(memoryState));
          } else {
            const selection = await this.workspaceDataManager.getRuleSelection(sourceId);
            const currentPaths = new Set(selection?.paths || []);
            changesBySource.set(sourceId, currentPaths);
          }
        }

        const paths = changesBySource.get(sourceId)!;
        if (checkState === vscode.TreeItemCheckboxState.Checked) {
          paths.add(filePath);
        } else {
          paths.delete(filePath);
        }
      }

      // 通过 MessageChannel 更新内存状态并广播，安排延时落盘
      for (const [sourceId, paths] of changesBySource.entries()) {
        const totalCount = this.rulesManager.getRulesBySource(sourceId).length;

        // 更新内存状态，通过 MessageChannel 实时同步，并安排500ms后落盘
        this.channelManager.updateMemoryState(
          sourceId,
          Array.from(paths),
          totalCount,
          true, // 启用延时落盘
        );

        Logger.debug('Checkbox change - memory updated, persistence scheduled', {
          sourceId,
          selectedCount: paths.size,
          totalCount,
        });
      }

      // 刷新树视图
      this.refresh();
    } catch (error) {
      Logger.error('Failed to handle checkbox change', error instanceof Error ? error : undefined);
      vscode.window.showErrorMessage(`更新规则选择失败: ${error}`);
    }
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
    // 获取当前活动编辑器所属的工作区文件夹
    let resourceUri: vscode.Uri | undefined;
    const activeEditor = vscode.window.activeTextEditor;

    if (activeEditor) {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
      if (workspaceFolder) {
        resourceUri = workspaceFolder.uri;
        Logger.debug('RulesTreeProvider getting sources from active workspace folder', {
          folder: workspaceFolder.name,
        });
      }
    } else {
      Logger.debug('RulesTreeProvider getting sources (no active editor)');
    }

    // 传递 resourceUri：
    // - 有活动编辑器 → 读取其所属工作区文件夹的配置
    // - 无活动编辑器 → 读取 workspace settings 或 global 配置
    const sources = this.configManager.getSources(resourceUri);

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

    // 获取规则选择状态
    const items: RuleTreeItem[] = [];
    for (const source of sources) {
      const rules = this.rulesManager.getRulesBySource(source.id);
      const totalCount = rules.length;

      // 获取该源的规则选择信息（优先从内存状态读取）
      let selectedCount = 0;
      try {
        // 优先从内存状态读取
        const memoryState = this.selectionStateManager.getMemoryState(source.id);
        if (memoryState) {
          selectedCount = memoryState.length;
        } else {
          // 内存中没有，从磁盘读取
          const selection = await this.workspaceDataManager.getRuleSelection(source.id);
          if (selection) {
            // 根据选择模式计算已选择的规则数量
            if (selection.mode === 'include') {
              selectedCount = selection.paths?.length || 0;
            } else {
              // exclude 模式：总数减去排除的数量
              selectedCount = totalCount - (selection.excludePaths?.length || 0);
            }
          } else {
            // 没有选择配置时，默认全选
            selectedCount = totalCount;
          }
        }
      } catch (error) {
        Logger.warn('Failed to get rule selection', { sourceId: source.id, error });
        // 出错时默认全选
        selectedCount = totalCount;
      }

      items.push(
        new RuleTreeItem(
          {
            type: 'source',
            source,
            label: source.name || source.gitUrl,
            selectedCount,
            totalCount,
          },
          vscode.TreeItemCollapsibleState.Collapsed,
        ),
      );
    }

    return items;
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

    // 获取该源的规则选择信息（优先从内存状态读取）
    let selectedPaths: Set<string> = new Set();
    try {
      // 优先从内存状态读取
      const memoryState = this.selectionStateManager.getMemoryState(source.id);
      if (memoryState) {
        selectedPaths = new Set(memoryState);
      } else {
        // 内存中没有，从磁盘读取
        const selection = await this.workspaceDataManager.getRuleSelection(source.id);
        if (selection) {
          if (selection.mode === 'include') {
            selectedPaths = new Set(selection.paths || []);
          } else {
            // exclude 模式：所有规则默认选中，除了排除的
            const excludePaths = new Set(selection.excludePaths || []);
            selectedPaths = new Set(
              rules.map((r) => r.filePath).filter((p) => p && !excludePaths.has(p)) as string[],
            );
          }
        } else {
          // 没有选择配置时，默认全选
          selectedPaths = new Set(rules.map((r) => r.filePath).filter((p) => p) as string[]);
        }
      }
    } catch (error) {
      Logger.warn('Failed to get rule selection for source', { sourceId: source.id, error });
      // 出错时默认全选
      selectedPaths = new Set(rules.map((r) => r.filePath).filter((p) => p) as string[]);
    }

    return rules.map((rule) => {
      const isSelected = rule.filePath ? selectedPaths.has(rule.filePath) : true;

      return new RuleTreeItem(
        {
          type: 'rule',
          rule,
          label: rule.title,
          isSelected,
        },
        vscode.TreeItemCollapsibleState.None,
      );
    });
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
