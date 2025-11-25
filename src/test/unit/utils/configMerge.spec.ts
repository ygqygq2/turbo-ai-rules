/**
 * configMerge 工具函数单元测试
 */

import { describe, expect, it } from 'vitest';

import { mergeArraysUnique, mergeById, mergeStrings } from '@/utils/configMerge';

describe('configMerge 单元测试', () => {
  describe('mergeArraysUnique', () => {
    it('应该合并多个数组并去重', () => {
      const arr1 = [
        { id: '1', name: 'Alice' },
        { id: '2', name: 'Bob' },
      ];
      const arr2 = [
        { id: '2', name: 'Bob2' }, // 重复 id
        { id: '3', name: 'Charlie' },
      ];
      const arr3 = [{ id: '4', name: 'David' }];

      const result = mergeArraysUnique([arr1, arr2, arr3], (item) => item.id);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ id: '1', name: 'Alice' });
      expect(result[1]).toEqual({ id: '2', name: 'Bob' }); // 保留第一个
      expect(result[2]).toEqual({ id: '3', name: 'Charlie' });
      expect(result[3]).toEqual({ id: '4', name: 'David' });
    });

    it('应该保持优先级顺序', () => {
      const high = [
        { id: 'a', priority: 'high' },
        { id: 'b', priority: 'high' },
      ];
      const low = [
        { id: 'b', priority: 'low' }, // 应该被忽略
        { id: 'c', priority: 'low' },
      ];

      const result = mergeArraysUnique([high, low], (item) => item.id);

      expect(result).toHaveLength(3);
      expect(result.find((item) => item.id === 'b')?.priority).toBe('high');
    });

    it('应该处理空数组', () => {
      const arr1 = [{ id: '1', name: 'Alice' }];
      const arr2: { id: string; name: string }[] = [];
      const arr3 = undefined;

      const result = mergeArraysUnique([arr1, arr2, arr3], (item) => item.id);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: '1', name: 'Alice' });
    });

    it('应该处理所有数组为空的情况', () => {
      const result = mergeArraysUnique([undefined, [], undefined], () => '');

      expect(result).toHaveLength(0);
    });

    it('应该支持自定义 key 提取函数', () => {
      const arr1 = [
        { email: 'alice@example.com', name: 'Alice' },
        { email: 'bob@example.com', name: 'Bob' },
      ];
      const arr2 = [
        { email: 'bob@example.com', name: 'Bob2' },
        { email: 'charlie@example.com', name: 'Charlie' },
      ];

      const result = mergeArraysUnique([arr1, arr2], (item) => item.email);

      expect(result).toHaveLength(3);
      expect(result.find((item) => item.email === 'bob@example.com')?.name).toBe('Bob');
    });
  });

  describe('mergeById', () => {
    interface TestItem {
      id: string;
      value: string;
      level?: string;
    }

    it('应该按 Folder > Workspace > Global 优先级合并', () => {
      const folder: TestItem[] = [
        { id: 'source1', value: 'folder', level: 'folder' },
        { id: 'source2', value: 'folder' },
      ];
      const workspace: TestItem[] = [
        { id: 'source2', value: 'workspace', level: 'workspace' }, // 应该被忽略
        { id: 'source3', value: 'workspace' },
      ];
      const global: TestItem[] = [
        { id: 'source3', value: 'global' }, // 应该被忽略
        { id: 'source4', value: 'global' },
      ];

      const result = mergeById(folder, workspace, global);

      expect(result).toHaveLength(4);
      expect(result.find((item) => item.id === 'source1')?.value).toBe('folder');
      expect(result.find((item) => item.id === 'source2')?.value).toBe('folder'); // folder 优先
      expect(result.find((item) => item.id === 'source3')?.value).toBe('workspace');
      expect(result.find((item) => item.id === 'source4')?.value).toBe('global');
    });

    it('应该处理部分配置缺失', () => {
      const workspace: TestItem[] = [
        { id: 'source1', value: 'workspace' },
        { id: 'source2', value: 'workspace' },
      ];

      const result = mergeById(undefined, workspace, undefined);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ id: 'source1', value: 'workspace' });
    });

    it('应该处理所有配置为空', () => {
      const result = mergeById<TestItem>(undefined, undefined, undefined);

      expect(result).toHaveLength(0);
    });

    it('应该处理复杂对象', () => {
      interface Source {
        id: string;
        gitUrl: string;
        enabled: boolean;
        metadata?: { priority: number };
      }

      const folder: Source[] = [
        {
          id: 'source1',
          gitUrl: 'https://github.com/user/repo1.git',
          enabled: true,
          metadata: { priority: 10 },
        },
      ];
      const workspace: Source[] = [
        {
          id: 'source1',
          gitUrl: 'https://github.com/user/repo1-workspace.git',
          enabled: false,
        },
        {
          id: 'source2',
          gitUrl: 'https://github.com/user/repo2.git',
          enabled: true,
        },
      ];

      const result = mergeById(folder, workspace);

      expect(result).toHaveLength(2);
      expect(result[0].metadata?.priority).toBe(10); // folder 优先
      expect(result[0].enabled).toBe(true);
      expect(result[1].id).toBe('source2');
    });
  });

  describe('mergeStrings', () => {
    it('应该合并字符串数组并去重', () => {
      const folder = ['.md', '.mdc'];
      const workspace = ['.mdc', '.txt']; // .mdc 重复
      const global = ['.txt', '.json'];

      const result = mergeStrings(folder, workspace, global);

      expect(result).toEqual(['.md', '.mdc', '.txt', '.json']);
    });

    it('应该保持优先级顺序', () => {
      const folder = ['high-priority'];
      const workspace = ['high-priority', 'medium-priority']; // 重复应该被忽略
      const global = ['low-priority'];

      const result = mergeStrings(folder, workspace, global);

      expect(result).toEqual(['high-priority', 'medium-priority', 'low-priority']);
    });

    it('应该处理空数组', () => {
      const folder = ['item1'];
      const result = mergeStrings(folder, undefined, []);

      expect(result).toEqual(['item1']);
    });

    it('应该处理所有数组为空', () => {
      const result = mergeStrings(undefined, undefined, undefined);

      expect(result).toHaveLength(0);
    });

    it('应该处理特殊字符和空格', () => {
      const arr1 = ['normal', 'with-dash'];
      const arr2 = ['with space', 'with/slash'];
      const arr3 = ['with.dot', '@special'];

      const result = mergeStrings(arr1, arr2, arr3);

      expect(result).toContain('with space');
      expect(result).toContain('with/slash');
      expect(result).toContain('@special');
      expect(result).toHaveLength(6);
    });
  });

  describe('实际使用场景', () => {
    it('应该正确合并规则源配置', () => {
      interface RuleSource {
        id: string;
        gitUrl: string;
        branch: string;
        enabled: boolean;
      }

      const folderSources: RuleSource[] = [
        {
          id: 'project-rules',
          gitUrl: 'https://github.com/project/rules.git',
          branch: 'develop',
          enabled: true,
        },
      ];

      const workspaceSources: RuleSource[] = [
        {
          id: 'shared-rules',
          gitUrl: 'https://github.com/team/rules.git',
          branch: 'main',
          enabled: true,
        },
        {
          id: 'project-rules', // 重复,应该被 folder 覆盖
          gitUrl: 'https://github.com/other/rules.git',
          branch: 'main',
          enabled: false,
        },
      ];

      const globalSources: RuleSource[] = [
        {
          id: 'default-rules',
          gitUrl: 'https://github.com/default/rules.git',
          branch: 'main',
          enabled: true,
        },
      ];

      const merged = mergeById(folderSources, workspaceSources, globalSources);

      expect(merged).toHaveLength(3);
      expect(merged.find((s) => s.id === 'project-rules')?.branch).toBe('develop');
      expect(merged.find((s) => s.id === 'project-rules')?.enabled).toBe(true);
    });

    it('应该正确合并文件扩展名列表', () => {
      const folderExtensions = ['.md', '.mdc', '.custom'];
      const workspaceExtensions = ['.md', '.txt'];
      const globalExtensions = ['.md', '.json', '.yaml'];

      const merged = mergeStrings(folderExtensions, workspaceExtensions, globalExtensions);

      expect(merged).toEqual(['.md', '.mdc', '.custom', '.txt', '.json', '.yaml']);
    });
  });

  describe('边界情况', () => {
    it('应该处理大量重复项', () => {
      const arr1 = Array.from({ length: 100 }, (_, i) => ({ id: String(i % 10), value: i }));
      const arr2 = Array.from({ length: 100 }, (_, i) => ({ id: String(i % 10), value: i + 100 }));

      const result = mergeArraysUnique([arr1, arr2], (item) => item.id);

      expect(result).toHaveLength(10); // 只有 10 个不同的 id
    });

    it('应该处理空字符串 key', () => {
      const arr1 = [
        { id: '', value: 'empty1' },
        { id: 'valid', value: 'valid' },
      ];
      const arr2 = [
        { id: '', value: 'empty2' },
        { id: 'valid', value: 'duplicate' },
      ];

      const result = mergeArraysUnique([arr1, arr2], (item) => item.id);

      expect(result).toHaveLength(2); // 空字符串也会去重
      expect(result.find((item) => item.id === '')?.value).toBe('empty1');
    });
  });
});
