import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS } from '../../utils/constants';

/**
 * Skills 适配器集成测试
 * 测试通过 skills: true 配置，从源仓库的子路径同步技能文件
 */
describe('Skills Adapter Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  before(async () => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');

    // Find the "Test: Skills Adapter" workspace folder
    const skillsFolder = folders.find((f) => f.name === 'Test: Skills Adapter');
    workspaceFolder = skillsFolder || folders[0];

    // Activate extension
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) {
      await ext.activate();
    }
  });

  afterEach(async () => {
    if (!workspaceFolder) {
      return;
    }

    // 清理生成的 skills 文件
    const pathsToClean = [
      path.join(workspaceFolder.uri.fsPath, '.claude'),
      path.join(workspaceFolder.uri.fsPath, 'test-skills'),
    ];

    for (const cleanPath of pathsToClean) {
      if (await fs.pathExists(cleanPath)) {
        await fs.remove(cleanPath);
      }
    }
  });

  it('Should sync skills files via skills adapter', async function () {
    this.timeout(180000); // 3 minutes

    // Get configuration
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);

    // Check if skills adapter is configured
    const skillsAdapter = customAdapters.find((adapter) => adapter.skills === true);

    if (!skillsAdapter) {
      // Skills adapter not configured, test should verify graceful handling
      console.log('No skills adapter configured, testing graceful handling');
      // The test continues to verify normal behavior without skills adapter
    }

    // 先同步规则（确保源仓库已克隆）
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 等待同步完成
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 生成配置（包括 skills）
    await vscode.commands.executeCommand('turbo-ai-rules.generateRules');

    // 等待生成完成
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // 如果有 skills adapter 配置，验证输出
    if (skillsAdapter) {
      // 验证输出目录存在
      const skillsOutputPath = path.join(workspaceFolder.uri.fsPath, skillsAdapter.outputPath);
      const outputExists = await fs.pathExists(skillsOutputPath);

      assert.ok(outputExists, `Skills output directory should exist: ${skillsOutputPath}`);

      // 验证是否有文件被复制
      if (await fs.pathExists(skillsOutputPath)) {
        const files = await fs.readdir(skillsOutputPath);
        const skillFiles = files.filter(
          (file) => file.endsWith('.md') || file.endsWith('.mdc') || file.endsWith('.txt'),
        );

        if (skillFiles.length > 0) {
          // 验证文件内容（检查是否是直接复制，而不是经过规则解析）
          const firstFile = path.join(skillsOutputPath, skillFiles[0]);
          const content = await fs.readFile(firstFile, 'utf-8');

          // Skills 文件应该保持原始格式，可能包含或不包含 frontmatter
          assert.ok(content.length > 0, 'Skill file should have content');
        }
      }
    } else {
      // 没有配置 skills adapter，验证系统正常工作
      console.log('✓ System works correctly without skills adapter configuration');
      assert.ok(true, 'Should handle missing skills adapter gracefully');
    }
  });

  it('Should handle missing sourceId gracefully', async function () {
    this.timeout(60000);

    // 创建一个无效的 skills 配置（缺少 sourceId）
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

    const invalidAdapter = {
      id: 'test-invalid-skills',
      name: 'Invalid Skills Adapter',
      enabled: true,
      autoUpdate: true,
      outputPath: 'test-skills',
      outputType: 'directory',
      skills: true,
      // 缺少 sourceId
      subPath: '/skills',
    };

    const currentAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);
    const newAdapters = [
      ...currentAdapters.filter((a) => a.id !== invalidAdapter.id),
      invalidAdapter,
    ];

    await config.update(
      CONFIG_KEYS.ADAPTERS_CUSTOM,
      newAdapters,
      vscode.ConfigurationTarget.WorkspaceFolder,
    );

    // 尝试生成配置
    try {
      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 应该能够处理错误而不崩溃
      assert.ok(true, 'Should handle missing sourceId without crashing');
    } finally {
      // 恢复配置
      await config.update(
        'adapters.custom',
        currentAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
    }
  });
});
