/**
 * 扩展端 Webview 通信抽象层
 * 提供请求-响应和事件推送机制
 */

import { Logger } from '@ygqygq2/vscode-log';
import * as vscode from 'vscode';

const logger = new Logger('ExtensionMessenger');

/**
 * 消息基础结构
 */
export interface Message<T = unknown> {
  type: string;
  requestId?: string;
  payload?: T;
  error?: string;
}

/**
 * 消息处理函数
 */
export type MessageHandler<TRequest = unknown, TResponse = unknown> = (
  payload: TRequest,
) => TResponse | Promise<TResponse>;

/**
 * 扩展端消息管理器
 * 统一处理 Webview 消息的请求-响应和事件推送
 */
export class ExtensionMessenger {
  private handlers = new Map<string, MessageHandler>();
  private webview: vscode.Webview;

  constructor(webview: vscode.Webview) {
    this.webview = webview;
    this.setupMessageHandler();
  }

  /**
   * @description 设置消息处理监听器
   * @return {void}
   */
  private setupMessageHandler(): void {
    this.webview.onDidReceiveMessage(async (message: Message) => {
      const { type, requestId, payload } = message;

      const handler = this.handlers.get(type);
      if (!handler) {
        logger.warn('No handler registered for message type', { type });
        if (requestId) {
          this.sendResponse(requestId, undefined, `Unknown message type: ${type}`);
        }
        return;
      }

      // 如果有 requestId，说明是请求-响应模式
      if (requestId) {
        try {
          const result = await handler(payload);
          this.sendResponse(requestId, result);
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Handler error';
          logger.error('Message handler error', {
            type,
            requestId,
            error: errorMessage,
          });
          this.sendResponse(requestId, undefined, errorMessage);
        }
      } else {
        // 无 requestId，说明是单向通知
        try {
          await handler(payload);
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Notification handler error';
          logger.error('Notification handler error', {
            type,
            error: errorMessage,
          });
        }
      }
    });
  }

  /**
   * @description 发送响应消息
   * @return {void}
   * @param requestId {string} 请求 ID
   * @param payload {unknown} 响应数据
   * @param error {string} 错误信息
   */
  private sendResponse(requestId: string, payload?: unknown, error?: string): void {
    this.webview.postMessage({
      type: 'response',
      requestId,
      payload,
      error,
    } as Message);
  }

  /**
   * @description 注册消息处理函数
   * @return {void}
   * @param type {string} 消息类型
   * @param handler {MessageHandler<TRequest, TResponse>} 处理函数
   */
  register<TRequest = unknown, TResponse = unknown>(
    type: string,
    handler: MessageHandler<TRequest, TResponse>,
  ): void {
    if (this.handlers.has(type)) {
      logger.warn('Handler already registered, overwriting', { type });
    }
    this.handlers.set(type, handler);
    logger.debug('Handler registered', { type });
  }

  /**
   * @description 批量注册消息处理函数
   * @return {void}
   * @param handlers {Record<string, MessageHandler>} 处理函数映射
   */
  registerAll(handlers: Record<string, MessageHandler>): void {
    Object.entries(handlers).forEach(([type, handler]) => {
      this.register(type, handler);
    });
  }

  /**
   * @description 取消注册消息处理函数
   * @return {boolean} 是否成功取消
   * @param type {string} 消息类型
   */
  unregister(type: string): boolean {
    const existed = this.handlers.delete(type);
    if (existed) {
      logger.debug('Handler unregistered', { type });
    }
    return existed;
  }

  /**
   * @description 推送事件到 Webview
   * @return {void}
   * @param type {string} 事件类型
   * @param payload {unknown} 事件数据
   */
  pushEvent(type: string, payload?: unknown): void {
    this.webview.postMessage({
      type,
      payload,
    } as Message);
  }

  /**
   * @description 清理所有处理函数
   * @return {void}
   */
  dispose(): void {
    this.handlers.clear();
    logger.debug('ExtensionMessenger disposed');
  }
}

/**
 * @description 创建扩展端消息管理器
 * @return {ExtensionMessenger}
 * @param webview {vscode.Webview}
 */
export function createExtensionMessenger(webview: vscode.Webview): ExtensionMessenger {
  return new ExtensionMessenger(webview);
}
