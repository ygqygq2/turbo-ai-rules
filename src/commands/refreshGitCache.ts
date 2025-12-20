/**
 * @file 刷新 Git 缓存命令
 * @description 对所有已启用的源执行 git pull 更新缓存并重新解析规则
 */

import * as vscode from 'vscode';

import { MdcParser } from '../parsers/MdcParser';
import { RulesValidator } from '../parsers/RulesValidator';
import { ConfigManager } from '../services/ConfigManager';
import { GitManager } from '../services/GitManager';
import { RulesManager } from '../services/RulesManager';
import { SelectionStateManager } from '../services/SelectionStateManager';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';
import { ProgressManager } from '../utils/progressManager';
import { parseAndLoadRules, syncAndParseSource } from '../utils/ruleLoader';

/**
 * @description 刷新 Git 缓存 - 对所有已启用的源执行 git pull 并重新解析规则
 * @return default {Promise<void>}
 */
export async function refreshGitCacheCommand(): Promise<void> {
  Logger.info('Executing refreshGitCache command');

  try {
    const configManager = ConfigManager.getInstance();
    const gitManager = GitManager.getInstance();
    const rulesManager = RulesManager.getInstance();
    const selectionStateManager = SelectionStateManager.getInstance();
    const parser = new MdcParser();
    const validator = new RulesValidator();

    // 1. 获取工作区根目录
    const allWorkspaceFolders = vscode.workspace.workspaceFolders;

    if (!allWorkspaceFolders || allWorkspaceFolders.length === 0) {
      notify(vscode.l10n.t('No workspace folder opened'), 'error');
      return;
    }

    let workspaceFolder = allWorkspaceFolders[0];

    // 尝试获取活动编辑器的 workspace folder
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const activeWorkspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
      if (activeWorkspaceFolder) {
        workspaceFolder = activeWorkspaceFolder;
      }
    }

    // 2. 获取所有已启用的源
    const sources = configManager.getSources(workspaceFolder.uri);
    const enabledSources = sources.filter((s) => s.enabled);

    if (enabledSources.length === 0) {
      notify(vscode.l10n.t('No enabled sources to sync'), 'info');
      Logger.info('No enabled sources found');
      return;
    }

    Logger.info(`Found ${enabledSources.length} enabled sources to refresh`);

    // 3. 显示进度并刷新所有源
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Refreshing Git cache...',
        cancellable: false,
      },
      async (progress) => {
        const pm = new ProgressManager({ progress, verbose: false });
        let successCount = 0;
        let failCount = 0;
        const updatedCount = 0;

        // 计算每个源的进度增量（保留一些空间用于最后的完成步骤）
        const progressPerSource = enabledSources.length > 0 ? 95 / enabledSources.length : 0;

        for (let i = 0; i < enabledSources.length; i++) {
          const source = enabledSources[i];
          const sourceName = source.name || source.id;

          pm.report(
            progressPerSource,
            `Pulling ${sourceName} (${i + 1}/${enabledSources.length})...`,
          );

          try {
            // 使用共享的同步和解析函数（自动处理克隆或拉取）
            const result = await syncAndParseSource(source, gitManager, parser, validator);

            successCount++;
            if (result.total > 0) {
              // 加载规则到 RulesManager
              rulesManager.addRules(source.id, result.rules);

              // 初始化选择状态
              await selectionStateManager.initializeState(source.id, result.rules, []);

              Logger.info('Rules refreshed from cache', {
                sourceId: source.id,
                totalRules: result.total,
                validRules: result.valid,
              });
            }
          } catch (error) {
            failCount++;
            const message = error instanceof Error ? error.message : 'Unknown error';
            Logger.warn(`Failed to refresh cache for source: ${source.id}`, {
              error: message,
            });
          }
        }

        // 确保进度达到100%
        await pm.ensureComplete('Cache refreshed!');

        Logger.info('Git cache refresh completed', {
          total: enabledSources.length,
          success: successCount,
          updated: updatedCount,
          failed: failCount,
        });

        Logger.debug('Progress tracking completed', {
          finalProgress: pm.getCurrentProgress(),
        });

        // 显示结果通知
        if (failCount === 0) {
          if (updatedCount > 0) {
            notify(vscode.l10n.t('Git cache cleared successfully'), 'info');
          } else {
            notify(vscode.l10n.t('No Git cache to clear'), 'info');
          }
        } else {
          notify(vscode.l10n.t('Sync completed with errors'), 'warning');
        }
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    Logger.error('Failed to refresh Git cache', error instanceof Error ? error : undefined, {
      code: 'TAI-2003',
    });
    notify(vscode.l10n.t('Failed to sync rules', message), 'error');
  }
}
