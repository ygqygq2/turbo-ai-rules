/**
 * 工作空间隔离测试
 * 工作空间: 使用前两个可用工作空间
 *
 * 测试场景:
 * - 工作空间数据完全隔离
 * - 工作空间哈希正确性
 * - 数据持久化到正确目录
 * - 切换工作空间后数据独立
 *
 * 注意: 这个测试需要操作多个工作空间，但测试文件本身不切换上下文，
 *      而是直接通过 API 操作不同工作空间的数据
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

import { WorkspaceDataManager } from '../../../services/WorkspaceDataManager';
import { TEST_TIMEOUTS } from '../testConstants';

describe('Workspace Isolation Tests', () => {
  let workspaceDataManager: WorkspaceDataManager;
  let workspace1: vscode.WorkspaceFolder;
  let workspace2: vscode.WorkspaceFolder;

  before(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 激活扩展
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) {
      await ext.activate();
    }

    // 获取服务实例
    workspaceDataManager = WorkspaceDataManager.getInstance();

    // 验证至少有两个工作空间
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(
      folders && folders.length >= 2,
      'Need at least 2 workspace folders for isolation tests',
    );

    workspace1 = folders[0];
    workspace2 = folders[1];
  });

  afterEach(async () => {
    // 清理测试数据
    const testSourceId = 'test-isolation-source';

    // 清理两个工作空间的数据
    await workspaceDataManager.initWorkspace(workspace1.uri.fsPath);
    await workspaceDataManager.setRuleSelection(workspace1.uri.fsPath, testSourceId, { paths: [] });

    await workspaceDataManager.initWorkspace(workspace2.uri.fsPath);
    await workspaceDataManager.setRuleSelection(workspace2.uri.fsPath, testSourceId, { paths: [] });
  });

  it('Should generate different hashes for different workspaces', async () => {
    // 初始化第一个工作空间
    await workspaceDataManager.initWorkspace(workspace1.uri.fsPath);
    const hash1 = workspaceDataManager.getWorkspaceHash();
    const dir1 = workspaceDataManager.getWorkspaceDir();

    // 初始化第二个工作空间
    await workspaceDataManager.initWorkspace(workspace2.uri.fsPath);
    const hash2 = workspaceDataManager.getWorkspaceHash();
    const dir2 = workspaceDataManager.getWorkspaceDir();

    // 验证哈希和目录不同
    assert.notStrictEqual(hash1, hash2, 'Different workspaces should have different hashes');
    assert.notStrictEqual(
      dir1,
      dir2,
      'Different workspaces should have different data directories',
    );

    // 验证目录包含哈希
    assert.ok(dir1.includes(hash1), 'Workspace directory should include workspace hash');
    assert.ok(dir2.includes(hash2), 'Workspace directory should include workspace hash');
  });

  it('Should isolate rule selections between workspaces', async function () {
    this.timeout(TEST_TIMEOUTS.SHORT);

    const testSourceId = 'test-isolation-source';
    const workspace1Path = workspace1.uri.fsPath;
    const workspace2Path = workspace2.uri.fsPath;

    // 在第一个工作空间设置选择
    await workspaceDataManager.initWorkspace(workspace1Path);
    await workspaceDataManager.setRuleSelection(workspace1Path, testSourceId, {
      paths: ['workspace1-rule1.md', 'workspace1-rule2.md'],
    });

    // 在第二个工作空间设置不同的选择
    await workspaceDataManager.initWorkspace(workspace2Path);
    await workspaceDataManager.setRuleSelection(workspace2Path, testSourceId, {
      paths: ['workspace2-rule1.md', 'workspace2-rule2.md'],
    });

    // 验证第二个工作空间的选择
    const selection2 = await workspaceDataManager.getRuleSelection(testSourceId);
    assert.ok(selection2, 'Workspace 2 should have selections');
    assert.deepStrictEqual(
      selection2.paths.sort(),
      ['workspace2-rule1.md', 'workspace2-rule2.md'].sort(),
      'Workspace 2 should have its own selections',
    );

    // 切换回第一个工作空间
    await workspaceDataManager.initWorkspace(workspace1Path);

    // 验证第一个工作空间的选择未被影响
    const selection1 = await workspaceDataManager.getRuleSelection(testSourceId);
    assert.ok(selection1, 'Workspace 1 should still have selections');
    assert.deepStrictEqual(
      selection1.paths.sort(),
      ['workspace1-rule1.md', 'workspace1-rule2.md'].sort(),
      'Workspace 1 selections should be preserved',
    );
  });

  it('Should persist data to correct workspace directory', async function () {
    this.timeout(TEST_TIMEOUTS.SHORT);

    const testSourceId = 'persist-test-source';
    const workspace1Path = workspace1.uri.fsPath;
    const workspace2Path = workspace2.uri.fsPath;

    // 在第一个工作空间设置数据
    await workspaceDataManager.initWorkspace(workspace1Path);
    await workspaceDataManager.setRuleSelection(workspace1Path, testSourceId, {
      paths: ['persist-rule-1.md'],
    });
    const dir1 = workspaceDataManager.getWorkspaceDir();

    // 在第二个工作空间设置数据
    await workspaceDataManager.initWorkspace(workspace2Path);
    await workspaceDataManager.setRuleSelection(workspace2Path, testSourceId, {
      paths: ['persist-rule-2.md'],
    });
    const dir2 = workspaceDataManager.getWorkspaceDir();

    // 验证数据目录不同
    assert.notStrictEqual(dir1, dir2, 'Data directories should be different');

    // 重新初始化并验证数据仍然隔离
    await workspaceDataManager.initWorkspace(workspace1Path);
    const selection1After = await workspaceDataManager.getRuleSelection(testSourceId);
    assert.ok(selection1After, 'Should retrieve workspace 1 data after re-init');
    assert.deepStrictEqual(
      selection1After.paths,
      ['persist-rule-1.md'],
      'Workspace 1 data should persist correctly',
    );

    await workspaceDataManager.initWorkspace(workspace2Path);
    const selection2After = await workspaceDataManager.getRuleSelection(testSourceId);
    assert.ok(selection2After, 'Should retrieve workspace 2 data after re-init');
    assert.deepStrictEqual(
      selection2After.paths,
      ['persist-rule-2.md'],
      'Workspace 2 data should persist correctly',
    );
  });

  it('Should handle empty selections in one workspace without affecting others', async () => {
    const testSourceId = 'empty-test-source';
    const workspace1Path = workspace1.uri.fsPath;
    const workspace2Path = workspace2.uri.fsPath;

    // 在两个工作空间都设置选择
    await workspaceDataManager.initWorkspace(workspace1Path);
    await workspaceDataManager.setRuleSelection(workspace1Path, testSourceId, {
      paths: ['rule1.md', 'rule2.md'],
    });

    await workspaceDataManager.initWorkspace(workspace2Path);
    await workspaceDataManager.setRuleSelection(workspace2Path, testSourceId, {
      paths: ['rule3.md', 'rule4.md'],
    });

    // 清空第一个工作空间的选择
    await workspaceDataManager.initWorkspace(workspace1Path);
    await workspaceDataManager.setRuleSelection(workspace1Path, testSourceId, {
      paths: [],
    });

    const selection1Empty = await workspaceDataManager.getRuleSelection(testSourceId);
    assert.ok(
      !selection1Empty || selection1Empty.paths.length === 0,
      'Workspace 1 should have empty selection',
    );

    // 验证第二个工作空间不受影响
    await workspaceDataManager.initWorkspace(workspace2Path);
    const selection2Preserved = await workspaceDataManager.getRuleSelection(testSourceId);
    assert.ok(selection2Preserved, 'Workspace 2 should still have selections');
    assert.deepStrictEqual(
      selection2Preserved.paths.sort(),
      ['rule3.md', 'rule4.md'].sort(),
      'Workspace 2 selections should be unaffected',
    );
  });

  it('Should maintain workspace context correctly', async () => {
    const workspace1Path = workspace1.uri.fsPath;
    const workspace2Path = workspace2.uri.fsPath;

    // 初始化第一个工作空间
    await workspaceDataManager.initWorkspace(workspace1Path);
    const hash1First = workspaceDataManager.getWorkspaceHash();

    // 切换到第二个工作空间
    await workspaceDataManager.initWorkspace(workspace2Path);
    const hash2 = workspaceDataManager.getWorkspaceHash();

    // 切换回第一个工作空间
    await workspaceDataManager.initWorkspace(workspace1Path);
    const hash1Second = workspaceDataManager.getWorkspaceHash();

    // 验证同一工作空间的哈希保持一致
    assert.strictEqual(hash1First, hash1Second, 'Same workspace should have consistent hash');
    assert.notStrictEqual(hash1First, hash2, 'Different workspaces should have different hashes');
  });
});
