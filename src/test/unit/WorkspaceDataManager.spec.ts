/**
 * WorkspaceDataManager 单元测试
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { WorkspaceDataManager } from '../../services/WorkspaceDataManager';
import type { ParsedRule } from '../../types/rules';
import { GLOBAL_CACHE_DIR } from '../../utils/constants';

describe('WorkspaceDataManager', () => {
  let manager: WorkspaceDataManager;
  const testWorkspacePath = '/test/workspace/path';

  beforeEach(async () => {
    // Reset singleton
    (WorkspaceDataManager as any).instance = null;
    manager = WorkspaceDataManager.getInstance();
    await manager.initWorkspace(testWorkspacePath);
  });

  afterEach(async () => {
    // 清理测试数据
    try {
      await manager.clearWorkspaceData();
    } catch (_error) {
      // 忽略清理错误
    }
  });

  describe('初始化', () => {
    it('应该计算正确的工作区哈希', () => {
      const hash = manager.getWorkspaceHash();
      expect(hash).toMatch(/^[a-f0-9]{16}$/);
    });

    it('应该生成正确的工作区目录路径', () => {
      const workspaceDir = manager.getWorkspaceDir();
      expect(workspaceDir).toContain(GLOBAL_CACHE_DIR);
      expect(workspaceDir).toContain('workspaces');
      expect(workspaceDir).toContain(manager.getWorkspaceHash());
    });

    it('相同路径应该生成相同哈希', async () => {
      const hash1 = manager.getWorkspaceHash();

      // 重新初始化相同路径
      (WorkspaceDataManager as any).instance = null;
      const manager2 = WorkspaceDataManager.getInstance();
      await manager2.initWorkspace(testWorkspacePath);
      const hash2 = manager2.getWorkspaceHash();

      expect(hash1).toBe(hash2);
    });

    it('不同路径应该生成不同哈希', async () => {
      const hash1 = manager.getWorkspaceHash();

      (WorkspaceDataManager as any).instance = null;
      const manager2 = WorkspaceDataManager.getInstance();
      await manager2.initWorkspace('/different/workspace/path');
      const hash2 = manager2.getWorkspaceHash();

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('规则索引', () => {
    it('应该能够写入和读取规则索引', async () => {
      const rules: ParsedRule[] = [
        {
          id: 'rule1',
          title: 'Test Rule 1',
          content: 'Test content 1',
          metadata: {
            tags: ['typescript', 'test'],
            priority: 'high',
          },
          sourceId: 'test-source',
          filePath: '/path/to/rule1.md',
        },
        {
          id: 'rule2',
          title: 'Test Rule 2',
          content: 'Test content 2',
          metadata: {
            tags: ['react'],
            priority: 'medium',
          },
          sourceId: 'test-source',
          filePath: '/path/to/rule2.md',
        },
      ];

      await manager.writeRulesIndex(testWorkspacePath, rules);
      const index = await manager.readRulesIndex();

      expect(index).not.toBeNull();
      expect(index?.rules).toHaveLength(2);
      expect(index?.rules[0].id).toBe('rule1');
      expect(index?.rules[0].title).toBe('Test Rule 1');
      expect(index?.rules[0].tags).toEqual(['typescript', 'test']);
      expect(index?.rules[0].priority).toBe(10); // 'high' 转换为 10
      expect(index?.rules[1].priority).toBe(5); // 'medium' 转换为 5
    });

    it('未初始化时读取应该返回 null', async () => {
      const index = await manager.readRulesIndex();
      // 第一次读取，文件还不存在
      expect(index).toBeNull();
    });
  });

  describe('搜索索引', () => {
    it('应该能够构建和读取搜索索引', async () => {
      const rules: ParsedRule[] = [
        {
          id: 'rule1',
          title: 'TypeScript Best Practices',
          content: 'Content',
          metadata: {
            tags: ['typescript', 'best-practices'],
            priority: 'high',
          },
          sourceId: 'test-source',
          filePath: '/path/to/rule1.md',
        },
        {
          id: 'rule2',
          title: 'React Hooks Guide',
          content: 'Content',
          metadata: {
            tags: ['react', 'hooks'],
            priority: 'medium',
          },
          sourceId: 'test-source',
          filePath: '/path/to/rule2.md',
        },
      ];

      await manager.writeSearchIndex(rules);
      const index = await manager.readSearchIndex();

      expect(index).not.toBeNull();
      expect(index?.keywords).toHaveProperty('typescript');
      expect(index?.keywords['typescript']).toContain('rule1');
      expect(index?.keywords['react']).toContain('rule2');
      expect(index?.tags).toHaveProperty('typescript');
      expect(index?.tags['typescript']).toContain('rule1');
      expect(index?.tags['react']).toContain('rule2');
    });

    it('应该过滤太短的关键词', async () => {
      const rules: ParsedRule[] = [
        {
          id: 'rule1',
          title: 'Go JS Up',
          content: 'Content',
          metadata: {},
          sourceId: 'test-source',
          filePath: '/path/to/rule1.md',
        },
      ];

      await manager.writeSearchIndex(rules);
      const index = await manager.readSearchIndex();

      expect(index).not.toBeNull();
      // 'go' 和 'js' 和 'up' 太短，应该被过滤
      expect(index?.keywords).not.toHaveProperty('go');
      expect(index?.keywords).not.toHaveProperty('js');
      expect(index?.keywords).not.toHaveProperty('up');
    });
  });

  describe('生成清单', () => {
    it('应该能够写入和读取生成清单', async () => {
      const artifacts = [
        {
          path: '.cursorrules',
          sha256: 'abc123',
          size: 1000,
          policy: 'overwrite' as const,
          adapter: 'cursor',
          generatedAt: new Date().toISOString(),
        },
        {
          path: '.github/copilot-instructions.md',
          sha256: 'def456',
          size: 2000,
          policy: 'overwrite' as const,
          adapter: 'copilot',
          generatedAt: new Date().toISOString(),
        },
      ];

      await manager.writeGenerationManifest(testWorkspacePath, artifacts);
      const manifest = await manager.readGenerationManifest();

      expect(manifest).not.toBeNull();
      expect(manifest?.artifacts).toHaveLength(2);
      expect(manifest?.artifacts[0].path).toBe('.cursorrules');
      expect(manifest?.artifacts[1].adapter).toBe('copilot');
    });

    it('应该能够添加单个生成文件', async () => {
      const artifact = {
        path: '.cursorrules',
        sha256: 'abc123',
        size: 1000,
        policy: 'overwrite' as const,
        adapter: 'cursor',
        generatedAt: new Date().toISOString(),
      };

      await manager.addArtifact(testWorkspacePath, artifact);
      const manifest = await manager.readGenerationManifest();

      expect(manifest).not.toBeNull();
      expect(manifest?.artifacts).toHaveLength(1);
      expect(manifest?.artifacts[0].path).toBe('.cursorrules');
    });

    it('应该能够更新已存在的生成文件记录', async () => {
      const artifact1 = {
        path: '.cursorrules',
        sha256: 'abc123',
        size: 1000,
        policy: 'overwrite' as const,
        adapter: 'cursor',
        generatedAt: '2025-01-01T00:00:00Z',
      };

      const artifact2 = {
        path: '.cursorrules',
        sha256: 'xyz789',
        size: 1500,
        policy: 'overwrite' as const,
        adapter: 'cursor',
        generatedAt: '2025-01-02T00:00:00Z',
      };

      await manager.addArtifact(testWorkspacePath, artifact1);
      await manager.addArtifact(testWorkspacePath, artifact2);

      const manifest = await manager.readGenerationManifest();

      expect(manifest).not.toBeNull();
      expect(manifest?.artifacts).toHaveLength(1); // 应该只有一条记录
      expect(manifest?.artifacts[0].sha256).toBe('xyz789'); // 应该是新的哈希
      expect(manifest?.artifacts[0].size).toBe(1500); // 应该是新的大小
    });
  });
});
