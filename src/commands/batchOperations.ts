import * as vscode from 'vscode';

import { ParsedRule } from '../types/rules';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';

/**
 * 批量禁用规则
 */
export async function batchDisableRulesCommand(rules: ParsedRule[]): Promise<void> {
  if (!rules || rules.length === 0) {
    notify('No rules selected', 'warning');
    return;
  }

  const confirmed = await notify(
    `Disable ${rules.length} rule(s)?`,
    'warning',
    undefined,
    'Disable',
    true,
  );

  if (!confirmed) {
    return;
  }

  try {
    const vsConfig = vscode.workspace.getConfiguration('turbo-ai-rules');
    const ignorePatterns = new Set(vsConfig.get<string[]>('ignorePatterns', []));

    // 添加规则路径到忽略模式
    for (const rule of rules) {
      if (rule.filePath) {
        // 转换为相对路径模式
        const pattern = rule.filePath.replace(/^.*\/rules\//, '');
        ignorePatterns.add(pattern);
      }
    }

    await vsConfig.update(
      'ignorePatterns',
      Array.from(ignorePatterns),
      vscode.ConfigurationTarget.Workspace,
    );

    notify(`Successfully disabled ${rules.length} rule(s)`, 'info');
    Logger.info(`Batch disabled ${rules.length} rules`);
  } catch (error) {
    const message = `Failed to disable rules: ${
      error instanceof Error ? error.message : String(error)
    }`;
    notify(message, 'error');
    Logger.error(message);
  }
}

/**
 * 批量启用规则
 */
export async function batchEnableRulesCommand(rules: ParsedRule[]): Promise<void> {
  if (!rules || rules.length === 0) {
    notify('No rules selected', 'warning');
    return;
  }

  const confirmed = await notify(
    `Enable ${rules.length} rule(s)?`,
    'warning',
    undefined,
    'Enable',
    true,
  );

  if (!confirmed) {
    return;
  }

  try {
    const vsConfig = vscode.workspace.getConfiguration('turbo-ai-rules');
    const ignorePatterns = new Set(vsConfig.get<string[]>('ignorePatterns', []));

    // 从忽略模式中移除规则路径
    for (const rule of rules) {
      if (rule.filePath) {
        const pattern = rule.filePath.replace(/^.*\/rules\//, '');
        ignorePatterns.delete(pattern);
      }
    }

    await vsConfig.update(
      'ignorePatterns',
      Array.from(ignorePatterns),
      vscode.ConfigurationTarget.Workspace,
    );

    notify(`Successfully enabled ${rules.length} rule(s)`, 'info');
    Logger.info(`Batch enabled ${rules.length} rules`);
  } catch (error) {
    const message = `Failed to enable rules: ${
      error instanceof Error ? error.message : String(error)
    }`;
    notify(message, 'error');
    Logger.error(message);
  }
}

/**
 * 批量导出规则
 */
export async function batchExportRulesCommand(rules: ParsedRule[]): Promise<void> {
  if (!rules || rules.length === 0) {
    notify('No rules selected', 'warning');
    return;
  }

  const uri = await vscode.window.showSaveDialog({
    defaultUri: vscode.Uri.file(`rules-export-${new Date().toISOString().split('T')[0]}.json`),
    filters: { JSON: ['json'] },
  });

  if (!uri) {
    return;
  }

  try {
    const exportData = rules.map((rule) => ({
      name: rule.metadata?.title || 'Untitled',
      filePath: rule.filePath,
      priority: rule.metadata?.priority,
      tags: rule.metadata?.tags,
      description: rule.metadata?.description,
      content: rule.content,
      sourceId: rule.sourceId,
    }));

    await vscode.workspace.fs.writeFile(
      uri,
      Buffer.from(JSON.stringify(exportData, null, 2), 'utf-8'),
    );

    notify(`Exported ${rules.length} rule(s) to ${uri.fsPath}`, 'info');
    Logger.info(`Batch exported ${rules.length} rules to ${uri.fsPath}`);
  } catch (error) {
    const message = `Failed to export rules: ${
      error instanceof Error ? error.message : String(error)
    }`;
    notify(message, 'error');
    Logger.error(message);
  }
}

/**
 * 批量删除规则（从源中移除）
 */
export async function batchDeleteRulesCommand(rules: ParsedRule[]): Promise<void> {
  if (!rules || rules.length === 0) {
    notify('No rules selected', 'warning');
    return;
  }

  const confirmed = await notify(
    `Delete ${rules.length} rule(s) from disk? This action cannot be undone.`,
    'warning',
    undefined,
    'Delete',
    true,
  );

  if (!confirmed) {
    return;
  }

  try {
    let deletedCount = 0;

    for (const rule of rules) {
      if (rule.filePath) {
        try {
          const uri = vscode.Uri.file(rule.filePath);
          await vscode.workspace.fs.delete(uri);
          deletedCount++;
        } catch (error) {
          Logger.warn(`Failed to delete rule ${rule.filePath}: ${error}`);
        }
      }
    }

    if (deletedCount > 0) {
      notify(`Successfully deleted ${deletedCount} rule(s)`, 'info');
      Logger.info(`Batch deleted ${deletedCount} rules`);
    } else {
      notify('No rules were deleted', 'warning');
    }
  } catch (error) {
    const message = `Failed to delete rules: ${
      error instanceof Error ? error.message : String(error)
    }`;
    notify(message, 'error');
    Logger.error(message);
  }
}

/**
 * 全选规则
 */
export function selectAllRulesCommand(): void {
  vscode.commands.executeCommand('turbo-ai-rules.selectAllRulesInTree');
}

/**
 * 取消全选
 */
export function deselectAllRulesCommand(): void {
  vscode.commands.executeCommand('turbo-ai-rules.deselectAllRulesInTree');
}
