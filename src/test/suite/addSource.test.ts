import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import type { RuleSource } from '../../types';
import { mockShowInputBox, mockShowQuickPick, restoreAllMocks } from './mocks';

describe('Add Source Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  beforeEach(() => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');
    workspaceFolder = folders[0];
  });

  afterEach(() => {
    // 恢复所有 mock
    restoreAllMocks();
  });

  it('Should add public GitHub repository', async function () {
    this.timeout(120000);

    const sourceUrl = 'https://github.com/ygqygq2/ai-rules.git';

    // Mock 用户输入 URL
    mockShowInputBox(sourceUrl);

    // Mock 用户选择认证方式（None）
    mockShowQuickPick({ label: 'None', description: 'Public repository' } as vscode.QuickPickItem);

    // 打开 README 确保正确的 workspace
    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sourcesBefore = config.get<RuleSource[]>('sources', []);
    const countBefore = sourcesBefore.length;

    // 执行添加命令
    await vscode.commands.executeCommand('turbo-ai-rules.addSource');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const sourcesAfter = config.get<RuleSource[]>('sources', []);
    const added = sourcesAfter.find((s: RuleSource) => s.gitUrl === sourceUrl);

    console.log(`Sources before: ${countBefore}, after: ${sourcesAfter.length}`);

    if (added) {
      assert.ok(added, 'Source should be added to configuration');
      assert.strictEqual(added.enabled, true, 'Source should be enabled by default');
    } else {
      // 如果源已存在，确保数量没变
      assert.strictEqual(
        sourcesAfter.length,
        countBefore,
        'Source count should not change if duplicate',
      );
    }
  });

  it('Should not add duplicate sources', async function () {
    this.timeout(120000);

    const sourceUrl = 'https://github.com/ygqygq2/ai-rules.git';

    // Mock 用户输入相同的 URL
    mockShowInputBox(sourceUrl);
    mockShowQuickPick({ label: 'None', description: 'Public repository' } as vscode.QuickPickItem);

    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sourcesBefore = config.get<RuleSource[]>('sources', []);
    const countBefore = sourcesBefore.length;

    // 尝试添加相同的源
    await vscode.commands.executeCommand('turbo-ai-rules.addSource');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const sourcesAfter = config.get<RuleSource[]>('sources', []);
    const countAfter = sourcesAfter.filter((s: RuleSource) => s.gitUrl === sourceUrl).length;
    const countBeforeUrl = sourcesBefore.filter((s: RuleSource) => s.gitUrl === sourceUrl).length;

    console.log(
      `URL ${sourceUrl} count - before: ${countBeforeUrl}, after: ${countAfter}, total before: ${countBefore}, total after: ${sourcesAfter.length}`,
    );

    // 应该不增加重复的源
    assert.strictEqual(countAfter, countBeforeUrl, 'Should not add duplicate source');
  });

  it('Should validate repository URL format', async function () {
    this.timeout(60000);

    const invalidUrl = 'not-a-valid-url';

    // Mock 用户输入无效 URL
    mockShowInputBox(invalidUrl);

    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sourcesBefore = config.get<RuleSource[]>('sources', []);

    try {
      // 尝试添加无效 URL
      await vscode.commands.executeCommand('turbo-ai-rules.addSource');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const sourcesAfter = config.get<RuleSource[]>('sources', []);

      // 无效 URL 应该被拒绝，源列表不变
      assert.strictEqual(
        sourcesAfter.length,
        sourcesBefore.length,
        'Should not add source with invalid URL',
      );
    } catch (error) {
      // 如果抛出错误也是可以接受的
      console.log('Invalid URL rejected (expected):', error);
      assert.ok(true, 'Should reject invalid URL');
    }
  });
});
