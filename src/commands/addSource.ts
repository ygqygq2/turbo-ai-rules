/**
 * 添加规则源命令
 */

import { SourceDetailWebviewProvider } from '../providers/SourceDetailWebviewProvider';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';

/**
 * 添加规则源命令处理器
 */
export async function addSourceCommand(): Promise<void> {
  Logger.info('Executing addSource command (open SourceDetailWebviewProvider in add mode)');
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const context = (global as any).extensionContext as import('vscode').ExtensionContext;
    const provider = SourceDetailWebviewProvider.getInstance(context);
    await provider.showSourceDetail('new');
  } catch (error: unknown) {
    Logger.error('Failed to add rule source', error instanceof Error ? error : undefined);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    notify(`Failed to open add source page: ${errorMessage}`, 'error');
  }
}
