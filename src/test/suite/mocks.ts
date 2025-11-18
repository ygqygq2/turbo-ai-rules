/**
 * @description 集成测试的 Mock 辅助函数
 * 用于模拟用户交互，使测试可以完全自动化运行
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import * as vscode from 'vscode';

/**
 * @description Mock showInputBox 以自动返回预设值
 * @return {void}
 * @param value {string} 模拟用户输入的值
 */
export function mockShowInputBox(value: string): void {
  const originalShowInputBox = vscode.window.showInputBox;
  vscode.window.showInputBox = async () => {
    return Promise.resolve(value);
  };
  // 存储原始函数以便恢复
  (vscode.window.showInputBox as any)._original = originalShowInputBox;
}

/**
 * @description Mock showQuickPick 以自动返回预设选项
 * @return {void}
 * @param selectedItem {any} 模拟用户选择的项
 */
export function mockShowQuickPick(selectedItem: any): void {
  const originalShowQuickPick = vscode.window.showQuickPick;
  (vscode.window.showQuickPick as any) = async () => {
    return Promise.resolve(selectedItem);
  };
  (vscode.window.showQuickPick as any)._original = originalShowQuickPick;
}

/**
 * @description Mock showInformationMessage 以自动确认
 * @return {void}
 * @param response {string} 模拟用户选择的按钮文本
 */
export function mockShowInformationMessage(response?: string): void {
  const originalShowInformationMessage = vscode.window.showInformationMessage;
  vscode.window.showInformationMessage = async () => {
    return Promise.resolve(response as any);
  };
  (vscode.window.showInformationMessage as any)._original = originalShowInformationMessage;
}

/**
 * @description Mock showWarningMessage 以自动确认
 * @return {void}
 * @param response {string} 模拟用户选择的按钮文本
 */
export function mockShowWarningMessage(response?: string): void {
  const originalShowWarningMessage = vscode.window.showWarningMessage;
  vscode.window.showWarningMessage = async () => {
    return Promise.resolve(response as any);
  };
  (vscode.window.showWarningMessage as any)._original = originalShowWarningMessage;
}

/**
 * @description Mock showSaveDialog 以自动返回保存路径
 * @return {void}
 * @param uri {vscode.Uri} 模拟用户选择的保存路径
 */
export function mockShowSaveDialog(uri: vscode.Uri): void {
  const originalShowSaveDialog = vscode.window.showSaveDialog;
  vscode.window.showSaveDialog = async () => {
    return Promise.resolve(uri);
  };
  (vscode.window.showSaveDialog as any)._original = originalShowSaveDialog;
}

/**
 * @description Mock showOpenDialog 以自动返回选择的路径
 * @return {void}
 * @param uris {vscode.Uri[]} 模拟用户选择的路径
 */
export function mockShowOpenDialog(uris: vscode.Uri[]): void {
  const originalShowOpenDialog = vscode.window.showOpenDialog;
  vscode.window.showOpenDialog = async () => {
    return Promise.resolve(uris);
  };
  (vscode.window.showOpenDialog as any)._original = originalShowOpenDialog;
}

/**
 * @description 恢复所有被 mock 的 VSCode API
 * @return {void}
 */
export function restoreAllMocks(): void {
  if ((vscode.window.showInputBox as any)._original) {
    vscode.window.showInputBox = (vscode.window.showInputBox as any)._original;
  }
  if ((vscode.window.showQuickPick as any)._original) {
    vscode.window.showQuickPick = (vscode.window.showQuickPick as any)._original;
  }
  if ((vscode.window.showInformationMessage as any)._original) {
    vscode.window.showInformationMessage = (vscode.window.showInformationMessage as any)._original;
  }
  if ((vscode.window.showWarningMessage as any)._original) {
    vscode.window.showWarningMessage = (vscode.window.showWarningMessage as any)._original;
  }
  if ((vscode.window.showSaveDialog as any)._original) {
    vscode.window.showSaveDialog = (vscode.window.showSaveDialog as any)._original;
  }
  if ((vscode.window.showOpenDialog as any)._original) {
    vscode.window.showOpenDialog = (vscode.window.showOpenDialog as any)._original;
  }
}
