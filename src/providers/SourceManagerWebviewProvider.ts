/**
 * Source Manager Webview 提供者
 * 管理规则源的增删改查操作
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { RulesManager } from '../services/RulesManager';
import { WorkspaceStateManager } from '../services/WorkspaceStateManager';
import { EXTENSION_ICON_PATH } from '../utils/constants';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';
import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';
import { SourceDetailWebviewProvider } from './SourceDetailWebview';

/**
 * Source Manager 提供者
 */
export class SourceManagerWebviewProvider extends BaseWebviewProvider {
  private static instance: SourceManagerWebviewProvider | undefined;
  private configManager: ConfigManager;
  private rulesManager: RulesManager;

  private constructor(context: vscode.ExtensionContext) {
    super(context);
    this.configManager = ConfigManager.getInstance(context);
    this.rulesManager = RulesManager.getInstance();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(context: vscode.ExtensionContext): SourceManagerWebviewProvider {
    if (!SourceManagerWebviewProvider.instance) {
      SourceManagerWebviewProvider.instance = new SourceManagerWebviewProvider(context);
    }
    return SourceManagerWebviewProvider.instance;
  }

  /**
   * 显示 Source Manager 页面
   */
  public async showSourceManager(): Promise<void> {
    await this.show({
      viewType: 'turboAiRules.sourceManager',
      title: vscode.l10n.t('sourceManager.title'),
      viewColumn: vscode.ViewColumn.One,
      iconPath: EXTENSION_ICON_PATH,
    });
  }

  /**
   * 生成 HTML 内容
   */
  protected async getHtmlContent(webview: vscode.Webview): Promise<string> {
    // 尝试多个可能的构建产物路径（兼容不同的构建输出布局）
    const candidates = [
      path.join(
        this.context.extensionPath,
        'out',
        'webview',
        'src',
        'webview',
        'source-manager',
        'index.html',
      ),
      path.join(this.context.extensionPath, 'out', 'webview', 'source-manager', 'index.html'),
      path.join(this.context.extensionPath, 'out', 'webview', 'source-manager.html'),
      path.join(this.context.extensionPath, 'out', 'webview', 'source-manager', 'index.htm'),
    ];

    let html: string | null = null;
    let htmlPath: string | undefined;

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) {
        htmlPath = candidate;
        try {
          html = fs.readFileSync(candidate, 'utf-8');
          break;
        } catch (e) {
          // 如果读取失败，继续尝试其他候选
          Logger.warn(`Failed to read candidate html: ${candidate}`, { err: e as Error });
        }
      }
    }

    if (!html) {
      const msg =
        'Source Manager webview HTML not found. Please run `npm run build:webview` or start the extension in development mode.';
      Logger.error(msg);
      // 返回一个友好的占位 HTML，避免扩展崩溃
      return `<html><body><h2>${msg}</h2></body></html>`;
    }

    // 替换 CSP 占位符
    const cspSource = this.getCspSource(webview);
    html = html.replace(/\{\{cspSource\}\}/g, cspSource);

    // 转换资源路径为 webview URI
    const htmlDir = path.dirname(htmlPath as string);
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
   * 处理来自 Webview 的消息
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      const messageType = message.type;
      Logger.info(`SourceManagerWebviewProvider received message: ${messageType}`, {
        payload: message.payload,
      });

      switch (messageType) {
        case 'ready':
          // 前端加载完成后，发送初始数据
          Logger.info('Source Manager webview ready, sending initial data');
          await this.sendInitialData();
          break;

        case 'addSource':
          // 打开添加规则源的独立 webview
          await vscode.commands.executeCommand('turbo-ai-rules.addSource');
          break;

        case 'editSource':
          // 直接打开编辑规则源的 Webview 表单
          {
            const provider = SourceDetailWebviewProvider.getInstance(this.context);
            await provider.showSourceForm(message.payload.sourceId);
          }
          break;

        case 'deleteSource':
          // 删除规则源
          await this.handleDeleteSource(message.payload.sourceId);
          break;

        case 'toggleSource':
          // 启用/禁用规则源
          await this.handleToggleSource(message.payload.sourceId, message.payload.enabled);
          break;

        case 'syncSource':
          // 同步规则源
          await this.handleSyncSource(message.payload.sourceId);
          break;

        default:
          Logger.warn(`Unknown message type: ${messageType}`);
      }
    } catch (error) {
      Logger.error('Failed to handle webview message', error instanceof Error ? error : undefined);
      notify(
        `Failed to handle action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'error',
      );

      // 发送错误消息给前端
      this.postMessage({
        type: 'operationResult',
        payload: {
          success: false,
          operation: 'unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * 发送初始数据到前端
   * @param messageType 消息类型，'init' 用于初始加载，'updateSources' 用于数据更新
   */
  private async sendInitialData(messageType: 'init' | 'updateSources' = 'init'): Promise<void> {
    try {
      // 获取所有规则源
      const sources = this.configManager.getSources();
      Logger.debug('SourceManagerWebviewProvider: getSources', {
        count: sources.length,
        sources: sources.map((s) => ({ id: s.id, name: s.name })),
      });

      // 转换数据格式 - 直接从规则管理器获取每个源的规则数量
      // 从 WorkspaceStateManager 获取最后同步时间，与状态栏保持一致
      const workspaceStateManager = WorkspaceStateManager.getInstance();
      const sourcesWithStats = await Promise.all(
        sources.map(async (source) => {
          const rules = this.rulesManager.getRulesBySource(source.id);
          const lastSyncTime = await workspaceStateManager.getLastSyncTime(source.id);
          return {
            id: source.id,
            name: source.name,
            gitUrl: source.gitUrl,
            branch: source.branch || 'main',
            enabled: source.enabled,
            ruleCount: rules.length,
            lastSync: lastSyncTime || null,
            authType: source.authentication?.type || 'none',
            subPath: source.subPath,
          };
        }),
      );

      Logger.debug('SourceManagerWebviewProvider: sourcesWithStats', {
        count: sourcesWithStats.length,
        sources: sourcesWithStats.map((s) => ({
          id: s.id,
          name: s.name,
          ruleCount: s.ruleCount,
        })),
      });

      // 发送数据
      this.postMessage({
        type: messageType,
        payload: {
          sources: sourcesWithStats,
        },
      });

      Logger.info(`Data sent to Source Manager webview (${messageType})`, {
        count: sources.length,
        sources: sourcesWithStats.map((s) => ({ id: s.id, name: s.name, ruleCount: s.ruleCount })),
      });
    } catch (error) {
      Logger.error('Failed to send data', error instanceof Error ? error : undefined);
    }
  }

  /**
   * 处理删除规则源
   */
  private async handleDeleteSource(sourceId: string): Promise<void> {
    try {
      // 获取规则源名称
      const source = this.configManager.getSourceById(sourceId);
      if (!source) {
        throw new Error(`Source not found: ${sourceId}`);
      }

      // 删除规则源
      await this.configManager.removeSource(sourceId);

      // 发送更新后的数据
      await this.sendInitialData('updateSources');

      Logger.info('Source deleted successfully', { sourceId });
      notify(`Source "${source.name}" deleted successfully`, 'info');
    } catch (error) {
      Logger.error('Failed to delete source', error instanceof Error ? error : undefined);

      // 发送错误消息
      this.postMessage({
        type: 'operationResult',
        payload: {
          success: false,
          operation: 'delete',
          message: error instanceof Error ? error.message : 'Failed to delete source',
        },
      });
    }
  }

  /**
   * 处理启用/禁用规则源
   */
  private async handleToggleSource(sourceId: string, enabled: boolean): Promise<void> {
    try {
      // 获取规则源
      const source = this.configManager.getSourceById(sourceId);
      if (!source) {
        throw new Error(`Source not found: ${sourceId}`);
      }

      // 更新规则源状态
      await this.configManager.updateSource(sourceId, { enabled });

      // 发送更新后的数据
      await this.sendInitialData('updateSources');

      Logger.info('Source toggled successfully', { sourceId, enabled });
      notify(`Source "${source.name}" ${enabled ? 'enabled' : 'disabled'} successfully`, 'info');
    } catch (error) {
      Logger.error('Failed to toggle source', error instanceof Error ? error : undefined);

      // 发送错误消息
      this.postMessage({
        type: 'operationResult',
        payload: {
          success: false,
          operation: 'toggle',
          message: error instanceof Error ? error.message : 'Failed to toggle source',
        },
      });
    }
  }

  /**
   * 处理同步规则源
   */
  private async handleSyncSource(sourceId: string): Promise<void> {
    try {
      // 显示同步进度
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Syncing rules from source: ${sourceId}`,
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: 'Syncing...' });

          // 执行同步
          await vscode.commands.executeCommand('turbo-ai-rules.syncRules', sourceId);

          progress.report({ message: 'Sync completed' });

          // 获取规则数量
          const rules = this.rulesManager.getRulesBySource(sourceId);
          const ruleCount = rules.length;

          // 发送同步完成消息（包含规则数量）
          this.postMessage({
            type: 'syncCompleted',
            payload: {
              sourceId,
              success: true,
              ruleCount,
              message: 'Sync completed successfully',
            },
          });

          // 发送更新后的数据
          await this.sendInitialData('updateSources');
        },
      );

      Logger.info('Source synced successfully', { sourceId });
    } catch (error) {
      Logger.error('Failed to sync source', error instanceof Error ? error : undefined);

      // 发送错误消息
      this.postMessage({
        type: 'syncCompleted',
        payload: {
          sourceId,
          success: false,
          ruleCount: 0,
          message: error instanceof Error ? error.message : 'Failed to sync source',
        },
      });
    }
  }
}
