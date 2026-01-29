/**
 * Cursor 适配器完整工作流测试
 * 工作空间: rules-for-cursor
 *
 * 测试场景:
 * - 配置文件格式验证
 * - 增量同步
 * - 错误处理
 */

import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS } from '../../../utils/constants';
import { restoreAllMocks } from '../mocks';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../testConstants';
import {
  createWorkspaceSnapshot,
  restoreWorkspaceSnapshot,
  sleep,
  switchToWorkspace,
} from '../testHelpers';

describe('Cursor Workflow Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let rulesManager: any;
  let selectionStateManager: any;

  before(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 1. 切换到 Cursor 测试工作空间
    workspaceFolder = await switchToWorkspace('Workflows: Cursor', {
      verifyAdapter: true,
      adapterType: 'rules',
    });

    // 2. 创建初始快照（整个测试套件只备份一次）
    await createWorkspaceSnapshot(workspaceFolder);

    // 3. 激活扩展
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

  after(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 只在所有测试完成后恢复一次工作空间快照
    if (workspaceFolder) {
      await restoreWorkspaceSnapshot(workspaceFolder);
    }
  });

  beforeEach(async () => {
    // 每个测试前只恢复 mocks
    restoreAllMocks();
  });

  afterEach(async () => {
    // 每个测试后清理：只恢复 mocks
    restoreAllMocks();
  });

  it('Should generate correct .cursorrules format', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 使用预配置的源
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<any[]>(CONFIG_KEYS.SOURCES, []);
    assert.ok(sources.length > 0, 'Should have pre-configured sources');

    const sourceId = sources[0].id;

    // 同步规则
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.LONG);

    // 获取规则并全选
    const allRules = rulesManager.getRulesBySource(sourceId);
    if (allRules.length > 0) {
      const selectedPaths = allRules.map((rule: any) => rule.filePath);
      selectionStateManager.updateSelection(
        sourceId,
        selectedPaths,
        false,
        workspaceFolder.uri.fsPath,
      );
    }

    // 生成配置
    await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
    await sleep(TEST_DELAYS.MEDIUM);

    // 验证格式
    const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
    if (await fs.pathExists(cursorRulesPath)) {
      const content = await fs.readFile(cursorRulesPath, 'utf-8');

      // 验证块标记
      const beginCount = (content.match(/<!-- TURBO-AI-RULES:BEGIN -->/g) || []).length;
      const endCount = (content.match(/<!-- TURBO-AI-RULES:END -->/g) || []).length;
      assert.strictEqual(beginCount, 1, 'Should have exactly one BEGIN marker');
      assert.strictEqual(endCount, 1, 'Should have exactly one END marker');

      // 验证规则内容
      assert.ok(content.length > 100, 'Should have substantial content');
    }
  });

  it('Should handle incremental sync', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<any[]>(CONFIG_KEYS.SOURCES, []);

    if (sources.length === 0) {
      this.skip();
      return;
    }

    const sourceId = sources[0].id;

    // 第一次同步
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.LONG);

    const rulesAfterFirstSync = rulesManager.getRulesBySource(sourceId);
    const firstCount = rulesAfterFirstSync.length;

    // 第二次同步（增量）
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.LONG);

    const rulesAfterSecondSync = rulesManager.getRulesBySource(sourceId);
    const secondCount = rulesAfterSecondSync.length;

    // 规则数量应该一致（增量同步不应该重复）
    assert.strictEqual(secondCount, firstCount, 'Incremental sync should maintain rule count');
  });

  it('Should handle empty selection gracefully', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<any[]>(CONFIG_KEYS.SOURCES, []);

    if (sources.length === 0) {
      this.skip();
      return;
    }

    const sourceId = sources[0].id;

    // 同步规则
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.LONG);

    // 清空选择
    selectionStateManager.updateSelection(sourceId, [], false, workspaceFolder.uri.fsPath);

    // 生成配置（应该不报错，但可能不生成文件）
    await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
    await sleep(TEST_DELAYS.MEDIUM);

    // 验证：空选择可能生成空文件或不生成文件
    const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
    if (await fs.pathExists(cursorRulesPath)) {
      const content = await fs.readFile(cursorRulesPath, 'utf-8');
      // 如果生成了文件，至少应该有块标记
      if (content.length > 0) {
        assert.ok(content.includes('TURBO-AI-RULES'), 'Should have block markers');
      }
    }
  });
});
