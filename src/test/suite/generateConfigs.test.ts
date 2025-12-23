import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS } from '../../utils/constants';

// 通过扩展获取服务实例
let rulesManager: any;
let selectionStateManager: any;

describe('Generate Config Files Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  beforeEach(async () => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');
    // 使用专门的 Generate Config Files 测试工作区
    workspaceFolder = folders.find((f) => f.name.includes('Generate Config Files')) || folders[0];

    // 从扩展获取服务实例
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) {
      await ext.activate();
    }
    const api = ext?.exports;
    rulesManager = api?.rulesManager;
    selectionStateManager = api?.selectionStateManager;
  });

  afterEach(async () => {
    if (!workspaceFolder) {
      return;
    }

    // 清理选择状态
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string }>>(CONFIG_KEYS.SOURCES);
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
      path.join(workspaceFolder.uri.fsPath, 'skills'),
    ];

    for (const cleanPath of pathsToClean) {
      if (await fs.pathExists(cleanPath)) {
        await fs.remove(cleanPath);
      }
    }
  });

  it('Should generate adapter config files after sync', async function () {
    this.timeout(180000); // 3分钟 - 需要 Git 克隆

    // 配置已在 settings.json 中预设
    const readmePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);

    // 先同步规则
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 等待规则加载到 RulesManager（轮询检查）
    let allRules: any[] = [];
    for (let i = 0; i < 20; i++) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      allRules = rulesManager.getAllRules();
      if (allRules.length > 0) {
        break;
      }
    }

    assert.ok(allRules.length > 0, 'Rules should be loaded after sync');

    // 模拟用户选择规则：获取所有源并选中所有规则
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; enabled: boolean }>>(CONFIG_KEYS.SOURCES);

    for (const source of sources!.filter((s: any) => s.enabled)) {
      const sourceRules = rulesManager.getRulesBySource(source.id);
      if (sourceRules.length > 0) {
        const allPaths = sourceRules.map((rule: any) => rule.filePath);
        selectionStateManager.updateSelection(
          source.id,
          allPaths,
          false,
          workspaceFolder.uri.fsPath,
        );
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 生成配置文件
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
