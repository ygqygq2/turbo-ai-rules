/**
 * 生成规则文件命令
 */

import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { FileGenerator } from '../services/FileGenerator';
import { RulesManager } from '../services/RulesManager';
import { SelectionStateManager } from '../services/SelectionStateManager';
import { WorkspaceContextManager } from '../services/WorkspaceContextManager';
import type { ParsedRule } from '../types/rules';
import { t } from '../utils/i18n';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';
import { ProgressManager } from '../utils/progressManager';
import { toRelativePath } from '../utils/rulePath';

/**
 * 生成规则文件命令处理器
 */
export async function generateRulesCommand(): Promise<void> {
  Logger.info('Executing generateRules command');

  try {
    const configManager = ConfigManager.getInstance();
    const rulesManager = RulesManager.getInstance();
    const selectionStateManager = SelectionStateManager.getInstance();
    const fileGenerator = FileGenerator.getInstance();

    // 1. 使用 WorkspaceContextManager 获取当前工作空间
    const workspaceContextManager = WorkspaceContextManager.getInstance();
    const workspaceFolder = workspaceContextManager.getCurrentWorkspaceFolder();

    if (!workspaceFolder) {
      notify(t('No workspace folder opened'), 'error');
      return;
    }

    Logger.debug('Using workspace folder for generation', {
      name: workspaceFolder.name,
      path: workspaceFolder.uri.fsPath,
    });

    const workspaceRoot = workspaceFolder.uri.fsPath;

    // 2. 获取配置（传递 workspace folder URI）
    const config = await configManager.getConfig(workspaceFolder.uri);

    // 3. 获取所有规则
    const allRules = rulesManager.getAllRules();

    if (allRules.length === 0) {
      notify(t('No rules available. Please sync rules first.'), 'info');
      return;
    }

    // 4. 根据选择状态过滤规则
    const selectedRules: ParsedRule[] = [];

    for (const rule of allRules) {
      const selectedPaths = selectionStateManager.getSelection(rule.sourceId);

      // 只包含用户主动勾选的规则（空数组 = 全不选）
      // 将 rule.filePath 转为相对路径后比较（SelectionStateManager 存储相对路径）
      const relativeFilePath = toRelativePath(rule.filePath, rule.sourceId);
      const isSelected = selectedPaths.length > 0 && selectedPaths.includes(relativeFilePath);

      Logger.debug('[generateRules] Rule selection check', {
        ruleId: rule.id,
        sourceId: rule.sourceId,
        ruleFilePath: rule.filePath,
        relativeFilePath,
        selectedPathsCount: selectedPaths.length,
        isSelected,
        inSelectedPaths: selectedPaths.includes(relativeFilePath),
        sampleSelectedPaths: selectedPaths.slice(0, 3),
      });

      if (isSelected) {
        selectedRules.push(rule);
      }
    }

    // 允许 0 条规则：表示清空所有规则（用户自定义规则会被保护）
    if (selectedRules.length === 0) {
      Logger.info('No rules selected - will generate empty configurations to clear rules');
    }

    // 5. 合并规则（解决冲突）
    // 直接对选中的规则进行合并，不使用 RulesManager（避免污染全局状态）

    // 按 ID 去重（同一规则可能来自多个源）
    const rulesById = new Map<string, ParsedRule>();
    for (const rule of selectedRules) {
      const existingRule = rulesById.get(rule.id);
      if (!existingRule) {
        rulesById.set(rule.id, rule);
      } else {
        // 使用优先级策略：保留优先级更高的规则
        if (config.sync.conflictStrategy === 'priority') {
          const existingPriority = existingRule.metadata.priority || 'medium';
          const newPriority = rule.metadata.priority || 'medium';
          const priorityOrder: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
          if (priorityOrder[newPriority] > priorityOrder[existingPriority]) {
            rulesById.set(rule.id, rule);
          }
        }
      }
    }

    const mergedRules = Array.from(rulesById.values());

    // 6. 显示进度
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: t('Generating Config Files'),
        cancellable: false,
      },
      async (progress) => {
        const pm = new ProgressManager({ progress, verbose: false });

        pm.report(10, 'Initializing adapters...');

        // 初始化适配器
        fileGenerator.initializeAdapters(config.adapters);

        pm.report(30, 'Generating files...');

        // 生成配置文件（生成配置命令没有所有规则的概念，传入 undefined）
        const result = await fileGenerator.generateAll(
          mergedRules,
          workspaceRoot,
          config.sync.conflictStrategy || 'priority',
          undefined, // targetAdapters
          mergedRules, // 使用合并后的规则作为 allRules
          workspaceFolder.uri, // 传递工作区 URI
        );

        pm.report(50, 'Finalizing...');

        // 显示结果
        await fileGenerator.showGenerationNotification(result);

        Logger.info('Config files generated', {
          successCount: result.success.length,
          failureCount: result.failures.length,
        });

        // 确保进度达到100%
        await pm.ensureComplete('Completed');

        Logger.debug('Progress tracking completed', {
          finalProgress: pm.getCurrentProgress(),
        });
      },
    );
  } catch (error) {
    Logger.error('Failed to generate configs', error instanceof Error ? error : undefined);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    notify(t('Failed to generate configs', errorMessage), 'error');
  }
}
