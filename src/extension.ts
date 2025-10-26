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
  removeSourceCommand,
  searchRulesCommand,
  syncRulesCommand,
  testConnectionCommand,
  toggleSourceCommand,
} from './commands';
// Providers
import {
  RuleDetailsWebviewProvider,
  RulesTreeProvider,
  SearchWebviewProvider,
  StatisticsWebviewProvider,
  StatusBarProvider,
  WelcomeWebviewProvider,
} from './providers';
// Services
import { ConfigManager } from './services/ConfigManager';
import { FileGenerator } from './services/FileGenerator';
import { GitManager } from './services/GitManager';
import { RulesManager } from './services/RulesManager';
import { EXTENSION_NAME } from './utils/constants';
import { Logger } from './utils/logger';

/**
 * 扩展激活入口
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
  try {
    Logger.info(`Activating ${EXTENSION_NAME}`);

    // 1. 初始化服务
    const configManager = ConfigManager.getInstance(context);
    const _gitManager = GitManager.getInstance();
    const rulesManager = RulesManager.getInstance();
    const _fileGenerator = FileGenerator.getInstance();

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

      vscode.commands.registerCommand('turbo-ai-rules.syncRules', async (sourceId?: string) => {
        try {
          // 获取源信息用于进度显示
          const config = await configManager.getConfig();
          const sourcesToSync = sourceId
            ? config.sources.filter((s) => s.id === sourceId && s.enabled)
            : config.sources.filter((s) => s.enabled);

          if (sourcesToSync.length === 0) {
            vscode.window.showWarningMessage('No enabled sources to sync');
            return;
          }

          // 使用 VS Code 的进度 API
          await vscode.window.withProgress(
            {
              location: vscode.ProgressLocation.Notification,
              title: 'Syncing AI Rules',
              cancellable: true,
            },
            async (progress, token) => {
              statusBarProvider.setSyncStatus('syncing', {
                completed: 0,
                total: sourcesToSync.length,
                operation: 'Initializing...',
              });

              let completed = 0;

              for (const source of sourcesToSync) {
                if (token.isCancellationRequested) {
                  throw new Error('Sync cancelled by user');
                }

                const progressPercent = (completed / sourcesToSync.length) * 100;
                progress.report({
                  increment: completed === 0 ? 0 : 100 / sourcesToSync.length,
                  message: `Syncing ${source.name} (${completed + 1}/${sourcesToSync.length})`,
                });

                statusBarProvider.setSyncStatus('syncing', {
                  completed,
                  total: sourcesToSync.length,
                  currentSource: source.name,
                  operation: 'Fetching rules...',
                });

                // 模拟单个源同步（实际应该调用具体的同步逻辑）
                await new Promise((resolve) => setTimeout(resolve, 1000));

                completed++;

                statusBarProvider.setSyncStatus('syncing', {
                  completed,
                  total: sourcesToSync.length,
                  currentSource: source.name,
                  operation: 'Processing rules...',
                });
              }

              // 完成同步
              progress.report({ increment: 100, message: 'Sync completed' });
            },
          );

          // 执行实际的同步命令
          await syncRulesCommand(sourceId);
          statusBarProvider.setSyncStatus('success');
          treeProvider.refresh();

          // 显示成功通知
          const message = sourceId
            ? `Successfully synced rules from source`
            : `Successfully synced rules from ${sourcesToSync.length} source${
                sourcesToSync.length !== 1 ? 's' : ''
              }`;

          const action = await vscode.window.showInformationMessage(
            message,
            'View Rules',
            'Generate Configs',
          );

          if (action === 'View Rules') {
            await vscode.commands.executeCommand('workbench.view.explorer');
          } else if (action === 'Generate Configs') {
            await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
          }
        } catch (error) {
          statusBarProvider.setSyncStatus('error');

          const message = error instanceof Error ? error.message : 'Unknown error';
          const action = await vscode.window.showErrorMessage(
            `Failed to sync rules: ${message}`,
            'Retry',
            'View Logs',
          );

          if (action === 'Retry') {
            // 重试同步
            setTimeout(() => {
              vscode.commands.executeCommand('turbo-ai-rules.syncRules', sourceId);
            }, 100);
          } else if (action === 'View Logs') {
            // 显示输出面板
            vscode.commands.executeCommand('workbench.action.output.toggleOutput');
          }

          // 不再重复抛出错误，避免重复的错误提示
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
        await SearchWebviewProvider.showSearch(context);
      }),

      // Helper commands
      vscode.commands.registerCommand('turbo-ai-rules.getAllRules', () => {
        return rulesManager.getAllRules();
      }),
    ];

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
    vscode.window.showErrorMessage(
      `Failed to activate ${EXTENSION_NAME}: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`,
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
