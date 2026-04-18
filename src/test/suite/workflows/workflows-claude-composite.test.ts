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

describe('Claude Composite Workflow Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let rulesManager: any;
  let selectionStateManager: any;

  const claudeCompositeAdapters = [
    'claude-md',
    'claude-commands',
    'claude-agents',
    'claude-hooks',
    'claude-hooks-settings',
  ];

  const cleanupPaths = [
    'CLAUDE.md',
    '.claude/commands',
    '.claude/agents',
    '.claude/hooks',
    '.claude/settings.json',
  ];

  async function listRelativeFiles(rootPath: string, currentPath = rootPath): Promise<string[]> {
    if (!(await fs.pathExists(currentPath))) {
      return [];
    }

    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    const files = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(currentPath, entry.name);
        if (entry.isDirectory()) {
          return listRelativeFiles(rootPath, fullPath);
        }

        return [path.relative(rootPath, fullPath).split(path.sep).join('/')];
      }),
    );

    return files.flat();
  }

  async function waitForPathExists(targetPath: string): Promise<boolean> {
    for (let i = 0; i < 20; i++) {
      if (await fs.pathExists(targetPath)) {
        return true;
      }
      await sleep(TEST_DELAYS.SHORT);
    }

    return false;
  }

  async function syncAndUpdateSelection(
    filter: (rule: any) => boolean = () => true,
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES, []);

    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.EXTRA_LONG);

    for (let i = 0; i < 20; i++) {
      const loaded = sources
        .filter((source) => source.enabled)
        .some((source) => rulesManager.getRulesBySource(source.id).length > 0);
      if (loaded) {
        break;
      }
      await sleep(TEST_DELAYS.SHORT);
    }

    for (const source of sources.filter((item) => item.enabled)) {
      const selectedRules = rulesManager
        .getRulesBySource(source.id)
        .filter((rule: any) => filter(rule));

      selectionStateManager.updateSelection(
        source.id,
        selectedRules.map((rule: any) => rule.filePath),
        false,
        workspaceFolder.uri.fsPath,
      );
      await selectionStateManager.persistToDisk(source.id, workspaceFolder.uri.fsPath);
    }
  }

  before(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    workspaceFolder = await switchToWorkspace('Workflows: Claude Composite', {
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

  it('Should generate claude command, agent, hook and hook settings outputs together', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    await syncAndUpdateSelection((rule) =>
      ['instruction', 'command', 'agent', 'hook'].includes(rule.kind ?? 'rule'),
    );
    await testSyncWithAdapters(claudeCompositeAdapters);
    await sleep(TEST_DELAYS.LONG);

    const claudeRootPath = path.join(workspaceFolder.uri.fsPath, 'CLAUDE.md');
    const commandsRoot = path.join(workspaceFolder.uri.fsPath, '.claude/commands');
    const agentsRoot = path.join(workspaceFolder.uri.fsPath, '.claude/agents');
    const hooksRoot = path.join(workspaceFolder.uri.fsPath, '.claude/hooks');
    const settingsPath = path.join(workspaceFolder.uri.fsPath, '.claude/settings.json');

    assert.ok(await fs.pathExists(claudeRootPath), 'CLAUDE.md should be generated');
    assert.ok(
      await waitForPathExists(commandsRoot),
      'Claude commands directory should be generated',
    );
    assert.ok(await waitForPathExists(agentsRoot), 'Claude agents directory should be generated');
    assert.ok(await waitForPathExists(hooksRoot), 'Claude hooks directory should be generated');
    assert.ok(await waitForPathExists(settingsPath), 'Claude hook settings should be generated');

    const commandFiles = await listRelativeFiles(commandsRoot);
    const agentFiles = await listRelativeFiles(agentsRoot);
    const hookFiles = await listRelativeFiles(hooksRoot);

    const commandRelativePath = commandFiles.find((file) => file.endsWith('new-rule.md'));
    const agentRelativePath = agentFiles.find((file) => file.endsWith('easydesign.agent.md'));
    const hookRelativePath = hookFiles.find((file) => file.endsWith('validate-bash.sh'));

    assert.strictEqual(
      commandRelativePath,
      'new-rule.md',
      'Claude command should be generated with the expected flattened output path',
    );
    assert.strictEqual(
      agentRelativePath,
      '0001-easydesign.agent.md',
      'Claude agent should preserve asset filename',
    );
    assert.strictEqual(
      hookRelativePath,
      'validate-bash.sh',
      'Claude hook should preserve asset-root relative path',
    );

    const commandContent = await fs.readFile(path.join(commandsRoot, commandRelativePath), 'utf-8');
    const agentContent = await fs.readFile(path.join(agentsRoot, agentRelativePath), 'utf-8');
    const hookContent = await fs.readFile(path.join(hooksRoot, hookRelativePath), 'utf-8');
    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf-8'));

    assert.ok(commandContent.includes('/new-rule'), 'Claude command content should be preserved');
    assert.ok(agentContent.includes('EasyDesign'), 'Claude agent content should be preserved');
    assert.ok(hookContent.includes('exit 2'), 'Claude hook script should contain blocking logic');
    assert.ok(settings.hooks?.PostToolUse?.length > 0, 'Claude settings should contain hooks');
    assert.ok(
      settings.hooks.PostToolUse[0].hooks[0].command.includes('.claude/hooks/lint-on-save.sh'),
      'Claude settings should reference generated hook scripts',
    );
  });

  it('Should remove hook outputs after hook assets are deselected and regenerated', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    await syncAndUpdateSelection((rule) =>
      ['instruction', 'command', 'agent', 'hook'].includes(rule.kind ?? 'rule'),
    );
    await testSyncWithAdapters(claudeCompositeAdapters);
    await sleep(TEST_DELAYS.LONG);

    await syncAndUpdateSelection((rule) =>
      ['instruction', 'command', 'agent'].includes(rule.kind ?? 'rule'),
    );
    await testSyncWithAdapters(claudeCompositeAdapters);
    await sleep(TEST_DELAYS.LONG);

    const commandsRoot = path.join(workspaceFolder.uri.fsPath, '.claude/commands');
    const agentsRoot = path.join(workspaceFolder.uri.fsPath, '.claude/agents');
    const hookDir = path.join(workspaceFolder.uri.fsPath, '.claude/hooks');
    const settingsPath = path.join(workspaceFolder.uri.fsPath, '.claude/settings.json');

    const commandFiles = await listRelativeFiles(commandsRoot);
    const agentFiles = await listRelativeFiles(agentsRoot);
    const hookFiles = await listRelativeFiles(hookDir);

    assert.ok(commandFiles.includes('new-rule.md'), 'Claude command output should still exist');
    assert.ok(
      agentFiles.includes('0001-easydesign.agent.md'),
      'Claude agent output should still exist',
    );
    assert.deepStrictEqual(
      hookFiles,
      [],
      'Claude hook outputs should be cleaned after deselection',
    );

    const settings = JSON.parse(await fs.readFile(settingsPath, 'utf-8'));
    assert.ok(
      !settings.hooks,
      'Claude hook settings should remove managed hooks after deselection',
    );
  });
});
