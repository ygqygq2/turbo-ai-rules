import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import {
  cleanupGeneratedFiles,
  createTempSettings,
  createTempWorkspace,
  verifyFileExists,
} from '../ready';

suite('Generate Config Files Tests', () => {
  let tempWorkspace: string;

  setup(() => {
    tempWorkspace = createTempWorkspace();
  });

  teardown(async () => {
    await cleanupGeneratedFiles(tempWorkspace);
  });

  test('Should generate .cursorrules file', async function () {
    this.timeout(90000);

    // 配置为只启用 Cursor 适配器
    await createTempSettings(tempWorkspace, 'cursor');

    // 添加并同步规则源
    const sourceUrl = 'https://github.com/PatrickF1/fzf.fish';
    await vscode.commands.executeCommand('turbo-ai-rules.addSource', sourceUrl);
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 生成配置文件
    await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');

    // 验证文件存在
    const cursorRulesPath = path.join(tempWorkspace, '.cursorrules');
    const exists = await verifyFileExists(cursorRulesPath);
    assert.ok(exists, '.cursorrules file should exist and not be empty');

    // 验证内容格式
    const content = await fs.readFile(cursorRulesPath, 'utf-8');
    assert.ok(content.includes('# '), 'Should contain rule headers');
    assert.ok(content.trim().split('\n').length > 5, 'Should have multiple lines of content');
  });

  test('Should generate GitHub Copilot instructions', async function () {
    this.timeout(90000);

    // 配置为只启用 Copilot 适配器
    await createTempSettings(tempWorkspace, 'copilot');

    // 添加并同步规则源
    const sourceUrl = 'https://github.com/PatrickF1/fzf.fish';
    await vscode.commands.executeCommand('turbo-ai-rules.addSource', sourceUrl);
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 生成配置文件
    await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');

    // 验证文件存在
    const copilotInstructionsPath = path.join(tempWorkspace, '.github', 'copilot-instructions.md');
    const exists = await verifyFileExists(copilotInstructionsPath);
    assert.ok(exists, 'copilot-instructions.md file should exist and not be empty');

    // 验证内容
    const content = await fs.readFile(copilotInstructionsPath, 'utf-8');
    assert.ok(content.includes('# '), 'Should contain markdown headers');
  });

  test('Should generate Continue.dev prompts', async function () {
    this.timeout(90000);

    // 配置为只启用 Continue 适配器
    await createTempSettings(tempWorkspace, 'continue');

    // 添加并同步规则源
    const sourceUrl = 'https://github.com/PatrickF1/fzf.fish';
    await vscode.commands.executeCommand('turbo-ai-rules.addSource', sourceUrl);
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 生成配置文件
    await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');

    // 验证文件存在
    const continuePromptsPath = path.join(tempWorkspace, '.continue', 'prompts', 'codebase.mdt');
    const exists = await verifyFileExists(continuePromptsPath);
    assert.ok(exists, 'codebase.mdt file should exist and not be empty');
  });

  test('Should generate rules directory structure', async function () {
    this.timeout(90000);

    // 配置为只启用 Rules 适配器
    await createTempSettings(tempWorkspace, 'rules');

    // 添加并同步规则源
    const sourceUrl = 'https://github.com/PatrickF1/fzf.fish';
    await vscode.commands.executeCommand('turbo-ai-rules.addSource', sourceUrl);
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 生成配置文件
    await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');

    // 验证 rules 目录存在
    const rulesDir = path.join(tempWorkspace, 'rules');
    const dirExists = await fs.pathExists(rulesDir);
    assert.ok(dirExists, 'rules directory should exist');

    // 验证 index.md 存在
    const indexPath = path.join(rulesDir, 'index.md');
    const indexExists = await verifyFileExists(indexPath);
    assert.ok(indexExists, 'rules/index.md should exist');

    // 验证至少有一个源的规则文件夹
    const subdirs = await fs.readdir(rulesDir);
    const hasSourceDir = subdirs.some((dir) => dir !== 'index.md');
    assert.ok(hasSourceDir, 'Should have at least one source subdirectory in rules/');

    // 验证源子目录中有规则文件
    if (hasSourceDir) {
      const sourceDir = subdirs.find((dir) => dir !== 'index.md');
      const sourceDirPath = path.join(rulesDir, sourceDir!);
      const stat = await fs.stat(sourceDirPath);
      if (stat.isDirectory()) {
        const ruleFiles = await fs.readdir(sourceDirPath);
        const hasMarkdownFiles = ruleFiles.some((file) => file.endsWith('.md'));
        assert.ok(hasMarkdownFiles, 'Source directory should contain .md rule files');
      }
    }
  });

  test('Should not generate files for disabled adapters', async function () {
    this.timeout(90000);

    // 配置为只启用 Cursor 适配器
    await createTempSettings(tempWorkspace, 'cursor');

    // 添加并同步规则源
    const sourceUrl = 'https://github.com/PatrickF1/fzf.fish';
    await vscode.commands.executeCommand('turbo-ai-rules.addSource', sourceUrl);
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 生成配置文件
    await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');

    // Cursor 文件应该存在
    const cursorExists = await fs.pathExists(path.join(tempWorkspace, '.cursorrules'));
    assert.ok(cursorExists, '.cursorrules should exist');

    // 其他适配器的文件不应该存在
    const copilotExists = await fs.pathExists(
      path.join(tempWorkspace, '.github', 'copilot-instructions.md'),
    );
    const continueExists = await fs.pathExists(
      path.join(tempWorkspace, '.continue', 'prompts', 'codebase.mdt'),
    );
    const rulesExists = await fs.pathExists(path.join(tempWorkspace, 'rules'));

    assert.ok(!copilotExists, 'Copilot instructions should not exist');
    assert.ok(!continueExists, 'Continue prompts should not exist');
    assert.ok(!rulesExists, 'Rules directory should not exist');
  });
});
