/**
 * generateRules 命令单元测试（最小化）
 * 注意：generateRules 的完整功能在集成测试中验证
 */

import { describe, expect, it } from 'vitest';

import { generateRulesCommand } from '@/commands/generateRules';

describe('generateRules 命令单元测试（最小化）', () => {
  it('generateRulesCommand 函数应该存在', () => {
    expect(generateRulesCommand).toBeDefined();
    expect(typeof generateRulesCommand).toBe('function');
  });
});
