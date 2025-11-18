import { describe, expect, it } from 'vitest';

import { CustomAdapter } from '../../../adapters/CustomAdapter';

describe('CustomAdapter', () => {
  it('should throw if not implemented', async () => {
    const config = {
      id: 'custom-test',
      name: 'test',
      enabled: true,
      templatePath: '/tmp/test.hbs',
      outputPath: 'out.txt',
      outputType: 'file' as const,
      autoUpdate: false,
    };
    const adapter = new CustomAdapter(config);
    await expect(adapter.generate([])).rejects.toThrow();
  });
});
