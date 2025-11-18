import { describe, expect, it, vi } from 'vitest';

vi.mock('fs-extra');
vi.mock('../../../utils/fileSystem', () => ({
  ensureDir: vi.fn(),
  pathExists: vi.fn(() => Promise.resolve(false)),
  safeReadFile: vi.fn(() => Promise.resolve('{}')),
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

import { WorkspaceDataManager } from '../../../services/WorkspaceDataManager';

describe('WorkspaceDataManager', () => {
  it('should initialize successfully', () => {
    const manager = new WorkspaceDataManager();
    expect(manager).toBeDefined();
  });
});
