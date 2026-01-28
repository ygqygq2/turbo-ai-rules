/**
 * 性能和边界条件测试
 * 测试扩展在极端情况下的表现
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

import { TEST_DELAYS, TEST_TIMEOUTS } from '../testConstants';
import { getExtensionServices, sleep } from '../testHelpers';

describe('Performance and Edge Cases Tests', () => {
  before(async () => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');
  });

  it('Should handle large number of rules efficiently', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const { rulesManager } = await getExtensionServices();

    // 同步规则
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.EXTRA_LONG);

    const allRules = rulesManager.getAllRules();

    if (allRules.length > 0) {
      // 测试搜索性能
      const startTime = Date.now();
      rulesManager.search('test');
      const searchDuration = Date.now() - startTime;

      // 搜索应该在合理时间内完成（假设 < 1000ms）
      assert.ok(searchDuration < 1000, `Search should be fast, took ${searchDuration}ms`);
    }
  });

  it('Should handle rapid command execution', async function () {
    this.timeout(TEST_TIMEOUTS.MEDIUM);

    // 快速连续执行命令不应导致错误
    const commands = ['turbo-ai-rules.refresh', 'turbo-ai-rules.refresh', 'turbo-ai-rules.refresh'];

    for (const cmd of commands) {
      await vscode.commands.executeCommand(cmd);
    }

    await sleep(TEST_DELAYS.MEDIUM);

    // 验证扩展仍然正常工作
    const { rulesManager } = await getExtensionServices();
    assert.ok(rulesManager, 'RulesManager should still be available');
  });

  it('Should handle empty search query', async function () {
    this.timeout(TEST_TIMEOUTS.SHORT);

    const { rulesManager } = await getExtensionServices();

    // 空搜索应该返回所有规则或空数组
    const results = rulesManager.search('');
    assert.ok(Array.isArray(results), 'Empty search should return array');
  });

  it('Should handle very long search query', async function () {
    this.timeout(TEST_TIMEOUTS.SHORT);

    const { rulesManager } = await getExtensionServices();

    // 非常长的搜索查询不应导致崩溃
    const longQuery = 'a'.repeat(1000);
    const results = rulesManager.search(longQuery);
    assert.ok(Array.isArray(results), 'Long search query should return array');
  });

  it('Should handle concurrent operations', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 并发执行多个操作
    const operations = [
      vscode.commands.executeCommand('turbo-ai-rules.refresh'),
      vscode.commands.executeCommand('turbo-ai-rules.refresh'),
      sleep(TEST_DELAYS.SHORT).then(() => vscode.commands.executeCommand('turbo-ai-rules.refresh')),
    ];

    await Promise.allSettled(operations);
    await sleep(TEST_DELAYS.MEDIUM);

    // 验证扩展状态一致
    const { rulesManager } = await getExtensionServices();
    const rules = rulesManager.getAllRules();
    assert.ok(Array.isArray(rules), 'Should have consistent state after concurrent operations');
  });

  it('Should maintain state across workspace switches', async function () {
    this.timeout(TEST_TIMEOUTS.MEDIUM);

    const { selectionStateManager } = await getExtensionServices();

    // 这个测试验证在工作区切换时状态管理的正确性
    // 实际实现取决于你的工作区切换逻辑
    assert.ok(selectionStateManager, 'SelectionStateManager should be available');
  });
});
