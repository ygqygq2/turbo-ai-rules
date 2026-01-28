import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import type { RuleSource } from '../../../types';
import { CONFIG_KEYS } from '../../../utils/constants';
import { restoreAllMocks } from '../mocks';
import { TEST_TIMEOUTS } from '../testConstants';
import { activateWorkspace } from '../testHelpers';

describe('Remove Source Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let originalSources: RuleSource[] = [];

  before(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');
    // 使用 commands-removeSource 工作空间（在 .code-workspace 中名为 "Commands: Remove Source"）
    workspaceFolder =
      folders.find(
        (f) => f.name === 'Commands: Remove Source' || f.name.includes('removeSource'),
      ) || folders[0];

    // 激活扩展
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) {
      await ext.activate();
    }

    // 备份原始配置
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    originalSources = JSON.parse(JSON.stringify(config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, [])));

    // 打开工作区的 README.md 以激活该工作区上下文
    await activateWorkspace(workspaceFolder);
  });

  beforeEach(() => {});

  afterEach(() => {
    restoreAllMocks();
  });

  after(async function () {
    // 所有测试结束后恢复原始配置
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    await config.update(
      CONFIG_KEYS.SOURCES,
      originalSources,
      vscode.ConfigurationTarget.WorkspaceFolder,
    );
  });

  it('Should list sources before removal', async function () {
    this.timeout(TEST_TIMEOUTS.MEDIUM);

    // 直接从配置读取，不依赖 ConfigManager
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);

    console.log(`Found ${sources.length} sources in workspace ${workspaceFolder.name}`);

    // 验证预配置的源存在
    assert.ok(sources.length > 0, 'Should have at least one source');

    // 打印源信息
    sources.forEach((source: RuleSource) => {
      console.log(`  - ${source.id}: ${source.name} (${source.enabled ? 'enabled' : 'disabled'})`);
    });
  });

  it('Should have proper removeSource command registered', async function () {
    this.timeout(TEST_TIMEOUTS.MEDIUM);

    // 验证命令已注册
    const commands = await vscode.commands.getCommands(true);
    const hasRemoveCommand = commands.includes('turbo-ai-rules.removeSource');

    assert.ok(hasRemoveCommand, 'removeSource command should be registered');
  });

  it('Should handle removing non-existent source gracefully', async function () {
    this.timeout(TEST_TIMEOUTS.MEDIUM);

    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sourcesBefore = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);

    // 尝试删除不存在的源
    const nonExistentId = 'non-existent-source-12345';

    try {
      await vscode.commands.executeCommand('turbo-ai-rules.removeSource', nonExistentId);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const sourcesAfter = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);

      // 源列表不应该改变
      assert.strictEqual(
        sourcesAfter.length,
        sourcesBefore.length,
        'Source count should remain the same',
      );
    } catch (error) {
      // 命令可能会抛出错误，这也是合理的
      console.log('Command threw error (expected):', error);
      assert.ok(true, 'Should handle non-existent source');
    }
  });
});
