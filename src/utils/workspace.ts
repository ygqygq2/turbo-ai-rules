/**
 * @description 工作空间工具函数
 */

import * as vscode from 'vscode';

import { t } from './i18n';
import { Logger } from './logger';
import { notify } from './notifications';

/**
 * @description 检查是否为多工作空间环境
 * @return default {boolean}
 */
export function isMultiRootWorkspace(): boolean {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  return !!workspaceFolders && workspaceFolders.length > 1;
}

/**
 * @description 显示多工作空间警告（但不阻止操作）
 * @return default {Promise<void>}
 */
export async function showMultiRootWorkspaceWarning(): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length <= 1) {
    return;
  }

  const firstFolder = workspaceFolders[0];
  const message = t('Multi-root workspace not supported');
  const cannotGuarantee = t('Cannot guarantee extension works properly');
  const usingFirstWorkspace = t('Using first workspace');

  // 使用 notify 在状态栏显示警告，5秒后自动消失
  const warningMessage = `${message} - ${cannotGuarantee} ${usingFirstWorkspace}: "${firstFolder.name}"`;
  notify(warningMessage, 'warning', 5000);

  Logger.warn('Multi-root workspace detected, using first folder', {
    firstFolder: firstFolder.name,
    totalFolders: workspaceFolders.length,
  });
}

/**
 * @description 获取当前工作空间文件夹（仅在单工作空间环境下）
 * @return default {vscode.WorkspaceFolder | undefined}
 */
export function getCurrentWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    return undefined;
  }
  if (workspaceFolders.length > 1) {
    Logger.warn('Multi-root workspace detected, using first folder');
  }
  return workspaceFolders[0];
}
