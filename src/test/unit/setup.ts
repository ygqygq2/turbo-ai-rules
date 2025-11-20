import { vi } from 'vitest';

// Mock VSCode module
vi.mock('vscode', () => ({
  window: {
    showInformationMessage: vi.fn(),
    showErrorMessage: vi.fn(),
    showWarningMessage: vi.fn(),
    setStatusBarMessage: vi.fn(),
    withProgress: vi.fn(async (_options, task) => {
      return task({ report: vi.fn() }, { checkCancellation: vi.fn() });
    }),
    activeTextEditor: undefined,
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
    getWorkspaceFolder: vi.fn(),
  },
  Uri: {
    file: vi.fn((path) => ({ fsPath: path, scheme: 'file', path })),
    parse: vi.fn((path) => ({ fsPath: path, scheme: 'file', path })),
  },
  ThemeIcon: vi.fn(),
  ThemeColor: vi.fn(),
  l10n: {
    t: vi.fn((...args) => args.join(' ')),
  },
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
