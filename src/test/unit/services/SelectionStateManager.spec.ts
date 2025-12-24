/**
 * SelectionStateManager 单元测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SelectionStateManager } from '@/services/SelectionStateManager';
import { WorkspaceDataManager } from '@/services/WorkspaceDataManager';

// Mock 模块
vi.mock('@/services/WorkspaceDataManager');
vi.mock('@/services/SharedSelectionManager');
vi.mock('@/utils/logger');

// Mock vscode
vi.mock('vscode', () => {
  const mockGetConfiguration = vi.fn();
  return {
    workspace: {
      workspaceFolders: [
        {
          uri: { fsPath: '/test/workspace' },
          name: 'test-workspace',
          index: 0,
        },
      ],
      getConfiguration: mockGetConfiguration,
    },
  };
});

describe('SelectionStateManager 单元测试', () => {
  let selectionStateManager: SelectionStateManager;
  let mockWorkspaceStateManager: any;
  let mockSharedManager: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock WorkspaceDataManager
    mockWorkspaceStateManager = {
      getRuleSelection: vi.fn().mockResolvedValue(null),
      setRuleSelection: vi.fn().mockResolvedValue(undefined),
    };
    (WorkspaceDataManager.getInstance as any) = vi.fn().mockReturnValue(mockWorkspaceStateManager);

    // Mock SharedSelectionManager
    const { SharedSelectionManager } = await import('@/services/SharedSelectionManager');
    mockSharedManager = {
      isEnabled: vi.fn().mockReturnValue(false),
      load: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue(undefined),
      import: vi.fn().mockResolvedValue(new Map()),
    };
    (SharedSelectionManager.getInstance as any) = vi.fn().mockReturnValue(mockSharedManager);

    // Mock vscode configuration (默认禁用共享选择)
    const vscode = await import('vscode');
    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn().mockReturnValue(false),
    } as any);

    // 重置单例
    (SelectionStateManager as any).instance = undefined;
    selectionStateManager = SelectionStateManager.getInstance();
  });

  describe('状态初始化', () => {
    it('应该从磁盘加载已保存的选择状态', async () => {
      mockWorkspaceStateManager.getRuleSelection.mockResolvedValue({
        paths: ['/path/rule1.md'],
      });

      await selectionStateManager.initializeState('source-1', 10, ['/path/rule1.md']);

      const selection = selectionStateManager.getSelection('source-1');
      expect(selection).toEqual(['/path/rule1.md']);
    });

    it('应该在无保存状态时默认全不选（空数组）', async () => {
      mockWorkspaceStateManager.getRuleSelection.mockResolvedValue(null);

      const allPaths = ['/path/rule1.md', '/path/rule2.md'];
      await selectionStateManager.initializeState('source-1', 2, allPaths);

      const selection = selectionStateManager.getSelection('source-1');
      expect(selection).toEqual([]); // 新设计：无保存状态时默认全不选，等待用户勾选
    });

    it('应该在已初始化时直接返回', async () => {
      await selectionStateManager.initializeState('source-1', 5, ['/path/rule1.md']);

      // 第二次调用不应该触发 getRuleSelection
      await selectionStateManager.initializeState('source-1', 5, ['/path/rule2.md']);

      expect(mockWorkspaceStateManager.getRuleSelection).toHaveBeenCalledTimes(1);
    });
  });

  describe('选择状态管理', () => {
    it('应该正确更新选择状态', async () => {
      await selectionStateManager.initializeState('source-1', 3, []);

      const newSelection = ['/path/rule1.md', '/path/rule2.md'];
      selectionStateManager.updateSelection('source-1', newSelection, true);

      const selection = selectionStateManager.getSelection('source-1');
      expect(selection).toEqual(newSelection);
    });

    it('应该在 schedulePersistence=false 时立即保存', async () => {
      await selectionStateManager.initializeState('source-1', 3, []);

      // 第三个参数 schedulePersistence=false 表示立即保存，不延时
      selectionStateManager.updateSelection('source-1', ['/path/rule1.md'], false);

      // 手动触发持久化
      await selectionStateManager.persistToDisk('source-1');

      expect(mockWorkspaceStateManager.setRuleSelection).toHaveBeenCalledWith(
        expect.any(String), // workspacePath
        'source-1',
        {
          paths: ['/path/rule1.md'],
        },
      );
    });

    it('应该在 schedulePersistence=true 时延时保存', async () => {
      vi.useFakeTimers();

      await selectionStateManager.initializeState('source-1', 3, []);

      // 第三个参数 schedulePersistence=true 表示延时保存
      selectionStateManager.updateSelection('source-1', ['/path/rule1.md'], true);

      // 立即检查：不应该保存
      expect(mockWorkspaceStateManager.setRuleSelection).not.toHaveBeenCalled();

      // 等待延时（500ms）
      vi.advanceTimersByTime(500);

      expect(mockWorkspaceStateManager.setRuleSelection).toHaveBeenCalledWith(
        expect.any(String), // workspacePath
        'source-1',
        {
          paths: ['/path/rule1.md'],
        },
      );

      vi.useRealTimers();
    });

    it('应该在未初始化时自动初始化', () => {
      const selection = selectionStateManager.getSelection('new-source');
      expect(selection).toEqual([]); // 默认空数组（全不选）
    });
  });

  describe('选择计数', () => {
    it('应该正确计算选中数量（空数组）', async () => {
      await selectionStateManager.initializeState('source-1', 10, []);

      selectionStateManager.updateSelection('source-1', [], true);

      const count = selectionStateManager.getSelectionCount('source-1');
      expect(count).toBe(0); // 空数组表示无选择
    });

    it('应该正确计算选中数量（非空数组）', async () => {
      await selectionStateManager.initializeState('source-1', 10, []);

      selectionStateManager.updateSelection('source-1', ['/path/rule1.md', '/path/rule2.md'], true);

      const count = selectionStateManager.getSelectionCount('source-1');
      expect(count).toBe(2);
    });

    it('应该在未初始化时返回0', () => {
      const count = selectionStateManager.getSelectionCount('non-existent');
      expect(count).toBe(0);
    });
  });

  describe('全选/全不选', () => {
    it('应详支持全选（使用所有路径）', async () => {
      const allPaths = [
        '/path/rule1.md',
        '/path/rule2.md',
        '/path/rule3.md',
        '/path/rule4.md',
        '/path/rule5.md',
      ];
      await selectionStateManager.initializeState('source-1', 5, allPaths);

      selectionStateManager.updateSelection('source-1', allPaths, true);

      const count = selectionStateManager.getSelectionCount('source-1');
      expect(count).toBe(5);
    });

    it('应该支持全不选（设置为空数组）', async () => {
      await selectionStateManager.initializeState('source-1', 5, []);

      // 全不选的实现方式：传入空数组
      selectionStateManager.updateSelection('source-1', [], true);

      const selection = selectionStateManager.getSelection('source-1');
      expect(selection).toEqual([]);
      expect(selectionStateManager.getSelectionCount('source-1')).toBe(0);
    });
  });

  describe('批量操作', () => {
    it('应该支持批量更新多个源', async () => {
      await selectionStateManager.initializeState('source-1', 3, []);
      await selectionStateManager.initializeState('source-2', 3, []);

      selectionStateManager.updateSelection('source-1', ['/path/rule1.md'], true);
      selectionStateManager.updateSelection('source-2', ['/path/rule2.md'], true);

      expect(selectionStateManager.getSelection('source-1')).toEqual(['/path/rule1.md']);
      expect(selectionStateManager.getSelection('source-2')).toEqual(['/path/rule2.md']);
    });
  });

  describe('延时保存机制', () => {
    it('应该合并多次快速更新为一次保存', async () => {
      vi.useFakeTimers();

      await selectionStateManager.initializeState('source-1', 10, []);

      // 快速连续更新（使用 schedulePersistence=true 来启用延时保存）
      selectionStateManager.updateSelection('source-1', ['/path/rule1.md'], true);
      vi.advanceTimersByTime(200);
      selectionStateManager.updateSelection('source-1', ['/path/rule1.md', '/path/rule2.md'], true);
      vi.advanceTimersByTime(200);
      selectionStateManager.updateSelection(
        'source-1',
        ['/path/rule1.md', '/path/rule2.md', '/path/rule3.md'],
        true,
      );

      // 等待最后一次更新的延时（500ms）
      vi.advanceTimersByTime(500);

      // 应该只保存最后一次的状态
      expect(mockWorkspaceStateManager.setRuleSelection).toHaveBeenCalledTimes(1);
      expect(mockWorkspaceStateManager.setRuleSelection).toHaveBeenCalledWith(
        expect.any(String), // workspacePath
        'source-1',
        expect.objectContaining({
          paths: ['/path/rule1.md', '/path/rule2.md', '/path/rule3.md'],
        }),
      );

      vi.useRealTimers();
    });
  });

  describe('状态变更事件', () => {
    it('应该在状态变更时触发事件', async () => {
      await selectionStateManager.initializeState('source-1', 5, []);

      const callback = vi.fn();
      const dispose = selectionStateManager.onStateChanged(callback);

      selectionStateManager.updateSelection('source-1', ['/path/rule1.md'], true);

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          sourceId: 'source-1',
          selectedPaths: ['/path/rule1.md'],
          totalCount: 5,
          timestamp: expect.any(Number),
        }),
      );

      dispose();
    });

    it('应该支持取消订阅', async () => {
      await selectionStateManager.initializeState('source-1', 5, []);

      const callback = vi.fn();
      const dispose = selectionStateManager.onStateChanged(callback);

      dispose();

      selectionStateManager.updateSelection('source-1', ['/path/rule1.md'], true);

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('错误处理', () => {
    it('应该处理磁盘读取失败', async () => {
      mockWorkspaceStateManager.getRuleSelection.mockRejectedValue(new Error('Read failed'));

      const { Logger } = await import('@/utils/logger');

      await selectionStateManager.initializeState('source-1', 5, ['/path/rule1.md']);

      expect(Logger.error).toHaveBeenCalled();

      // 新设计：出错时默认全不选，等待用户主动勾选
      const selection = selectionStateManager.getSelection('source-1');
      expect(selection).toEqual([]);
    });
  });

  describe('共享选择功能', () => {
    it('应该在启用共享选择时优先从共享文件加载', async () => {
      // 启用共享选择
      mockSharedManager.isEnabled.mockReturnValue(true);
      mockSharedManager.load.mockResolvedValue({
        version: 1,
        workspacePath: '/test/workspace',
        lastUpdated: '2025-12-24T10:00:00.000Z',
        selections: {
          'source-1': {
            paths: ['shared-rule1.md', 'shared-rule2.md'],
          },
        },
      });

      await selectionStateManager.initializeState('source-1', 10, []);

      const selection = selectionStateManager.getSelection('source-1');
      expect(selection).toEqual(['shared-rule1.md', 'shared-rule2.md']);

      // 应该调用了共享管理器
      expect(mockSharedManager.load).toHaveBeenCalledWith('/test/workspace');
      // 不应该调用 WorkspaceDataManager
      expect(mockWorkspaceStateManager.getRuleSelection).not.toHaveBeenCalled();
    });

    it('应该在共享文件不存在时降级到 WorkspaceDataManager', async () => {
      // 启用共享选择，但文件不存在
      mockSharedManager.isEnabled.mockReturnValue(true);
      mockSharedManager.load.mockResolvedValue(null);
      mockWorkspaceStateManager.getRuleSelection.mockResolvedValue({
        paths: ['workspace-rule1.md'],
      });

      await selectionStateManager.initializeState('source-1', 10, []);

      const selection = selectionStateManager.getSelection('source-1');
      expect(selection).toEqual(['workspace-rule1.md']);

      // 应该先尝试共享文件
      expect(mockSharedManager.load).toHaveBeenCalled();
      // 然后降级到 WorkspaceDataManager
      expect(mockWorkspaceStateManager.getRuleSelection).toHaveBeenCalled();
    });

    it('应该在共享文件加载失败时降级到 WorkspaceDataManager', async () => {
      // 启用共享选择，但加载失败
      mockSharedManager.isEnabled.mockReturnValue(true);
      mockSharedManager.load.mockRejectedValue(new Error('Load failed'));
      mockWorkspaceStateManager.getRuleSelection.mockResolvedValue({
        paths: ['workspace-rule1.md'],
      });

      const { Logger } = await import('@/utils/logger');

      await selectionStateManager.initializeState('source-1', 10, []);

      const selection = selectionStateManager.getSelection('source-1');
      expect(selection).toEqual(['workspace-rule1.md']);

      // 应该记录警告
      expect(Logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('falling back'),
        expect.any(Object),
      );
    });

    it('应该在禁用共享选择时直接使用 WorkspaceDataManager', async () => {
      // 禁用共享选择
      mockSharedManager.isEnabled.mockReturnValue(false);
      mockWorkspaceStateManager.getRuleSelection.mockResolvedValue({
        paths: ['workspace-rule1.md'],
      });

      await selectionStateManager.initializeState('source-1', 10, []);

      const selection = selectionStateManager.getSelection('source-1');
      expect(selection).toEqual(['workspace-rule1.md']);

      // 不应该调用共享管理器
      expect(mockSharedManager.load).not.toHaveBeenCalled();
      // 应该直接使用 WorkspaceDataManager
      expect(mockWorkspaceStateManager.getRuleSelection).toHaveBeenCalled();
    });

    it('应该在更新选择时同时保存到共享文件', async () => {
      // 启用共享选择
      mockSharedManager.isEnabled.mockReturnValue(true);

      await selectionStateManager.initializeState('source-1', 10, []);
      selectionStateManager.updateSelection('source-1', ['rule1.md', 'rule2.md'], false);

      // 手动触发持久化
      await selectionStateManager.persistToDisk('source-1');

      // 应该同时保存到共享文件
      expect(mockSharedManager.save).toHaveBeenCalledWith('/test/workspace', expect.any(Map));
    });

    it('应该正确检查共享选择是否启用', () => {
      mockSharedManager.isEnabled.mockReturnValue(true);

      const enabled = selectionStateManager.isSharedSelectionEnabled();
      expect(enabled).toBe(true);
      expect(mockSharedManager.isEnabled).toHaveBeenCalled();
    });
  });
});
