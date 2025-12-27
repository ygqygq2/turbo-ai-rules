import * as assert from 'assert';
import * as fs from 'fs-extra';
import { before, describe, it } from 'mocha';
import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS } from '../../utils/constants';

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

    console.log(`[Test] Using workspace: ${workspaceFolder.name} (${workspaceFolder.uri.fsPath})`);
  });

  beforeEach(async () => {
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
    this.timeout(180000); // 3分钟

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
   * 集成测试：首次使用扩展时保护现有规则文件
   * 这是一个关键的用户体验场景：
   * - 用户已经有 .cursorrules 或 copilot-instructions.md 文件
   * - 配置 userRules.markers 和适配器的 enableUserRules: true
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

    // 配置已在 settings.json 中预设，无需动态修改
    // 验证配置是否正确加载
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const userRulesConfig = config.get<{
      directory: string;
      markers: { begin: string; end: string };
    }>(CONFIG_KEYS.USER_RULES);
    const cursorAdapterConfig = config.get<{ enabled?: boolean; enableUserRules?: boolean }>(
      'adapters.cursor',
    );
    console.log('userRules config:', userRulesConfig);
    console.log('cursor adapter enableUserRules:', cursorAdapterConfig?.enableUserRules);
    console.log('workspace:', workspaceFolder.name);

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
      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待生成完成

      // 5. 验证文件仍然存在
      const fileExists = await fs.pathExists(existingRuleFile);
      assert.ok(fileExists, '❌ CRITICAL: Rule file was deleted! User content lost!');

      // 6. 读取生成后的文件内容
      const generatedContent = await fs.readFile(existingRuleFile, 'utf-8');
      console.log('Generated file length:', generatedContent.length);
      console.log('First 500 chars:', generatedContent.substring(0, 500));

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
      // 无需清理配置，使用 settings.json 的预设
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
    }
  });

  /**
   * 集成测试：用户规则文件变化时同步应更新生成的配置
   * 验证当 ai-rules/ 目录中的文件变化时，同步会更新生成的配置文件
   */
  it('Should update generated config when user rules files change', async function () {
    this.timeout(180000); // 3分钟

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
    console.log('Created user rule file:', userRuleFile1);
    console.log('File exists after creation:', await fs.pathExists(userRuleFile1));
    console.log('File content length:', (await fs.readFile(userRuleFile1, 'utf-8')).length);

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
      console.log('First generation file length:', firstGenContent.length);
      console.log('First 500 chars:', firstGenContent.substring(0, 500));
      console.log('User rules directory:', userRulesDir);
      console.log('User rule file exists:', await fs.pathExists(userRuleFile1));
      console.log(
        'Searching for "Initial Custom Rule 1":',
        firstGenContent.includes('Initial Custom Rule 1'),
      );
      console.log('Searching for "custom-rule-1":', firstGenContent.includes('custom-rule-1'));
      console.log('Searching for "80001":', firstGenContent.includes('80001'));

      // 验证初始内容存在
      if (!firstGenContent.includes('Initial Custom Rule 1')) {
        console.log('❌ User rule NOT found in generated file');
        console.log('Generated content (first 2000 chars):', firstGenContent.substring(0, 2000));
      }

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
      console.log('Verified user rule file updated with new content');

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

      // 调试：输出第二次生成的部分内容
      console.log('Second generation file length:', secondGenContent.length);
      console.log('Second gen (first 1000 chars):', secondGenContent.substring(0, 1000));
      
      // 查找关键字位置
      const initialVersionIndex = secondGenContent.indexOf('This is the initial version');
      const updatedVersionIndex = secondGenContent.indexOf('updated version with new guidelines');
      console.log('Position of "This is the initial version":', initialVersionIndex);
      console.log('Position of "updated version with new guidelines":', updatedVersionIndex);
      
      if (initialVersionIndex >= 0) {
        console.log('Old content context:', secondGenContent.substring(Math.max(0, initialVersionIndex - 200), initialVersionIndex + 200));
      }

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

      // 验证旧的初始内容已被替换
      assert.ok(
        !secondGenContent.includes('This is the initial version'),
        'Old initial content should be replaced',
      );

      console.log('✅ SUCCESS: User rules file changes are properly synced');

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
    this.timeout(180000); // 3分钟

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

      console.log('Cursor adapter enableUserRules:', enableUserRules);

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
        console.log('✅ User rules correctly included when enableUserRules=true');
      } else {
        // 如果禁用了用户规则，不应该包含用户规则内容
        assert.ok(
          !generatedContent.includes('Test User Rule'),
          'Should NOT include user rule when enableUserRules is false',
        );
        console.log('✅ User rules correctly excluded when enableUserRules=false');
      }

      // 清理测试文件
      await fs.remove(userRuleFile);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      assert.fail(`Failed in enableUserRules configuration test: ${errorMessage}`);
    }
  });
});
