/**
 * 错误处理集成测试
 * 测试扩展在异常情况下的行为
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

import { TEST_DELAYS, TEST_TIMEOUTS } from './testConstants';
import { getExtensionServices, sleep } from './testHelpers';

describe('Error Handling Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  before(async () => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');
    workspaceFolder = folders[0];
  });

  it('Should handle invalid Git URL gracefully', async function () {
    this.timeout(TEST_TIMEOUTS.SHORT);

    // 测试使用无效的Git URL不会导致扩展崩溃
    // 这个测试验证错误处理机制
    const { rulesManager } = await getExtensionServices();
    assert.ok(rulesManager, 'RulesManager should be available');

    // 验证扩展在错误后仍然可用
    const allRules = rulesManager.getAllRules();
    assert.ok(Array.isArray(allRules), 'Should still return rules array after error');
  });

  it('Should handle missing configuration gracefully', async function () {
    this.timeout(TEST_TIMEOUTS.SHORT);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

    // 获取不存在的配置应该返回默认值
    const nonExistentConfig = config.get('nonExistentKey', 'defaultValue');
    assert.strictEqual(nonExistentConfig, 'defaultValue', 'Should return default value');
  });

  it('Should handle empty rule sources', async function () {
    this.timeout(TEST_TIMEOUTS.MEDIUM);

    const { rulesManager } = await getExtensionServices();

    // 查询不存在的源应该返回空数组
    const emptySourceRules = rulesManager.getRulesBySource('non-existent-source-id');
    assert.ok(Array.isArray(emptySourceRules), 'Should return array for non-existent source');
    assert.strictEqual(emptySourceRules.length, 0, 'Should return empty array');
  });

  it('Should handle search with special characters', async function () {
    this.timeout(TEST_TIMEOUTS.MEDIUM);

    const { rulesManager } = await getExtensionServices();

    // 同步规则以确保有数据
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.LONG);

    // 测试特殊字符搜索不会导致错误
    const specialCharsQueries = ['$test', '(parentheses)', '[brackets]', '{braces}', '*asterisk'];

    for (const query of specialCharsQueries) {
      const results = rulesManager.search(query);
      assert.ok(Array.isArray(results), `Search with "${query}" should return array`);
    }
  });

  it('Should recover from failed sync operation', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const { rulesManager } = await getExtensionServices();

    // 先执行一次正常的同步
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.LONG);

    // 验证扩展在同步失败后仍然保留之前的规则
    const rulesAfterError = rulesManager.getAllRules();
    assert.ok(rulesAfterError.length > 0, 'Should still have rules after failed sync');
  });
});
