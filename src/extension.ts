/**
 * Turbo AI Rules Extension
 * 从外部 Git 仓库同步 AI 编码规则并生成配置文件
 */

import * as vscode from 'vscode';

// Commands
import {
  addSourceCommand,
  generateConfigsCommand,
  manageSourceCommand,
  removeSourceCommand,
  searchRulesCommand,
  syncRulesCommand,
} from './commands';
// Providers
import { RulesTreeProvider, StatusBarProvider } from './providers';
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
        statusBarProvider.setSyncStatus('syncing');
        try {
          await syncRulesCommand(sourceId);
          statusBarProvider.setSyncStatus('success');
          treeProvider.refresh();
        } catch (error) {
          statusBarProvider.setSyncStatus('error');
          throw error;
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

      vscode.commands.registerCommand('turbo-ai-rules.showRuleDetail', async (rule) => {
        // 显示规则详情
        if (rule && rule.title) {
          vscode.window.showInformationMessage(`Rule: ${rule.title}`);
        }
      }),
    ];

    commands.forEach((cmd) => context.subscriptions.push(cmd));

    Logger.info('Commands registered');

    // 4. 启动时同步（如果配置启用）
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

    // 5. 监听配置变化
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('turbo-ai-rules')) {
          Logger.info('Configuration changed, refreshing UI');
          treeProvider.refresh();
        }
      }),
    );

    Logger.info(`${EXTENSION_NAME} activated successfully`);

    vscode.window.showInformationMessage(
      `${EXTENSION_NAME} is ready! Click the status bar to get started.`,
    );
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
