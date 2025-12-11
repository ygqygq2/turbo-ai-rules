import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS } from '../../utils/constants';

// 通过扩展获取服务实例，避免模块重复加载
let rulesManager: any;
let selectionStateManager: any;

describe('Sync Rules Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  beforeEach(async () => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');

    // 使用第一个测试工作区（rules-for-cursor）
    workspaceFolder = folders[0];

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
  });

  afterEach(async () => {
    if (!workspaceFolder) {
      return;
    }

    // 清理选择状态（避免影响其他测试）
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
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
    this.timeout(120000); // 2分钟

    // 验证预配置的源存在
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; name: string }>>('sources');

    assert.ok(sources && sources.length > 0, 'Should have pre-configured sources');

    // 打开当前 workspace folder 中的 README 文件，确保 activeEditor 在正确的 folder
    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 等待同步完成和规则加载到 RulesManager（轮询检查，最多等待 10 秒）
    let allRulesAfterSync: any[] = [];
    let attempts = 0;
    const maxAttempts = 20; // 20 次 * 500ms = 10 秒

    while (allRulesAfterSync.length === 0 && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      allRulesAfterSync = rulesManager.getAllRules();
      attempts++;
      if (allRulesAfterSync.length > 0) {
        break;
      }
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
    await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');

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
    this.timeout(120000); // 2分钟

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
    this.timeout(120000); // 2分钟

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
    await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');

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

  it('Should clear selection when no rules selected', async function () {
    this.timeout(120000); // 2分钟

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

    // 2. 清空选择（模拟用户不选择任何规则）
    selectionStateManager.updateSelection(enabledSource.id, []);

    // 等待状态更新
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 3. 验证选择状态已清空
    const clearedPaths = selectionStateManager.getSelection(enabledSource.id);
    assert.strictEqual(clearedPaths.length, 0, 'Selection should be cleared');

    // 4. 再次同步，验证不会恢复之前的选择
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
});
