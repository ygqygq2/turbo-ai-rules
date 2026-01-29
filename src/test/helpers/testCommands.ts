/**
 * 测试命令代理层
 * 通过调用测试专用注册命令，确保在扩展激活的上下文中执行
 */

import * as vscode from 'vscode';

/**
 * 测试专用：同步规则
 * 调用注册的 syncRules 命令
 *
 * @param sourceId - 规则源ID（可选）
 * @returns Promise<void>
 */
export async function testSyncRules(sourceId?: string): Promise<void> {
  return vscode.commands.executeCommand('turbo-ai-rules.syncRules', sourceId);
}

/**
 * 测试专用：生成规则配置
 * 调用测试专用命令，为所有启用的适配器生成配置
 *
 * @returns Promise<void>
 */
export async function testGenerateRules(): Promise<void> {
  return vscode.commands.executeCommand('turbo-ai-rules.test.generateRules');
}

/**
 * 测试专用：同步指定适配器
 * 模拟规则同步页选择适配器并点击同步按钮
 * 调用测试专用命令，确保在正确的上下文中执行
 *
 * @param adapterIds - 适配器ID列表（如 ['skills', 'cursor']）
 * @returns Promise<void>
 */
export async function testSyncWithAdapters(adapterIds: string[]): Promise<void> {
  return vscode.commands.executeCommand('turbo-ai-rules.test.syncWithAdapters', adapterIds);
}

/**
 * 测试专用：同步指定规则源
 * 模拟在树视图上下文菜单点击"同步规则"
 * 调用测试专用命令
 *
 * @param sourceId - 规则源ID
 * @returns Promise<void>
 */
export async function testSyncSource(sourceId: string): Promise<void> {
  return vscode.commands.executeCommand('turbo-ai-rules.test.syncSource', sourceId);
}
