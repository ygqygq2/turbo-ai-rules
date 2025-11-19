/**
 * Turbo AI Rules Extension
 * 从外部 Git 仓库同步 AI 编码规则并生成配置文件
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// Commands
import {
  addSourceCommand,
  copyRuleContentCommand,
  debugRulesCommand,
  deselectAllRulesCommand,
  editSourceCommand,
  exportRuleCommand,
  generateConfigsCommand,
  ignoreRuleCommand,
  manageSourceCommand,
  refreshGitCacheCommand,
  removeSourceCommand,
  selectAllRulesCommand,
  syncRulesCommand,
  testConnectionCommand,
  toggleSourceCommand,
  viewSourceDetailCommand,
} from './commands';
import { MdcParser } from './parsers/MdcParser';
import { RulesValidator } from './parsers/RulesValidator';
// Providers
import {
  RuleDetailsWebviewProvider,
  RulesTreeProvider,
  SearchWebviewProvider,
  StatisticsWebviewProvider,
  StatusBarProvider,
  WelcomeWebviewProvider,
} from './providers';
import { RuleSelectorWebviewProvider } from './providers/RuleSelectorWebviewProvider';
// Services
import { ConfigManager } from './services/ConfigManager';
import { FileGenerator } from './services/FileGenerator';
import { GitManager } from './services/GitManager';
import { RulesManager } from './services/RulesManager';
import { SelectionStateManager } from './services/SelectionStateManager';
import { WorkspaceDataManager } from './services/WorkspaceDataManager';
import { WorkspaceStateManager } from './services/WorkspaceStateManager';
import type { RuleSource } from './types/config';
import { EXTENSION_NAME } from './utils/constants';
import { Logger } from './utils/logger';
import { notify } from './utils/notifications';

/**
 * 从缓存目录加载已同步的规则
 */
async function loadRulesFromCache(
  sources: RuleSource[],
  rulesManager: RulesManager,
): Promise<void> {
  const parser = new MdcParser();
  const validator = new RulesValidator();
  const gitManager = GitManager.getInstance();

  let totalLoaded = 0;

  for (const source of sources) {
    try {
      const cacheDir = gitManager.getSourcePath(source.id);
      const rulesPath = path.join(cacheDir, source.subPath || '');

      // 检查缓存目录是否存在
      if (!fs.existsSync(rulesPath)) {
        Logger.debug('Rules cache not found, skipping', {
          sourceId: source.id,
          path: rulesPath,
        });
        continue;
      }

      // 使用 parseDirectory 解析规则
      const parsedRules = await parser.parseDirectory(rulesPath, source.id, {
        recursive: true,
        maxDepth: 6,
        maxFiles: 500,
      });

      // 验证规则
      const validationResults = validator.validateRules(parsedRules);

      // 只保留有效的规则
      const validRules = parsedRules.filter((rule) => {
        const result = validationResults.get(rule.id);
        return result && result.valid;
      });

      if (validRules.length > 0) {
        rulesManager.addRules(source.id, validRules);
        totalLoaded += validRules.length;
        Logger.debug('Rules loaded from cache', {
          sourceId: source.id,
          total: parsedRules.length,
          valid: validRules.length,
        });
      }
    } catch (error) {
      Logger.warn('Failed to load rules from cache', {
        sourceId: source.id,
        error: String(error),
      });
    }
  }

  if (totalLoaded > 0) {
    Logger.info('Rules loaded from cache', { totalRules: totalLoaded });
  }
}

/**
 * 扩展激活入口
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    // 初始化 Logger
    Logger.init();
    Logger.info(`Activating ${EXTENSION_NAME}`);

    // 保存 context 到全局变量供命令使用
    // 将 context 保存到 global，供命令使用
    (global as unknown as { extensionContext: vscode.ExtensionContext }).extensionContext = context;

    // 1. 初始化服务
    const configManager = ConfigManager.getInstance(context);
    const workspaceStateManager = WorkspaceStateManager.getInstance(context);
    const workspaceDataManager = WorkspaceDataManager.getInstance();
    const selectionStateManager = SelectionStateManager.getInstance();
    const _gitManager = GitManager.getInstance();
    const rulesManager = RulesManager.getInstance();
    const _fileGenerator = FileGenerator.getInstance();

    // 初始化工作区数据目录（如果有工作区）
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      await workspaceDataManager.initWorkspace(workspaceRoot);
      Logger.debug('Workspace data directory initialized', {
        workspaceHash: workspaceDataManager.getWorkspaceHash(),
      });
    }

    // 清理已删除源的 workspaceState 元数据
    const sources = configManager.getSources();
    const validSourceIds = sources.map((s) => s.id);
    await workspaceStateManager.cleanupDeletedSources(validSourceIds);

    Logger.info('Services initialized');

    // 2. 从缓存加载已同步的规则
    await loadRulesFromCache(sources, rulesManager);

    // 3. 注册 UI 提供者
    const treeProvider = new RulesTreeProvider(configManager, rulesManager, selectionStateManager);
    const treeView = vscode.window.createTreeView('turboAiRulesExplorer', {
      treeDataProvider: treeProvider,
      showCollapseAll: true,
      manageCheckboxStateManually: true, // 启用手动管理复选框状态
    });

    // 注册复选框变更处理器
    treeView.onDidChangeCheckboxState(async (e) => {
      await treeProvider.handleCheckboxChange(e.items);
    });

    const statusBarProvider = StatusBarProvider.getInstance(rulesManager);

    context.subscriptions.push(treeView, statusBarProvider);

    Logger.info('UI providers registered');

    // 3. 注册命令
    const commands = [
      vscode.commands.registerCommand('turbo-ai-rules.addSource', async () => {
        await addSourceCommand();
        treeProvider.refresh();
      }),

      vscode.commands.registerCommand('turbo-ai-rules.removeSource', async (sourceId?: string) => {
        await removeSourceCommand(sourceId);
        treeProvider.refresh();
      }),

      vscode.commands.registerCommand(
        'turbo-ai-rules.syncRules',
        async (sourceId?: string | { data?: { source?: { id: string } } }) => {
          // 兼容从 TreeView 上下文菜单触发的调用（会传入 TreeItem 对象）或直接传入字符串 ID
          const actualSourceId =
            typeof sourceId === 'object' && sourceId?.data?.source?.id
              ? sourceId.data.source.id
              : typeof sourceId === 'string'
                ? sourceId
                : undefined;

          await syncRulesCommand(actualSourceId);
          treeProvider.refresh();
        },
      ),

      // 重新加载配置：从 settings.json 读取配置并刷新 UI
      vscode.commands.registerCommand('turbo-ai-rules.reloadSettings', async () => {
        try {
          // 强制重新读取配置
          configManager.getConfig();

          // 刷新树视图（显示最新的源列表）
          treeProvider.refresh();

          notify('Settings reloaded successfully', 'info');
          Logger.info('Settings reloaded from configuration');
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          notify(`Failed to reload settings: ${message}`, 'error');
          Logger.error('Failed to reload settings', error instanceof Error ? error : undefined);
        }
      }),

      vscode.commands.registerCommand('turbo-ai-rules.generateConfigs', async () => {
        await generateConfigsCommand();
      }),

      vscode.commands.registerCommand('turbo-ai-rules.manageSource', async () => {
        await manageSourceCommand();
        treeProvider.refresh();
      }),

      vscode.commands.registerCommand('turbo-ai-rules.refresh', () => {
        treeProvider.refresh();
      }),

      vscode.commands.registerCommand('turbo-ai-rules.refreshGitCache', async () => {
        // 刷新前先更新 TreeView，确保使用最新的源配置
        treeProvider.refresh();
        await refreshGitCacheCommand();
        // 刷新后再次更新 TreeView（以防配置变化）
        treeProvider.refresh();
      }),

      vscode.commands.registerCommand('turbo-ai-rules.showRuleDetail', async (item) => {
        const rule = item?.data?.rule;
        if (rule) {
          const detailsProvider = RuleDetailsWebviewProvider.getInstance(context);
          await detailsProvider.showRuleDetails(rule);
        }
      }),

      // Context menu commands
      vscode.commands.registerCommand('turbo-ai-rules.editSource', async (item) => {
        await editSourceCommand(item);
        treeProvider.refresh();
      }),

      vscode.commands.registerCommand('turbo-ai-rules.testConnection', async (item) => {
        await testConnectionCommand(item);
      }),

      vscode.commands.registerCommand('turbo-ai-rules.toggleSource', async (item) => {
        await toggleSourceCommand(item);
        treeProvider.refresh();
      }),

      vscode.commands.registerCommand('turbo-ai-rules.selectAllRules', async (item) => {
        const source = item?.data?.source;
        if (source) {
          await selectAllRulesCommand(source);
          treeProvider.refresh();
        }
      }),

      vscode.commands.registerCommand('turbo-ai-rules.deselectAllRules', async (item) => {
        const source = item?.data?.source;
        if (source) {
          await deselectAllRulesCommand(source);
          treeProvider.refresh();
        }
      }),

      vscode.commands.registerCommand('turbo-ai-rules.copyRuleContent', async (item) => {
        const rule = item?.data?.rule;
        await copyRuleContentCommand(rule);
      }),

      vscode.commands.registerCommand('turbo-ai-rules.exportRule', async (item) => {
        const rule = item?.data?.rule;
        await exportRuleCommand(rule);
      }),

      vscode.commands.registerCommand('turbo-ai-rules.ignoreRule', async (item) => {
        const rule = item?.data?.rule;
        await ignoreRuleCommand(rule);
        treeProvider.refresh();
      }),

      // Webview commands
      vscode.commands.registerCommand('turbo-ai-rules.showWelcome', async () => {
        const welcomeProvider = WelcomeWebviewProvider.getInstance(context);
        await welcomeProvider.showWelcome();
      }),

      vscode.commands.registerCommand('turbo-ai-rules.showStatistics', async () => {
        const statisticsProvider = StatisticsWebviewProvider.getInstance(
          context,
          configManager,
          rulesManager,
        );
        await statisticsProvider.showStatistics();
      }),

      vscode.commands.registerCommand('turbo-ai-rules.advancedSearch', async () => {
        const searchProvider = SearchWebviewProvider.getInstance(context, rulesManager);
        await searchProvider.showSearch();
      }),

      vscode.commands.registerCommand(
        'turbo-ai-rules.selectRules',
        async (item?: string | { data?: { source?: { id: string } } }) => {
          const ruleSelectorProvider = RuleSelectorWebviewProvider.getInstance(context);
          await ruleSelectorProvider.showRuleSelector(item);
        },
      ),

      vscode.commands.registerCommand(
        'turbo-ai-rules.viewSourceDetail',
        async (sourceId?: string | { data?: { source?: { id: string } } }) => {
          await viewSourceDetailCommand(sourceId);
        },
      ),

      // Helper commands
      vscode.commands.registerCommand('turbo-ai-rules.getAllRules', () => {
        return rulesManager.getAllRules();
      }),
    ];

    // Debug command: Clear workspace state (for development only)
    // 通过环境变量控制是否注册调试命令
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.VSCODE_DEBUG_MODE;
    if (isDevelopment) {
      Logger.debug('Development mode detected, registering debug commands');
      commands.push(
        vscode.commands.registerCommand('turbo-ai-rules.clearWorkspaceState', async () => {
          await context.workspaceState.update('sources', undefined);
          notify('Workspace state cleared. Reloading window...', 'info');
          await vscode.commands.executeCommand('workbench.action.reloadWindow');
        }),
        vscode.commands.registerCommand('turbo-ai-rules.debugRules', async () => {
          await debugRulesCommand();
        }),
      );
    }

    commands.forEach((cmd) => context.subscriptions.push(cmd));

    Logger.info('Commands registered');

    // 4. 首次启动显示欢迎页面
    const welcomeShown = context.globalState.get('welcomeShown', false);
    if (!welcomeShown) {
      const welcomeProvider = WelcomeWebviewProvider.getInstance(context);
      await welcomeProvider.showWelcome();
    }

    // 5. 启动时同步（如果配置启用）
    const config = await configManager.getConfig();
    if (config.sync.onStartup && config.sources.length > 0) {
      Logger.info('Starting initial sync');
      // 延迟执行，避免阻塞激活
      setTimeout(async () => {
        try {
          await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
        } catch (error) {
          Logger.error('Initial sync failed', error instanceof Error ? error : undefined);
        }
      }, 2000);
    }

    // 6. 监听配置变化
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('turbo-ai-rules')) {
          Logger.info('Configuration changed, refreshing UI');
          treeProvider.refresh();
        }
      }),
    );

    Logger.info(`${EXTENSION_NAME} activated successfully`);
  } catch (error) {
    Logger.error('Failed to activate extension', error instanceof Error ? error : undefined);
    notify(
      `Failed to activate ${EXTENSION_NAME}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
      'error',
      8000,
    );
    throw error;
  }
}

/**
 * 扩展停用入口
 */
export function deactivate(): void {
  Logger.info(`Deactivating ${EXTENSION_NAME}`);
}
