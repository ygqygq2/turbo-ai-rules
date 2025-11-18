import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: [
      {
        uri: { fsPath: '/tmp/workspace' },
      },
    ],
  },
}));
vi.mock('fs-extra');
vi.mock('../../../utils/fileSystem', () => ({
  ensureDir: vi.fn(),
  pathExists: vi.fn(() => Promise.resolve(true)),
  safeReadFile: vi.fn(() => Promise.resolve('')),
  safeWriteFile: vi.fn(),
}));
vi.mock('../../../utils/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { RulesAdapter } from '../../../adapters/RulesAdapter';
import type { ParsedRule } from '../../../types/rules';

describe('RulesAdapter', () => {
  let adapter: RulesAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new RulesAdapter();
  });

  it('should convert rules to config', async () => {
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
    const config = await adapter.generate(rules);
    expect(config.content).toContain('A');
    expect(config.filePath).toBe('rules/index.md');
  });
});
