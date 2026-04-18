/**
 * 适配器综合体工作流测试
 * 工作空间: workflows-adapter-suites
 *
 * 测试场景:
 * - copilot-core 综合体同步
 * - claude-core 综合体同步
 * - hooks 不应被 copilot-core 隐式带出
 */

import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS } from '../../../utils/constants';
import { testSyncWithAdapters } from '../../helpers/testCommands';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../testConstants';
import {
  clearSelectionStates,
  createWorkspaceSnapshot,
  restoreWorkspaceSnapshot,
  sleep,
  switchToWorkspace,
} from '../testHelpers';

describe('Adapter Suites Workflow Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let rulesManager: any;
  let selectionStateManager: any;

  const copilotCoreAdapters = [
    'copilot',
    'copilot-instructions-files',
    'copilot-skills',
    'copilot-agents',
    'copilot-prompts',
  ];

  const claudeCoreAdapters = [
    'claude-md',
    'claude-skills',
    'claude-commands',
    'claude-agents',
    'claude-hooks',
    'claude-hooks-settings',
  ];

  const cleanupPaths = [
    '.github/copilot-instructions.md',
    '.github/instructions',
    '.github/skills',
    '.github/agents',
    '.github/prompts',
    '.github/hooks',
    'CLAUDE.md',
    '.claude/skills',
    '.claude/commands',
    '.claude/agents',
    '.claude/hooks',
    '.claude/settings.json',
  ];

  async function syncAndSelectAllRules(): Promise<string[]> {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES, []);

    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.EXTRA_LONG);

    const enabledSourceIds = sources.filter((source) => source.enabled).map((source) => source.id);

    for (let i = 0; i < 20; i++) {
      const loaded = enabledSourceIds.some(
        (sourceId) => rulesManager.getRulesBySource(sourceId).length > 0,
      );
      if (loaded) {
        break;
      }
      await sleep(TEST_DELAYS.SHORT);
    }

    for (const sourceId of enabledSourceIds) {
      const rules = rulesManager.getRulesBySource(sourceId);
      if (rules.length > 0) {
        selectionStateManager.updateSelection(
          sourceId,
          rules.map((rule: any) => rule.filePath),
          false,
          workspaceFolder.uri.fsPath,
        );
        await selectionStateManager.persistToDisk(sourceId, workspaceFolder.uri.fsPath);
      }
    }

    return enabledSourceIds;
  }

  before(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    workspaceFolder = await switchToWorkspace('Workflows: Adapter Suites', {
      verifyAdapter: true,
      adapterType: 'rules',
    });

    await createWorkspaceSnapshot(workspaceFolder);

    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) {
      await ext.activate();
    }

    const api = ext?.exports;
    rulesManager = api?.rulesManager;
    selectionStateManager = api?.selectionStateManager;

    assert.ok(rulesManager, 'RulesManager should be available');
    assert.ok(selectionStateManager, 'SelectionStateManager should be available');

    const readmePath = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);
    await sleep(TEST_DELAYS.SHORT);
  });

  after(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);
    if (workspaceFolder) {
      await restoreWorkspaceSnapshot(workspaceFolder);
    }
  });

  afterEach(async () => {
    if (!workspaceFolder) {
      return;
    }

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string }>>(CONFIG_KEYS.SOURCES, []);
    await clearSelectionStates(
      selectionStateManager,
      sources.map((source) => source.id),
    );

    for (const relativePath of cleanupPaths) {
      const fullPath = path.join(workspaceFolder.uri.fsPath, relativePath);
      if (await fs.pathExists(fullPath)) {
        await fs.remove(fullPath);
      }
    }
  });

  it('Should sync copilot-core suite outputs together', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    await syncAndSelectAllRules();
    await testSyncWithAdapters(copilotCoreAdapters);
    await sleep(TEST_DELAYS.LONG);

    assert.ok(
      await fs.pathExists(path.join(workspaceFolder.uri.fsPath, '.github/copilot-instructions.md')),
      'copilot root instructions should be generated',
    );
    assert.ok(
      await fs.pathExists(path.join(workspaceFolder.uri.fsPath, '.github/instructions')),
      'copilot instructions directory should exist',
    );
    assert.ok(
      await fs.pathExists(path.join(workspaceFolder.uri.fsPath, '.github/skills')),
      'copilot skills directory should exist',
    );
    assert.ok(
      await fs.pathExists(path.join(workspaceFolder.uri.fsPath, '.github/agents')),
      'copilot agents directory should exist',
    );
    assert.ok(
      await fs.pathExists(path.join(workspaceFolder.uri.fsPath, '.github/prompts')),
      'copilot prompts directory should exist',
    );
    assert.ok(
      !(await fs.pathExists(path.join(workspaceFolder.uri.fsPath, '.github/hooks'))),
      'copilot hooks should not be generated by copilot-core suite',
    );
  });

  it('Should sync claude-core suite outputs together', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    await syncAndSelectAllRules();
    await testSyncWithAdapters(claudeCoreAdapters);
    await sleep(TEST_DELAYS.LONG);

    assert.ok(
      await fs.pathExists(path.join(workspaceFolder.uri.fsPath, 'CLAUDE.md')),
      'CLAUDE.md should be generated',
    );
    assert.ok(
      await fs.pathExists(path.join(workspaceFolder.uri.fsPath, '.claude/skills')),
      'claude skills directory should exist',
    );
    assert.ok(
      await fs.pathExists(path.join(workspaceFolder.uri.fsPath, '.claude/commands')),
      'claude commands directory should exist',
    );
    assert.ok(
      await fs.pathExists(path.join(workspaceFolder.uri.fsPath, '.claude/agents')),
      'claude agents directory should exist',
    );
    assert.ok(
      await fs.pathExists(path.join(workspaceFolder.uri.fsPath, '.claude/hooks')),
      'claude hooks directory should exist',
    );
    assert.ok(
      await fs.pathExists(path.join(workspaceFolder.uri.fsPath, '.claude/settings.json')),
      'claude hook settings should exist',
    );
  });
});
