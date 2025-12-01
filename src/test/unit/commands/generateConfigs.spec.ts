/**
 * generateConfigs 命令单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import { generateConfigsCommand } from '@/commands/generateConfigs';
import { ConfigManager } from '@/services/ConfigManager';
import { FileGenerator } from '@/services/FileGenerator';
import { RulesManager } from '@/services/RulesManager';
import { SelectionStateManager } from '@/services/SelectionStateManager';
import type { ParsedRule } from '@/types/rules';

// Mock 模块
vi.mock('vscode');
vi.mock('@/services/ConfigManager');
vi.mock('@/services/RulesManager');
vi.mock('@/services/SelectionStateManager');
vi.mock('@/services/FileGenerator');
vi.mock('@/utils/logger');
vi.mock('@/utils/notifications');

describe('generateConfigs 命令单元测试', () => {
  let mockConfigManager: any;
  let mockRulesManager: any;
  let mockSelectionStateManager: any;
  let mockFileGenerator: any;
  let mockWorkspaceFolder: vscode.WorkspaceFolder;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();

    // Mock WorkspaceFolder
    mockWorkspaceFolder = {
      uri: { fsPath: '/test/workspace' } as vscode.Uri,
      name: 'test-workspace',
      index: 0,
    };

    // Mock vscode.workspace.workspaceFolders 使用 defineProperty
    Object.defineProperty(vscode.workspace, 'workspaceFolders', {
      get: () => [mockWorkspaceFolder],
      configurable: true,
    });

    // Mock ConfigManager
    mockConfigManager = {
      getConfig: vi.fn().mockResolvedValue({
        sync: { conflictStrategy: 'priority' },
      }),
    };
    (ConfigManager.getInstance as any) = vi.fn().mockReturnValue(mockConfigManager);

    // Mock RulesManager
    mockRulesManager = {
      getAllRules: vi.fn().mockReturnValue([]),
      addRules: vi.fn(),
      mergeRules: vi.fn().mockReturnValue([]),
    };
    (RulesManager.getInstance as any) = vi.fn().mockReturnValue(mockRulesManager);

    // Mock SelectionStateManager
    mockSelectionStateManager = {
      getSelection: vi.fn().mockReturnValue([]),
    };
    (SelectionStateManager.getInstance as any) = vi.fn().mockReturnValue(mockSelectionStateManager);

    // Mock FileGenerator
    mockFileGenerator = {
      initializeAdapters: vi.fn(),
      generateAll: vi.fn().mockResolvedValue({ success: [], failures: [] }),
      showGenerationNotification: vi.fn().mockResolvedValue(undefined),
    };
    (FileGenerator.getInstance as any) = vi.fn().mockReturnValue(mockFileGenerator);

    // Mock vscode.window.withProgress
    (vscode.window.withProgress as any) = vi.fn().mockImplementation(async (_options, task) => {
      const progress = { report: vi.fn() };
      return await task(progress);
    });
  });

  describe('边界条件测试', () => {
    it('应该在无工作区时提示错误', async () => {
      // Mock 无工作区
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        get: () => undefined,
        configurable: true,
      });

      const { notify } = await import('@/utils/notifications');

      await generateConfigsCommand();

      expect(notify).toHaveBeenCalledWith('No workspace folder opened', 'error');
    });

    it('应该在无规则时提示信息', async () => {
      mockRulesManager.getAllRules.mockReturnValue([]);

      const { notify } = await import('@/utils/notifications');

      await generateConfigsCommand();

      expect(notify).toHaveBeenCalledWith('No rules available. Please sync rules first.', 'info');
    });

    it('应该在无选中规则时提示信息', async () => {
      const mockRules: ParsedRule[] = [
        {
          id: 'test-rule-1',
          title: 'Test Rule 1',
          content: 'content',
          sourceId: 'source-1',
          filePath: '/test/rule1.md',
          metadata: { priority: 'medium' },
        },
      ];

      mockRulesManager.getAllRules.mockReturnValue(mockRules);
      // 空数组表示全选，但这里模拟成不包含该文件
      mockSelectionStateManager.getSelection.mockReturnValue(['/other/file.md']);

      const { notify } = await import('@/utils/notifications');

      await generateConfigsCommand();

      expect(notify).toHaveBeenCalledWith('No rules selected. Please select rules first.', 'info');
    });
  });

  describe('规则选择逻辑', () => {
    it('应该正确过滤选中的规则', async () => {
      const mockRules: ParsedRule[] = [
        {
          id: 'rule-1',
          title: 'Rule 1',
          content: 'content 1',
          sourceId: 'source-1',
          filePath: '/test/rule1.md',
          metadata: { priority: 'high' },
        },
        {
          id: 'rule-2',
          title: 'Rule 2',
          content: 'content 2',
          sourceId: 'source-1',
          filePath: '/test/rule2.md',
          metadata: { priority: 'low' },
        },
      ];

      mockRulesManager.getAllRules.mockReturnValue(mockRules);
      // 只选中第一条规则
      mockSelectionStateManager.getSelection.mockReturnValue(['/test/rule1.md']);

      mockRulesManager.mergeRules.mockReturnValue([mockRules[0]]);

      await generateConfigsCommand();

      expect(mockRulesManager.addRules).toHaveBeenCalledWith('source-1', [mockRules[0]]);
      expect(mockFileGenerator.generateAll).toHaveBeenCalled();
    });

    it('应该正确处理选中的规则', async () => {
      const mockRules: ParsedRule[] = [
        {
          id: 'rule-1',
          title: 'Rule 1',
          content: 'content 1',
          sourceId: 'source-1',
          filePath: '/test/rule1.md',
          metadata: { priority: 'medium' },
        },
      ];

      mockRulesManager.getAllRules.mockReturnValue(mockRules);
      // 明确返回选中的路径（非空数组）
      mockSelectionStateManager.getSelection.mockReturnValue(['/test/rule1.md']);

      mockRulesManager.mergeRules.mockReturnValue(mockRules);

      await generateConfigsCommand();

      expect(mockRulesManager.addRules).toHaveBeenCalledWith('source-1', mockRules);
    });
  });

  describe('冲突解决策略', () => {
    it('应该使用配置的冲突策略', async () => {
      mockConfigManager.getConfig.mockResolvedValue({
        sync: { conflictStrategy: 'skip-duplicates' },
      });

      const mockRules: ParsedRule[] = [
        {
          id: 'rule-1',
          title: 'Rule 1',
          content: 'content',
          sourceId: 'source-1',
          filePath: '/test/rule1.md',
          metadata: { priority: 'medium' },
        },
      ];

      mockRulesManager.getAllRules.mockReturnValue(mockRules);
      mockSelectionStateManager.getSelection.mockReturnValue(['/test/rule1.md']); // 明确选中
      mockRulesManager.mergeRules.mockReturnValue(mockRules);

      await generateConfigsCommand();

      expect(mockRulesManager.mergeRules).toHaveBeenCalledWith('skip-duplicates');
    });

    it('应该默认使用 priority 策略', async () => {
      mockConfigManager.getConfig.mockResolvedValue({
        sync: {},
      });

      const mockRules: ParsedRule[] = [
        {
          id: 'rule-1',
          title: 'Rule 1',
          content: 'content',
          sourceId: 'source-1',
          filePath: '/test/rule1.md',
          metadata: { priority: 'medium' },
        },
      ];

      mockRulesManager.getAllRules.mockReturnValue(mockRules);
      mockSelectionStateManager.getSelection.mockReturnValue(['/test/rule1.md']); // 明确选中
      mockRulesManager.mergeRules.mockReturnValue(mockRules);

      await generateConfigsCommand();

      expect(mockRulesManager.mergeRules).toHaveBeenCalledWith('priority');
    });
  });

  describe('进度报告', () => {
    it('应该显示进度通知', async () => {
      const mockRules: ParsedRule[] = [
        {
          id: 'rule-1',
          title: 'Rule 1',
          content: 'content',
          sourceId: 'source-1',
          filePath: '/test/rule1.md',
          metadata: { priority: 'medium' },
        },
      ];

      mockRulesManager.getAllRules.mockReturnValue(mockRules);
      mockSelectionStateManager.getSelection.mockReturnValue(['/test/rule1.md']); // 明确选中
      mockRulesManager.mergeRules.mockReturnValue(mockRules);

      await generateConfigsCommand();

      expect(vscode.window.withProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          location: vscode.ProgressLocation.Notification,
          title: 'Generating Config Files',
          cancellable: false,
        }),
        expect.any(Function),
      );
    }, 15000); // 增加超时到 15 秒
  });

  describe('错误处理', () => {
    it('应该捕获并记录生成错误', async () => {
      const mockError = new Error('Generation failed');

      const mockRules: ParsedRule[] = [
        {
          id: 'rule-1',
          title: 'Rule 1',
          content: 'content',
          sourceId: 'source-1',
          filePath: '/test/rule1.md',
          metadata: { priority: 'medium' },
        },
      ];

      mockRulesManager.getAllRules.mockReturnValue(mockRules);
      mockSelectionStateManager.getSelection.mockReturnValue(['/test/rule1.md']); // 明确选中
      mockRulesManager.mergeRules.mockReturnValue(mockRules);
      mockFileGenerator.generateAll.mockRejectedValue(mockError);

      const { Logger } = await import('@/utils/logger');
      const { notify } = await import('@/utils/notifications');

      await generateConfigsCommand();

      expect(Logger.error).toHaveBeenCalled();
      expect(notify).toHaveBeenCalledWith('Failed to generate configs Generation failed', 'error');
    });
  });

  describe('多源规则处理', () => {
    it('应该正确处理来自多个源的规则', async () => {
      const mockRules: ParsedRule[] = [
        {
          id: 'rule-1',
          title: 'Rule 1',
          content: 'content 1',
          sourceId: 'source-1',
          filePath: '/test/rule1.md',
          metadata: { priority: 'high' },
        },
        {
          id: 'rule-2',
          title: 'Rule 2',
          content: 'content 2',
          sourceId: 'source-2',
          filePath: '/test/rule2.md',
          metadata: { priority: 'medium' },
        },
      ];

      mockRulesManager.getAllRules.mockReturnValue(mockRules);
      // 简化：返回所有规则的路径
      mockSelectionStateManager.getSelection.mockReturnValue(['/test/rule1.md', '/test/rule2.md']);
      mockRulesManager.mergeRules.mockReturnValue(mockRules);

      await generateConfigsCommand();

      // 验证 addRules 被调用
      expect(mockRulesManager.addRules).toHaveBeenCalled();
    }, 15000); // 增加超时到 15 秒
  });
});
