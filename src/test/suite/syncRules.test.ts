import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

describe('Sync Rules Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  beforeEach(() => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');

    // 使用第一个测试工作区（rules-for-cursor）
    workspaceFolder = folders[0];
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
        const stat = await fs.stat(cleanPath);

        // 如果是文件，直接删除
        if (stat.isFile()) {
          await fs.remove(cleanPath);
          continue;
        }

        // 如果是目录，特殊处理：保留用户自定义规则
        if (stat.isDirectory() && cleanPath.endsWith('.cursorrules')) {
          const files = await fs.readdir(cleanPath);
          for (const file of files) {
            // 只删除不是用户自定义的文件
            if (!file.startsWith('custom-')) {
              const filePath = path.join(cleanPath, file);
              await fs.remove(filePath);
            }
          }
          // 如果目录为空（除了用户文件），删除目录
          const remainingFiles = await fs.readdir(cleanPath);
          if (remainingFiles.length === 0 || remainingFiles.every((f) => f.startsWith('custom-'))) {
            // 保留包含用户文件的目录
            if (remainingFiles.length === 0) {
              await fs.remove(cleanPath);
            }
          }
        } else {
          // 其他路径直接删除
          await fs.remove(cleanPath);
        }
      }
    }
  });

  it('Should sync rules from pre-configured source', async function () {
    // 增加超时时间，因为需要克隆仓库
    this.timeout(120000); // 2分钟

    // 验证预配置的源存在
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; name: string }>>('sources');

    assert.ok(sources && sources.length > 0, 'Should have pre-configured sources');

    // 打开当前 workspace folder 中的 README 文件，确保 activeEditor 在正确的 folder
    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    // 执行同步
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 等待同步和文件生成完成
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 验证：检查是否生成了配置文件（Cursor adapter 应该生成 .cursorrules 文件）
    const cursorRulesPath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
    const cursorFileExists = await fs.pathExists(cursorRulesPath);

    // 断言：应该成功同步并生成了配置文件
    assert.ok(
      cursorFileExists,
      'Should generate .cursorrules file after sync (indicating rules were synced)',
    );
  });

  it('Should handle sync without errors', async function () {
    this.timeout(120000); // 2分钟

    // 打开当前 workspace folder 中的 README 文件，确保 activeEditor 在正确的 folder
    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    // 执行同步，应该使用预配置的源
    try {
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      // 验证同步成功完成
      assert.ok(true, 'Sync completed without errors');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      assert.fail(`Sync should not throw error: ${errorMessage}`);
    }
  });

  it('Should generate adapter output files', async function () {
    this.timeout(120000); // 2分钟

    // 打开当前 workspace folder 中的 README 文件，确保 activeEditor 在正确的 folder
    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    // 执行同步
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 等待文件生成
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 验证 Cursor 配置文件生成
    const cursorFilePath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
    const fileExists = await fs.pathExists(cursorFilePath);

    assert.ok(fileExists, 'Cursor rules file should be generated after sync');

    // 检查 .cursorrules 是否是文件且有内容
    if (fileExists) {
      const stat = await fs.stat(cursorFilePath);
      if (stat.isFile()) {
        const content = await fs.readFile(cursorFilePath, 'utf-8');
        assert.ok(content.length > 0, 'Cursor rules file should have content');
      } else if (stat.isDirectory()) {
        // 如果是目录（某些配置可能生成目录）
        const files = await fs.readdir(cursorFilePath);
        const mdFiles = files.filter((f) => f.endsWith('.md') || f.endsWith('.mdc'));
        assert.ok(mdFiles.length > 0, 'Should have generated rule files');
      }
    }
  });
});
