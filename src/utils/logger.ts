/**
 * 日志工具封装
 * 基于 @ygqygq2/vscode-log
 */

import { Logger as VscodeLogger } from '@ygqygq2/vscode-log';
import * as vscode from 'vscode';

import { EXTENSION_NAME } from './constants';

/**
 * 日志级别
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * 日志上下文
 */
export interface LogContext {
  [key: string]: unknown;
}

/**
 * 是否已初始化
 */
let isInitialized = false;

/**
 * 初始化日志器
 */
export function initLogger(): void {
  if (!isInitialized) {
    VscodeLogger.configure(vscode.window, EXTENSION_NAME);
    isInitialized = true;
  }
}

/**
 * 获取日志器实例
 */
export function getLogger(): VscodeLogger {
  if (!isInitialized) {
    initLogger();
  }
  return VscodeLogger.getInstance();
}

/**
 * Logger 类封装
 */
export class Logger {
  /**
   * 初始化日志器
   */
  static init(): void {
    initLogger();
  }

  /**
   * 格式化日志消息
   */
  private static formatMessage(message: string, context?: LogContext): string {
    if (!context || Object.keys(context).length === 0) {
      return message;
    }
    const contextStr = Object.entries(context)
      .map(([key, value]) => {
        // 过滤敏感信息
        if (key.toLowerCase().includes('token') || key.toLowerCase().includes('password')) {
          return `${key}=***`;
        }
        return `${key}=${JSON.stringify(value)}`;
      })
      .join(', ');
    return `${message} | ${contextStr}`;
  }

  /**
   * Debug 级别日志
   */
  static debug(message: string, context?: LogContext): void {
    const formattedMessage = Logger.formatMessage(message, context);
    getLogger().debug(formattedMessage);
  }

  /**
   * Info 级别日志
   */
  static info(message: string, context?: LogContext): void {
    const formattedMessage = Logger.formatMessage(message, context);
    getLogger().info(formattedMessage);
  }

  /**
   * Warn 级别日志
   */
  static warn(message: string, context?: LogContext): void {
    const formattedMessage = Logger.formatMessage(message, context);
    getLogger().warn(formattedMessage);
  }

  /**
   * Error 级别日志
   */
  static error(message: string, error?: Error, context?: LogContext): void {
    const contextWithError = {
      ...context,
      error: error?.message,
      stack: error?.stack,
    };
    const formattedMessage = Logger.formatMessage(message, contextWithError);
    getLogger().error(formattedMessage);
  }
}
