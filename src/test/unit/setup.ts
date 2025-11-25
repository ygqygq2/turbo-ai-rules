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
    showSaveDialog: vi.fn().mockResolvedValue(undefined),
    showTextDocument: vi.fn().mockResolvedValue({}),
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
    openTextDocument: vi.fn().mockResolvedValue({}),
    fs: {
      writeFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(new Uint8Array()),
    },
  },
  Uri: {
    file: vi.fn((path) => ({ fsPath: path, scheme: 'file', path })),
    parse: vi.fn((path) => ({ fsPath: path, scheme: 'file', path })),
  },
  ViewColumn: {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3,
  },
  commands: {
    registerCommand: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    executeCommand: vi.fn().mockResolvedValue(undefined),
    getCommands: vi.fn().mockResolvedValue([]),
  },
  env: {
    clipboard: {
      readText: vi.fn().mockResolvedValue(''),
      writeText: vi.fn().mockResolvedValue(undefined),
    },
    openExternal: vi.fn().mockResolvedValue(true),
    appName: 'VS Code',
    language: 'en',
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
