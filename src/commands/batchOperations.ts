import * as vscode from 'vscode';

import { RulesManager } from '../services/RulesManager';
import { SelectionStateManager } from '../services/SelectionStateManager';
import { RuleSource } from '../types/config';
import { ParsedRule } from '../types/rules';
import { CONFIG_KEYS, CONFIG_PREFIX } from '../utils/constants';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';

/**
 * 批量禁用规则
 */
export async function batchDisableRulesCommand(rules: ParsedRule[]): Promise<void> {
  if (!rules || rules.length === 0) {
    notify('No rules selected', 'warning');
    return;
  }

  const confirmed = await notify(
    `Disable ${rules.length} rule(s)?`,
    'warning',
    undefined,
    'Disable',
    true,
  );

  if (!confirmed) {
    return;
  }

  try {
    const vsConfig = vscode.workspace.getConfiguration(CONFIG_PREFIX);
    const ignorePatterns = new Set(vsConfig.get<string[]>(CONFIG_KEYS.IGNORE_PATTERNS, []));

    // 添加规则路径到忽略模式
    for (const rule of rules) {
      if (rule.filePath) {
        // 转换为相对路径模式
        const pattern = rule.filePath.replace(/^.*\/rules\//, '');
        ignorePatterns.add(pattern);
      }
    }

    await vsConfig.update(
      'ignorePatterns',
      Array.from(ignorePatterns),
      vscode.ConfigurationTarget.Workspace,
    );

    notify(`Successfully disabled ${rules.length} rule(s)`, 'info');
    Logger.info(`Batch disabled ${rules.length} rules`);
  } catch (error) {
    const message = `Failed to disable rules: ${
      error instanceof Error ? error.message : String(error)
    }`;
    notify(message, 'error');
    Logger.error(message);
  }
}

/**
 * 批量启用规则
 */
export async function batchEnableRulesCommand(rules: ParsedRule[]): Promise<void> {
  if (!rules || rules.length === 0) {
    notify('No rules selected', 'warning');
    return;
  }

  const confirmed = await notify(
    `Enable ${rules.length} rule(s)?`,
    'warning',
    undefined,
    'Enable',
    true,
  );

  if (!confirmed) {
    return;
  }

  try {
    const vsConfig = vscode.workspace.getConfiguration(CONFIG_PREFIX);
    const ignorePatterns = new Set(vsConfig.get<string[]>(CONFIG_KEYS.IGNORE_PATTERNS, []));

    // 从忽略模式中移除规则路径
    for (const rule of rules) {
      if (rule.filePath) {
        const pattern = rule.filePath.replace(/^.*\/rules\//, '');
        ignorePatterns.delete(pattern);
      }
    }

    await vsConfig.update(
      'ignorePatterns',
      Array.from(ignorePatterns),
      vscode.ConfigurationTarget.Workspace,
    );

    notify(`Successfully enabled ${rules.length} rule(s)`, 'info');
    Logger.info(`Batch enabled ${rules.length} rules`);
  } catch (error) {
    const message = `Failed to enable rules: ${
      error instanceof Error ? error.message : String(error)
    }`;
    notify(message, 'error');
    Logger.error(message);
  }
}

/**
 * 批量导出规则
 */
export async function batchExportRulesCommand(rules: ParsedRule[]): Promise<void> {
  if (!rules || rules.length === 0) {
    notify('No rules selected', 'warning');
    return;
  }

  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(`rules-export-${new Date().toISOString().split('T')[0]}.json`),
    filters: { JSON: ['json'] },
  });

  if (!uri) {
    return;
  }

  try {
    const exportData = rules.map((rule) => ({
      name: rule.metadata?.title || 'Untitled',
      filePath: rule.filePath,
      priority: rule.metadata?.priority,
      tags: rule.metadata?.tags,
      description: rule.metadata?.description,
      content: rule.content,
      sourceId: rule.sourceId,
    }));

    await vscode.workspace.fs.writeFile(
      uri,
      Buffer.from(JSON.stringify(exportData, null, 2), 'utf-8'),
    );

    notify(`Exported ${rules.length} rule(s) to ${uri.fsPath}`, 'info');
    Logger.info(`Batch exported ${rules.length} rules to ${uri.fsPath}`);
  } catch (error) {
    const message = `Failed to export rules: ${
      error instanceof Error ? error.message : String(error)
    }`;
    notify(message, 'error');
    Logger.error(message);
  }
}

/**
 * 批量删除规则（从源中移除）
 */
export async function batchDeleteRulesCommand(rules: ParsedRule[]): Promise<void> {
  if (!rules || rules.length === 0) {
    notify('No rules selected', 'warning');
    return;
  }

  const confirmed = await notify(
    `Delete ${rules.length} rule(s) from disk? This action cannot be undone.`,
    'warning',
    undefined,
    'Delete',
    true,
  );

  if (!confirmed) {
    return;
  }

  try {
    let deletedCount = 0;

    for (const rule of rules) {
      if (rule.filePath) {
        try {
          const uri = vscode.Uri.file(rule.filePath);
          await vscode.workspace.fs.delete(uri);
          deletedCount++;
        } catch (error) {
          Logger.warn(`Failed to delete rule ${rule.filePath}: ${error}`);
        }
      }
    }

    if (deletedCount > 0) {
      notify(`Successfully deleted ${deletedCount} rule(s)`, 'info');
      Logger.info(`Batch deleted ${deletedCount} rules`);
    } else {
      notify('No rules were deleted', 'warning');
    }
  } catch (error) {
    const message = `Failed to delete rules: ${
      error instanceof Error ? error.message : String(error)
    }`;
    notify(message, 'error');
    Logger.error(message);
  }
}

/**
 * @description 全选源的所有规则
 * @param source {RuleSource} 规则源
 */
export async function selectAllRulesCommand(source: RuleSource): Promise<void> {
  Logger.info('Executing selectAllRules command', { sourceId: source.id });

  try {
    const rulesManager = RulesManager.getInstance();
    const selectionStateManager = SelectionStateManager.getInstance();

    // 获取该源的所有规则
    const rules = rulesManager.getRulesBySource(source.id);

    if (rules.length === 0) {
      notify('No rules found in this source. Please sync first.', 'info');
      return;
    }

    // 获取所有规则路径
    const allRulePaths = rules.map((r) => r.filePath).filter((p) => p) as string[];

    // 获取工作区路径
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const workspacePath = workspaceFolders?.[0]?.uri.fsPath;

    // 更新选择状态为全选
    selectionStateManager.updateSelection(source.id, allRulePaths, true, workspacePath);

    Logger.debug('All rules selected', {
      sourceId: source.id,
      count: allRulePaths.length,
    });

    notify(`Selected all ${allRulePaths.length} rules from ${source.name || source.id}`, 'info');
  } catch (error) {
    Logger.error('Failed to select all rules', error instanceof Error ? error : undefined);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    notify(`Failed to select all rules: ${errorMessage}`, 'error');
  }
}

/**
 * @description 全不选源的所有规则
 * @param source {RuleSource} 规则源
 */
export async function deselectAllRulesCommand(source: RuleSource): Promise<void> {
  Logger.info('Executing deselectAllRules command', { sourceId: source.id });

  try {
    const selectionStateManager = SelectionStateManager.getInstance();

    // 获取工作区路径
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const workspacePath = workspaceFolders?.[0]?.uri.fsPath;

    // 更新选择状态为全不选（空数组）
    selectionStateManager.updateSelection(source.id, [], true, workspacePath);

    Logger.debug('All rules deselected', { sourceId: source.id });

    notify(`Deselected all rules from ${source.name || source.id}`, 'info');
  } catch (error) {
    Logger.error('Failed to deselect all rules', error instanceof Error ? error : undefined);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    notify(`Failed to deselect all rules: ${errorMessage}`, 'error');
  }
}
