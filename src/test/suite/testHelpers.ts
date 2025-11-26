/**
 * 集成测试辅助函数
 * 用于初始化测试环境和状态
 */

import * as vscode from 'vscode';

import { RulesManager } from '../../services/RulesManager';
import { SelectionStateManager } from '../../services/SelectionStateManager';
import { WorkspaceDataManager } from '../../services/WorkspaceDataManager';
import { CONFIG_KEYS } from '../../utils/constants';

/**
 * @description 为测试源初始化选择状态（全选所有规则）
 * 这是为了确保在 CI 环境中测试能够正常运行，因为默认情况下新源是全不选的
 * @param sourceId {string} 规则源 ID
 * @param workspacePath {string} 工作区路径
 * @return {Promise<void>}
 */
export async function initializeTestSourceSelection(
  sourceId: string,
  workspacePath: string,
): Promise<void> {
  const rulesManager = RulesManager.getInstance();
  const selectionStateManager = SelectionStateManager.getInstance();

  // 重试获取规则（最多重试5次，每次等待1秒）
  let allRules: any[] = [];
  let retries = 0;
  const maxRetries = 5;

  while (allRules.length === 0 && retries < maxRetries) {
    allRules = rulesManager.getRulesBySource(sourceId);
    if (allRules.length > 0) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    retries++;
  }

  if (allRules.length === 0) {
    return;
  }

  // 提取所有规则的文件路径
  const allPaths = allRules.map((rule) => rule.filePath);

  // 直接设置选择状态为全选（不依赖 initializeState 的磁盘加载逻辑）
  selectionStateManager.updateSelection(sourceId, allPaths, false, workspacePath);

  // 立即持久化到磁盘（确保后续测试能加载到这个状态）
  await selectionStateManager.persistToDisk(sourceId, workspacePath);

  // 缓存总数（initializeState 会做这个，但我们跳过了它）
  // 注意：这里我们需要访问私有方法，所以还是需要调用 initializeState
  // 但我们在之后覆盖它的结果
  await selectionStateManager.initializeState(sourceId, allRules.length, []);

  // 再次更新为全选并持久化（覆盖 initializeState 的空数组）
  selectionStateManager.updateSelection(sourceId, allPaths, false, workspacePath);
  await selectionStateManager.persistToDisk(sourceId, workspacePath);
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
  const sources = config.get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES);

  if (!sources || sources.length === 0) {
    console.warn('[Test] No sources configured for test workspace');
    return;
  }

  // 只为启用的源初始化选择状态
  const enabledSources = sources.filter((s) => s.enabled);
  const workspacePath = workspaceFolder.uri.fsPath;

  for (const source of enabledSources) {
    await initializeTestSourceSelection(source.id, workspacePath);
  }
}

/**
 * @description 为测试预设全选状态（在同步之前写入磁盘）
 * 模拟用户已经勾选了所有规则，这样同步时 initializeState 会加载到这个状态
 * @param sourceId {string} 规则源 ID
 * @param workspacePath {string} 工作区路径
 * @return {Promise<void>}
 */
export async function presetAllRulesSelected(
  sourceId: string,
  workspacePath: string,
): Promise<void> {
  const workspaceDataManager = WorkspaceDataManager.getInstance();

  // 写入一个"全选"标记到磁盘
  // 使用通配符 ["**/*"] 表示选中所有规则
  await workspaceDataManager.setRuleSelection(workspacePath, sourceId, {
    mode: 'include',
    paths: ['**/*'], // 通配符表示全选
  });
}
