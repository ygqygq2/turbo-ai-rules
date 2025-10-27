/**
 * VS Code API 类型定义和辅助函数
 */

declare function acquireVsCodeApi(): {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
};

/**
 * VS Code API 单例
 */
class VSCodeAPIWrapper {
  private readonly vscode = acquireVsCodeApi();

  /**
   * 发送消息到扩展
   */
  public postMessage(type: string, payload?: any): void {
    this.vscode.postMessage({ type, payload });
  }

  /**
   * 获取状态
   */
  public getState(): any {
    return this.vscode.getState();
  }

  /**
   * 设置状态
   */
  public setState(state: any): void {
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
