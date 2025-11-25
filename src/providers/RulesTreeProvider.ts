/**
 * 规则树视图提供者
 * 在侧边栏显示规则源和规则列表
 */

import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { RulesManager } from '../services/RulesManager';
import { SelectionStateManager } from '../services/SelectionStateManager';
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

    // 设置唯一 ID（用于 VSCode 识别节点并保持复选框状态）
    this.id = this.getId();

    // 为规则节点添加复选框
    if (data.type === 'rule') {
      this.checkboxState = data.isSelected
        ? vscode.TreeItemCheckboxState.Checked
        : vscode.TreeItemCheckboxState.Unchecked;
    }
  }

  /**
   * @description 生成唯一 ID
   * @return {string}
   */
  private getId(): string {
    switch (this.data.type) {
      case 'source':
        return `source:${this.data.source?.id || 'unknown'}`;
      case 'rule':
        return `rule:${this.data.rule?.sourceId || 'unknown'}:${
          this.data.rule?.filePath || this.data.rule?.id || 'unknown'
        }`;
      case 'tag':
        return `tag:${this.data.tag || 'unknown'}`;
      case 'empty':
        return `empty:${Date.now()}`;
      default:
        return `unknown:${Date.now()}`;
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
          `⚡ Priority: ${rule.metadata.priority || 'medium'}`,
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
              return new vscode.ThemeIcon('pass-filled', new vscode.ThemeColor('charts.blue'));
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
            return new vscode.ThemeIcon('star-full', new vscode.ThemeColor('charts.yellow'));
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

        const tags = this.data.rule.metadata.tags;

        // 优先级已通过图标颜色展示,无需重复显示文本
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
        arguments: [this], // 传递整个 TreeItem
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
  private refreshTimeout?: NodeJS.Timeout;
  private stateChangeDisposable?: () => void;

  constructor(
    private configManager: ConfigManager,
    private rulesManager: RulesManager,
    private selectionStateManager: SelectionStateManager,
  ) {
    this.workspaceDataManager = WorkspaceDataManager.getInstance();

    // 订阅状态变更事件，自动刷新树视图
    this.stateChangeDisposable = this.selectionStateManager.onStateChanged(() => {
      Logger.debug('Selection state changed, refreshing tree view');
      this.refresh();
    });

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
          // 从 SelectionStateManager 获取当前状态
          const currentPaths = this.selectionStateManager.getSelection(sourceId);
          changesBySource.set(sourceId, new Set(currentPaths));
        }

        const paths = changesBySource.get(sourceId)!;
        if (checkState === vscode.TreeItemCheckboxState.Checked) {
          paths.add(filePath);
        } else {
          paths.delete(filePath);
        }
      }

      // 通过 SelectionStateManager 更新状态，自动触发事件并安排延时落盘
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const workspacePath = workspaceFolders?.[0]?.uri.fsPath;

      for (const [sourceId, paths] of changesBySource.entries()) {
        // 更新状态，会自动触发 stateChanged 事件并刷新树视图
        this.selectionStateManager.updateSelection(
          sourceId,
          Array.from(paths),
          true,
          workspacePath,
        );

        Logger.debug('Checkbox change - state updated via SelectionStateManager', {
          sourceId,
          selectedCount: paths.size,
        });
      }
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
        default:
          return [];
      }
    } catch (error) {
      Logger.error('Failed to get tree children', error instanceof Error ? error : undefined);
      return [];
    }
  }

  /**
   * 从 Git 缓存目录加载规则
   */
  private async loadRulesFromCache(sourceId: string): Promise<ParsedRule[]> {
    // 优先从 RulesManager 内存缓存获取
    const cachedRules = this.rulesManager.getRulesBySource(sourceId);
    if (cachedRules.length > 0) {
      Logger.debug('Rules loaded from memory cache', { sourceId, count: cachedRules.length });
      return cachedRules;
    }

    // 内存中没有，从 Git 缓存目录解析
    const GitManager = (await import('../services/GitManager')).GitManager;
    const MdcParser = (await import('../parsers/MdcParser')).MdcParser;
    const gitManager = GitManager.getInstance();
    const parser = new MdcParser();

    const sourcePath = gitManager.getSourcePath(sourceId);
    const exists = await gitManager.repositoryExists(sourceId);

    if (!exists) {
      Logger.debug('Repository not synced yet', { sourceId, sourcePath });
      return [];
    }

    try {
      // 解析规则目录
      const parsedRules = await parser.parseDirectory(sourcePath, sourceId, {
        recursive: true,
        maxDepth: 6,
        maxFiles: 500,
      });

      Logger.debug('Rules loaded from Git cache', { sourceId, count: parsedRules.length });

      // 将解析的规则添加到 RulesManager 缓存中
      this.rulesManager.addRules(sourceId, parsedRules);

      return parsedRules;
    } catch (error) {
      Logger.warn('Failed to load rules from cache', { sourceId, error });
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
      // 从缓存加载规则（如果内存中没有则从 Git 缓存目录解析）
      const rules = await this.loadRulesFromCache(source.id);
      const totalCount = rules.length;

      // 获取该源的规则选择信息（从 SelectionStateManager 读取）
      let selectedCount = 0;
      try {
        // 先初始化状态（从磁盘加载），如果已初始化则直接返回内存中的数据
        // 传入 undefined 因为这里还没有加载规则，无法获取路径
        await this.selectionStateManager.initializeState(source.id, totalCount, undefined);
        // 使用 getSelectionCount() 方法，它会正确处理空数组（全选）的情况
        selectedCount = this.selectionStateManager.getSelectionCount(source.id);
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
    // 从 Git 缓存目录加载规则（会自动添加到 RulesManager）
    const rules = await this.loadRulesFromCache(source.id);

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

    // 获取该源的规则选择信息（从 SelectionStateManager 读取）
    let selectedPaths: Set<string> = new Set();
    try {
      // 获取所有规则路径（用于初始化默认全选）
      const allRulePaths = rules.map((r) => r.filePath).filter((p) => p) as string[];

      // 先初始化状态（从磁盘加载），如果已初始化则直接返回内存中的数据
      // 如果是新源（无保存状态），会使用 allRulePaths 初始化为全选
      await this.selectionStateManager.initializeState(source.id, rules.length, allRulePaths);
      const paths = this.selectionStateManager.getSelection(source.id);
      selectedPaths = new Set(paths);
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
