/**
 * 集成测试辅助函数
 * 用于初始化测试环境和状态
 */

import * as vscode from 'vscode';

import { RulesManager } from '../../services/RulesManager';
import { SelectionStateManager } from '../../services/SelectionStateManager';

/**
 * @description 为测试源初始化选择状态（全选所有规则）
 * 这是为了确保在 CI 环境中测试能够正常运行，因为默认情况下新源是全不选的
 * @param sourceId {string} 规则源 ID
 * @return {Promise<void>}
 */
export async function initializeTestSourceSelection(sourceId: string): Promise<void> {
  const rulesManager = RulesManager.getInstance();
  const selectionStateManager = SelectionStateManager.getInstance();

  // 获取该源的所有规则
  const allRules = rulesManager.getRulesBySource(sourceId);

  if (allRules.length === 0) {
    console.warn(`[Test] No rules found for source ${sourceId}, skipping selection initialization`);
    return;
  }

  // 提取所有规则的文件路径
  const allPaths = allRules.map((rule) => rule.filePath);

  // 初始化选择状态为全选
  await selectionStateManager.initializeState(sourceId, allRules.length, allPaths);

  // 更新选择状态为全选
  selectionStateManager.updateSelection(sourceId, allPaths, true);

  // 立即持久化到磁盘（确保状态保存）
  await selectionStateManager.persistToDisk(sourceId);

  console.log(`[Test] Source ${sourceId} selection initialized: ${allRules.length} rules selected`);
}

/**
 * @description 为所有配置的源初始化选择状态（全选）
 * @param workspaceFolder {vscode.WorkspaceFolder} 工作区文件夹
 * @return {Promise<void>}
 */
export async function initializeAllTestSourcesSelection(
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<void> {
  const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
  const sources = config.get<Array<{ id: string; enabled: boolean }>>('sources');

  if (!sources || sources.length === 0) {
    console.warn('[Test] No sources configured for test workspace');
    return;
  }

  // 只为启用的源初始化选择状态
  const enabledSources = sources.filter((s) => s.enabled);

  for (const source of enabledSources) {
    await initializeTestSourceSelection(source.id);
  }

  console.log(
    `[Test] All sources in ${workspaceFolder.name} initialized: ${enabledSources.length} sources`,
  );
}
