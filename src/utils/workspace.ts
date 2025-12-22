/**
 * @description 工作空间工具函数
 */

import * as vscode from 'vscode';

import { t } from './i18n';
import { Logger } from './logger';

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
  const learnMore = t('Learn More');

  // 只显示一次警告（使用 globalState 记录）
  const warningShownKey = 'multiRootWarningShown';
  const context = (global as { extensionContext?: vscode.ExtensionContext }).extensionContext;
  if (context?.globalState.get(warningShownKey)) {
    return;
  }

  const cannotGuarantee = t('Cannot guarantee extension works properly');
  const usingFirstWorkspace = t('Using first workspace');

  const selection = await vscode.window.showWarningMessage(
    `${message}\n\n⚠️ ${cannotGuarantee}\n${usingFirstWorkspace}: "${firstFolder.name}"`,
    { modal: false },
    learnMore,
  );

  if (selection === learnMore) {
    await vscode.env.openExternal(
      vscode.Uri.parse('https://github.com/ygqygq2/turbo-ai-rules#%EF%B8%8F-known-limitations'),
    );
  }

  // 记录已显示警告
  await context?.globalState.update(warningShownKey, true);

  Logger.warn('Multi-root workspace detected, using first folder', {
    firstFolder: firstFolder.name,
    totalFolders: workspaceFolders.length,
  });
}

/**
 * @description 检查工作空间环境，如果是多工作空间则显示警告（但不阻止操作）
 * @return default {Promise<void>}
 */
export async function checkWorkspaceEnvironment(): Promise<void> {
  if (isMultiRootWorkspace()) {
    await showMultiRootWorkspaceWarning();
  }
}

/**
 * @description 检查多工作空间环境并提示用户是否继续操作
 * @return default {Promise<boolean>} true 表示可以继续，false 表示中断操作
 */
export async function checkMultiRootWorkspaceForOperation(): Promise<boolean> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length <= 1) {
    return true; // 单工作空间或无工作空间，可以继续
  }

  const firstFolder = workspaceFolders[0];
  const message = t('Multi-root workspace not supported');
  const cannotGuarantee = t('Cannot guarantee extension works properly');
  const willUseFirstWorkspace = t('Will use first workspace');
  const confirmContinue = t('Continue anyway?');
  const continueBtn = t('Continue');
  const cancelBtn = t('Cancel');

  const selection = await vscode.window.showWarningMessage(
    `${message}\n\n⚠️ ${cannotGuarantee}\n${willUseFirstWorkspace}: "${firstFolder.name}"\n\n${confirmContinue}`,
    { modal: true },
    continueBtn,
    cancelBtn,
  );

  if (selection === continueBtn) {
    Logger.info('User chose to continue in multi-root workspace', {
      firstFolder: firstFolder.name,
      totalFolders: workspaceFolders.length,
    });
    return true;
  }

  Logger.info('User cancelled operation due to multi-root workspace');
  return false;
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
