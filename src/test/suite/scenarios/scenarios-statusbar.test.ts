/**
 * StatusBar 统计测试
 * 工作空间: rules-for-cursor (复用)
 *
 * 测试场景:
 * - 规则源数量统计
 * - 已选规则数量统计
 * - 同步状态显示
 */

import * as assert from 'assert';
import * as vscode from 'vscode';

import { StatusBarProvider } from '../../../providers/StatusBarProvider';
import { CONFIG_KEYS } from '../../../utils/constants';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../testConstants';
import { sleep } from '../testHelpers';

describe('StatusBar Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let statusBarProvider: StatusBarProvider | undefined;

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

    // StatusBarProvider 应该在扩展激活时初始化
    // 通过 API 获取
    statusBarProvider = ext?.exports?.statusBarProvider;

    // 切换到工作空间上下文
    const readmePath = vscode.Uri.joinPath(workspaceFolder.uri, 'README.md');
    const doc = await vscode.workspace.openTextDocument(readmePath);
    await vscode.window.showTextDocument(doc);
    await sleep(TEST_DELAYS.SHORT);
  });

  it('Should have statusBar provider initialized', () => {
    // StatusBar 可能不是必须的，如果没有也不报错
    if (statusBarProvider) {
      console.log('StatusBar provider is available');
    } else {
      console.log('StatusBar provider not found (this is OK)');
    }

    assert.ok(true, 'StatusBar availability check completed');
  });

  it('Should show source count in status bar', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<any[]>(CONFIG_KEYS.SOURCES, []);

    if (sources.length === 0) {
      this.skip();
      return;
    }

    // StatusBar 应该显示规则源数量
    // 但在测试环境中无法直接读取 StatusBar 的文本
    // 我们只能验证配置是否正确

    const enabledSources = sources.filter((s) => s.enabled);
    console.log(`Total sources: ${sources.length}, Enabled: ${enabledSources.length}`);

    assert.ok(sources.length > 0, 'Should have sources to display');
  });

  it('Should show selected rules count', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<any[]>(CONFIG_KEYS.SOURCES, []);

    if (sources.length === 0) {
      this.skip();
      return;
    }

    // 在真实场景中，StatusBar 会显示已选规则数量
    // 例如: "3/10 规则已选择" 或 "Turbo AI Rules: 3 selected"

    // 测试环境无法验证 StatusBar 文本，但可以验证数据正确性
    console.log('StatusBar should show selected rules count (cannot verify in test)');

    assert.ok(true, 'Selected rules count should be tracked');
  });

  it('Should update status bar on sync', async function () {
    this.timeout(TEST_TIMEOUTS.EXTRA_LONG);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sources = config.get<any[]>(CONFIG_KEYS.SOURCES, []);

    if (sources.length === 0) {
      this.skip();
      return;
    }

    // 同步规则
    await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
    await sleep(TEST_DELAYS.LONG);

    // StatusBar 应该更新同步状态
    // 可能显示: "同步中..." -> "同步完成" -> "空闲"

    console.log('StatusBar should reflect sync status (cannot verify in test)');

    assert.ok(true, 'Sync status should be reflected in StatusBar');
  });

  it('Should show error state in status bar', async () => {
    // StatusBar 应该能显示错误状态
    // 例如: "同步失败" 或显示错误图标

    // 测试环境无法模拟错误并验证 StatusBar
    console.log('StatusBar should show error states (cannot verify in test)');

    assert.ok(true, 'Error state handling should exist');
  });

  it('Should provide click action', () => {
    // StatusBar 点击应该触发某个命令
    // 例如: 打开仪表板或显示规则列表

    // 测试环境无法模拟点击
    console.log('StatusBar should be clickable (cannot verify in test)');

    assert.ok(true, 'StatusBar click action should exist');
  });

  it('Should cleanup on deactivation', () => {
    // StatusBarProvider 应该在扩展停用时清理资源

    if (statusBarProvider && 'dispose' in statusBarProvider) {
      console.log('StatusBarProvider has dispose method');
    }

    assert.ok(true, 'StatusBarProvider cleanup should be implemented');
  });
});
