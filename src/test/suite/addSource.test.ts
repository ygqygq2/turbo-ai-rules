import * as assert from 'assert';
import * as vscode from 'vscode';

import { ConfigManager } from '../../services/ConfigManager';
import type { RuleSource } from '../../types';
import { cleanupGeneratedFiles, createTempWorkspace } from '../ready';

describe('Add Source Tests', () => {
  let tempWorkspace: string;

  beforeEach(() => {
    tempWorkspace = createTempWorkspace();
  });

  afterEach(async () => {
    await cleanupGeneratedFiles(tempWorkspace);
  });

  // NOTE: These tests require user interaction and are skipped in automated testing
  it.skip('Should add public GitHub repository', async () => {
    const configManager = ConfigManager.getInstance();
    const sourceUrl = 'https://github.com/PatrickJS/awesome-cursorrules.git';

    await vscode.commands.executeCommand('turbo-ai-rules.addSource', sourceUrl);

    const sources = configManager.getSources();
    const added = sources.find((s: RuleSource) => s.gitUrl === sourceUrl);

    assert.ok(added, 'Source should be added to configuration');
    assert.strictEqual(added.enabled, true, 'Source should be enabled by default');
  });

  it.skip('Should add private repository with SSH', async () => {
    const configManager = ConfigManager.getInstance();
    const sourceUrl = 'git@github.com:PatrickJS/awesome-cursorrules.git';

    await vscode.commands.executeCommand('turbo-ai-rules.addSource', sourceUrl);

    const sources = configManager.getSources();
    const added = sources.find((s: RuleSource) => s.gitUrl === sourceUrl);

    assert.ok(added, 'Private source should be added');
    assert.ok(added.authentication, 'Should have authentication config');
    assert.strictEqual(added.authentication?.type, 'ssh', 'Auth type should be ssh');
  });

  it.skip('Should not add duplicate sources', async () => {
    const configManager = ConfigManager.getInstance();
    const sourceUrl = 'https://github.com/PatrickJS/awesome-cursorrules.git';

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

  it.skip('Should validate repository URL format', async () => {
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
