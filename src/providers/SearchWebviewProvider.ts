/**
 * 高级搜索 Webview 提供者
 * 支持按标签、优先级、源等多条件搜索规则
 */

import * as vscode from 'vscode';

import type { ParsedRule, RulePriority } from '../types/rules';
import { Logger } from '../utils/logger';
import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';
import { RulesManager } from '../services/RulesManager';

/**
 * 搜索条件接口
 */
interface SearchCriteria {
  namePattern?: string;
  contentPattern?: string;
  tags?: string[];
  priority?: RulePriority;
  source?: string;
}

/**
 * 搜索结果接口
 */
interface SearchResult {
  rule: ParsedRule;
  matchedFields: string[];
}

/**
 * 高级搜索 Webview 提供者
 */
export class SearchWebviewProvider extends BaseWebviewProvider {
  private static instance: SearchWebviewProvider | undefined;
  private searchHistory: SearchCriteria[] = [];
  private lastSearchResults: SearchResult[] = [];
  private readonly MAX_HISTORY = 10;

  private constructor(context: vscode.ExtensionContext, private rulesManager: RulesManager) {
    super(context);
    this.loadSearchHistory();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(
    context: vscode.ExtensionContext,
    rulesManager: RulesManager,
  ): SearchWebviewProvider {
    if (!SearchWebviewProvider.instance) {
      SearchWebviewProvider.instance = new SearchWebviewProvider(context, rulesManager);
    }
    return SearchWebviewProvider.instance;
  }

  /**
   * 显示高级搜索面板
   */
  public async showSearch(): Promise<void> {
    await this.show({
      viewType: 'turboAiRules.search',
      title: 'Advanced Rule Search',
      viewColumn: vscode.ViewColumn.One,
    });
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
      vscode.window.showErrorMessage(
        `Failed to handle action: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 执行搜索
   */
  private async performSearch(criteria: SearchCriteria): Promise<void> {
    try {
      // 获取所有规则
      const allRules = await this.getAllRules();

      // 过滤规则
      const results: SearchResult[] = [];

      for (const rule of allRules) {
        const matchedFields: string[] = [];
        let isMatch = true;

        // 名称匹配
        if (criteria.namePattern && criteria.namePattern.trim()) {
          const nameMatch = rule.metadata?.title
            ?.toLowerCase()
            .includes(criteria.namePattern.toLowerCase());
          if (nameMatch) {
            matchedFields.push('name');
          } else {
            isMatch = false;
          }
        }

        // 内容匹配
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

        // 标签匹配
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

        // 优先级匹配
        if (isMatch && criteria.priority !== undefined && criteria.priority) {
          if (rule.metadata?.priority === criteria.priority) {
            matchedFields.push('priority');
          } else {
            isMatch = false;
          }
        }

        // 来源匹配
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

      // 添加到搜索历史
      this.addToHistory(criteria);

      // 发送结果到 Webview
      this.postMessage({
        type: 'searchResults',
        payload: {
          results: results.map((r) => ({
            rule: {
              id: r.rule.id,
              filePath: r.rule.filePath,
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
    } catch (error) {
      this.postMessage({
        type: 'error',
        payload: {
          message: `Search failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      });
    }
  }

  /**
   * 导出搜索结果
   */
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
        // CSV format
        const headers = 'Title,File Path,Priority,Tags,Source,Description,Matched Fields\n';
        const rows = this.lastSearchResults
          .map((r) => {
            const escapeCSV = (str: string) => `"${str.replace(/"/g, '""')}"`;
            return [
              escapeCSV(r.rule.title || ''),
              escapeCSV(r.rule.filePath || ''),
              r.rule.metadata?.priority || 'medium',
              escapeCSV((r.rule.metadata?.tags || []).join(', ')),
              escapeCSV(r.rule.sourceId || ''),
              escapeCSV(r.rule.metadata?.description || ''),
              escapeCSV(r.matchedFields.join(', ')),
            ].join(',');
          })
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

  /**
   * 查看规则详情
   */
  private async viewRule(ruleId: string): Promise<void> {
    const result = this.lastSearchResults.find((r) => r.rule.id === ruleId);
    if (result) {
      await vscode.commands.executeCommand('turbo-ai-rules.showRuleDetails', result.rule);
    }
  }

  /**
   * 获取所有规则
   */
  private getAllRules(): ParsedRule[] {
    return this.rulesManager.getAllRules();
  }

  /**
   * 添加到搜索历史
   */
  private addToHistory(criteria: SearchCriteria): void {
    // 移除空条件
    const cleanCriteria: SearchCriteria = {};
    if (criteria.namePattern?.trim()) cleanCriteria.namePattern = criteria.namePattern.trim();
    if (criteria.contentPattern?.trim())
      cleanCriteria.contentPattern = criteria.contentPattern.trim();
    if (criteria.tags && criteria.tags.length > 0) cleanCriteria.tags = criteria.tags;
    if (criteria.priority) cleanCriteria.priority = criteria.priority;
    if (criteria.source?.trim()) cleanCriteria.source = criteria.source.trim();

    // 检查是否已存在相同的搜索条件
    const existingIndex = this.searchHistory.findIndex(
      (h) => JSON.stringify(h) === JSON.stringify(cleanCriteria),
    );

    if (existingIndex >= 0) {
      // 移动到最前面
      this.searchHistory.splice(existingIndex, 1);
    }

    this.searchHistory.unshift(cleanCriteria);

    // 限制历史记录数量
    if (this.searchHistory.length > this.MAX_HISTORY) {
      this.searchHistory = this.searchHistory.slice(0, this.MAX_HISTORY);
    }

    this.saveSearchHistory();
  }

  /**
   * 发送搜索历史
   */
  private sendSearchHistory(): void {
    this.postMessage({
      type: 'searchHistory',
      payload: {
        history: this.searchHistory,
      },
    });
  }

  /**
   * 清除搜索历史
   */
  private clearHistory(): void {
    this.searchHistory = [];
    this.saveSearchHistory();
    this.sendSearchHistory();
    vscode.window.showInformationMessage('Search history cleared');
  }

  /**
   * 加载搜索历史
   */
  private loadSearchHistory(): void {
    const history = this.context.globalState.get<SearchCriteria[]>('searchHistory', []);
    this.searchHistory = history;
  }

  /**
   * 保存搜索历史
   */
  private saveSearchHistory(): void {
    this.context.globalState.update('searchHistory', this.searchHistory);
  }

  protected getHtmlContent(webview: vscode.Webview): string {
    const nonce = this.getNonce();

    return `${this.getHtmlHead(webview, 'Advanced Rule Search')}
        <style>
          .search-container {
            padding: 20px;
            max-width: 900px;
            margin: 0 auto;
          }

          .section {
            margin-bottom: 24px;
            padding: 16px;
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
          }

          .section-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            color: var(--vscode-foreground);
          }

          .form-group {
            margin-bottom: 12px;
          }

          .form-label {
            display: block;
            font-size: 13px;
            margin-bottom: 4px;
            color: var(--vscode-descriptionForeground);
          }

          .form-input {
            width: 100%;
            padding: 6px 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 2px;
            font-size: 13px;
          }

          .form-input:focus {
            outline: 1px solid var(--vscode-focusBorder);
          }

          .form-row {
            display: flex;
            gap: 12px;
          }

          .form-row .form-group {
            flex: 1;
          }

          .button-group {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
          }

          .btn {
            padding: 6px 14px;
            font-size: 13px;
            border: none;
            border-radius: 2px;
            cursor: pointer;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
          }

          .btn:hover {
            background: var(--vscode-button-hoverBackground);
          }

          .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }

          .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
          }

          .quick-filter {
            padding: 4px 10px;
            font-size: 12px;
            border: 1px solid var(--vscode-button-border);
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }

          .quick-filter:hover {
            background: var(--vscode-button-secondaryHoverBackground);
          }

          .history-item {
            padding: 8px 12px;
            margin-bottom: 6px;
            background: var(--vscode-list-hoverBackground);
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
          }

          .history-item:hover {
            background: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
          }

          .history-summary {
            color: var(--vscode-descriptionForeground);
          }

          .results-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 12px;
          }

          .results-count {
            font-size: 14px;
            font-weight: 600;
          }

          .result-item {
            padding: 12px;
            margin-bottom: 8px;
            background: var(--vscode-list-hoverBackground);
            border-left: 3px solid transparent;
            border-radius: 3px;
          }

          .result-item.priority-high {
            border-left-color: var(--vscode-charts-red);
          }

          .result-item.priority-medium {
            border-left-color: var(--vscode-charts-orange);
          }

          .result-item.priority-low {
            border-left-color: var(--vscode-charts-blue);
          }

          .result-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
          }

          .result-name {
            font-weight: 600;
            font-size: 13px;
          }

          .result-meta {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
          }

          .result-badge {
            display: inline-block;
            padding: 2px 6px;
            margin-right: 6px;
            font-size: 11px;
            border-radius: 3px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
          }

          .matched-fields {
            margin-top: 6px;
            font-size: 11px;
            color: var(--vscode-charts-green);
          }

          .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
          }

          .empty-icon {
            font-size: 48px;
            margin-bottom: 12px;
            opacity: 0.5;
          }
        </style>
      </head>
      <body>
        <div class="search-container">
          <!-- Search Conditions -->
          <div class="section">
            <div class="section-title">Search Conditions</div>
            <div class="form-group">
              <label class="form-label">Rule Name</label>
              <input type="text" class="form-input" id="namePattern" placeholder="Enter rule name...">
            </div>
            <div class="form-group">
              <label class="form-label">Content</label>
              <input type="text" class="form-input" id="contentPattern" placeholder="Search in rule content...">
            </div>
            <div class="form-group">
              <label class="form-label">Tags (comma separated)</label>
              <input type="text" class="form-input" id="tags" placeholder="e.g., authentication, security">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Priority</label>
                <select class="form-input" id="priority">
                  <option value="">All</option>
                  <option value="2">High (2)</option>
                  <option value="1">Medium (1)</option>
                  <option value="0">Low (0)</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Source</label>
                <input type="text" class="form-input" id="source" placeholder="Source name...">
              </div>
            </div>
            <div class="button-group">
              <button class="btn" id="searchBtn">🔍 Search</button>
              <button class="btn btn-secondary" id="resetBtn">↺ Reset</button>
            </div>
          </div>

          <!-- Quick Filters -->
          <div class="section">
            <div class="section-title">Quick Filters</div>
            <div class="button-group">
              <button class="quick-filter" data-filter="highPriority">🔥 High Priority</button>
              <button class="quick-filter" data-filter="mediumPriority">⚠️ Medium Priority</button>
              <button class="quick-filter" data-filter="lowPriority">ℹ️ Low Priority</button>
            </div>
          </div>

          <!-- Search History -->
          <div class="section" id="historySection" style="display: none;">
            <div class="section-title">
              Search History
              <button class="btn btn-secondary" id="clearHistoryBtn" style="float: right; padding: 2px 8px; font-size: 11px;">Clear</button>
            </div>
            <div id="historyList"></div>
          </div>

          <!-- Results -->
          <div class="section">
            <div class="results-header">
              <div class="results-count" id="resultsCount">Ready to search</div>
              <div class="button-group" id="exportButtons" style="display: none;">
                <button class="btn btn-secondary" id="exportJsonBtn">Export JSON</button>
                <button class="btn btn-secondary" id="exportCsvBtn">Export CSV</button>
              </div>
            </div>
            <div id="resultsList">
              <div class="empty-state">
                <div class="empty-icon">🔍</div>
                <div>Enter search criteria and click Search</div>
              </div>
            </div>
          </div>
        </div>

        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();

          // 加载搜索历史
          vscode.postMessage({ type: 'loadHistory' });

          // 搜索按钮
          document.getElementById('searchBtn').addEventListener('click', () => {
            performSearch();
          });

          // 重置按钮
          document.getElementById('resetBtn').addEventListener('click', () => {
            document.getElementById('namePattern').value = '';
            document.getElementById('contentPattern').value = '';
            document.getElementById('tags').value = '';
            document.getElementById('priority').value = '';
            document.getElementById('source').value = '';
          });

          // 快捷过滤器
          document.querySelectorAll('.quick-filter').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const filter = e.target.dataset.filter;
              document.getElementById('priority').value = 
                filter === 'highPriority' ? '2' :
                filter === 'mediumPriority' ? '1' : '0';
              performSearch();
            });
          });

          // 清除历史
          document.getElementById('clearHistoryBtn').addEventListener('click', () => {
            vscode.postMessage({ type: 'clearHistory' });
          });

          // 导出按钮
          document.getElementById('exportJsonBtn').addEventListener('click', () => {
            vscode.postMessage({ type: 'exportResults', format: 'json' });
          });

          document.getElementById('exportCsvBtn').addEventListener('click', () => {
            vscode.postMessage({ type: 'exportResults', format: 'csv' });
          });

          // 执行搜索
          function performSearch() {
            const criteria = {
              namePattern: document.getElementById('namePattern').value,
              contentPattern: document.getElementById('contentPattern').value,
              tags: document.getElementById('tags').value.split(',').map(t => t.trim()).filter(Boolean),
              priority: document.getElementById('priority').value ? parseInt(document.getElementById('priority').value) : undefined,
              source: document.getElementById('source').value
            };

            vscode.postMessage({ type: 'search', criteria });
          }

          // 从历史加载搜索条件
          function loadCriteria(criteria) {
            document.getElementById('namePattern').value = criteria.namePattern || '';
            document.getElementById('contentPattern').value = criteria.contentPattern || '';
            document.getElementById('tags').value = (criteria.tags || []).join(', ');
            document.getElementById('priority').value = criteria.priority !== undefined ? criteria.priority.toString() : '';
            document.getElementById('source').value = criteria.source || '';
            performSearch();
          }

          // 接收消息
          window.addEventListener('message', event => {
            const message = event.data;

            if (message.type === 'searchResults') {
              displayResults(message.results);
            } else if (message.type === 'searchHistory') {
              displayHistory(message.history);
            } else if (message.type === 'error') {
              alert(message.message);
            }
          });

          // 显示搜索结果
          function displayResults(results) {
            const resultsList = document.getElementById('resultsList');
            const resultsCount = document.getElementById('resultsCount');
            const exportButtons = document.getElementById('exportButtons');

            resultsCount.textContent = \`Results (\${results.length} found)\`;
            exportButtons.style.display = results.length > 0 ? 'flex' : 'none';

            if (results.length === 0) {
              resultsList.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><div>No results found</div></div>';
              return;
            }

            resultsList.innerHTML = results.map(result => {
              const priorityClass = 
                result.rule.priority === 2 ? 'priority-high' :
                result.rule.priority === 1 ? 'priority-medium' : 'priority-low';
              
              const priorityIcon = 
                result.rule.priority === 2 ? '🔥' :
                result.rule.priority === 1 ? '⚠️' : 'ℹ️';

              return \`
                <div class="result-item \${priorityClass}">
                  <div class="result-header">
                    <div class="result-name">\${priorityIcon} \${escapeHtml(result.rule.name)}</div>
                    <button class="btn btn-secondary" style="padding: 4px 10px; font-size: 11px;" onclick="viewRule('\${escapeHtml(result.rule.path)}')">View</button>
                  </div>
                  <div class="result-meta">
                    <span class="result-badge">Source: \${escapeHtml(result.rule.source)}</span>
                    \${result.rule.tags.map(tag => \`<span class="result-badge">\${escapeHtml(tag)}</span>\`).join('')}
                  </div>
                  \${result.rule.description ? \`<div style="margin-top: 6px; font-size: 12px; color: var(--vscode-descriptionForeground);">\${escapeHtml(result.rule.description)}</div>\` : ''}
                  <div class="matched-fields">✓ Matched: \${result.matchedFields.join(', ')}</div>
                </div>
              \`;
            }).join('');
          }

          // 显示搜索历史
          function displayHistory(history) {
            const historySection = document.getElementById('historySection');
            const historyList = document.getElementById('historyList');

            if (history.length === 0) {
              historySection.style.display = 'none';
              return;
            }

            historySection.style.display = 'block';
            historyList.innerHTML = history.map((criteria, index) => {
              const parts = [];
              if (criteria.namePattern) parts.push(\`name: "\${criteria.namePattern}"\`);
              if (criteria.contentPattern) parts.push(\`content: "\${criteria.contentPattern}"\`);
              if (criteria.tags && criteria.tags.length > 0) parts.push(\`tags: \${criteria.tags.join(', ')}\`);
              if (criteria.priority !== undefined) parts.push(\`priority: \${criteria.priority}\`);
              if (criteria.source) parts.push(\`source: "\${criteria.source}"\`);

              return \`
                <div class="history-item" onclick='loadCriteria(\${JSON.stringify(criteria)})'>
                  <div style="font-weight: 600;">• Search #\${index + 1}</div>
                  <div class="history-summary">\${parts.join(' | ')}</div>
                </div>
              \`;
            }).join('');
          }

          // 查看规则
          function viewRule(rulePath) {
            vscode.postMessage({ type: 'viewRule', rulePath });
          }

          // HTML 转义
          function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
          }

          // 回车键搜索
          document.querySelectorAll('.form-input').forEach(input => {
            input.addEventListener('keypress', (e) => {
              if (e.key === 'Enter') {
                performSearch();
              }
            });
          });
        </script>
      </body>
      </html>
    `;
  }
}
