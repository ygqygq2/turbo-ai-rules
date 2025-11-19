import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { GitManager } from '../services/GitManager';
import { RulesManager } from '../services/RulesManager';
import { SelectionStateManager } from '../services/SelectionStateManager';
import type { RuleSelection } from '../services/WorkspaceDataManager';
import { WorkspaceDataManager } from '../services/WorkspaceDataManager';
import { SystemError } from '../types/errors';
import { EXTENSION_ICON_PATH } from '../utils/constants';
import { RULE_FILE_EXTENSIONS } from '../utils/constants';
import { Logger } from '../utils/logger';
import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';
import { createExtensionMessenger, ExtensionMessenger } from './messaging/ExtensionMessenger';

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
  private selectionStateManager: SelectionStateManager;
  private stateChangeDisposable?: () => void;

  private constructor(context: vscode.ExtensionContext) {
    super(context);
    this.selectionStateManager = SelectionStateManager.getInstance();

    // 订阅状态变更事件，自动向 Webview 发送消息
    this.stateChangeDisposable = this.selectionStateManager.onStateChanged((event) => {
      // 只有当 Webview 打开、messenger 已初始化且事件涉及当前源时才推送更新
      if (event.sourceId === this.currentSourceId && this.panel && this.messenger) {
        Logger.debug('Selection state changed, notifying webview', { sourceId: event.sourceId });
        this.messenger.pushEvent('selectionChanged', {
          sourceId: event.sourceId,
          selectedPaths: event.selectedPaths, // 修复字段名：paths -> selectedPaths
          totalCount: event.totalCount,
          timestamp: event.timestamp,
        });
      }
    });
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
  public async showRuleSelector(
    sourceId?: string | { data?: { source?: { id: string } } },
  ): Promise<void> {
    // 从 TreeItem 提取 sourceId
    let actualSourceId =
      typeof sourceId === 'object' && sourceId?.data?.source?.id
        ? sourceId.data.source.id
        : typeof sourceId === 'string'
          ? sourceId
          : undefined;

    // 如果没有指定 sourceId，使用第一个源作为默认值
    if (!actualSourceId) {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const configManager = ConfigManager.getInstance(this.context);
        const sources = configManager.getSources(workspaceFolders[0].uri);
        if (sources.length > 0) {
          actualSourceId = sources[0].id;
          Logger.info('No sourceId specified, using first source as default', {
            sourceId: actualSourceId,
          });
        }
      }
    }

    this.currentSourceId = actualSourceId;

    // 获取源名称用于标题显示
    let sourceName = '';
    if (actualSourceId) {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (workspaceFolders && workspaceFolders.length > 0) {
        const configManager = ConfigManager.getInstance(this.context);
        const source = configManager
          .getSources(workspaceFolders[0].uri)
          .find((s) => s.id === actualSourceId);
        sourceName = source?.name || source?.gitUrl || actualSourceId;
      }
    }

    await this.show({
      viewType: 'turboAiRules.ruleSelector',
      title: sourceName ? `规则选择器 - ${sourceName}` : '规则选择器',
      viewColumn: vscode.ViewColumn.Active,
      iconPath: EXTENSION_ICON_PATH,
    });

    // 初始化消息层（仅首次创建 panel 时）
    if (this.panel && !this.messenger) {
      this.messenger = createExtensionMessenger(this.panel.webview);
      this.registerMessageHandlers();
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
        // 使用绝对路径而不是相对路径，与 ParsedRule.filePath 保持一致
        const absolutePath = fullPath;

        if (entry.isDirectory()) {
          const children = await this.readDirectoryTree(fullPath, basePath);
          nodes.push({
            path: absolutePath,
            name: entry.name,
            type: 'directory',
            children,
          });
        } else if (entry.isFile() && RULE_FILE_EXTENSIONS.includes(path.extname(entry.name))) {
          nodes.push({
            path: absolutePath,
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
        this.messenger?.pushEvent('error', { message: '未找到工作区', code: 'TAI-1001' });
        return;
      }

      const workspacePath = workspaceFolders[0].uri.fsPath;
      const workspaceUri = workspaceFolders[0].uri; // 获取 workspace URI
      const dataManager = WorkspaceDataManager.getInstance();
      const configManager = ConfigManager.getInstance(this.context);
      const gitManager = GitManager.getInstance();
      const _rulesManager = RulesManager.getInstance();

      Logger.debug('Loading initial data for rule selector', {
        workspacePath,
        currentSourceId: this.currentSourceId,
      });

      // 读取所有规则选择数据
      const _selections = await dataManager.readRuleSelections();

      // 获取所有源及其文件树（如果指定了 sourceId，则只加载该源）
      // 传递 workspaceUri 以确保能读取到工作区文件夹级别的配置
      let sources = configManager.getSources(workspaceUri);

      if (this.currentSourceId) {
        sources = sources.filter((s) => s.id === this.currentSourceId);
      }

      const fileTreeBySource: Record<string, FileTreeNode[]> = {};
      const selectionsData: Record<string, RuleSelection> = {};

      // 创建源信息数组，包含 id、name 和真实的规则总数
      const sourceList = [];

      for (const source of sources) {
        try {
          // 从 Git 缓存加载规则（如果内存中没有）
          const rules = await this.loadRulesFromCache(source.id);
          const totalRules = rules.length;

          // 初始化选择状态（从磁盘加载）
          // 初始化选择状态
          const allRulePaths = rules.map((r) => r.filePath).filter((p) => p) as string[];
          await this.selectionStateManager.initializeState(source.id, totalRules, allRulePaths);
          const selectedPaths = this.selectionStateManager.getSelection(source.id);

          // 构建选择数据
          selectionsData[source.id] = {
            mode: 'include',
            paths: selectedPaths,
          };

          sourceList.push({
            id: source.id,
            name: source.name || source.gitUrl,
            totalRules,
          });

          const sourcePath = gitManager.getSourcePath(source.id);
          fileTreeBySource[source.id] = await this.readDirectoryTree(sourcePath, sourcePath);
        } catch (error) {
          // 源未同步，提示用户并跳过该源
          const errorMsg = error instanceof Error ? error.message : '未知错误';
          Logger.warn('Failed to load source for rule selector', {
            sourceId: source.id,
            error: errorMsg,
          });

          // 发送错误消息到前端
          if (this.messenger) {
            this.messenger.pushEvent('error', {
              message: `源 '${source.name || source.id}' 尚未同步，请先同步该源`,
              code: 'TAI-2001',
            });
          }

          // 提示用户同步
          const action = await vscode.window.showWarningMessage(
            `源 '${source.name || source.id}' 尚未同步，是否立即同步？`,
            '立即同步',
            '取消',
          );

          if (action === '立即同步') {
            // 触发同步命令
            await vscode.commands.executeCommand('turbo-ai-rules.syncRules', source.id);
            // 重新加载数据
            await this.loadAndSendInitialData();
          }
          return; // 停止加载其他源
        }
      }

      // 返回初始数据（供 RPC 请求使用）
      if (this.messenger) {
        this.messenger.pushEvent('initialData', {
          workspacePath,
          selections: selectionsData,
          fileTreeBySource,
          sourceList,
          currentSourceId: this.currentSourceId,
        });

        Logger.info('Initial data sent to rule selector webview', {
          sourceCount: sources.length,
          currentSourceId: this.currentSourceId,
        });
      } else {
        Logger.warn('Messenger not initialized, skipping initialData notification');
      }
    } catch (error) {
      Logger.error('Failed to load initial data', error as Error);
      if (this.messenger) {
        this.messenger.pushEvent('error', { message: '加载数据失败', code: 'TAI-5002' });
      }
    }
  }

  /**
   * @description 从 Git 缓存目录加载规则
   * @return {Promise<ParsedRule[]>}
   * @param sourceId {string}
   */
  private async loadRulesFromCache(sourceId: string) {
    const rulesManager = RulesManager.getInstance();
    const gitManager = GitManager.getInstance();

    // 先尝试从 RulesManager 内存中获取
    const rules = rulesManager.getRulesBySource(sourceId);
    if (rules.length > 0) {
      return rules;
    }

    // 如果内存中没有，从 Git 缓存目录解析
    const MdcParser = (await import('../parsers/MdcParser')).MdcParser;
    const parser = new MdcParser();

    const sourcePath = gitManager.getSourcePath(sourceId);
    const exists = await gitManager.repositoryExists(sourceId);

    if (!exists) {
      Logger.info('Repository not synced yet, triggering sync', { sourceId });
      // 仓库未同步，需要先同步
      throw new Error(`Source '${sourceId}' has not been synced yet. Please sync first.`);
    }

    try {
      // 解析规则目录
      const parsedRules = await parser.parseDirectory(sourcePath, sourceId, {
        recursive: true,
        maxDepth: 6,
        maxFiles: 500,
      });

      // 添加到 RulesManager 缓存
      if (parsedRules.length > 0) {
        rulesManager.addRules(sourceId, parsedRules);
      }

      Logger.debug('Rules loaded from cache for selector', { sourceId, count: parsedRules.length });
      return parsedRules;
    } catch (error) {
      Logger.warn('Failed to load rules from cache', { sourceId, error });
      return [];
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
    // 清理事件监听器
    if (this.stateChangeDisposable) {
      this.stateChangeDisposable();
      this.stateChangeDisposable = undefined;
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
      const _totalCount = payload?.totalCount || paths.length;
      if (!sourceId) {
        throw new SystemError('缺少 sourceId', 'TAI-1001');
      }
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new SystemError('未找到工作区', 'TAI-1001');
      }
      const workspacePath = workspaceFolders[0].uri.fsPath;
      const dataManager = WorkspaceDataManager.getInstance();
      const selection: RuleSelection = { mode: 'include', paths };
      try {
        await dataManager.setRuleSelection(workspacePath, sourceId, selection);
        // 通过 SelectionStateManager 更新状态（不延时落盘，因为已经保存到磁盘）
        this.selectionStateManager.updateSelection(sourceId, paths, false);
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
    this.messenger.register<{ sourceId: string; selectedPaths: string[] }, { message: string }>(
      'selectionChanged',
      async (payload) => {
        const sourceId = payload?.sourceId;
        const paths = payload?.selectedPaths || [];
        if (!sourceId) {
          throw new SystemError('缺少 sourceId', 'TAI-1001');
        }

        try {
          // 更新状态并触发延时落盘，会自动通知左侧树视图刷新
          this.selectionStateManager.updateSelection(sourceId, paths, true);

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

    // 监听源切换通知（Webview 切换源时）
    this.messenger.register<
      { sourceId: string; selectedPaths: string[]; totalCount: number },
      { message: string }
    >('sourceChanged', async (payload) => {
      const newSourceId = payload?.sourceId;
      if (!newSourceId) {
        throw new SystemError('缺少 sourceId', 'TAI-1001');
      }

      // 更新当前源 ID
      this.currentSourceId = newSourceId;

      Logger.info('Source switched in webview', { newSourceId });
      return { message: '源已切换' };
    });
  }
}
