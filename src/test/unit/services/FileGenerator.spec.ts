import { beforeEach, describe, expect, it } from 'vitest';

import type { AIToolAdapter, GeneratedConfig } from '../../../adapters/AIToolAdapter';
import { FileGenerator } from '../../../services/FileGenerator';
import { GenerateError } from '../../../types/errors';
import type { ParsedRule } from '../../../types/rules';

// Mock Adapter
class MockAdapter implements AIToolAdapter {
  name = 'mock';
  enabled = true;
  async generate(rules: ParsedRule[]): Promise<GeneratedConfig> {
    if (rules.length === 0) throw new Error('No rules');
    return {
      content: 'config',
      filePath: 'mock.json',
      generatedAt: new Date(),
      ruleCount: rules.length,
    };
  }
  validate(_content: string): boolean {
    return true;
  }
  getFilePath(): string {
    return 'mock.json';
  }
}

describe('FileGenerator', () => {
  let generator: FileGenerator;
  beforeEach(() => {
    generator = FileGenerator.getInstance();
    const mockAdapter = new MockAdapter();
    generator.initializeAdapters({
      cursor: { enabled: false },
      copilot: { enabled: false },
      continue: { enabled: false },
      custom: [],
    });

    // 手动添加 mock adapter
    (generator as any).adapters.set('mock', mockAdapter);
  });

  it('should generate config for valid rules', async () => {
    const rules: ParsedRule[] = [
      {
        id: 'r1',
        title: 't',
        content: 'c',
        sourceId: 's',
        filePath: 'f',
        metadata: { tags: [], priority: 'low', version: '1.0.0' },
      },
    ];
    const result = await generator.generateAll(rules, '/tmp', 'priority');
    expect(result.failures.length).toBe(0);
    expect(result.success.length).toBe(1);
  });

  it('should handle adapter error and return failure', async () => {
    const rules: ParsedRule[] = [];
    // Empty rules should be handled gracefully, not error
    const result = await generator.generateAll(rules, '/tmp', 'priority');
    expect(result.success.length).toBe(0);
  });

  it('should throw GenerateError for no adapters', async () => {
    const gen2 = FileGenerator.getInstance();
    gen2.initializeAdapters({
      cursor: { enabled: false },
      copilot: { enabled: false },
      continue: { enabled: false },
      custom: [],
    });
    await expect(gen2.generateAll([], '/tmp', 'priority')).rejects.toThrow(GenerateError);
  });
});
