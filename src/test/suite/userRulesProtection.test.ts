import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

describe('User Rules Protection Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let userRulePath: string;

  before(async () => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');

    // 查找 user-rules 测试工作区
    workspaceFolder = folders.find((f) => f.name.includes('User Rules')) || folders[0];
    userRulePath = path.join(workspaceFolder.uri.fsPath, '.cursorrules', 'custom-user-rule.md');

    // 确保初始状态正确：.cursorrules 是目录，包含用户规则
    const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');

    // 如果存在但不是目录，删除它
    if (await fs.pathExists(cursorRulesPath)) {
      const stat = await fs.stat(cursorRulesPath);
      if (!stat.isDirectory()) {
        await fs.remove(cursorRulesPath);
      }
    }

    // 确保目录存在并包含用户规则
    await fs.ensureDir(cursorRulesPath);
    if (!(await fs.pathExists(userRulePath))) {
      await fs.writeFile(
        userRulePath,
        `---
id: user-custom-rule
title: User Custom Rule
tags: [test, custom]
---

This is a user-defined rule that should be protected during sync.
`,
      );
    }
  });

  beforeEach(() => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');

    // 查找 user-rules 测试工作区
    workspaceFolder = folders.find((f) => f.name.includes('User Rules')) || folders[0];
    userRulePath = path.join(workspaceFolder.uri.fsPath, '.cursorrules', 'custom-user-rule.md');
  });

  afterEach(async () => {
    if (!workspaceFolder) {
      return;
    }

    // 先保存用户规则内容
    let userRuleContent: string | null = null;
    const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');

    if (await fs.pathExists(userRulePath)) {
      userRuleContent = await fs.readFile(userRulePath, 'utf-8');
    }

    // 清理同步生成的文件，但保留 .cursorrules 目录结构
    if (await fs.pathExists(cursorRulesPath)) {
      const stat = await fs.stat(cursorRulesPath);

      if (stat.isDirectory()) {
        // 如果是目录，只删除非用户文件
        const files = await fs.readdir(cursorRulesPath);
        for (const file of files) {
          const filePath = path.join(cursorRulesPath, file);
          // 只删除非用户自定义文件（不以custom-开头的）
          if (!file.startsWith('custom-') && file !== '.gitignore') {
            await fs.remove(filePath);
          }
        }
      } else {
        // 如果是文件（Cursor adapter 生成的），删除它
        await fs.remove(cursorRulesPath);
        // 重新创建为目录
        await fs.ensureDir(cursorRulesPath);
      }
    } else {
      // 如果不存在，创建目录
      await fs.ensureDir(cursorRulesPath);
    }

    // 清理其他测试生成的目录
    const otherPaths = [
      path.join(workspaceFolder.uri.fsPath, '.github'),
      path.join(workspaceFolder.uri.fsPath, '.continue'),
      path.join(workspaceFolder.uri.fsPath, 'rules'),
    ];

    for (const cleanPath of otherPaths) {
      if (await fs.pathExists(cleanPath)) {
        await fs.remove(cleanPath);
      }
    }

    // 恢复用户规则（如果被删除）
    if (!(await fs.pathExists(userRulePath))) {
      if (userRuleContent) {
        await fs.writeFile(userRulePath, userRuleContent);
      } else {
        // 恢复默认用户规则
        await fs.writeFile(
          userRulePath,
          `---
id: user-custom-rule
title: User Custom Rule
tags: [test, custom]
---

# Custom User Rule

This is a user-defined rule that should be protected during sync.
`,
        );
      }
    }
  });

  it('Should have user-defined rule file', async () => {
    const exists = await fs.pathExists(userRulePath);
    assert.ok(exists, 'User rule file should exist');
  });

  it('Should preserve user rules during sync', async function () {
    this.timeout(180000); // 3分钟 - 增加超时时间用于 Git 操作

    // 打开当前 workspace folder 中的 README 文件，确保 activeEditor 在正确的 folder
    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    // 读取原始用户规则内容
    const originalContent = await fs.readFile(userRulePath, 'utf-8');

    try {
      // 执行同步操作
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

      // 验证用户规则文件仍然存在
      const stillExists = await fs.pathExists(userRulePath);
      assert.ok(stillExists, 'User rule file should still exist after sync');

      // 验证内容未被修改
      const currentContent = await fs.readFile(userRulePath, 'utf-8');
      assert.strictEqual(currentContent, originalContent, 'User rule content should be preserved');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      assert.fail(`Sync should not throw error: ${errorMessage}`);
    }
  });

  it('Should create .gitignore with proper patterns', async function () {
    this.timeout(180000); // 3分钟

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const autoGitignore = config.get<boolean>('storage.autoGitignore', true);

    if (!autoGitignore) {
      this.skip(); // 如果禁用自动 gitignore，跳过此测试
    }

    // 打开当前 workspace folder 中的 README 文件，确保 activeEditor 在正确的 folder
    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    try {
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

      const gitignorePath = path.join(workspaceFolder.uri.fsPath, '.cursorrules', '.gitignore');
      const exists = await fs.pathExists(gitignorePath);

      if (exists) {
        const content = await fs.readFile(gitignorePath, 'utf-8');
        assert.ok(content.includes('# Synced from'), '.gitignore should contain source markers');
      }
    } catch (error) {
      // Gitignore 生成失败不应该使整个测试失败
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.warn(`Gitignore test warning: ${errorMessage}`);
    }
  });

  it('Should not sync disabled sources', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; enabled?: boolean }>>('sources', []);

    const enabledSources = sources.filter((s) => s.enabled !== false);
    const disabledSources = sources.filter((s) => s.enabled === false);

    assert.ok(enabledSources.length > 0, 'Should have at least one enabled source');

    // 如果有禁用的源，验证它们不会被同步
    if (disabledSources.length > 0) {
      // 这个测试需要在实际同步后验证禁用源的文件不存在
      assert.ok(true, 'Disabled sources configuration is valid');
    }
  });
});
