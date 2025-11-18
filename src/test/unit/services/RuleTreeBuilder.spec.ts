import { describe, expect, it, vi } from 'vitest';

vi.mock('fs-extra');
vi.mock('../../../utils/fileSystem', () => ({
  ensureDir: vi.fn(),
  pathExists: vi.fn(() => Promise.resolve(true)),
  safeReadFile: vi.fn(),
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
vi.mock('../../../services/GitManager', () => ({
  GitManager: {
    getInstance: vi.fn(() => ({
      getSourcePath: vi.fn(() => '/test/path'),
    })),
  },
}));

import { RuleTreeBuilder } from '../../../services/RuleTreeBuilder';

describe('RuleTreeBuilder', () => {
  it('should initialize successfully', () => {
    const builder = new RuleTreeBuilder('test-source');
    expect(builder).toBeDefined();
  });
});
