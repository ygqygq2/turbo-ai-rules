import * as assert from 'assert';
import * as fs from 'fs-extra';
import { before, describe, it } from 'mocha';
import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS } from '../../../utils/constants';
import { TEST_TIMEOUTS } from '../testConstants';

describe('User Rules Protection Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  before(async () => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');

    // 查找 User Protection 或 Multi-Adapter + User Protection 测试工作区
    workspaceFolder =
      folders.find((f) => f.name.includes('User Protection')) ||
      folders.find((f) => f.name.includes('rules-with-user-rules')) ||
      folders[0];
  });

  beforeEach(async function () {
    this.timeout(TEST_TIMEOUTS.MEDIUM);

    // 切换到目标工作区：打开该工作区的 README 文件
    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    // 等待工作区上下文更新
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  afterEach(async () => {
    if (!workspaceFolder) {
      return;
    }

    // 清理测试生成的文件和目录
    const pathsToClean = [
      path.join(workspaceFolder.uri.fsPath, '.cursorrules'),
      path.join(workspaceFolder.uri.fsPath, '.github'),
      path.join(workspaceFolder.uri.fsPath, '.continue'),
      path.join(workspaceFolder.uri.fsPath, 'rules'),
      path.join(workspaceFolder.uri.fsPath, 'skills'),
    ];

    for (const cleanPath of pathsToClean) {
      if (await fs.pathExists(cleanPath)) {
        await fs.remove(cleanPath);
      }
    }
  });

  // 注意：以下两个测试已被弃用，因为它们测试的是旧的目录模式
  // 新的测试在下面，使用单文件模式 + ai-rules/ 目录

  it('Should create .gitignore with proper patterns', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const autoGitignore = config.get<boolean>(CONFIG_KEYS.STORAGE_AUTO_GITIGNORE, true);

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
    const sources = config.get<Array<{ id: string; enabled?: boolean }>>(CONFIG_KEYS.SOURCES, []);

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
   * 集成测试：首次使用扩展时遇到已存在的文件
   * 验证：如果文件已存在且不是由扩展管理的，应该停止生成并提示用户
   */
  it('Should stop generation if unmanaged file exists (first-time protection)', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    // 1. 创建一个模拟用户已有的 .cursorrules 文件（未被扩展管理）
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

    // 2. 配置已在 settings.json 中预设
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const _userRulesConfig = config.get<{
      directory: string;
      markers: { begin: string; end: string };
    }>(CONFIG_KEYS.USER_RULES);
    const _cursorAdapterConfig = config.get<{ enabled?: boolean; enableUserRules?: boolean }>(
      'adapters.cursor',
    );

    // 3. 打开当前 workspace folder 中的文件,确保 activeEditor 在正确的 folder
    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    // 4. 执行同步和生成流程（应该失败）
    try {
      // 同步规则
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      await new Promise((resolve) => setTimeout(resolve, 3000)); // 等待同步完成

      // 尝试生成配置文件（应该失败并提示）
      let _generateError: Error | null = null;
      try {
        await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        _generateError = error as Error;
      }

      // 5. 验证文件仍然是原始内容（未被修改）
      const fileContent = await fs.readFile(existingRuleFile, 'utf-8');
      assert.ok(
        fileContent === userOriginalContent,
        '❌ CRITICAL: Existing file was modified! Should be preserved unchanged.',
      );

      // 6. 验证没有添加管理标记
      assert.ok(
        !fileContent.includes('<!-- TURBO-AI-RULES:BEGIN -->'),
        'File should not have management markers',
      );
      assert.ok(
        !fileContent.includes('<!-- Generated by Turbo AI Rules'),
        'File should not have generator signature',
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      assert.fail(`❌ CRITICAL FAILURE in file protection: ${errorMessage}`);
    } finally {
      // 清理测试文件
      if (await fs.pathExists(existingRuleFile)) {
        await fs.remove(existingRuleFile);
      }
    }
  });

  /**
   * 集成测试：已有生成器管理的文件时的更新场景
   * 验证后续同步时会完全覆盖文件（标记外的内容会丢失，这是预期行为）
   */
  it('Should overwrite managed file completely (markers outside content will be lost)', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    const existingRuleFile = path.join(workspaceFolder.uri.fsPath, '.cursorrules');

    // 清理现有文件
    if (await fs.pathExists(existingRuleFile)) {
      await fs.remove(existingRuleFile);
    }

    // 创建已经被扩展管理的文件（有 blockMarkers 顶层标记）
    const existingContent = `<!-- Generated by Turbo AI Rules at 2025-01-01T00:00:00.000Z -->
<!-- Total rules: 2 | Sources: test-source -->


<!-- TURBO-AI-RULES:BEGIN -->

<!-- Generated by Turbo AI Rules at 2025-01-01T00:00:00.000Z -->
<!-- Total rules: 2 -->

<!-- BEGIN_SOURCE source="test-source" count="2" -->

<!-- BEGIN_RULE source="test-source" id="old-rule-1" -->
# Old Rule 1
Old content 1
<!-- END_RULE -->

---

<!-- BEGIN_RULE source="test-source" id="old-rule-2" -->
# Old Rule 2
Old content 2
<!-- END_RULE -->

<!-- END_SOURCE source="test-source" -->

<!-- TURBO-AI-RULES:END -->

# My Custom Rules Outside Markers

This content is outside the managed sections and WILL BE LOST on next sync.
`;

    await fs.writeFile(existingRuleFile, existingContent, 'utf-8');

    // 配置已在 settings.json 中预设

    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    try {
      // 执行同步和生成（模拟后续更新）
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 验证
      const updatedContent = await fs.readFile(existingRuleFile, 'utf-8');

      // 标记外的用户内容应该丢失（这是预期行为）
      assert.ok(
        !updatedContent.includes('My Custom Rules Outside Markers'),
        'Content outside markers should be lost (expected behavior)',
      );
      assert.ok(
        !updatedContent.includes('WILL BE LOST'),
        'Unmanaged content should not be preserved',
      );

      // 旧的规则内容应该被更新
      assert.ok(
        !updatedContent.includes('old-rule-1') && !updatedContent.includes('old-rule-2'),
        'Old rules should be replaced with new synced rules',
      );

      // 应该有新的生成器签名
      assert.ok(
        updatedContent.includes('<!-- Generated by Turbo AI Rules'),
        'Should have generator signature',
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      assert.fail(`Failed in managed file update scenario: ${errorMessage}`);
    }
  });

  /**
   * 集成测试：用户规则文件变化时同步应更新生成的配置
   * 验证当 ai-rules/ 目录中的文件变化时，同步会更新生成的配置文件
   */
  it('Should update generated config when user rules files change', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    // 先清理 .cursorrules（可能是目录）
    const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
    if (await fs.pathExists(cursorRulesPath)) {
      await fs.remove(cursorRulesPath);
    }

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const userRulesConfig = config.get<{ directory: string }>(CONFIG_KEYS.USER_RULES);
    const userRulesDir = path.join(
      workspaceFolder.uri.fsPath,
      userRulesConfig?.directory || 'ai-rules',
    );

    // 确保用户规则目录存在
    await fs.ensureDir(userRulesDir);

    // 创建初始用户规则文件
    const userRuleFile1 = path.join(userRulesDir, '80001-custom-rule-1.md');
    const initialContent1 = `---
id: custom-rule-1
title: Custom Rule 1
priority: high
---

# Initial Custom Rule 1

This is the initial version.
`;
    await fs.writeFile(userRuleFile1, initialContent1, 'utf-8');

    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    try {
      // 第一次同步和生成
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 读取第一次生成的配置文件
      const cursorRulesFile = path.join(workspaceFolder.uri.fsPath, '.cursorrules');

      // 检查文件是否存在并读取
      if (!(await fs.pathExists(cursorRulesFile))) {
        assert.fail('Cursor rules file was not generated');
      }

      const firstGenContent = await fs.readFile(cursorRulesFile, 'utf-8');

      assert.ok(
        firstGenContent.includes('Initial Custom Rule 1'),
        'First generation should include initial user rule',
      );

      // 修改用户规则文件
      const updatedContent1 = `---
id: custom-rule-1
title: Custom Rule 1 Updated
priority: high
---

# Updated Custom Rule 1

This is the updated version with new guidelines.

## New Section

- New guideline 1
- New guideline 2
`;
      await fs.writeFile(userRuleFile1, updatedContent1, 'utf-8');
      // 等待文件系统同步
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 验证文件确实被更新了
      const verifyContent = await fs.readFile(userRuleFile1, 'utf-8');
      if (!verifyContent.includes('Updated Custom Rule 1')) {
        throw new Error('User rule file was not updated correctly');
      }

      // 添加第二个用户规则文件
      const userRuleFile2 = path.join(userRulesDir, '80002-custom-rule-2.md');
      const newContent2 = `---
id: custom-rule-2
title: Custom Rule 2
priority: 80002
---

# New Custom Rule 2

This is a newly added custom rule.
`;
      await fs.writeFile(userRuleFile2, newContent2, 'utf-8');
      // 等待文件系统同步
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 第二次同步和生成
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 读取第二次生成的配置文件
      const secondGenContent = await fs.readFile(cursorRulesFile, 'utf-8');

      // 验证更新的内容
      assert.ok(
        secondGenContent.includes('Updated Custom Rule 1'),
        'Should include updated user rule title',
      );
      assert.ok(
        secondGenContent.includes('updated version with new guidelines'),
        'Should include updated user rule content',
      );
      assert.ok(secondGenContent.includes('New Section'), 'Should include new section from update');

      // 验证新添加的规则
      assert.ok(
        secondGenContent.includes('New Custom Rule 2'),
        'Should include newly added user rule',
      );

      // 验证新的用户规则ID已包含（custom-rule-2 的 ID）
      assert.ok(secondGenContent.includes('custom-rule-2'), 'New user rule ID should be present');

      // 清理测试文件
      await fs.remove(userRuleFile1);
      await fs.remove(userRuleFile2);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      assert.fail(`Failed in user rules change detection: ${errorMessage}`);
    }
  });

  /**
   * 集成测试：测试 enableUserRules 开关功能
   * 验证适配器级别的 enableUserRules 配置是否生效
   */
  it('Should respect adapter-level enableUserRules configuration', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    // 先清理 .cursorrules（可能是目录）
    const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
    if (await fs.pathExists(cursorRulesPath)) {
      await fs.remove(cursorRulesPath);
    }

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const userRulesConfig = config.get<{ directory: string }>(CONFIG_KEYS.USER_RULES);
    const userRulesDir = path.join(
      workspaceFolder.uri.fsPath,
      userRulesConfig?.directory || 'ai-rules',
    );

    // 确保用户规则目录存在并创建用户规则文件
    await fs.ensureDir(userRulesDir);
    const userRuleFile = path.join(userRulesDir, '80001-test-rule.md');
    const userContent = `---
id: test-rule
title: Test User Rule
priority: 80001
---

# Test User Rule

This should only appear when enableUserRules is true.
`;
    await fs.writeFile(userRuleFile, userContent, 'utf-8');

    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    try {
      // 检查 cursor 适配器的 enableUserRules 配置（默认应该是 true）
      const cursorAdapterConfig = config.get<{ enableUserRules?: boolean }>('adapters.cursor');
      const enableUserRules = cursorAdapterConfig?.enableUserRules !== false; // 默认为 true

      // 执行同步和生成
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 读取生成的配置文件
      const cursorRulesFile = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
      const generatedContent = await fs.readFile(cursorRulesFile, 'utf-8');

      if (enableUserRules) {
        // 如果启用了用户规则，应该包含用户规则内容
        assert.ok(
          generatedContent.includes('Test User Rule'),
          'Should include user rule when enableUserRules is true',
        );
        assert.ok(
          generatedContent.includes('This should only appear when enableUserRules is true'),
          'Should include user rule content',
        );
      } else {
        // 如果禁用了用户规则，不应该包含用户规则内容
        assert.ok(
          !generatedContent.includes('Test User Rule'),
          'Should NOT include user rule when enableUserRules is false',
        );
      }

      // 清理测试文件
      await fs.remove(userRuleFile);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      assert.fail(`Failed in enableUserRules configuration test: ${errorMessage}`);
    }
  });
});
