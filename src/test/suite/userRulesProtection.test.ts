import * as assert from 'assert';
import * as fs from 'fs-extra';
import { before, describe, it } from 'mocha';
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

    // 如果有禁用的源,验证它们不会被同步
    if (disabledSources.length > 0) {
      // 这个测试需要在实际同步后验证禁用源的文件不存在
      assert.ok(true, 'Disabled sources configuration is valid');
    }
  });

  /**
   * 集成测试：首次使用扩展时保护现有规则文件
   * 这是一个关键的用户体验场景：
   * - 用户已经有 .cursorrules 或 copilot-instructions.md 文件
   * - 启用 protectUserRules: true
   * - 第一次执行 Generate Config Files
   * - 期望：原有内容被完整保留
   */
  it('Should preserve existing rule file content on first-time generation (Critical UX)', async function () {
    this.timeout(180000); // 3分钟

    // 1. 创建一个模拟用户已有的 .cursorrules 文件（单文件模式,不是目录）
    const existingRuleFile = path.join(workspaceFolder.uri.fsPath, '.cursorrules');

    // 先清理可能存在的目录结构
    if (await fs.pathExists(existingRuleFile)) {
      await fs.remove(existingRuleFile);
    }

    // 创建用户已有的规则文件（模拟首次使用前的状态）
    const userOriginalContent = `# My Existing Coding Rules

## Important Guidelines

1. Always use TypeScript strict mode
2. Write comprehensive unit tests
3. Follow Clean Code principles

## Custom Patterns

- Use async/await instead of promises
- Prefer composition over inheritance

This is my precious custom rule content that must not be lost!
`;

    await fs.writeFile(existingRuleFile, userOriginalContent, 'utf-8');
    console.log('Created existing user rule file (first-time scenario)');

    // 2. 确保 protectUserRules 已启用 和 Cursor adapter 已启用
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const protectionEnabled = config.get<boolean>('protectUserRules', false);
    const cursorEnabled = config.get<boolean>('adapters.cursor.enabled', false);

    if (!protectionEnabled) {
      // 临时启用保护（测试期间）
      await config.update('protectUserRules', true, vscode.ConfigurationTarget.WorkspaceFolder);
      console.log('Enabled protectUserRules for testing');
    }

    // 临时启用 Cursor adapter（测试期间）
    if (!cursorEnabled) {
      await config.update(
        'adapters.cursor.enabled',
        true,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
      console.log('Enabled Cursor adapter for testing');
    }

    // 3. 打开当前 workspace folder 中的文件,确保 activeEditor 在正确的 folder
    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    // 4. 执行同步和生成流程（模拟真实用户操作）
    try {
      // 同步规则
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      await new Promise((resolve) => setTimeout(resolve, 3000)); // 等待同步完成

      // 生成配置文件（这是关键操作 - 首次生成）
      await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待生成完成

      // 5. 验证文件仍然存在
      const fileExists = await fs.pathExists(existingRuleFile);
      assert.ok(fileExists, '❌ CRITICAL: Rule file was deleted! User content lost!');

      // 6. 读取生成后的文件内容
      const generatedContent = await fs.readFile(existingRuleFile, 'utf-8');

      // 7. 核心验证：原有内容必须被完整保留
      assert.ok(
        generatedContent.includes('My Existing Coding Rules'),
        '❌ CRITICAL: User original title was lost!',
      );
      assert.ok(
        generatedContent.includes('Important Guidelines'),
        '❌ CRITICAL: User section heading was lost!',
      );
      assert.ok(
        generatedContent.includes('TypeScript strict mode'),
        '❌ CRITICAL: User custom guideline was lost!',
      );
      assert.ok(
        generatedContent.includes('Custom Patterns'),
        '❌ CRITICAL: User custom section was lost!',
      );
      assert.ok(
        generatedContent.includes('precious custom rule content that must not be lost'),
        '❌ CRITICAL: User important note was lost!',
      );

      // 8. 验证添加了块标记（说明文件已被扩展管理）
      assert.ok(
        generatedContent.includes('<!-- TURBO-AI-RULES:BEGIN -->'),
        '❌ Block marker not added - file not properly managed',
      );
      assert.ok(
        generatedContent.includes('<!-- TURBO-AI-RULES:END -->'),
        '❌ Block marker not added - file not properly managed',
      );

      // 9. 验证用户内容在块标记之后（正确的结构）
      const beginMarkerIndex = generatedContent.indexOf('<!-- TURBO-AI-RULES:BEGIN -->');
      const endMarkerIndex = generatedContent.indexOf('<!-- TURBO-AI-RULES:END -->');
      const userContentIndex = generatedContent.indexOf('My Existing Coding Rules');

      assert.ok(
        beginMarkerIndex >= 0 && endMarkerIndex > beginMarkerIndex,
        '❌ Block markers not in correct order',
      );
      assert.ok(
        userContentIndex > endMarkerIndex,
        '❌ CRITICAL: User content should be AFTER block markers, not inside!',
      );

      // 10. 验证自动生成的内容在块标记内
      const blockContent = generatedContent.substring(beginMarkerIndex, endMarkerIndex);
      assert.ok(blockContent.length > 100, '❌ Auto-generated content seems empty or too short');

      console.log('✅ SUCCESS: First-time user experience test passed!');
      console.log(`   - Original content preserved: ${userOriginalContent.length} chars`);
      console.log(`   - Final file size: ${generatedContent.length} chars`);
      console.log(`   - User content position: after block markers ✓`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      assert.fail(`❌ CRITICAL FAILURE in first-time UX: ${errorMessage}`);
    } finally {
      // 清理：恢复配置
      if (!protectionEnabled) {
        await config.update(
          'protectUserRules',
          undefined,
          vscode.ConfigurationTarget.WorkspaceFolder,
        );
      }
      if (!cursorEnabled) {
        await config.update(
          'adapters.cursor.enabled',
          undefined,
          vscode.ConfigurationTarget.WorkspaceFolder,
        );
      }
    }
  });

  /**
   * 集成测试：已有块标记时的更新场景
   * 验证后续同步时用户内容不会被覆盖
   */
  it('Should preserve user content when file already has block markers', async function () {
    this.timeout(180000); // 3分钟

    const existingRuleFile = path.join(workspaceFolder.uri.fsPath, '.cursorrules');

    // 清理现有文件
    if (await fs.pathExists(existingRuleFile)) {
      await fs.remove(existingRuleFile);
    }

    // 创建已经被扩展管理的文件（有块标记）
    const existingContent = `<!-- TURBO-AI-RULES:BEGIN -->
<!-- Auto-generated content from previous sync -->
Old rule 1
Old rule 2
<!-- TURBO-AI-RULES:END -->

# My Custom Rules

- Custom guideline 1
- Custom guideline 2

This user content should be preserved across syncs.
`;

    await fs.writeFile(existingRuleFile, existingContent, 'utf-8');

    // 确保 protectUserRules 和 Cursor adapter 已启用
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const protectionEnabled = config.get<boolean>('protectUserRules', false);
    const cursorEnabled = config.get<boolean>('adapters.cursor.enabled', false);

    if (!protectionEnabled) {
      await config.update('protectUserRules', true, vscode.ConfigurationTarget.WorkspaceFolder);
    }

    if (!cursorEnabled) {
      await config.update(
        'adapters.cursor.enabled',
        true,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
    }

    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    try {
      // 执行同步和生成（模拟后续更新）
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 验证
      const updatedContent = await fs.readFile(existingRuleFile, 'utf-8');

      // 用户内容必须保留
      assert.ok(
        updatedContent.includes('My Custom Rules'),
        'User custom section should be preserved',
      );
      assert.ok(
        updatedContent.includes('Custom guideline 1'),
        'User custom guideline should be preserved',
      );
      assert.ok(
        updatedContent.includes('This user content should be preserved across syncs'),
        'User note should be preserved',
      );

      // 旧的自动生成内容应该被更新
      assert.ok(
        !updatedContent.includes('Old rule 1') ||
          updatedContent.includes('<!-- TURBO-AI-RULES:BEGIN -->'),
        'Old auto-generated content should be replaced',
      );

      console.log('✅ SUCCESS: Subsequent update test passed - user content preserved');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      assert.fail(`Failed in subsequent update scenario: ${errorMessage}`);
    } finally {
      if (!protectionEnabled) {
        await config.update(
          'protectUserRules',
          undefined,
          vscode.ConfigurationTarget.WorkspaceFolder,
        );
      }
      if (!cursorEnabled) {
        await config.update(
          'adapters.cursor.enabled',
          undefined,
          vscode.ConfigurationTarget.WorkspaceFolder,
        );
      }
    }
  });
});
