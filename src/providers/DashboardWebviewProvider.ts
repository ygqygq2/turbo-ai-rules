/**
 * Dashboard 首页 Webview 提供者
 * 扩展功能中心，提供快速访问和状态概览
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { RulesManager } from '../services/RulesManager';
import { EXTENSION_ICON_PATH } from '../utils/constants';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';
import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';

/**
 * Dashboard 状态数据
 */
interface DashboardState {
  /** 规则源统计 */
  sources: {
    enabled: number;
    total: number;
    totalRules: number;
    lastSync: string | null;
  };
  /** 适配器状态列表 */
  adapters: Array<{
    id: string;
    name: string;
    enabled: boolean;
    ruleCount: number;
    outputPath: string;
    lastGenerated: string | null;
  }>;
}

/**
 * Dashboard 提供者
 */
export class DashboardWebviewProvider extends BaseWebviewProvider {
  private static instance: DashboardWebviewProvider | undefined;
  private configManager: ConfigManager;
  private rulesManager: RulesManager;

  private constructor(context: vscode.ExtensionContext) {
    super(context);
    this.configManager = ConfigManager.getInstance(context);
    this.rulesManager = RulesManager.getInstance();
  }

  /**
   * @description 获取单例实例
   * @return default {DashboardWebviewProvider}
   * @param context {vscode.ExtensionContext}
   */
  public static getInstance(context: vscode.ExtensionContext): DashboardWebviewProvider {
    if (!DashboardWebviewProvider.instance) {
      DashboardWebviewProvider.instance = new DashboardWebviewProvider(context);
    }
    return DashboardWebviewProvider.instance;
  }

  /**
   * @description 显示 Dashboard
   * @return default {Promise<void>}
   */
  public async showDashboard(): Promise<void> {
    try {
      await this.show({
        viewType: 'turboAiRules.dashboard',
        title: 'Turbo AI Rules - Dashboard',
        viewColumn: vscode.ViewColumn.One,
        iconPath: EXTENSION_ICON_PATH,
      });

      Logger.info('Dashboard webview opened');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error('Failed to show dashboard', error as Error, { code: 'TAI-5001' });
      notify(`Failed to open dashboard: ${errorMessage}`, 'error');
    }
  }

  /**
   * @description 生成 HTML 内容
   * @return default {Promise<string>}
   * @param webview {vscode.Webview}
   */
  protected async getHtmlContent(webview: vscode.Webview): Promise<string> {
    try {
      // 读取设计迭代中的 HTML 文件
      const htmlPath = path.join(
        this.context.extensionPath,
        '.superdesign',
        'design_iterations',
        '12-dashboard_1.html',
      );

      if (!fs.existsSync(htmlPath)) {
        Logger.error('Dashboard HTML template not found', undefined, {
          path: htmlPath,
          code: 'TAI-5002',
        });
        return this.getErrorHtml('Dashboard template not found');
      }

      let html = fs.readFileSync(htmlPath, 'utf-8');

      // 替换 CSP nonce
      const nonce = this.getNonce();
      html = html.replace(/\{\{nonce\}\}/g, nonce);

      // 替换 CSP source
      const cspSource = this.getCspSource(webview);
      html = html.replace(/\{\{cspSource\}\}/g, cspSource);

      return html;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error('Failed to generate dashboard HTML', error as Error, { code: 'TAI-5003' });
      return this.getErrorHtml(`Failed to load dashboard: ${errorMessage}`);
    }
  }

  /**
   * @description 处理来自 Webview 的消息
   * @return default {Promise<void>}
   * @param message {WebviewMessage}
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      const messageType = message.type || (message as { command?: string }).command;
      Logger.debug('Dashboard message received', { type: messageType, payload: message.payload });

      switch (messageType) {
        case 'ready':
          await this.sendInitialState();
          break;

        case 'syncAll':
          await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
          break;

        case 'addSource':
          await vscode.commands.executeCommand('turbo-ai-rules.addSource');
          break;

        case 'manageSources':
          await vscode.commands.executeCommand('turbo-ai-rules.manageSources');
          break;

        case 'searchRules':
          await vscode.commands.executeCommand('turbo-ai-rules.searchRules');
          break;

        case 'manageAdapters':
          await vscode.commands.executeCommand('turbo-ai-rules.manageAdapters');
          break;

        case 'regenerateAll':
          await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
          break;

        case 'openRuleSyncPage':
          await vscode.commands.executeCommand('turbo-ai-rules.openRuleSyncPage');
          break;

        case 'openStatistics':
          await vscode.commands.executeCommand('turbo-ai-rules.showStatistics');
          break;

        case 'openAdvancedSearch':
          await vscode.commands.executeCommand('turbo-ai-rules.advancedSearch');
          break;

        case 'openRuleDetails':
          // TODO: 实现规则详情页
          notify('Rule details feature coming soon', 'info');
          break;

        case 'openRuleTree':
          // 显示侧边栏规则树视图
          await vscode.commands.executeCommand('turbo-ai-rules.rulesView.focus');
          break;

        case 'openWelcome':
          await vscode.commands.executeCommand('turbo-ai-rules.showWelcome');
          break;

        case 'openRuleFormat':
          await vscode.commands.executeCommand(
            'vscode.open',
            vscode.Uri.parse('https://github.com/ygqygq2/turbo-ai-rules#rule-format'),
          );
          break;

        case 'openExamples':
          await vscode.commands.executeCommand(
            'vscode.open',
            vscode.Uri.parse('https://github.com/ygqygq2/turbo-ai-rules-examples'),
          );
          break;

        default:
          Logger.warn('Unknown dashboard message type', { type: messageType });
      }
    } catch (error) {
      Logger.error('Failed to handle dashboard message', error as Error, {
        message: message.type,
        code: 'TAI-5004',
      });
      notify(
        `Dashboard operation failed: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      );
    }
  }

  /**
   * @description 发送初始状态到 Webview
   * @return default {Promise<void>}
   */
  private async sendInitialState(): Promise<void> {
    try {
      const state = await this.getDashboardState();
      await this.postMessage({
        type: 'updateStats',
        payload: state,
      });
    } catch (error) {
      Logger.error('Failed to send dashboard initial state', error as Error, { code: 'TAI-5005' });
    }
  }

  /**
   * @description 获取 Dashboard 状态数据
   * @return default {Promise<DashboardState>}
   */
  private async getDashboardState(): Promise<DashboardState> {
    try {
      const config = this.configManager.getConfig();
      const sources = config.sources || [];
      const enabledSources = sources.filter((s) => s.enabled);

      // 获取所有规则数量
      const allRules = await this.rulesManager.getAllRules();
      const totalRules = allRules.length;

      // 获取最后同步时间
      const lastSyncTimes = enabledSources
        .map((s) => s.lastSync)
        .filter((t): t is string => !!t)
        .sort()
        .reverse();
      const lastSync = lastSyncTimes[0] || null;

      // 构建适配器状态列表
      const adapters: DashboardState['adapters'] = [];

      // 预置适配器
      if (config.adapters.copilot) {
        adapters.push({
          id: 'copilot',
          name: 'GitHub Copilot',
          enabled: config.adapters.copilot.enabled,
          ruleCount: config.adapters.copilot.enabled ? totalRules : 0,
          outputPath: '.github/copilot-instructions.md',
          lastGenerated: null, // TODO: 从工作区状态获取
        });
      }

      if (config.adapters.cursor) {
        adapters.push({
          id: 'cursor',
          name: 'Cursor',
          enabled: config.adapters.cursor.enabled,
          ruleCount: config.adapters.cursor.enabled ? totalRules : 0,
          outputPath: '.cursorrules',
          lastGenerated: null,
        });
      }

      if (config.adapters.continue) {
        adapters.push({
          id: 'continue',
          name: 'Continue',
          enabled: config.adapters.continue.enabled,
          ruleCount: config.adapters.continue.enabled ? totalRules : 0,
          outputPath: '.continuerules',
          lastGenerated: null,
        });
      }

      // 自定义适配器
      if (config.adapters.custom) {
        for (const custom of config.adapters.custom) {
          adapters.push({
            id: custom.id,
            name: custom.name,
            enabled: custom.enabled,
            ruleCount: custom.enabled ? totalRules : 0,
            outputPath: custom.outputPath,
            lastGenerated: null,
          });
        }
      }

      return {
        sources: {
          enabled: enabledSources.length,
          total: sources.length,
          totalRules,
          lastSync,
        },
        adapters,
      };
    } catch (error) {
      Logger.error('Failed to get dashboard state', error as Error, { code: 'TAI-5006' });

      // 返回空状态作为降级
      return {
        sources: {
          enabled: 0,
          total: 0,
          totalRules: 0,
          lastSync: null,
        },
        adapters: [],
      };
    }
  }

  /**
   * @description 生成错误提示 HTML
   * @return default {string}
   * @param errorMessage {string}
   */
  private getErrorHtml(errorMessage: string): string {
    return `
      <!DOCTYPE html>
      <html lang="zh-CN">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Error</title>
          <style>
            body {
              font-family: var(--vscode-font-family);
              color: var(--vscode-foreground);
              background-color: var(--vscode-editor-background);
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
            }
            .error-container {
              text-align: center;
              padding: 2rem;
            }
            .error-icon {
              font-size: 3rem;
              margin-bottom: 1rem;
            }
            .error-message {
              color: var(--vscode-errorForeground);
            }
          </style>
        </head>
        <body>
          <div class="error-container">
            <div class="error-icon">⚠️</div>
            <div class="error-message">${errorMessage}</div>
          </div>
        </body>
      </html>
    `;
  }
}
