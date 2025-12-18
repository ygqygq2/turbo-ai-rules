/**
 * Dashboard 首页 Webview 提供者
 * 扩展功能中心，提供快速访问和状态概览
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { PRESET_ADAPTERS } from '../adapters';
import { ConfigManager } from '../services/ConfigManager';
import { RulesManager } from '../services/RulesManager';
import { EXTENSION_ICON_PATH } from '../utils/constants';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';
import { normalizeOutputPathForDisplay } from '../utils/path';
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
    /** 规则源列表（简要信息） */
    list: Array<{
      id: string;
      name: string;
      enabled: boolean;
      ruleCount: number;
      lastSync: string | null; // 每个源自己的同步时间
    }>;
  };
  /** 适配器状态列表 */
  adapters: Array<{
    id: string;
    name: string;
    type: 'preset' | 'custom'; // 适配器类型
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
        title: vscode.l10n.t('dashboard.title'),
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
      // 获取编译后的 webview 文件路径
      const htmlPath = path.join(
        this.context.extensionPath,
        'out',
        'webview',
        'src',
        'webview',
        'dashboard',
        'index.html',
      );

      if (!fs.existsSync(htmlPath)) {
        Logger.error('Dashboard HTML template not found', undefined, {
          path: htmlPath,
          code: 'TAI-5002',
        });
        return this.getErrorHtml('Dashboard template not found');
      }

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

        case 'syncAll': {
          // ✅ 快速同步规则：只同步到规则类型适配器（isRuleType !== false）
          const configManager = (
            await import('../services/ConfigManager')
          ).ConfigManager.getInstance();
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          const config = await configManager.getConfig(workspaceFolder?.uri);

          // 获取所有启用的规则类型适配器
          const ruleAdapters: string[] = [];

          // 遍历所有预置适配器（PRESET_ADAPTERS 中定义的）
          for (const presetConfig of PRESET_ADAPTERS) {
            const adapterConfig = (
              config.adapters as Record<
                string,
                { enabled?: boolean; isRuleType?: boolean } | undefined
              >
            )[presetConfig.id];
            const enabled = adapterConfig?.enabled ?? presetConfig.defaultEnabled ?? false;
            const isRuleType = adapterConfig?.isRuleType ?? true; // 默认为 true

            if (enabled && isRuleType) {
              ruleAdapters.push(presetConfig.id);
            }
          }

          // 自定义适配器（只包含 isRuleType !== false 的）
          if (config.adapters?.custom) {
            for (const adapter of config.adapters.custom) {
              const isRuleType = adapter.isRuleType ?? true; // 默认为 true
              if (adapter.enabled && isRuleType) {
                ruleAdapters.push(adapter.id);
              }
            }
          }

          Logger.debug('Quick sync to rule adapters', { ruleAdapters });
          await vscode.commands.executeCommand('turbo-ai-rules.syncRules', {
            targetAdapters: ruleAdapters,
          });
          break;
        }

        case 'addSource':
          await vscode.commands.executeCommand('turbo-ai-rules.addSource');
          break;

        case 'manageSources': {
          // 打开 Source Manager 页面
          const sourceManagerProvider = await import('./SourceManagerWebviewProvider');
          await sourceManagerProvider.SourceManagerWebviewProvider.getInstance(
            this.context,
          ).showSourceManager();
          break;
        }

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

        case 'openRuleTree':
          // 显示侧边栏规则树视图
          await vscode.commands.executeCommand('turbo-ai-rules.rulesView.focus');
          break;

        case 'showWelcome':
          // 显示欢迎页（快速开始）
          await vscode.commands.executeCommand('turbo-ai-rules.showWelcome');
          break;

        case 'generateConfigs':
          // 生成配置文件
          await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
          break;

        case 'openWelcome':
          await vscode.commands.executeCommand('turbo-ai-rules.showWelcome');
          break;

        case 'openRuleFormat':
          await vscode.commands.executeCommand(
            'vscode.open',
            vscode.Uri.parse(
              'https://github.com/ygqygq2/turbo-ai-rules/blob/main/docs/user-guide/03-rule-format.md',
            ),
          );
          break;

        case 'openExamples':
          await vscode.commands.executeCommand(
            'vscode.open',
            vscode.Uri.parse('https://github.com/ygqygq2/ai-rules'),
          );
          break;

        case 'openSettings':
          await vscode.commands.executeCommand(
            'workbench.action.openSettings',
            '@ext:ygqygq2.turbo-ai-rules',
          );
          break;

        case 'openDocs':
          await vscode.commands.executeCommand(
            'vscode.open',
            vscode.Uri.parse(
              'https://github.com/ygqygq2/turbo-ai-rules/blob/main/docs/user-guide/README.md',
            ),
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
      Logger.debug('Dashboard state prepared', {
        adaptersCount: state.adapters.length,
        adapters: state.adapters.map((a) => ({ id: a.id, name: a.name, enabled: a.enabled })),
      });
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

      // 获取WorkspaceStateManager来读取每个源的同步时间
      const { WorkspaceStateManager } = await import('../services/WorkspaceStateManager');
      const stateManager = WorkspaceStateManager.getInstance();

      // 构建规则源列表（简要信息）
      const sourceList = await Promise.all(
        sources.map(async (s) => {
          const sourceRules = allRules.filter((r) => r.sourceId === s.id);
          // 从WorkspaceStateManager获取该源的同步时间（与状态栏保持一致）
          const lastSync = await stateManager.getLastSyncTime(s.id);
          return {
            id: s.id,
            name: s.name || s.id,
            enabled: s.enabled,
            ruleCount: sourceRules.length,
            lastSync: lastSync || null, // 每个源自己的同步时间
          };
        }),
      );

      // 构建适配器状态列表
      const adapters: DashboardState['adapters'] = [];

      // 使用 PRESET_ADAPTERS 动态构建预置适配器列表（与适配器管理页保持一致）
      for (const presetConfig of PRESET_ADAPTERS) {
        // 与 AdapterManagerWebviewProvider 保持一致的逻辑
        const enabled =
          (config.adapters as Record<string, { enabled?: boolean }>)[presetConfig.id]?.enabled ??
          presetConfig.defaultEnabled ??
          false;

        adapters.push({
          id: presetConfig.id,
          name: presetConfig.name,
          type: 'preset',
          enabled,
          ruleCount: enabled ? totalRules : 0, // 未启用的适配器规则数为 0
          outputPath: presetConfig.filePath,
          lastGenerated: null, // TODO: 从工作区状态获取
        });
      }

      // 显示所有自定义适配器（包括已启用和未启用的）
      if (config.adapters.custom) {
        for (const custom of config.adapters.custom) {
          const enabled = custom.enabled ?? false;
          adapters.push({
            id: custom.id,
            name: custom.name,
            type: 'custom',
            enabled,
            ruleCount: enabled ? totalRules : 0, // 未启用的适配器规则数为 0
            outputPath: normalizeOutputPathForDisplay(custom.outputPath),
            lastGenerated: null,
          });
        }
      }

      return {
        sources: {
          enabled: enabledSources.length,
          total: sources.length,
          totalRules,
          list: sourceList,
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
          list: [],
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
