/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockMemento = {
  get: vi.fn(),
  update: vi.fn(),
  keys: vi.fn(() => []),
};

const mockContext = {
  workspaceState: mockMemento,
} as any;

vi.mock('vscode', () => ({
  ExtensionContext: vi.fn(),
}));
vi.mock('../../../utils/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { WorkspaceStateManager } from '../../../services/WorkspaceStateManager';

describe('WorkspaceStateManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMemento.get.mockReturnValue(null);
  });

  it('should initialize with context', () => {
    const manager = WorkspaceStateManager.getInstance(mockContext);
    expect(manager).toBeDefined();
  });

  it('should be singleton', () => {
    const manager1 = WorkspaceStateManager.getInstance(mockContext);
    const manager2 = WorkspaceStateManager.getInstance(mockContext);
    expect(manager1).toBe(manager2);
  });
});
