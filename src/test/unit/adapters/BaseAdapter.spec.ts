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

    it('should deduplicate rules by id (keep first after sorting)', async () => {
      const remoteRules = [createRule('naming', 'medium', 'remote')];
      const userRules = [createRule('naming', 'high', 'user-rules')];

      adapter.setSortConfig('priority', 'asc');
      const merged = await adapter['mergeWithUserRules'](remoteRules, userRules);

      // sortOrder: asc -> [medium, high] -> 去重保留第一个 (medium)
      expect(merged).toHaveLength(1);
      expect(merged[0].sourceId).toBe('remote');
      expect(merged[0].metadata.priority).toBe('medium');
    });

    it('should keep high priority user rule when sortOrder is desc', async () => {
      const remoteRules = [createRule('naming', 'medium', 'remote')];
      const userRules = [createRule('naming', 'high', 'user-rules')];

      adapter.setSortConfig('priority', 'desc');
      const merged = await adapter['mergeWithUserRules'](remoteRules, userRules);

      // sortOrder: desc → high → medium → low (降序，高优先级在前)
      // 排序结果: [high(user), medium(remote)]
      // 去重保留第一个 → 保留 high (user-rules)
      expect(merged).toHaveLength(1);
      expect(merged[0].sourceId).toBe('user-rules');
      expect(merged[0].metadata.priority).toBe('high');
    });

    it('should not deduplicate rules with different ids', async () => {
      const remoteRules = [
        createRule('rule1', 'medium', 'remote'),
        createRule('rule2', 'low', 'remote'),
      ];
      const userRules = [createRule('rule3', 'high', 'user-rules')];

      adapter.setSortConfig('priority', 'asc');
      const merged = await adapter['mergeWithUserRules'](remoteRules, userRules);

      expect(merged).toHaveLength(3);
      // asc: low -> medium -> high
      expect(merged[0].id).toBe('rule2');
      expect(merged[1].id).toBe('rule1');
      expect(merged[2].id).toBe('rule3');
    });

    it('should handle multiple duplicate ids correctly', async () => {
      const remoteRules = [
        createRule('duplicate', 'low', 'remote1'),
        createRule('duplicate', 'medium', 'remote2'),
      ];
      const userRules = [createRule('duplicate', 'high', 'user-rules')];

      adapter.setSortConfig('priority', 'asc');
      const merged = await adapter['mergeWithUserRules'](remoteRules, userRules);

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

  describe('Directory generation methods', () => {
    // 创建支持目录模式的测试适配器
    class DirectoryTestAdapter extends BaseAdapter {
      readonly name = 'DirectoryTest';
      readonly enabled = true;
      private _organizeBySource = false;
      private _generateIndex = true;
      private _indexFileName = 'index.md';
      private _outputPath = '.ai/rules';

      setOrganizeBySource(value: boolean): void {
        this._organizeBySource = value;
      }

      setGenerateIndex(value: boolean): void {
        this._generateIndex = value;
      }

      setIndexFileName(name: string): void {
        this._indexFileName = name;
      }

      setOutputPath(path: string): void {
        this._outputPath = path;
      }

      protected shouldOrganizeBySource(): boolean {
        return this._organizeBySource;
      }

      protected shouldGenerateIndex(): boolean {
        return this._generateIndex;
      }

      protected getIndexFileName(): string {
        return this._indexFileName;
      }

      protected getDirectoryOutputPath(): string {
        return this._outputPath;
      }

      protected getRuleFileName(rule: ParsedRule): string {
        return `${rule.id}.md`;
      }

      protected getOutputType(): 'file' | 'directory' {
        return 'directory';
      }

      protected getHeaderContent(_rules: ParsedRule[]): string {
        return '';
      }

      async generate(rules: ParsedRule[]): Promise<any> {
        return {
          filePath: this._outputPath,
          content: '',
          generatedAt: new Date(),
          ruleCount: rules.length,
        };
      }

      getFilePath(): string {
        return this._outputPath;
      }
    }

    const createRule = (
      id: string,
      sourceId: string,
      content: string = `Content of ${id}`,
    ): ParsedRule => ({
      id,
      title: `Rule ${id}`,
      content,
      rawContent: `---\nid: ${id}\n---\n${content}`,
      sourceId,
      metadata: { priority: 'medium' as const },
      filePath: `/source/${sourceId}/${id}.md`,
    });

    it('should generate directory index with correct metadata', async () => {
      const adapter = new DirectoryTestAdapter();
      const rules = [
        createRule('rule1', 'source-a'),
        createRule('rule2', 'source-b'),
        createRule('rule3', 'source-a'),
      ];

      const index = await adapter['generateDirectoryIndex'](rules, false);

      expect(index).toContain('# DirectoryTest');
      expect(index).toContain('Total rules: 3');
      expect(index).toContain('All Rules');
      expect(index).toContain('[Rule rule1]');
      expect(index).toContain('[Rule rule2]');
      expect(index).toContain('[Rule rule3]');
    });

    it('should generate index organized by source when organizeBySource=true', async () => {
      const adapter = new DirectoryTestAdapter();
      const rules = [
        createRule('rule1', 'source-a'),
        createRule('rule2', 'source-b'),
        createRule('rule3', 'source-a'),
      ];

      const index = await adapter['generateDirectoryIndex'](rules, true);

      expect(index).toContain('## Source: source-a');
      expect(index).toContain('## Source: source-b');
      expect(index).toContain('[Rule rule1](./source-a/rule1.md)');
      expect(index).toContain('[Rule rule2](./source-b/rule2.md)');
      expect(index).toContain('[Rule rule3](./source-a/rule3.md)');
    });

    it('should generate flat index when organizeBySource=false', async () => {
      const adapter = new DirectoryTestAdapter();
      const rules = [createRule('rule1', 'source-a'), createRule('rule2', 'source-b')];

      const index = await adapter['generateDirectoryIndex'](rules, false);

      expect(index).toContain('## All Rules');
      expect(index).toContain('Total rules: 2');
      expect(index).toContain('[Rule rule1](./source-a-rule1.md)');
      expect(index).toContain('[Rule rule2](./source-b-rule2.md)');
      expect(index).not.toContain('Source:');
    });

    it('should use actual file paths from filesMap when generating index', async () => {
      const adapter = new DirectoryTestAdapter();
      const rules = [
        createRule('1301-python-dev', 'turbo-skills'),
        createRule('1302-typescript-dev', 'turbo-skills'),
      ];

      // 模拟实际生成的文件路径（带目录结构）
      const filesMap = new Map<string, string>([
        ['.skills/turbo-skills/a/b/1301-python-dev.md', 'Content of 1301-python-dev'],
        ['.skills/turbo-skills/c/d/1302-typescript-dev.md', 'Content of 1302-typescript-dev'],
      ]);

      const index = await adapter['generateDirectoryIndex'](rules, true, filesMap);

      // 应该使用 filesMap 中的实际路径
      expect(index).toContain('[Rule 1301-python-dev](./turbo-skills/a/b/1301-python-dev.md)');
      expect(index).toContain(
        '[Rule 1302-typescript-dev](./turbo-skills/c/d/1302-typescript-dev.md)',
      );
    });

    it('should fallback to default pattern when filesMap not provided', async () => {
      const adapter = new DirectoryTestAdapter();
      const rules = [createRule('rule1', 'source-a')];

      const index = await adapter['generateDirectoryIndex'](rules, true);

      // 没有 filesMap，应使用默认模式
      expect(index).toContain('[Rule rule1](./source-a/rule1.md)');
    });

    it('should skip directory entries in filesMap', async () => {
      const adapter = new DirectoryTestAdapter();
      const rules = [createRule('1301-skill', 'turbo-skills')];

      const filesMap = new Map<string, string>([
        ['.skills/turbo-skills/git-workflow-expert', '[Directory: git-workflow-expert]'],
        ['.skills/turbo-skills/git-workflow-expert/1301-skill.md', 'Content'],
      ]);

      const index = await adapter['generateDirectoryIndex'](rules, true, filesMap);

      // 应该使用文件路径，不是目录路径
      expect(index).toContain(
        '[Rule 1301-skill](./turbo-skills/git-workflow-expert/1301-skill.md)',
      );
    });
  });

  describe('preserveDirectoryStructure configuration', () => {
    class DirectoryTestAdapter extends BaseAdapter {
      readonly name = 'DirectoryTest';
      readonly enabled = true;

      protected getOutputType(): 'file' | 'directory' {
        return 'directory';
      }

      protected generateHeaderContent(_rules: ParsedRule[]): string {
        return '';
      }

      protected shouldOrganizeBySource(): boolean {
        return false;
      }

      protected shouldGenerateIndex(): boolean {
        return false;
      }

      protected getIndexFileName(): string {
        return 'index.md';
      }

      protected getDirectoryOutputPath(): string {
        return '.ai/rules';
      }

      protected getRuleFileName(rule: ParsedRule): string {
        return `${rule.id}.md`;
      }

      async generate(rules: ParsedRule[]): Promise<any> {
        return {
          filePath: '.ai/rules',
          content: '',
          generatedAt: new Date(),
          ruleCount: rules.length,
        };
      }

      getFilePath(): string {
        return '.ai/rules';
      }
    }

    it('should have default preserveDirectoryStructure=true', () => {
      const adapter = new DirectoryTestAdapter();
      expect(adapter['preserveDirectoryStructure']).toBe(true);
    });

    it('should allow setting preserveDirectoryStructure', () => {
      const adapter = new DirectoryTestAdapter();
      adapter.setPreserveDirectoryStructure(false);
      expect(adapter['preserveDirectoryStructure']).toBe(false);

      adapter.setPreserveDirectoryStructure(true);
      expect(adapter['preserveDirectoryStructure']).toBe(true);
    });
  });
});
