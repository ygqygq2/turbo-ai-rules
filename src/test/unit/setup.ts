import { vi } from 'vitest';

// Mock VSCode module
vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    createOutputChannel: vi.fn(() => ({
      appendLine: vi.fn(),
      append: vi.fn(),
      clear: vi.fn(),
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    })),
  },
  workspace: {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
      update: vi.fn(),
    })),
    workspaceFolders: [],
  },
  Uri: {
    file: vi.fn((path) => ({ fsPath: path, scheme: 'file', path })),
    parse: vi.fn((path) => ({ fsPath: path, scheme: 'file', path })),
  },
  ThemeIcon: vi.fn(),
  ThemeColor: vi.fn(),
}));

// Mock logger to avoid vscode-log initialization issues in unit tests
vi.mock('../../utils/logger', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  initLogger: vi.fn(),
  getLogger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));
