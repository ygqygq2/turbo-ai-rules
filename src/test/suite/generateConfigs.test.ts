import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { SelectionStateManager } from '../../services/SelectionStateManager';
import { initializeAllTestSourcesSelection } from './testHelpers';

describe('Generate Config Files Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let selectionStateManager: SelectionStateManager;

  beforeEach(async () => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');
    // 使用第一个工作区（Cursor Adapter）
    workspaceFolder = folders[0];

    // 初始化选择状态管理器
    selectionStateManager = SelectionStateManager.getInstance();
  });

  afterEach(async () => {
    if (!workspaceFolder) {
      return;
    }

    // 清理选择状态
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string }>>('sources');
    if (sources) {
      for (const source of sources) {
        selectionStateManager.clearState(source.id);
      }
    }

    // 清理生成的配置文件
    const pathsToClean = [
      path.join(workspaceFolder.uri.fsPath, '.cursorrules'),
      path.join(workspaceFolder.uri.fsPath, '.github'),
      path.join(workspaceFolder.uri.fsPath, '.continue'),
      path.join(workspaceFolder.uri.fsPath, 'rules'),
    ];

    for (const cleanPath of pathsToClean) {
      if (await fs.pathExists(cleanPath)) {
        await fs.remove(cleanPath);
      }
    }
  });

  it('Should generate adapter config files after sync', async function () {
    this.timeout(180000); // 3分钟 - 需要 Git 克隆

    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    // 先同步规则
    console.log('Syncing rules...');
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 同步后初始化选择状态（全选所有规则）
    await initializeAllTestSourcesSelection(workspaceFolder);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 生成配置文件
    console.log('Generating configs...');
    await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 验证文件存在
    const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
    const exists = await fs.pathExists(cursorRulesPath);

    if (!exists) {
      const rootFiles = await fs.readdir(workspaceFolder.uri.fsPath);
      console.log('Workspace contents:', rootFiles);
    }

    assert.ok(exists, 'Adapter config file should exist after generateConfigs');

    // 验证内容
    if (exists) {
      const stat = await fs.stat(cursorRulesPath);
      if (stat.isFile()) {
        const content = await fs.readFile(cursorRulesPath, 'utf-8');
        assert.ok(content.length > 0, 'Config file should have content');
        console.log(`Config file generated with ${content.length} characters`);
      }
    }
  });
});
