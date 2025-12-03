/**
 * 适配器管理页 Webview 提供者
 * 管理预置适配器和自定义适配器的配置
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import type { CustomAdapterConfig } from '../types/config';
import { EXTENSION_ICON_PATH } from '../utils/constants';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';
import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';

/**
 * 预设适配器数据（用于前端展示）
 */
interface PresetAdapterData {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  outputPath: string;
  isRuleType: boolean;
}

/**
 * 自定义适配器数据（用于前端展示）
 */
interface CustomAdapterData {
  id: string;
  name: string;
  outputPath: string;
  format: 'single-file' | 'directory';
  isRuleType: boolean;
  singleFileTemplate?: string;
  directoryStructure?: {
    filePattern: string;
    pathTemplate: string;
  };
}

/**
 * 适配器数据（用于前端展示）
 */
interface AdapterData {
  presetAdapters: PresetAdapterData[];
  customAdapters: CustomAdapterData[];
}

/**
 * 适配器管理页提供者
 */
export class AdapterManagerWebviewProvider extends BaseWebviewProvider {
  private static instance: AdapterManagerWebviewProvider | undefined;
  private configManager: ConfigManager;

  private constructor(context: vscode.ExtensionContext) {
    super(context);
    this.configManager = ConfigManager.getInstance(context);
  }

  /**
   * @description 获取单例实例
   * @return default {AdapterManagerWebviewProvider}
   * @param context {vscode.ExtensionContext}
   */
  public static getInstance(context: vscode.ExtensionContext): AdapterManagerWebviewProvider {
    if (!AdapterManagerWebviewProvider.instance) {
      AdapterManagerWebviewProvider.instance = new AdapterManagerWebviewProvider(context);
    }
    return AdapterManagerWebviewProvider.instance;
  }

  /**
   * @description 显示适配器管理页
   * @return default {Promise<void>}
   */
  public async showAdapterManager(): Promise<void> {
    try {
      await this.show({
        viewType: 'turboAiRules.adapterManager',
        title: 'Adapter Manager',
        viewColumn: vscode.ViewColumn.One,
        iconPath: EXTENSION_ICON_PATH,
      });

      Logger.info('Adapter manager webview opened');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error('Failed to show adapter manager', error as Error, { code: 'TAI-5007' });
      notify(`Failed to open adapter manager: ${errorMessage}`, 'error');
    }
  }

  /**
   * @description 生成 HTML 内容
   * @return default {Promise<string>}
   * @param webview {vscode.Webview}
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
        'adapter-manager',
        'index.html',
      ),
      path.join(this.context.extensionPath, 'out', 'webview', 'adapter-manager', 'index.html'),
      path.join(this.context.extensionPath, 'out', 'webview', 'adapter-manager.html'),
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
          Logger.warn(`Failed to read candidate html: ${candidate}`, { err: e as Error });
        }
      }
    }

    if (!html) {
      const msg =
        'Adapter Manager webview HTML not found. Please run `npm run build:webview` or start the extension in development mode.';
      Logger.error(msg, undefined, { code: 'TAI-5008', candidates });
      return this.getErrorHtml(msg);
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
   * @description 处理来自 Webview 的消息
   * @return default {Promise<void>}
   * @param message {WebviewMessage}
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      const messageType = message.type || (message as { command?: string }).command;
      Logger.debug('Adapter manager message received', {
        type: messageType,
        payload: message.payload,
      });

      switch (messageType) {
        case 'ready':
          await this.sendInitialData();
          break;

        case 'saveAll':
          await this.handleSaveAll(message.payload);
          break;

        case 'saveAdapter':
          await this.handleSaveAdapter(message.payload);
          break;

        case 'deleteAdapter':
          await this.handleDeleteAdapter(message.payload);
          break;

        case 'cancel':
          this.panel?.dispose();
          break;

        default:
          Logger.warn('Unknown adapter manager message type', { type: messageType });
      }
    } catch (error) {
      Logger.error('Failed to handle adapter manager message', error as Error, {
        message: message.type,
        code: 'TAI-5010',
      });
      notify(
        `Adapter manager operation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        'error',
      );
    }
  }

  /**
   * @description 发送初始数据到 Webview
   * @return default {Promise<void>}
   */
  private async sendInitialData(): Promise<void> {
    try {
      const adapters = await this.getAdapterData();
      await this.postMessage({
        type: 'init',
        payload: adapters,
      });
    } catch (error) {
      Logger.error('Failed to send adapter manager initial data', error as Error, {
        code: 'TAI-5011',
      });
    }
  }

  /**
   * @description 获取适配器数据
   * @return default {Promise<AdapterData>}
   */
  private async getAdapterData(): Promise<AdapterData> {
    const config = this.configManager.getConfig();

    // 预设适配器列表
    const presetAdapters: PresetAdapterData[] = [
      {
        id: 'copilot',
        name: 'GitHub Copilot',
        description: vscode.l10n.t('adapterManager.copilotDesc'),
        enabled: config.adapters.copilot?.enabled ?? true,
        outputPath: '.github/copilot-instructions.md',
        isRuleType: true, // Copilot 是规则类型
      },
      {
        id: 'cursor',
        name: 'Cursor',
        description: vscode.l10n.t('adapterManager.cursorDesc'),
        enabled: config.adapters.cursor?.enabled ?? true,
        outputPath: '.cursor/rules/',
        isRuleType: true, // Cursor 是规则类型
      },
      {
        id: 'continue',
        name: 'Continue',
        description: vscode.l10n.t('adapterManager.continueDesc'),
        enabled: config.adapters.continue?.enabled ?? false,
        outputPath: '.continue/rules/',
        isRuleType: true, // Continue 是规则类型
      },
    ];

    // 自定义适配器列表
    const customAdapters: CustomAdapterData[] = (config.adapters.custom || []).map((adapter) => ({
      id: adapter.id,
      name: adapter.name,
      outputPath: adapter.outputPath,
      format: adapter.outputType === 'directory' ? 'directory' : 'single-file',
      isRuleType: adapter.isRuleType ?? false, // 默认为技能类型
      ...(adapter.outputType === 'file'
        ? { singleFileTemplate: adapter.fileTemplate }
        : {
            directoryStructure: {
              filePattern: adapter.fileExtensions?.join(', ') || '*.md',
              pathTemplate: adapter.indexFileName || 'index.md',
            },
          }),
    }));

    return {
      presetAdapters,
      customAdapters,
    };
  }

  /**
   * @description 处理保存所有配置
   * @return default {Promise<void>}
   * @param payload {unknown}
   */
  private async handleSaveAll(payload: unknown): Promise<void> {
    try {
      const data = payload as {
        presetAdapters?: PresetAdapterData[];
        customAdapters?: CustomAdapterData[];
      };

      const config = this.configManager.getConfig();

      // 更新预设适配器状态
      if (data.presetAdapters) {
        for (const preset of data.presetAdapters) {
          if (preset.id === 'copilot') {
            config.adapters.copilot = {
              enabled: preset.enabled,
              autoUpdate: config.adapters.copilot?.autoUpdate ?? true,
              includeMetadata: config.adapters.copilot?.includeMetadata ?? false,
            };
          } else if (preset.id === 'cursor') {
            config.adapters.cursor = {
              enabled: preset.enabled,
              autoUpdate: config.adapters.cursor?.autoUpdate ?? true,
              includeMetadata: config.adapters.cursor?.includeMetadata ?? true,
            };
          } else if (preset.id === 'continue') {
            config.adapters.continue = {
              enabled: preset.enabled,
              autoUpdate: config.adapters.continue?.autoUpdate ?? true,
              includeMetadata: config.adapters.continue?.includeMetadata ?? false,
            };
          }
        }
      }

      // 更新自定义适配器
      if (data.customAdapters) {
        config.adapters.custom = data.customAdapters.map((adapter) => ({
          id: adapter.id,
          name: adapter.name,
          enabled: true,
          autoUpdate: true,
          includeMetadata: true,
          outputPath: adapter.outputPath,
          outputType: adapter.format === 'directory' ? 'directory' : 'file',
          fileExtensions: adapter.directoryStructure?.filePattern?.split(', ') || [],
          organizeBySource: true,
          generateIndex: true,
          indexFileName: adapter.directoryStructure?.pathTemplate || 'index.md',
          isRuleType: adapter.isRuleType,
          fileTemplate: adapter.singleFileTemplate,
        }));
      }

      // 保存配置
      await this.configManager.updateConfig('adapters', config.adapters);

      Logger.info('All adapter configurations saved', { payload });

      // 发送成功消息
      this.postMessage({
        type: 'saveResult',
        payload: { success: true },
      });

      notify(vscode.l10n.t('adapterManager.saveSuccess'), 'info');

      // 刷新数据
      await this.sendInitialData();
    } catch (error) {
      Logger.error('Failed to save all adapters', error as Error, { code: 'TAI-5012' });

      this.postMessage({
        type: 'saveResult',
        payload: {
          success: false,
          message: error instanceof Error ? error.message : 'Failed to save',
        },
      });

      throw error;
    }
  }

  /**
   * @description 处理保存单个适配器
   * @return default {Promise<void>}
   * @param data {unknown}
   */
  private async handleSaveAdapter(data: unknown): Promise<void> {
    try {
      // 验证数据
      const payload = data as { adapter?: CustomAdapterData };
      if (!payload.adapter || !payload.adapter.id || !payload.adapter.name) {
        throw new Error('Invalid adapter data: missing required fields (id, name)');
      }

      const adapterData = payload.adapter;
      const config = this.configManager.getConfig();

      // 构建适配器配置
      const adapterConfig: CustomAdapterConfig = {
        id: adapterData.id,
        name: adapterData.name,
        enabled: true,
        autoUpdate: true,
        includeMetadata: true,
        outputPath: adapterData.outputPath,
        outputType: adapterData.format === 'directory' ? 'directory' : 'file',
        fileExtensions: adapterData.directoryStructure?.filePattern?.split(', ') || [],
        organizeBySource: true,
        generateIndex: true,
        indexFileName: adapterData.directoryStructure?.pathTemplate || 'index.md',
        isRuleType: adapterData.isRuleType,
        fileTemplate: adapterData.singleFileTemplate,
      };

      // 更新或添加适配器
      const customAdapters = config.adapters.custom || [];
      const index = customAdapters.findIndex((a) => a.id === adapterData.id);

      if (index >= 0) {
        // 更新现有适配器
        customAdapters[index] = adapterConfig;
        Logger.info('Custom adapter updated', { id: adapterData.id });
      } else {
        // 添加新适配器
        customAdapters.push(adapterConfig);
        Logger.info('Custom adapter created', { id: adapterData.id });
      }

      // 保存配置
      await this.configManager.updateConfig('adapters', {
        ...config.adapters,
        custom: customAdapters,
      });

      notify(vscode.l10n.t('adapterManager.adapterSaved', { name: adapterData.name }), 'info');

      // 刷新数据
      await this.sendInitialData();
    } catch (error) {
      Logger.error('Failed to save adapter', error as Error, { code: 'TAI-5013' });
      throw error;
    }
  }

  /**
   * @description 处理删除适配器
   * @return default {Promise<void>}
   * @param data {unknown}
   */
  private async handleDeleteAdapter(data: unknown): Promise<void> {
    try {
      const payload = data as { id?: string; name?: string };
      const identifier = payload.id || payload.name;

      if (!identifier) {
        throw new Error('Invalid delete request: missing adapter id or name');
      }

      const config = this.configManager.getConfig();
      const customAdapters = config.adapters.custom || [];

      // 找到要删除的适配器
      const index = customAdapters.findIndex((a) => a.id === identifier || a.name === identifier);

      if (index < 0) {
        throw new Error(`Adapter "${identifier}" not found`);
      }

      const deletedAdapter = customAdapters[index];
      customAdapters.splice(index, 1);

      // 保存配置
      await this.configManager.updateConfig('adapters', {
        ...config.adapters,
        custom: customAdapters,
      });

      Logger.info('Custom adapter deleted', { id: deletedAdapter.id });
      notify(vscode.l10n.t('adapterManager.adapterDeleted', { name: deletedAdapter.name }), 'info');

      // 刷新数据
      await this.sendInitialData();
    } catch (error) {
      Logger.error('Failed to delete adapter', error as Error, { code: 'TAI-5014' });
      throw error;
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
