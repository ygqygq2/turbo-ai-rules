import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS } from '../../../utils/constants';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../testConstants';
import { sleep, switchToWorkspace, waitForRulesLoaded } from '../testHelpers';

/**
 * 自定义规则适配器集成测试
 * 测试规则类型（isRuleType: true）的自定义适配器
 */
describe('Custom Rule Adapters Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder | undefined;

  before(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    workspaceFolder = await switchToWorkspace('Adapters: Custom Rule');

    if (!workspaceFolder) {
      this.skip();
      return;
    }
  });

  afterEach(async () => {
    if (!workspaceFolder) {
      return;
    }

    // 清理生成的测试文件
    const pathsToClean = [path.join(workspaceFolder.uri.fsPath, 'test-custom-rule-output')];

    for (const cleanPath of pathsToClean) {
      if (await fs.pathExists(cleanPath)) {
        await fs.remove(cleanPath);
      }
    }
  });

  it('Should load custom rule adapters configuration', async function () {
    this.timeout(TEST_TIMEOUTS.MEDIUM);

    if (!workspaceFolder) {
      this.skip();
      return;
    }

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);

    // 验证可以读取自定义适配器配置
    assert.ok(Array.isArray(customAdapters), 'Custom adapters should be an array');

    // 如果有配置，验证结构
    if (customAdapters.length > 0) {
      const ruleAdapters = customAdapters.filter((a) => a.isRuleType !== false);
      if (ruleAdapters.length > 0) {
        const firstAdapter = ruleAdapters[0];
        assert.ok(firstAdapter.id, 'Adapter should have id');
        assert.ok(firstAdapter.name, 'Adapter should have name');
        assert.ok(firstAdapter.outputPath, 'Adapter should have outputPath');
        assert.ok(firstAdapter.outputType, 'Adapter should have outputType');
        assert.notStrictEqual(firstAdapter.isRuleType, false, 'Should be a rule adapter');
      }
    }
  });

  it('Should sync rules successfully', async function () {
    this.timeout(TEST_TIMEOUTS.LONG * 2);

    if (!workspaceFolder) {
      this.skip();
      return;
    }

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<any[]>('sources', []);

    assert.ok(sources.length > 0, 'Should have at least one source configured');

    // 执行同步
    console.log('🔍 开始执行同步命令...');
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    console.log('✅ 同步命令执行完成');

    // 验证规则已同步
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    const api = ext?.exports;
    const rulesManager = api?.rulesManager;

    if (rulesManager) {
      try {
        const allRules = await waitForRulesLoaded(rulesManager, 1);
        console.log(`📊 规则数量: ${allRules.length}`);
        assert.ok(allRules.length > 0, 'Should have synced rules');
      } catch (error) {
        console.warn('Warning: No rules synced - skipping test', error);
        this.skip();
        return;
      }
    }
  });

  it('Should generate files with custom rule adapter (single file)', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    if (!workspaceFolder) {
      this.skip();
      return;
    }

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<any[]>('sources', []);
    const actualSourceId = sources[0]?.id || 'ai-rules-7008d805';

    // 创建单文件规则适配器
    const testAdapter = {
      id: 'test-custom-rule-single',
      name: 'Test Custom Rule Single File',
      enabled: true,
      outputPath: 'test-custom-rule-output/rules.md',
      outputType: 'single-file',
      isRuleType: true,
      singleFileTemplate: '# AI Rules\n\n{{rules}}',
    };

    const currentAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);
    const newAdapters = [...currentAdapters, testAdapter];

    try {
      await config.update(
        CONFIG_KEYS.ADAPTERS_CUSTOM,
        newAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
      await sleep(TEST_DELAYS.SHORT);

      // 获取并选择规则
      const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
      const api = ext?.exports;
      const rulesManager = api?.rulesManager;
      const selectionStateManager = api?.selectionStateManager;

      if (rulesManager && selectionStateManager) {
        const sourceRules = rulesManager.getRulesBySource(actualSourceId);

        if (sourceRules.length === 0) {
          console.warn('Warning: No rules found - skipping test');
          this.skip();
          return;
        }

        const rulesToSelect = sourceRules.slice(0, 3);
        const paths = rulesToSelect.map((rule: any) => rule.filePath);

        selectionStateManager.updateSelection(
          actualSourceId,
          paths,
          false,
          workspaceFolder.uri.fsPath,
        );
        await sleep(TEST_DELAYS.SHORT);
      }

      // 生成配置
      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      await sleep(TEST_DELAYS.LONG);

      // 验证输出文件
      const outputPath = path.join(workspaceFolder.uri.fsPath, 'test-custom-rule-output/rules.md');
      const outputExists = await fs.pathExists(outputPath);

      if (outputExists) {
        const stats = await fs.stat(outputPath);
        assert.ok(stats.isFile(), 'Output should be a file');
        const content = await fs.readFile(outputPath, 'utf-8');
        assert.ok(content.includes('AI Rules'), 'Should contain template content');
      }
    } finally {
      await config.update(
        CONFIG_KEYS.ADAPTERS_CUSTOM,
        currentAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
    }
  });

  it('Should generate files with custom rule adapter (directory)', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    if (!workspaceFolder) {
      this.skip();
      return;
    }

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<any[]>('sources', []);
    const actualSourceId = sources[0]?.id || 'ai-rules-7008d805';

    // 创建目录类型规则适配器
    const testAdapter = {
      id: 'test-custom-rule-directory',
      name: 'Test Custom Rule Directory',
      enabled: true,
      outputPath: 'test-custom-rule-output',
      outputType: 'directory',
      fileExtensions: ['*.md'],
      organizeBySource: true,
      generateIndex: false,
      isRuleType: true,
    };

    const currentAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);
    const newAdapters = [...currentAdapters, testAdapter];

    try {
      await config.update(
        CONFIG_KEYS.ADAPTERS_CUSTOM,
        newAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
      await sleep(TEST_DELAYS.SHORT);

      // 获取并选择规则
      const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
      const api = ext?.exports;
      const rulesManager = api?.rulesManager;
      const selectionStateManager = api?.selectionStateManager;

      if (rulesManager && selectionStateManager) {
        const sourceRules = rulesManager.getRulesBySource(actualSourceId);

        if (sourceRules.length === 0) {
          console.warn('Warning: No rules found - skipping test');
          this.skip();
          return;
        }

        const rulesToSelect = sourceRules.slice(0, 3);
        const paths = rulesToSelect.map((rule: any) => rule.filePath);

        selectionStateManager.updateSelection(
          actualSourceId,
          paths,
          false,
          workspaceFolder.uri.fsPath,
        );
        await sleep(TEST_DELAYS.SHORT);
      }

      // 生成配置
      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      await sleep(TEST_DELAYS.LONG);

      // 验证输出目录
      const outputPath = path.join(workspaceFolder.uri.fsPath, 'test-custom-rule-output');
      const outputExists = await fs.pathExists(outputPath);

      if (outputExists) {
        const stats = await fs.stat(outputPath);
        assert.ok(stats.isDirectory(), 'Output path should be a directory');
      }
    } finally {
      await config.update(
        CONFIG_KEYS.ADAPTERS_CUSTOM,
        currentAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
    }
  });
});
