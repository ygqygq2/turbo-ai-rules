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

    // 查找 rules-for-custom-adapters 工作区文件夹
    const customAdapterFolder = folders.find((f) =>
      f.uri.fsPath.includes('rules-for-custom-adapters'),
    );

    if (!customAdapterFolder) {
      throw new Error('rules-for-custom-adapters workspace folder not found');
    }

    workspaceFolder = customAdapterFolder;

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
    this.timeout(120000);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<any[]>('sources', []);
    const actualSourceId = sources[0]?.id || 'ai-rules-7008d805';

    // 启用测试适配器
    const currentAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);
    const newAdapters = currentAdapters.map((a: any) =>
      a.id === 'test-preserve-true' ? { ...a, enabled: true } : a,
    );

    try {
      await config.update(
        CONFIG_KEYS.ADAPTERS_CUSTOM,
        newAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 同步规则
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 获取扩展导出的服务实例
      const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
      const api = ext?.exports;
      const rulesManager = api?.rulesManager;
      const selectionStateManager = api?.selectionStateManager;

      // 选择所有规则
      if (rulesManager && selectionStateManager) {
        const sourceRules = rulesManager.getRulesBySource(actualSourceId);
        assert.ok(sourceRules.length > 0, `Should have rules, got ${sourceRules.length}`);

        const allPaths = sourceRules.map((rule: any) => rule.filePath);
        selectionStateManager.updateSelection(
          actualSourceId,
          allPaths,
          false,
          workspaceFolder.uri.fsPath,
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // 生成配置
      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 验证输出目录
      const outputPath = path.join(workspaceFolder.uri.fsPath, 'test-preserve-structure/true');
      const outputExists = await fs.pathExists(outputPath);
      assert.ok(outputExists, `Output directory should exist: ${outputPath}`);

      // 检查是否保持了目录结构
      // preserveDirectoryStructure=true 应生成: test-preserve-structure/true/{sourceId}/...
      const sourceDir = path.join(outputPath, actualSourceId);
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
    this.timeout(120000);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<any[]>('sources', []);
    const actualSourceId = sources[0]?.id || 'ai-rules-7008d805';

    // 启用测试适配器
    const currentAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);
    const newAdapters = currentAdapters.map((a: any) =>
      a.id === 'test-preserve-false' ? { ...a, enabled: true } : a,
    );

    try {
      await config.update(
        CONFIG_KEYS.ADAPTERS_CUSTOM,
        newAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 同步规则
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 获取扩展导出的服务实例
      const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
      const api = ext?.exports;
      const rulesManager = api?.rulesManager;
      const selectionStateManager = api?.selectionStateManager;

      // 选择所有规则
      if (rulesManager && selectionStateManager) {
        const sourceRules = rulesManager.getRulesBySource(actualSourceId);
        const allPaths = sourceRules.map((rule: any) => rule.filePath);
        selectionStateManager.updateSelection(
          actualSourceId,
          allPaths,
          false,
          workspaceFolder.uri.fsPath,
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // 生成配置
      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 验证输出目录
      const outputPath = path.join(workspaceFolder.uri.fsPath, 'test-preserve-structure/false');
      const outputExists = await fs.pathExists(outputPath);
      assert.ok(outputExists, `Output directory should exist: ${outputPath}`);

      // 检查文件是否平铺（直接在输出目录或源子目录下）
      // preserveDirectoryStructure=false 应生成: test-preserve-structure/false/{sourceId}/...
      // 文件应该直接在源目录下，不保持深层结构
      const sourceDir = path.join(outputPath, actualSourceId);
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
    this.timeout(120000);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<any[]>('sources', []);
    const actualSourceId = sources[0]?.id || 'ai-rules-7008d805';

    // 启用测试适配器
    const currentAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);
    const newAdapters = currentAdapters.map((a: any) =>
      a.id === 'test-preserve-index' ? { ...a, enabled: true } : a,
    );

    try {
      await config.update(
        CONFIG_KEYS.ADAPTERS_CUSTOM,
        newAdapters,
        vscode.ConfigurationTarget.WorkspaceFolder,
      );
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 同步规则
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // 获取扩展导出的服务实例
      const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
      const api = ext?.exports;
      const rulesManager = api?.rulesManager;
      const selectionStateManager = api?.selectionStateManager;

      // 选择所有规则
      if (rulesManager && selectionStateManager) {
        const sourceRules = rulesManager.getRulesBySource(actualSourceId);
        if (sourceRules.length > 0) {
          const allPaths = sourceRules.map((rule: any) => rule.filePath);
          selectionStateManager.updateSelection(
            actualSourceId,
            allPaths,
            false,
            workspaceFolder.uri.fsPath,
          );
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // 生成配置
      await vscode.commands.executeCommand('turbo-ai-rules.generateRules');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 验证索引文件
      const indexPath = path.join(
        workspaceFolder.uri.fsPath,
        'test-preserve-structure/index',
        'index.md',
      );
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
          !indexContent.includes('test-preserve-structure/index'),
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
