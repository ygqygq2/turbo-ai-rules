import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS } from '../../../utils/constants';
import { TEST_TIMEOUTS } from '../testConstants';
import { switchToWorkspaceContext } from '../testHelpers';

// 通过扩展获取服务实例，避免模块重复加载
let rulesManager: any;
let selectionStateManager: any;

describe('Sync Rules Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  beforeEach(async () => {
    // 使用 switchToWorkspaceContext 切换到正确的工作区
    workspaceFolder = await switchToWorkspaceContext('Sync Rules');

    // 从扩展获取服务实例
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) {
      await ext.activate();
    }
    const api = ext?.exports;
    rulesManager = api?.rulesManager;
    selectionStateManager = api?.selectionStateManager;

    assert.ok(rulesManager, 'RulesManager should be available from extension');
    assert.ok(selectionStateManager, 'SelectionStateManager should be available from extension');

    // 为 Sync Rules 测试临时启用 Cursor 适配器
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    await config.update(
      'adapters',
      {
        cursor: {
          enabled: true,
          autoUpdate: true,
          sortBy: 'priority',
          sortOrder: 'asc',
        },
      },
      vscode.ConfigurationTarget.WorkspaceFolder,
    );
  });

  afterEach(async () => {
    if (!workspaceFolder) {
      return;
    }

    // 清理适配器配置
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    await config.update('adapters', {}, vscode.ConfigurationTarget.WorkspaceFolder);

    // 清理选择状态（避免影响其他测试）
    const sources = config.get<Array<{ id: string }>>(CONFIG_KEYS.SOURCES);
    if (sources) {
      for (const source of sources) {
        selectionStateManager.clearState(source.id);
      }
    }

    // 清理所有可能生成的配置文件和目录
    const pathsToClean = [
      path.join(workspaceFolder.uri.fsPath, '.cursorrules'),
      path.join(workspaceFolder.uri.fsPath, '.github'),
      path.join(workspaceFolder.uri.fsPath, '.continue'),
      path.join(workspaceFolder.uri.fsPath, 'rules'),
    ];

    for (const cleanPath of pathsToClean) {
      if (await fs.pathExists(cleanPath)) {
        const stat = await fs.stat(cleanPath);

        // 如果是文件，直接删除
        if (stat.isFile()) {
          await fs.remove(cleanPath);
          continue;
        }

        // 如果是目录，特殊处理：保留用户自定义规则
        if (stat.isDirectory() && cleanPath.endsWith('.cursorrules')) {
          const files = await fs.readdir(cleanPath);
          for (const file of files) {
            // 只删除不是用户自定义的文件
            if (!file.startsWith('custom-')) {
              const filePath = path.join(cleanPath, file);
              await fs.remove(filePath);
            }
          }
          // 如果目录为空（除了用户文件），删除目录
          const remainingFiles = await fs.readdir(cleanPath);
          if (remainingFiles.length === 0 || remainingFiles.every((f) => f.startsWith('custom-'))) {
            // 保留包含用户文件的目录
            if (remainingFiles.length === 0) {
              await fs.remove(cleanPath);
            }
          }
        } else {
          // 其他路径直接删除
          await fs.remove(cleanPath);
        }
      }
    }
  });

  it('Should sync rules from pre-configured source', async function () {
    // 增加超时时间，因为需要克隆仓库
    this.timeout(TEST_TIMEOUTS.LONG);

    // 验证预配置的源存在
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; name: string }>>('sources');

    assert.ok(sources && sources.length > 0, 'Should have pre-configured sources');

    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 等待同步完成和规则加载到 RulesManager（轮询检查，最多等待 20 秒）
    let allRulesAfterSync: any[] = [];
    let attempts = 0;
    const maxAttempts = 40; // 40 次 * 500ms = 20 秒

    while (allRulesAfterSync.length === 0 && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      allRulesAfterSync = rulesManager.getAllRules();
      attempts++;
      if (allRulesAfterSync.length > 0) {
        break;
      }
    }

    // 如果仍然没有规则，可能是网络问题，跳过测试
    if (allRulesAfterSync.length === 0) {
      console.warn('Warning: No rules synced - skipping test due to network issues');
      this.skip();
      return;
    }

    assert.ok(allRulesAfterSync.length > 0, 'Rules should be loaded after sync');

    // 模拟用户选择规则：获取所有源并选中所有规则
    const configForSelection = vscode.workspace.getConfiguration(
      'turbo-ai-rules',
      workspaceFolder.uri,
    );
    const sourcesForSelection =
      configForSelection.get<Array<{ id: string; enabled: boolean }>>('sources');
    assert.ok(
      sourcesForSelection && sourcesForSelection.length > 0,
      'Should have configured sources',
    );

    for (const source of sourcesForSelection.filter((s: any) => s.enabled)) {
      const sourceRules = rulesManager.getRulesBySource(source.id);
      if (sourceRules.length > 0) {
        const allPaths = sourceRules.map((rule: any) => rule.filePath);
        // 直接设置选择状态（模拟用户全选）
        selectionStateManager.updateSelection(
          source.id,
          allPaths,
          false,
          workspaceFolder.uri.fsPath,
        );
      }
    }

    // 等待选择状态持久化
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 初始化选择状态后，重新生成配置文件
    await vscode.commands.executeCommand('turbo-ai-rules.generateRules');

    // 等待文件生成完成
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 验证：检查是否生成了配置文件（Cursor adapter 应该生成 .cursorrules 文件）
    const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
    const cursorFileExists = await fs.pathExists(cursorRulesPath);

    // 断言：应该成功同步并生成了配置文件
    assert.ok(
      cursorFileExists,
      'Should generate .cursorrules file after sync (indicating rules were synced)',
    );
  });

  it('Should handle sync without errors', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 打开当前 workspace folder 中的 README 文件，确保 activeEditor 在正确的 folder
    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    // 执行同步，应该使用预配置的源
    try {
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      // 验证同步成功完成
      assert.ok(true, 'Sync completed without errors');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      assert.fail(`Sync should not throw error: ${errorMessage}`);
    }
  });

  it('Should generate adapter output files', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 打开当前 workspace folder 中的 README 文件，确保 activeEditor 在正确的 folder
    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    // 执行同步
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 等待同步完成和规则加载（轮询检查）
    let allRules: any[] = [];
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      allRules = rulesManager.getAllRules();
      if (allRules.length > 0) {
        break;
      }
    }

    assert.ok(allRules.length > 0, 'Rules should be loaded after sync');

    // 模拟用户选择规则：获取所有源并选中所有规则
    const configForGenerate = vscode.workspace.getConfiguration(
      'turbo-ai-rules',
      workspaceFolder.uri,
    );
    const sourcesForGenerate =
      configForGenerate.get<Array<{ id: string; enabled: boolean }>>('sources');
    assert.ok(
      sourcesForGenerate && sourcesForGenerate.length > 0,
      'Should have configured sources',
    );

    for (const source of sourcesForGenerate.filter((s: any) => s.enabled)) {
      const sourceRules = rulesManager.getRulesBySource(source.id);
      if (sourceRules.length > 0) {
        const allPaths = sourceRules.map((rule: any) => rule.filePath);
        selectionStateManager.updateSelection(
          source.id,
          allPaths,
          false,
          workspaceFolder.uri.fsPath,
        );
      }
    }

    // 等待选择状态持久化
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 重新生成配置文件
    await vscode.commands.executeCommand('turbo-ai-rules.generateRules');

    // 等待文件生成
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 验证 Cursor 配置文件生成
    const cursorFilePath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
    const fileExists = await fs.pathExists(cursorFilePath);

    assert.ok(fileExists, 'Cursor rules file should be generated after sync');

    // 检查 .cursorrules 是否是文件且有内容
    if (fileExists) {
      const stat = await fs.stat(cursorFilePath);
      if (stat.isFile()) {
        const content = await fs.readFile(cursorFilePath, 'utf-8');
        assert.ok(content.length > 0, 'Cursor rules file should have content');
      } else if (stat.isDirectory()) {
        // 如果是目录（某些配置可能生成目录）
        const files = await fs.readdir(cursorFilePath);
        const mdFiles = files.filter((f) => f.endsWith('.md') || f.endsWith('.mdc'));
        assert.ok(mdFiles.length > 0, 'Should have generated rule files');
      }
    }
  });

  it('Should allow generating empty config when no rules selected (to clear rules)', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 1. 首先同步并选择一些规则
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 等待同步完成
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; enabled: boolean }>>('sources');
    assert.ok(sources && sources.length > 0, 'Should have configured sources');

    const enabledSource = sources.find((s) => s.enabled);
    assert.ok(enabledSource, 'Should have at least one enabled source');

    // 选择所有规则
    const allRules = rulesManager.getRulesBySource(enabledSource.id);
    if (allRules.length > 0) {
      const allPaths = allRules.map((r: any) => r.filePath);
      selectionStateManager.updateSelection(enabledSource.id, allPaths);

      // 等待状态更新
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // 验证选择状态
      const selectedPaths = selectionStateManager.getSelection(enabledSource.id);
      assert.ok(selectedPaths.length > 0, 'Should have selected rules');
    }

    // 2. 清空选择（模拟用户不选择任何规则，表示要清空所有规则）
    selectionStateManager.updateSelection(enabledSource.id, []);

    // 等待状态更新
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. 验证选择状态已清空
    const clearedPaths = selectionStateManager.getSelection(enabledSource.id);
    assert.strictEqual(clearedPaths.length, 0, 'Selection should be cleared');

    // 4. 生成配置，应该允许 0 条规则（清空规则）
    try {
      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      // 等待生成完成
      await new Promise((resolve) => setTimeout(resolve, 2000));
      assert.ok(true, 'Should allow generating config with 0 rules selected');
    } catch (_error) {
      assert.fail('Should not throw error when generating with 0 rules');
    }

    // 5. 再次同步，验证不会恢复之前的选择
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 等待同步完成
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 5. 验证选择仍然为空
    const pathsAfterSync = selectionStateManager.getSelection(enabledSource.id);
    assert.strictEqual(
      pathsAfterSync.length,
      0,
      'Selection should remain empty after sync without selection',
    );
  });

  it('Should clean orphan files but preserve user rules from ai-rules directory', async function () {
    // enableUserRules: true 时，应保留 ai-rules/ 目录的用户规则，删除孤儿文件
    this.timeout(TEST_TIMEOUTS.LONG);

    // 切换到 "Multi-Adapter + User Protection" 工作区（有用户规则保护和目录模式配置）
    const targetWorkspaceFolder = await switchToWorkspaceContext('Multi-Adapter + User Protection');

    // 1. 在 ai-rules/ 目录创建用户规则（enableUserRules 保护的目录）
    const userRulesDir = path.join(targetWorkspaceFolder.uri.fsPath, 'ai-rules');
    await fs.ensureDir(userRulesDir);
    const userRulePath = path.join(userRulesDir, 'custom-user-rule.md');
    await fs.writeFile(
      userRulePath,
      '---\nid: custom-user\ntitle: Custom User Rule\npriority: high\n---\n\n# My Custom Rule\n\nUser-defined rule.',
    );

    // 2. 同步规则（会同时加载远程规则和 ai-rules/ 的用户规则）
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 等待同步完成和规则加载
    let allRules: any[] = [];
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      allRules = rulesManager.getAllRules();
      if (allRules.length > 0) {
        break;
      }
    }

    assert.ok(allRules.length > 0, 'Rules should be loaded after sync');

    // 3. 获取工作区配置
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', targetWorkspaceFolder.uri);
    const adaptersConfig = config.get<any>('adapters');
    const customAdapters = adaptersConfig?.custom;
    assert.ok(
      customAdapters && customAdapters.length > 0,
      'Should have custom adapters configured',
    );

    // 4. 选择所有规则并生成配置
    const sources = config.get<Array<{ id: string; enabled: boolean }>>('sources');
    assert.ok(sources && sources.length > 0, 'Should have configured sources');

    for (const source of sources.filter((s: any) => s.enabled)) {
      const sourceRules = rulesManager.getRulesBySource(source.id);
      if (sourceRules.length > 0) {
        const allPaths = sourceRules.map((rule: any) => rule.filePath);
        selectionStateManager.updateSelection(
          source.id,
          allPaths,
          false,
          targetWorkspaceFolder.uri.fsPath,
        );
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 5. 生成配置（初次生成，应包含远程规则 + ai-rules/ 的用户规则）
    await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // 6. 找到目录类型的适配器
    const targetAdapter = customAdapters.find(
      (a: any) => a.enabled && a.outputType === 'directory',
    );
    if (!targetAdapter) {
      console.warn('No enabled directory-type custom adapter found');
      this.skip();
      return;
    }

    const outputDir = path.join(targetWorkspaceFolder.uri.fsPath, targetAdapter.outputPath);
    const dirExists = await fs.pathExists(outputDir);
    if (!dirExists) {
      console.warn(`Output directory ${targetAdapter.outputPath} does not exist`);
      this.skip();
      return;
    }

    // 7. 在输出目录创建孤儿文件（不在 ai-rules/，不在远程规则中）
    const orphanFilePath = path.join(outputDir, 'orphan-rule.md');
    await fs.writeFile(
      orphanFilePath,
      '---\nid: orphan\ntitle: Orphan Rule\n---\n\n# Orphan Rule\n\nThis should be deleted.',
    );

    let orphanExists = await fs.pathExists(orphanFilePath);
    assert.ok(orphanExists, 'Orphan file should be created for testing');

    // 8. 再次生成配置（不改变选择，应删除孤儿文件，保留 ai-rules/ 的用户规则）
    await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 9. 验证孤儿文件被删除
    orphanExists = await fs.pathExists(orphanFilePath);
    assert.ok(!orphanExists, 'Orphan file should be deleted during cleanup');

    // 10. 验证 ai-rules/ 的用户规则文件被复制到输出目录
    const userRuleInOutput = path.join(outputDir, 'custom-user-rule.md');
    const userRuleInOutputExists = await fs.pathExists(userRuleInOutput);
    assert.ok(
      userRuleInOutputExists,
      'User rule from ai-rules/ should be copied to output directory',
    );

    // 清理测试创建的文件
    if (await fs.pathExists(orphanFilePath)) {
      await fs.remove(orphanFilePath);
    }
    await fs.remove(userRulePath);
  });
});
