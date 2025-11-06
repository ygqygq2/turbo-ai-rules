/**
 * 生成配置文件命令
 */

import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { FileGenerator } from '../services/FileGenerator';
import { RulesManager } from '../services/RulesManager';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';

/**
 * 生成配置文件命令处理器
 */
export async function generateConfigsCommand(): Promise<void> {
  Logger.info('Executing generateConfigs command');

  try {
    const configManager = ConfigManager.getInstance();
    const rulesManager = RulesManager.getInstance();
    const fileGenerator = FileGenerator.getInstance();

    // 1. 获取工作区根目录
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      notify('No workspace folder opened', 'error');
      return;
    }

    const workspaceRoot = workspaceFolder.uri.fsPath;

    // 2. 获取配置
    const config = await configManager.getConfig();

    // 3. 获取所有规则
    const allRules = rulesManager.getAllRules();

    if (allRules.length === 0) {
      notify('No rules available. Please sync rules first.', 'info');
      return;
    }

    // 4. 合并规则（解决冲突）
    const mergedRules = rulesManager.mergeRules(config.sync.conflictStrategy || 'priority');

    // 5. 显示进度
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating Config Files',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ message: 'Initializing adapters...' });

        // 初始化适配器
        fileGenerator.initializeAdapters(config.adapters);

        progress.report({ message: 'Generating files...' });

        // 生成配置文件
        const result = await fileGenerator.generateAll(
          mergedRules,
          workspaceRoot,
          config.sync.conflictStrategy || 'priority',
        );

        // 显示结果
        await fileGenerator.showGenerationNotification(result);

        Logger.info('Config files generated', {
          successCount: result.success.length,
          failureCount: result.failures.length,
        });
      },
    );
  } catch (error) {
    Logger.error('Failed to generate configs', error instanceof Error ? error : undefined);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    notify(`Failed to generate configs: ${errorMessage}`, 'error');
  }
}
