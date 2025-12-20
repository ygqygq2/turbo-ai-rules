/**
 * 测试数据工厂函数
 * 用于创建常用的测试对象，减少测试代码重复
 */

import type { RuleSource } from '../../types/config';
import type { ParsedRule, RuleMetadata } from '../../types/rules';

/**
 * 创建测试用的规则源
 * @param overrides 自定义属性（覆盖默认值）
 */
export function createMockSource(overrides?: Partial<RuleSource>): RuleSource {
  return {
    id: 'test-source',
    name: 'Test Source',
    gitUrl: 'https://github.com/test/repo.git',
    branch: 'main',
    enabled: true,
    subPath: '',
    authentication: { type: 'none' },
    ...overrides,
  };
}

/**
 * 创建测试用的解析后规则
 * @param overrides 自定义属性（覆盖默认值）
 */
export function createMockRule(overrides?: Partial<ParsedRule>): ParsedRule {
  const defaultMetadata: RuleMetadata = {
    version: '1.0.0',
    tags: ['test'],
    priority: 'medium',
  };

  const metadata = overrides?.metadata
    ? { ...defaultMetadata, ...overrides.metadata }
    : defaultMetadata;

  return {
    id: 'test-rule',
    title: 'Test Rule',
    content: 'Test content',
    rawContent: `---
id: test-rule
title: Test Rule
version: ${metadata.version}
tags: ${JSON.stringify(metadata.tags)}
priority: ${metadata.priority}
---

Test content`,
    sourceId: 'test-source',
    filePath: '/rules/test.md',
    ...overrides,
    // 最后设置 metadata 以确保正确的优先级
    metadata,
  };
}

/**
 * 创建多个测试规则
 * @param count 规则数量
 * @param factory 自定义工厂函数（可根据索引定制）
 */
export function createMockRules(
  count: number,
  factory?: (index: number) => Partial<ParsedRule>,
): ParsedRule[] {
  return Array.from({ length: count }, (_, i) => {
    const custom = factory ? factory(i) : {};
    return createMockRule({
      id: `test-rule-${i}`,
      title: `Test Rule ${i}`,
      filePath: `/rules/test-${i}.md`,
      ...custom,
    });
  });
}

/**
 * 创建多个测试源
 * @param count 源数量
 * @param factory 自定义工厂函数（可根据索引定制）
 */
export function createMockSources(
  count: number,
  factory?: (index: number) => Partial<RuleSource>,
): RuleSource[] {
  return Array.from({ length: count }, (_, i) => {
    const custom = factory ? factory(i) : {};
    return createMockSource({
      id: `test-source-${i}`,
      name: `Test Source ${i}`,
      gitUrl: `https://github.com/test/repo-${i}.git`,
      ...custom,
    });
  });
}

/**
 * 创建带特定标签的测试规则
 * @param tags 标签数组
 */
export function createMockRuleWithTags(tags: string[]): ParsedRule {
  return createMockRule({
    metadata: {
      version: '1.0.0',
      tags,
      priority: 'medium',
    },
  });
}

/**
 * 创建带特定优先级的测试规则
 * @param priority 优先级
 */
export function createMockRuleWithPriority(priority: 'high' | 'medium' | 'low'): ParsedRule {
  return createMockRule({
    metadata: {
      version: '1.0.0',
      tags: ['test'],
      priority,
    },
  });
}

/**
 * 创建禁用的测试源
 */
export function createDisabledMockSource(overrides?: Partial<RuleSource>): RuleSource {
  return createMockSource({
    enabled: false,
    ...overrides,
  });
}

/**
 * 创建需要认证的测试源
 * @param authType 认证类型
 */
export function createAuthenticatedMockSource(
  authType: 'token' | 'ssh',
  overrides?: Partial<RuleSource>,
): RuleSource {
  return createMockSource({
    authentication: {
      type: authType,
      ...(authType === 'ssh' ? { keyPath: '~/.ssh/id_rsa', passphrase: '' } : { useSecrets: true }),
    },
    ...overrides,
  });
}
