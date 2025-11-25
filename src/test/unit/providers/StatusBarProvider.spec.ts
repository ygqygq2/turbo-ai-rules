/**
 * StatusBarProvider 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { SyncProgress } from '@/providers/StatusBarProvider';
import { StatusBarProvider } from '@/providers/StatusBarProvider';

// Mock 模块
vi.mock('@/services/RulesManager');
vi.mock('@/services/WorkspaceStateManager');
vi.mock('@/services/ConfigManager');
vi.mock('@/utils/logger');
vi.mock('vscode');

describe('StatusBarProvider 单元测试', () => {
  let statusBarProvider: StatusBarProvider;
  let mockRulesManager: any;
  let mockStatusBarItem: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    // Reset singleton
    (StatusBarProvider as any).instance = undefined;

    // Mock RulesManager
    mockRulesManager = {
      getStats: vi.fn().mockReturnValue({
        totalRules: 100,
        sourceCount: 3,
        enabledSourceCount: 2,
        conflictCount: 0,
      }),
    };

    // Mock StatusBarItem
    mockStatusBarItem = {
      text: '',
      tooltip: '',
      backgroundColor: undefined,
      command: '',
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    };

    // Mock vscode.window.createStatusBarItem
    const vscode = await import('vscode');
    (vscode.window.createStatusBarItem as any) = vi.fn().mockReturnValue(mockStatusBarItem);

    // Mock WorkspaceStateManager
    const { WorkspaceStateManager } = await import('@/services/WorkspaceStateManager');
    (WorkspaceStateManager.getInstance as any) = vi.fn().mockReturnValue({
      getRulesStats: vi.fn().mockResolvedValue({
        totalRules: 100,
        totalSyncedRules: 95,
        sourceCount: 3,
        syncedSourceCount: 2,
        enabledSourceCount: 2,
      }),
      getLastSyncTime: vi.fn().mockResolvedValue(new Date().toISOString()),
      getAllSourceSyncStats: vi.fn().mockResolvedValue({}),
    });

    // Mock ConfigManager
    const { ConfigManager } = await import('@/services/ConfigManager');
    (ConfigManager.getInstance as any) = vi.fn().mockReturnValue({
      getSources: vi.fn().mockReturnValue([]),
    });

    statusBarProvider = StatusBarProvider.getInstance(mockRulesManager);
  });

  afterEach(() => {
    vi.useRealTimers();
    statusBarProvider?.dispose();
  });

  describe('单例模式', () => {
    it('应该返回同一个实例', () => {
      const instance1 = StatusBarProvider.getInstance(mockRulesManager);
      const instance2 = StatusBarProvider.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('应该在首次调用时要求 RulesManager', () => {
      (StatusBarProvider as any).instance = undefined;

      expect(() => StatusBarProvider.getInstance()).toThrow('RulesManager is required');
    });
  });

  describe('初始化', () => {
    it('应该创建状态栏项并显示', () => {
      expect(mockStatusBarItem.show).toHaveBeenCalled();
      expect(mockStatusBarItem.command).toBe('workbench.view.extension.turbo-ai-rules');
    });

    it('应该在 1 秒后从 initializing 转为 idle', async () => {
      expect(statusBarProvider['syncStatus']).toBe('initializing');

      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      expect(statusBarProvider['syncStatus']).toBe('idle');
    });
  });

  describe('同步状态管理', () => {
    it('应该正确设置 syncing 状态', () => {
      const progress: SyncProgress = {
        completed: 1,
        total: 3,
        currentSource: 'source-1',
        operation: 'Cloning repository',
      };

      statusBarProvider.setSyncStatus('syncing', progress);

      expect(statusBarProvider['syncStatus']).toBe('syncing');
      expect(statusBarProvider['syncProgress']).toEqual(progress);
    });

    it('应该在 success 状态时记录最后同步时间', () => {
      const beforeTime = new Date();

      statusBarProvider.setSyncStatus('success');

      const afterTime = new Date();
      const lastSyncTime = statusBarProvider['lastSyncTime'];

      expect(lastSyncTime).toBeDefined();
      expect(lastSyncTime!.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(lastSyncTime!.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('应该在 success 状态 3 秒后自动转为 idle', async () => {
      statusBarProvider.setSyncStatus('success');

      expect(statusBarProvider['syncStatus']).toBe('success');

      vi.advanceTimersByTime(3000);
      await vi.runAllTimersAsync();

      expect(statusBarProvider['syncStatus']).toBe('idle');
    });

    it('应该在 error 状态 10 秒后自动转为 idle', async () => {
      statusBarProvider.setSyncStatus('error');

      expect(statusBarProvider['syncStatus']).toBe('error');

      vi.advanceTimersByTime(10000);
      await vi.runAllTimersAsync();

      expect(statusBarProvider['syncStatus']).toBe('idle');
    });

    it('应该在设置 idle 状态时清除定时器', () => {
      statusBarProvider.setSyncStatus('success');
      expect(statusBarProvider['updateTimer']).toBeDefined();

      statusBarProvider.setSyncStatus('idle');
      expect(statusBarProvider['updateTimer']).toBeUndefined();
    });
  });

  describe('状态栏文本更新', () => {
    it('应该在 syncing 状态显示同步图标', () => {
      const progress: SyncProgress = {
        completed: 1,
        total: 3,
      };

      statusBarProvider.setSyncStatus('syncing', progress);

      expect(mockStatusBarItem.text).toBeTruthy();
      expect(statusBarProvider['syncStatus']).toBe('syncing');
    });

    it('应该在 idle 状态显示规则统计', () => {
      statusBarProvider.setSyncStatus('idle');

      expect(mockStatusBarItem.text).toBeTruthy();
      expect(statusBarProvider['syncStatus']).toBe('idle');
    });
  });

  describe('资源释放', () => {
    it('应该清理状态栏项', () => {
      statusBarProvider.dispose();

      expect(mockStatusBarItem.dispose).toHaveBeenCalled();
    });
  });
});
