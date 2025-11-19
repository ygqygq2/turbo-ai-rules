/**
 * 欢迎页面 Webview 提供者
 * 显示首次使用引导和快速开始
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS, CONFIG_PREFIX, EXTENSION_ICON_PATH } from '../utils/constants';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';
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
      iconPath: EXTENSION_ICON_PATH,
    });
    // 注意：不在这里发送初始状态，而是等待前端的 ready 消息
    // 这是 VSCode Webview 的最佳实践，避免时序问题
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
      } catch (_e) {
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const messageType = message.type || (message as any).command;

      switch (messageType) {
        case 'ready':
          // VSCode 最佳实践: 前端加载完成后请求初始状态
          Logger.debug('Webview ready, sending initial state');
          await this.sendInitialState();
          break;

        case 'addSource':
          Logger.debug('Webview message received: addSource', {
            type: messageType,
            payload: message.payload,
          });
          // 直接调用命令（这是例外，因为需要复杂的用户输入流程）
          await vscode.commands.executeCommand('turbo-ai-rules.addSource');
          break;

        case 'openTemplates':
          Logger.debug('Webview message received: openTemplates');
          // TODO: 可以打开一个快速选择面板显示所有模板
          notify('Templates feature coming soon!', 'info');
          break;

        case 'selectRules':
          Logger.debug('Webview message received: selectRules', {
            type: messageType,
          });
          // 调用规则选择器命令
          await vscode.commands.executeCommand('turbo-ai-rules.selectRules');
          break;

        case 'syncAndGenerate':
          Logger.debug('Webview message received: syncAndGenerate');
          // 同步并生成配置（一步完成）
          await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
          break;

        case 'openAdvancedOptions':
          Logger.debug('Webview message received: openAdvancedOptions');
          // 打开设置页面
          await vscode.commands.executeCommand(
            'workbench.action.openSettings',
            '@ext:ygqygq2.turbo-ai-rules',
          );
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await this.handleUseTemplate(message.payload?.template || (message as any).template);
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
          Logger.debug('Received dismiss message', { payload: message.payload });
          await this.handleDismiss(message.payload?.checked);
          break;

        case 'updateDontShowAgain':
          Logger.debug('Received updateDontShowAgain message', { payload: message.payload });
          await this.handleUpdateDontShowAgain(message.payload?.checked);
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
   * 发送初始状态到前端
   * VSCode 最佳实践: 响应前端的 ready 消息
   */
  private async sendInitialState(): Promise<void> {
    const welcomeShown = this.context.globalState.get('welcomeShown', false);
    Logger.debug('Send initialState to webview', {
      dontShowAgain: welcomeShown,
    });

    // 发送 welcomeShown 状态
    this.postMessage({
      type: 'initialState',
      payload: { dontShowAgain: welcomeShown },
    });

    // 检查是否有规则源，发送 rulesSelectionState 消息
    const config = vscode.workspace.getConfiguration(CONFIG_PREFIX);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sources = config.get<any[]>(CONFIG_KEYS.SOURCES, []);
    const hasSource = sources.length > 0;

    Logger.debug('Send rulesSelectionState to webview', {
      hasSource,
      sourcesCount: sources.length,
    });

    this.postMessage({
      type: 'rulesSelectionState',
      payload: { enabled: hasSource },
    });
  }

  /**
   * 处理使用模板
   */
  private async handleUseTemplate(templateId: string): Promise<void> {
    const templates: Record<string, { url: string; name: string; branch?: string }> = {
      'ygqygq2-ai-rules': {
        url: 'https://github.com/ygqygq2/ai-rules.git',
        name: "ygqygq2's AI Rules",
        branch: 'main',
      },
    };

    const template = templates[templateId];
    if (!template) {
      notify('Unknown template type', 'error');
      return;
    }

    // 确认添加模板源
    const confirmed = await (notify(
      `Add "${template.name}" template as a rule source?`,
      'info',
      undefined,
      'Add Source',
      true,
    ) as Promise<boolean>);

    if (confirmed) {
      // TODO: 实现自动添加预配置源的逻辑
      // 可以调用 ConfigManager 或命令来添加源
      notify(`Template "${template.name}" will be added. Repository: ${template.url}`, 'info');

      // 这里应该调用添加源的逻辑
      // await configManager.addSource({ gitUrl: template.url, name: template.name, branch: template.branch });
    }
  }

  /**
   * 处理更新"Don't show this again"状态
   * @param checked {boolean} 复选框是否勾选
   */
  private async handleUpdateDontShowAgain(checked?: boolean): Promise<void> {
    Logger.debug('Update dontShowAgain state', { checked });

    if (checked !== undefined) {
      await this.context.globalState.update('welcomeShown', checked);
      Logger.info('WelcomeShown state updated', {
        newState: checked,
      });
    }
  }

  /**
   * 处理关闭欢迎页面
   * @param checked {boolean} 是否勾选了"Don't show this again"
   */
  private async handleDismiss(checked?: boolean): Promise<void> {
    Logger.debug('Dismiss welcome page called', { checked });

    // 只有当用户勾选了"Don't show this again"时才保存状态
    if (checked) {
      await this.context.globalState.update('welcomeShown', true);
      Logger.info('Welcome page dismissed with "Don\'t show this again" checked', {
        newState: true,
      });
      notify(
        "Welcome page dismissed. You can always access it from the command palette ('Turbo AI Rules: Show Welcome').",
        'info',
      );
    } else {
      Logger.info('Welcome page closed without checking "Don\'t show this again"', {
        checked,
        currentState: this.context.globalState.get('welcomeShown', false),
      });
    }
    this.dispose();
  }
}
