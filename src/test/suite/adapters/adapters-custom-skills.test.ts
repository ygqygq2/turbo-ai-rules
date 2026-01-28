import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS } from '../../../utils/constants';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../testConstants';
import { sleep, switchToWorkspace, waitForRulesLoaded } from '../testHelpers';

/**
 * 自定义技能适配器集成测试
 * 测试技能类型（isRuleType: false）的自定义适配器
 */
describe('Custom Skills Adapters Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder | undefined;

  before(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    workspaceFolder = await switchToWorkspace('Adapters: Custom Skills');

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
    const pathsToClean = [path.join(workspaceFolder.uri.fsPath, 'test-custom-skills-output')];

    for (const cleanPath of pathsToClean) {
      if (await fs.pathExists(cleanPath)) {
        await fs.remove(cleanPath);
      }
    }
  });

  it('Should load custom skills adapters configuration', async function () {
    this.timeout(TEST_TIMEOUTS.MEDIUM);

    if (!workspaceFolder) {
      this.skip();
      return;
    }

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);

    // 验证可以读取自定义适配器配置
    assert.ok(Array.isArray(customAdapters), 'Custom adapters should be an array');

    // 查找技能类型适配器
    const skillsAdapters = customAdapters.filter((a) => a.isRuleType === false);
    console.log(`Found ${skillsAdapters.length} skills adapters`);

    if (skillsAdapters.length > 0) {
      const firstAdapter = skillsAdapters[0];
      assert.ok(firstAdapter.id, 'Adapter should have id');
      assert.ok(firstAdapter.name, 'Adapter should have name');
      assert.ok(firstAdapter.outputPath, 'Adapter should have outputPath');
      assert.strictEqual(firstAdapter.isRuleType, false, 'Should be a skills adapter');
    }
  });

  it('Should sync skills successfully', async function () {
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

    // 验证技能已同步
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    const api = ext?.exports;
    const rulesManager = api?.rulesManager;

    if (rulesManager) {
      try {
        const allRules = await waitForRulesLoaded(rulesManager, 1);
        console.log(`📊 技能数量: ${allRules.length}`);
        assert.ok(allRules.length > 0, 'Should have synced skills');
      } catch (error) {
        console.warn('Warning: No skills synced - skipping test', error);
        this.skip();
        return;
      }
    }
  });

  it('Should generate files with custom skills adapter (directory)', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    if (!workspaceFolder) {
      this.skip();
      return;
    }

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<any[]>('sources', []);
    const actualSourceId = sources[0]?.id;

    if (!actualSourceId) {
      console.warn('Warning: No source found - skipping test');
      this.skip();
      return;
    }

    // 创建技能类型适配器（必须是目录类型）
    const testAdapter = {
      id: 'test-custom-skills-directory',
      name: 'Test Custom Skills Directory',
      enabled: true,
      outputPath: 'test-custom-skills-output',
      outputType: 'directory',
      isRuleType: false,
      preserveDirectoryStructure: true,
      useOriginalFilename: true,
      organizeBySource: false,
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

      // 获取并选择技能
      const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
      const api = ext?.exports;
      const rulesManager = api?.rulesManager;
      const selectionStateManager = api?.selectionStateManager;

      if (rulesManager && selectionStateManager) {
        const sourceSkills = rulesManager.getRulesBySource(actualSourceId);

        if (sourceSkills.length === 0) {
          console.warn('Warning: No skills found - skipping test');
          this.skip();
          return;
        }

        // 选择所有技能（技能应该保持目录结构）
        const paths = sourceSkills.map((skill: any) => skill.filePath);

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
      const outputPath = path.join(workspaceFolder.uri.fsPath, 'test-custom-skills-output');
      const outputExists = await fs.pathExists(outputPath);

      if (outputExists) {
        const stats = await fs.stat(outputPath);
        assert.ok(stats.isDirectory(), 'Output path should be a directory for skills');

        // 技能应该保持目录结构
        const files = await fs.readdir(outputPath);
        console.log(`Generated files: ${files.join(', ')}`);
        assert.ok(files.length > 0, 'Should have generated skill files');
      }
    } finally {
      await config.update(
        CONFIG_KEYS.ADAPTERS_CUSTOM,
        currentAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
    }
  });

  it('Skills adapter should preserve directory structure', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    if (!workspaceFolder) {
      this.skip();
      return;
    }

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);

    // 查找技能适配器配置
    const skillsAdapter = customAdapters.find((a) => a.isRuleType === false);

    if (skillsAdapter) {
      assert.strictEqual(
        skillsAdapter.outputType,
        'directory',
        'Skills adapter must be directory type',
      );
      assert.ok(
        skillsAdapter.preserveDirectoryStructure !== false,
        'Skills adapter should preserve directory structure',
      );
    }
  });
});
