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
