/**
 * 移除规则源命令
 */

import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { RulesManager } from '../services/RulesManager';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';

/**
 * 移除规则源命令处理器
 * @param sourceId 规则源 ID（可选，如果提供则直接删除）
 */
export async function removeSourceCommand(sourceId?: string): Promise<void> {
  Logger.info('Executing removeSource command', { sourceId });

  try {
    const configManager = ConfigManager.getInstance();
    const rulesManager = RulesManager.getInstance();

    // 1. 获取所有源
    const sources = await configManager.getSources();

    if (sources.length === 0) {
      notify(vscode.l10n.t('No sources configured'), 'info');
      return;
    }

    let selectedSourceId: string | undefined = sourceId;

    // 2. 如果没有指定源，让用户选择
    if (!selectedSourceId) {
      const items = sources.map((source) => ({
        label: source.name || source.gitUrl,
        description: source.gitUrl,
        detail: `Branch: ${source.branch}${source.enabled ? ' (enabled)' : ' (disabled)'}`,
        sourceId: source.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: vscode.l10n.t('Select a source'),
      });

      if (!selected) {
        Logger.info('Remove source cancelled: no selection made');
        return;
      }

      selectedSourceId = selected.sourceId;
    }

    // 3. 确认删除
    const source = sources.find((s) => s.id === selectedSourceId);
    if (!source) {
      notify(vscode.l10n.t('Source not found'), 'error');
      return;
    }

    const confirmed = await notify(
      vscode.l10n.t('Are you sure you want to remove this source?'),
      'warning',
      undefined,
      vscode.l10n.t('Remove'),
      true,
    );

    if (!confirmed) {
      Logger.info('Remove source cancelled: user did not confirm');
      return;
    }

    // 4. 删除源
    await configManager.removeSource(selectedSourceId);

    // 5. 删除 token（如果存在）
    await configManager.deleteToken(selectedSourceId);

    // 6. 从规则管理器中移除规则
    rulesManager.clearSource(selectedSourceId);

    Logger.info('Source removed successfully', { sourceId: selectedSourceId });

    // 7. 显示成功消息并询问是否重新生成配置
    const shouldRegenerate = await notify(
      vscode.l10n.t('Source removed successfully'),
      'info',
      undefined,
      vscode.l10n.t('Regenerate config files?'),
    );

    if (shouldRegenerate) {
      await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
    }
  } catch (error) {
    Logger.error('Failed to remove source', error instanceof Error ? error : undefined);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    notify(vscode.l10n.t('Failed to remove source', errorMessage), 'error');
  }
}
