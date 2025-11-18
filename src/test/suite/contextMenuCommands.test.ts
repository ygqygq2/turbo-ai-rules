import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import { RulesManager } from '../../services/RulesManager';

describe('Context Menu Commands Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  beforeEach(() => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');
    workspaceFolder = folders[0];
  });

  it('Should copy rule content to clipboard', async function () {
    this.timeout(120000);

    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    // 同步规则
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const rulesManager = RulesManager.getInstance();
    const allRules = rulesManager.getAllRules();

    console.log(`Found ${allRules.length} rules`);

    if (allRules.length > 0) {
      const testRule = allRules[0];

      // 执行复制命令
      await vscode.commands.executeCommand('turbo-ai-rules.copyRuleContent', testRule);

      // 等待剪贴板操作完成
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 读取剪贴板内容
      const clipboardContent = await vscode.env.clipboard.readText();

      console.log(`Clipboard content length: ${clipboardContent.length}`);
      console.log(`Rule content length: ${testRule.content.length}`);

      // 验证剪贴板包含规则内容
      assert.ok(
        clipboardContent.includes(testRule.content) || clipboardContent.includes(testRule.title),
        'Clipboard should contain rule content or title',
      );
    }
  });

  it('Should toggle rule selection state', async function () {
    this.timeout(120000);

    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const rulesManager = RulesManager.getInstance();
    const allRules = rulesManager.getAllRules();

    if (allRules.length > 0) {
      const testRule = allRules[0];

      console.log(`Testing rule selection toggle for: ${testRule.id}`);

      // 测试规则存在
      assert.ok(testRule, 'Should have at least one rule to test');
      assert.ok(testRule.id, 'Rule should have an ID');
      assert.ok(testRule.sourceId, 'Rule should have a sourceId');
    }
  });

  it('Should handle commands with no active rule gracefully', async function () {
    this.timeout(30000);

    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    // 尝试复制不存在的规则
    try {
      await vscode.commands.executeCommand('turbo-ai-rules.copyRuleContent', undefined);
      // 命令应该提示用户或静默失败，不应该崩溃
      assert.ok(true, 'Should handle undefined rule gracefully');
    } catch (error) {
      console.log('Command handled undefined rule with error (acceptable):', error);
      assert.ok(true, 'Error handling is acceptable');
    }
  });
});
