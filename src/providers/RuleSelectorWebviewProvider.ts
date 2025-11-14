import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';
import { WorkspaceDataManager } from '../services/WorkspaceDataManager';
import { ConfigManager } from '../services/ConfigManager';
import { GitManager } from '../services/GitManager';
import {
  SelectionChannelManager,
  type SelectionChangeMessage,
} from '../services/SelectionChannelManager';
import type { RuleSelection } from '../services/WorkspaceDataManager';
import { Logger } from '../utils/logger';
import { SystemError } from '../types/errors';
import { createExtensionMessenger, ExtensionMessenger } from './messaging/ExtensionMessenger';
import { RulesManager } from '../services/RulesManager';
import { RULE_FILE_EXTENSIONS } from '../utils/constants';

/**
 * 文件树节点
 */
interface FileTreeNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

/**
 * @description 规则选择器 Webview Provider
 */
export class RuleSelectorWebviewProvider extends BaseWebviewProvider {
  private static instance: RuleSelectorWebviewProvider | undefined;
  private currentSourceId?: string; // 当前选择的源 ID
  private messenger?: ExtensionMessenger; // 新的消息管理器

  private constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  public static getInstance(context: vscode.ExtensionContext): RuleSelectorWebviewProvider {
    if (!RuleSelectorWebviewProvider.instance) {
      RuleSelectorWebviewProvider.instance = new RuleSelectorWebviewProvider(context);
    }
    return RuleSelectorWebviewProvider.instance;
  }

  /**
   * @description 显示规则选择器
   * @param sourceId 可选的源 ID，如果提供则只显示该源的规则
   * @return {Promise<void>}
   */
  public async showRuleSelector(sourceId?: string | any): Promise<void> {
    // 从 TreeItem 提取 sourceId
    const actualSourceId =
      typeof sourceId === 'object' && sourceId?.data?.source?.id
        ? sourceId.data.source.id
        : typeof sourceId === 'string'
        ? sourceId
        : undefined;

    this.currentSourceId = actualSourceId;

    await this.show({
      viewType: 'turboAiRules.ruleSelector',
      title: actualSourceId ? `规则选择器 - ${actualSourceId}` : '规则选择器',
      viewColumn: vscode.ViewColumn.Active,
    });

    // 初始化消息层（仅首次创建 panel 时）
    if (this.panel && !this.messenger) {
      this.messenger = createExtensionMessenger(this.panel.webview);
      this.registerMessageHandlers();

      // 为当前源创建 MessageChannel
      if (actualSourceId) {
        const channelManager = SelectionChannelManager.getInstance();
        channelManager.createChannel(actualSourceId, this.panel.webview);
        Logger.info('MessageChannel created for rule selector', { sourceId: actualSourceId });
      }
    }

    // 打开后尽快发送初始数据（同时也等前端 ready 再发一遍，防止 race）
    await this.loadAndSendInitialData();
  }

  /**
   * @description 递归读取目录树
   * @return {Promise<FileTreeNode[]>}
   * @param dirPath {string}
   * @param basePath {string}
   */
  private async readDirectoryTree(dirPath: string, basePath: string): Promise<FileTreeNode[]> {
    try {
      const entries = await fsPromises.readdir(dirPath, { withFileTypes: true });
      const nodes: FileTreeNode[] = [];

      for (const entry of entries) {
        // 跳过隐藏文件和 .git 目录
        if (entry.name.startsWith('.')) continue;

        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);

        if (entry.isDirectory()) {
          const children = await this.readDirectoryTree(fullPath, basePath);
          nodes.push({
            path: relativePath,
            name: entry.name,
            type: 'directory',
            children,
          });
        } else if (entry.isFile() && RULE_FILE_EXTENSIONS.includes(path.extname(entry.name))) {
          nodes.push({
            path: relativePath,
            name: entry.name,
            type: 'file',
          });
        }
      }

      return nodes.sort((a, b) => {
        // 目录优先，然后按名称排序
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      Logger.error('Failed to read directory tree', error as Error);
      return [];
    }
  }

  /**
   * @description 加载并发送初始数据到 webview
   * @return {Promise<void>}
   */
  private async loadAndSendInitialData(): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        Logger.warn('No workspace folder found when loading initial data');
        this.messenger?.notify('error', { message: '未找到工作区', code: 'TAI-1001' });
        return;
      }

      const workspacePath = workspaceFolders[0].uri.fsPath;
      const dataManager = WorkspaceDataManager.getInstance();
      const configManager = ConfigManager.getInstance(this.context);
      const gitManager = GitManager.getInstance();
      const rulesManager = RulesManager.getInstance();

      // 读取所有规则选择数据
      const selections = await dataManager.readRuleSelections();

      // 获取所有源及其文件树（如果指定了 sourceId，则只加载该源）
      let sources = configManager.getSources();
      if (this.currentSourceId) {
        sources = sources.filter((s) => s.id === this.currentSourceId);
      }

      const fileTreeBySource: Record<string, FileTreeNode[]> = {};
      // 创建源信息数组，包含 id、name 和真实的规则总数
      const sourceList = sources.map((s) => ({
        id: s.id,
        name: s.name || s.gitUrl,
        totalRules: rulesManager.getRulesBySource(s.id).length, // 使用真实的规则数量
      }));

      for (const source of sources) {
        const sourcePath = gitManager.getSourcePath(source.id);
        fileTreeBySource[source.id] = await this.readDirectoryTree(sourcePath, sourcePath);
      }

      // 返回初始数据（供 RPC 请求使用）
      this.messenger?.notify('initialData', {
        workspacePath,
        selections: selections?.selections || {},
        fileTreeBySource,
        sourceList,
        currentSourceId: this.currentSourceId,
      });

      Logger.info('Initial data sent to rule selector webview', {
        sourceCount: sources.length,
        currentSourceId: this.currentSourceId,
      });
    } catch (error) {
      Logger.error('Failed to load initial data', error as Error);
      this.messenger?.notify('error', { message: '加载数据失败', code: 'TAI-5002' });
    }
  }

  protected async getHtmlContent(webview: vscode.Webview): Promise<string> {
    const htmlPath = path.join(
      this.context.extensionPath,
      'out',
      'webview',
      'src',
      'webview',
      'rule-selector',
      'index.html',
    );
    let html = fs.readFileSync(htmlPath, 'utf-8');
    const cspSource = this.getCspSource(webview);
    html = html.replace(/\{\{cspSource\}\}/g, cspSource);
    const htmlDir = path.dirname(htmlPath);
    html = html.replace(/(?:src|href)="([^"]+)"/g, (match, resourcePath) => {
      try {
        let absPath: string;
        if (resourcePath.startsWith('/')) {
          absPath = path.join(
            this.context.extensionPath,
            'out',
            'webview',
            resourcePath.replace(/^\//, ''),
          );
        } else {
          absPath = path.join(htmlDir, resourcePath);
        }
        const webviewUri = webview.asWebviewUri(vscode.Uri.file(absPath));
        return match.replace(resourcePath, webviewUri.toString());
      } catch {
        return match;
      }
    });
    return html;
  }

  protected handleMessage(_message: WebviewMessage): void {
    // 兼容旧消息或兜底（新逻辑走 ExtensionMessenger）
    if (_message.type === 'webviewReady') {
      this.loadAndSendInitialData().catch((err) =>
        Logger.error('Failed to send initial data (legacy path)', err as Error),
      );
    }
    if (_message.type === 'close' && this.panel) {
      this.panel.dispose();
    }
  }

  /**
   * @description 释放资源
   * @return {void}
   */
  public dispose(): void {
    // 关闭 MessageChannel
    if (this.currentSourceId) {
      const channelManager = SelectionChannelManager.getInstance();
      channelManager.closeChannel(this.currentSourceId);
    }
    super.dispose();
  }

  /**
   * @description 注册新的消息处理器
   */
  private registerMessageHandlers(): void {
    if (!this.messenger) return;

    this.messenger.register('getInitialData', async () => {
      // 直接调用内部逻辑并返回数据（通过 initialData 事件推送 + 返回）
      await this.loadAndSendInitialData();
      return { ok: true };
    });

    this.messenger.register<
      {
        sourceId: string;
        selection: { paths: string[] };
        totalCount: number;
      },
      { message: string }
    >('saveRuleSelection', async (payload) => {
      const sourceId = payload?.sourceId;
      const paths = payload?.selection?.paths || [];
      const totalCount = payload?.totalCount || paths.length;
      if (!sourceId) {
        throw new SystemError('缺少 sourceId', 'TAI-1001');
      }
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new SystemError('未找到工作区', 'TAI-1001');
      }
      const workspacePath = workspaceFolders[0].uri.fsPath;
      const dataManager = WorkspaceDataManager.getInstance();
      const channelManager = SelectionChannelManager.getInstance();
      const selection: RuleSelection = { mode: 'include', paths };
      try {
        await dataManager.setRuleSelection(workspacePath, sourceId, selection);
        // 直接通过 MessageChannel 更新并广播
        channelManager.updateMemoryState(sourceId, paths, totalCount, false);
        Logger.info('Rule selection saved via RPC', { sourceId, pathCount: paths.length });
        return { message: '已保存' };
      } catch (error) {
        Logger.error('Failed to save rule selection (RPC)', error as Error, { sourceId });
        throw new SystemError('保存失败，请检查工作区写入权限', 'TAI-5003', error as Error);
      }
    });

    this.messenger.register('close', async () => {
      if (this.panel) this.panel.dispose();
      return { closed: true };
    });

    // 监听 Webview 发送的选择变更通知 (右侧勾选 → Extension)
    this.messenger.register<SelectionChangeMessage, { message: string }>(
      'selectionChanged',
      async (payload) => {
        const sourceId = payload?.sourceId;
        const paths = payload?.selectedPaths || [];
        const totalCount = payload?.totalCount || paths.length;
        if (!sourceId) {
          throw new SystemError('缺少 sourceId', 'TAI-1001');
        }

        const channelManager = SelectionChannelManager.getInstance();

        try {
          // 更新内存状态并触发延时落盘
          channelManager.updateMemoryState(sourceId, paths, totalCount, true);

          Logger.debug('Selection changed from webview', {
            sourceId,
            pathCount: paths.length,
          });
          return { message: '已更新' };
        } catch (error) {
          Logger.error('Failed to handle selection change from webview', error as Error, {
            sourceId,
          });
          throw new SystemError('更新选择失败', 'TAI-5003', error as Error);
        }
      },
    );
  }
}
