/**
 * 统计视图 Webview 提供者
 * 显示规则同步统计和数据可视化
 */

import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { RulesManager } from '../services/RulesManager';
import { WorkspaceStateManager } from '../services/WorkspaceStateManager';
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
  protected async getHtmlContent(webview: vscode.Webview): Promise<string> {
    const fs = await import('fs');
    const path = await import('path');

    // 获取编译后的 webview 文件路径
    const htmlPath = path.join(
      this.context.extensionPath,
      'out',
      'webview',
      'src',
      'webview',
      'statistics',
      'index.html',
    );

    // 读取 HTML 文件
    let html = fs.readFileSync(htmlPath, 'utf-8');

    // 替换 CSP 占位符
    const cspSource = this.getCspSource(webview);
    html = html.replace(/\{\{cspSource\}\}/g, cspSource);

    // 转换资源路径为 webview URI
    const htmlDir = path.dirname(htmlPath);
    html = html.replace(/(?:src|href)="([^"]+)"/g, (match, resourcePath) => {
      try {
        let absPath: string;
        if (resourcePath.startsWith('/')) {
          absPath = path.join(
            this.context.extensionPath,
            'out',
            'webview',
            resourcePath.replace(/^\//, ''),
          );
        } else {
          absPath = path.resolve(htmlDir, resourcePath);
        }

        if (!fs.existsSync(absPath)) {
          return match;
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
    const stateManager = WorkspaceStateManager.getInstance();
    const sourceStats = config.sources.map((source) => {
      const sourceRules = this.rulesManager.getRulesBySource(source.id);
      // 从 WorkspaceStateManager 读取同步时间（与状态栏、仪表板保持一致）
      const lastSyncTime = stateManager.getLastSyncTime(source.id);
      return {
        name: source.name,
        ruleCount: sourceRules.length,
        enabled: source.enabled,
        lastSync: lastSyncTime || undefined,
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
        case 'getStatistics':
          // 响应 Webview 的统计数据请求
          await this.sendStatistics();
          break;

        case 'refresh':
          await this.refreshStatistics();
          break;

        case 'export':
          await this.exportStatistics();
          break;

        case 'searchByTag':
          await this.searchByTag(message.payload?.tag);
          break;

        default:
          Logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      Logger.error(
        'Failed to handle statistics message',
        error instanceof Error ? error : undefined,
      );
      this.postMessage({
        type: 'error',
        payload: {
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * 发送统计数据到 Webview
   */
  private async sendStatistics(): Promise<void> {
    const data = this.getStatisticsData();

    // 直接发送完整的统计数据（与 React 组件的 StatisticsData 接口匹配）
    this.postMessage({
      type: 'statisticsData',
      payload: data,
    });
  }

  /**
   * 刷新统计数据
   */
  private async refreshStatistics(): Promise<void> {
    // 清除缓存
    this.cachedData = undefined;
    this.lastRefresh = 0;

    // 重新发送数据到 Webview
    await this.sendStatistics();

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
   * 根据标签打开搜索页
   */
  private async searchByTag(tag: string): Promise<void> {
    if (!tag) {
      Logger.warn('searchByTag called without tag');
      return;
    }

    // 动态导入避免循环依赖
    const { SearchWebviewProvider } = await import('./SearchWebviewProvider');
    const searchProvider = SearchWebviewProvider.getInstance(this.context, this.rulesManager);

    // 打开搜索页并预填标签
    await searchProvider.showSearchWithCriteria({ tags: [tag] });
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
