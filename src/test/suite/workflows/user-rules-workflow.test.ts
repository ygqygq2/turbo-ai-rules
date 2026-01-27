/**
 * 用户规则保护工作流测试
 * 工作空间: rules-with-user-rules
 *
 * 测试场景:
 * - 启用用户规则保护（protectUserRules: true）
 * - 多适配器同时启用
 * - 用户内容不被覆盖
 * - 块标记正确性
 * - 更新不影响用户规则
 */

import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS } from '../../../utils/constants';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../testConstants';
import { sleep, switchToWorkspace } from '../testHelpers';

describe('User Rules Protection Workflow Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let rulesManager: any;
  let selectionStateManager: any;

  before(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 1. 切换到测试工作空间
    workspaceFolder = await switchToWorkspace('User Rules Workflow', {
      verifyAdapter: true,
      adapterType: 'rules',
    });

    // 2. 激活扩展
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) {
      await ext.activate();
    }

    // 3. 获取服务实例
    const api = ext?.exports;
    rulesManager = api?.rulesManager;
    selectionStateManager = api?.selectionStateManager;

    assert.ok(rulesManager, 'RulesManager should be available');
    assert.ok(selectionStateManager, 'SelectionStateManager should be available');

    // 4. 切换到工作空间上下文
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

    // 清理生成的配置文件（但保留用户规则用于测试）
    const pathsToClean = [
      path.join(workspaceFolder.uri.fsPath, '.cursorrules'),
      path.join(workspaceFolder.uri.fsPath, '.github', 'copilot-instructions.md'),
      path.join(workspaceFolder.uri.fsPath, '.continue', 'config.json'),
    ];

    for (const cleanPath of pathsToClean) {
      if (await fs.pathExists(cleanPath)) {
        await fs.remove(cleanPath);
      }
    }
  });

  it('Should have user rules protection enabled', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const userRules = config.get<any>('userRules');
    const protectUserRules = userRules?.protectContent;

    assert.strictEqual(protectUserRules, true, 'protectUserRules should be enabled');
  });

  it('Should preserve user content when generating config', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');

    // 步骤1: 创建包含用户内容的配置文件
    const userContent = '# My custom rules\n\nThis is my personal rule.\n';
    await fs.ensureDir(path.dirname(cursorRulesPath));
    await fs.writeFile(cursorRulesPath, userContent, 'utf-8');

    // 步骤2: 同步规则
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES);

    if (!sources || sources.length === 0) {
      this.skip();
      return;
    }

    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.EXTRA_LONG);

    // 步骤3: 选择规则
    for (const source of sources!.filter((s) => s.enabled)) {
      const rules = rulesManager.getRulesBySource(source.id);
      if (rules.length > 0) {
        const selectedPaths = rules.slice(0, 2).map((rule: any) => rule.filePath);
        selectionStateManager.updateSelection(
          source.id,
          selectedPaths,
          false,
          workspaceFolder.uri.fsPath,
        );
      }
    }

    // 步骤4: 生成配置
    await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
    await sleep(TEST_DELAYS.MEDIUM);

    // 步骤5: 验证用户内容被保留
    if (await fs.pathExists(cursorRulesPath)) {
      const content = await fs.readFile(cursorRulesPath, 'utf-8');

      // 用户内容应该在块标记之前
      assert.ok(content.includes('My custom rules'), 'User content should be preserved');
      assert.ok(content.includes('TURBO-AI-RULES:BEGIN'), 'Block markers should exist');

      // 验证用户内容在块标记之前
      const userContentIndex = content.indexOf('My custom rules');
      const blockBeginIndex = content.indexOf('TURBO-AI-RULES:BEGIN');
      assert.ok(userContentIndex < blockBeginIndex, 'User content should be before block markers');
    }
  });

  it('Should handle multiple adapters with user rules', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    // 验证多适配器配置
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const adapters = config.get<any>('adapters');

    if (!adapters) {
      this.skip();
      return;
    }

    // 统计启用的适配器
    const enabledAdapters = Object.keys(adapters).filter((key) => adapters[key]?.enabled);
    assert.ok(enabledAdapters.length >= 2, 'Should have multiple adapters enabled');

    // 同步规则
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.EXTRA_LONG);

    // 选择规则
    const sources = config.get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES);
    if (sources) {
      for (const source of sources.filter((s) => s.enabled)) {
        const rules = rulesManager.getRulesBySource(source.id);
        if (rules.length > 0) {
          const selectedPaths = rules.slice(0, 2).map((rule: any) => rule.filePath);
          selectionStateManager.updateSelection(
            source.id,
            selectedPaths,
            false,
            workspaceFolder.uri.fsPath,
          );
        }
      }
    }

    // 生成配置
    await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
    await sleep(TEST_DELAYS.MEDIUM);

    // 验证每个适配器的配置文件
    for (const adapterName of enabledAdapters) {
      let configPath: string;

      switch (adapterName) {
        case 'cursor':
          configPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
          break;
        case 'copilot':
          configPath = path.join(workspaceFolder.uri.fsPath, '.github', 'copilot-instructions.md');
          break;
        case 'continue':
          configPath = path.join(workspaceFolder.uri.fsPath, '.continue', 'config.json');
          break;
        default:
          continue;
      }

      if (await fs.pathExists(configPath)) {
        const content = await fs.readFile(configPath, 'utf-8');
        assert.ok(content.length > 0, `${adapterName} config should have content`);
      }
    }
  });

  it('Should update config without overwriting user content', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
    const userContent = '# User rule version 1\n\nOriginal content.\n';

    // 第一次生成
    await fs.ensureDir(path.dirname(cursorRulesPath));
    await fs.writeFile(cursorRulesPath, userContent, 'utf-8');

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES);

    if (!sources || sources.length === 0) {
      this.skip();
      return;
    }

    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.EXTRA_LONG);

    for (const source of sources!.filter((s) => s.enabled)) {
      const rules = rulesManager.getRulesBySource(source.id);
      if (rules.length > 0) {
        const selectedPaths = rules.slice(0, 2).map((rule: any) => rule.filePath);
        selectionStateManager.updateSelection(
          source.id,
          selectedPaths,
          false,
          workspaceFolder.uri.fsPath,
        );
      }
    }

    await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
    await sleep(TEST_DELAYS.MEDIUM);

    // 第二次更新
    await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
    await sleep(TEST_DELAYS.MEDIUM);

    // 验证用户内容仍然存在
    if (await fs.pathExists(cursorRulesPath)) {
      const content = await fs.readFile(cursorRulesPath, 'utf-8');
      assert.ok(
        content.includes('User rule version 1'),
        'User content should persist after update',
      );
      assert.ok(content.includes('Original content'), 'User content should not be modified');
    }
  });

  it('Should have correct block markers structure', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES);

    if (!sources || sources.length === 0) {
      this.skip();
      return;
    }

    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.EXTRA_LONG);

    for (const source of sources!.filter((s) => s.enabled)) {
      const rules = rulesManager.getRulesBySource(source.id);
      if (rules.length > 0) {
        const selectedPaths = rules.slice(0, 2).map((rule: any) => rule.filePath);
        selectionStateManager.updateSelection(
          source.id,
          selectedPaths,
          false,
          workspaceFolder.uri.fsPath,
        );
      }
    }

    await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
    await sleep(TEST_DELAYS.MEDIUM);

    const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
    if (await fs.pathExists(cursorRulesPath)) {
      const content = await fs.readFile(cursorRulesPath, 'utf-8');

      // 验证块标记配对
      const beginMarkers = (content.match(/<!-- TURBO-AI-RULES:BEGIN -->/g) || []).length;
      const endMarkers = (content.match(/<!-- TURBO-AI-RULES:END -->/g) || []).length;

      assert.strictEqual(beginMarkers, 1, 'Should have exactly one BEGIN marker');
      assert.strictEqual(endMarkers, 1, 'Should have exactly one END marker');

      // 验证顺序
      const beginIndex = content.indexOf('TURBO-AI-RULES:BEGIN');
      const endIndex = content.indexOf('TURBO-AI-RULES:END');
      assert.ok(beginIndex < endIndex, 'BEGIN marker should come before END marker');
    }
  });
});
