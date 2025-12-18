/**
 * 规则同步页 Webview 提供者
 * 提供规则选择和适配器映射的统一界面
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ConfigManager } from '../../services/ConfigManager';
import { GitManager } from '../../services/GitManager';
import { RulesManager } from '../../services/RulesManager';
import { SelectionStateManager } from '../../services/SelectionStateManager';
import type { AdapterConfig } from '../../types/config';
import { EXTENSION_ICON_PATH } from '../../utils/constants';
import { buildFileTreeFromRules, type FileTreeNode } from '../../utils/fileTreeBuilder';
import { Logger } from '../../utils/logger';
import { notify } from '../../utils/notifications';
import { normalizeOutputPathForDisplay } from '../../utils/path';
import { BaseWebviewProvider, type WebviewMessage } from '../BaseWebviewProvider';
import { createExtensionMessenger, ExtensionMessenger } from '../messaging/ExtensionMessenger';

/**
 * 适配器状态（用于前端展示）
 */
interface AdapterState {
  id: string;
  name: string;
  type: 'preset' | 'custom';
  enabled: boolean;
  checked: boolean;
  selectDisabled: boolean;
  outputPath: string;
  ruleCount: number;
  isRuleType: boolean;
}

/**
 * 规则同步页提供者
 */
export class RuleSyncPageWebviewProvider extends BaseWebviewProvider {
  private static instance: RuleSyncPageWebviewProvider | undefined;
  private configManager: ConfigManager;
  private rulesManager: RulesManager;
  private gitManager: GitManager;
  private selectionStateManager: SelectionStateManager;
  private messenger?: ExtensionMessenger; // ✅ 新增消息管理器
  private stateChangeDisposable?: () => void;

  private constructor(context: vscode.ExtensionContext) {
    super(context);
    this.configManager = ConfigManager.getInstance(context);
    this.rulesManager = RulesManager.getInstance();
    this.gitManager = GitManager.getInstance();
    this.selectionStateManager = SelectionStateManager.getInstance();

    // ✅ 订阅状态变更事件，自动向 Webview 发送消息（使用 ExtensionMessenger）
    this.stateChangeDisposable = this.selectionStateManager.onStateChanged((event) => {
      // 规则同步页监听所有源的变化（与规则选择器不同，规则选择器只监听当前源）
      if (this.panel && this.messenger) {
        Logger.debug('Selection state changed, notifying rule sync page', {
          sourceId: event.sourceId,
          selectedCount: event.selectedPaths.length,
        });
        // ✅ 使用 messenger.pushEvent（与规则选择器保持一致）
        this.messenger.pushEvent('selectionChanged', {
          sourceId: event.sourceId,
          selectedPaths: event.selectedPaths,
          totalCount: event.totalCount,
          timestamp: event.timestamp,
        });
      }
    });
  }

  /**
   * @description 获取单例实例
   * @return default {RuleSyncPageWebviewProvider}
   * @param context {vscode.ExtensionContext}
   */
  public static getInstance(context: vscode.ExtensionContext): RuleSyncPageWebviewProvider {
    if (!RuleSyncPageWebviewProvider.instance) {
      RuleSyncPageWebviewProvider.instance = new RuleSyncPageWebviewProvider(context);
    }
    return RuleSyncPageWebviewProvider.instance;
  }

  /**
   * @description 清理资源
   * @return default {void}
   */
  public dispose(): void {
    if (this.stateChangeDisposable) {
      this.stateChangeDisposable();
      this.stateChangeDisposable = undefined;
    }
    super.dispose();
  }

  /**
   * @description 显示规则同步页
   * @return default {Promise<void>}
   */
  public async showRuleSyncPage(): Promise<void> {
    try {
      await this.show({
        viewType: 'turboAiRules.ruleSyncPage',
        title: vscode.l10n.t('dashboard.quickActions.ruleSyncPage'),
        viewColumn: vscode.ViewColumn.One,
        iconPath: EXTENSION_ICON_PATH,
      });

      // ✅ 初始化消息层（仅首次创建 panel 时）
      if (this.panel && !this.messenger) {
        this.messenger = createExtensionMessenger(this.panel.webview);
        this.registerMessageHandlers();
      }

      Logger.info('Rule sync page webview opened');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      Logger.error('Failed to show rule sync page', error as Error, { code: 'TAI-5015' });
      notify(`Failed to open rule sync page: ${errorMessage}`, 'error');
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
        'rule-sync-page',
        'index.html',
      );

      if (!fs.existsSync(htmlPath)) {
        Logger.error('Rule sync page HTML template not found', undefined, {
          path: htmlPath,
          code: 'TAI-5016',
        });
        return this.getErrorHtml('Rule sync page template not found');
      }

      // 读取 HTML 文件
      let html = fs.readFileSync(htmlPath, 'utf-8');

      // 替换 CSP 占位符
      const cspSource = this.getCspSource(webview);
      html = html.replace(/\{\{cspSource\}\}/g, cspSource);

      // 转换资源路径为 webview URI
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
      Logger.error('Failed to generate rule sync page HTML', error as Error, { code: 'TAI-5017' });
      return this.getErrorHtml(`Failed to load rule sync page: ${errorMessage}`);
    }
  }

  /**
   * @description 获取错误 HTML
   * @return default {string}
   * @param message {string}
   */
  private getErrorHtml(message: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Error</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    .error {
      color: var(--vscode-errorForeground);
      padding: 10px;
      border: 1px solid var(--vscode-inputValidation-errorBorder);
      background: var(--vscode-inputValidation-errorBackground);
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="error">
    <h2>Error</h2>
    <p>${message}</p>
  </div>
</body>
</html>`;
  }

  /**
   * @description 注册 RPC 消息处理器（与规则选择器保持一致）
   */
  private registerMessageHandlers(): void {
    if (!this.messenger) return;

    // ✅ 处理 getInitialData RPC 请求
    this.messenger.register('getInitialData', async () => {
      return await this.getRuleSyncData();
    });

    // ✅ 处理选择变更通知
    this.messenger.register<{ sourceId?: string; selectedPaths?: string[] }, { message: string }>(
      'selectionChanged',
      async (payload) => {
        const sourceId = payload?.sourceId;
        const paths = payload?.selectedPaths || [];

        if (!sourceId) {
          Logger.warn('Selection changed without sourceId');
          return { message: 'Missing sourceId' };
        }

        try {
          const workspaceFolders = vscode.workspace.workspaceFolders;
          const workspacePath = workspaceFolders?.[0]?.uri.fsPath;

          // 更新状态并触发延时落盘，会自动通知其他页面刷新
          this.selectionStateManager.updateSelection(sourceId, paths, true, workspacePath);

          Logger.debug('Selection changed from rule sync page', {
            sourceId,
            pathCount: paths.length,
          });

          return { message: 'Selection updated' };
        } catch (error) {
          Logger.error('Failed to handle selection change from rule sync page', error as Error, {
            sourceId,
          });
          throw error;
        }
      },
    );

    // ✅ 处理同步请求
    this.messenger.register<
      { data?: { rules?: string[]; adapters?: string[] } },
      { success: boolean; ruleCount?: number; adapterCount?: number; error?: string }
    >('sync', async (payload) => {
      try {
        await this.handleSyncInternal(payload);
        return { success: true };
      } catch (error) {
        Logger.error('Failed to sync rules', error as Error, { code: 'TAI-5021' });
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    });

    // ✅ 处理取消/关闭
    this.messenger.register('close', async () => {
      if (this.panel) this.panel.dispose();
      return { closed: true };
    });
  }

  /**
   * @description 兼容旧消息协议（如果前端还在使用 postMessage）
   * @return default {Promise<void>}
   * @param message {WebviewMessage}
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    // ✅ 兼容旧的 ready 消息（如果需要）
    if (message.type === 'ready') {
      Logger.debug('Legacy ready message received, sending initial data');
      const data = await this.getRuleSyncData();
      await this.postMessage({ type: 'init', payload: data });
    }
  }

  /**
   * @description 获取规则同步数据（✅ 与规则选择器保持一致的数据格式）
   * @return default {Promise<{ sources: SourceData[]; adapters: AdapterState[] }>}
   */
  private async getRuleSyncData(): Promise<{
    sources: Array<{
      id: string;
      name: string;
      fileTree: FileTreeNode[]; // ✅ 纯树结构
      selectedPaths: string[]; // ✅ 选中路径数组
      stats: { total: number; selected: number };
    }>;
    adapters: AdapterState[];
  }> {
    const config = this.configManager.getConfig();
    const allSources = config.sources || [];

    // 构建规则数据（所有规则源，与规则选择器格式一致）
    const sources: Array<{
      id: string;
      name: string;
      fileTree: FileTreeNode[];
      selectedPaths: string[];
      stats: { total: number; selected: number };
    }> = [];

    for (const source of allSources) {
      try {
        // ✅ 使用源根目录路径（与左侧树视图和规则选择器保持一致）
        const sourcePath = this.gitManager.getSourcePath(source.id);
        const exists = await this.gitManager.repositoryExists(source.id);

        if (!exists) {
          Logger.warn('Source not synced, skipping in rule tree', { sourceId: source.id });
          continue;
        }

        // 获取该源的规则
        const rules = this.rulesManager.getRulesBySource(source.id);
        let totalRules = rules.length;

        // 如果内存中没有，尝试从磁盘加载（使用 sourcePath 扫描）
        if (totalRules === 0) {
          const MdcParser = (await import('../../parsers/MdcParser')).MdcParser;
          const parser = new MdcParser();
          const parsedRules = await parser.parseDirectory(sourcePath, source.id, {
            recursive: true,
            maxDepth: 6,
            maxFiles: 500,
          });
          totalRules = parsedRules.length;
          if (parsedRules.length > 0) {
            this.rulesManager.addRules(source.id, parsedRules);
          }
        }

        // 获取该源的已选规则路径（已经是相对路径）
        const selectedPaths = this.selectionStateManager.getSelection(source.id);

        Logger.debug(
          `[getRuleSyncData] Source ${source.id}: ${selectedPaths.length} selected paths`,
          {
            sourceId: source.id,
            sourcePath,
            samplePaths: selectedPaths.slice(0, 3),
          },
        );

        // ✅ 从规则构建文件树（使用源根目录路径，与左侧树和规则选择器一致）
        const fileTree = buildFileTreeFromRules(rules, sourcePath);

        // ✅ 直接返回 FileTreeNode 和 selectedPaths，不转换为 RuleTreeNode
        sources.push({
          id: source.id,
          name: source.name || source.gitUrl,
          fileTree, // ✅ 纯树结构
          selectedPaths, // ✅ 选中路径数组
          stats: {
            total: totalRules,
            selected: selectedPaths.length,
          },
        });

        Logger.debug(
          `[getRuleSyncData] Source ${source.id}: ${selectedPaths.length}/${totalRules} selected`,
        );
      } catch (error) {
        Logger.warn('Failed to load source for rule tree', {
          sourceId: source.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 构建适配器列表
    const adapters = await this.getAdapterStates();

    return { sources, adapters };
  }

  // ✅ 不再需要转换方法，直接使用 FileTreeNode 和 selectedPaths 数组

  /**
   * @description 获取适配器状态列表
   * @return default {Promise<AdapterState[]>}
   */
  private async getAdapterStates(): Promise<AdapterState[]> {
    const config = this.configManager.getConfig();
    const adapters: AdapterState[] = [];

    // 预置适配器
    const presetAdapters: Array<{
      id: string;
      name: string;
      config: AdapterConfig | undefined;
    }> = [
      { id: 'copilot', name: 'GitHub Copilot', config: config.adapters.copilot },
      { id: 'cursor', name: 'Cursor', config: config.adapters.cursor },
      { id: 'continue', name: 'Continue', config: config.adapters.continue },
    ];

    for (const preset of presetAdapters) {
      const enabled = preset.config?.enabled ?? true;
      const outputPath = this.getAdapterOutputPath(preset.id);
      const isRuleType = preset.config?.isRuleType ?? true;

      adapters.push({
        id: preset.id,
        name: preset.name,
        type: 'preset',
        enabled,
        checked: false, // 默认不选中任何适配器
        selectDisabled: false, // 初始状态可选
        outputPath,
        ruleCount: 0, // 前端会实时计算
        isRuleType,
      });
    }

    // 自定义适配器
    const customAdapters = config.adapters.custom || [];
    for (const custom of customAdapters) {
      const isRuleType = custom.isRuleType ?? true;

      adapters.push({
        id: custom.id,
        name: custom.name,
        type: 'custom',
        enabled: custom.enabled ?? true,
        checked: false, // 默认不选中任何适配器
        selectDisabled: false, // 初始状态可选
        outputPath: normalizeOutputPathForDisplay(custom.outputPath || ''),
        ruleCount: 0,
        isRuleType,
      });
    }

    return adapters;
  }

  /**
   * @description 获取适配器输出路径（相对于工作区根目录）
   * @return default {string} 相对路径，目录以/结尾，文件不以/结尾，不以/开头
   * @param adapterId {string}
   */
  private getAdapterOutputPath(adapterId: string): string {
    switch (adapterId) {
      case 'copilot':
        return '.github/copilot-instructions.md';
      case 'cursor':
        return '.cursorrules';
      case 'continue':
        return '.continuerules';
      default:
        return '';
    }
  }

  /**
   * @description 同步操作的内部实现（供 RPC 调用）
   * @return default {Promise<{ ruleCount: number; adapterCount: number }>}
   * @param payload {unknown}
   */
  private async handleSyncInternal(
    payload: unknown,
  ): Promise<{ ruleCount: number; adapterCount: number }> {
    let syncData: { rules: string[]; adapters: string[] };

    if (typeof payload === 'object' && payload !== null) {
      syncData =
        'data' in payload
          ? (payload as { data: { rules: string[]; adapters: string[] } }).data
          : (payload as { rules: string[]; adapters: string[] });
    } else {
      throw new Error('Invalid sync payload format');
    }

    const { rules, adapters } = syncData;

    if (!rules || !adapters || !Array.isArray(rules) || !Array.isArray(adapters)) {
      throw new Error('Invalid sync payload: missing or invalid rules/adapters array');
    }

    Logger.info('Starting rule sync from webview', {
      ruleCount: rules.length,
      adapterCount: adapters.length,
      selectedAdapters: adapters,
    });

    // 解析选中的规则路径
    const selectedRulePaths: Map<string, string[]> = new Map();
    for (const ruleId of rules) {
      const [sourceId, ...pathParts] = ruleId.split(':');
      const relativePath = pathParts.join(':');

      if (!selectedRulePaths.has(sourceId)) {
        selectedRulePaths.set(sourceId, []);
      }
      selectedRulePaths.get(sourceId)!.push(relativePath);
    }

    // 更新所有规则源的选择状态
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      throw new Error('No workspace folder open');
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // 获取所有启用的规则源
    const allSources = this.configManager.getSources(workspaceFolders[0].uri);
    const enabledSources = allSources.filter((s: { enabled: boolean }) => s.enabled);

    // 更新每个启用源的选择状态
    for (const source of enabledSources) {
      const selectedPaths = selectedRulePaths.get(source.id) || [];
      this.selectionStateManager.updateSelection(
        source.id,
        selectedPaths,
        true, // 立即安排持久化
        workspaceRoot,
      );
      Logger.debug('Updated selection state from sync page', {
        sourceId: source.id,
        selectedCount: selectedPaths.length,
      });
    }

    // ✅ 修复：直接传递目标适配器列表给 syncRules 命令
    // 导入 syncRulesCommand 的选项类型
    const { syncRulesCommand } = await import('../../commands/syncRules');
    await syncRulesCommand({ targetAdapters: adapters });

    // 获取实际同步的规则数量
    let totalSelectedRules = 0;
    for (const source of enabledSources) {
      const selectedPaths = this.selectionStateManager.getSelection(source.id);
      totalSelectedRules += selectedPaths.length;
    }

    notify(
      `Successfully synced ${totalSelectedRules} rules to ${adapters.length} adapters`,
      'info',
    );

    // ✅ 使用 messenger 推送事件通知前端
    if (this.messenger) {
      this.messenger.pushEvent('syncComplete', {
        success: true,
        ruleCount: totalSelectedRules,
        adapterCount: adapters.length,
      });
    }

    return {
      ruleCount: totalSelectedRules,
      adapterCount: adapters.length,
    };
  }
}
