import * as assert from 'assert';
import * as vscode from 'vscode';

import { RulesManager } from '../../services/RulesManager';
import type { ParsedRule } from '../../types';
import { TEST_DELAYS, TEST_TIMEOUTS } from './testConstants';
import { executeCommandAndWait, switchToWorkspaceContext } from './testHelpers';

describe('Search Rules Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  beforeEach(() => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');
    workspaceFolder = folders[0];
  });

  it('Should search rules by keyword', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 切换到正确的工作区
    await switchToWorkspaceContext(workspaceFolder);

    // 先同步规则
    await executeCommandAndWait('turbo-ai-rules.syncRules', [], TEST_DELAYS.MEDIUM);

    // 获取 RulesManager 实例
    const rulesManager = RulesManager.getInstance();

    // 搜索规则（假设规则库中有关于 TypeScript 的规则）
    const searchResults = rulesManager.search('typescript');

    // 验证搜索结果
    if (searchResults.length > 0) {
      assert.ok(
        searchResults.some(
          (r: ParsedRule) =>
            r.content.toLowerCase().includes('typescript') ||
            r.title.toLowerCase().includes('typescript'),
        ),
        'Search results should contain the keyword',
      );
    }
  });

  it('Should handle search with no results', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    await switchToWorkspaceContext(workspaceFolder);
    await executeCommandAndWait('turbo-ai-rules.syncRules', [], TEST_DELAYS.MEDIUM);

    const rulesManager = RulesManager.getInstance();

    // 搜索一个不存在的关键词
    const searchResults = rulesManager.search('xyzabc123notfound');

    assert.strictEqual(searchResults.length, 0, 'Should return empty array for no matches');
  });

  it('Should search rules case-insensitively', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    await switchToWorkspaceContext(workspaceFolder);
    await executeCommandAndWait('turbo-ai-rules.syncRules', [], TEST_DELAYS.MEDIUM);

    const rulesManager = RulesManager.getInstance();

    // 搜索大写和小写关键词，结果应该相同
    const upperResults = rulesManager.search('TYPESCRIPT');
    const lowerResults = rulesManager.search('typescript');

    // 至少其中一个应该有结果，且结果数量应该相同
    if (upperResults.length > 0 || lowerResults.length > 0) {
      assert.strictEqual(
        upperResults.length,
        lowerResults.length,
        'Search should be case-insensitive',
      );
    }
  });
});
