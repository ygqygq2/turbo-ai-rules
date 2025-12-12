/**
 * generateConfigs 命令单元测试（最小化）
 * 注意：generateConfigs 的完整功能在集成测试中验证
 */

import { describe, expect, it } from 'vitest';

import { generateConfigsCommand } from '@/commands/generateConfigs';

describe('generateConfigs 命令单元测试（最小化）', () => {
  it('generateConfigsCommand 函数应该存在', () => {
    expect(generateConfigsCommand).toBeDefined();
    expect(typeof generateConfigsCommand).toBe('function');
  });
});
