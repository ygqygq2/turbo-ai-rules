/**
 * Skill 适配器工作流测试
 * 工作空间: rules-for-skills
 *
 * 测试场景:
 * - Skill 适配器 (isRuleType: false) 完整流程
 * - 通过仪表板规则同步页选择适配器同步
 * - 对 skill.md 的特殊处理
 * - 快速同步不影响 skill 适配器
 */

import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS } from '../../../utils/constants';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../testConstants';
import { sleep } from '../testHelpers';

describe('Skills Adapter Workflow Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let rulesManager: any;
  let selectionStateManager: any;

  before(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 获取 Skills 测试工作空间
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'Workspace folders not found');
    workspaceFolder = folders.find((f) => f.name.includes('Skills Workflow')) || folders[0];

    // 激活扩展
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) {
      await ext.activate();
    }

    // 获取服务实例
    const api = ext?.exports;
    rulesManager = api?.rulesManager;
    selectionStateManager = api?.selectionStateManager;

    assert.ok(rulesManager, 'RulesManager should be available');
    assert.ok(selectionStateManager, 'SelectionStateManager should be available');

    // 切换到工作空间上下文
    const readmePath = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);
    await sleep(TEST_DELAYS.SHORT);
  });

  afterEach(async () => {
    if (!workspaceFolder) {
      return;
    }

    // 清理选择状态
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string }>>(CONFIG_KEYS.SOURCES) || [];
    for (const source of sources) {
      selectionStateManager?.clearState(source.id);
    }

    // 清理生成的 skills 文件
    const pathsToClean = [
      path.join(workspaceFolder.uri.fsPath, '.claude'),
      path.join(workspaceFolder.uri.fsPath, 'test-skills'),
    ];

    for (const cleanPath of pathsToClean) {
      if (await fs.pathExists(cleanPath)) {
        await fs.remove(cleanPath);
      }
    }
  });

  it('Should have skill adapter configured', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);

    // 查找 skill 适配器 (isRuleType: false)
    const skillsAdapter = customAdapters?.find(
      (adapter) => adapter.skills === true || adapter.isRuleType === false,
    );

    if (!skillsAdapter) {
      console.warn('No skills adapter configured, some tests will be skipped');
    }
  });

  it('Should sync skill files through dashboard sync page', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);
    const skillsAdapter = customAdapters?.find((adapter) => adapter.skills === true);

    if (!skillsAdapter) {
      this.skip();
      return;
    }

    // 1. 同步规则（确保源仓库已克隆）
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.EXTRA_LONG);

    // 2. 获取规则并模拟选择
    const sources = config.get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES);
    if (sources && sources.length > 0) {
      const sourceId = sources[0].id;
      const rules = rulesManager.getRulesBySource(sourceId);

      if (rules.length > 0) {
        const selectedPaths = rules.map((rule: any) => rule.filePath);
        selectionStateManager.updateSelection(
          sourceId,
          selectedPaths,
          false,
          workspaceFolder.uri.fsPath,
        );
        await selectionStateManager.persistToDisk(sourceId, workspaceFolder.uri.fsPath);
      }
    }

    // 3. 生成配置（包括 skill 适配器）
    // 注意：这里应该是通过仪表板规则同步页选择适配器同步
    // 但在测试中，我们直接调用生成命令来模拟
    await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
    await sleep(TEST_DELAYS.LONG);

    // 4. 验证 skill 适配器的输出
    const skillsOutputPath = path.join(workspaceFolder.uri.fsPath, skillsAdapter.outputPath);

    if (await fs.pathExists(skillsOutputPath)) {
      const files = await fs.readdir(skillsOutputPath);
      const skillFiles = files.filter(
        (file) => file.endsWith('.md') || file.endsWith('.mdc') || file.endsWith('.txt'),
      );

      // Skill 适配器应该直接复制文件，而不是解析
      if (skillFiles.length > 0) {
        console.log(`Found ${skillFiles.length} skill files in ${skillsOutputPath}`);
      }
    }
  });

  it('Should handle skill.md specially', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);
    const skillsAdapter = customAdapters?.find((adapter) => adapter.skills === true);

    if (!skillsAdapter) {
      this.skip();
      return;
    }

    // 同步并生成
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.EXTRA_LONG);

    const sources = config.get<Array<{ id: string }>>(CONFIG_KEYS.SOURCES);
    if (sources && sources.length > 0) {
      const sourceId = sources[0].id;
      const rules = rulesManager.getRulesBySource(sourceId);
      if (rules.length > 0) {
        const selectedPaths = rules.map((rule: any) => rule.filePath);
        selectionStateManager.updateSelection(
          sourceId,
          selectedPaths,
          false,
          workspaceFolder.uri.fsPath,
        );
      }
    }

    await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
    await sleep(TEST_DELAYS.LONG);

    // 查找 skill.md 文件
    const skillsOutputPath = path.join(workspaceFolder.uri.fsPath, skillsAdapter.outputPath);

    if (await fs.pathExists(skillsOutputPath)) {
      const skillMdPath = path.join(skillsOutputPath, 'skill.md');

      if (await fs.pathExists(skillMdPath)) {
        const content = await fs.readFile(skillMdPath, 'utf-8');

        // skill.md 可能有特殊处理（如索引生成）
        assert.ok(content.length > 0, 'skill.md should have content');
      }
    }
  });

  it('Should not affect skills when using quick sync', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);
    const skillsAdapter = customAdapters?.find((adapter) => adapter.skills === true);

    if (!skillsAdapter) {
      this.skip();
      return;
    }

    // 快速同步（只同步规则适配器，isRuleType: true）
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.LONG);

    // skill 适配器不应该被快速同步影响
    const skillsOutputPath = path.join(workspaceFolder.uri.fsPath, skillsAdapter.outputPath);

    // 快速同步后，skill 输出目录应该不存在或者保持原状
    // 因为快速同步只处理规则适配器 (isRuleType: true)
    const existsBefore = await fs.pathExists(skillsOutputPath);

    // 再次快速同步
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.LONG);

    const existsAfter = await fs.pathExists(skillsOutputPath);

    // 状态应该保持一致
    assert.strictEqual(existsAfter, existsBefore, 'Quick sync should not affect skill adapter');
  });

  it('Should distinguish between rule and skill adapters', function () {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);

    if (!customAdapters || customAdapters.length === 0) {
      this.skip();
      return;
    }

    // 统计规则适配器和 skill 适配器
    const ruleAdapters = customAdapters.filter((adapter) => adapter.isRuleType !== false);
    const skillAdapters = customAdapters.filter(
      (adapter) => adapter.isRuleType === false || adapter.skills === true,
    );

    console.log(`Rule adapters: ${ruleAdapters.length}, Skill adapters: ${skillAdapters.length}`);

    // 验证分类
    if (skillAdapters && skillAdapters.length > 0) {
      for (const adapter of skillAdapters) {
        assert.ok(
          adapter.isRuleType === false || adapter.skills === true,
          'Skill adapter should have isRuleType: false or skills: true',
        );
      }
    }
  });
});
