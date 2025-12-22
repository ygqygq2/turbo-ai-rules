/**
 * 查看规则源详情命令
 */

import * as vscode from 'vscode';

import { SourceDetailWebviewProvider } from '../providers/SourceDetailWebview';
import { t } from '../utils/i18n';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';

/**
 * 查看规则源详情命令处理器
 */
export async function viewSourceDetailCommand(
  sourceId?: string | { data?: { source?: { id: string } } },
): Promise<void> {
  try {
    // 从 TreeItem 提取 sourceId
    let actualSourceId =
      typeof sourceId === 'object' && sourceId?.data?.source?.id
        ? sourceId.data.source.id
        : typeof sourceId === 'string'
          ? sourceId
          : undefined;

    Logger.info('Executing viewSourceDetail command', { sourceId: actualSourceId });

    // 如果没有提供 sourceId，让用户选择
    if (!actualSourceId) {
      const ConfigManager = (await import('../services/ConfigManager')).ConfigManager;
      const configManager = ConfigManager.getInstance();
      const sources = configManager.getSources();

      if (sources.length === 0) {
        notify(t('No sources configured'), 'info');
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

      actualSourceId = selected.sourceId;
    }

    // 使用 Webview 显示详情
    const context = (global as unknown as { extensionContext: vscode.ExtensionContext })
      .extensionContext;
    const provider = SourceDetailWebviewProvider.getInstance(context);
    await provider.showDetail(actualSourceId);
  } catch (error) {
    Logger.error('Failed to view source detail', error instanceof Error ? error : undefined);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    notify(t('Failed to manage source', errorMessage), 'error');
  }
}
