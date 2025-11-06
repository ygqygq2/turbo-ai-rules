/**
 * 统一的通知工具
 */

import * as vscode from 'vscode';

export type NotificationLevel = 'info' | 'warning' | 'error';

const DEFAULT_TIMEOUT = { info: 3000, warning: 4000, error: 5000 } as const;
const ICONS = { info: '$(info)', warning: '$(warning)', error: '$(error)' } as const;

/**
 * @description 统一通知函数（状态栏自动消失）
 * @param message {string} 通知消息
 * @param level {NotificationLevel} 通知级别
 * @param timeout {number} 自动消失时间（毫秒），不传则使用默认值
 * @param confirm {string} 确认按钮文本，传入则显示确认对话框（不会自动消失）
 * @param modal {boolean} 确认对话框是否模态
 * @return default {Promise<boolean> | void} 如果有确认按钮，返回是否确认；否则无返回值
 */
export function notify(
  message: string,
  level: NotificationLevel = 'info',
  timeout?: number,
  confirm?: string,
  modal = false,
): Promise<boolean> | void {
  // 需要确认的对话框
  if (confirm) {
    return (async () => {
      const showMessage =
        level === 'error'
          ? vscode.window.showErrorMessage
          : level === 'warning'
            ? vscode.window.showWarningMessage
            : vscode.window.showInformationMessage;

      const choice = await showMessage(message, { modal }, confirm, 'Cancel');
      return choice === confirm;
    })();
  }

  // 自动消失的状态栏通知
  const icon = ICONS[level];
  const ms = timeout ?? DEFAULT_TIMEOUT[level];
  vscode.window.setStatusBarMessage(`${icon} ${message}`, ms);
}
