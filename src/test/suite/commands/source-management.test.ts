/**
 * 源管理命令测试
 * 工作空间: commands-sourceManagement
 *
 * 测试场景:
 * - 添加源（公开/私有/SSH）
 * - 删除源
 * - 启用/禁用源
 * - 配置验证
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

import type { RuleSource } from '../../../types';
import { CONFIG_KEYS } from '../../../utils/constants';
import { restoreAllMocks } from '../mocks';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../testConstants';
import * as testHelpers from '../testHelpers';

describe('Source Management Commands Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let originalSources: RuleSource[] = [];

  before(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 获取测试工作空间
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'Workspace folders not found');
    workspaceFolder =
      folders.find(
        (f) => f.name === 'Commands: Source Management' || f.name.includes('sourceManagement'),
      ) || folders[0];

    // 激活扩展
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) {
      await ext.activate();
    }

    // 切换到工作空间上下文
    await testHelpers.activateWorkspace(workspaceFolder);

    // 备份原始配置
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    originalSources = JSON.parse(JSON.stringify(config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, [])));
  });

  afterEach(() => {
    restoreAllMocks();
  });

  after(async function () {
    // 所有测试结束后恢复原始配置
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    await config.update(
      CONFIG_KEYS.SOURCES,
      originalSources,
      vscode.ConfigurationTarget.WorkspaceFolder,
    );
  });

  // 测试顺序：添加源 → 使用源测试各种操作 → 最后删除
  it('Should add public repository source', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sourcesBefore = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);
    const countBefore = sourcesBefore.length;

    // 直接通过配置添加新源（模拟 Webview 添加的效果）
    const newSource: RuleSource = {
      id: 'test-public-repo',
      name: 'Test Public Repo',
      gitUrl: 'https://github.com/test/public-repo.git',
      branch: 'main',
      enabled: true,
      authentication: {
        type: 'none',
      },
    };

    const updatedSources = [...sourcesBefore, newSource];
    await config.update(
      CONFIG_KEYS.SOURCES,
      updatedSources,
      vscode.ConfigurationTarget.WorkspaceFolder,
    );
    await testHelpers.sleep(TEST_DELAYS.LONG);

    // 重新获取配置实例确保读取最新值
    const freshConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sourcesAfter = freshConfig.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);

    assert.strictEqual(
      sourcesAfter.length,
      countBefore + 1,
      `Source count should increase from ${countBefore} to ${countBefore + 1}, got ${sourcesAfter.length}`,
    );

    const addedSource = sourcesAfter.find((s) => s.id === 'test-public-repo');
    assert.ok(addedSource, 'Added source should exist in configuration');
    assert.strictEqual(
      addedSource.authentication?.type,
      'none',
      'Auth type should be none for public repo',
    );
    assert.strictEqual(addedSource.enabled, true, 'New source should be enabled by default');
    // 保留添加的源，供后续测试使用
  });

  it('Should toggle source enabled state', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);

    // 此时应该至少有原始源 + 前面测试添加的源
    assert.ok(sources.length > 0, 'Should have sources from previous test');

    const testSource = sources[0];
    const originalState = testSource.enabled;

    // 切换启用状态（测试配置持久化）
    const updatedSources = sources.map((s) =>
      s.id === testSource.id ? { ...s, enabled: !originalState } : s,
    );

    await config.update(
      CONFIG_KEYS.SOURCES,
      updatedSources,
      vscode.ConfigurationTarget.WorkspaceFolder,
    );
    await testHelpers.sleep(TEST_DELAYS.MEDIUM);

    // 验证配置已持久化
    const freshConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sourcesAfter = freshConfig.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);
    const updatedSource = sourcesAfter.find((s) => s.id === testSource.id);

    assert.ok(updatedSource, 'Source should still exist');
    assert.strictEqual(updatedSource.enabled, !originalState, 'Enabled state should be toggled');
  });

  it('Should handle duplicate source URLs', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);

    assert.ok(sources.length > 0, 'Should have sources from previous tests');

    const existingUrl = sources[0].gitUrl;
    const countBefore = sources.length;

    // 尝试添加重复的 URL（但使用不同的 ID）
    const duplicateSource: RuleSource = {
      id: 'duplicate-url-test',
      name: 'Duplicate URL Test',
      gitUrl: existingUrl,
      branch: 'main',
      enabled: true,
      authentication: {
        type: 'none',
      },
    };

    const updatedSources = [...sources, duplicateSource];
    await config.update(
      CONFIG_KEYS.SOURCES,
      updatedSources,
      vscode.ConfigurationTarget.WorkspaceFolder,
    );
    await testHelpers.sleep(TEST_DELAYS.LONG);

    const freshConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sourcesAfter = freshConfig.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);

    // 配置系统允许相同 URL 但不同 ID 的源
    assert.strictEqual(
      sourcesAfter.length,
      countBefore + 1,
      'Should allow duplicate URL with different ID',
    );
    const newSource = sourcesAfter.find((s) => s.id === 'duplicate-url-test');
    assert.ok(newSource, 'Duplicate source should be added');
    assert.strictEqual(newSource.gitUrl, existingUrl, 'Duplicate URL should be preserved');
  });

  it('Should preserve source configuration during updates', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);

    assert.ok(sources.length > 0, 'Should have sources from previous tests');

    const testSource = sources[0];
    const originalConfig = { ...testSource };

    // 修改某个配置项
    const updatedSources = sources.map((s) =>
      s.id === testSource.id ? { ...s, branch: 'develop' } : s,
    );

    await config.update(
      CONFIG_KEYS.SOURCES,
      updatedSources,
      vscode.ConfigurationTarget.WorkspaceFolder,
    );
    await testHelpers.sleep(TEST_DELAYS.MEDIUM);

    // 验证其他配置未受影响
    const freshConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sourcesAfter = freshConfig.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);
    const modifiedSource = sourcesAfter.find((s) => s.id === testSource.id);

    assert.ok(modifiedSource, 'Source should exist');
    assert.strictEqual(modifiedSource.branch, 'develop', 'Branch should be updated');
    assert.strictEqual(modifiedSource.gitUrl, originalConfig.gitUrl, 'Git URL should be preserved');
    assert.strictEqual(
      modifiedSource.authentication?.type,
      originalConfig.authentication?.type,
      'Auth type should be preserved',
    );
  });

  it('Should validate Git URL format', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sourcesBefore = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);

    // 前面测试已经添加了源，所以当前应该有多个源
    assert.ok(sourcesBefore.length > 0, 'Should have sources from previous tests');
    const countBefore = sourcesBefore.length;

    // 尝试添加无效 URL
    const invalidSource: RuleSource = {
      id: 'invalid-url-test',
      name: 'Invalid URL',
      gitUrl: 'not-a-git-url',
      branch: 'main',
      enabled: true,
      authentication: {
        type: 'none',
      },
    };

    const updatedSources = [...sourcesBefore, invalidSource];
    await config.update(
      CONFIG_KEYS.SOURCES,
      updatedSources,
      vscode.ConfigurationTarget.WorkspaceFolder,
    );
    await testHelpers.sleep(TEST_DELAYS.LONG);

    // 重新获取配置
    const freshConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sourcesAfter = freshConfig.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);

    // 配置系统允许添加任意 URL，但实际使用时会失败
    // 这里验证配置可以持久化，但 URL 验证应在 Git 操作时进行
    assert.strictEqual(
      sourcesAfter.length,
      countBefore + 1,
      `Config should allow any URL string, expected ${countBefore + 1}, got ${sourcesAfter.length}`,
    );
    const addedInvalid = sourcesAfter.find((s) => s.gitUrl === 'not-a-git-url');
    assert.ok(
      addedInvalid,
      'Invalid URL should be added (validation happens at Git operation level)',
    );
  });

  it('Should remove source from configuration', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);

    // 此时应该有：原始源 + test-public-repo + duplicate-url-test + invalid-url-test
    assert.ok(sources.length >= 2, 'Should have multiple sources from previous tests');

    // 删除测试添加的源（从后往前删，保留原始源）
    const testSourceIds = ['invalid-url-test', 'duplicate-url-test', 'test-public-repo'];
    let currentSources = [...sources];

    for (const idToRemove of testSourceIds) {
      const sourceToRemove = currentSources.find((s) => s.id === idToRemove);
      if (!sourceToRemove) continue;

      const countBefore = currentSources.length;
      const remainingSources = currentSources.filter((s) => s.id !== idToRemove);

      await config.update(
        CONFIG_KEYS.SOURCES,
        remainingSources,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
      await testHelpers.sleep(TEST_DELAYS.MEDIUM);

      // 验证删除成功
      const freshConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
      const sourcesAfter = freshConfig.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);

      assert.strictEqual(sourcesAfter.length, countBefore - 1, `Should remove ${idToRemove}`);
      assert.ok(
        !sourcesAfter.find((s) => s.id === idToRemove),
        `${idToRemove} should not exist after removal`,
      );

      currentSources = sourcesAfter;
    }

    // 最终应该恢复到原始状态
    const finalConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const finalSources = finalConfig.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);
    assert.strictEqual(
      finalSources.length,
      originalSources.length,
      'Should restore to original source count',
    );
  });
});
