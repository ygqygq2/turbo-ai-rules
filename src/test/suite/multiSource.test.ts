import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

describe('Multi-Source Integration Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  beforeEach(() => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');

    // 查找 multi-source 测试工作区
    workspaceFolder = folders.find((f) => f.name.includes('Multi-Source')) || folders[0];
  });

  afterEach(async () => {
    if (!workspaceFolder) {
      return;
    }

    // 清理所有可能生成的配置文件和目录
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

  it('Should handle multiple rule sources', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; name: string }>>('sources');

    assert.ok(sources, 'Sources should be defined');
    assert.strictEqual(sources!.length, 2, 'Should have 2 sources configured');
    assert.strictEqual(sources![0].id, 'ai-rules-7008d805', 'First source ID should match');
    assert.strictEqual(sources![1].id, 'cursor-rules-17caee3c', 'Second source ID should match');
  });

  it('Should respect conflict resolution strategy', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const strategy = config.get<string>('sync.conflictStrategy');

    assert.strictEqual(strategy, 'priority', 'Conflict strategy should be priority');
  });

  it('Should sync rules from multiple sources without errors', async function () {
    this.timeout(180000); // 3分钟 - Git 克隆两个仓库需要更多时间

    console.log(`Testing multi-source sync in workspace: ${workspaceFolder.name}`);

    try {
      // 打开当前 workspace folder 中的 README 文件，确保 activeEditor 在正确的 folder
      const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
      const doc = await vscode.workspace.openTextDocument(readmePath);
      await vscode.window.showTextDocument(doc);

      console.log('Starting multi-source sync...');
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      console.log('Multi-source sync completed');

      // 等待文件系统写入
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 验证至少有一个适配器的输出文件存在
      const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
      const copilotConfigPath = path.join(
        workspaceFolder.uri.fsPath,
        '.github',
        'copilot-instructions.md',
      );

      const cursorExists = await fs.pathExists(cursorRulesPath);
      const copilotExists = await fs.pathExists(copilotConfigPath);

      console.log(`Cursor output exists: ${cursorExists}`);
      console.log(`Copilot output exists: ${copilotExists}`);

      // 多源测试的重点：验证两个源都能正常同步和生成配置
      // 不测试冲突，因为这两个仓库的规则 ID 不重复，不会产生冲突
      const hasOutput = cursorExists || copilotExists;

      if (!hasOutput) {
        // 列出工作区内容帮助调试
        const rootFiles = await fs.readdir(workspaceFolder.uri.fsPath);
        console.log('Workspace root contents:', rootFiles);
      }

      assert.ok(hasOutput, 'At least one adapter output should exist after multi-source sync');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('Multi-source sync error:', errorMessage);
      assert.fail(`Multi-source sync should not throw error: ${errorMessage}`);
    }
  });

  it('Should enable multiple adapters simultaneously', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const cursorEnabled = config.get<boolean>('adapters.cursor.enabled');
    const copilotEnabled = config.get<boolean>('adapters.copilot.enabled');

    console.log(`Cursor adapter enabled: ${cursorEnabled}`);
    console.log(`Copilot adapter enabled: ${copilotEnabled}`);
    console.log(`Testing in workspace: ${workspaceFolder.name}`);

    assert.strictEqual(cursorEnabled, true, 'Cursor adapter should be enabled');
    assert.strictEqual(copilotEnabled, true, 'Copilot adapter should be enabled');
  });
});
