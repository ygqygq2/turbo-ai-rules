/**
 * 规则源详情页面 Webview 提供者（已拆分为多文件结构）
 * 只负责主入口和路由，具体逻辑分散到 sourceDetail 目录下各模块
 */
import * as vscode from 'vscode';

import { BaseWebviewProvider, type WebviewMessage } from '../BaseWebviewProvider';
import { getSourceDetailHtmlContent } from './getSourceDetailHtmlContent.js';
import { handleSourceDetailMessage } from './handleSourceDetailMessage.js';

export class SourceDetailWebviewProvider extends BaseWebviewProvider {
  private static instance: SourceDetailWebviewProvider | undefined;
  private currentSourceId: string | undefined;

  private constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  public static getInstance(context: vscode.ExtensionContext): SourceDetailWebviewProvider {
    if (!SourceDetailWebviewProvider.instance) {
      SourceDetailWebviewProvider.instance = new SourceDetailWebviewProvider(context);
    }
    return SourceDetailWebviewProvider.instance;
  }

  public async showSourceDetail(sourceId: string): Promise<void> {
    this.currentSourceId = sourceId;
    await this.show({
      viewType: 'turboAiRules.sourceDetail',
      title: sourceId === 'new' ? 'Add New Rule Source' : 'Source Details',
      viewColumn: vscode.ViewColumn.One,
    });
  }

  protected async getHtmlContent(webview: vscode.Webview): Promise<string> {
    return getSourceDetailHtmlContent(this.currentSourceId, webview, this.context);
  }

  protected async handleMessage(message: WebviewMessage): Promise<void> {
    await handleSourceDetailMessage(message, this.currentSourceId, this.context, {
      postMessage: async (msg: unknown) => {
        await this.postMessage(msg as WebviewMessage);
        return true;
      },
    });
  }
}
