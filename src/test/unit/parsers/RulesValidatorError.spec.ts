import { describe, expect, it } from 'vitest';

import { RulesValidator } from '../../../parsers/RulesValidator';
import { ParsedRule } from '../../../types/rules';

describe('RulesValidator Error Handling', () => {
  it('should throw error for missing id', () => {
    const rule = { id: '', title: 't', content: 'c', sourceId: 's', filePath: 'f' } as ParsedRule;
    expect(() => RulesValidator.validateRule(rule)).toThrow();
  });

  it('should throw error for missing title', () => {
    const rule = { id: 'id', title: '', content: 'c', sourceId: 's', filePath: 'f' } as ParsedRule;
    expect(() => RulesValidator.validateRule(rule)).toThrow();
  });
});
