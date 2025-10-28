/**
 * 欢迎页面 Webview 提供者
 * 显示首次使用引导和快速开始
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { Logger } from '../utils/logger';
import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';

/**
 * 欢迎页面提供者
 */
export class WelcomeWebviewProvider extends BaseWebviewProvider {
  private static instance: WelcomeWebviewProvider | undefined;

  private constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(context: vscode.ExtensionContext): WelcomeWebviewProvider {
    if (!WelcomeWebviewProvider.instance) {
      WelcomeWebviewProvider.instance = new WelcomeWebviewProvider(context);
    }
    return WelcomeWebviewProvider.instance;
  }

  /**
   * 显示欢迎页面
   */
  public async showWelcome(): Promise<void> {
    await this.show({
      viewType: 'turboAiRules.welcome',
      title: 'Welcome to Turbo AI Rules',
      viewColumn: vscode.ViewColumn.One,
    });
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
      'welcome',
      'index.html',
    );

    // 读取 HTML 文件
    let html = fs.readFileSync(htmlPath, 'utf-8');

    // 替换 CSP 占位符
    const cspSource = this.getCspSource(webview);
    html = html.replace(/\{\{cspSource\}\}/g, cspSource);

    // 转换资源路径为 webview URI
    // 处理 /welcome/welcome.js 和 /welcome/welcome.css
    html = html.replace(/(?:src|href)="\/([^"]+)"/g, (match, resourcePath) => {
      const assetUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this.context.extensionUri, 'out', 'webview', resourcePath),
      );
      return match.replace(`/${resourcePath}`, assetUri.toString());
    });

    return html;
  }

  /**
   * 处理来自 Webview 的消息
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'addSource':
          await vscode.commands.executeCommand('turbo-ai-rules.addSource');
          break;

        case 'syncRules':
          await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
          break;

        case 'generateConfigs':
          await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
          break;

        case 'useTemplate':
          await this.handleUseTemplate(message.payload?.type);
          break;

        case 'viewDocs':
          await vscode.env.openExternal(
            vscode.Uri.parse(
              'https://github.com/ygqygq2/turbo-ai-rules/blob/main/docs/user-guide/README.md',
            ),
          );
          break;

        case 'getHelp':
          await vscode.env.openExternal(
            vscode.Uri.parse('https://github.com/ygqygq2/turbo-ai-rules/discussions'),
          );
          break;

        case 'dismiss':
          await this.handleDismiss();
          break;

        default:
          Logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      Logger.error('Failed to handle webview message', error instanceof Error ? error : undefined);
      vscode.window.showErrorMessage(
        `Failed to handle action: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 处理使用模板
   */
  private async handleUseTemplate(type: string): Promise<void> {
    const templates: Record<string, { url: string; name: string }> = {
      typescript: {
        url: 'https://github.com/example/typescript-rules.git',
        name: 'TypeScript Best Practices',
      },
      react: {
        url: 'https://github.com/example/react-rules.git',
        name: 'React Development Rules',
      },
      python: {
        url: 'https://github.com/example/python-rules.git',
        name: 'Python Style Guide',
      },
    };

    const template = templates[type];
    if (!template) {
      vscode.window.showErrorMessage('Unknown template type');
      return;
    }

    // 这里可以实现自动添加模板源的逻辑
    const confirm = await vscode.window.showInformationMessage(
      `Add "${template.name}" template as a rule source?`,
      'Add Source',
      'Cancel',
    );

    if (confirm === 'Add Source') {
      // TODO: 实现添加预配置源的逻辑
      vscode.window.showInformationMessage(
        `Template feature coming soon! You can manually add: ${template.url}`,
      );
    }
  }

  /**
   * 处理关闭欢迎页面
   */
  private async handleDismiss(): Promise<void> {
    const configManager = ConfigManager.getInstance(this.context);
    await this.context.globalState.update('welcomeShown', true);
    this.dispose();
    vscode.window.showInformationMessage(
      "Welcome page dismissed. You can always access it from the command palette ('Turbo AI Rules: Show Welcome').",
    );
  }
}
