/**
 * 规则源详情页面 Webview 提供者
 * 显示单个规则源的详细信息、统计数据和规则列表
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { RulesManager } from '../services/RulesManager';
import type { ParsedRule, RuleSource } from '../types';
import { Logger } from '../utils/logger';
import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';

/**
 * 规则源统计信息
 */
export interface SourceStatistics {
  totalRules: number;
  priorityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  topTags: Array<{ tag: string; count: number }>;
  createdAt?: string;
  lastUpdated?: string;
  totalSyncs?: number;
}

/**
 * 同步信息
 */
export interface SyncInfo {
  lastSynced?: string;
  status: 'success' | 'error' | 'never';
  message?: string;
  cacheSize?: string;
  nextAutoSync?: string;
}

/**
 * 规则源详情数据
 */
export interface SourceDetailData {
  source: RuleSource;
  rules: ParsedRule[];
  statistics: SourceStatistics;
  syncInfo: SyncInfo;
}

/**
 * 规则源详情页面提供者
 */
export class SourceDetailWebviewProvider extends BaseWebviewProvider {
  private static instance: SourceDetailWebviewProvider | undefined;
  private currentSourceId: string | undefined;

  private constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(context: vscode.ExtensionContext): SourceDetailWebviewProvider {
    if (!SourceDetailWebviewProvider.instance) {
      SourceDetailWebviewProvider.instance = new SourceDetailWebviewProvider(context);
    }
    return SourceDetailWebviewProvider.instance;
  }

  /**
   * 显示规则源详情页面
   */
  public async showSourceDetail(sourceId: string): Promise<void> {
    this.currentSourceId = sourceId;

    // 新增模式特殊处理
    if (sourceId === 'new') {
      await this.show({
        viewType: 'turboAiRules.sourceDetail',
        title: 'Add New Rule Source',
        viewColumn: vscode.ViewColumn.One,
        initialScript: 'window.initialMode = "new";',
      });
      // 不发送数据，前端渲染空表单
      return;
    }

    await this.show({
      viewType: 'turboAiRules.sourceDetail',
      title: 'Source Details',
      viewColumn: vscode.ViewColumn.One,
    });
    // 加载并发送数据
    await this.loadAndSendData();
  }

  /**
   * 加载并发送数据到 Webview
   */
  private async loadAndSendData(): Promise<void> {
    if (!this.currentSourceId) {
      return;
    }

    try {
      const configManager = ConfigManager.getInstance(this.context);
      const rulesManager = RulesManager.getInstance();

      // 获取规则源
      const sources = await configManager.getSources();
      const source = sources.find((s) => s.id === this.currentSourceId);

      if (!source) {
        throw new Error(`Source not found: ${this.currentSourceId}`);
      }

      // 获取该源的所有规则
      const sourceRules = rulesManager.getRulesBySource(this.currentSourceId);

      // 计算统计数据
      const statistics = this.calculateStatistics(sourceRules);

      // 获取同步信息
      const syncInfo = await this.getSyncInfo(source);

      // 发送数据到 Webview
      this.postMessage({
        type: 'sourceData',
        payload: {
          source,
          rules: sourceRules,
          statistics,
          syncInfo,
        },
      });
    } catch (error) {
      Logger.error('Failed to load source detail data', error instanceof Error ? error : undefined);
      this.postMessage({
        type: 'error',
        payload: {
          message: error instanceof Error ? error.message : 'Failed to load source details',
        },
      });
    }
  }

  /**
   * 计算规则源统计数据
   */
  private calculateStatistics(rules: ParsedRule[]): SourceStatistics {
    const statistics: SourceStatistics = {
      totalRules: rules.length,
      priorityDistribution: {
        high: 0,
        medium: 0,
        low: 0,
      },
      topTags: [],
    };

    // 计算优先级分布
    rules.forEach((rule) => {
      const priority = rule.metadata?.priority || 'medium';
      if (priority === 'high') {
        statistics.priorityDistribution.high++;
      } else if (priority === 'low') {
        statistics.priorityDistribution.low++;
      } else {
        statistics.priorityDistribution.medium++;
      }
    });

    // 计算标签分布
    const tagCounts = new Map<string, number>();
    rules.forEach((rule) => {
      const tags = rule.metadata?.tags || [];
      tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    // 获取前6个最常用标签
    statistics.topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return statistics;
  }

  /**
   * 获取同步信息
   */
  private async getSyncInfo(source: RuleSource): Promise<SyncInfo> {
    const syncInfo: SyncInfo = {
      status: source.lastSync ? 'success' : 'never',
      lastSynced: source.lastSync,
    };

    // 计算缓存大小
    try {
      const configManager = ConfigManager.getInstance(this.context);
      const config = configManager.getConfig();
      const cacheDir = config.storage.useGlobalCache
        ? path.join(this.context.globalStorageUri.fsPath, 'sources', source.id)
        : path.join(
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
            config.storage.projectLocalDir,
            'sources',
            source.id,
          );

      if (fs.existsSync(cacheDir)) {
        const size = await this.getDirectorySize(cacheDir);
        syncInfo.cacheSize = this.formatBytes(size);
      }
    } catch (error) {
      Logger.warn('Failed to calculate cache size');
    }

    // 计算下次自动同步时间
    if (source.syncInterval && source.syncInterval > 0 && source.lastSync) {
      const lastSyncTime = new Date(source.lastSync).getTime();
      const nextSyncTime = lastSyncTime + source.syncInterval * 60 * 1000;
      const now = Date.now();

      if (nextSyncTime > now) {
        const minutesLeft = Math.round((nextSyncTime - now) / 60000);
        syncInfo.nextAutoSync =
          minutesLeft > 60
            ? `in ${Math.round(minutesLeft / 60)} hours`
            : `in ${minutesLeft} minutes`;
      } else {
        syncInfo.nextAutoSync = 'pending';
      }
    }

    return syncInfo;
  }

  /**
   * 获取目录大小
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        totalSize += await this.getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }

    return totalSize;
  }

  /**
   * 格式化字节数
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  /**
   * 生成 HTML 内容
   */
  protected async getHtmlContent(webview: vscode.Webview): Promise<string> {
    // 获取编译后的 webview 文件路径
    const htmlPath = path.join(
      this.context.extensionPath,
      'out',
      'webview',
      'src',
      'webview',
      'source-detail',
      'index.html',
    );

    // 读取 HTML 文件
    let html = fs.readFileSync(htmlPath, 'utf-8');

    // 替换 CSP 占位符
    const cspSource = this.getCspSource(webview);
    html = html.replace(/\{\{cspSource\}\}/g, cspSource);

    // 转换资源路径为 webview URI（支持绝对和相对路径）
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

        if (!fs.existsSync(absPath)) return match;

        const assetUri = webview.asWebviewUri(vscode.Uri.file(absPath));
        return match.replace(resourcePath, assetUri.toString());
      } catch (e) {
        return match;
      }
    });

    // 注入资源前缀重写脚本，处理运行时通过"/..."路径预加载的 CSS/JS
    try {
      const assetPrefix = webview
        .asWebviewUri(
          vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', 'global.css'),
        )
        .toString()
        .replace(/global\.css$/, '');

      const patchScript = `<script>(function(){
        try {
          var prefix = '${assetPrefix}';
          var origSetAttribute = Element.prototype.setAttribute;
          Element.prototype.setAttribute = function(name, value){
            try {
              if (name === 'href' && typeof value === 'string' && value.startsWith('/')) {
                value = prefix + value.slice(1);
              }
            } catch(e) {}
            return origSetAttribute.call(this, name, value);
          };
        } catch (e) {
          // 静默处理补丁失败
        }
      })();</script>`;

      html = html.replace('</head>', `${patchScript}</head>`);
    } catch {
      // 静默处理补丁失败
    }

    // 新增模式注入 window.initialMode
    if (this.currentSourceId === 'new') {
      html = html.replace('</head>', '<script>window.initialMode = "new";</script></head>');
    }

    return html;
  }

  /**
   * 处理来自 Webview 的消息
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'refresh':
          await this.loadAndSendData();
          break;

        case 'syncSource':
          await this.handleSyncSource(message.payload?.sourceId);
          break;

        case 'editSource':
          await this.handleEditSource(message.payload?.sourceId);
          break;

        case 'toggleSource':
          await this.handleToggleSource(message.payload?.sourceId);
          break;

        case 'deleteSource':
          await this.handleDeleteSource(message.payload?.sourceId);
          break;

        case 'viewRule':
          await this.handleViewRule(message.payload?.rulePath);
          break;

        case 'filterByTag':
          // 标签过滤在前端处理
          break;

        case 'searchRules':
          // 搜索在前端处理
          break;

        default:
          Logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      Logger.error('Failed to handle webview message', error instanceof Error ? error : undefined);
      this.postMessage({
        type: 'error',
        payload: {
          message: error instanceof Error ? error.message : 'Failed to handle action',
        },
      });
    }
  }

  /**
   * 处理同步规则源
   */
  private async handleSyncSource(sourceId: string): Promise<void> {
    if (!sourceId) {
      return;
    }

    try {
      // 发送同步中状态
      this.postMessage({
        type: 'syncStatus',
        payload: {
          status: 'syncing',
        },
      });

      // 执行同步
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules', sourceId);

      // 重新加载数据
      await this.loadAndSendData();

      // 发送成功状态
      this.postMessage({
        type: 'syncStatus',
        payload: {
          status: 'success',
          message: 'Rules synced successfully',
        },
      });

      vscode.window.showInformationMessage('Rules synced successfully');
    } catch (error) {
      this.postMessage({
        type: 'syncStatus',
        payload: {
          status: 'error',
          message: error instanceof Error ? error.message : 'Failed to sync rules',
        },
      });

      vscode.window.showErrorMessage(
        `Failed to sync rules: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 处理编辑规则源
   */
  private async handleEditSource(sourceId: string): Promise<void> {
    if (!sourceId) {
      return;
    }

    await vscode.commands.executeCommand('turbo-ai-rules.manageSource');
  }

  /**
   * 处理启用/禁用规则源
   */
  private async handleToggleSource(sourceId: string): Promise<void> {
    if (!sourceId) {
      return;
    }

    try {
      const configManager = ConfigManager.getInstance(this.context);
      const sources = await configManager.getSources();
      const source = sources.find((s) => s.id === sourceId);

      if (!source) {
        throw new Error('Source not found');
      }

      await configManager.updateSource(sourceId, {
        enabled: !source.enabled,
      });

      // 重新加载数据
      await this.loadAndSendData();

      vscode.window.showInformationMessage(
        `Source ${source.enabled ? 'disabled' : 'enabled'}: ${source.name || source.gitUrl}`,
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to toggle source: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 处理删除规则源
   */
  private async handleDeleteSource(sourceId: string): Promise<void> {
    if (!sourceId) {
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      'Are you sure you want to delete this source?',
      { modal: true },
      'Delete',
    );

    if (confirm === 'Delete') {
      try {
        await vscode.commands.executeCommand('turbo-ai-rules.removeSource', sourceId);
        this.dispose(); // 关闭详情页面
      } catch (error) {
        vscode.window.showErrorMessage(
          `Failed to delete source: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
      }
    }
  }

  /**
   * 处理查看规则详情
   */
  private async handleViewRule(rulePath: string): Promise<void> {
    if (!rulePath) {
      return;
    }

    try {
      const uri = vscode.Uri.file(rulePath);
      await vscode.window.showTextDocument(uri);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to open rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
