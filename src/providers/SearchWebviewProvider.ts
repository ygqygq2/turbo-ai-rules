/**
 * 搜索 Webview 提供者（简化版）
 * 使用独立的 HTML/CSS/JS 文件
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { RulesManager } from '../services/RulesManager';
import type { ParsedRule } from '../types/rules';
import { EXTENSION_ICON_PATH } from '../utils/constants';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';
import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';

interface SearchCriteria {
  namePattern?: string;
  contentPattern?: string;
  tags?: string[];
  priorities?: string[]; // 支持多选优先级
  source?: string;
}

interface SearchResult {
  rule: ParsedRule;
  matchedFields: string[];
}

interface SearchHistoryItem {
  criteria: SearchCriteria;
  resultCount: number;
  timestamp: number;
  summary: string;
}

export class SearchWebviewProvider extends BaseWebviewProvider {
  private static instance: SearchWebviewProvider | undefined;
  private searchHistory: SearchHistoryItem[] = [];
  private lastSearchResults: SearchResult[] = [];
  private readonly MAX_HISTORY = 10;
  private pendingSearchCriteria: SearchCriteria | null = null; // 待执行的搜索条件
  private webviewReady: boolean = false; // Webview 是否已准备就绪

  private constructor(
    context: vscode.ExtensionContext,
    private rulesManager: RulesManager,
  ) {
    super(context);
    this.loadSearchHistory();
  }

  public static getInstance(
    context: vscode.ExtensionContext,
    rulesManager: RulesManager,
  ): SearchWebviewProvider {
    if (!SearchWebviewProvider.instance) {
      SearchWebviewProvider.instance = new SearchWebviewProvider(context, rulesManager);
    }
    return SearchWebviewProvider.instance;
  }

  public async showSearch(): Promise<void> {
    // 重置状态
    this.webviewReady = false;
    this.pendingSearchCriteria = null;

    await this.show({
      viewType: 'turboAiRules.search',
      title: 'Search Rules',
      viewColumn: vscode.ViewColumn.Active,
      iconPath: EXTENSION_ICON_PATH,
    });
  }

  /**
   * 显示搜索面板并预填搜索条件
   */
  public async showSearchWithCriteria(criteria: SearchCriteria): Promise<void> {
    Logger.debug('[SearchWebview] showSearchWithCriteria called', { criteria });

    // 先打开面板（会重置状态）
    await this.showSearch();

    // 然后设置搜索条件（支持覆盖：快速点击多个标签时只执行最后一个）
    this.pendingSearchCriteria = criteria;
    Logger.debug('[SearchWebview] Pending search criteria set', { criteria });

    // 如果 Webview 已经准备好（重复打开的情况），立即执行搜索
    if (this.webviewReady) {
      Logger.debug('[SearchWebview] Webview already ready, executing search immediately');
      await this.executePendingSearch();
    }
    // 否则等待 webviewReady 消息（在 handleMessage 中处理）
  }
  /**
   * 生成 HTML 内容 - 从文件加载
   */
  protected async getHtmlContent(webview: vscode.Webview): Promise<string> {
    const htmlPath = path.join(
      this.context.extensionPath,
      'out',
      'webview',
      'src',
      'webview',
      'search',
      'index.html',
    );

    let html = fs.readFileSync(htmlPath, 'utf-8');

    // 替换 CSP 占位符
    const cspSource = this.getCspSource(webview);
    html = html.replace(/\{\{cspSource\}\}/g, cspSource);

    // 转换资源路径为 webview URI
    const htmlDir = path.dirname(htmlPath);
    html = html.replace(/(?:src|href)="([^"]+)"/g, (match, resourcePath) => {
      try {
        // 如果是绝对路径以 / 开头，则将其视为相对于 out/webview 根目录
        let absPath: string;
        if (resourcePath.startsWith('/')) {
          absPath = path.join(
            this.context.extensionPath,
            'out',
            'webview',
            resourcePath.replace(/^\//, ''),
          );
        } else {
          // 相对路径相对于 HTML 文件所在目录
          absPath = path.resolve(htmlDir, resourcePath);
        }

        if (!fs.existsSync(absPath)) {
          return match; // 文件不存在则保留原引用
        }

        const assetUri = webview.asWebviewUri(vscode.Uri.file(absPath));
        return match.replace(resourcePath, assetUri.toString());
      } catch (_e) {
        return match;
      }
    });

    return html;
  }

  /**
   * 执行待处理的搜索
   */
  private async executePendingSearch(): Promise<void> {
    if (!this.pendingSearchCriteria) {
      Logger.debug('[SearchWebview] No pending search criteria');
      return;
    }

    const criteria = this.pendingSearchCriteria;
    this.pendingSearchCriteria = null; // 清除缓存

    Logger.info('[SearchWebview] Executing pending search', { criteria });

    // 发送预填数据到前端
    this.postMessage({
      type: 'prefillCriteria',
      payload: criteria,
    });

    // 立即执行搜索
    await this.performSearch(criteria);
  }

  /**
   * 处理来自 Webview 的消息
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'webviewReady':
          Logger.debug('[SearchWebview] Webview ready signal received');
          this.webviewReady = true;
          // 执行待处理的搜索（如果有）
          await this.executePendingSearch();
          break;
        case 'search':
          Logger.debug('[SearchWebview] Received search request', {
            criteria: message.payload,
          });
          await this.performSearch(message.payload as SearchCriteria);
          break;
        case 'viewRule':
          await this.previewMarkdown(message.payload?.ruleId);
          break;
        case 'selectRules':
          await this.selectRules(message.payload?.ruleIds || []);
          break;
        case 'exportResults':
          await this.exportResults(message.payload?.format || 'json', message.payload?.ruleIds);
          break;
        case 'loadHistory':
          this.sendSearchHistory();
          break;
        case 'applyHistory':
          await this.applyHistory(message.payload?.criteria);
          break;
        case 'clearHistory':
          this.clearHistory();
          break;
        default:
          Logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      Logger.error('Failed to handle search message', error instanceof Error ? error : undefined);
      this.postMessage({
        type: 'error',
        payload: {
          message: `Failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });
    }
  }

  private async performSearch(criteria: SearchCriteria): Promise<void> {
    const allRules = this.getAllRules();
    const results: SearchResult[] = [];

    Logger.debug('[SearchWebview] Start search', {
      criteria,
      totalRules: allRules.length,
    });

    // 检查是否有任何搜索条件
    const hasAnySearchCriteria =
      (criteria.namePattern && criteria.namePattern.trim()) ||
      (criteria.contentPattern && criteria.contentPattern.trim()) ||
      (criteria.tags && criteria.tags.length > 0) ||
      (criteria.priorities && criteria.priorities.length > 0) ||
      (criteria.source && criteria.source.trim());

    // 如果没有任何条件，返回所有规则
    if (!hasAnySearchCriteria) {
      Logger.debug('[SearchWebview] No search criteria, returning all rules');
      for (const rule of allRules) {
        results.push({ rule, matchedFields: [] });
      }
      this.lastSearchResults = results;
      this.addToHistory(criteria, results.length);
      Logger.debug('[SearchWebview] No criteria search complete', {
        resultCount: results.length,
      });
      this.postMessage({
        type: 'searchResults',
        payload: {
          results: results.map((r) => ({
            rule: {
              id: r.rule.id,
              title: r.rule.title,
              priority: r.rule.metadata?.priority || 'medium',
              tags: r.rule.metadata?.tags || [],
              sourceId: r.rule.sourceId,
              description: r.rule.metadata?.description || '',
            },
            matchedFields: r.matchedFields,
          })),
        },
      });
      Logger.debug('[SearchWebview] Message posted to webview', {
        messageType: 'searchResults',
        resultCount: results.length,
      });
      return;
    }

    for (const rule of allRules) {
      const matchedFields: string[] = [];
      let isMatch = true;

      // 标题匹配（如果提供了条件）
      if (criteria.namePattern && criteria.namePattern.trim()) {
        const nameMatch = rule.title?.toLowerCase().includes(criteria.namePattern.toLowerCase());
        if (nameMatch) {
          matchedFields.push('title');
        } else {
          isMatch = false;
        }
      }

      // 内容匹配（如果提供了条件）
      if (isMatch && criteria.contentPattern && criteria.contentPattern.trim()) {
        const hasContent = !!rule.content;
        const contentMatch = rule.content
          ?.toLowerCase()
          .includes(criteria.contentPattern.toLowerCase());
        if (contentMatch) {
          matchedFields.push('content');
        } else {
          isMatch = false;
          Logger.debug('[SearchWebview] Content match failed', {
            ruleId: rule.id,
            ruleTitle: rule.title,
            hasContent: hasContent,
            contentLength: rule.content?.length || 0,
            contentPreview: rule.content?.substring(0, 100),
            searchPattern: criteria.contentPattern,
          });
        }
      }

      // 标签匹配（如果提供了条件）
      if (isMatch && criteria.tags && criteria.tags.length > 0) {
        const ruleTags = rule.metadata?.tags || [];
        const hasMatchingTag = criteria.tags.some((tag) =>
          ruleTags.some((ruleTag) => ruleTag.toLowerCase().includes(tag.toLowerCase())),
        );
        if (hasMatchingTag) {
          matchedFields.push('tags');
        } else {
          isMatch = false;
          Logger.debug('[SearchWebview] Tag match failed', {
            ruleId: rule.id,
            ruleTitle: rule.title,
            ruleTags: ruleTags,
            searchTags: criteria.tags,
            hasMetadata: !!rule.metadata,
          });
        }
      }

      // 优先级匹配（如果提供了条件）
      if (isMatch && criteria.priorities && criteria.priorities.length > 0) {
        const rulePriority = rule.metadata?.priority || 'medium';
        if (criteria.priorities.includes(rulePriority)) {
          matchedFields.push('priority');
        } else {
          isMatch = false;
        }
      }

      // 来源匹配（如果提供了条件）- 支持 ID 和 Name
      if (isMatch && criteria.source && criteria.source.trim()) {
        const searchTerm = criteria.source.toLowerCase();
        const sourceIdMatch = rule.sourceId?.toLowerCase().includes(searchTerm);
        // 从 ConfigManager 获取 source name
        const configManager = ConfigManager.getInstance();
        const source = configManager.getSourceById(rule.sourceId);
        const sourceNameMatch = source?.name?.toLowerCase().includes(searchTerm);

        if (sourceIdMatch || sourceNameMatch) {
          matchedFields.push('source');
        } else {
          isMatch = false;
          Logger.debug('[SearchWebview] Source match failed', {
            ruleId: rule.id,
            ruleTitle: rule.title,
            sourceId: rule.sourceId,
            sourceName: source?.name,
            searchTerm: searchTerm,
          });
        }
      }

      // 只有匹配成功才添加到结果
      if (isMatch) {
        results.push({ rule, matchedFields });
      }
    }

    this.lastSearchResults = results;
    this.addToHistory(criteria, results.length);

    Logger.debug('[SearchWebview] Search complete', {
      resultCount: results.length,
      matchedFields: results.slice(0, 3).map((r) => ({
        title: r.rule.title,
        matchedFields: r.matchedFields,
      })),
    });

    this.postMessage({
      type: 'searchResults',
      payload: {
        results: results.map((r) => ({
          rule: {
            id: r.rule.id,
            title: r.rule.title,
            priority: r.rule.metadata?.priority || 'medium',
            tags: r.rule.metadata?.tags || [],
            sourceId: r.rule.sourceId,
            description: r.rule.metadata?.description || '',
          },
          matchedFields: r.matchedFields,
        })),
      },
    });
    Logger.debug('[SearchWebview] Message posted to webview', {
      messageType: 'searchResults',
      resultCount: results.length,
    });
  }

  private async exportResults(format: 'json' | 'csv', ruleIds?: string[]): Promise<void> {
    let resultsToExport: SearchResult[];

    if (ruleIds && ruleIds.length > 0) {
      resultsToExport = this.lastSearchResults.filter((r) => ruleIds.includes(r.rule.id));
    } else {
      resultsToExport = this.lastSearchResults;
    }

    if (resultsToExport.length === 0) {
      notify('No search results to export', 'warning');
      return;
    }

    const defaultFileName = `search-results-${new Date().toISOString().split('T')[0]}.${format}`;
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(defaultFileName),
      filters: format === 'json' ? { JSON: ['json'] } : { CSV: ['csv'] },
    });

    if (!uri) {
      return;
    }

    try {
      let content: string;
      if (format === 'json') {
        content = JSON.stringify(
          resultsToExport.map((r) => ({
            title: r.rule.title,
            filePath: r.rule.filePath,
            priority: r.rule.metadata?.priority,
            tags: r.rule.metadata?.tags,
            sourceId: r.rule.sourceId,
            description: r.rule.metadata?.description,
            matchedFields: r.matchedFields,
          })),
          null,
          2,
        );
      } else {
        const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}`;
        const headers = 'Title,File Path,Priority,Tags,Source,Description,Matched Fields\n';
        const rows = resultsToExport
          .map((r) =>
            [
              escapeCSV(r.rule.title),
              escapeCSV(r.rule.filePath),
              r.rule.metadata?.priority || 'medium',
              escapeCSV((r.rule.metadata?.tags || []).join(', ')),
              escapeCSV(r.rule.sourceId),
              escapeCSV(r.rule.metadata?.description || ''),
              escapeCSV(r.matchedFields.join(', ')),
            ].join(','),
          )
          .join('\n');
        content = headers + rows;
      }

      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf-8'));
      notify(`Exported ${resultsToExport.length} results to ${uri.fsPath}`, 'info');
      this.postMessage({
        type: 'success',
        payload: { message: `Exported ${resultsToExport.length} results successfully` },
      });
    } catch (error) {
      notify(`Export failed: ${error instanceof Error ? error.message : String(error)}`, 'error');
    }
  }

  /**
   * @description 显示规则详情面板
   * @param ruleId {string} 规则ID
   */
  private async previewMarkdown(ruleId: string): Promise<void> {
    const result = this.lastSearchResults.find((r) => r.rule.id === ruleId);
    if (!result) {
      notify('Rule not found', 'warning');
      return;
    }

    try {
      // 调用 RuleDetailsWebviewProvider 显示详情面板
      const detailsProvider = (
        await import('./RuleDetailsWebviewProvider')
      ).RuleDetailsWebviewProvider.getInstance(this.context);
      await detailsProvider.showRuleDetails(result.rule);

      Logger.debug('[SearchWebview] Opened rule details panel', {
        ruleId,
        title: result.rule.title,
      });
    } catch (error) {
      Logger.error(
        '[SearchWebview] Failed to show rule details',
        error instanceof Error ? error : undefined,
      );
      notify('Failed to open rule details', 'error');
    }
  }

  /**
   * @description 选中规则（在左侧TreeView中勾选）
   * @param ruleIds {string[]} 规则ID列表
   */
  private async selectRules(ruleIds: string[]): Promise<void> {
    const rules = this.lastSearchResults.filter((r) => ruleIds.includes(r.rule.id));
    if (rules.length === 0) {
      notify('No rules to select', 'warning');
      return;
    }

    try {
      // 1. 显示扩展的侧边栏视图
      await vscode.commands.executeCommand('workbench.view.extension.turbo-ai-rules');

      // 2. 按源分组规则
      const rulesBySource = new Map<string, Set<string>>();
      for (const { rule } of rules) {
        if (!rulesBySource.has(rule.sourceId)) {
          rulesBySource.set(rule.sourceId, new Set());
        }
        rulesBySource.get(rule.sourceId)!.add(rule.filePath);
      }

      // 3. 通过 SelectionStateManager 勾选规则
      const selectionManager = (
        await import('../services/SelectionStateManager')
      ).SelectionStateManager.getInstance();

      for (const [sourceId, filePaths] of rulesBySource.entries()) {
        // 获取当前已选择的规则
        const currentSelection = selectionManager.getSelection(sourceId);
        const mergedSelection = new Set([...currentSelection, ...filePaths]);

        // 更新选择状态（自动触发 TreeView 刷新）
        selectionManager.updateSelection(sourceId, Array.from(mergedSelection), true);

        Logger.debug('[SearchWebview] Rules checked in TreeView', {
          sourceId,
          newlyChecked: filePaths.size,
          totalChecked: mergedSelection.size,
        });
      }

      notify(`已勾选 ${rules.length} 条规则`, 'info');
      this.postMessage({
        type: 'success',
        payload: { message: `已在侧边栏勾选 ${rules.length} 条规则` },
      });
    } catch (error) {
      Logger.error(
        '[SearchWebview] Failed to select rules',
        error instanceof Error ? error : undefined,
      );
      notify('勾选规则失败', 'error');
    }
  }

  private async applyHistory(criteria: SearchCriteria): Promise<void> {
    if (!criteria) {
      notify('Invalid history criteria', 'warning');
      return;
    }
    await this.performSearch(criteria);
  }

  private getAllRules(): ParsedRule[] {
    return this.rulesManager.getAllRules();
  }

  private addToHistory(criteria: SearchCriteria, resultCount: number): void {
    const cleanCriteria: SearchCriteria = {};
    if (criteria.namePattern?.trim()) cleanCriteria.namePattern = criteria.namePattern.trim();
    if (criteria.contentPattern?.trim())
      cleanCriteria.contentPattern = criteria.contentPattern.trim();
    if (criteria.tags && criteria.tags.length > 0) cleanCriteria.tags = criteria.tags;
    if (criteria.priorities && criteria.priorities.length > 0)
      cleanCriteria.priorities = criteria.priorities;
    if (criteria.source?.trim()) cleanCriteria.source = criteria.source.trim();

    // 生成搜索摘要
    const summary = this.generateSearchSummary(cleanCriteria);

    const historyItem: SearchHistoryItem = {
      criteria: cleanCriteria,
      resultCount,
      timestamp: Date.now(),
      summary,
    };

    // 删除相同的历史记录
    const existingIndex = this.searchHistory.findIndex(
      (h) => JSON.stringify(h.criteria) === JSON.stringify(cleanCriteria),
    );

    if (existingIndex >= 0) {
      this.searchHistory.splice(existingIndex, 1);
    }

    this.searchHistory.unshift(historyItem);

    if (this.searchHistory.length > this.MAX_HISTORY) {
      this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY);
    }

    this.saveSearchHistory();
    // 立即发送更新后的历史记录给前端
    this.sendSearchHistory();
  }

  private generateSearchSummary(criteria: SearchCriteria): string {
    const parts: string[] = [];
    if (criteria.namePattern) parts.push(`标题:"${criteria.namePattern}"`);
    if (criteria.contentPattern) parts.push(`内容:"${criteria.contentPattern}"`);
    if (criteria.tags?.length) parts.push(`标签:[${criteria.tags.join(', ')}]`);
    if (criteria.priorities?.length) parts.push(`优先级:[${criteria.priorities.join('+')}]`);
    if (criteria.source) parts.push(`源:"${criteria.source}"`);
    return parts.length > 0 ? parts.join(' + ') : '全部规则';
  }

  private sendSearchHistory(): void {
    this.postMessage({
      type: 'searchHistory',
      payload: {
        history: this.searchHistory,
      },
    });
  }

  private clearHistory(): void {
    this.searchHistory = [];
    this.saveSearchHistory();
    this.sendSearchHistory();
    notify('Search history cleared', 'info');
  }

  private loadSearchHistory(): void {
    const history = this.context.globalState.get<SearchHistoryItem[]>('searchHistory', []);
    this.searchHistory = history;
  }

  private saveSearchHistory(): void {
    this.context.globalState.update('searchHistory', this.searchHistory);
  }
}
