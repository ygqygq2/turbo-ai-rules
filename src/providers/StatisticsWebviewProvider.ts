/**
 * 统计视图 Webview 提供者
 * 显示规则同步统计和数据可视化
 */

import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { RulesManager } from '../services/RulesManager';
import { EXTENSION_ICON_PATH } from '../utils/constants';
import { Logger } from '../utils/logger';
import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';

/**
 * 统计数据接口
 */
interface StatisticsData {
  overview: {
    totalRules: number;
    totalSources: number;
    enabledSources: number;
    conflicts: number;
  };
  sourceStats: Array<{
    name: string;
    ruleCount: number;
    enabled: boolean;
    lastSync?: string;
  }>;
  priorityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  topTags: Array<{
    tag: string;
    count: number;
  }>;
}

/**
 * 统计视图提供者
 */
export class StatisticsWebviewProvider extends BaseWebviewProvider {
  private static instance: StatisticsWebviewProvider | undefined;
  private refreshInterval: NodeJS.Timeout | undefined;
  private cachedData: StatisticsData | undefined;
  private lastRefresh: number = 0;
  private readonly CACHE_DURATION = 30000; // 30秒缓存

  private constructor(
    context: vscode.ExtensionContext,
    private configManager: ConfigManager,
    private rulesManager: RulesManager,
  ) {
    super(context);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(
    context: vscode.ExtensionContext,
    configManager: ConfigManager,
    rulesManager: RulesManager,
  ): StatisticsWebviewProvider {
    if (!StatisticsWebviewProvider.instance) {
      StatisticsWebviewProvider.instance = new StatisticsWebviewProvider(
        context,
        configManager,
        rulesManager,
      );
    }
    return StatisticsWebviewProvider.instance;
  }

  /**
   * 显示统计面板
   */
  public async showStatistics(): Promise<void> {
    await this.show({
      viewType: 'turboAiRules.statistics',
      title: vscode.l10n.t('statistics.title'),
      viewColumn: vscode.ViewColumn.Active,
      iconPath: EXTENSION_ICON_PATH,
    });

    // 启动自动刷新
    this.startAutoRefresh();
  }

  /**
   * 生成 HTML 内容
   */
  protected getHtmlContent(webview: vscode.Webview): string {
    const nonce = this.getNonce();
    const data = this.getStatisticsData();

    return `${this.getHtmlHead(webview, vscode.l10n.t('statistics.title'))}
<body>
    <div class="container">
        <div class="header">
            <h1>${vscode.l10n.t('statistics.title')}</h1>
            <div class="toolbar">
                <button class="button" onclick="refreshData()">
                    🔄 ${vscode.l10n.t('statistics.refresh')}
                </button>
                <button class="button button-secondary" onclick="exportData()">
                    📥 ${vscode.l10n.t('statistics.export')}
                </button>
            </div>
        </div>

        <!-- 概览卡片 -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">📝</div>
                <div class="stat-content">
                    <div class="stat-value" id="totalRules">${data.overview.totalRules}</div>
                    <div class="stat-label">${vscode.l10n.t('statistics.totalRules')}</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">📦</div>
                <div class="stat-content">
                    <div class="stat-value" id="totalSources">${data.overview.totalSources}</div>
                    <div class="stat-label">${vscode.l10n.t('statistics.totalSources')}</div>
                </div>
            </div>

            <div class="stat-card">
                <div class="stat-icon">✓</div>
                <div class="stat-content">
                    <div class="stat-value" id="enabledSources">${
                      data.overview.enabledSources
                    }</div>
                    <div class="stat-label">${vscode.l10n.t('statistics.enabledSources')}</div>
                </div>
            </div>

            <div class="stat-card ${data.overview.conflicts > 0 ? 'stat-warning' : ''}">
                <div class="stat-icon">⚠️</div>
                <div class="stat-content">
                    <div class="stat-value" id="conflicts">${data.overview.conflicts}</div>
                    <div class="stat-label">${vscode.l10n.t('statistics.conflicts')}</div>
                </div>
            </div>
        </div>

        <!-- 优先级分布 -->
        <div class="section">
            <h2>${vscode.l10n.t('statistics.priorityDistribution')}</h2>
            <div class="chart-container">
                <div class="bar-chart">
                    ${this.renderPriorityChart(data.priorityDistribution)}
                </div>
            </div>
        </div>

        <!-- 源统计 -->
        <div class="section">
            <h2>${vscode.l10n.t('statistics.sourcesOverview')}</h2>
            <div class="table-container">
                <table class="stats-table">
                    <thead>
                        <tr>
                            <th>${vscode.l10n.t('statistics.sourceName')}</th>
                            <th>${vscode.l10n.t('common.rules')}</th>
                            <th>${vscode.l10n.t('common.status')}</th>
                            <th>${vscode.l10n.t('statistics.lastSync')}</th>
                        </tr>
                    </thead>
                    <tbody id="sourceStats">
                        ${this.renderSourceStats(data.sourceStats)}
                    </tbody>
                </table>
            </div>
        </div>

        <!-- 热门标签 -->
        <div class="section">
            <h2>${vscode.l10n.t('statistics.topTags')}</h2>
            <div class="tags-container">
                ${this.renderTopTags(data.topTags)}
            </div>
        </div>
    </div>

    <style>
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--spacing-lg);
            padding-bottom: var(--spacing-md);
            border-bottom: 1px solid var(--vscode-editorWidget-border);
        }
        
        .toolbar {
            display: flex;
            gap: var(--spacing-sm);
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--spacing-md);
            margin-bottom: var(--spacing-lg);
        }
        
        .stat-card {
            display: flex;
            align-items: center;
            gap: var(--spacing-md);
            padding: var(--spacing-md);
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: var(--border-radius);
        }
        
        .stat-card.stat-warning {
            border-color: var(--vscode-editorWarning-foreground);
        }
        
        .stat-icon {
            font-size: 2em;
            opacity: 0.8;
        }
        
        .stat-content {
            flex: 1;
        }
        
        .stat-value {
            font-size: 2em;
            font-weight: bold;
            color: var(--vscode-foreground);
        }
        
        .stat-label {
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            margin-top: var(--spacing-xs);
        }
        
        .section {
            margin-bottom: var(--spacing-lg);
        }
        
        .section h2 {
            margin-bottom: var(--spacing-md);
        }
        
        .chart-container {
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: var(--border-radius);
            padding: var(--spacing-md);
        }
        
        .bar-chart {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-md);
        }
        
        .bar-item {
            display: flex;
            align-items: center;
            gap: var(--spacing-sm);
        }
        
        .bar-label {
            min-width: 80px;
            font-weight: 500;
        }
        
        .bar-wrapper {
            flex: 1;
            background-color: var(--vscode-input-background);
            border-radius: 4px;
            height: 24px;
            position: relative;
            overflow: hidden;
        }
        
        .bar-fill {
            height: 100%;
            border-radius: 4px;
            transition: width 0.3s ease;
            display: flex;
            align-items: center;
            padding: 0 var(--spacing-sm);
            color: white;
            font-size: 0.85em;
            font-weight: 500;
        }
        
        .bar-fill.priority-high {
            background-color: var(--vscode-errorForeground);
        }
        
        .bar-fill.priority-medium {
            background-color: var(--vscode-editorWarning-foreground);
        }
        
        .bar-fill.priority-low {
            background-color: var(--vscode-charts-blue);
        }
        
        .table-container {
            overflow-x: auto;
        }
        
        .stats-table {
            width: 100%;
            border-collapse: collapse;
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: var(--border-radius);
        }
        
        .stats-table th,
        .stats-table td {
            padding: var(--spacing-sm) var(--spacing-md);
            text-align: left;
            border-bottom: 1px solid var(--vscode-editorWidget-border);
        }
        
        .stats-table th {
            background-color: var(--vscode-input-background);
            font-weight: 600;
        }
        
        .stats-table tbody tr:last-child td {
            border-bottom: none;
        }
        
        .stats-table tbody tr:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        
        .status-badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 500;
        }
        
        .status-enabled {
            background-color: var(--vscode-testing-iconPassed);
            color: white;
        }
        
        .status-disabled {
            background-color: var(--vscode-descriptionForeground);
            color: white;
        }
        
        .tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: var(--spacing-sm);
        }
        
        .tag-item {
            display: inline-flex;
            align-items: center;
            gap: var(--spacing-xs);
            padding: var(--spacing-xs) var(--spacing-sm);
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 12px;
            font-size: 0.9em;
        }
        
        .tag-count {
            background-color: rgba(255, 255, 255, 0.2);
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 0.85em;
            font-weight: 600;
        }
    </style>

    ${this.getVscodeApiScript()}
    ${this.getScriptTag(
      nonce,
      `
        function refreshData() {
            sendMessage('refresh');
        }
        
        function exportData() {
            sendMessage('export');
        }
        
        // 接收数据更新
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'updateStats') {
                updateStatistics(message.data);
            }
        });
        
        function updateStatistics(data) {
            // 更新概览数据
            document.getElementById('totalRules').textContent = data.overview.totalRules;
            document.getElementById('totalSources').textContent = data.overview.totalSources;
            document.getElementById('enabledSources').textContent = data.overview.enabledSources;
            document.getElementById('conflicts').textContent = data.overview.conflicts;
            
            // 这里可以添加更多动态更新逻辑
        }
    `,
    )}
</body>
</html>`;
  }

  /**
   * 渲染优先级图表
   */
  private renderPriorityChart(distribution: StatisticsData['priorityDistribution']): string {
    const total = distribution.high + distribution.medium + distribution.low;
    if (total === 0) return `<p class="empty-state">${vscode.l10n.t('statistics.noRulesData')}</p>`;

    const highPercent = (distribution.high / total) * 100;
    const mediumPercent = (distribution.medium / total) * 100;
    const lowPercent = (distribution.low / total) * 100;

    return `
      <div class="bar-item">
        <div class="bar-label">🔥 ${vscode.l10n.t('common.high')}</div>
        <div class="bar-wrapper">
          <div class="bar-fill priority-high" style="width: ${highPercent}%">
            ${distribution.high}
          </div>
        </div>
      </div>
      <div class="bar-item">
        <div class="bar-label">⚠️ ${vscode.l10n.t('common.medium')}</div>
        <div class="bar-wrapper">
          <div class="bar-fill priority-medium" style="width: ${mediumPercent}%">
            ${distribution.medium}
          </div>
        </div>
      </div>
      <div class="bar-item">
        <div class="bar-label">ℹ️ ${vscode.l10n.t('common.low')}</div>
        <div class="bar-wrapper">
          <div class="bar-fill priority-low" style="width: ${lowPercent}%">
            ${distribution.low}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染源统计表格
   */
  private renderSourceStats(stats: StatisticsData['sourceStats']): string {
    if (stats.length === 0) {
      return `<tr><td colspan="4" style="text-align: center;">${vscode.l10n.t(
        'No sources configured',
      )}</td></tr>`;
    }

    return stats
      .map(
        (source) => `
      <tr>
        <td>${source.name}</td>
        <td>${source.ruleCount}</td>
        <td>
          <span class="status-badge ${source.enabled ? 'status-enabled' : 'status-disabled'}">
            ${source.enabled ? vscode.l10n.t('Enabled') : vscode.l10n.t('Disabled')}
          </span>
        </td>
        <td>${source.lastSync || vscode.l10n.t('Never')}</td>
      </tr>
    `,
      )
      .join('');
  }

  /**
   * 渲染热门标签
   */
  private renderTopTags(tags: StatisticsData['topTags']): string {
    if (tags.length === 0) {
      return `<p class="empty-state">${vscode.l10n.t('statistics.noTagsFound')}</p>`;
    }

    return tags
      .slice(0, 20)
      .map(
        (tag) => `
      <div class="tag-item">
        <span>${tag.tag}</span>
        <span class="tag-count">${tag.count}</span>
      </div>
    `,
      )
      .join('');
  }

  /**
   * 获取统计数据
   */
  private getStatisticsData(): StatisticsData {
    // 检查缓存
    const now = Date.now();
    if (this.cachedData && now - this.lastRefresh < this.CACHE_DURATION) {
      return this.cachedData;
    }

    // 收集数据
    const config = this.configManager.getConfig();
    const rulesStats = this.rulesManager.getStats();
    const allRules = this.rulesManager.getAllRules();

    // 计算优先级分布
    const priorityDistribution = {
      high: 0,
      medium: 0,
      low: 0,
    };

    allRules.forEach((rule) => {
      const priority = rule.metadata.priority || 'medium';
      if (priority === 'high') priorityDistribution.high++;
      else if (priority === 'low') priorityDistribution.low++;
      else priorityDistribution.medium++;
    });

    // 收集源统计
    const sourceStats = config.sources.map((source) => {
      const sourceRules = this.rulesManager.getRulesBySource(source.id);
      return {
        name: source.name,
        ruleCount: sourceRules.length,
        enabled: source.enabled,
        lastSync: source.lastSync,
      };
    });

    // 收集热门标签
    const tagMap = new Map<string, number>();
    allRules.forEach((rule) => {
      if (rule.metadata.tags) {
        rule.metadata.tags.forEach((tag) => {
          tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
        });
      }
    });

    const topTags = Array.from(tagMap.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count);

    const data: StatisticsData = {
      overview: {
        totalRules: rulesStats.totalRules,
        totalSources: config.sources.length,
        enabledSources: config.sources.filter((s) => s.enabled).length,
        conflicts: rulesStats.conflictCount,
      },
      sourceStats,
      priorityDistribution,
      topTags,
    };

    // 更新缓存
    this.cachedData = data;
    this.lastRefresh = now;

    return data;
  }

  /**
   * 处理来自 Webview 的消息
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'refresh':
          await this.refreshStatistics();
          break;

        case 'export':
          await this.exportStatistics();
          break;

        default:
          Logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      Logger.error(
        'Failed to handle statistics message',
        error instanceof Error ? error : undefined,
      );
      vscode.window.showErrorMessage(
        `Failed to handle action: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 刷新统计数据
   */
  private async refreshStatistics(): Promise<void> {
    // 清除缓存
    this.cachedData = undefined;
    this.lastRefresh = 0;

    // 重新获取数据
    const data = this.getStatisticsData();

    // 发送更新到 Webview
    if (this.panel) {
      await this.panel.webview.postMessage({
        type: 'updateStats',
        data,
      });
    }

    vscode.window.showInformationMessage(vscode.l10n.t('statistics.refreshed'));
  }

  /**
   * 导出统计数据
   */
  private async exportStatistics(): Promise<void> {
    const data = this.getStatisticsData();
    const json = JSON.stringify(data, null, 2);

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file('ai-rules-statistics.json'),
      filters: {
        'JSON Files': ['json'],
      },
    });

    if (uri) {
      await vscode.workspace.fs.writeFile(uri, Buffer.from(json, 'utf8'));
      vscode.window.showInformationMessage(vscode.l10n.t('statistics.exported', uri.fsPath));
    }
  }

  /**
   * 启动自动刷新
   */
  private startAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    this.refreshInterval = setInterval(() => {
      if (this.panel?.visible) {
        this.refreshStatistics();
      }
    }, 60000); // 每分钟刷新
  }

  /**
   * 停止自动刷新
   */
  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
  }

  /**
   * 清理资源
   */
  public dispose(): void {
    this.stopAutoRefresh();
    super.dispose();
  }
}
