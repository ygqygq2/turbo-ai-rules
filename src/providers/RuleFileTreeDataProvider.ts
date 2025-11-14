import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

import { WorkspaceDataManager } from '../services/WorkspaceDataManager';
import { GitManager } from '../services/GitManager';
import { SelectionStateManager } from '../services/SelectionStateManager';
import { RulesManager } from '../services/RulesManager';
import { Logger } from '../utils/logger';
import type { RuleSelection } from '../services/WorkspaceDataManager';

/**
 * 规则文件树节点
 */
export class RuleFileTreeItem extends vscode.TreeItem {
  constructor(
    public readonly resourceUri: vscode.Uri,
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly isFile: boolean,
    public readonly ruleCount?: number,
  ) {
    super(label, collapsibleState);

    // 使用 VSCode 的文件图标
    this.iconPath = isFile ? vscode.ThemeIcon.File : vscode.ThemeIcon.Folder;

    // 显示规则数量
    if (ruleCount && ruleCount > 0) {
      this.description = `(${ruleCount})`;
    }

    // 支持复选框
    this.checkboxState = vscode.TreeItemCheckboxState.Unchecked;

    // 点击文件时打开预览
    if (isFile) {
      this.command = {
        command: 'vscode.open',
        title: '预览规则',
        arguments: [resourceUri, { preview: true }],
      };
    }

    // 设置上下文值（用于右键菜单）
    this.contextValue = isFile ? 'ruleFile' : 'ruleDirectory';
  }
}

/**
 * 规则文件树数据提供者
 * 直接读取 Git 仓库的文件系统，支持复选框选择
 */
export class RuleFileTreeDataProvider implements vscode.TreeDataProvider<RuleFileTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<RuleFileTreeItem | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private sourceId: string;
  private sourcePath: string;
  private workspacePath: string;
  private selectedPaths: Set<string>;
  private dataManager: WorkspaceDataManager;

  constructor(sourceId: string, sourcePath: string, workspacePath: string) {
    this.sourceId = sourceId;
    this.sourcePath = sourcePath;
    this.workspacePath = workspacePath;
    this.selectedPaths = new Set();
    this.dataManager = WorkspaceDataManager.getInstance();
  }

  /**
   * @description 获取子节点
   * @return {Promise<RuleFileTreeItem[]>}
   * @param element {RuleFileTreeItem | undefined}
   */
  async getChildren(element?: RuleFileTreeItem): Promise<RuleFileTreeItem[]> {
    const dirPath = element ? element.resourceUri.fsPath : this.sourcePath;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      const items: RuleFileTreeItem[] = [];

      for (const entry of entries) {
        // 跳过隐藏文件、node_modules、.git 等
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === '__pycache__'
        ) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);
        const uri = vscode.Uri.file(fullPath);
        const isFile = entry.isFile();

        // 只显示目录和 .md/.mdc 文件
        if (isFile && !entry.name.endsWith('.md') && !entry.name.endsWith('.mdc')) {
          continue;
        }

        let ruleCount: number | undefined;
        if (isFile) {
          // 读取文件统计规则数量（简单统计 frontmatter 分隔符）
          ruleCount = await this.countRulesInFile(fullPath);
        }

        const item = new RuleFileTreeItem(
          uri,
          entry.name,
          isFile ? vscode.TreeItemCollapsibleState.None : vscode.TreeItemCollapsibleState.Collapsed,
          isFile,
          ruleCount,
        );

        // 恢复选择状态
        const relativePath = path.relative(this.sourcePath, fullPath);
        if (this.selectedPaths.has(relativePath)) {
          item.checkboxState = vscode.TreeItemCheckboxState.Checked;
        }

        items.push(item);
      }

      // 排序：目录优先，然后按名称
      items.sort((a, b) => {
        if (a.isFile !== b.isFile) {
          return a.isFile ? 1 : -1;
        }
        return a.label.localeCompare(b.label);
      });

      return items;
    } catch (error) {
      Logger.error('Failed to read directory for tree view', error as Error);
      return [];
    }
  }

  /**
   * @description 获取树节点
   * @return {vscode.TreeItem}
   * @param element {RuleFileTreeItem}
   */
  getTreeItem(element: RuleFileTreeItem): vscode.TreeItem {
    return element;
  }

  /**
   * @description 处理复选框状态变化
   * @return {Promise<void>}
   * @param items {readonly [RuleFileTreeItem, vscode.TreeItemCheckboxState][]}
   */
  async handleCheckboxChange(
    items: readonly [RuleFileTreeItem, vscode.TreeItemCheckboxState][],
  ): Promise<void> {
    for (const [item, checkState] of items) {
      if (!(item instanceof RuleFileTreeItem)) continue;

      const relativePath = path.relative(this.sourcePath, item.resourceUri.fsPath);

      if (checkState === vscode.TreeItemCheckboxState.Checked) {
        // 选中
        if (!item.isFile) {
          // 如果是目录，递归选择所有子文件
          await this.selectDirectory(item.resourceUri.fsPath);
        } else {
          this.selectedPaths.add(relativePath);
        }
      } else {
        // 取消选中
        if (!item.isFile) {
          // 如果是目录，递归取消所有子文件
          await this.deselectDirectory(item.resourceUri.fsPath);
        } else {
          this.selectedPaths.delete(relativePath);
        }
      }
    }

    // 保存选择到磁盘
    await this.saveSelection();

    // 刷新树视图（更新复选框状态）
    this.refresh();
  }

  /**
   * @description 递归选择目录下的所有文件
   * @return {Promise<void>}
   * @param dirPath {string}
   */
  private async selectDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(this.sourcePath, fullPath);

        if (entry.isDirectory()) {
          await this.selectDirectory(fullPath);
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdc')) {
          this.selectedPaths.add(relativePath);
        }
      }
    } catch (error) {
      Logger.error('Failed to select directory', error as Error);
    }
  }

  /**
   * @description 递归取消选择目录下的所有文件
   * @return {Promise<void>}
   * @param dirPath {string}
   */
  private async deselectDirectory(dirPath: string): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(this.sourcePath, fullPath);

        if (entry.isDirectory()) {
          await this.deselectDirectory(fullPath);
        } else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdc')) {
          this.selectedPaths.delete(relativePath);
        }
      }
    } catch (error) {
      Logger.error('Failed to deselect directory', error as Error);
    }
  }

  /**
   * @description 保存选择到磁盘
   * @return {Promise<void>}
   */
  private async saveSelection(): Promise<void> {
    try {
      const selection: RuleSelection = {
        mode: 'include',
        paths: Array.from(this.selectedPaths),
      };

      await this.dataManager.setRuleSelection(this.workspacePath, this.sourceId, selection);
      Logger.info('Rule selection saved', {
        sourceId: this.sourceId,
        count: this.selectedPaths.size,
      });

      // 触发选择变更事件（用于左右同步）
      const rulesManager = RulesManager.getInstance();
      const totalCount = rulesManager.getRulesBySource(this.sourceId).length;
      SelectionStateManager.getInstance().notifySelectionChanged(
        this.sourceId,
        this.selectedPaths.size,
        totalCount,
      );

      // 刷新侧边栏规则树
      vscode.commands.executeCommand('turbo-ai-rules.refresh');
    } catch (error) {
      Logger.error('Failed to save rule selection', error as Error);
      vscode.window.showErrorMessage(`保存规则选择失败: ${error}`);
    }
  }

  /**
   * @description 加载已保存的选择
   * @return {Promise<void>}
   */
  async loadSelection(): Promise<void> {
    try {
      const selection = await this.dataManager.getRuleSelection(this.sourceId);
      this.selectedPaths = new Set(selection?.paths || []);
      Logger.info('Rule selection loaded', {
        sourceId: this.sourceId,
        count: this.selectedPaths.size,
      });
      this.refresh();
    } catch (error) {
      Logger.error('Failed to load rule selection', error as Error);
    }
  }

  /**
   * @description 刷新树视图
   * @return {void}
   */
  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  /**
   * @description 统计文件中的规则数量
   * @return {Promise<number>}
   * @param filePath {string}
   */
  private async countRulesInFile(filePath: string): Promise<number> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      // 简单统计：计算 frontmatter 分隔符（---）的数量除以 2
      const matches = content.match(/^---$/gm);
      return matches ? Math.floor(matches.length / 2) : 1;
    } catch (error) {
      return 0;
    }
  }

  /**
   * @description 全选所有规则
   * @return {Promise<void>}
   */
  async selectAll(): Promise<void> {
    await this.selectDirectory(this.sourcePath);
    await this.saveSelection();
    this.refresh();
  }

  /**
   * @description 清除所有选择
   * @return {Promise<void>}
   */
  async clearAll(): Promise<void> {
    this.selectedPaths.clear();
    await this.saveSelection();
    this.refresh();
  }

  /**
   * @description 获取选择统计
   * @return {{ total: number; selected: number }}
   */
  getStats(): { total: number; selected: number } {
    return {
      total: 0, // TODO: 需要遍历整个树来计算
      selected: this.selectedPaths.size,
    };
  }
}
