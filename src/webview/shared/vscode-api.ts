// VSCode Webview API 封装（单例）
class VSCodeAPIWrapper {
  private readonly vscode = window.acquireVsCodeApi();

  /**
   * 发送消息到扩展主进程
   */
  public postMessage(type: string, payload?: any): void {
    this.vscode.postMessage({ type, payload });
  }

  /**
   * 获取 Webview 状态
   */
  public getState(): any {
    return this.vscode.getState();
  }

  /**
   * 设置 Webview 状态
   */
  public setState(state: any): void {
    this.vscode.setState(state);
  }
}

export const vscodeApi = new VSCodeAPIWrapper();
