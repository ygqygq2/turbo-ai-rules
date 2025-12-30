/**
 * 适配器管理页 Webview 提供者
 * 管理预置适配器和自定义适配器的配置
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { PRESET_ADAPTERS } from '../adapters';
import { ConfigManager } from '../services/ConfigManager';
import type { CustomAdapterConfig } from '../types/config';
import { EXTENSION_ICON_PATH } from '../utils/constants';
import { t } from '../utils/i18n';
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
  sortBy?: 'id' | 'priority' | 'none';
  sortOrder?: 'asc' | 'desc';
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
  enabled: boolean;
  singleFileTemplate?: string;
  directoryStructure?: {
    filePattern: string;
    pathTemplate: string;
  };
  fileExtensions?: string[];
  organizeBySource?: boolean;
  isNew?: boolean; // 标识是新增还是编辑
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
        title: t('adapterManager.title'),
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

  /**   * @description 获取适配器数据
   * @return default {Promise<AdapterData>}
   */
  private async getAdapterData(): Promise<AdapterData> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    const config = this.configManager.getConfig(workspaceFolder?.uri);

    // 从 PRESET_ADAPTERS 配置动态构建预设适配器列表
    const presetAdapters: PresetAdapterData[] = PRESET_ADAPTERS.map((presetConfig) => {
      const adapterConfig = (
        config.adapters as Record<
          string,
          {
            enabled?: boolean;
            sortBy?: 'id' | 'priority' | 'none';
            sortOrder?: 'asc' | 'desc';
          }
        >
      )[presetConfig.id];
      return {
        id: presetConfig.id,
        name: presetConfig.name,
        description: presetConfig.description || `${presetConfig.name} AI coding assistant`,
        enabled: adapterConfig?.enabled ?? presetConfig.defaultEnabled ?? false,
        outputPath: presetConfig.filePath,
        isRuleType: true, // 所有预设适配器都是规则类型
        sortBy: adapterConfig?.sortBy ?? 'priority',
        sortOrder: adapterConfig?.sortOrder ?? 'asc',
      };
    });

    // 自定义适配器列表
    const customAdapters: CustomAdapterData[] = (config.adapters.custom || []).map((adapter) => ({
      id: adapter.id,
      name: adapter.name,
      outputPath: adapter.outputPath,
      format: adapter.outputType === 'directory' ? 'directory' : 'single-file',
      isRuleType: adapter.isRuleType ?? true, // 默认为规则类型
      enabled: adapter.enabled ?? true, // 默认启用
      fileExtensions: adapter.fileExtensions,
      organizeBySource: adapter.organizeBySource,
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

      // 更新预设适配器状态
      if (data.presetAdapters) {
        const presetAdaptersConfig: Record<
          string,
          {
            enabled?: boolean;
            autoUpdate?: boolean;
            sortBy?: 'id' | 'priority' | 'none';
            sortOrder?: 'asc' | 'desc';
          }
        > = {};
        for (const preset of data.presetAdapters) {
          presetAdaptersConfig[preset.id] = {
            enabled: preset.enabled,
            sortBy: preset.sortBy,
            sortOrder: preset.sortOrder,
          };
        }
        await this.configManager.updatePresetAdapters(presetAdaptersConfig);
      }

      // 更新自定义适配器
      if (data.customAdapters) {
        const customAdapters: CustomAdapterConfig[] = data.customAdapters.map((adapter) => ({
          id: adapter.id,
          name: adapter.name,
          enabled: adapter.enabled ?? true,
          outputPath: adapter.outputPath,
          outputType: adapter.format === 'directory' ? 'directory' : 'file',
          fileExtensions:
            adapter.fileExtensions || adapter.directoryStructure?.filePattern?.split(', ') || [],
          organizeBySource: adapter.organizeBySource ?? false,
          generateIndex: true,
          indexFileName: adapter.directoryStructure?.pathTemplate || 'index.md',
          isRuleType: adapter.isRuleType,
          fileTemplate: adapter.singleFileTemplate,
        }));
        await this.configManager.updateCustomAdapters(customAdapters);
      }

      Logger.info('All adapter configurations saved', { payload });

      // 发送成功消息
      this.postMessage({
        type: 'saveResult',
        payload: { success: true },
      });

      notify(t('adapterManager.saveSuccess'), 'info');

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
    // 验证数据
    const payload = data as { adapter?: CustomAdapterData };
    Logger.debug('handleSaveAdapter received data', { payload });

    if (!payload.adapter || !payload.adapter.id || !payload.adapter.name) {
      throw new Error('Invalid adapter data: missing required fields (id, name)');
    }

    const adapterData = payload.adapter;

    try {
      Logger.debug('Processing adapter data', {
        id: adapterData.id,
        name: adapterData.name,
        format: adapterData.format,
        isRuleType: adapterData.isRuleType,
      });

      // 构建适配器配置
      const adapterConfig: CustomAdapterConfig = {
        id: adapterData.id,
        name: adapterData.name,
        enabled: adapterData.enabled ?? true,
        outputPath: adapterData.outputPath,
        outputType: adapterData.format === 'directory' ? 'directory' : 'file',
        fileExtensions: adapterData.fileExtensions || [],
        organizeBySource: adapterData.organizeBySource ?? true,
        generateIndex: true,
        indexFileName: adapterData.directoryStructure?.pathTemplate || 'index.md',
        isRuleType: adapterData.isRuleType,
        fileTemplate: adapterData.singleFileTemplate,
      };

      // 根据 isNew 标志决定是新增还是更新
      if (adapterData.isNew) {
        // 添加新适配器（会检测重复）
        await this.configManager.addAdapter(adapterConfig);
      } else {
        // 更新现有适配器
        await this.configManager.updateAdapter(adapterData.id, adapterConfig);
      }

      notify(t('adapterManager.adapterSaved', { name: adapterData.name }), 'info');

      // 发送成功消息到 webview（包含 adapter name）
      this.postMessage({
        type: 'saveAdapterResult',
        payload: { success: true, name: adapterData.name },
      });

      // 刷新数据
      await this.sendInitialData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save adapter';

      // 对于预期的业务错误（如重复 ID），使用 warn 级别
      if (errorMessage.includes('already exists')) {
        Logger.warn('Adapter save failed: duplicate ID', {
          adapterId: adapterData.id,
          message: errorMessage,
        });
      } else {
        // 其他非预期错误使用 error 级别
        Logger.error('Failed to save adapter', error as Error, { code: 'TAI-5013' });
      }

      // 发送错误消息到 webview
      this.postMessage({
        type: 'saveAdapterResult',
        payload: {
          success: false,
          message: errorMessage,
        },
      });

      // 不要重新抛出错误，避免被外层 handleMessage 再次捕获
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

      // 显示确认对话框
      const confirmDelete = await vscode.window.showWarningMessage(
        t('adapterManager.confirmDelete'),
        { modal: true },
        t('form.button.delete'),
      );

      if (confirmDelete !== t('form.button.delete')) {
        // 用户取消删除
        return;
      }

      // 获取适配器信息用于通知
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      const config = this.configManager.getConfig(workspaceFolder?.uri);
      const existingAdapter = config.adapters.custom?.find(
        (a) => a.id === identifier || a.name === identifier,
      );

      if (!existingAdapter) {
        throw new Error(`Adapter "${identifier}" not found`);
      }

      // 使用 ConfigManager 删除适配器
      await this.configManager.removeAdapter(existingAdapter.id);

      notify(t('adapterManager.adapterDeleted', { name: existingAdapter.name }), 'info');

      // 刷新数据
      await this.sendInitialData();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 如果错误已经显示过用户提示（包含"排查步骤"），则不再重复显示
      if (!errorMessage.includes('排查步骤')) {
        Logger.error('Failed to delete adapter', error as Error, { code: 'TAI-5014' });

        // 显示简化的错误提示
        vscode.window
          .showErrorMessage(`删除适配器失败: ${errorMessage}`, '查看日志')
          ?.then((action) => {
            if (action === '查看日志') {
              vscode.commands.executeCommand('workbench.action.showErrorLog');
            }
          });
      }

      throw error;
    }
  }
}
