/**
 * 适配器管理页 Webview 提供者
 * 管理预置适配器和自定义适配器的配置
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import type { AdapterConfig, CustomAdapterConfig } from '../types/config';
import { EXTENSION_ICON_PATH } from '../utils/constants';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';
import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';

/**
 * 适配器数据（用于前端展示）
 */
interface AdapterData {
  presets: {
    copilot: AdapterConfig & { id: 'copilot'; name: 'GitHub Copilot' };
    cursor: AdapterConfig & { id: 'cursor'; name: 'Cursor' };
    continue: AdapterConfig & { id: 'continue'; name: 'Continue' };
  };
  custom: CustomAdapterConfig[];
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
        title: 'Adapter Manager - Turbo AI Rules',
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
    try {
      const htmlPath = path.join(
        this.context.extensionPath,
        '.superdesign',
        'design_iterations',
        '13-adapter-manager_1.html',
      );

      if (!fs.existsSync(htmlPath)) {
        Logger.error('Adapter manager HTML template not found', undefined, {
          path: htmlPath,
          code: 'TAI-5008',
        });
        return this.getErrorHtml('Adapter manager template not found');
      }

      let html = fs.readFileSync(htmlPath, 'utf-8');

      // 替换占位符
      const nonce = this.getNonce();
      html = html.replace(/\{\{nonce\}\}/g, nonce);

      const cspSource = this.getCspSource(webview);
      html = html.replace(/\{\{cspSource\}\}/g, cspSource);

      return html;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error('Failed to generate adapter manager HTML', error as Error, { code: 'TAI-5009' });
      return this.getErrorHtml(`Failed to load adapter manager: ${errorMessage}`);
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
        `Adapter manager operation failed: ${error instanceof Error ? error.message : String(error)}`,
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

    return {
      presets: {
        copilot: {
          id: 'copilot',
          name: 'GitHub Copilot',
          enabled: config.adapters.copilot?.enabled ?? true,
          autoUpdate: config.adapters.copilot?.autoUpdate ?? true,
          includeMetadata: config.adapters.copilot?.includeMetadata ?? false,
        },
        cursor: {
          id: 'cursor',
          name: 'Cursor',
          enabled: config.adapters.cursor?.enabled ?? true,
          autoUpdate: config.adapters.cursor?.autoUpdate ?? true,
          includeMetadata: config.adapters.cursor?.includeMetadata ?? true,
        },
        continue: {
          id: 'continue',
          name: 'Continue',
          enabled: config.adapters.continue?.enabled ?? false,
          autoUpdate: config.adapters.continue?.autoUpdate ?? true,
          includeMetadata: config.adapters.continue?.includeMetadata ?? false,
        },
      },
      custom: config.adapters.custom || [],
    };
  }

  /**
   * @description 处理保存所有配置
   * @return default {Promise<void>}
   * @param payload {unknown}
   */
  private async handleSaveAll(payload: unknown): Promise<void> {
    try {
      // TODO: 实现保存所有配置的逻辑
      // 从 payload 中提取预置适配器和自定义适配器的配置
      // 更新到 ConfigManager

      Logger.info('Saving all adapter configurations', { payload });
      notify('All adapter configurations saved', 'info');

      // 刷新数据
      await this.sendInitialData();
    } catch (error) {
      Logger.error('Failed to save all adapters', error as Error, { code: 'TAI-5012' });
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
      if (!data || typeof data !== 'object' || !('id' in data) || !('name' in data)) {
        throw new Error('Invalid adapter data: missing required fields (id, name)');
      }

      const adapterData = data as {
        id: string;
        name: string;
        isEdit?: boolean;
        enabled?: boolean;
        autoUpdate?: boolean;
        includeMetadata?: boolean;
        outputPath: string;
        outputType?: 'file' | 'directory';
        fileExtensions?: string[];
        organizeBySource?: boolean;
        generateIndex?: boolean;
        indexFileName?: string;
      };
      const config = this.configManager.getConfig();

      // 检查 ID 是否已存在（编辑模式除外）
      const existingAdapter = config.adapters.custom?.find((a) => a.id === adapterData.id);
      if (existingAdapter && !adapterData.isEdit) {
        throw new Error(`Adapter with ID "${adapterData.id}" already exists`);
      }

      // 构建适配器配置
      const adapterConfig: CustomAdapterConfig = {
        id: adapterData.id,
        name: adapterData.name,
        enabled: adapterData.enabled ?? true,
        autoUpdate: adapterData.autoUpdate ?? true,
        includeMetadata: adapterData.includeMetadata ?? true,
        outputPath: adapterData.outputPath,
        outputType: adapterData.outputType || 'directory',
        fileExtensions: adapterData.fileExtensions || [],
        organizeBySource: adapterData.organizeBySource ?? true,
        generateIndex: adapterData.generateIndex ?? true,
        indexFileName: adapterData.indexFileName || 'index.md',
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

      notify(`Adapter "${adapterData.name}" saved successfully`, 'info');

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
      if (!data || typeof data !== 'object' || !('name' in data)) {
        throw new Error('Invalid delete request: missing adapter name');
      }

      const deleteData = data as { name: string };
      const config = this.configManager.getConfig();
      const customAdapters = config.adapters.custom || [];

      // 找到要删除的适配器
      const index = customAdapters.findIndex(
        (a) => a.name === deleteData.name || a.id === deleteData.name,
      );

      if (index < 0) {
        throw new Error(`Adapter "${deleteData.name}" not found`);
      }

      const deletedAdapter = customAdapters[index];
      customAdapters.splice(index, 1);

      // 保存配置
      await this.configManager.updateConfig('adapters', {
        ...config.adapters,
        custom: customAdapters,
      });

      Logger.info('Custom adapter deleted', { id: deletedAdapter.id });
      notify(`Adapter "${deletedAdapter.name}" deleted successfully`, 'info');

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
