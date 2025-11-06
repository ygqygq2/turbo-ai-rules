/**
 * 查看规则源详情命令
 */

import * as vscode from 'vscode';

import { SourceDetailWebviewProvider } from '../providers/SourceDetailWebviewProvider';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';

/**
 * 查看规则源详情命令处理器
 */
export async function viewSourceDetailCommand(sourceId?: string): Promise<void> {
  Logger.info('Executing viewSourceDetail command', { sourceId });

  try {
    // 如果没有提供 sourceId，让用户选择
    if (!sourceId) {
      const ConfigManager = (await import('../services/ConfigManager')).ConfigManager;
      const configManager = ConfigManager.getInstance();
      const sources = await configManager.getSources();

      if (sources.length === 0) {
        notify('No sources configured.', 'info');
        return;
      }

      const items = sources.map((source) => ({
        label: source.name || source.gitUrl,
        description: source.gitUrl,
        detail: `Branch: ${source.branch || 'main'}${
          source.subPath ? `, Path: ${source.subPath}` : ''
        }`,
        sourceId: source.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: 'Select a source to view details',
      });

      if (!selected) {
        return;
      }

      sourceId = selected.sourceId;
    }

    // 显示规则源详情页面
    const context = (global as any).extensionContext as vscode.ExtensionContext;
    const provider = SourceDetailWebviewProvider.getInstance(context);
    await provider.showSourceDetail(sourceId);
  } catch (error) {
    Logger.error('Failed to view source detail', error instanceof Error ? error : undefined);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    notify(`Failed to view source detail: ${errorMessage}`, 'error');
  }
}
