/**
 * 规则同步页 Webview 提供者
 * 提供规则选择和适配器映射的统一界面
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { GitManager } from '../services/GitManager';
import { RulesManager } from '../services/RulesManager';
import type { AdapterConfig, RuleTreeNode } from '../types/config';
import { EXTENSION_ICON_PATH, RULE_FILE_EXTENSIONS } from '../utils/constants';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';
import { normalizeOutputPathForDisplay } from '../utils/path';
import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';

/**
 * 适配器状态（用于前端展示）
 */
interface AdapterState {
  id: string;
  name: string;
  type: 'preset' | 'custom';
  enabled: boolean;
  checked: boolean;
  outputPath: string;
  ruleCount: number;
}

/**
 * 规则同步页提供者
 */
export class RuleSyncPageWebviewProvider extends BaseWebviewProvider {
  private static instance: RuleSyncPageWebviewProvider | undefined;
  private configManager: ConfigManager;
  private rulesManager: RulesManager;
  private gitManager: GitManager;

  private constructor(context: vscode.ExtensionContext) {
    super(context);
    this.configManager = ConfigManager.getInstance(context);
    this.rulesManager = RulesManager.getInstance();
    this.gitManager = GitManager.getInstance();
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
   * @description 处理来自 Webview 的消息
   * @return default {Promise<void>}
   * @param message {WebviewMessage}
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      const messageType = message.type || (message as { command?: string }).command;
      const requestId = (message as { requestId?: string }).requestId;

      Logger.debug('Rule sync page message received', {
        type: messageType,
        requestId,
        payload: message.payload,
      });

      switch (messageType) {
        case 'ready':
          await this.sendInitialData();
          break;

        case 'getInitialData':
          // 处理 RPC 请求
          await this.handleGetInitialData(requestId);
          break;

        case 'sync':
          await this.handleSync(message.payload, requestId);
          break;

        case 'cancel':
          this.panel?.dispose();
          break;

        default:
          Logger.warn('Unknown rule sync page message type', { type: messageType });
      }
    } catch (error) {
      Logger.error('Failed to handle rule sync page message', error as Error, {
        message: message.type,
        code: 'TAI-5018',
      });
      notify(
        `Rule sync operation failed: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      );
    }
  }

  /**
   * @description 处理 getInitialData RPC 请求
   * @return default {Promise<void>}
   * @param requestId {string | undefined}
   */
  private async handleGetInitialData(requestId?: string): Promise<void> {
    try {
      const data = await this.getRuleSyncData();
      this.postMessage({
        type: 'init',
        payload: data,
        ...(requestId && { requestId }),
      } as WebviewMessage & { requestId?: string });
    } catch (error) {
      Logger.error('Failed to get rule sync page initial data', error as Error, {
        code: 'TAI-5019',
      });
      if (requestId) {
        this.postMessage({
          type: 'init',
          payload: { error: error instanceof Error ? error.message : String(error) },
          requestId,
        } as WebviewMessage & { requestId: string; error?: string });
      }
    }
  }

  /**
   * @description 发送初始数据到 Webview
   * @return default {Promise<void>}
   */
  private async sendInitialData(): Promise<void> {
    try {
      const data = await this.getRuleSyncData();
      await this.postMessage({
        type: 'init',
        payload: data,
      });
    } catch (error) {
      Logger.error('Failed to send rule sync page initial data', error as Error, {
        code: 'TAI-5019',
      });
    }
  }

  /**
   * @description 获取规则同步数据
   * @return default {Promise<{ ruleTree: RuleTreeNode[]; adapters: AdapterState[] }>}
   */
  private async getRuleSyncData(): Promise<{
    ruleTree: RuleTreeNode[];
    adapters: AdapterState[];
  }> {
    const config = this.configManager.getConfig();
    const sources = config.sources || [];

    // 构建规则树（所有规则源）
    const ruleTree: RuleTreeNode[] = [];

    for (const source of sources) {
      try {
        const sourcePath = this.gitManager.getSourcePath(source.id);
        const exists = await this.gitManager.repositoryExists(source.id);

        if (!exists) {
          Logger.warn('Source not synced, skipping in rule tree', { sourceId: source.id });
          continue;
        }

        // 获取该源的规则
        const rules = this.rulesManager.getRulesBySource(source.id);
        let totalRules = rules.length;

        // 如果内存中没有，尝试从磁盘加载
        if (totalRules === 0) {
          const MdcParser = (await import('../parsers/MdcParser')).MdcParser;
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

        // 构建该源的文件树
        const sourceNode: RuleTreeNode = {
          type: 'source',
          id: source.id,
          name: source.name || source.gitUrl,
          sourceId: source.id,
          checked: false,
          expanded: true,
          children: await this.buildFileTree(sourcePath, sourcePath, source.id),
          stats: {
            total: totalRules,
            selected: 0,
          },
        };

        ruleTree.push(sourceNode);
      } catch (error) {
        Logger.warn('Failed to load source for rule tree', {
          sourceId: source.id,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 构建适配器列表
    const adapters = await this.getAdapterStates();

    return { ruleTree, adapters };
  }

  /**
   * @description 构建文件树
   * @return default {Promise<RuleTreeNode[]>}
   * @param dirPath {string} 目录路径
   * @param basePath {string} 基础路径
   * @param sourceId {string} 源ID
   */
  private async buildFileTree(
    dirPath: string,
    basePath: string,
    sourceId: string,
  ): Promise<RuleTreeNode[]> {
    const nodes: RuleTreeNode[] = [];

    try {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        const relativePath = path.relative(basePath, fullPath);

        // 跳过隐藏文件和 node_modules
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }

        if (entry.isDirectory()) {
          const children = await this.buildFileTree(fullPath, basePath, sourceId);
          if (children.length > 0) {
            nodes.push({
              type: 'directory',
              id: `${sourceId}:${relativePath}`,
              name: entry.name,
              path: relativePath,
              sourceId,
              checked: false,
              expanded: false,
              children,
            });
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (RULE_FILE_EXTENSIONS.includes(ext)) {
            nodes.push({
              type: 'file',
              id: `${sourceId}:${relativePath}`,
              name: entry.name,
              path: relativePath,
              sourceId,
              checked: false,
            });
          }
        }
      }
    } catch (error) {
      Logger.warn('Failed to build file tree', {
        dirPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return nodes;
  }

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

      adapters.push({
        id: preset.id,
        name: preset.name,
        type: 'preset',
        enabled,
        checked: enabled,
        outputPath,
        ruleCount: 0, // 前端会实时计算
      });
    }

    // 自定义适配器
    const customAdapters = config.adapters.custom || [];
    for (const custom of customAdapters) {
      adapters.push({
        id: custom.id,
        name: custom.name,
        type: 'custom',
        enabled: custom.enabled ?? true,
        checked: custom.enabled ?? true,
        outputPath: normalizeOutputPathForDisplay(custom.outputPath || ''),
        ruleCount: 0,
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
   * @description 处理同步操作
   * @return default {Promise<void>}
   * @param payload {unknown}
   * @param requestId {string | undefined}
   */
  private async handleSync(payload: unknown, requestId?: string): Promise<void> {
    try {
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

      Logger.info('Starting rule sync', {
        ruleCount: rules.length,
        adapterCount: adapters.length,
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

      // 获取所有选中的规则内容
      const selectedRules = [];
      for (const [sourceId, paths] of selectedRulePaths.entries()) {
        const sourcePath = this.gitManager.getSourcePath(sourceId);
        for (const relativePath of paths) {
          const fullPath = path.join(sourcePath, relativePath);
          try {
            const content = await fs.promises.readFile(fullPath, 'utf-8');
            selectedRules.push({
              sourceId,
              path: relativePath,
              content,
            });
          } catch (error) {
            Logger.warn('Failed to read rule file', {
              sourceId,
              path: relativePath,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      // 执行同步到选中的适配器
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        throw new Error('No workspace folder open');
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;

      for (const adapterId of adapters) {
        try {
          await this.syncToAdapter(adapterId, selectedRules, workspaceRoot);
          Logger.info('Synced rules to adapter', { adapterId, ruleCount: selectedRules.length });
        } catch (error) {
          Logger.error('Failed to sync to adapter', error as Error, {
            adapterId,
            code: 'TAI-5020',
          });
        }
      }

      notify(
        `Successfully synced ${selectedRules.length} rules to ${adapters.length} adapters`,
        'info',
      );

      // 发送成功消息到前端
      this.postMessage({
        type: 'syncComplete',
        payload: {
          success: true,
          ruleCount: selectedRules.length,
          adapterCount: adapters.length,
        },
        ...(requestId && { requestId }),
      } as WebviewMessage & { requestId?: string });

      // 关闭 webview
      setTimeout(() => {
        this.panel?.dispose();
      }, 1000);
    } catch (error) {
      Logger.error('Failed to sync rules', error as Error, { code: 'TAI-5021' });
      notify(
        `Failed to sync rules: ${error instanceof Error ? error.message : String(error)}`,
        'error',
      );

      this.postMessage({
        type: 'syncComplete',
        payload: {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        },
        ...(requestId && { requestId }),
      } as WebviewMessage & { requestId?: string });
    }
  }

  /**
   * @description 同步规则到指定适配器
   * @return default {Promise<void>}
   * @param adapterId {string}
   * @param rules {Array<{sourceId: string; path: string; content: string}>}
   * @param workspaceRoot {string}
   */
  private async syncToAdapter(
    adapterId: string,
    rules: Array<{ sourceId: string; path: string; content: string }>,
    workspaceRoot: string,
  ): Promise<void> {
    const config = this.configManager.getConfig();

    // 根据适配器类型选择适配器实例
    let adapter;
    let outputPath = '';

    if (adapterId === 'copilot') {
      const { CopilotAdapter } = await import('../adapters/CopilotAdapter');
      adapter = new CopilotAdapter(config.adapters.copilot?.enabled ?? true);
      outputPath = path.join(workspaceRoot, '.github', 'copilot-instructions.md');
    } else if (adapterId === 'cursor') {
      const { CursorAdapter } = await import('../adapters/CursorAdapter');
      adapter = new CursorAdapter(config.adapters.cursor?.enabled ?? true);
      outputPath = path.join(workspaceRoot, '.cursorrules');
    } else if (adapterId === 'continue') {
      const { ContinueAdapter } = await import('../adapters/ContinueAdapter');
      adapter = new ContinueAdapter(config.adapters.continue?.enabled ?? true);
      outputPath = path.join(workspaceRoot, '.continuerules');
    } else {
      // 自定义适配器
      const customAdapters = config.adapters.custom || [];
      const customConfig = customAdapters.find((a) => a.id === adapterId);
      if (!customConfig) {
        throw new Error(`Custom adapter not found: ${adapterId}`);
      }

      const { CustomAdapter } = await import('../adapters/CustomAdapter');
      adapter = new CustomAdapter(customConfig);
      outputPath = path.join(workspaceRoot, customConfig.outputPath);
    }

    // 使用适配器生成配置文件
    const parsedRules = rules.map((r) => ({
      id: `${r.sourceId}:${r.path}`,
      sourceId: r.sourceId,
      filePath: r.path,
      title: path.basename(r.path, path.extname(r.path)),
      content: r.content,
      rawContent: r.content, // 使用完整内容作为 rawContent
      metadata: {},
    }));

    await adapter.generate(parsedRules);

    Logger.debug('Adapter generated config', { adapterId, outputPath, ruleCount: rules.length });
  }
}
