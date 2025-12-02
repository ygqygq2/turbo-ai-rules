/**
 * Webview 提供者基类
 * 提供通用的 Webview 管理功能
 */

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

/**
 * Webview 消息类型
 */
export interface WebviewMessage {
  type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: any; // 消息负载类型由具体消息决定，使用 any 提供灵活性
}

/**
 * Webview 配置选项
 */
export interface WebviewOptions {
  /** Webview 标题 */
  title: string;
  /** Webview 类型标识 */
  viewType: string;
  /** 可选的初始脚本注入（会在 head 结束前注入） */
  initialScript?: string;
  /** 是否启用脚本 */
  enableScripts?: boolean;
  /** 是否保留上下文 */
  retainContextWhenHidden?: boolean;
  /** 显示列 */
  viewColumn?: vscode.ViewColumn;
  /** 标签页图标路径 */
  iconPath?: string;
}

/**
 * Webview 提供者抽象基类
 */
export abstract class BaseWebviewProvider {
  protected panel: vscode.WebviewPanel | undefined;
  protected disposables: vscode.Disposable[] = [];
  protected currentViewType: string = '';

  constructor(protected context: vscode.ExtensionContext) {}

  /**
   * 创建或显示 Webview 面板
   */
  public async show(options: WebviewOptions): Promise<void> {
    const column = options.viewColumn || vscode.ViewColumn.One;

    // 保存当前 viewType
    this.currentViewType = options.viewType;

    // 如果面板已存在，直接显示并刷新内容（确保模式切换如"Add Source"生效）
    if (this.panel) {
      this.panel.reveal(column);
      // 刷新 HTML 内容以注入最新的模式或数据
      this.panel.webview.html = await this.getHtmlContent(this.panel.webview);
      return;
    }

    // 创建新面板
    this.panel = vscode.window.createWebviewPanel(options.viewType, options.title, column, {
      enableScripts: options.enableScripts ?? true,
      retainContextWhenHidden: options.retainContextWhenHidden ?? true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'resources'),
        vscode.Uri.joinPath(this.context.extensionUri, 'out'),
      ],
    });

    // 设置面板图标
    if (options.iconPath) {
      this.panel.iconPath = vscode.Uri.joinPath(this.context.extensionUri, options.iconPath);
    }

    // 设置 HTML 内容
    this.panel.webview.html = await this.getHtmlContent(this.panel.webview);

    // 监听消息
    this.panel.webview.onDidReceiveMessage(
      (message: WebviewMessage) => this.handleMessage(message),
      null,
      this.disposables,
    );

    // 监听面板关闭
    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    // 监听主题变化
    vscode.window.onDidChangeActiveColorTheme(
      (theme) => this.onThemeChanged(theme),
      null,
      this.disposables,
    );

    Logger.debug(`Webview panel created: ${options.viewType}`);
  }

  /**
   * 发送消息到 Webview
   */
  protected postMessage(message: WebviewMessage): void {
    if (this.panel) {
      Logger.debug(`Sending message to webview: ${message.type}`, { payload: message.payload });
      this.panel.webview.postMessage(message);
    } else {
      Logger.warn(`Cannot send message ${message.type}: panel is not initialized`);
    }
  }

  /**
   * 主题变化处理
   */
  protected onThemeChanged(theme: vscode.ColorTheme): void {
    this.postMessage({
      type: 'themeChanged',
      payload: {
        kind: theme.kind,
        isDark:
          theme.kind === vscode.ColorThemeKind.Dark ||
          theme.kind === vscode.ColorThemeKind.HighContrast,
      },
    });
  }

  /**
   * 获取资源 URI
   */
  protected getResourceUri(webview: vscode.Webview, ...pathSegments: string[]): vscode.Uri {
    return webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, ...pathSegments));
  }

  /**
   * 获取 CSP 源
   */
  protected getCspSource(webview: vscode.Webview): string {
    return webview.cspSource;
  }

  /**
   * 生成随机 nonce
   */
  protected getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * 获取通用的 HTML 模板头部
   */
  protected getHtmlHead(webview: vscode.Webview, title: string, styleUri?: vscode.Uri): string {
    const nonce = this.getNonce();
    const cspSource = this.getCspSource(webview);

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${cspSource} https:; font-src ${cspSource};">
    <title>${title}</title>
    ${styleUri ? `<link rel="stylesheet" href="${styleUri}">` : ''}
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            font-weight: var(--vscode-font-weight);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        
        :root {
            --container-padding: 20px;
            --border-radius: 4px;
            --spacing-sm: 8px;
            --spacing-md: 16px;
            --spacing-lg: 24px;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: var(--border-radius);
            cursor: pointer;
            font-size: inherit;
            font-family: inherit;
            transition: background-color 0.2s;
        }
        
        .button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        
        .button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .button-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .button-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }
        
        .card {
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: var(--border-radius);
            padding: var(--spacing-md);
            margin-bottom: var(--spacing-md);
        }
        
        .input {
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: var(--border-radius);
            padding: 6px 10px;
            font-size: inherit;
            font-family: inherit;
            width: 100%;
        }
        
        .input:focus {
            outline: 1px solid var(--vscode-focusBorder);
        }
    </style>
</head>`;
  }

  /**
   * 获取通用的脚本标签
   */
  protected getScriptTag(nonce: string, content: string): string {
    return `<script nonce="${nonce}">${content}</script>`;
  }

  /**
   * 获取 VS Code API 脚本
   */
  protected getVscodeApiScript(): string {
    const nonce = this.getNonce();
    return this.getScriptTag(
      nonce,
      `
        const vscode = acquireVsCodeApi();
        
        // 发送消息到扩展
        function sendMessage(type, payload) {
            vscode.postMessage({ type, payload });
        }
        
        // 监听来自扩展的消息
        window.addEventListener('message', event => {
            const message = event.data;
            handleMessage(message);
        });
        
        // 消息处理函数（由具体页面实现）
        function handleMessage(message) {
            console.log('Received message:', message);
        }
    `,
    );
  }

  /**
   * 释放资源
   */
  public dispose(): void {
    if (this.panel) {
      this.panel.dispose();
      this.panel = undefined;
    }

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  /**
   * 获取 HTML 内容（由子类实现）
   */
  protected abstract getHtmlContent(webview: vscode.Webview): Promise<string> | string;

  /**
   * 处理来自 Webview 的消息（由子类实现）
   */
  protected abstract handleMessage(message: WebviewMessage): void | Promise<void>;
}
