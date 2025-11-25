/**
 * removeSource 命令单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as vscode from 'vscode';

import { removeSourceCommand } from '@/commands/removeSource';
import { ConfigManager } from '@/services/ConfigManager';
import { RulesManager } from '@/services/RulesManager';
import type { RuleSource } from '@/types/config';

// Mock 模块
vi.mock('vscode');
vi.mock('@/services/ConfigManager');
vi.mock('@/services/RulesManager');
vi.mock('@/utils/logger');
vi.mock('@/utils/notifications');

describe('removeSource 命令单元测试', () => {
  let mockConfigManager: any;
  let mockRulesManager: any;
  let mockSources: RuleSource[];

  beforeEach(() => {
    vi.clearAllMocks();

    mockSources = [
      {
        id: 'source-1',
        name: 'Test Source 1',
        gitUrl: 'https://github.com/test/repo1',
        branch: 'main',
        enabled: true,
      },
      {
        id: 'source-2',
        name: 'Test Source 2',
        gitUrl: 'https://github.com/test/repo2',
        branch: 'develop',
        enabled: false,
      },
    ];

    mockConfigManager = {
      getSources: vi.fn().mockResolvedValue(mockSources),
      removeSource: vi.fn().mockResolvedValue(undefined),
      deleteToken: vi.fn().mockResolvedValue(undefined),
    };
    (ConfigManager.getInstance as any) = vi.fn().mockReturnValue(mockConfigManager);

    mockRulesManager = {
      clearSource: vi.fn(),
    };
    (RulesManager.getInstance as any) = vi.fn().mockReturnValue(mockRulesManager);

    // Mock vscode.window
    (vscode.window.showQuickPick as any) = vi.fn();
    (vscode.commands.executeCommand as any) = vi.fn();
  });

  describe('边界条件测试', () => {
    it('应该在无源时提示信息', async () => {
      mockConfigManager.getSources.mockResolvedValue([]);

      const { notify } = await import('@/utils/notifications');

      await removeSourceCommand();

      expect(notify).toHaveBeenCalledWith('No sources configured', 'info');
    });

    it('应该在用户取消选择时退出', async () => {
      (vscode.window.showQuickPick as any).mockResolvedValue(undefined);

      const { Logger } = await import('@/utils/logger');

      await removeSourceCommand();

      expect(Logger.info).toHaveBeenCalledWith('Remove source cancelled: no selection made');
      expect(mockConfigManager.removeSource).not.toHaveBeenCalled();
    });

    it('应该在源不存在时提示错误', async () => {
      const { notify } = await import('@/utils/notifications');

      await removeSourceCommand('non-existent-id');

      expect(notify).toHaveBeenCalledWith('Source not found', 'error');
      expect(mockConfigManager.removeSource).not.toHaveBeenCalled();
    });

    it('应该在用户未确认时退出', async () => {
      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValueOnce(false); // 确认对话框返回 false

      const { Logger } = await import('@/utils/logger');

      await removeSourceCommand('source-1');

      expect(Logger.info).toHaveBeenCalledWith('Remove source cancelled: user did not confirm');
      expect(mockConfigManager.removeSource).not.toHaveBeenCalled();
    });
  });

  describe('直接删除（提供 sourceId）', () => {
    it('应该直接删除指定的源', async () => {
      const { notify } = await import('@/utils/notifications');
      (notify as any)
        .mockResolvedValueOnce(true) // 确认删除
        .mockResolvedValueOnce(false); // 不重新生成配置

      await removeSourceCommand('source-1');

      expect(mockConfigManager.removeSource).toHaveBeenCalledWith('source-1');
      expect(mockConfigManager.deleteToken).toHaveBeenCalledWith('source-1');
      expect(mockRulesManager.clearSource).toHaveBeenCalledWith('source-1');
    });

    it('应该删除 token', async () => {
      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValue(true);

      await removeSourceCommand('source-2');

      expect(mockConfigManager.deleteToken).toHaveBeenCalledWith('source-2');
    });

    it('应该从规则管理器清除源', async () => {
      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValue(true);

      await removeSourceCommand('source-1');

      expect(mockRulesManager.clearSource).toHaveBeenCalledWith('source-1');
    });
  });

  describe('交互式删除（QuickPick）', () => {
    it('应该显示源列表让用户选择', async () => {
      (vscode.window.showQuickPick as any).mockResolvedValue({
        label: 'Test Source 1',
        description: 'https://github.com/test/repo1',
        detail: 'Branch: main (enabled)',
        sourceId: 'source-1',
      });

      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValue(true);

      await removeSourceCommand();

      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            label: 'Test Source 1',
            sourceId: 'source-1',
          }),
        ]),
        expect.objectContaining({
          placeHolder: 'Select a source',
        }),
      );
    });

    it('应该正确显示启用/禁用状态', async () => {
      (vscode.window.showQuickPick as any).mockResolvedValue({
        sourceId: 'source-2',
      });

      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValue(true);

      await removeSourceCommand();

      expect(vscode.window.showQuickPick).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            detail: expect.stringContaining('(disabled)'),
            sourceId: 'source-2',
          }),
        ]),
        expect.any(Object),
      );
    });
  });

  describe('删除后操作', () => {
    it('应该在用户确认后重新生成配置', async () => {
      const { notify } = await import('@/utils/notifications');
      (notify as any)
        .mockResolvedValueOnce(true) // 确认删除
        .mockResolvedValueOnce(true); // 重新生成

      await removeSourceCommand('source-1');

      expect(vscode.commands.executeCommand).toHaveBeenCalledWith('turbo-ai-rules.generateConfigs');
    });

    it('应该在用户拒绝时不重新生成配置', async () => {
      const { notify } = await import('@/utils/notifications');
      (notify as any)
        .mockResolvedValueOnce(true) // 确认删除
        .mockResolvedValueOnce(false); // 不重新生成

      await removeSourceCommand('source-1');

      expect(vscode.commands.executeCommand).not.toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该捕获删除源时的错误', async () => {
      const mockError = new Error('Failed to remove source');
      mockConfigManager.removeSource.mockRejectedValue(mockError);

      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValueOnce(true); // 确认删除

      const { Logger } = await import('@/utils/logger');

      await removeSourceCommand('source-1');

      expect(Logger.error).toHaveBeenCalledWith('Failed to remove source', mockError);
      expect(notify).toHaveBeenCalledWith(
        expect.stringContaining('Failed to remove source'),
        'error',
      );
    });

    it('应该捕获删除 token 时的错误', async () => {
      const mockError = new Error('Token deletion failed');
      mockConfigManager.deleteToken.mockRejectedValue(mockError);

      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValueOnce(true); // 确认删除

      const { Logger } = await import('@/utils/logger');

      await removeSourceCommand('source-1');

      expect(Logger.error).toHaveBeenCalled();
    });
  });

  describe('日志记录', () => {
    it('应该记录命令执行', async () => {
      const { Logger } = await import('@/utils/logger');

      (vscode.window.showQuickPick as any).mockResolvedValue(undefined);

      await removeSourceCommand('source-1');

      expect(Logger.info).toHaveBeenCalledWith('Executing removeSource command', {
        sourceId: 'source-1',
      });
    });

    it('应该记录成功删除', async () => {
      const { notify } = await import('@/utils/notifications');
      (notify as any).mockResolvedValue(true);

      const { Logger } = await import('@/utils/logger');

      await removeSourceCommand('source-1');

      expect(Logger.info).toHaveBeenCalledWith('Source removed successfully', {
        sourceId: 'source-1',
      });
    });
  });
});
