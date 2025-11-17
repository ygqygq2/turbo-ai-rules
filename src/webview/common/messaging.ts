/**
 * Webview 端通信抽象层
 * 提供类型安全的 RPC 请求-响应机制
 */

/**
 * 消息基础结构
 */
export interface Message<T = any> {
  type: string;
  requestId?: string;
  payload?: T;
  error?: string;
}

/**
 * VSCode API 类型
 */
interface VSCodeAPI {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

/**
 * Webview RPC 客户端
 * 封装 postMessage 的请求-响应模式
 */
export class WebviewRPC {
  private vscode: VSCodeAPI;
  private requestId = 0;
  private pending = new Map<
    string,
    {
      resolve: (value: any) => void;
      reject: (error: Error) => void;
      timer: NodeJS.Timeout;
    }
  >();
  private eventHandlers = new Map<string, ((data: any) => void)[]>();

  constructor(vscode: VSCodeAPI) {
    this.vscode = vscode;
    this.setupMessageListener();
  }

  /**
   * @description 设置消息监听器
   * @return {void}
   */
  private setupMessageListener(): void {
    window.addEventListener('message', (event: MessageEvent) => {
      const message = event.data as Message;

      // 处理请求-响应
      if (message.requestId && this.pending.has(message.requestId)) {
        const { resolve, reject, timer } = this.pending.get(message.requestId)!;
        clearTimeout(timer);
        this.pending.delete(message.requestId);

        if (message.error) {
          reject(new Error(message.error));
        } else {
          resolve(message.payload);
        }
        return;
      }

      // 处理事件推送（无 requestId）
      if (!message.requestId && message.type) {
        const handlers = this.eventHandlers.get(message.type);
        if (handlers) {
          handlers.forEach((handler) => handler(message.payload));
        }
      }
    });
  }

  /**
   * @description 发送请求并等待响应
   * @return {Promise<T>}
   * @param type {string} 消息类型
   * @param payload {any} 请求数据
   * @param timeout {number} 超时时间（毫秒），默认 30 秒
   */
  request<T = any>(type: string, payload?: any, timeout = 30000): Promise<T> {
    const requestId = String(++this.requestId);

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Request timeout: ${type} (${timeout}ms)`));
      }, timeout);

      this.pending.set(requestId, { resolve, reject, timer });

      this.vscode.postMessage({
        type,
        requestId,
        payload,
      });
    });
  }

  /**
   * @description 发送单向消息（不等待响应）
   * @return {void}
   * @param type {string} 消息类型
   * @param payload {any} 消息数据
   */
  notify(type: string, payload?: any): void {
    this.vscode.postMessage({
      type,
      payload,
    });
  }

  /**
   * @description 监听来自扩展的事件推送
   * @return {() => void} 取消监听的函数
   * @param type {string} 事件类型
   * @param handler {(data: any) => void} 事件处理函数
   */
  on(type: string, handler: (data: any) => void): () => void {
    const handlers = this.eventHandlers.get(type) || [];
    handlers.push(handler);
    this.eventHandlers.set(type, handlers);

    // 返回取消监听函数
    return () => {
      const handlers = this.eventHandlers.get(type) || [];
      const index = handlers.indexOf(handler);
      if (index !== -1) {
        handlers.splice(index, 1);
      }
    };
  }

  /**
   * @description 获取 VSCode 状态
   * @return {T | undefined}
   */
  getState<T = any>(): T | undefined {
    return this.vscode.getState();
  }

  /**
   * @description 设置 VSCode 状态（持久化 UI 状态）
   * @return {void}
   * @param state {T} 状态对象
   */
  setState<T = any>(state: T): void {
    this.vscode.setState(state);
  }

  /**
   * @description 清理所有待处理的请求
   * @return {void}
   */
  dispose(): void {
    this.pending.forEach(({ reject, timer }) => {
      clearTimeout(timer);
      reject(new Error('RPC disposed'));
    });
    this.pending.clear();
    this.eventHandlers.clear();
  }
}

// 单例实例
let rpcInstance: WebviewRPC | null = null;

/**
 * @description 创建 Webview RPC 实例（单例模式）
 * @return {WebviewRPC}
 */
export function createWebviewRPC(): WebviewRPC {
  if (!rpcInstance) {
    // @ts-ignore - acquireVsCodeApi is injected by VSCode
    const vscode = acquireVsCodeApi();
    rpcInstance = new WebviewRPC(vscode);
  }
  return rpcInstance;
}
