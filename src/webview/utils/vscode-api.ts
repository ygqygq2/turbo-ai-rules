/**
 * VS Code API 类型定义和辅助函数
 */

declare function acquireVsCodeApi(): {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
};

/**
 * VS Code API 单例
 */
class VSCodeAPIWrapper {
  private readonly vscode = acquireVsCodeApi();

  /**
   * 发送消息到扩展
   */
  public postMessage(type: string, payload?: unknown): void {
    this.vscode.postMessage({ type, payload });
  }

  /**
   * 获取状态
   */
  public getState(): unknown {
    return this.vscode.getState();
  }

  /**
   * 设置状态
   */
  public setState(state: unknown): void {
    this.vscode.setState(state);
  }
}

// 导出单例
export const vscodeApi = new VSCodeAPIWrapper();

/**
 * HTML 转义工具
 */
export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 格式化日期
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
