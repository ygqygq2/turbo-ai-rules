import { vi } from 'vitest';
import { createVSCodeMock } from 'jest-mock-vscode';

const vscode = createVSCodeMock(vi);

// Add withProgress to window mock
if (!vscode.window.withProgress) {
  vscode.window.withProgress = vi.fn().mockImplementation(async (options, task) => {
    return task({ report: vi.fn() }, { checkCancellation: vi.fn() });
  });
}

module.exports = vscode;
