import { beforeEach, describe, expect, it } from 'vitest';

import { RulesManager } from '../../../services/RulesManager';
import type { ParsedRule } from '../../../types/rules';

describe('RulesManager', () => {
  let manager: RulesManager;
  beforeEach(() => {
    manager = RulesManager.getInstance();
    manager.clearAll();
  });

  it('should add and retrieve rules by source', () => {
    const rule: ParsedRule = {
      id: 'r1',
      title: 't',
      content: 'c',
      rawContent: '---\nid: r1\ntitle: t\n---\n\nc',
      sourceId: 's',
      filePath: 'f',
      metadata: { tags: [], priority: 'low', version: '1.0.0' },
    };
    manager.addRules('s', [rule]);
    const rules = manager.getRulesBySource('s');
    expect(rules.length).toBe(1);
    expect(rules[0].id).toBe('r1');
  });

  it('should search rules by query', () => {
    const rule: ParsedRule = {
      id: 'r2',
      title: 'hello',
      content: 'world',
      rawContent: '---\nid: r2\ntitle: hello\n---\n\nworld',
      sourceId: 's',
      filePath: 'f',
      metadata: { tags: [], priority: 'low', version: '1.0.0' },
    };
    manager.addRules('s', [rule]);
    const found = manager.search('hello');
    expect(found.length).toBeGreaterThan(0);
  });

  it('should detect conflicts', () => {
    const rule1: ParsedRule = {
      id: 'r3',
      title: 'A',
      content: 'c',
      rawContent: '---\nid: r3\ntitle: A\n---\n\nc',
      sourceId: 's',
      filePath: 'f',
      metadata: { tags: [], priority: 'low', version: '1.0.0' },
    };
    const rule2: ParsedRule = {
      id: 'r3',
      title: 'B',
      content: 'd',
      rawContent: '---\nid: r3\ntitle: B\npriority: high\n---\n\nd',
      sourceId: 's',
      filePath: 'f2',
      metadata: { tags: [], priority: 'high', version: '1.0.0' },
    };
    manager.addRules('s', [rule1, rule2]);
    const conflicts = manager.detectConflicts();
    expect(conflicts.length).toBeGreaterThan(0);
  });

  it('should clear rules by source', () => {
    const rule: ParsedRule = {
      id: 'r4',
      title: 't',
      content: 'c',
      rawContent: '---\nid: r4\ntitle: t\n---\n\nc',
      sourceId: 's',
      filePath: 'f',
      metadata: { tags: [], priority: 'low', version: '1.0.0' },
    };
    manager.addRules('s', [rule]);
    manager.clearSource('s');
    expect(manager.getRulesBySource('s').length).toBe(0);
  });
});
