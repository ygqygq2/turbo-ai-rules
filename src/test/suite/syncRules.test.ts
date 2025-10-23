import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { ConfigManager } from '../../services/ConfigManager';
import { cleanupGeneratedFiles, createTempWorkspace } from '../ready';

suite('Sync Rules Tests', () => {
  let tempWorkspace: string;

  setup(() => {
    tempWorkspace = createTempWorkspace();
  });

  teardown(async () => {
    await cleanupGeneratedFiles(tempWorkspace);
  });

  test('Should sync rules from public repository', async function () {
    // 增加超时时间，因为需要克隆仓库
    this.timeout(60000);

    const configManager = ConfigManager.getInstance();

    // 添加源
    const sourceUrl = 'https://github.com/PatrickF1/fzf.fish';
    await vscode.commands.executeCommand('turbo-ai-rules.addSource', sourceUrl);

    // 执行同步
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 验证规则已同步到本地
    const sources = configManager.getSources();
    const source = sources.find((s) => s.gitUrl === sourceUrl);

    assert.ok(source, 'Source should exist');
    assert.ok(source.lastSync, 'Should have lastSync timestamp');

    // 验证本地缓存目录存在
    const workspaceState = configManager['context'].workspaceState;
    const cacheDir = workspaceState.get<string>('turbo-ai-rules.cacheDir');
    assert.ok(cacheDir, 'Cache directory should be set');

    const sourceDir = path.join(cacheDir!, source.id);
    const exists = await fs.pathExists(sourceDir);
    assert.ok(exists, 'Source directory should exist in cache');
  });

  test('Should handle sync errors gracefully', async function () {
    this.timeout(30000);

    // 添加一个无效的源
    const invalidUrl = 'https://github.com/nonexistent/repo-404';
    await vscode.commands.executeCommand('turbo-ai-rules.addSource', invalidUrl);

    // 执行同步，应该处理错误而不是崩溃
    try {
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      // 不应该抛出异常，而是显示错误消息
    } catch (error) {
      assert.fail('Sync command should handle errors gracefully, not throw');
    }
  });

  test('Should update existing source on re-sync', async function () {
    this.timeout(90000);

    const configManager = ConfigManager.getInstance();
    const sourceUrl = 'https://github.com/PatrickF1/fzf.fish';

    // 第一次同步
    await vscode.commands.executeCommand('turbo-ai-rules.addSource', sourceUrl);
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    const sourcesAfterFirst = configManager.getSources();
    const sourceAfterFirst = sourcesAfterFirst.find((s) => s.gitUrl === sourceUrl);
    const firstSyncTime = sourceAfterFirst?.lastSync;

    // 等待 1 秒确保时间戳不同
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 第二次同步
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    const sourcesAfterSecond = configManager.getSources();
    const sourceAfterSecond = sourcesAfterSecond.find((s) => s.gitUrl === sourceUrl);
    const secondSyncTime = sourceAfterSecond?.lastSync;

    assert.ok(firstSyncTime, 'First sync time should exist');
    assert.ok(secondSyncTime, 'Second sync time should exist');
    assert.notStrictEqual(firstSyncTime, secondSyncTime, 'Sync time should be updated');
  });
});
