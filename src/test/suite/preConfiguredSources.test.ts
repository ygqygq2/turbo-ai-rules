import * as assert from 'assert';
import * as vscode from 'vscode';

describe('Pre-configured Sources Tests', () => {
  it('Should read pre-configured sources from workspace settings', async () => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'Workspace folders should exist');

    // 测试每个工作区文件夹
    for (const folder of folders) {
      const config = vscode.workspace.getConfiguration('turbo-ai-rules', folder.uri);
      const configSources = config.get<Array<{ id: string; name: string }>>('sources', []);

      if (configSources.length > 0) {
        console.log(
          `✓ Folder "${folder.name}" has ${configSources.length} pre-configured source(s)`,
        );

        // 验证每个源都有必需的字段
        for (const source of configSources) {
          assert.ok(source.id, `Source should have an id in ${folder.name}`);
          assert.ok(source.name, `Source should have a name in ${folder.name}`);
        }
      }
    }
  });

  it('Should get sources from workspace configuration', () => {
    // 直接从配置读取，不依赖 ConfigManager（需要 ExtensionContext）
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'Workspace folders should exist');

    let totalSources = 0;
    for (const folder of folders) {
      const config = vscode.workspace.getConfiguration('turbo-ai-rules', folder.uri);
      const sources = config.get<Array<{ id: string }>>('sources', []);
      totalSources += sources.length;
    }

    console.log(`Found ${totalSources} pre-configured source(s) across all folders`);
    assert.ok(totalSources > 0, 'Should have at least one pre-configured source');
  });

  it('Should have sync.onStartup disabled in test workspace', async () => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'Workspace folders should exist');

    // 检查全局工作区配置
    const config = vscode.workspace.getConfiguration('turbo-ai-rules');
    const onStartup = config.get<boolean>('sync.onStartup');

    console.log(`sync.onStartup is set to: ${onStartup}`);

    // 测试工作区应该禁用启动时同步
    assert.strictEqual(onStartup, false, 'sync.onStartup should be false in test workspace');
  });
});
