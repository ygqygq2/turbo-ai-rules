/**
 * 路径辅助工具
 */

import * as path from 'path';
import * as vscode from 'vscode';

/**
 * 将绝对路径转换为相对于工作区的路径
 */
export function toRelativePath(absolutePath: string): string {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return absolutePath;
  }
  return path.relative(workspaceRoot, absolutePath);
}

/**
 * 将路径分隔符统一为 POSIX 格式 (/)，跨平台兼容
 * @param pathStr 路径字符串
 * @returns 使用 / 作为分隔符的路径
 */
export function normalizeSeparators(pathStr: string): string {
  return pathStr.split(path.sep).join('/');
}

/**
 * 分割路径为各部分（跨平台兼容）
 * @param pathStr 路径字符串
 * @returns 路径各部分数组
 */
export function splitPath(pathStr: string): string[] {
  return pathStr.split(/[/\\]/);
}
