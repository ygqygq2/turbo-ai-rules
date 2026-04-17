import { describe, expect, it } from 'vitest';

import type { ParsedRule } from '@/types/rules';
import { buildFileTreeFromRules } from '@/utils/fileTreeBuilder';

function createRule(filePath: string, kind: ParsedRule['kind'] = 'rule'): ParsedRule {
  return {
    id: filePath.split('/').pop() || 'rule',
    title: filePath,
    content: 'content',
    rawContent: 'content',
    sourceId: 'source1',
    filePath,
    metadata: {},
    kind,
  };
}

describe('buildFileTreeFromRules', () => {
  it('should preserve top-level directories that only contain nested files', () => {
    const basePath = '/repo';
    const tree = buildFileTreeFromRules(
      [
        createRule('/repo/rules/100-programming-languages/101-python.mdc', 'rule'),
        createRule('/repo/rules/100-programming-languages/102-typescript.mdc', 'rule'),
      ],
      basePath,
    );

    expect(tree.map((node) => node.name)).toContain('rules');
    const rulesDir = tree.find((node) => node.name === 'rules');
    expect(rulesDir?.children?.map((node) => node.name)).toContain('100-programming-languages');
  });

  it('should keep sibling directories when some have direct files and others only nested files', () => {
    const basePath = '/repo';
    const tree = buildFileTreeFromRules(
      [
        createRule('/repo/.project-rules/80001-ai-rules-manager.md', 'rule'),
        createRule('/repo/rules/100-programming-languages/101-python.mdc', 'rule'),
        createRule('/repo/skills/0001-python-development.mdc', 'skill'),
      ],
      basePath,
    );

    const rootNames = tree.map((node) => node.name);
    expect(rootNames).toContain('.project-rules');
    expect(rootNames).toContain('rules');
    expect(rootNames).toContain('skills');
  });
});
