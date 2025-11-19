/**
 * 管理规则源命令
 */

import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import type { RuleSource } from '../types/config';
import { Logger } from '../utils/logger';

/**
 * 管理规则源命令处理器
 */
export async function manageSourceCommand(): Promise<void> {
  Logger.info('Executing manageSource command');

  try {
    const configManager = ConfigManager.getInstance();

    // 1. 获取所有源
    const sources = await configManager.getSources();

    if (sources.length === 0) {
      const action = await vscode.window.showInformationMessage(
        vscode.l10n.t('No sources configured'),
        vscode.l10n.t('Add Source'),
      );

      if (action === 'Add Source') {
        await vscode.commands.executeCommand('turbo-ai-rules.addSource');
      }
      return;
    }

    // 2. 显示源列表
    const items = sources.map((source) => ({
      label: `$(${source.enabled ? 'check' : 'circle-outline'}) ${source.name || source.gitUrl}`,
      description: source.gitUrl,
      detail: `Branch: ${source.branch}${source.subPath ? `, Path: ${source.subPath}` : ''}`,
      source,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: vscode.l10n.t('Select action'),
    });

    if (!selected) {
      return;
    }

    // 3. 显示管理选项
    await showSourceActions(selected.source);
  } catch (error) {
    Logger.error('Failed to manage source', error instanceof Error ? error : undefined);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    vscode.window.showErrorMessage(vscode.l10n.t('Failed to manage source', errorMessage));
  }
}

/**
 * 显示源管理操作
 */
async function showSourceActions(source: RuleSource): Promise<void> {
  const configManager = ConfigManager.getInstance();

  const actions = [
    {
      label: '$(sync) Sync This Source',
      description: 'Sync rules from this source only',
      action: 'sync',
    },
    {
      label: source.enabled ? '$(circle-slash) Disable' : '$(check) Enable',
      description: source.enabled
        ? 'Disable this source (will not be synced)'
        : 'Enable this source',
      action: 'toggle',
    },
    {
      label: '$(edit) Edit',
      description: 'Edit source configuration',
      action: 'edit',
    },
    {
      label: '$(trash) Remove',
      description: 'Remove this source',
      action: 'remove',
    },
  ];

  const selected = await vscode.window.showQuickPick(actions, {
    placeHolder: `Manage: ${source.name || source.gitUrl}`,
  });

  if (!selected) {
    return;
  }

  switch (selected.action) {
    case 'sync':
      await vscode.commands.executeCommand('turbo-ai-rules.syncRules', source.id);
      break;

    case 'toggle':
      await configManager.updateSource(source.id, {
        enabled: !source.enabled,
      });
      vscode.window.showInformationMessage(
        source.enabled
          ? vscode.l10n.t('Source disabled', source.name || source.gitUrl)
          : vscode.l10n.t('Source enabled', source.name || source.gitUrl),
      );
      break;

    case 'edit':
      await editSource(source);
      break;

    case 'remove':
      await vscode.commands.executeCommand('turbo-ai-rules.removeSource', source.id);
      break;
  }
}

/**
 * 编辑源配置
 */
async function editSource(source: RuleSource): Promise<void> {
  const configManager = ConfigManager.getInstance();

  const editOptions = [
    {
      label: '$(repo) Branch',
      description: `Current: ${source.branch}`,
      property: 'branch',
    },
    {
      label: '$(folder) Sub Path',
      description: source.subPath ? `Current: ${source.subPath}` : 'Not set',
      property: 'subPath',
    },
    {
      label: '$(tag) Name',
      description: source.name ? `Current: ${source.name}` : 'Not set',
      property: 'name',
    },
  ];

  const selected = await vscode.window.showQuickPick(editOptions, {
    placeHolder: vscode.l10n.t('Select field to edit'),
  });

  if (!selected) {
    return;
  }

  let newValue: string | undefined;

  switch (selected.property) {
    case 'branch':
      newValue = await vscode.window.showInputBox({
        prompt: vscode.l10n.t('Enter new branch'),
        value: source.branch,
      });
      break;

    case 'subPath':
      newValue = await vscode.window.showInputBox({
        prompt: vscode.l10n.t('Enter new subpath'),
        value: source.subPath || '',
      });
      break;

    case 'name':
      newValue = await vscode.window.showInputBox({
        prompt: vscode.l10n.t('Enter new display name'),
        value: source.name || '',
      });
      break;
  }

  if (newValue !== undefined) {
    await configManager.updateSource(source.id, {
      [selected.property]: newValue || undefined,
    });

    vscode.window.showInformationMessage(
      vscode.l10n.t('Source updated', source.name || source.gitUrl),
    );
  }
}
