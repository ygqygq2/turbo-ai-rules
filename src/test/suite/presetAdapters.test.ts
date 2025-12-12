/**
 * 预设适配器集成测试
 * 测试新增的预设适配器（Windsurf, Cline, Roo-Cline, Aider, Bolt, Qodo Gen）
 */
import * as assert from 'assert';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as vscode from 'vscode';

import { PRESET_ADAPTERS } from '../../adapters/PresetAdapter';

describe('Preset Adapters Integration Tests', () => {
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

  after(async () => {
    // 清理生成的配置文件
    if (workspaceFolder) {
      const cleanupPaths = [
        '.cursorrules',
        '.windsurfrules',
        '.github/copilot-instructions.md',
        '.continuerules',
        '.clinerules',
        '.roo-clinerules',
        '.aider.conf.yml',
        '.bolt/prompt',
        '.qodo/rules.md',
      ];

      for (const filePath of cleanupPaths) {
        const fullPath = path.join(workspaceFolder.uri.fsPath, filePath);
        try {
          await fs.remove(fullPath);
        } catch (error) {
          // 忽略删除失败的错误
        }
      }
    }
  });

  test('应该加载所有9个预设适配器', () => {
    assert.strictEqual(PRESET_ADAPTERS.length, 9, '预设适配器数量应为9个');

    const expectedAdapters = [
      'cursor',
      'windsurf',
      'copilot',
      'continue',
      'cline',
      'roo-cline',
      'aider',
      'bolt',
      'qodo-gen',
    ];

    const actualIds = PRESET_ADAPTERS.map((adapter) => adapter.id);
    for (const expectedId of expectedAdapters) {
      assert.ok(actualIds.includes(expectedId), `预设适配器应包含 ${expectedId}`);
    }
  });

  test('所有预设适配器应有必需的属性', () => {
    for (const adapter of PRESET_ADAPTERS) {
      assert.ok(adapter.id, `适配器 ${adapter.id} 应有 id`);
      assert.ok(adapter.name, `适配器 ${adapter.id} 应有 name`);
      assert.ok(adapter.filePath, `适配器 ${adapter.id} 应有 filePath`);
      assert.ok(adapter.type, `适配器 ${adapter.id} 应有 type`);
      assert.ok(
        ['file', 'directory'].includes(adapter.type),
        `适配器 ${adapter.id} 的 type 应为 file 或 directory`,
      );
    }
  });

  test('预设适配器ID应为kebab-case格式', () => {
    const kebabCasePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    for (const adapter of PRESET_ADAPTERS) {
      assert.ok(kebabCasePattern.test(adapter.id), `适配器 ID ${adapter.id} 应为 kebab-case 格式`);
    }
  });

  test('应该能够配置并启用Windsurf适配器', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

    // 启用 Windsurf 适配器
    const adapters = config.get<Record<string, any>>('adapters', {});
    adapters.windsurf = { enabled: true };
    await config.update('adapters', adapters, vscode.ConfigurationTarget.Workspace);

    // 验证配置已更新
    const updatedConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const updatedAdapters = updatedConfig.get<Record<string, any>>('adapters', {});
    assert.strictEqual(updatedAdapters.windsurf?.enabled, true, 'Windsurf 适配器应已启用');

    // 清理配置
    adapters.windsurf = { enabled: false };
    await config.update('adapters', adapters, vscode.ConfigurationTarget.Workspace);
  });

  test('应该能够配置并启用多个新增的适配器', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

    // 启用多个新增适配器
    const adapters = config.get<Record<string, any>>('adapters', {});
    const newAdapters = ['windsurf', 'cline', 'roo-cline', 'aider', 'bolt', 'qodo-gen'];

    for (const adapterId of newAdapters) {
      adapters[adapterId] = { enabled: true };
    }
    await config.update('adapters', adapters, vscode.ConfigurationTarget.Workspace);

    // 验证所有适配器已启用
    const updatedConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const updatedAdapters = updatedConfig.get<Record<string, any>>('adapters', {});

    for (const adapterId of newAdapters) {
      assert.strictEqual(updatedAdapters[adapterId]?.enabled, true, `${adapterId} 适配器应已启用`);
    }

    // 清理配置
    for (const adapterId of newAdapters) {
      adapters[adapterId] = { enabled: false };
    }
    await config.update('adapters', adapters, vscode.ConfigurationTarget.Workspace);
  });

  test('新格式配置应该被正确读取', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

    // 设置新格式配置
    const adapters = {
      cursor: { enabled: true, autoUpdate: false },
      windsurf: { enabled: true, autoUpdate: true },
      copilot: { enabled: false },
    };
    await config.update('adapters', adapters, vscode.ConfigurationTarget.Workspace);

    // 验证配置读取
    const readConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const readAdapters = readConfig.get<Record<string, any>>('adapters', {});

    assert.strictEqual(readAdapters.cursor?.enabled, true);
    assert.strictEqual(readAdapters.cursor?.autoUpdate, false);
    assert.strictEqual(readAdapters.windsurf?.enabled, true);
    assert.strictEqual(readAdapters.windsurf?.autoUpdate, true);
    assert.strictEqual(readAdapters.copilot?.enabled, false);

    // 清理配置
    await config.update('adapters', {}, vscode.ConfigurationTarget.Workspace);
  });
});
