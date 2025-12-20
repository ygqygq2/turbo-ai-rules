import * as vscode from 'vscode';

import { RulesManager } from '../services/RulesManager';
import { SelectionStateManager } from '../services/SelectionStateManager';
import { RuleSource } from '../types/config';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';
import { toRelativePath } from '../utils/rulePath';

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

    // 获取所有规则路径（转为相对路径）
    const allRulePaths = rules
      .map((r) => (r.filePath ? toRelativePath(r.filePath, source.id) : null))
      .filter((p) => p) as string[];

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
