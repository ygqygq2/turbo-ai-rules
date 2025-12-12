// @ts-nocheck
import { vi } from 'vitest';
import { createVSCodeMock } from 'jest-mock-vscode';

const vscode = createVSCodeMock(vi);

// Create or extend window
if (!vscode.window) {
  vscode.window = {
    withProgress: vi.fn().mockImplementation(async (options, task) => {
      return task({ report: vi.fn() }, { checkCancellation: vi.fn() });
    }),
    setStatusBarMessage: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    showQuickPick: vi.fn(),
    createStatusBarItem: vi.fn().mockReturnValue({
      text: '',
      tooltip: '',
      command: '',
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    }),
    showSaveDialog: vi.fn().mockResolvedValue(undefined),
    showTextDocument: vi.fn().mockResolvedValue({}),
  } as any;
} else {
  // Extend existing window
  vscode.window.withProgress =
    vscode.window.withProgress ||
    vi.fn().mockImplementation(async (options, task) => {
      return task({ report: vi.fn() }, { checkCancellation: vi.fn() });
    });
  vscode.window.setStatusBarMessage =
    vscode.window.setStatusBarMessage || vi.fn().mockReturnValue({ dispose: vi.fn() });
  vscode.window.showQuickPick = vscode.window.showQuickPick || vi.fn();
  vscode.window.createStatusBarItem =
    vscode.window.createStatusBarItem ||
    vi.fn().mockReturnValue({
      text: '',
      tooltip: '',
      command: '',
      show: vi.fn(),
      hide: vi.fn(),
      dispose: vi.fn(),
    });
  vscode.window.showSaveDialog =
    vscode.window.showSaveDialog || vi.fn().mockResolvedValue(undefined);
  vscode.window.showTextDocument = vscode.window.showTextDocument || vi.fn().mockResolvedValue({});
}

// Add l10n mock
if (!vscode.l10n) {
  vscode.l10n = {
    t: vi.fn((key: string, ...args: any[]) => {
      return args.length > 0 ? `${key} ${args.join(' ')}` : key;
    }),
  };
}

// Create or extend workspace
if (!vscode.workspace) {
  vscode.workspace = {
    getConfiguration: vi.fn(() => ({
      get: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    })),
    workspaceFolders: undefined,
    onDidChangeConfiguration: vi.fn(),
    onDidChangeWorkspaceFolders: vi.fn(),
    fs: {
      writeFile: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(Buffer.from('')),
    },
    openTextDocument: vi.fn().mockResolvedValue({}),
  } as any;
} else {
  // Extend existing workspace
  vscode.workspace.getConfiguration =
    vscode.workspace.getConfiguration ||
    vi.fn(() => ({
      get: vi.fn(),
      has: vi.fn(),
      inspect: vi.fn(),
      update: vi.fn().mockResolvedValue(undefined),
    }));

  // Use Object.defineProperty for workspaceFolders since it might be read-only
  if (!Object.getOwnPropertyDescriptor(vscode.workspace, 'workspaceFolders')) {
    try {
      Object.defineProperty(vscode.workspace, 'workspaceFolders', {
        value: undefined,
        writable: true,
        configurable: true,
      });
    } catch (e) {
      // If it fails, it's already defined and that's okay
    }
  }

  vscode.workspace.onDidChangeConfiguration = vscode.workspace.onDidChangeConfiguration || vi.fn();
  vscode.workspace.onDidChangeWorkspaceFolders =
    vscode.workspace.onDidChangeWorkspaceFolders || vi.fn();
  if (!vscode.workspace.fs) {
    try {
      Object.defineProperty(vscode.workspace, 'fs', {
        value: {
          writeFile: vi.fn().mockResolvedValue(undefined),
          delete: vi.fn().mockResolvedValue(undefined),
          readFile: vi.fn().mockResolvedValue(Buffer.from('')),
        },
        writable: true,
        configurable: true,
      });
    } catch (e) {
      // If it fails, it's already defined
    }
  }
  vscode.workspace.openTextDocument =
    vscode.workspace.openTextDocument || vi.fn().mockResolvedValue({});
}

// Add TreeItem class
if (!vscode.TreeItem) {
  class TreeItem {
    label: string;
    collapsibleState: any;
    id?: string;
    tooltip?: string;
    iconPath?: any;
    contextValue?: string;
    command?: any;
    description?: string;
    checkboxState?: any;

    constructor(label: string, collapsibleState?: any) {
      this.label = label;
      this.collapsibleState = collapsibleState;
    }
  }
  vscode.TreeItem = TreeItem as any;
}

// Add TreeItemCollapsibleState enum
if (!vscode.TreeItemCollapsibleState) {
  vscode.TreeItemCollapsibleState = {
    None: 0,
    Collapsed: 1,
    Expanded: 2,
  };
}

// Add TreeItemCheckboxState enum
if (!vscode.TreeItemCheckboxState) {
  vscode.TreeItemCheckboxState = {
    Unchecked: 0,
    Checked: 1,
  };
}

// Add ViewColumn enum
if (!vscode.ViewColumn) {
  vscode.ViewColumn = {
    Active: -1,
    Beside: -2,
    One: 1,
    Two: 2,
    Three: 3,
    Four: 4,
    Five: 5,
    Six: 6,
    Seven: 7,
    Eight: 8,
    Nine: 9,
  };
}

// Add StatusBarAlignment enum
if (!vscode.StatusBarAlignment) {
  vscode.StatusBarAlignment = {
    Left: 1,
    Right: 2,
  };
}

// Add ConfigurationTarget enum
if (!vscode.ConfigurationTarget) {
  vscode.ConfigurationTarget = {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  };
}

// Add commands API
if (!vscode.commands) {
  vscode.commands = {
    registerCommand: vi.fn().mockReturnValue({ dispose: vi.fn() }),
    executeCommand: vi.fn().mockResolvedValue(undefined),
    getCommands: vi.fn().mockResolvedValue([]),
  };
}

// Add env API
if (!vscode.env) {
  vscode.env = {
    clipboard: {
      readText: vi.fn().mockResolvedValue(''),
      writeText: vi.fn().mockResolvedValue(undefined),
    },
    openExternal: vi.fn().mockResolvedValue(true),
    appName: 'VS Code',
    appRoot: '/mock/app/root',
    uriScheme: 'vscode',
    language: 'en',
    machineId: 'mock-machine-id',
    sessionId: 'mock-session-id',
    remoteName: undefined,
    shell: '/bin/bash',
  };
}

// These are now handled in the window/workspace initialization above

export default vscode;
