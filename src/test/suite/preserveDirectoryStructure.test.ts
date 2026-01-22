import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS } from '../../utils/constants';

/**
 * preserveDirectoryStructure 配置集成测试
 * 测试目录适配器的目录结构保持功能
 */
describe('Preserve Directory Structure Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  before(async () => {
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');

    // 使用第一个工作区文件夹
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

    // 清理生成的测试文件
    const pathsToClean = [path.join(workspaceFolder.uri.fsPath, 'test-preserve-structure')];

    for (const cleanPath of pathsToClean) {
      if (await fs.pathExists(cleanPath)) {
        await fs.remove(cleanPath);
      }
    }
  });

  it('Should preserve directory structure when preserveDirectoryStructure=true', async function () {
    this.timeout(120000); // 2 minutes

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

    // 创建测试适配器配置（preserveDirectoryStructure=true）
    const testAdapter = {
      id: 'test-preserve-true',
      name: 'Test Preserve Structure',
      enabled: true,
      autoUpdate: true,
      outputPath: 'test-preserve-structure/true',
      outputType: 'directory' as const,
      sourceIds: ['turbo-ai-rules-source'],
      preserveDirectoryStructure: true,
    };

    const currentAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);
    const newAdapters = [
      ...currentAdapters.filter((a: any) => a.id !== testAdapter.id),
      testAdapter,
    ];

    try {
      await config.update(
        CONFIG_KEYS.ADAPTERS_CUSTOM,
        newAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );

      // 同步规则
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 生成配置
      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 验证输出目录
      const outputPath = path.join(workspaceFolder.uri.fsPath, testAdapter.outputPath);
      const outputExists = await fs.pathExists(outputPath);
      assert.ok(outputExists, `Output directory should exist: ${outputPath}`);

      // 检查是否保持了目录结构
      // 假设源仓库中有 ai-rules/1001-naming.md
      // preserveDirectoryStructure=true 应生成: test-preserve-structure/true/turbo-ai-rules-source/1001-naming.md
      const sourceDir = path.join(outputPath, 'turbo-ai-rules-source');
      if (await fs.pathExists(sourceDir)) {
        const files = await fs.readdir(sourceDir);
        // 应该有文件在子目录中
        assert.ok(files.length > 0, 'Should have files in source directory');
      }
    } finally {
      // 恢复配置
      await config.update(
        CONFIG_KEYS.ADAPTERS_CUSTOM,
        currentAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
    }
  });

  it('Should flatten files when preserveDirectoryStructure=false', async function () {
    this.timeout(120000); // 2 minutes

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

    // 创建测试适配器配置（preserveDirectoryStructure=false）
    const testAdapter = {
      id: 'test-preserve-false',
      name: 'Test Flatten Structure',
      enabled: true,
      autoUpdate: true,
      outputPath: 'test-preserve-structure/false',
      outputType: 'directory' as const,
      sourceIds: ['turbo-ai-rules-source'],
      preserveDirectoryStructure: false,
    };

    const currentAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);
    const newAdapters = [
      ...currentAdapters.filter((a: any) => a.id !== testAdapter.id),
      testAdapter,
    ];

    try {
      await config.update(
        CONFIG_KEYS.ADAPTERS_CUSTOM,
        newAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );

      // 同步规则
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 生成配置
      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 验证输出目录
      const outputPath = path.join(workspaceFolder.uri.fsPath, testAdapter.outputPath);
      const outputExists = await fs.pathExists(outputPath);
      assert.ok(outputExists, `Output directory should exist: ${outputPath}`);

      // 检查文件是否平铺（直接在输出目录或源子目录下）
      // preserveDirectoryStructure=false 应生成: test-preserve-structure/false/turbo-ai-rules-source/1001-naming.md
      // 文件应该直接在源目录下，不保持深层结构
      const sourceDir = path.join(outputPath, 'turbo-ai-rules-source');
      if (await fs.pathExists(sourceDir)) {
        const files = await fs.readdir(sourceDir);
        // 文件应该直接在这一层
        const mdFiles = files.filter((f) => f.endsWith('.md'));
        assert.ok(mdFiles.length > 0, 'Should have markdown files');
      }
    } finally {
      // 恢复配置
      await config.update(
        CONFIG_KEYS.ADAPTERS_CUSTOM,
        currentAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
    }
  });

  it('Should generate correct index file paths with preserveDirectoryStructure', async function () {
    this.timeout(120000); // 2 minutes

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

    // 创建测试适配器配置
    const testAdapter = {
      id: 'test-index-paths',
      name: 'Test Index Paths',
      enabled: true,
      autoUpdate: true,
      outputPath: 'test-preserve-structure/index',
      outputType: 'directory' as const,
      sourceIds: ['turbo-ai-rules-source'],
      preserveDirectoryStructure: true,
    };

    const currentAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);
    const newAdapters = [
      ...currentAdapters.filter((a: any) => a.id !== testAdapter.id),
      testAdapter,
    ];

    try {
      await config.update(
        CONFIG_KEYS.ADAPTERS_CUSTOM,
        newAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );

      // 同步规则
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 生成配置
      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 验证索引文件
      const indexPath = path.join(workspaceFolder.uri.fsPath, testAdapter.outputPath, 'index.md');
      if (await fs.pathExists(indexPath)) {
        const indexContent = await fs.readFile(indexPath, 'utf-8');

        // 索引文件应该包含正确的相对路径
        // 例如: ./turbo-ai-rules-source/1001-naming.md
        // 而不是错误的: ./test-preserve-structure/index/turbo-ai-rules-source/1001-naming.md
        assert.ok(
          indexContent.includes('./turbo-ai-rules-source/'),
          'Index should have correct relative paths',
        );
        assert.ok(
          !indexContent.includes(testAdapter.outputPath),
          'Index should not include outputPath in links',
        );
      }
    } finally {
      // 恢复配置
      await config.update(
        CONFIG_KEYS.ADAPTERS_CUSTOM,
        currentAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
    }
  });
});
