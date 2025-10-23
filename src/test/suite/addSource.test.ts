import * as assert from 'assert';
import * as vscode from 'vscode';

import { ConfigManager } from '../../services/ConfigManager';
import type { RuleSource } from '../../types';
import { cleanupGeneratedFiles, createTempWorkspace } from '../ready';

suite('Add Source Tests', () => {
  let tempWorkspace: string;

  setup(() => {
    tempWorkspace = createTempWorkspace();
  });

  teardown(async () => {
    await cleanupGeneratedFiles(tempWorkspace);
  });

  test('Should add public GitHub repository', async () => {
    const configManager = ConfigManager.getInstance();
    const sourceUrl = 'https://github.com/PatrickF1/fzf.fish';

    await vscode.commands.executeCommand('turbo-ai-rules.addSource', sourceUrl);

    const sources = configManager.getSources();
    const added = sources.find((s: RuleSource) => s.gitUrl === sourceUrl);

    assert.ok(added, 'Source should be added to configuration');
    assert.strictEqual(added.enabled, true, 'Source should be enabled by default');
  });

  test('Should add private repository with SSH', async () => {
    const configManager = ConfigManager.getInstance();
    const sourceUrl = 'git@github.com:user/private-repo.git';

    await vscode.commands.executeCommand('turbo-ai-rules.addSource', sourceUrl);

    const sources = configManager.getSources();
    const added = sources.find((s: RuleSource) => s.gitUrl === sourceUrl);

    assert.ok(added, 'Private source should be added');
    assert.ok(added.authentication, 'Should have authentication config');
    assert.strictEqual(added.authentication?.type, 'ssh', 'Auth type should be ssh');
  });

  test('Should not add duplicate sources', async () => {
    const configManager = ConfigManager.getInstance();
    const sourceUrl = 'https://github.com/PatrickF1/fzf.fish';

    // 添加第一次
    await vscode.commands.executeCommand('turbo-ai-rules.addSource', sourceUrl);
    const sourcesAfterFirst = configManager.getSources();
    const countAfterFirst = sourcesAfterFirst.filter(
      (s: RuleSource) => s.gitUrl === sourceUrl,
    ).length;

    // 尝试添加第二次
    await vscode.commands.executeCommand('turbo-ai-rules.addSource', sourceUrl);
    const sourcesAfterSecond = configManager.getSources();
    const countAfterSecond = sourcesAfterSecond.filter(
      (s: RuleSource) => s.gitUrl === sourceUrl,
    ).length;

    assert.strictEqual(countAfterFirst, countAfterSecond, 'Should not add duplicate source');
  });

  test('Should validate repository URL format', async () => {
    const invalidUrls = [
      'not-a-url',
      'ftp://invalid.com/repo',
      'https://notgithub.com/repo', // 暂时只支持 GitHub
    ];

    for (const url of invalidUrls) {
      try {
        await vscode.commands.executeCommand('turbo-ai-rules.addSource', url);
        assert.fail(`Should reject invalid URL: ${url}`);
      } catch (error) {
        // Expected to throw
        assert.ok(error, 'Should throw error for invalid URL');
      }
    }
  });
});
