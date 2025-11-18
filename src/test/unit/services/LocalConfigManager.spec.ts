import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('fs-extra');
vi.mock('../../../utils/fileSystem', () => ({
  ensureDir: vi.fn(),
  pathExists: vi.fn(() => Promise.resolve(false)),
  safeReadFile: vi.fn(() => Promise.resolve('{"version":"1.0.0","sources":[]}')),
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

import { LocalConfigManager } from '../../../services/LocalConfigManager';

describe('LocalConfigManager', () => {
  let manager: LocalConfigManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = LocalConfigManager.getInstance();
  });

  it('should initialize successfully', () => {
    expect(manager).toBeDefined();
  });

  it('should be singleton', () => {
    const manager2 = LocalConfigManager.getInstance();
    expect(manager).toBe(manager2);
  });
});
