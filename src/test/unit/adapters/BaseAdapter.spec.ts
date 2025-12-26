/**
 * @description BaseAdapter 排序和去重测试
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock vscode and logger
vi.mock('vscode');
vi.mock('../../../utils/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { BaseAdapter } from '../../../adapters/AIToolAdapter';
import type { ParsedRule } from '../../../types/rules';

// 创建测试适配器类
class TestAdapter extends BaseAdapter {
  readonly name = 'Test';
  readonly enabled = true;

  async generate(rules: ParsedRule[]): Promise<any> {
    return {
      filePath: 'test',
      content: rules.map((r) => r.content).join('\n'),
      generatedAt: new Date(),
      ruleCount: rules.length,
    };
  }

  getFilePath(): string {
    return 'test';
  }
}

describe('BaseAdapter sorting and deduplication', () => {
  let adapter: TestAdapter;

  beforeEach(() => {
    adapter = new TestAdapter();
  });

  describe('sortRules', () => {
    const createRule = (id: string, priority: 'low' | 'medium' | 'high'): ParsedRule => ({
      id,
      title: `Rule ${id}`,
      content: `Content ${id}`,
      rawContent: `Content ${id}`,
      sourceId: 'test',
      metadata: { priority },
      filePath: `/test/${id}.md`,
    });

    it('should sort by priority ascending (low -> medium -> high)', () => {
      const rules = [
        createRule('high-rule', 'high'),
        createRule('low-rule', 'low'),
        createRule('medium-rule', 'medium'),
      ];

      adapter.setSortConfig('priority', 'asc');
      const sorted = adapter['sortRules'](rules, 'priority', 'asc');

      expect(sorted[0].id).toBe('low-rule');
      expect(sorted[1].id).toBe('medium-rule');
      expect(sorted[2].id).toBe('high-rule');
    });

    it('should sort by priority descending (high -> medium -> low)', () => {
      const rules = [
        createRule('low-rule', 'low'),
        createRule('high-rule', 'high'),
        createRule('medium-rule', 'medium'),
      ];

      adapter.setSortConfig('priority', 'desc');
      const sorted = adapter['sortRules'](rules, 'priority', 'desc');

      expect(sorted[0].id).toBe('high-rule');
      expect(sorted[1].id).toBe('medium-rule');
      expect(sorted[2].id).toBe('low-rule');
    });

    it('should sort by id ascending', () => {
      const rules = [
        createRule('rule-c', 'medium'),
        createRule('rule-a', 'high'),
        createRule('rule-b', 'low'),
      ];

      const sorted = adapter['sortRules'](rules, 'id', 'asc');

      expect(sorted[0].id).toBe('rule-a');
      expect(sorted[1].id).toBe('rule-b');
      expect(sorted[2].id).toBe('rule-c');
    });

    it('should sort by id descending', () => {
      const rules = [
        createRule('rule-a', 'medium'),
        createRule('rule-c', 'high'),
        createRule('rule-b', 'low'),
      ];

      const sorted = adapter['sortRules'](rules, 'id', 'desc');

      expect(sorted[0].id).toBe('rule-c');
      expect(sorted[1].id).toBe('rule-b');
      expect(sorted[2].id).toBe('rule-a');
    });

    it('should not sort when sortBy is none', () => {
      const rules = [
        createRule('rule-c', 'high'),
        createRule('rule-a', 'low'),
        createRule('rule-b', 'medium'),
      ];

      const sorted = adapter['sortRules'](rules, 'none', 'asc');

      expect(sorted[0].id).toBe('rule-c');
      expect(sorted[1].id).toBe('rule-a');
      expect(sorted[2].id).toBe('rule-b');
    });
  });

  describe('mergeWithUserRules - deduplication', () => {
    const createRule = (
      id: string,
      priority: 'low' | 'medium' | 'high',
      sourceId: string,
    ): ParsedRule => ({
      id,
      title: `Rule ${id}`,
      content: `Content ${id} from ${sourceId}`,
      rawContent: `Content ${id} from ${sourceId}`,
      sourceId,
      metadata: { priority },
      filePath: `/test/${id}.md`,
    });

    it('should deduplicate rules by id (keep first after sorting)', () => {
      const remoteRules = [createRule('naming', 'medium', 'remote')];
      const userRules = [createRule('naming', 'high', 'user-rules')];

      adapter.setSortConfig('priority', 'asc');
      const merged = adapter['mergeWithUserRules'](remoteRules, userRules);

      // sortOrder: asc -> [medium, high] -> 去重保留第一个 (medium)
      expect(merged).toHaveLength(1);
      expect(merged[0].sourceId).toBe('remote');
      expect(merged[0].metadata.priority).toBe('medium');
    });

    it('should keep high priority user rule when sortOrder is desc', () => {
      const remoteRules = [createRule('naming', 'medium', 'remote')];
      const userRules = [createRule('naming', 'high', 'user-rules')];

      adapter.setSortConfig('priority', 'desc');
      const merged = adapter['mergeWithUserRules'](remoteRules, userRules);

      // sortOrder: desc → high → medium → low (降序，高优先级在前)
      // 排序结果: [high(user), medium(remote)]
      // 去重保留第一个 → 保留 high (user-rules)
      expect(merged).toHaveLength(1);
      expect(merged[0].sourceId).toBe('user-rules');
      expect(merged[0].metadata.priority).toBe('high');
    });

    it('should not deduplicate rules with different ids', () => {
      const remoteRules = [
        createRule('rule1', 'medium', 'remote'),
        createRule('rule2', 'low', 'remote'),
      ];
      const userRules = [createRule('rule3', 'high', 'user-rules')];

      adapter.setSortConfig('priority', 'asc');
      const merged = adapter['mergeWithUserRules'](remoteRules, userRules);

      expect(merged).toHaveLength(3);
      // asc: low -> medium -> high
      expect(merged[0].id).toBe('rule2');
      expect(merged[1].id).toBe('rule1');
      expect(merged[2].id).toBe('rule3');
    });

    it('should handle multiple duplicate ids correctly', () => {
      const remoteRules = [
        createRule('duplicate', 'low', 'remote1'),
        createRule('duplicate', 'medium', 'remote2'),
      ];
      const userRules = [createRule('duplicate', 'high', 'user-rules')];

      adapter.setSortConfig('priority', 'asc');
      const merged = adapter['mergeWithUserRules'](remoteRules, userRules);

      // asc: low -> medium -> high -> 保留第一个 (low)
      expect(merged).toHaveLength(1);
      expect(merged[0].sourceId).toBe('remote1');
      expect(merged[0].metadata.priority).toBe('low');
    });
  });

  describe('Recency Bias demonstration', () => {
    it('should place high priority rules at the end with asc order (for LLM recency bias)', () => {
      const createRule = (id: string, priority: 'low' | 'medium' | 'high'): ParsedRule => ({
        id,
        title: `Rule ${id}`,
        content: `Content ${id}`,
        rawContent: `Content ${id}`,
        sourceId: 'test',
        metadata: { priority },
        filePath: `/test/${id}.md`,
      });

      const rules = [
        createRule('critical-security', 'high'),
        createRule('style-guide', 'low'),
        createRule('best-practice', 'medium'),
      ];

      adapter.setSortConfig('priority', 'asc');
      const sorted = adapter['sortRules'](rules, 'priority', 'asc');

      // 验证：低优先级在前，高优先级在后（利用 LLM 近因效应）
      expect(sorted[0].metadata.priority).toBe('low');
      expect(sorted[1].metadata.priority).toBe('medium');
      expect(sorted[2].metadata.priority).toBe('high');

      // 在实际文件中，LLM 会更重视后面的内容（critical-security）
      const fileContent = sorted.map((r) => r.content).join('\n\n');
      expect(fileContent.endsWith('Content critical-security')).toBe(true);
    });
  });
});
