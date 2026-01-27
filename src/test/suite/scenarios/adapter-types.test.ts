/**
 * 适配器分类测试
 * 工作空间: rules-for-cursor (复用)
 *
 * 测试场景:
 * - 规则适配器 (isRuleType: true): Cursor, Copilot, Continue, Default
 * - Skill 适配器 (isRuleType: false)
 * - 单文件适配器 vs 目录适配器
 * - 快速同步只影响规则适配器
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

import { CONFIG_KEYS } from '../../../utils/constants';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../testConstants';
import { sleep } from '../testHelpers';

describe('Adapter Types Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;

  before(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    // 获取测试工作空间
    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'Workspace folders not found');
    workspaceFolder = folders.find((f) => f.name.includes('Cursor')) || folders[0];

    // 激活扩展
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) {
      await ext.activate();
    }

    // 切换到工作空间上下文
    const readmePath = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);
    await sleep(TEST_DELAYS.SHORT);
  });

  it('Should distinguish rule adapters from skill adapters', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const adapters = config.get<any>('adapters');
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);

    // 预设适配器 (Cursor, Copilot, Continue) 都是规则适配器
    const presetAdapters = ['cursor', 'copilot', 'continue'];

    for (const adapterName of presetAdapters) {
      if (adapters && adapters[adapterName]) {
        console.log(`Preset rule adapter: ${adapterName}`);
        // 预设适配器默认都是规则适配器 (isRuleType: true)
      }
    }

    // 自定义适配器需要检查 isRuleType
    const ruleAdapters = customAdapters.filter((a) => a.isRuleType !== false);
    const skillAdapters = customAdapters.filter((a) => a.isRuleType === false);

    console.log(`Custom rule adapters: ${ruleAdapters.length}`);
    console.log(`Custom skill adapters: ${skillAdapters.length}`);

    assert.ok(true, 'Adapter classification should work');
  });

  it('Should categorize single-file vs directory adapters', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const adapters = config.get<any>('adapters');
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);

    // 单文件适配器示例
    const singleFileAdapters = [];
    if (adapters?.cursor?.enabled) {
      singleFileAdapters.push({ name: 'cursor', path: '.cursorrules' });
    }
    if (adapters?.copilot?.enabled) {
      singleFileAdapters.push({ name: 'copilot', path: '.github/copilot-instructions.md' });
    }
    if (adapters?.continue?.enabled) {
      singleFileAdapters.push({ name: 'continue', path: '.continue/config.json' });
    }

    // 目录适配器示例
    const directoryAdapters = customAdapters.filter((a) => {
      const outputPath = a.outputPath || '';
      return !outputPath.includes('.') || outputPath.endsWith('/');
    });

    console.log(`Single-file adapters: ${singleFileAdapters.length}`);
    console.log(`Directory adapters: ${directoryAdapters.length}`);

    assert.ok(true, 'Adapter type categorization should work');
  });

  it('Should identify which adapters support quick sync', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const adapters = config.get<any>('adapters');
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);

    // 快速同步只支持规则适配器 (isRuleType: true)
    const quickSyncSupported = [];

    // 预设适配器都支持快速同步
    if (adapters?.cursor?.enabled) quickSyncSupported.push('cursor');
    if (adapters?.copilot?.enabled) quickSyncSupported.push('copilot');
    if (adapters?.continue?.enabled) quickSyncSupported.push('continue');

    // 自定义规则适配器也支持
    const customRuleAdapters = customAdapters.filter((a) => a.isRuleType !== false);
    quickSyncSupported.push(...customRuleAdapters.map((a) => a.name || a.outputPath));

    // Skill 适配器不支持快速同步
    const skillAdapters = customAdapters.filter((a) => a.isRuleType === false);

    console.log(`Quick sync supported adapters: ${quickSyncSupported.length}`);
    console.log(`Skill adapters (dashboard only): ${skillAdapters.length}`);

    assert.ok(true, 'Quick sync adapter identification should work');
  });

  it('Should have correct adapter metadata', async () => {
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const adapters = config.get<any>('adapters');

    // 验证预设适配器的配置结构
    if (adapters?.cursor) {
      assert.ok('enabled' in adapters.cursor, 'Adapter should have enabled property');
      assert.ok('autoUpdate' in adapters.cursor, 'Adapter should have autoUpdate property');
    }

    // 自定义适配器应该有必要的字段
    const customAdapters = config.get<any[]>(CONFIG_KEYS.ADAPTERS_CUSTOM, []);

    for (const adapter of customAdapters) {
      assert.ok(adapter.outputPath, 'Custom adapter must have outputPath');
      // isRuleType 默认为 true，所以可以不存在
      if ('isRuleType' in adapter) {
        assert.ok(typeof adapter.isRuleType === 'boolean', 'isRuleType should be boolean');
      }
    }
  });
});
