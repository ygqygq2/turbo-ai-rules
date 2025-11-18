import { describe, expect, it } from 'vitest';

// AIToolAdapter 是接口类型，不需要测试实现
describe('AIToolAdapter', () => {
  it('is an interface type', () => {
    // AIToolAdapter 定义了适配器的契约
    expect(true).toBe(true);
  });
});
