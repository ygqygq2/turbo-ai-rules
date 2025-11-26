/**
 * 规则源详情页面 Webview 提供者（重构后的简化版本）
 * 显示单个规则源的详细信息、统计数据和规则列表
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { EXTENSION_ICON_PATH } from '../../utils/constants';
import { Logger } from '../../utils/logger';
import { BaseWebviewProvider, type WebviewMessage } from '../BaseWebviewProvider';
import { SourceDetailDataHelper } from './SourceDetailDataHelper';
import { type MessageSender, SourceDetailMessageHandler } from './SourceDetailMessageHandler';

// 重新导出类型
export type { SourceDetailData, SourceStatistics, SyncInfo } from './SourceDetailDataHelper';

/**
 * 规则源详情页面提供者
 */
export class SourceDetailWebviewProvider extends BaseWebviewProvider implements MessageSender {
  private static instance: SourceDetailWebviewProvider | undefined;
  private currentSourceId: string | undefined;
  private webviewReady: boolean = false;

  // 组合：消息处理器和数据助手
  private messageHandler!: SourceDetailMessageHandler;
  private dataHelper!: SourceDetailDataHelper;

  private constructor(context: vscode.ExtensionContext) {
    super(context);
    this.initializeHelpers();
  }

  /**
   * 实现 MessageSender 接口
   */
  public send(type: string, payload?: unknown): void {
    this.postMessage({ type, payload });
  }

  /**
   * 初始化助手类
   */
  private initializeHelpers(): void {
    this.dataHelper = new SourceDetailDataHelper(this.context);
    this.messageHandler = new SourceDetailMessageHandler(
      this.context,
      this, // 实现 MessageHandler 接口
      () => this.currentSourceId,
      (id: string) => {
        this.currentSourceId = id;
      },
      () => this.loadAndSendData(),
    );
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
   * 显示规则源表单页面(新增或编辑)
   * @param sourceId - 'new' 表示新增，其他值表示编辑并预填数据
   */
  public async showSourceForm(sourceId: string): Promise<void> {
    this.currentSourceId = sourceId;
    this.webviewReady = false;

    const isNew = sourceId === 'new';

    await this.show({
      viewType: 'turboAiRules.addSource',
      title: isNew ? vscode.l10n.t('Add New Rule Source') : vscode.l10n.t('Edit Source'),
      viewColumn: vscode.ViewColumn.One,
      iconPath: EXTENSION_ICON_PATH,
      initialScript: isNew
        ? 'window.initialMode = "new";'
        : `window.initialMode = "edit"; window.editSourceId = "${sourceId}";`,
    });

    // 编辑模式下，等待 webview ready 后发送源数据
    if (!isNew && this.webviewReady) {
      await this.messageHandler.handleLoadSourceData(sourceId);
    }
  }

  /**
   * 显示规则源详情页面（查看统计信息和规则列表）
   * @param sourceId - 规则源ID
   */
  public async showDetail(sourceId: string): Promise<void> {
    this.currentSourceId = sourceId;
    this.webviewReady = false;

    await this.show({
      viewType: 'turboAiRules.sourceDetail',
      title: vscode.l10n.t('Source Details'),
      viewColumn: vscode.ViewColumn.One,
      iconPath: EXTENSION_ICON_PATH,
    });

    if (this.webviewReady) {
      await this.loadAndSendData();
    }
  }

  /**
   * 兼容旧方法名（向后兼容）
   * @deprecated 使用 showSourceForm 或 showDetail 代替
   */
  public async showSourceDetail(sourceId: string, mode: 'view' | 'edit' = 'view'): Promise<void> {
    if (mode === 'edit' || sourceId === 'new') {
      await this.showSourceForm(sourceId);
    } else {
      await this.showDetail(sourceId);
    }
  }

  /**
   * 加载并发送数据到 Webview
   */
  private async loadAndSendData(): Promise<void> {
    if (!this.currentSourceId) {
      return;
    }

    try {
      const data = await this.dataHelper.loadSourceDetailData(this.currentSourceId);

      this.postMessage({
        type: 'sourceData',
        payload: data,
      });
    } catch (error) {
      Logger.error('Failed to load source detail data');
      this.postMessage({
        type: 'error',
        payload: {
          message: error instanceof Error ? error.message : 'Failed to load source details',
        },
      });
    }
  }

  /**
   * 生成 HTML 内容
   */
  protected async getHtmlContent(webview: vscode.Webview): Promise<string> {
    // 根据 viewType 决定加载哪个 HTML 文件
    const isFormMode = this.currentViewType === 'turboAiRules.addSource';
    const htmlSubPath = isFormMode ? 'add-source' : 'source-detail';

    const htmlPath = path.join(
      this.context.extensionPath,
      'out',
      'webview',
      'src',
      'webview',
      htmlSubPath,
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
      } catch {
        return match;
      }
    });

    // 注入资源前缀重写脚本
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
        } catch (e) {}
      })();</script>`;

      html = html.replace('</head>', `${patchScript}</head>`);
    } catch {
      // 静默处理
    }

    // 注入模式和数据
    const isNew = this.currentSourceId === 'new';
    if (isNew) {
      html = html.replace('</head>', '<script>window.initialMode = "new";</script></head>');
    } else if (this.currentSourceId && isFormMode) {
      // 编辑模式：注入 sourceId
      const initScript = `<script>
        window.initialMode = "edit";
        window.editSourceId = "${this.currentSourceId}";
      </script>`;
      html = html.replace('</head>', `${initScript}</head>`);
    }

    return html;
  }

  /**
   * 处理来自 Webview 的消息
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'ready':
          this.webviewReady = true;
          // 详情模式加载数据
          if (this.currentViewType === 'turboAiRules.sourceDetail' && this.currentSourceId) {
            await this.loadAndSendData();
          }
          // 编辑模式加载源数据
          else if (
            this.currentViewType === 'turboAiRules.addSource' &&
            this.currentSourceId &&
            this.currentSourceId !== 'new'
          ) {
            await this.messageHandler.handleLoadSourceData(this.currentSourceId);
          }
          break;

        case 'loadSourceData':
          await this.messageHandler.handleLoadSourceData(message.payload?.sourceId);
          break;

        case 'addSource':
          await this.messageHandler.handleAddSource(message.payload);
          break;

        case 'updateSource':
          await this.messageHandler.handleUpdateSource(message.payload);
          break;

        case 'testConnection':
          await this.messageHandler.handleTestConnection(message.payload);
          break;

        case 'refresh':
          await this.loadAndSendData();
          break;

        case 'syncSource':
          await this.messageHandler.handleSyncSource(message.payload?.sourceId);
          break;

        case 'editSource':
          await this.messageHandler.handleEditSource(message.payload?.sourceId);
          break;

        case 'toggleSource':
          await this.messageHandler.handleToggleSource(message.payload?.sourceId);
          break;

        case 'deleteSource':
          await this.messageHandler.handleDeleteSource(message.payload?.sourceId, () =>
            this.dispose(),
          );
          break;

        case 'viewRule':
          await this.messageHandler.handleViewRule(message.payload?.rulePath);
          break;

        case 'filterByTag':
        case 'searchRules':
          // 前端处理
          break;

        default:
          Logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      Logger.error('Failed to handle webview message');
      this.postMessage({
        type: 'error',
        payload: {
          message: error instanceof Error ? error.message : 'Failed to handle action',
        },
      });
    }
  }
}
