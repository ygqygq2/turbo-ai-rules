/**
 * 生成配置文件命令
 */

import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { FileGenerator } from '../services/FileGenerator';
import { RulesManager } from '../services/RulesManager';
import { SelectionStateManager } from '../services/SelectionStateManager';
import type { ParsedRule } from '../types/rules';
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
    const selectionStateManager = SelectionStateManager.getInstance();
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

    // 4. 根据选择状态过滤规则
    const selectedRules: ParsedRule[] = [];

    for (const rule of allRules) {
      const selectedPaths = selectionStateManager.getSelection(rule.sourceId);

      // 空数组表示全选
      if (selectedPaths.length === 0 || selectedPaths.includes(rule.filePath)) {
        selectedRules.push(rule);
      }
    }

    Logger.info('Rules filtered by selection for generation', {
      totalRules: allRules.length,
      selectedRules: selectedRules.length,
    });

    if (selectedRules.length === 0) {
      notify('No rules selected. Please select rules first.', 'info');
      return;
    }

    // 5. 合并规则（解决冲突）
    // 创建临时 RulesManager 实例用于合并选中的规则
    const tempRulesManager = new RulesManager();
    const sourceRulesMap = new Map<string, ParsedRule[]>();

    // 按源分组
    for (const rule of selectedRules) {
      const rules = sourceRulesMap.get(rule.sourceId) || [];
      rules.push(rule);
      sourceRulesMap.set(rule.sourceId, rules);
    }

    // 添加到临时管理器
    for (const [sourceId, rules] of sourceRulesMap.entries()) {
      tempRulesManager.addRules(sourceId, rules);
    }

    const mergedRules = tempRulesManager.mergeRules(config.sync.conflictStrategy || 'priority');

    // 6. 显示进度
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Generating Config Files',
        cancellable: false,
      },
      async (progress) => {
        let currentProgress = 0;

        /**
         * @description 报告进度增量并更新当前进度
         * @return default {void}
         * @param increment {number}
         * @param message {string}
         */
        const reportProgress = (increment: number, message?: string) => {
          currentProgress += increment;
          progress.report({
            message,
            increment,
          });
        };

        reportProgress(10, 'Initializing adapters...');

        // 初始化适配器
        fileGenerator.initializeAdapters(config.adapters);

        reportProgress(30, 'Generating files...');

        // 生成配置文件
        const result = await fileGenerator.generateAll(
          mergedRules,
          workspaceRoot,
          config.sync.conflictStrategy || 'priority',
        );

        reportProgress(50, 'Finalizing...');

        // 显示结果
        await fileGenerator.showGenerationNotification(result);

        Logger.info('Config files generated', {
          successCount: result.success.length,
          failureCount: result.failures.length,
        });

        // 确保进度达到100%
        const remaining = 100 - currentProgress;
        if (remaining > 0) {
          reportProgress(remaining, 'Completed');
        }

        Logger.debug('Progress tracking completed', {
          finalProgress: currentProgress + remaining,
        });
      },
    );
  } catch (error) {
    Logger.error('Failed to generate configs', error instanceof Error ? error : undefined);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    notify(`Failed to generate configs: ${errorMessage}`, 'error');
  }
}
