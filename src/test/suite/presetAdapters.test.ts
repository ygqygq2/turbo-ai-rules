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
        } catch (_error) {
          // 忽略删除失败的错误
        }
      }
    }
  });

  it('Should load all 9 preset adapters', () => {
    assert.strictEqual(PRESET_ADAPTERS.length, 9, 'Should have 9 preset adapters');

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
      assert.ok(actualIds.includes(expectedId), `Preset adapter should include ${expectedId}`);
    }
  });

  it('All preset adapters should have required properties', () => {
    for (const adapter of PRESET_ADAPTERS) {
      assert.ok(adapter.id, `Adapter ${adapter.id} should have id`);
      assert.ok(adapter.name, `Adapter ${adapter.id} should have name`);
      assert.ok(adapter.filePath, `Adapter ${adapter.id} should have filePath`);
      assert.ok(adapter.type, `Adapter ${adapter.id} should have type`);
      assert.ok(
        ['file', 'directory'].includes(adapter.type),
        `Adapter ${adapter.id} type should be file or directory`,
      );
    }
  });

  it('Preset adapter IDs should be in kebab-case format', () => {
    const kebabCasePattern = /^[a-z0-9]+(-[a-z0-9]+)*$/;
    for (const adapter of PRESET_ADAPTERS) {
      assert.ok(
        kebabCasePattern.test(adapter.id),
        `Adapter ID ${adapter.id} should be in kebab-case format`,
      );
    }
  });

  it('Should be able to configure and enable Windsurf adapter', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

    // Enable Windsurf adapter
    const adapters = config.get<Record<string, any>>('adapters', {});
    adapters.windsurf = { enabled: true };
    await config.update('adapters', adapters, vscode.ConfigurationTarget.Workspace);

    // Verify configuration has been updated
    const updatedConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const updatedAdapters = updatedConfig.get<Record<string, any>>('adapters', {});
    assert.strictEqual(
      updatedAdapters.windsurf?.enabled,
      true,
      'Windsurf adapter should be enabled',
    );

    // 清理配置
    adapters.windsurf = { enabled: false };
    await config.update('adapters', adapters, vscode.ConfigurationTarget.Workspace);
  });

  it('Should be able to configure and enable multiple new adapters', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

    // Enable multiple new adapters
    const adapters = config.get<Record<string, any>>('adapters', {});
    const newAdapters = ['windsurf', 'cline', 'roo-cline', 'aider', 'bolt', 'qodo-gen'];

    for (const adapterId of newAdapters) {
      adapters[adapterId] = { enabled: true };
    }
    await config.update('adapters', adapters, vscode.ConfigurationTarget.Workspace);

    // Verify all adapters are enabled
    const updatedConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const updatedAdapters = updatedConfig.get<Record<string, any>>('adapters', {});

    for (const adapterId of newAdapters) {
      assert.strictEqual(
        updatedAdapters[adapterId]?.enabled,
        true,
        `${adapterId} adapter should be enabled`,
      );
    }

    // 清理配置
    for (const adapterId of newAdapters) {
      adapters[adapterId] = { enabled: false };
    }
    await config.update('adapters', adapters, vscode.ConfigurationTarget.Workspace);
  });

  it('New format configuration should be read correctly', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

    // Set new format configuration
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

  describe('Adapter Sorting Configuration', () => {
    it('Should be able to configure sortBy and sortOrder for preset adapters', async () => {
      const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

      // 设置排序配置
      const adapters = {
        copilot: {
          enabled: true,
          sortBy: 'id',
          sortOrder: 'desc',
        },
      };
      await config.update('adapters', adapters, vscode.ConfigurationTarget.WorkspaceFolder);

      // 验证配置读取
      const readConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
      const readAdapters = readConfig.get<Record<string, any>>('adapters', {});

      assert.strictEqual(readAdapters.copilot?.enabled, true);
      assert.strictEqual(readAdapters.copilot?.sortBy, 'id');
      assert.strictEqual(readAdapters.copilot?.sortOrder, 'desc');

      // 清理配置
      await config.update('adapters', {}, vscode.ConfigurationTarget.WorkspaceFolder);
    });

    it('Should support all sortBy options: id, priority, none', async function () {
      this.timeout(10000);
      const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

      const sortByOptions = ['id', 'priority', 'none'];

      for (const sortBy of sortByOptions) {
        const adapters = {
          cursor: { enabled: true, sortBy },
        };
        await config.update('adapters', adapters, vscode.ConfigurationTarget.Workspace);

        const readConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
        const readAdapters = readConfig.get<Record<string, any>>('adapters', {});

        assert.strictEqual(readAdapters.cursor?.sortBy, sortBy, `sortBy should be ${sortBy}`);
      }

      // 清理配置
      await config.update('adapters', {}, vscode.ConfigurationTarget.Workspace);
    });

    it('Should support all sortOrder options: asc, desc', async () => {
      const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

      const sortOrderOptions = ['asc', 'desc'];

      for (const sortOrder of sortOrderOptions) {
        const adapters = {
          cursor: { enabled: true, sortOrder },
        };
        await config.update('adapters', adapters, vscode.ConfigurationTarget.Workspace);

        const readConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
        const readAdapters = readConfig.get<Record<string, any>>('adapters', {});

        assert.strictEqual(
          readAdapters.cursor?.sortOrder,
          sortOrder,
          `sortOrder should be ${sortOrder}`,
        );
      }

      // 清理配置
      await config.update('adapters', {}, vscode.ConfigurationTarget.Workspace);
    });
  });

  describe('Adapter Configuration Persistence', () => {
    afterEach(async () => {
      // 每个测试后清理配置
      const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
      await config.update('adapters', {}, vscode.ConfigurationTarget.Workspace);
    });

    it('Should save adapter configurations correctly (not as empty objects)', async function () {
      this.timeout(5000);
      const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

      // 设置适配器配置
      const adapters = {
        cursor: {
          enabled: true,
          autoUpdate: false,
          sortBy: 'priority',
          sortOrder: 'desc',
        },
        copilot: {
          enabled: false,
          autoUpdate: true,
        },
      };
      await config.update('adapters', adapters, vscode.ConfigurationTarget.Workspace);

      // 等待配置写入
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 重新读取配置，验证保存正确
      const readConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
      const readAdapters = readConfig.get<Record<string, any>>('adapters', {});

      // 验证配置不是空对象
      assert.ok(
        Object.keys(readAdapters).length > 0,
        'Saved adapters configuration should not be empty',
      );

      // 验证每个适配器配置完整性
      assert.strictEqual(readAdapters.cursor?.enabled, true, 'cursor.enabled should be true');
      assert.strictEqual(
        readAdapters.cursor?.autoUpdate,
        false,
        'cursor.autoUpdate should be false',
      );
      assert.strictEqual(
        readAdapters.cursor?.sortBy,
        'priority',
        'cursor.sortBy should be priority',
      );
      assert.strictEqual(readAdapters.cursor?.sortOrder, 'desc', 'cursor.sortOrder should be desc');

      assert.strictEqual(readAdapters.copilot?.enabled, false, 'copilot.enabled should be false');
      assert.strictEqual(
        readAdapters.copilot?.autoUpdate,
        true,
        'copilot.autoUpdate should be true',
      );
    });

    it('Should only save user-modified adapters to reduce config file size', async function () {
      this.timeout(5000);
      const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

      // 设置多个适配器：启用的、禁用但有配置的、完全默认的
      const adapters = {
        cursor: { enabled: true, autoUpdate: false },
        copilot: { enabled: true, sortBy: 'id' },
        windsurf: { enabled: false, autoUpdate: true }, // 禁用的但有其他配置
        cline: { enabled: false, autoUpdate: true }, // 禁用的但有其他配置
      };
      await config.update('adapters', adapters, vscode.ConfigurationTarget.Workspace);

      // 等待配置写入
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 重新读取配置
      const readConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
      const readAdapters = readConfig.get<Record<string, any>>('adapters', {});

      // 验证所有有配置的适配器都被保存（无论启用/禁用）
      assert.ok(readAdapters.cursor, 'cursor (enabled) should be saved');
      assert.ok(readAdapters.copilot, 'copilot (enabled) should be saved');
      assert.ok(readAdapters.windsurf, 'windsurf (disabled but configured) should be saved');
      assert.ok(readAdapters.cline, 'cline (disabled but configured) should be saved');

      // 验证配置完整性
      assert.strictEqual(readAdapters.cursor?.enabled, true);
      assert.strictEqual(readAdapters.cursor?.autoUpdate, false);
      assert.strictEqual(readAdapters.copilot?.enabled, true);
      assert.strictEqual(readAdapters.copilot?.sortBy, 'id');
      assert.strictEqual(readAdapters.windsurf?.enabled, false);
      assert.strictEqual(readAdapters.windsurf?.autoUpdate, true);
    });

    it('Should deep clone configurations to avoid corrupting shared settings.json', async function () {
      this.timeout(5000);
      const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

      // 设置嵌套配置对象
      const adapters = {
        cursor: {
          enabled: true,
          autoUpdate: false,
          sortBy: 'priority',
          sortOrder: 'desc',
          // 添加嵌套对象测试深度克隆
          nested: {
            level1: {
              level2: {
                value: 'test-deep-clone',
              },
            },
          },
        },
      };
      await config.update('adapters', adapters, vscode.ConfigurationTarget.Workspace);

      // 等待配置写入
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 重新读取配置
      const readConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
      const readAdapters = readConfig.get<Record<string, any>>('adapters', {});

      // 验证嵌套对象完整保存（深度克隆成功）
      assert.ok(readAdapters.cursor?.nested, 'nested object should exist');
      assert.ok(readAdapters.cursor?.nested?.level1, 'nested.level1 should exist');
      assert.ok(readAdapters.cursor?.nested?.level1?.level2, 'nested.level1.level2 should exist');
      assert.strictEqual(
        readAdapters.cursor?.nested?.level1?.level2?.value,
        'test-deep-clone',
        'deeply nested value should be preserved',
      );

      // 验证顶层配置也完整
      assert.strictEqual(readAdapters.cursor?.enabled, true);
      assert.strictEqual(readAdapters.cursor?.autoUpdate, false);
      assert.strictEqual(readAdapters.cursor?.sortBy, 'priority');
      assert.strictEqual(readAdapters.cursor?.sortOrder, 'desc');
    });

    it('Should handle mixed enabled/disabled adapters with complex configurations', async function () {
      this.timeout(5000);
      const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);

      // 复杂混合配置场景
      const adapters = {
        cursor: {
          enabled: true,
          autoUpdate: true,
          sortBy: 'id',
          sortOrder: 'asc',
          metadata: { version: '1.0', tags: ['test'] },
        },
        copilot: {
          enabled: true,
          autoUpdate: false,
        },
        windsurf: {
          enabled: false,
          autoUpdate: true,
          sortBy: 'priority',
        },
        cline: {
          enabled: true,
          sortBy: 'none',
        },
        'roo-cline': {
          enabled: false, // 禁用且有配置
        },
      };
      await config.update('adapters', adapters, vscode.ConfigurationTarget.Workspace);

      // 等待配置写入
      await new Promise((resolve) => setTimeout(resolve, 500));

      // 重新读取配置
      const readConfig = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
      const readAdapters = readConfig.get<Record<string, any>>('adapters', {});

      // 验证所有有配置的适配器都被保存（无论启用/禁用）
      const configuredAdapters = ['cursor', 'copilot', 'windsurf', 'cline', 'roo-cline'];
      for (const adapterId of configuredAdapters) {
        assert.ok(readAdapters[adapterId], `${adapterId} (configured) should be saved`);
      }

      // 验证启用状态正确
      assert.strictEqual(readAdapters.cursor?.enabled, true);
      assert.strictEqual(readAdapters.copilot?.enabled, true);
      assert.strictEqual(readAdapters.windsurf?.enabled, false);
      assert.strictEqual(readAdapters.cline?.enabled, true);
      assert.strictEqual(readAdapters['roo-cline']?.enabled, false);

      // 验证复杂对象（数组、嵌套对象）完整保存
      assert.deepStrictEqual(
        readAdapters.cursor?.metadata,
        { version: '1.0', tags: ['test'] },
        'Complex nested objects and arrays should be fully preserved',
      );
    });
  });
});
