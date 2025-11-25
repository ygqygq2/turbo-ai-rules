/**
 * batchOperations 命令单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import {
  batchDeleteRulesCommand,
  batchDisableRulesCommand,
  batchEnableRulesCommand,
  batchExportRulesCommand,
  deselectAllRulesCommand,
  selectAllRulesCommand,
} from '@/commands/batchOperations';
import { RulesManager } from '@/services/RulesManager';
import { SelectionStateManager } from '@/services/SelectionStateManager';
import type { RuleSource } from '@/types/config';
import type { ParsedRule } from '@/types/rules';

// Mock 模块
vi.mock('vscode');
vi.mock('@/services/RulesManager');
vi.mock('@/services/SelectionStateManager');
vi.mock('@/utils/logger');
vi.mock('@/utils/notifications');

describe('batchOperations 命令单元测试', () => {
  let mockRules: ParsedRule[];
  let mockSource: RuleSource;
  let mockConfig: any;
  let mockRulesManager: any;
  let mockSelectionStateManager: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRules = [
      {
        id: 'rule-1',
        title: 'Rule 1',
        content: 'content 1',
        sourceId: 'source-1',
        filePath: '/test/rules/001-rule1.md',
        metadata: { title: 'Rule 1', priority: 'high', tags: ['tag1'] },
      },
      {
        id: 'rule-2',
        title: 'Rule 2',
        content: 'content 2',
        sourceId: 'source-1',
        filePath: '/test/rules/002-rule2.md',
        metadata: { title: 'Rule 2', priority: 'medium', tags: ['tag2'] },
      },
    ];

    mockSource = {
      id: 'source-1',
      name: 'Test Source',
      gitUrl: 'https://github.com/test/repo',
      branch: 'main',
      enabled: true,
    };

    mockConfig = {
      get: vi.fn().mockReturnValue([]),
      update: vi.fn().mockResolvedValue(undefined),
    };

    (vscode.workspace.getConfiguration as any) = vi.fn().mockReturnValue(mockConfig);
    (vscode.workspace.fs.writeFile as any) = vi.fn().mockResolvedValue(undefined);
    (vscode.workspace.fs.delete as any) = vi.fn().mockResolvedValue(undefined);
    (vscode.window.showSaveDialog as any) = vi.fn();
    (vscode.Uri.file as any) = vi.fn((path: string) => ({ fsPath: path }));

    mockRulesManager = {
      getRulesBySource: vi.fn().mockReturnValue([]),
    };
    (RulesManager.getInstance as any) = vi.fn().mockReturnValue(mockRulesManager);

    mockSelectionStateManager = {
      updateSelection: vi.fn(),
    };
    (SelectionStateManager.getInstance as any) = vi.fn().mockReturnValue(mockSelectionStateManager);
  });

  describe('batchDisableRules', () => {
    it('应该在无规则时提示警告', async () => {
      const { notify } = await import('@/utils/notifications');

      await batchDisableRulesCommand([]);

      expect(notify).toHaveBeenCalledWith('No rules selected', 'warning');
    });

    it('应该在用户取消时退出', async () => {
      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValueOnce(false); // 用户取消

      await batchDisableRulesCommand(mockRules);

      expect(mockConfig.update).not.toHaveBeenCalled();
    });

    it('应该将规则路径添加到忽略模式', async () => {
      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValueOnce(true); // 用户确认

      mockConfig.get.mockReturnValue(['existing-pattern.md']);

      await batchDisableRulesCommand(mockRules);

      expect(mockConfig.update).toHaveBeenCalledWith(
        'ignorePatterns',
        expect.arrayContaining(['existing-pattern.md', '001-rule1.md', '002-rule2.md']),
        vscode.ConfigurationTarget.Workspace,
      );

      expect(notify).toHaveBeenCalledWith('Successfully disabled 2 rule(s)', 'info');
    });

    it('应该处理禁用错误', async () => {
      const mockError = new Error('Config update failed');
      mockConfig.update.mockRejectedValue(mockError);

      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValueOnce(true);

      await batchDisableRulesCommand(mockRules);

      expect(notify).toHaveBeenCalledWith(
        expect.stringContaining('Failed to disable rules'),
        'error',
      );
    });
  });

  describe('batchEnableRules', () => {
    it('应该在无规则时提示警告', async () => {
      const { notify } = await import('@/utils/notifications');

      await batchEnableRulesCommand([]);

      expect(notify).toHaveBeenCalledWith('No rules selected', 'warning');
    });

    it('应该从忽略模式中移除规则路径', async () => {
      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValueOnce(true);

      mockConfig.get.mockReturnValue(['001-rule1.md', '002-rule2.md', 'keep-this.md']);

      await batchEnableRulesCommand(mockRules);

      expect(mockConfig.update).toHaveBeenCalledWith(
        'ignorePatterns',
        ['keep-this.md'], // 只保留未被启用的模式
        vscode.ConfigurationTarget.Workspace,
      );

      expect(notify).toHaveBeenCalledWith('Successfully enabled 2 rule(s)', 'info');
    });

    it('应该处理启用错误', async () => {
      const mockError = new Error('Config update failed');
      mockConfig.update.mockRejectedValue(mockError);

      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValueOnce(true);

      await batchEnableRulesCommand(mockRules);

      expect(notify).toHaveBeenCalledWith(
        expect.stringContaining('Failed to enable rules'),
        'error',
      );
    });
  });

  describe('batchExportRules', () => {
    it('应该在无规则时提示警告', async () => {
      const { notify } = await import('@/utils/notifications');

      await batchExportRulesCommand([]);

      expect(notify).toHaveBeenCalledWith('No rules selected', 'warning');
    });

    it('应该在用户取消时退出', async () => {
      (vscode.window.showSaveDialog as any).mockResolvedValue(undefined);

      await batchExportRulesCommand(mockRules);

      expect(vscode.workspace.fs.writeFile).not.toHaveBeenCalled();
    });

    it('应该导出规则为 JSON 格式', async () => {
      const mockUri = { fsPath: '/test/export.json' };
      (vscode.window.showSaveDialog as any).mockResolvedValue(mockUri);

      const { notify } = await import('@/utils/notifications');

      await batchExportRulesCommand(mockRules);

      expect(vscode.workspace.fs.writeFile).toHaveBeenCalledWith(mockUri, expect.any(Buffer));

      // 验证导出的数据结构
      const writeCall = (vscode.workspace.fs.writeFile as any).mock.calls[0];
      const exportedData = JSON.parse(writeCall[1].toString());

      expect(exportedData).toHaveLength(2);
      expect(exportedData[0]).toMatchObject({
        name: 'Rule 1',
        filePath: '/test/rules/001-rule1.md',
        priority: 'high',
        tags: ['tag1'],
      });

      expect(notify).toHaveBeenCalledWith(expect.stringContaining('Exported 2 rule(s)'), 'info');
    });

    it('应该处理导出错误', async () => {
      const mockUri = { fsPath: '/test/export.json' };
      (vscode.window.showSaveDialog as any).mockResolvedValue(mockUri);

      const mockError = new Error('Write failed');
      (vscode.workspace.fs.writeFile as any).mockRejectedValue(mockError);

      const { notify } = await import('@/utils/notifications');

      await batchExportRulesCommand(mockRules);

      expect(notify).toHaveBeenCalledWith(
        expect.stringContaining('Failed to export rules'),
        'error',
      );
    });
  });

  describe('batchDeleteRules', () => {
    it('应该在无规则时提示警告', async () => {
      const { notify } = await import('@/utils/notifications');

      await batchDeleteRulesCommand([]);

      expect(notify).toHaveBeenCalledWith('No rules selected', 'warning');
    });

    it('应该在用户取消时退出', async () => {
      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValueOnce(false);

      await batchDeleteRulesCommand(mockRules);

      expect(vscode.workspace.fs.delete).not.toHaveBeenCalled();
    });

    it('应该删除规则文件', async () => {
      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValueOnce(true);

      await batchDeleteRulesCommand(mockRules);

      expect(vscode.workspace.fs.delete).toHaveBeenCalledTimes(2);
      expect(notify).toHaveBeenCalledWith('Successfully deleted 2 rule(s)', 'info');
    });

    it('应该处理部分删除失败', async () => {
      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValueOnce(true);

      // 第一个成功，第二个失败
      (vscode.workspace.fs.delete as any)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Delete failed'));

      await batchDeleteRulesCommand(mockRules);

      expect(notify).toHaveBeenCalledWith('Successfully deleted 1 rule(s)', 'info');
    });

    it('应该在全部失败时提示警告', async () => {
      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValueOnce(true);

      (vscode.workspace.fs.delete as any).mockRejectedValue(new Error('Delete failed'));

      await batchDeleteRulesCommand(mockRules);

      expect(notify).toHaveBeenCalledWith('No rules were deleted', 'warning');
    });
  });

  describe('selectAllRules', () => {
    it('应该在无规则时提示信息', async () => {
      mockRulesManager.getRulesBySource.mockReturnValue([]);

      const { notify } = await import('@/utils/notifications');

      await selectAllRulesCommand(mockSource);

      expect(notify).toHaveBeenCalledWith(
        'No rules found in this source. Please sync first.',
        'info',
      );
    });

    it('应该选中所有规则', async () => {
      mockRulesManager.getRulesBySource.mockReturnValue(mockRules);

      const { notify } = await import('@/utils/notifications');

      await selectAllRulesCommand(mockSource);

      expect(mockSelectionStateManager.updateSelection).toHaveBeenCalledWith(
        'source-1',
        ['/test/rules/001-rule1.md', '/test/rules/002-rule2.md'],
        true,
        undefined,
      );

      expect(notify).toHaveBeenCalledWith(expect.stringContaining('Selected all 2 rules'), 'info');
    });

    it('应该处理选择错误', async () => {
      mockRulesManager.getRulesBySource.mockReturnValue(mockRules);
      mockSelectionStateManager.updateSelection.mockImplementation(() => {
        throw new Error('Update failed');
      });

      const { notify } = await import('@/utils/notifications');

      await selectAllRulesCommand(mockSource);

      expect(notify).toHaveBeenCalledWith(
        expect.stringContaining('Failed to select all rules'),
        'error',
      );
    });
  });

  describe('deselectAllRules', () => {
    it('应该清空所有选择', async () => {
      const { notify } = await import('@/utils/notifications');

      await deselectAllRulesCommand(mockSource);

      expect(mockSelectionStateManager.updateSelection).toHaveBeenCalledWith(
        'source-1',
        [],
        true,
        undefined,
      );

      expect(notify).toHaveBeenCalledWith(expect.stringContaining('Deselected all rules'), 'info');
    });

    it('应该处理取消选择错误', async () => {
      mockSelectionStateManager.updateSelection.mockImplementation(() => {
        throw new Error('Update failed');
      });

      const { notify } = await import('@/utils/notifications');

      await deselectAllRulesCommand(mockSource);

      expect(notify).toHaveBeenCalledWith(
        expect.stringContaining('Failed to deselect all rules'),
        'error',
      );
    });
  });

  describe('日志记录', () => {
    it('应该记录批量操作', async () => {
      const { Logger } = await import('@/utils/logger');
      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValue(true);

      await batchDisableRulesCommand(mockRules);

      expect(Logger.info).toHaveBeenCalledWith('Batch disabled 2 rules');
    });

    it('应该记录选择操作', async () => {
      mockRulesManager.getRulesBySource.mockReturnValue(mockRules);

      const { Logger } = await import('@/utils/logger');

      await selectAllRulesCommand(mockSource);

      expect(Logger.info).toHaveBeenCalledWith('Executing selectAllRules command', {
        sourceId: 'source-1',
      });
    });
  });
});
