/**
 * 工作区切换集成测试
 * 验证切换不同项目时，规则选择状态是否正确隔离
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

import { WorkspaceDataManager } from '../../services/WorkspaceDataManager';

describe('Workspace Switching Tests', () => {
  let workspaceDataManager: WorkspaceDataManager;

  before(async () => {
    workspaceDataManager = WorkspaceDataManager.getInstance();

    // 激活扩展
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) {
      await ext.activate();
    }
  });

  it('Should isolate rule selections between different workspaces', async function () {
    this.timeout(10000);

    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length >= 2, 'Need at least 2 workspace folders for this test');

    const workspace1 = folders[0].uri.fsPath;
    const workspace2 = folders[1].uri.fsPath;

    // 初始化第一个工作区
    await workspaceDataManager.initWorkspace(workspace1);
    const hash1 = workspaceDataManager.getWorkspaceHash();

    // 模拟规则选择（第一个工作区）
    await workspaceDataManager.setRuleSelection(workspace1, 'test-source-1', {
      paths: ['rule1.md', 'rule2.md'],
    });

    // 切换到第二个工作区
    await workspaceDataManager.initWorkspace(workspace2);
    const hash2 = workspaceDataManager.getWorkspaceHash();

    // 验证工作区哈希不同
    assert.notStrictEqual(hash1, hash2, 'Different workspaces should have different hashes');

    // 模拟规则选择（第二个工作区）
    await workspaceDataManager.setRuleSelection(workspace2, 'test-source-1', {
      paths: ['rule3.md', 'rule4.md'],
    });

    // 验证第二个工作区的选择
    const selection2 = await workspaceDataManager.getRuleSelection('test-source-1');
    assert.ok(selection2, 'Workspace 2 should have selections');
    assert.deepStrictEqual(
      selection2.paths,
      ['rule3.md', 'rule4.md'],
      'Workspace 2 should have its own selections',
    );

    // 切换回第一个工作区
    await workspaceDataManager.initWorkspace(workspace1);

    // 验证第一个工作区的选择未被影响
    const selection1 = await workspaceDataManager.getRuleSelection('test-source-1');
    assert.ok(selection1, 'Workspace 1 should still have selections');
    assert.deepStrictEqual(
      selection1.paths,
      ['rule1.md', 'rule2.md'],
      'Workspace 1 selections should be preserved',
    );
  });

  it('Should have different workspace hashes for different paths', async () => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length >= 2, 'Need at least 2 workspace folders');

    const workspace1 = folders[0].uri.fsPath;
    const workspace2 = folders[1].uri.fsPath;

    // 初始化第一个工作区
    await workspaceDataManager.initWorkspace(workspace1);
    const hash1 = workspaceDataManager.getWorkspaceHash();
    const dir1 = workspaceDataManager.getWorkspaceDir();

    // 初始化第二个工作区
    await workspaceDataManager.initWorkspace(workspace2);
    const hash2 = workspaceDataManager.getWorkspaceHash();
    const dir2 = workspaceDataManager.getWorkspaceDir();

    // 验证哈希和目录都不同
    assert.notStrictEqual(hash1, hash2, 'Different workspaces should have different hashes');
    assert.notStrictEqual(dir1, dir2, 'Different workspaces should have different directories');
    assert.ok(dir1.includes(hash1), 'Workspace directory should include hash');
    assert.ok(dir2.includes(hash2), 'Workspace directory should include hash');
  });

  it('Should persist selections to correct workspace directory', async function () {
    this.timeout(10000);

    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length >= 2, 'Need at least 2 workspace folders');

    const workspace1 = folders[0].uri.fsPath;
    const workspace2 = folders[1].uri.fsPath;

    const testSourceId = 'persist-test-source';

    // 设置第一个工作区的数据
    await workspaceDataManager.initWorkspace(workspace1);
    await workspaceDataManager.setRuleSelection(workspace1, testSourceId, {
      paths: ['workspace1-rule.md'],
    });

    // 设置第二个工作区的数据
    await workspaceDataManager.initWorkspace(workspace2);
    await workspaceDataManager.setRuleSelection(workspace2, testSourceId, {
      paths: ['workspace2-rule.md'],
    });

    // 验证：切换回第一个工作区，读取的数据应该是第一个工作区的
    await workspaceDataManager.initWorkspace(workspace1);
    const selection1 = await workspaceDataManager.getRuleSelection(testSourceId);
    assert.ok(selection1, 'Should retrieve workspace 1 data');
    assert.deepStrictEqual(
      selection1.paths,
      ['workspace1-rule.md'],
      'Should get workspace 1 specific data',
    );

    // 验证：切换到第二个工作区，读取的数据应该是第二个工作区的
    await workspaceDataManager.initWorkspace(workspace2);
    const selection2 = await workspaceDataManager.getRuleSelection(testSourceId);
    assert.ok(selection2, 'Should retrieve workspace 2 data');
    assert.deepStrictEqual(
      selection2.paths,
      ['workspace2-rule.md'],
      'Should get workspace 2 specific data',
    );
  });
});
