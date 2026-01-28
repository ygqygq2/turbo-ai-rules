/**
 * 集成测试辅助函数
 * 用于初始化测试环境和状态
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { RulesManager } from '../../services/RulesManager';
import { SelectionStateManager } from '../../services/SelectionStateManager';
import { WorkspaceDataManager } from '../../services/WorkspaceDataManager';
import { CONFIG_KEYS } from '../../utils/constants';
import { TEST_DEBUG, TEST_DELAYS, TEST_RETRY } from './testConstants';

/**
 * 测试日志辅助函数
 * 根据 TEST_DEBUG 配置控制日志输出
 */

/**
 * @description 测试日志（仅当 TEST_DEBUG 启用时输出）
 * @param message {string} 日志消息
 * @param data {any} 可选数据
 * @return {void}
 */
export function testLog(message: string, ...data: any[]): void {
  if (TEST_DEBUG.ENABLED && TEST_DEBUG.LEVEL !== 'silent') {
    console.log(`[TEST] ${message}`, ...data);
  }
}

/**
 * @description 测试详细日志（仅当 LEVEL=verbose 时输出）
 * @param message {string} 日志消息
 * @param data {any} 可选数据
 * @return {void}
 */
export function testLogVerbose(message: string, ...data: any[]): void {
  if (TEST_DEBUG.ENABLED && TEST_DEBUG.LEVEL === 'verbose') {
    console.log(`[TEST:VERBOSE] ${message}`, ...data);
  }
}

/**
 * @description 测试警告日志（始终输出）
 * @param message {string} 日志消息
 * @param data {any} 可选数据
 * @return {void}
 */
export function testWarn(message: string, ...data: any[]): void {
  console.warn(`[TEST:WARN] ${message}`, ...data);
}

/**
 * @description 测试错误日志（始终输出）
 * @param message {string} 日志消息
 * @param data {any} 可选数据
 * @return {void}
 */
export function testError(message: string, ...data: any[]): void {
  console.error(`[TEST:ERROR] ${message}`, ...data);
}

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

  // 使用重试机制获取规则
  let allRules: any[] = [];
  try {
    allRules = await retryUntilSuccess(
      () => Promise.resolve(rulesManager.getRulesBySource(sourceId)),
      {
        maxRetries: 5,
        retryDelay: 1000,
        condition: (rules) => rules.length > 0,
      },
    );
  } catch (error) {
    testWarn(`Failed to get rules for source ${sourceId}:`, error);
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
    testWarn('No sources configured for test workspace');
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
 * @description 激活工作区（打开 README.md 设置上下文）
 * @param workspaceFolder {vscode.WorkspaceFolder} 工作区文件夹
 * @return {Promise<void>}
 */
export async function activateWorkspace(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
  const readmePath = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
  try {
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);
    await sleep(TEST_DELAYS.SHORT);
  } catch (_error) {
    testWarn(
      `Could not open README.md in ${workspaceFolder.name}, workspace context may not be fully activated`,
    );
  }
}

/**
 * @description 睡眠指定毫秒数
 * @param ms {number} 毫秒数
 * @return {Promise<void>}
 */
export async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @description 重试执行函数直到成功或超时
 * @param fn {() => Promise<T>} 要执行的异步函数
 * @param options {{ maxRetries?: number; retryDelay?: number; condition?: (result: T) => boolean }} 重试选项
 * @return {Promise<T>}
 */
export async function retryUntilSuccess<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelay?: number;
    condition?: (result: T) => boolean;
  } = {},
): Promise<T> {
  const { maxRetries = 5, retryDelay = 1000, condition = (r) => !!r } = options;
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await fn();
      if (condition(result)) {
        return result;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    if (i < maxRetries - 1) {
      await sleep(retryDelay);
    }
  }

  throw lastError || new Error(`Failed after ${maxRetries} retries`);
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
    paths: ['**/*'], // 通配符表示全选
  });
}

/**
 * @description 等待扩展完全激活
 * @param extensionId {string} 扩展ID
 * @return {Promise<vscode.Extension<any> | undefined>}
 */
export async function waitForExtensionActivation(
  extensionId: string = 'ygqygq2.turbo-ai-rules',
): Promise<vscode.Extension<any> | undefined> {
  const ext = vscode.extensions.getExtension(extensionId);
  if (!ext) {
    throw new Error(`Extension ${extensionId} not found`);
  }

  if (!ext.isActive) {
    await ext.activate();
    await sleep(TEST_DELAYS.MEDIUM);
  }

  return ext;
}

/**
 * @description 等待工作区文件夹上下文更新
 * @param workspaceFolder {vscode.WorkspaceFolder} 工作区文件夹
 * @return {Promise<void>}
 */
export async function switchToWorkspaceContext(
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<void> {
  const readmePath = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
  const doc = await vscode.workspace.openTextDocument(readmePath);
  await vscode.window.showTextDocument(doc);
  await sleep(TEST_DELAYS.SHORT);
}

/**
 * @description 等待命令执行完成
 * @param command {string} 命令ID
 * @param args {any[]} 命令参数
 * @param waitTime {number} 等待时间（毫秒）
 * @return {Promise<any>}
 */
export async function executeCommandAndWait(
  command: string,
  args: any[] = [],
  waitTime: number = TEST_DELAYS.MEDIUM,
): Promise<any> {
  const result = await vscode.commands.executeCommand(command, ...args);
  await sleep(waitTime);
  return result;
}

/**
 * @description 获取工作区的服务实例
 * @return {Promise<{ rulesManager: any; selectionStateManager: any; api: any }>}
 */
export async function getExtensionServices(): Promise<{
  rulesManager: any;
  selectionStateManager: any;
  api: any;
}> {
  const ext = await waitForExtensionActivation();
  const api = ext?.exports;
  const rulesManager = api?.rulesManager;
  const selectionStateManager = api?.selectionStateManager;

  if (!rulesManager) {
    throw new Error('RulesManager not available from extension API');
  }
  if (!selectionStateManager) {
    throw new Error('SelectionStateManager not available from extension API');
  }

  return { rulesManager, selectionStateManager, api };
}

/**
 * @description 查找指定名称的工作区文件夹
 * @param namePattern {string | RegExp} 工作区名称或正则模式
 * @return {vscode.WorkspaceFolder | undefined}
 */
export function findWorkspaceFolder(
  namePattern: string | RegExp,
): vscode.WorkspaceFolder | undefined {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return undefined;
  }

  if (typeof namePattern === 'string') {
    return folders.find((f) => f.name === namePattern || f.name.includes(namePattern));
  } else {
    return folders.find((f) => namePattern.test(f.name));
  }
}

/**
 * @description 等待规则加载完成
 * @param rulesManager {any} RulesManager实例
 * @param minRuleCount {number} 最小规则数量
 * @return {Promise<any[]>}
 */
export async function waitForRulesLoaded(
  rulesManager: any,
  minRuleCount: number = 1,
): Promise<any[]> {
  return retryUntilSuccess(() => Promise.resolve(rulesManager.getAllRules()), {
    maxRetries: TEST_RETRY.MAX_RETRIES,
    retryDelay: TEST_RETRY.RETRY_DELAY,
    condition: (rules) => rules.length >= minRuleCount,
  });
}

/**
 * @description 清理测试生成的文件和目录
 * @param workspaceFolder {vscode.WorkspaceFolder} 工作区文件夹
 * @param paths {string[]} 要清理的相对路径列表
 * @param preserveUserFiles {boolean} 是否保留用户自定义文件
 * @return {Promise<void>}
 */
export async function cleanupTestFiles(
  workspaceFolder: vscode.WorkspaceFolder,
  paths: string[] = [
    '.cursorrules',
    '.windsurfrules',
    '.github',
    '.continue',
    '.clinerules',
    '.roo-clinerules',
    '.aider.conf.yml',
    '.bolt',
    '.qodo',
    'rules',
    'skills',
  ],
  preserveUserFiles: boolean = true,
): Promise<void> {
  const fs = await import('fs-extra');
  const path = await import('path');

  for (const relativePath of paths) {
    const fullPath = path.join(workspaceFolder.uri.fsPath, relativePath);

    try {
      if (!(await fs.pathExists(fullPath))) {
        continue;
      }

      const stat = await fs.stat(fullPath);

      if (stat.isFile()) {
        // 如果是文件，直接删除
        await fs.remove(fullPath);
      } else if (stat.isDirectory()) {
        // 如果是目录，可能需要保留用户文件
        if (preserveUserFiles) {
          const files = await fs.readdir(fullPath);
          for (const file of files) {
            // 删除非用户自定义文件（不以 'custom-' 或 'user-' 开头）
            if (!file.startsWith('custom-') && !file.startsWith('user-')) {
              const filePath = path.join(fullPath, file);
              await fs.remove(filePath);
            }
          }

          // 如果目录为空或只有用户文件，根据策略处理
          const remainingFiles = await fs.readdir(fullPath);
          if (remainingFiles.length === 0) {
            await fs.remove(fullPath);
          }
        } else {
          // 不保留用户文件，直接删除整个目录
          await fs.remove(fullPath);
        }
      }
    } catch (error) {
      // 忽略清理失败的错误，避免影响测试结果
      testWarn(`Failed to clean ${relativePath}:`, error);
    }
  }
}

/**
 * @description 清理选择状态
 * @param selectionStateManager {any} SelectionStateManager实例
 * @param sourceIds {string[]} 源ID列表
 * @return {Promise<void>}
 */
export async function clearSelectionStates(
  selectionStateManager: any,
  sourceIds: string[],
): Promise<void> {
  for (const sourceId of sourceIds) {
    try {
      selectionStateManager.clearState(sourceId);
    } catch (error) {
      testWarn(`Failed to clear state for ${sourceId}:`, error);
    }
  }
}

/**
 * @description 切换到指定的测试工作空间
 * 通过打开 README.md 来激活工作空间上下文，并验证配置加载
 * @param workspaceNamePattern {string} 工作空间名称匹配模式（如 "User Skills Workflow"）
 * @param options {object} 可选配置
 * @param options.verifyAdapter {boolean} 是否验证适配器配置（默认 false）
 * @param options.adapterType {'rules'|'skills'} 期望的适配器类型（默认 undefined）
 * @return {Promise<vscode.WorkspaceFolder>} 切换后的工作空间对象
 */
export async function switchToWorkspace(
  workspaceNamePattern: string,
  options: {
    verifyAdapter?: boolean;
    adapterType?: 'rules' | 'skills';
  } = {},
): Promise<vscode.WorkspaceFolder> {
  const fs = await import('fs-extra');
  const path = await import('path');

  // 1. 查找工作空间
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error('No workspace folders found');
  }

  const workspaceFolder = folders.find((f) => f.name.includes(workspaceNamePattern));
  if (!workspaceFolder) {
    const available = folders.map((f) => f.name).join(', ');
    throw new Error(
      `Workspace matching "${workspaceNamePattern}" not found. Available: ${available}`,
    );
  }

  testLog(`[switchToWorkspace] Selected: ${workspaceFolder.name} at ${workspaceFolder.uri.fsPath}`);

  // 2. 打开 README.md 激活工作空间上下文
  const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
  if (await fs.pathExists(readmePath)) {
    const textDoc = await vscode.workspace.openTextDocument(vscode.Uri.file(readmePath));
    await vscode.window.showTextDocument(textDoc);
    testLog(`[switchToWorkspace] Opened: ${readmePath}`);
    await sleep(1000); // 等待 VSCode 完成上下文切换
  } else {
    testWarn(`[switchToWorkspace] README.md not found at ${readmePath}`);
  }

  // 3. 验证配置（可选）
  if (options.verifyAdapter) {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

    // 检查预设适配器
    const adaptersConfig = config.get<any>('adapters', {});
    const presetAdapters = ['cursor', 'copilot', 'continue', 'windsurf', 'cline'];
    const enabledPresetAdapters = presetAdapters.filter(
      (name) => adaptersConfig[name]?.enabled === true,
    );

    // 检查自定义适配器
    const customAdapters = config.get<any[]>('adapters.custom', []);
    const enabledCustomAdapters = customAdapters.filter((a) => a.enabled);

    testLogVerbose(
      `[switchToWorkspace] Found ${enabledPresetAdapters.length} enabled preset adapters, ${enabledCustomAdapters.length} enabled custom adapters`,
    );

    if (options.adapterType) {
      const expectedIsRuleType = options.adapterType === 'rules';

      // 预设适配器都是 rules 类型
      const hasMatchingPreset = enabledPresetAdapters.length > 0 && expectedIsRuleType;

      // 自定义适配器需要检查 isRuleType
      const hasMatchingCustom = enabledCustomAdapters.some(
        (a) =>
          a.isRuleType === expectedIsRuleType || (expectedIsRuleType && a.isRuleType !== false),
      );

      if (!hasMatchingPreset && !hasMatchingCustom) {
        throw new Error(
          `No ${options.adapterType} adapter found in workspace ${workspaceFolder.name}`,
        );
      }

      const adapterName = hasMatchingPreset
        ? `preset (${enabledPresetAdapters.join(', ')})`
        : `custom (${enabledCustomAdapters.map((a) => a.id).join(', ')})`;

      testLog(`[switchToWorkspace] Verified ${options.adapterType} adapter: ${adapterName}`);
    }
  }

  return workspaceFolder;
}

/**
 * 工作空间快照管理器
 * 用于测试隔离 - 在测试前备份工作空间，测试后恢复
 */
interface WorkspaceSnapshot {
  /** 工作空间路径 */
  workspacePath: string;
  /** 备份目录路径 */
  backupPath: string;
  /** 备份时间戳 */
  timestamp: number;
}

const activeSnapshots = new Map<string, WorkspaceSnapshot>();

/**
 * @description 创建工作空间快照（完整备份）
 * 在 before/beforeEach 中调用，备份整个工作空间目录到临时位置
 * @param workspaceFolder {vscode.WorkspaceFolder} 工作区文件夹
 * @return {Promise<WorkspaceSnapshot>} 快照信息
 */
export async function createWorkspaceSnapshot(
  workspaceFolder: vscode.WorkspaceFolder,
): Promise<WorkspaceSnapshot> {
  const workspacePath = workspaceFolder.uri.fsPath;
  const timestamp = Date.now();

  // 使用工作空间名称 + 时间戳作为备份目录名
  const backupName = `${path.basename(workspacePath)}-backup-${timestamp}`;
  const backupPath = path.join(path.dirname(workspacePath), backupName);

  testLog(`[Snapshot] Creating backup: ${workspacePath} → ${backupPath}`);

  try {
    // 复制整个工作空间目录
    await fs.copy(workspacePath, backupPath, {
      overwrite: true,
      errorOnExist: false,
      // 排除不需要备份的目录（提高性能）
      filter: (src) => {
        const relativePath = path.relative(workspacePath, src);
        // 排除 node_modules, .git 等大目录
        return !relativePath.match(/^(node_modules|\.git|dist|out|build|coverage)($|\/)/);
      },
    });

    const snapshot: WorkspaceSnapshot = {
      workspacePath,
      backupPath,
      timestamp,
    };

    // 记录活跃快照
    activeSnapshots.set(workspacePath, snapshot);
    testLog(`[Snapshot] Backup created successfully`);

    return snapshot;
  } catch (error) {
    testError(`[Snapshot] Failed to create backup:`, error);
    throw new Error(`Failed to create workspace snapshot: ${(error as Error).message}`);
  }
}

/**
 * @description 恢复工作空间快照
 * 在 after/afterEach 中调用，删除测试后的目录并恢复备份
 * @param workspaceFolder {vscode.WorkspaceFolder} 工作区文件夹
 * @param deleteBackup {boolean} 是否删除备份目录（默认 true）
 * @return {Promise<void>}
 */
export async function restoreWorkspaceSnapshot(
  workspaceFolder: vscode.WorkspaceFolder,
  deleteBackup = true,
): Promise<void> {
  const workspacePath = workspaceFolder.uri.fsPath;
  const snapshot = activeSnapshots.get(workspacePath);

  if (!snapshot) {
    testWarn(`[Snapshot] No backup found for ${workspacePath}, skipping restore`);
    return;
  }

  testLog(`[Snapshot] Restoring: ${snapshot.backupPath} → ${workspacePath}`);

  try {
    // 1. 删除测试后的工作空间目录
    if (await fs.pathExists(workspacePath)) {
      await fs.remove(workspacePath);
      testLogVerbose(`[Snapshot] Removed modified workspace`);
    }

    // 2. 将备份复制回原位置
    await fs.copy(snapshot.backupPath, workspacePath, {
      overwrite: true,
      errorOnExist: false,
    });
    testLog(`[Snapshot] Workspace restored`);
  } catch (error) {
    testError(`[Snapshot] Failed to restore backup:`, error);
  } finally {
    // 3. 无论成功失败，都删除备份目录（如果指定）
    if (deleteBackup) {
      try {
        if (await fs.pathExists(snapshot.backupPath)) {
          await fs.remove(snapshot.backupPath);
          testLogVerbose(`[Snapshot] Backup directory cleaned up`);
        }
        // 4. 从活跃快照中移除
        activeSnapshots.delete(workspacePath);
      } catch (cleanupError) {
        testError(`[Snapshot] Failed to cleanup backup:`, cleanupError);
      }
    }
  }
}

/**
 * @description 清理所有活跃快照（用于测试套件清理）
 * 在 after()/suiteTeardown() 中调用
 * @return {Promise<void>}
 */
export async function cleanupAllSnapshots(): Promise<void> {
  testLog(`[Snapshot] Cleaning up ${activeSnapshots.size} active snapshots`);

  const cleanupTasks = Array.from(activeSnapshots.values()).map(async (snapshot) => {
    try {
      if (await fs.pathExists(snapshot.backupPath)) {
        await fs.remove(snapshot.backupPath);
        testLogVerbose(`[Snapshot] Cleaned up backup: ${snapshot.backupPath}`);
      }
    } catch (error) {
      testError(`[Snapshot] Failed to cleanup backup ${snapshot.backupPath}:`, error);
    }
  });

  await Promise.all(cleanupTasks);
  activeSnapshots.clear();
  testLog(`[Snapshot] All snapshots cleaned up`);
}
