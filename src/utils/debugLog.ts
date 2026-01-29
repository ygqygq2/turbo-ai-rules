/**
 * 调试日志工具
 * 用于在开发和测试环境中输出调试信息，生产环境不输出
 */

/**
 * @description 检查是否启用调试日志
 * @return {boolean}
 */
function isDebugEnabled(): boolean {
  // 仅在测试环境（TEST_DEBUG=1 或 true）或开发环境（VSCode 开发主机）启用
  return (
    process.env.TEST_DEBUG === '1' ||
    process.env.TEST_DEBUG === 'true' ||
    process.env.VSCODE_DEBUG === '1'
  );
}

/**
 * @description 调试日志（仅在测试/开发环境输出）
 * @param message {string} 日志消息
 * @param data {unknown} 可选数据
 * @return {void}
 */
export function debugLog(message: string, ...data: unknown[]): void {
  if (isDebugEnabled()) {
    console.log(`[DEBUG] ${message}`, ...data);
  }
}

/**
 * @description 调试警告（仅在测试/开发环境输出）
 * @param message {string} 警告消息
 * @param data {unknown} 可选数据
 * @return {void}
 */
export function debugWarn(message: string, ...data: unknown[]): void {
  if (isDebugEnabled()) {
    console.warn(`[DEBUG:WARN] ${message}`, ...data);
  }
}

/**
 * @description 调试错误（仅在测试/开发环境输出）
 * @param message {string} 错误消息
 * @param data {unknown} 可选数据
 * @return {void}
 */
export function debugError(message: string, ...data: unknown[]): void {
  if (isDebugEnabled()) {
    console.error(`[DEBUG:ERROR] ${message}`, ...data);
  }
}
