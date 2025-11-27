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
    workspaceFolder = folders[0];

    // 激活扩展
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
    this.timeout(180000); // 3分钟

    // 获取配置
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);

    // 检查是否有 skills 适配器配置
    const skillsAdapter = customAdapters.find((adapter) => adapter.skills === true);

    if (!skillsAdapter) {
      console.log('⚠️ No skills adapter configured, skipping test');
      this.skip();
      return;
    }

    console.log(`Testing skills adapter: ${skillsAdapter.name}`);
    console.log(`  - sourceId: ${skillsAdapter.sourceId}`);
    console.log(`  - subPath: ${skillsAdapter.subPath}`);
    console.log(`  - outputPath: ${skillsAdapter.outputPath}`);

    // 先同步规则（确保源仓库已克隆）
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');

    // 等待同步完成
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 生成配置（包括 skills）
    await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');

    // 等待生成完成
    await new Promise((resolve) => setTimeout(resolve, 2000));

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

      console.log(`✅ Found ${skillFiles.length} skills files: ${skillFiles.join(', ')}`);

      if (skillFiles.length > 0) {
        // 验证文件内容（检查是否是直接复制，而不是经过规则解析）
        const firstFile = path.join(skillsOutputPath, skillFiles[0]);
        const content = await fs.readFile(firstFile, 'utf-8');

        console.log(`  - Sample file: ${skillFiles[0]} (${content.length} bytes)`);

        // Skills 文件应该保持原始格式，可能包含或不包含 frontmatter
        assert.ok(content.length > 0, 'Skill file should have content');
      }
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
      await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 应该能够处理错误而不崩溃
      console.log('✅ Handled missing sourceId without crashing');
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
