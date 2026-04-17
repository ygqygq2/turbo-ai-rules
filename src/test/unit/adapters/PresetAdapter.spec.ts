/**
 * PresetAdapter 单元测试
 * 测试预设适配器的排序功能
 */
import { describe, expect, it } from 'vitest';

import { PresetAdapter, PresetAdapterConfig } from '../../../adapters/PresetAdapter';
import type { AssetKind, ParsedRule } from '../../../types/rules';

// 测试用的预设配置
const testConfig: PresetAdapterConfig = {
  id: 'test-adapter',
  name: 'Test Adapter',
  filePath: '.testrules',
  type: 'file',
  defaultEnabled: false,
  description: 'Test adapter for unit tests',
};

const testDirectoryConfig: PresetAdapterConfig = {
  id: 'test-directory-adapter',
  name: 'Test Directory Adapter',
  filePath: '.github/prompts',
  type: 'directory',
  defaultEnabled: false,
  description: 'Directory preset adapter for unit tests',
  assetKinds: ['prompt'],
  relativePathBase: 'asset-root',
};

// 创建测试规则
const createTestRule = (
  id: string,
  priority: 'low' | 'medium' | 'high',
  kind?: AssetKind,
): ParsedRule => ({
  id,
  title: `Rule ${id}`,
  content: `Content for ${id}`,
  rawContent: `Content for ${id}`,
  filePath: `/test/${id}.md`,
  sourceId: 'test-source',
  metadata: {
    priority,
  },
  ...(kind ? { kind } : {}),
});

describe('PresetAdapter', () => {
  describe('constructor', () => {
    it('应该使用默认排序参数创建适配器', () => {
      const adapter = new PresetAdapter(testConfig, true);
      expect(adapter.name).toBe('Test Adapter');
      expect(adapter.enabled).toBe(true);
    });

    it('应该使用自定义排序参数创建适配器', () => {
      const adapter = new PresetAdapter(testConfig, true, 'id', 'desc');
      expect(adapter.name).toBe('Test Adapter');
      expect(adapter.enabled).toBe(true);
    });
  });

  describe('generate with sorting', () => {
    const rules: ParsedRule[] = [
      createTestRule('rule-c', 'high'),
      createTestRule('rule-a', 'low'),
      createTestRule('rule-b', 'medium'),
    ];

    it('应该按优先级升序排序规则', async () => {
      const adapter = new PresetAdapter(testConfig, true, 'priority', 'asc');
      const result = await adapter.generate(rules);

      // 优先级升序：低优先级在前（1, 2, 3）
      expect(result.content).toMatch(/rule-a[\s\S]*rule-b[\s\S]*rule-c/);
    });

    it('应该按优先级降序排序规则', async () => {
      const adapter = new PresetAdapter(testConfig, true, 'priority', 'desc');
      const result = await adapter.generate(rules);

      // 优先级降序：高优先级在前（3, 2, 1）
      expect(result.content).toMatch(/rule-c[\s\S]*rule-b[\s\S]*rule-a/);
    });

    it('应该按 ID 升序排序规则', async () => {
      const adapter = new PresetAdapter(testConfig, true, 'id', 'asc');
      const result = await adapter.generate(rules);

      // ID 升序：a, b, c
      expect(result.content).toMatch(/rule-a[\s\S]*rule-b[\s\S]*rule-c/);
    });

    it('应该按 ID 降序排序规则', async () => {
      const adapter = new PresetAdapter(testConfig, true, 'id', 'desc');
      const result = await adapter.generate(rules);

      // ID 降序：c, b, a
      expect(result.content).toMatch(/rule-c[\s\S]*rule-b[\s\S]*rule-a/);
    });

    it('sortBy=none 时不应该改变规则顺序', async () => {
      const adapter = new PresetAdapter(testConfig, true, 'none', 'asc');
      const result = await adapter.generate(rules);

      // 保持原始顺序：c, a, b
      expect(result.content).toMatch(/rule-c[\s\S]*rule-a[\s\S]*rule-b/);
    });

    it('没有规则时应该生成空配置', async () => {
      const adapter = new PresetAdapter(testConfig, true, 'priority', 'asc');
      const result = await adapter.generate([]);

      expect(result.ruleCount).toBe(0);
      expect(result.content).toContain('AI Coding Rules');
      expect(result.content).toContain('Total rules: 0');
    });
  });

  describe('getFilePath', () => {
    it('应该返回配置中的文件路径', () => {
      const adapter = new PresetAdapter(testConfig, true);
      expect(adapter.getFilePath()).toBe('.testrules');
    });

    it('目录型预设适配器应该返回目录路径', () => {
      const adapter = new PresetAdapter(testDirectoryConfig, true);
      expect(adapter.getFilePath()).toBe('.github/prompts');
      expect((adapter as any).getDirectoryOutputPath()).toBe('.github/prompts');
    });
  });

  describe('directory preset behavior', () => {
    it('目录型预设不应该生成额外索引文件', () => {
      const adapter = new PresetAdapter(testDirectoryConfig, true);
      expect((adapter as any).shouldGenerateIndex()).toBe(false);
    });

    it('目录型预设应该默认使用 asset-root 作为相对路径基准', () => {
      const adapter = new PresetAdapter(testDirectoryConfig, true);
      expect((adapter as any).relativePathBase).toBe('asset-root');
    });

    it('目录型预设应该只保留匹配的资产类型', async () => {
      const adapter = new PresetAdapter(testDirectoryConfig, true);
      const filtered = (adapter as any).filterRulesByKind([
        createTestRule('prompt-a', 'high', 'prompt'),
        createTestRule('agent-a', 'medium', 'agent'),
        createTestRule('rule-a', 'low', 'rule'),
      ]);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('prompt-a');
    });
  });

  describe('getConfig', () => {
    it('应该返回配置的副本', () => {
      const adapter = new PresetAdapter(testConfig, true);
      const config = adapter.getConfig();
      expect(config.id).toBe('test-adapter');
      expect(config).not.toBe(testConfig); // 应该是副本
    });
  });
});
