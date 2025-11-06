/**
 * Turbo AI Rules Extension
 * 从外部 Git 仓库同步 AI 编码规则并生成配置文件
 */

import * as vscode from 'vscode';

// Commands
import {
  addSourceCommand,
  copyRuleContentCommand,
  editSourceCommand,
  exportRuleCommand,
  generateConfigsCommand,
  ignoreRuleCommand,
  manageSourceCommand,
  refreshGitCacheCommand,
  removeSourceCommand,
  searchRulesCommand,
  syncRulesCommand,
  testConnectionCommand,
  toggleSourceCommand,
  viewSourceDetailCommand,
} from './commands';
// Providers
import {
  RuleDetailsWebviewProvider,
  RulesTreeProvider,
  SearchWebviewProvider,
  SourceDetailWebviewProvider,
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
import { WorkspaceDataManager } from './services/WorkspaceDataManager';
import { WorkspaceStateManager } from './services/WorkspaceStateManager';
import { EXTENSION_NAME } from './utils/constants';
import { Logger } from './utils/logger';
import { notify } from './utils/notifications';

/**
 * 扩展激活入口
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    // 初始化 Logger
    Logger.init();
    Logger.info(`Activating ${EXTENSION_NAME}`);

    // 保存 context 到全局变量供命令使用
    (global as any).extensionContext = context;

    // 1. 初始化服务
    const configManager = ConfigManager.getInstance(context);
    const workspaceStateManager = WorkspaceStateManager.getInstance(context);
    const workspaceDataManager = WorkspaceDataManager.getInstance();
    const _gitManager = GitManager.getInstance();
    const rulesManager = RulesManager.getInstance();
    const _fileGenerator = FileGenerator.getInstance();

    // 初始化工作区数据目录（如果有工作区）
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      await workspaceDataManager.initWorkspace(workspaceRoot);
      Logger.info('Workspace data directory initialized', {
        workspaceHash: workspaceDataManager.getWorkspaceHash(),
      });
    }

    // 清理已删除源的 workspaceState 元数据
    const sources = configManager.getSources();
    const validSourceIds = sources.map((s) => s.id);
    await workspaceStateManager.cleanupDeletedSources(validSourceIds);

    Logger.info('Services initialized');

    // 2. 注册 UI 提供者
    const treeProvider = new RulesTreeProvider(configManager, rulesManager);
    const treeView = vscode.window.createTreeView('turboAiRulesExplorer', {
      treeDataProvider: treeProvider,
      showCollapseAll: true,
    });

    const statusBarProvider = new StatusBarProvider(rulesManager);

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

      vscode.commands.registerCommand('turbo-ai-rules.syncRules', async (sourceId?: any) => {
        // 兼容从 TreeView 上下文菜单触发的调用（会传入 TreeItem 对象）或直接传入字符串 ID
        const actualSourceId =
          typeof sourceId === 'object' && sourceId?.data?.source?.id
            ? sourceId.data.source.id
            : typeof sourceId === 'string'
              ? sourceId
              : undefined;

        await syncRulesCommand(actualSourceId);
        treeProvider.refresh();
      }),

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

      vscode.commands.registerCommand('turbo-ai-rules.searchRules', async () => {
        await searchRulesCommand();
      }),

      vscode.commands.registerCommand('turbo-ai-rules.generateConfigs', async () => {
        await generateConfigsCommand();
      }),

      vscode.commands.registerCommand('turbo-ai-rules.manageSource', async () => {
        await manageSourceCommand();
        treeProvider.refresh();
      }),

      vscode.commands.registerCommand('turbo-ai-rules.showMenu', async () => {
        await statusBarProvider.showMenu();
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
        const sourceId = item?.data?.source?.id;
        await editSourceCommand(sourceId);
        treeProvider.refresh();
      }),

      vscode.commands.registerCommand('turbo-ai-rules.testConnection', async (item) => {
        const sourceId = item?.data?.source?.id;
        await testConnectionCommand(sourceId);
      }),

      vscode.commands.registerCommand('turbo-ai-rules.toggleSource', async (item) => {
        const sourceId = item?.data?.source?.id;
        await toggleSourceCommand(sourceId);
        treeProvider.refresh();
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

      vscode.commands.registerCommand('turbo-ai-rules.selectRules', async () => {
        const ruleSelectorProvider = RuleSelectorWebviewProvider.getInstance(context);
        await ruleSelectorProvider.showRuleSelector();
      }),

      vscode.commands.registerCommand(
        'turbo-ai-rules.viewSourceDetail',
        async (sourceId?: string | any) => {
          const actualSourceId =
            typeof sourceId === 'object' && sourceId?.data?.source?.id
              ? sourceId.data.source.id
              : typeof sourceId === 'string'
                ? sourceId
                : undefined;
          await viewSourceDetailCommand(actualSourceId);
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
      Logger.info('Development mode detected, registering debug commands');
      commands.push(
        vscode.commands.registerCommand('turbo-ai-rules.clearWorkspaceState', async () => {
          await context.workspaceState.update('sources', undefined);
          notify('Workspace state cleared. Reloading window...', 'info');
          await vscode.commands.executeCommand('workbench.action.reloadWindow');
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
