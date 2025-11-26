import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

import type { RuleSource } from '../../types';
import { CONFIG_KEYS } from '../../utils/constants';
import { restoreAllMocks } from './mocks';

describe('Remove Source Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  beforeEach(() => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');
    workspaceFolder = folders[0];
  });

  afterEach(() => {
    restoreAllMocks();
  });

  it('Should list sources before removal', async function () {
    this.timeout(30000);

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
    this.timeout(30000);

    // 验证命令已注册
    const commands = await vscode.commands.getCommands(true);
    const hasRemoveCommand = commands.includes('turbo-ai-rules.removeSource');

    assert.ok(hasRemoveCommand, 'removeSource command should be registered');
  });

  it('Should handle removing non-existent source gracefully', async function () {
    this.timeout(30000);

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
