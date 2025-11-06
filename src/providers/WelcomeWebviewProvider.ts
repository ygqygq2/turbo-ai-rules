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
import { notify } from '../utils/notifications';

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
    // 处理绝对路径和相对路径（相对于 HTML 文件）
    const htmlDir = path.dirname(htmlPath);
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
      } catch (e) {
        return match;
      }
    });

    return html;
  }

  /**
   * 处理来自 Webview 的消息
   * 注意：这里直接处理业务逻辑，而不是调用命令
   * VSCode 命令只用于打开 webview，不用于 webview 内部交互
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      // 兼容旧版消息格式：支持 command 字段（用于向后兼容）
      const messageType = message.type || (message as any).command;

      switch (messageType) {
        case 'addSource':
          Logger.debug('Webview message received: addSource', {
            type: messageType,
            payload: message.payload,
          });
          // 直接调用命令（这是例外，因为需要复杂的用户输入流程）
          await vscode.commands.executeCommand('turbo-ai-rules.addSource');
          break;

        case 'selectRules':
          Logger.debug('Webview message received: selectRules', {
            type: messageType,
          });
          // 调用规则选择器命令
          await vscode.commands.executeCommand('turbo-ai-rules.selectRules');
          break;

        case 'syncRules':
          // 页面上的同步按钮：同步所有规则
          await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
          break;

        case 'generateConfigs':
          // 直接调用命令（这是例外，因为需要访问服务层）
          await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
          break;

        case 'useTemplate':
          await this.handleUseTemplate(message.payload?.type || (message as any).template);
          break;

        case 'viewDocs':
        case 'openDocs':
          // 直接在这里处理，不需要命令
          await vscode.env.openExternal(
            vscode.Uri.parse(
              'https://github.com/ygqygq2/turbo-ai-rules/blob/main/docs/user-guide/README.md',
            ),
          );
          break;

        case 'getHelp':
          // 直接在这里处理，不需要命令
          await vscode.env.openExternal(
            vscode.Uri.parse('https://github.com/ygqygq2/turbo-ai-rules/discussions'),
          );
          break;

        case 'dismiss':
        case 'dismissWelcome':
          await this.handleDismiss();
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
      notify('Unknown template type', 'error');
      return;
    }

    // 这里可以实现自动添加模板源的逻辑（使用统一 notify 确认）
    const confirmed = await (notify(
      `Add "${template.name}" template as a rule source?`,
      'info',
      undefined,
      'Add Source',
      true,
    ) as Promise<boolean>);

    if (confirmed) {
      // TODO: 实现添加预配置源的逻辑
      notify(`Template feature coming soon! You can manually add: ${template.url}`, 'info');
    }
  }

  /**
   * 处理关闭欢迎页面
   */
  private async handleDismiss(): Promise<void> {
    const configManager = ConfigManager.getInstance(this.context);
    await this.context.globalState.update('welcomeShown', true);
    this.dispose();
    notify(
      "Welcome page dismissed. You can always access it from the command palette ('Turbo AI Rules: Show Welcome').",
      'info',
    );
  }
}
