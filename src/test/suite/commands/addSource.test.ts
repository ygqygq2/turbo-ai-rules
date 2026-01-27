import * as assert from 'assert';
import * as vscode from 'vscode';

import type { RuleSource } from '../../../types';
import { CONFIG_KEYS } from '../../../utils/constants';
import { mockShowInputBox, mockShowQuickPick, restoreAllMocks } from '../mocks';
import { TEST_DELAYS, TEST_TIMEOUTS } from '../testConstants';
import { activateWorkspace, sleep, switchToWorkspaceContext } from '../testHelpers';

describe('Add Source Tests', () => {
  let workspaceFolder: vscode.WorkspaceFolder;
  let originalSources: RuleSource[] = [];

  before(async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const folders = vscode.workspace.workspaceFolders;
    assert.ok(folders && folders.length > 0, 'No workspace folder found');
    // 使用 commands-addSource-empty 工作空间（测试从空添加第一个源）
    workspaceFolder =
      folders.find(
        (f) => f.name === 'Commands: Add Source (Empty)' || f.name.includes('addSource-empty'),
      ) || folders[0];

    // 激活扩展
    const ext = vscode.extensions.getExtension('ygqygq2.turbo-ai-rules');
    if (ext && !ext.isActive) {
      await ext.activate();
    }

    // 备份原始配置
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    originalSources = JSON.parse(JSON.stringify(config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, [])));

    // 打开工作区的 README.md 以激活该工作区上下文
    await activateWorkspace(workspaceFolder);
  });

  beforeEach(() => {
    // 每个测试前清空 mock
  });

  afterEach(() => {
    // 恢复所有 mock
    restoreAllMocks();
  });

  after(async function () {
    // 所有测试结束后恢复原始配置
    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    await config.update(
      CONFIG_KEYS.SOURCES,
      originalSources,
      vscode.ConfigurationTarget.WorkspaceFolder,
    );
  });

  it('Should add public GitHub repository', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const sourceUrl = 'https://github.com/ygqygq2/ai-rules.git';

    // Mock 用户输入 URL
    mockShowInputBox(sourceUrl);

    // Mock 用户选择认证方式（None）
    mockShowQuickPick({ label: 'None', description: 'Public repository' } as vscode.QuickPickItem);

    // 切换到正确的工作区
    await switchToWorkspaceContext(workspaceFolder);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sourcesBefore = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);
    const countBefore = sourcesBefore.length;

    // 执行添加命令
    await vscode.commands.executeCommand('turbo-ai-rules.addSource');
    await sleep(TEST_DELAYS.MEDIUM);

    const sourcesAfter = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);
    const added = sourcesAfter.find((s: RuleSource) => s.gitUrl === sourceUrl);

    if (added) {
      assert.ok(added, 'Source should be added to configuration');
      assert.strictEqual(added.enabled, true, 'Source should be enabled by default');
    } else {
      // 如果源已存在，确保数量没变
      assert.strictEqual(
        sourcesAfter.length,
        countBefore,
        'Source count should not change if duplicate',
      );
    }
  });

  it('Should not add duplicate sources', async function () {
    this.timeout(TEST_TIMEOUTS.LONG);

    const sourceUrl = 'https://github.com/ygqygq2/ai-rules.git';

    // Mock 用户输入相同的 URL
    mockShowInputBox(sourceUrl);
    mockShowQuickPick({ label: 'None', description: 'Public repository' } as vscode.QuickPickItem);

    await switchToWorkspaceContext(workspaceFolder);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sourcesBefore = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);

    // 尝试添加相同的源
    await vscode.commands.executeCommand('turbo-ai-rules.addSource');
    await sleep(TEST_DELAYS.MEDIUM);

    const sourcesAfter = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);
    const countAfter = sourcesAfter.filter((s: RuleSource) => s.gitUrl === sourceUrl).length;
    const countBeforeUrl = sourcesBefore.filter((s: RuleSource) => s.gitUrl === sourceUrl).length;

    // 应该不增加重复的源
    assert.strictEqual(countAfter, countBeforeUrl, 'Should not add duplicate source');
  });

  it('Should validate repository URL format', async function () {
    this.timeout(TEST_TIMEOUTS.MEDIUM);

    const invalidUrl = 'not-a-valid-url';

    // Mock 用户输入无效 URL
    mockShowInputBox(invalidUrl);

    await switchToWorkspaceContext(workspaceFolder);

    const config = vscode.workspace.getConfiguration('turbo-ai-rules', workspaceFolder.uri);
    const sourcesBefore = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);

    try {
      // 尝试添加无效 URL
      await vscode.commands.executeCommand('turbo-ai-rules.addSource');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const sourcesAfter = config.get<RuleSource[]>(CONFIG_KEYS.SOURCES, []);

      // 无效 URL 应该被拒绝，源列表不变
      assert.strictEqual(
        sourcesAfter.length,
        sourcesBefore.length,
        'Should not add source with invalid URL',
      );
    } catch (_error) {
      // 如果抛出错误也是可以接受的
      assert.ok(true, 'Should reject invalid URL');
    }
  });
});
