/**
 * Shared Selection 集成测试
 * 测试 enableSharedSelection 配置的完整功能
 */

import * as assert from 'assert';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

// 通过扩展获取服务实例
let selectionStateManager: any;
let sharedSelectionManager: any;

describe('Shared Selection Integration Tests', () => {
  let enabledWorkspace: vscode.WorkspaceFolder; // 启用共享选择的工作区
  let disabledWorkspace: vscode.WorkspaceFolder; // 禁用共享选择的工作区
  const sharedFilePath = '.turbo-ai-rules/selections.json';

  before(async function () {
    this.timeout(30000);

    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');

    // 查找已启用 enableSharedSelection 的工作区（rules-generate-test）
    enabledWorkspace = folders.find((f) => f.name === 'Test: Generate Config Files')!;
    assert.ok(enabledWorkspace, 'Enabled workspace should be available');

    // 查找未启用 enableSharedSelection 的工作区（使用 Cursor Adapter 工作区）
    disabledWorkspace = folders.find((f) => f.name === 'Test: Cursor Adapter')!;
    assert.ok(disabledWorkspace, 'Disabled workspace should be available');

    // 获取扩展实例
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    assert.ok(ext, 'Extension should be available');

    if (!ext.isActive) {
      await ext.activate();
    }

    const api = ext?.exports;
    selectionStateManager = api?.selectionStateManager;
    sharedSelectionManager = api?.sharedSelectionManager;

    assert.ok(selectionStateManager, 'SelectionStateManager should be available');
    assert.ok(sharedSelectionManager, 'SharedSelectionManager should be available');
  });

  afterEach(async function () {
    this.timeout(10000);

    // 清理启用工作区的共享选择文件
    const enabledPath = path.join(enabledWorkspace.uri.fsPath, sharedFilePath);
    try {
      await fs.unlink(enabledPath);
    } catch (_error) {
      // 文件可能不存在，忽略错误
    }

    // 清理禁用工作区的共享选择文件（如果有）
    const disabledPath = path.join(disabledWorkspace.uri.fsPath, sharedFilePath);
    try {
      await fs.unlink(disabledPath);
    } catch (_error) {
      // 文件可能不存在，忽略错误
    }
  });

  it('应该在启用 enableSharedSelection 时创建共享选择文件', async function () {
    this.timeout(10000);

    // 1. 验证配置已启用（使用预配置的 enabledWorkspace）
    const enabled = sharedSelectionManager.isEnabled(enabledWorkspace);
    assert.strictEqual(enabled, true, 'Shared selection should be enabled');

    // 2. 模拟选择规则
    const testSourceId = 'test-source';
    const testPaths = ['rule1.md', 'rule2.md', 'rule3.md'];

    await selectionStateManager.initializeState(testSourceId, testPaths.length, []);
    selectionStateManager.updateSelection(
      testSourceId,
      testPaths,
      false,
      enabledWorkspace.uri.fsPath,
    );

    // 等待持久化
    await selectionStateManager.persistToDisk(testSourceId, enabledWorkspace.uri.fsPath);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. 验证共享选择文件已创建
    const fullPath = path.join(enabledWorkspace.uri.fsPath, sharedFilePath);
    const fileExists = await fs
      .access(fullPath)
      .then(() => true)
      .catch(() => false);

    assert.strictEqual(fileExists, true, 'Shared selection file should be created');

    // 4. 验证文件内容
    const content = await fs.readFile(fullPath, 'utf-8');
    const data = JSON.parse(content);

    assert.ok(data.version, 'Should have version field');
    assert.ok(data.workspacePath, 'Should have workspacePath field');
    assert.ok(data.lastUpdated, 'Should have lastUpdated field');
    assert.ok(data.selections, 'Should have selections field');
    assert.ok(data.selections[testSourceId], 'Should have test source selections');
    assert.deepStrictEqual(
      data.selections[testSourceId].paths,
      testPaths,
      'Should save correct paths',
    );
  });

  it('应该从共享选择文件加载规则选择状态', async function () {
    this.timeout(10000);

    // 1. 手动创建共享选择文件（使用预配置启用的工作区）
    const testSourceId = 'test-source-2';
    const testPaths = ['shared-rule1.md', 'shared-rule2.md'];

    const sharedData = {
      version: 1,
      workspacePath: '.', // 使用相对路径，避免泄露敏感信息
      lastUpdated: new Date().toISOString(),
      selections: {
        [testSourceId]: {
          paths: testPaths,
        },
      },
    };

    const fullPath = path.join(enabledWorkspace.uri.fsPath, sharedFilePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, JSON.stringify(sharedData, null, 2));

    // 2. 清空内存状态，强制从文件加载
    selectionStateManager.clearState(testSourceId);

    // 3. 使用 importSharedSelection 从共享文件加载（这是正确的方式）
    const importedCount = await selectionStateManager.importSharedSelection(
      enabledWorkspace.uri.fsPath,
      'replace',
    );

    assert.strictEqual(importedCount, 1, 'Should import 1 source');

    // 4. 验证加载的选择状态
    const loadedPaths = selectionStateManager.getSelection(testSourceId);
    assert.deepStrictEqual(loadedPaths, testPaths, 'Should load paths from shared file');
  });

  it('应该在禁用 enableSharedSelection 时使用 WorkspaceDataManager', async function () {
    this.timeout(10000);

    const testSourceId = 'test-source-3';
    const testPaths = ['workspace-rule1.md', 'workspace-rule2.md'];

    // 1. 验证配置已禁用（使用预配置的 disabledWorkspace）
    const enabled = sharedSelectionManager.isEnabled(disabledWorkspace);
    assert.strictEqual(enabled, false, 'Shared selection should be disabled');

    // 2. 设置选择状态
    await selectionStateManager.initializeState(testSourceId, testPaths.length, []);
    selectionStateManager.updateSelection(
      testSourceId,
      testPaths,
      false,
      disabledWorkspace.uri.fsPath,
    );

    // 等待持久化
    await selectionStateManager.persistToDisk(testSourceId, disabledWorkspace.uri.fsPath);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. 验证共享选择文件未创建
    const fullPath = path.join(disabledWorkspace.uri.fsPath, sharedFilePath);
    const fileExists = await fs
      .access(fullPath)
      .then(() => true)
      .catch(() => false);

    assert.strictEqual(
      fileExists,
      false,
      'Shared selection file should not be created when disabled',
    );

    // 4. 验证选择状态仍然可以正常工作（使用 WorkspaceDataManager）
    const loadedPaths = selectionStateManager.getSelection(testSourceId);
    assert.deepStrictEqual(loadedPaths, testPaths, 'Should still work with WorkspaceDataManager');
  });

  it('应该在共享文件加载失败时降级到 WorkspaceDataManager', async function () {
    this.timeout(10000);

    const testSourceId = 'test-source-4';
    const testPaths = ['fallback-rule1.md'];

    // 1. 创建一个损坏的共享选择文件（使用启用工作区）
    const fullPath = path.join(enabledWorkspace.uri.fsPath, sharedFilePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, 'invalid json content');

    // 2. 先设置一些状态到 WorkspaceDataManager
    await selectionStateManager.initializeState(testSourceId, testPaths.length, []);
    selectionStateManager.updateSelection(
      testSourceId,
      testPaths,
      false,
      enabledWorkspace.uri.fsPath,
    );
    await selectionStateManager.persistToDisk(testSourceId, enabledWorkspace.uri.fsPath);

    // 3. 清空内存状态，强制重新加载
    selectionStateManager.clearState(testSourceId);

    // 4. 重新初始化（应该降级到 WorkspaceDataManager）
    await selectionStateManager.initializeState(testSourceId, testPaths.length, []);

    // 5. 验证仍然可以加载到数据（从 WorkspaceDataManager）
    const loadedPaths = selectionStateManager.getSelection(testSourceId);
    assert.deepStrictEqual(
      loadedPaths,
      testPaths,
      'Should fallback to WorkspaceDataManager when shared file is corrupted',
    );
  });

  it('应该支持多个规则源的共享选择', async function () {
    this.timeout(10000);

    // 1. 设置多个规则源的选择状态（使用启用工作区）
    const sources = [
      { id: 'source-a', paths: ['a1.md', 'a2.md'] },
      { id: 'source-b', paths: ['b1.md', 'b2.md', 'b3.md'] },
      { id: 'source-c', paths: ['c1.md'] },
    ];

    for (const source of sources) {
      await selectionStateManager.initializeState(source.id, source.paths.length, []);
      selectionStateManager.updateSelection(
        source.id,
        source.paths,
        false,
        enabledWorkspace.uri.fsPath,
      );
      await selectionStateManager.persistToDisk(source.id, enabledWorkspace.uri.fsPath);
    }

    // 等待所有持久化完成
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 2. 验证共享选择文件包含所有源
    const fullPath = path.join(enabledWorkspace.uri.fsPath, sharedFilePath);
    const content = await fs.readFile(fullPath, 'utf-8');
    const data = JSON.parse(content);

    for (const source of sources) {
      assert.ok(data.selections[source.id], `Should have selections for ${source.id}`);
      assert.deepStrictEqual(
        data.selections[source.id].paths,
        source.paths,
        `Should save correct paths for ${source.id}`,
      );
    }

    // 3. 清空内存状态并重新加载
    for (const source of sources) {
      selectionStateManager.clearState(source.id);
    }

    // 4. 验证可以从共享文件重新加载所有源
    for (const source of sources) {
      await selectionStateManager.initializeState(source.id, source.paths.length, []);
      const loadedPaths = selectionStateManager.getSelection(source.id);
      assert.deepStrictEqual(
        loadedPaths,
        source.paths,
        `Should reload correct paths for ${source.id}`,
      );
    }
  });
});
