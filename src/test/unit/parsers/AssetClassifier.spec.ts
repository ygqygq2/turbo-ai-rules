import { describe, expect, it } from 'vitest';

import { AssetClassifier } from '../../../parsers/AssetClassifier';

describe('AssetClassifier', () => {
  it('should classify assets using type-first layout rules', () => {
    expect(
      AssetClassifier.classifyFile(
        '/repo/skills/0001-demo-skill/SKILL.md',
        {},
        { sourceLayout: 'type-first' },
      ),
    ).toBe('skill');

    expect(
      AssetClassifier.classifyFile(
        '/repo/hooks/0001-settings-fragments/pre-commit.json',
        {},
        { sourceLayout: 'type-first' },
      ),
    ).toBe('hook');

    expect(
      AssetClassifier.classifyFile(
        '/repo/rules/100-programming-languages/101-python.mdc',
        {},
        { sourceLayout: 'type-first' },
      ),
    ).toBe('rule');

    expect(
      AssetClassifier.classifyFile(
        '/repo/commands/0002-rules/new-rule.md',
        {},
        { sourceLayout: 'type-first' },
      ),
    ).toBe('command');
  });

  it('should classify assets using legacy mixed layout rules', () => {
    expect(
      AssetClassifier.classifyFile(
        '/repo/1300-skills/1301-python-development/SKILL.md',
        {},
        { sourceLayout: 'legacy-mixed' },
      ),
    ).toBe('skill');

    expect(
      AssetClassifier.classifyFile(
        '/repo/1700-hooks/1701-settings-fragments/pre-commit.json',
        {},
        { sourceLayout: 'legacy-mixed' },
      ),
    ).toBe('hook');

    expect(
      AssetClassifier.classifyFile(
        '/repo/1800-mcp/1801-servers/mcp.json',
        {},
        { sourceLayout: 'legacy-mixed' },
      ),
    ).toBe('mcp');
  });
});
