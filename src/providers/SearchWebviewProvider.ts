/**
 * 搜索 Webview 提供者（简化版）
 * 使用独立的 HTML/CSS/JS 文件
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import type { ParsedRule, RulePriority } from '../types/rules';
import { Logger } from '../utils/logger';
import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';
import { RulesManager } from '../services/RulesManager';

interface SearchCriteria {
  namePattern?: string;
  contentPattern?: string;
  tags?: string[];
  priority?: RulePriority;
  source?: string;
}

interface SearchResult {
  rule: ParsedRule;
  matchedFields: string[];
}

export class SearchWebviewProvider extends BaseWebviewProvider {
  private static instance: SearchWebviewProvider | undefined;
  private searchHistory: SearchCriteria[] = [];
  private lastSearchResults: SearchResult[] = [];
  private readonly MAX_HISTORY = 10;

  private constructor(context: vscode.ExtensionContext, private rulesManager: RulesManager) {
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
    await this.show({
      viewType: 'turboAiRules.search',
      title: 'Advanced Rule Search',
      viewColumn: vscode.ViewColumn.One,
    });
  }

  /**
   * 生成 HTML 内容 - 从文件加载
   */
  protected getHtmlContent(webview: vscode.Webview): string {
    const htmlPath = path.join(
      this.context.extensionPath,
      'out',
      'webview',
      'search',
      'index.html',
    );

    let html = fs.readFileSync(htmlPath, 'utf-8');

    // 替换资源 URI
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.file(path.join(this.context.extensionPath, 'out', 'webview', 'global.css')),
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, 'out', 'webview', 'search', 'search.js'),
      ),
    );
    const searchCssUri = webview.asWebviewUri(
      vscode.Uri.file(
        path.join(this.context.extensionPath, 'out', 'webview', 'search', 'search.css'),
      ),
    );

    html = html.replace(/{{cspSource}}/g, webview.cspSource);
    html = html.replace(/{{stylesUri}}/g, stylesUri.toString());
    html = html.replace(/\.\/search\.css/g, searchCssUri.toString());
    html = html.replace(/\.\/search\.ts/g, scriptUri.toString());

    return html;
  }

  /**
   * 处理来自 Webview 的消息
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'search':
          await this.performSearch(message.payload as SearchCriteria);
          break;
        case 'exportResults':
          await this.exportResults(message.payload?.format || 'json');
          break;
        case 'viewRule':
          await this.viewRule(message.payload?.ruleId);
          break;
        case 'loadHistory':
          this.sendSearchHistory();
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

    for (const rule of allRules) {
      const matchedFields: string[] = [];
      let isMatch = true;

      if (criteria.namePattern && criteria.namePattern.trim()) {
        const nameMatch = rule.title?.toLowerCase().includes(criteria.namePattern.toLowerCase());
        if (nameMatch) {
          matchedFields.push('name');
        } else {
          isMatch = false;
        }
      }

      if (isMatch && criteria.contentPattern && criteria.contentPattern.trim()) {
        const contentMatch = rule.content
          ?.toLowerCase()
          .includes(criteria.contentPattern.toLowerCase());
        if (contentMatch) {
          matchedFields.push('content');
        } else {
          isMatch = false;
        }
      }

      if (isMatch && criteria.tags && criteria.tags.length > 0) {
        const ruleTags = rule.metadata?.tags || [];
        const hasMatchingTag = criteria.tags.some((tag) =>
          ruleTags.some((ruleTag) => ruleTag.toLowerCase().includes(tag.toLowerCase())),
        );
        if (hasMatchingTag) {
          matchedFields.push('tags');
        } else {
          isMatch = false;
        }
      }

      if (isMatch && criteria.priority) {
        if (rule.metadata?.priority === criteria.priority) {
          matchedFields.push('priority');
        } else {
          isMatch = false;
        }
      }

      if (isMatch && criteria.source && criteria.source.trim()) {
        const sourceMatch = rule.sourceId?.toLowerCase().includes(criteria.source.toLowerCase());
        if (sourceMatch) {
          matchedFields.push('source');
        } else {
          isMatch = false;
        }
      }

      if (isMatch && matchedFields.length > 0) {
        results.push({ rule, matchedFields });
      }
    }

    this.lastSearchResults = results;
    this.addToHistory(criteria);

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
  }

  private async exportResults(format: 'json' | 'csv'): Promise<void> {
    if (this.lastSearchResults.length === 0) {
      vscode.window.showWarningMessage('No search results to export');
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
          this.lastSearchResults.map((r) => ({
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
        const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;
        const headers = 'Title,File Path,Priority,Tags,Source,Description,Matched Fields\n';
        const rows = this.lastSearchResults
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
      vscode.window.showInformationMessage(
        `Exported ${this.lastSearchResults.length} results to ${uri.fsPath}`,
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Export failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  private async viewRule(ruleId: string): Promise<void> {
    const result = this.lastSearchResults.find((r) => r.rule.id === ruleId);
    if (result) {
      await vscode.commands.executeCommand('turbo-ai-rules.showRuleDetails', result.rule);
    }
  }

  private getAllRules(): ParsedRule[] {
    return this.rulesManager.getAllRules();
  }

  private addToHistory(criteria: SearchCriteria): void {
    const cleanCriteria: SearchCriteria = {};
    if (criteria.namePattern?.trim()) cleanCriteria.namePattern = criteria.namePattern.trim();
    if (criteria.contentPattern?.trim())
      cleanCriteria.contentPattern = criteria.contentPattern.trim();
    if (criteria.tags && criteria.tags.length > 0) cleanCriteria.tags = criteria.tags;
    if (criteria.priority) cleanCriteria.priority = criteria.priority;
    if (criteria.source?.trim()) cleanCriteria.source = criteria.source.trim();

    const existingIndex = this.searchHistory.findIndex(
      (h) => JSON.stringify(h) === JSON.stringify(cleanCriteria),
    );

    if (existingIndex >= 0) {
      this.searchHistory.splice(existingIndex, 1);
    }

    this.searchHistory.unshift(cleanCriteria);

    if (this.searchHistory.length > this.MAX_HISTORY) {
      this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY);
    }

    this.saveSearchHistory();
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
    vscode.window.showInformationMessage('Search history cleared');
  }

  private loadSearchHistory(): void {
    const history = this.context.globalState.get<SearchCriteria[]>('searchHistory', []);
    this.searchHistory = history;
  }

  private saveSearchHistory(): void {
    this.context.globalState.update('searchHistory', this.searchHistory);
  }
}
