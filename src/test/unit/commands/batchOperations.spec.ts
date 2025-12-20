/**
 * batchOperations 命令单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import { deselectAllRulesCommand, selectAllRulesCommand } from '@/commands/batchOperations';
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
vi.mock('@/utils/rulePath', () => ({
  toRelativePath: (filePath: string) => filePath.replace(/^.*\/rules\//, ''),
}));

describe('batchOperations 命令单元测试', () => {
  let mockRules: ParsedRule[];
  let mockSource: RuleSource;
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

    // Ensure vscode mock objects exist
    if (!vscode.workspace) {
      (vscode as any).workspace = {} as any;
    }
    if (!vscode.workspace.workspaceFolders) {
      (vscode.workspace as any).workspaceFolders = [{ uri: { fsPath: '/test/workspace' } }] as any;
    }

    mockRulesManager = {
      getRulesBySource: vi.fn().mockReturnValue([]),
    };
    (RulesManager.getInstance as any) = vi.fn().mockReturnValue(mockRulesManager);

    mockSelectionStateManager = {
      updateSelection: vi.fn(),
    };
    (SelectionStateManager.getInstance as any) = vi.fn().mockReturnValue(mockSelectionStateManager);
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
        expect.arrayContaining(['001-rule1.md', '002-rule2.md']),
        true,
        '/test/workspace',
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
        '/test/workspace',
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
