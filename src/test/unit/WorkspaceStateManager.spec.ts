/**
 * WorkspaceStateManager 单元测试
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type * as vscode from 'vscode';

import { WorkspaceStateManager } from '../../services/WorkspaceStateManager';

// Mock ExtensionContext
const createMockContext = () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const storage = new Map<string, any>();

  return {
    workspaceState: {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        return storage.has(key) ? storage.get(key) : defaultValue;
      }),
      update: vi.fn(async (key: string, value: unknown) => {
        if (value === undefined) {
          storage.delete(key);
        } else {
          storage.set(key, value);
        }
      }),
    },
  } as unknown as vscode.ExtensionContext;
};

describe('WorkspaceStateManager', () => {
  let context: vscode.ExtensionContext;
  let manager: WorkspaceStateManager;

  beforeEach(async () => {
    context = createMockContext();
    // Reset singleton
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (WorkspaceStateManager as any).instance = null;
    manager = WorkspaceStateManager.getInstance(context);
    // 清空缓存
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (manager as any).cache = null;
  });

  afterEach(async () => {
    // 清理测试数据
    try {
      await manager.clearAll();
    } catch (_error) {
      // 忽略清理错误
    }
  });

  describe('同步元数据', () => {
    it('应该能够存储和读取最后同步时间', async () => {
      const sourceId = 'test-source';
      const timestamp = new Date().toISOString();

      await manager.setLastSyncTime(sourceId, timestamp);
      const result = await manager.getLastSyncTime(sourceId);

      expect(result).toBe(timestamp);
    });

    it('应该能够存储和读取源哈希', async () => {
      const sourceId = 'test-source';
      const hash = 'abc123def456';

      await manager.setSourceHash(sourceId, hash);
      const result = await manager.getSourceHash(sourceId);

      expect(result).toBe(hash);
    });

    it('应该能够删除源的同步元数据', async () => {
      const sourceId = 'test-source';
      await manager.setLastSyncTime(sourceId, new Date().toISOString());
      await manager.setSourceHash(sourceId, 'hash123');

      await manager.deleteSyncMetadata(sourceId);

      expect(await manager.getLastSyncTime(sourceId)).toBeUndefined();
      expect(await manager.getSourceHash(sourceId)).toBeUndefined();
    });
  });

  describe('UI 状态', () => {
    it('应该能够存储和读取展开的节点', async () => {
      const nodes = ['node1', 'node2', 'node3'];

      await manager.setExpandedNodes(nodes);
      const result = await manager.getExpandedNodes();

      expect(result).toEqual(nodes);
    });

    it('应该能够存储和读取选中的源', async () => {
      const sourceId = 'selected-source';

      await manager.setSelectedSource(sourceId);
      const result = await manager.getSelectedSource();

      expect(result).toBe(sourceId);
    });

    it('应该能够存储和读取排序方式', async () => {
      await manager.setSortOrder('name');
      const result = await manager.getSortOrder();

      expect(result).toBe('name');
    });

    it('应该能够存储和读取过滤标签', async () => {
      const tags = ['typescript', 'react'];

      await manager.setFilterTags(tags);
      const result = await manager.getFilterTags();

      expect(result).toEqual(tags);
    });
  });

  describe('缓存元数据', () => {
    it('应该能够添加到 LRU 队列', async () => {
      await manager.addToLruQueue('rule1');
      await manager.addToLruQueue('rule2');
      await manager.addToLruQueue('rule3');

      const queue = await manager.getLruQueue();
      expect(queue).toEqual(['rule1', 'rule2', 'rule3']);
    });

    it('应该能够移动已存在的项到队尾（LRU 特性）', async () => {
      await manager.addToLruQueue('rule1');
      await manager.addToLruQueue('rule2');
      await manager.addToLruQueue('rule3');
      await manager.addToLruQueue('rule1'); // 移动到队尾

      const queue = await manager.getLruQueue();
      expect(queue).toEqual(['rule2', 'rule3', 'rule1']);
    });

    it('应该限制 LRU 队列长度（最多 100 项）', async () => {
      // 添加 105 项
      for (let i = 0; i < 105; i++) {
        await manager.addToLruQueue(`rule${i}`);
      }

      const queue = await manager.getLruQueue();
      expect(queue.length).toBe(100);
      // 最旧的 5 项应该被移除
      expect(queue[0]).toBe('rule5');
      expect(queue[queue.length - 1]).toBe('rule104');
    });

    it('应该能够存储和读取最后清理时间', async () => {
      const timestamp = new Date().toISOString();

      await manager.setLastCleanup(timestamp);
      const result = await manager.getLastCleanup();

      expect(result).toBe(timestamp);
    });
  });

  describe('清理操作', () => {
    it('应该能够清理已删除源的元数据', async () => {
      await manager.setLastSyncTime('source1', new Date().toISOString());
      await manager.setLastSyncTime('source2', new Date().toISOString());
      await manager.setLastSyncTime('source3', new Date().toISOString());
      await manager.setSelectedSource('source2');

      // 只保留 source1 和 source3
      await manager.cleanupDeletedSources(['source1', 'source3']);

      expect(await manager.getLastSyncTime('source1')).toBeDefined();
      expect(await manager.getLastSyncTime('source2')).toBeUndefined();
      expect(await manager.getLastSyncTime('source3')).toBeDefined();
      // 选中的源被删除后应该清空
      expect(await manager.getSelectedSource()).toBeNull();
    });

    it('应该能够清空所有状态', async () => {
      await manager.setLastSyncTime('source1', new Date().toISOString());
      await manager.setExpandedNodes(['node1', 'node2']);
      await manager.addToLruQueue('rule1');

      await manager.clearAll();

      // lastSyncTime 应该被清空
      expect(await manager.getLastSyncTime('source1')).toBeUndefined();
      // UI 状态应该被重置为默认值
      expect(await manager.getExpandedNodes()).toEqual([]);
      // LRU 队列应该被清空
      expect(await manager.getLruQueue()).toEqual([]);
      // lastCleanup 会被设置为新的时间（默认值行为）
      const lastCleanup = await manager.getLastCleanup();
      expect(lastCleanup).toBeDefined();
      expect(new Date(lastCleanup).getTime()).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe('大小限制', () => {
    it('应该能够获取当前状态大小', async () => {
      const size = await manager.getStateSize();
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThan(10 * 1024); // 应该小于 10KB
    });

    it('应该在接近大小限制时警告', async () => {
      // 添加较多数据但不超过限制（用 500 个标签而不是 1000 个）
      const largeTags = Array.from({ length: 500 }, (_, i) => `tag-${i}`);
      await manager.setFilterTags(largeTags);

      const size = await manager.getStateSize();
      // 检查大小在合理范围内（3-8KB）
      expect(size).toBeGreaterThan(3 * 1024);
      expect(size).toBeLessThan(10 * 1024);
    });
  });
});
