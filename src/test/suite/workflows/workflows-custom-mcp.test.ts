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

describe('Custom MCP Workflow Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let rulesManager: any;
  let selectionStateManager: any;

  function collectServerNames(rules: any[]): string[] {
    return rules.flatMap((rule) => {
      try {
        const parsed = JSON.parse(rule.rawContent || '{}');
        return Object.keys(parsed.mcpServers || {});
      } catch {
        return [];
      }
    });
  }

  async function syncAndGetMcpRules(): Promise<any[]> {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES, []);

    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.EXTRA_LONG);

    for (let i = 0; i < 20; i++) {
      const loaded = sources
        .filter((source) => source.enabled)
        .some((source) =>
          rulesManager.getRulesBySource(source.id).some((rule: any) => rule.kind === 'mcp'),
        );
      if (loaded) {
        break;
      }
      await sleep(TEST_DELAYS.SHORT);
    }

    const enabledSource = sources.find((source) => source.enabled);
    assert.ok(enabledSource, 'MCP workspace should have an enabled source');

    return rulesManager
      .getRulesBySource(enabledSource.id)
      .filter((rule: any) => rule.kind === 'mcp');
  }

  async function updateSelection(rules: any[]): Promise<void> {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const source = config
      .get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES, [])
      .find((item) => item.enabled);

    assert.ok(source, 'MCP workspace should have one enabled source');

    selectionStateManager.updateSelection(
      source.id,
      rules.map((rule: any) => rule.filePath),
      false,
      workspaceFolder.uri.fsPath,
    );
    await selectionStateManager.persistToDisk(source.id, workspaceFolder.uri.fsPath);
  }

  before(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    workspaceFolder = await switchToWorkspace('Workflows: Custom MCP', {
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

    const outputPath = path.join(workspaceFolder.uri.fsPath, '.vscode/mcp.json');
    if (await fs.pathExists(outputPath)) {
      await fs.remove(outputPath);
    }
  });

  it('Should generate merged MCP config from selected MCP assets', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    const mcpRules = await syncAndGetMcpRules();
    assert.ok(mcpRules.length > 0, 'Should load MCP assets after sync');

    await updateSelection(mcpRules);
    await testSyncWithAdapters(['mcp-json']);
    await sleep(TEST_DELAYS.LONG);

    const outputPath = path.join(workspaceFolder.uri.fsPath, '.vscode/mcp.json');
    assert.ok(await fs.pathExists(outputPath), 'Merged MCP config should be generated');

    const output = JSON.parse(await fs.readFile(outputPath, 'utf-8'));
    const expectedServers = collectServerNames(mcpRules);

    assert.deepStrictEqual(
      Object.keys(output.mcpServers || {}).sort(),
      [...expectedServers].sort(),
      'Merged MCP config should contain selected MCP servers',
    );
  });

  it('Should preserve existing MCP servers when regenerating custom merge-json output', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    const mcpRules = await syncAndGetMcpRules();
    if (mcpRules.length < 2) {
      this.skip();
      return;
    }

    await updateSelection(mcpRules);
    await testSyncWithAdapters(['mcp-json']);
    await sleep(TEST_DELAYS.LONG);

    const outputPath = path.join(workspaceFolder.uri.fsPath, '.vscode/mcp.json');
    const initialOutput = JSON.parse(await fs.readFile(outputPath, 'utf-8'));
    const initialServers = Object.keys(initialOutput.mcpServers || {});

    initialOutput.mcpServers.manual = {
      command: 'node',
      args: ['manual-mcp-server.js'],
    };
    await fs.writeFile(outputPath, `${JSON.stringify(initialOutput, null, 2)}\n`);

    const reducedRules = mcpRules.slice(0, 1);
    await updateSelection(reducedRules);
    await testSyncWithAdapters(['mcp-json']);
    await sleep(TEST_DELAYS.LONG);

    const output = JSON.parse(await fs.readFile(outputPath, 'utf-8'));
    const expectedServers = [...initialServers, 'manual'];

    assert.deepStrictEqual(
      Object.keys(output.mcpServers || {}).sort(),
      [...expectedServers].sort(),
      'Custom merge-json output should preserve existing generated and manual MCP servers',
    );
  });
});
