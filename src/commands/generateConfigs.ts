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
import { ProgressManager } from '../utils/progressManager';
import { toRelativePath } from '../utils/rulePath';

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
    // 优先使用活动编辑器所在的 workspace folder，如果没有则使用第一个
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
      notify(vscode.l10n.t('No rules available. Please sync rules first.'), 'info');
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

      Logger.debug('[generateConfigs] Rule selection check', {
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

    Logger.info('Rules filtered by selection for generation', {
      totalRules: allRules.length,
      selectedRules: selectedRules.length,
    });

    // 允许 0 条规则：表示清空所有规则（用户自定义规则会被保护）
    if (selectedRules.length === 0) {
      Logger.info('No rules selected - will generate empty configurations to clear rules');
    }

    // 5. 合并规则（解决冲突）
    // 创建临时 RulesManager 实例用于合并选中的规则
    const tempRulesManager = RulesManager.getInstance();
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
        title: vscode.l10n.t('Generating Config Files'),
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
    notify(vscode.l10n.t('Failed to generate configs', errorMessage), 'error');
  }
}
