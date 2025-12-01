// @ts-nocheck
import { vi } from 'vitest';
import { createVSCodeMock } from 'jest-mock-vscode';

const vscode = createVSCodeMock(vi);

// Add withProgress to window mock
if (!vscode.window.withProgress) {
  vscode.window.withProgress = vi.fn().mockImplementation(async (options, task) => {
    return task({ report: vi.fn() }, { checkCancellation: vi.fn() });
  });
}

// Add setStatusBarMessage to window mock
if (!vscode.window.setStatusBarMessage) {
  vscode.window.setStatusBarMessage = vi.fn().mockReturnValue({ dispose: vi.fn() });
}

// Add l10n mock
if (!vscode.l10n) {
  vscode.l10n = {
    t: vi.fn((key: string, ...args: any[]) => {
      return args.length > 0 ? `${key} ${args.join(' ')}` : key;
    }),
  };
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

// Add showSaveDialog to window
if (!vscode.window.showSaveDialog) {
  vscode.window.showSaveDialog = vi.fn().mockResolvedValue(undefined);
}

// Add openTextDocument to workspace
if (!vscode.workspace.openTextDocument) {
  vscode.workspace.openTextDocument = vi.fn().mockResolvedValue({});
}

// Add showTextDocument to window
if (!vscode.window.showTextDocument) {
  vscode.window.showTextDocument = vi.fn().mockResolvedValue({});
}

module.exports = vscode;
