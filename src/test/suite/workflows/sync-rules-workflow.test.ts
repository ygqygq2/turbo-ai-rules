import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { RulesManager } from '../../../services/RulesManager';
import { cleanupTestFiles, switchToWorkspace } from '../testHelpers';

describe('Sync Rules Workflow Integration Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  before(async function () {
    this.timeout(30000);

    // 切换到 Sync Rules 测试工作区
    workspaceFolder = await switchToWorkspace('Sync Rules Workflow');
  });

  after(async function () {
    this.timeout(10000);
    // 清理测试文件
    await cleanupTestFiles(workspaceFolder);
  });

  it('Should sync rules from pre-configured source', async function () {
    this.timeout(30000);

    // 1. 验证预配置的源存在
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<Array<{ id: string; name: string }>>('sources');
    assert.ok(sources && sources.length > 0, 'Should have pre-configured sources');

    // 2. 执行同步命令
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 3. 等待规则加载完成
    const rulesManager = RulesManager.getInstance();
    let allRules: any[] = [];
    let attempts = 0;
    while (allRules.length === 0 && attempts < 20) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      allRules = rulesManager.getAllRules();
      attempts++;
    }

    // 4. 验证规则已加载
    assert.ok(allRules.length > 0, `Rules should be loaded after sync (got ${allRules.length})`);

    // 5. 验证缓存目录已创建
    const cacheDir = path.join(
      process.env.HOME || process.env.USERPROFILE || '',
      '.cache',
      'turbo-ai-rules',
      'sources',
    );
    const cacheDirExists = await fs.pathExists(cacheDir);
    assert.ok(cacheDirExists, 'Cache directory should be created');
  });

  it('Should handle sync without errors', async function () {
    this.timeout(30000);

    // 执行同步命令，不应该抛出错误
    try {
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      assert.ok(true, 'Sync completed without errors');
    } catch (error) {
      assert.fail(`Sync should not throw error: ${error}`);
    }
  });
});
