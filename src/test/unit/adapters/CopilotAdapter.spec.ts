import { describe, expect, it } from 'vitest';

import { CopilotAdapter } from '../../../adapters/CopilotAdapter';
import type { ParsedRule } from '../../../types/rules';

describe('CopilotAdapter', () => {
  it('should generate config with rules', async () => {
    const rules: ParsedRule[] = [
      {
        id: 'a',
        title: 'A',
        content: 'C',
        sourceId: 's',
        filePath: 'f',
        metadata: { tags: ['test'], priority: 'high', version: '1.0.0' },
      },
    ];
    const adapter = new CopilotAdapter();
    const config = await adapter.generate(rules);
    expect(config.content).toContain('A');
  });
});
