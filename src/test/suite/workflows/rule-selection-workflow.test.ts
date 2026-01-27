/**
 * 规则选择数据同步测试
 * 工作空间: rules-for-cursor (复用)
 *
 * 测试场景:
 * - 三处 UI 使用同一数据源:
 *   1. 侧边栏左侧 - 平铺视图（无层级）
 *   2. 右击规则源 - 规则选择器（有层级）
 *   3. 仪表板 - 规则同步页
 * - 数据实时同步
 * - 规则选择持久化
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

import { SelectionStateManager } from '../../../services/SelectionStateManager';
import { WorkspaceDataManager } from '../../../services/WorkspaceDataManager';
import { CONFIG_KEYS } from '../../../utils/constants';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../testConstants';
import { sleep } from '../testHelpers';

describe('Rule Selection Workflow Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let rulesManager: any;
  let selectionStateManager: SelectionStateManager;
  let workspaceDataManager: WorkspaceDataManager;

  before(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 获取测试工作空间
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'Workspace folders not found');
    workspaceFolder = folders.find((f) => f.name.includes('Cursor')) || folders[0];

    // 激活扩展
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) {
      await ext.activate();
    }

    // 获取服务实例
    const api = ext?.exports;
    rulesManager = api?.rulesManager;
    selectionStateManager = SelectionStateManager.getInstance();
    workspaceDataManager = WorkspaceDataManager.getInstance();

    assert.ok(rulesManager, 'RulesManager should be available');
    assert.ok(selectionStateManager, 'SelectionStateManager should be available');

    // 初始化工作空间
    await workspaceDataManager.initWorkspace(workspaceFolder.uri.fsPath);

    // 切换到工作空间上下文
    const readmePath = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);
    await sleep(TEST_DELAYS.SHORT);
  });

  afterEach(async () => {
    if (!workspaceFolder) {
      return;
    }

    // 清理选择状态
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string }>>(CONFIG_KEYS.SOURCES) || [];
    for (const source of sources) {
      selectionStateManager?.clearState(source.id);
    }
  });

  it('Should persist rule selection data', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES);

    if (!sources || sources.length === 0) {
      this.skip();
      return;
    }

    const sourceId = sources[0].id;
    const testPaths = ['test/rule1.md', 'test/rule2.md', 'test/rule3.md'];

    // 模拟规则选择（等同于 UI 勾选）
    selectionStateManager.updateSelection(sourceId, testPaths, false, workspaceFolder.uri.fsPath);

    // 持久化到磁盘
    await selectionStateManager.persistToDisk(sourceId, workspaceFolder.uri.fsPath);
    await sleep(TEST_DELAYS.SHORT);

    // 读取持久化的数据
    const selection = await workspaceDataManager.getRuleSelection(sourceId);

    assert.ok(selection, 'Selection data should be persisted');
    assert.strictEqual(selection.paths.length, testPaths.length, 'All paths should be saved');
    assert.deepStrictEqual(
      selection.paths.sort(),
      testPaths.sort(),
      'Persisted paths should match',
    );
  });

  it('Should sync data across different UI components', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES);

    if (!sources || sources.length === 0) {
      this.skip();
      return;
    }

    const sourceId = sources[0].id;
    const selectedPaths = ['src/rule-a.md', 'src/rule-b.md'];

    // 模拟在侧边栏选择规则
    selectionStateManager.updateSelection(
      sourceId,
      selectedPaths,
      false,
      workspaceFolder.uri.fsPath,
    );
    await selectionStateManager.persistToDisk(sourceId, workspaceFolder.uri.fsPath);

    // 模拟从规则选择器读取（应该得到相同的数据）
    const fromSelector = await workspaceDataManager.getRuleSelection(sourceId);
    assert.ok(fromSelector, 'Rule selector should access same data');
    assert.deepStrictEqual(
      fromSelector.paths.sort(),
      selectedPaths.sort(),
      'Rule selector should show same selection',
    );

    // 模拟从仪表板规则同步页读取（也应该得到相同的数据）
    const fromDashboard = await workspaceDataManager.getRuleSelection(sourceId);
    assert.ok(fromDashboard, 'Dashboard sync page should access same data');
    assert.deepStrictEqual(
      fromDashboard.paths.sort(),
      selectedPaths.sort(),
      'Dashboard should show same selection',
    );
  });

  it('Should handle real-time updates across UI', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES);

    if (!sources || sources.length === 0) {
      this.skip();
      return;
    }

    const sourceId = sources[0].id;
    const initialPaths = ['initial1.md', 'initial2.md'];
    const updatedPaths = ['updated1.md', 'updated2.md', 'updated3.md'];

    // 初始选择
    selectionStateManager.updateSelection(
      sourceId,
      initialPaths,
      false,
      workspaceFolder.uri.fsPath,
    );
    await selectionStateManager.persistToDisk(sourceId, workspaceFolder.uri.fsPath);

    let selection = await workspaceDataManager.getRuleSelection(sourceId);
    assert.ok(selection, 'Initial selection should exist');
    assert.strictEqual(selection!.paths.length, initialPaths.length, 'Initial selection count');

    // 更新选择（模拟用户在其中一个 UI 修改）
    selectionStateManager.updateSelection(
      sourceId,
      updatedPaths,
      false,
      workspaceFolder.uri.fsPath,
    );
    await selectionStateManager.persistToDisk(sourceId, workspaceFolder.uri.fsPath);

    // 所有 UI 应该能读取到更新后的数据
    selection = await workspaceDataManager.getRuleSelection(sourceId);
    assert.ok(selection, 'Updated selection should exist');
    assert.strictEqual(selection!.paths.length, updatedPaths.length, 'Updated selection count');
    assert.deepStrictEqual(
      selection!.paths.sort(),
      updatedPaths.sort(),
      'All UIs should reflect updated selection',
    );
  });

  it('Should handle empty selection state', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES);

    if (!sources || sources.length === 0) {
      this.skip();
      return;
    }

    const sourceId = sources[0].id;

    // 清空选择
    selectionStateManager.updateSelection(sourceId, [], false, workspaceFolder.uri.fsPath);
    await selectionStateManager.persistToDisk(sourceId, workspaceFolder.uri.fsPath);

    // 验证空选择状态
    const selection = await workspaceDataManager.getRuleSelection(sourceId);

    if (selection) {
      assert.strictEqual(selection.paths.length, 0, 'Selection should be empty');
    }
  });

  it('Should handle multiple sources independently', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES);

    if (!sources || sources.length < 2) {
      console.log('Need at least 2 sources for this test, skipping');
      this.skip();
      return;
    }

    const source1Id = sources[0].id;
    const source2Id = sources[1].id;

    const source1Paths = ['source1/rule1.md', 'source1/rule2.md'];
    const source2Paths = ['source2/ruleA.md', 'source2/ruleB.md', 'source2/ruleC.md'];

    // 为第一个源设置选择
    selectionStateManager.updateSelection(
      source1Id,
      source1Paths,
      false,
      workspaceFolder.uri.fsPath,
    );
    await selectionStateManager.persistToDisk(source1Id, workspaceFolder.uri.fsPath);

    // 为第二个源设置选择
    selectionStateManager.updateSelection(
      source2Id,
      source2Paths,
      false,
      workspaceFolder.uri.fsPath,
    );
    await selectionStateManager.persistToDisk(source2Id, workspaceFolder.uri.fsPath);

    // 验证两个源的选择独立
    const selection1 = await workspaceDataManager.getRuleSelection(source1Id);
    const selection2 = await workspaceDataManager.getRuleSelection(source2Id);

    assert.ok(selection1, 'Source 1 should have selection');
    assert.ok(selection2, 'Source 2 should have selection');
    assert.strictEqual(selection1!.paths.length, source1Paths.length, 'Source 1 path count');
    assert.strictEqual(selection2!.paths.length, source2Paths.length, 'Source 2 path count');

    // 验证选择不会混淆
    assert.deepStrictEqual(selection1!.paths.sort(), source1Paths.sort(), 'Source 1 paths correct');
    assert.deepStrictEqual(selection2!.paths.sort(), source2Paths.sort(), 'Source 2 paths correct');
  });
});
