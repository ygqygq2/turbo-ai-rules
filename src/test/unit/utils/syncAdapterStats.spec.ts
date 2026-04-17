import { describe, expect, it } from 'vitest';

import { calculateTargetAdapterStats } from '../../../utils/syncAdapterStats';

describe('calculateTargetAdapterStats', () => {
  it('should count claude-core suite as 6 target adapters including 1 skills adapter', () => {
    const stats = calculateTargetAdapterStats(
      [
        'claude-md',
        'claude-skills',
        'claude-commands',
        'claude-agents',
        'claude-hooks',
        'claude-hooks-settings',
      ],
      [],
      2,
    );

    expect(stats).toEqual({
      targetAdapterCount: 6,
      ruleAdapterCount: 5,
      skillAdapterCount: 1,
      totalSyncedSkills: 2,
    });
  });

  it('should deduplicate adapter ids and classify custom skills adapters', () => {
    const stats = calculateTargetAdapterStats(
      ['rule-a', 'skill-a', 'skill-a'],
      [
        {
          id: 'rule-a',
          name: 'Rule Adapter',
          enabled: true,
          outputPath: '.rule-a',
          outputType: 'file',
          isRuleType: true,
        },
        {
          id: 'skill-a',
          name: 'Skill Adapter',
          enabled: true,
          outputPath: '.skill-a',
          outputType: 'directory',
          isRuleType: false,
        },
      ],
      3,
    );

    expect(stats).toEqual({
      targetAdapterCount: 2,
      ruleAdapterCount: 1,
      skillAdapterCount: 1,
      totalSyncedSkills: 3,
    });
  });
});
