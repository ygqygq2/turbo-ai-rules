/**
 * 扩展右键菜单命令
 * 处理树视图项目的上下文菜单操作
 */

import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import type { ParsedRule } from '../types/rules';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';
import { ProgressManager } from '../utils/progressManager';
import { toRelativePath } from '../utils/rulePath';

/**
 * 编辑规则源
 */
export async function editSourceCommand(
  sourceId?: string | { data?: { source?: { id: string } } },
): Promise<void> {
  try {
    const configManager = ConfigManager.getInstance();

    // 从 TreeItem 提取 sourceId
    const actualSourceId =
      typeof sourceId === 'object' && sourceId?.data?.source?.id
        ? sourceId.data.source.id
        : typeof sourceId === 'string'
          ? sourceId
          : undefined;

    if (!actualSourceId) {
      notify(vscode.l10n.t('Source not found'), 'error');
      return;
    }

    const sources = configManager.getSources();
    const source = sources.find((s) => s.id === actualSourceId);

    if (!source) {
      notify(vscode.l10n.t('Source not found'), 'error');
      return;
    }

    // 使用 Webview 编辑表单
    const context = (global as unknown as { extensionContext: vscode.ExtensionContext })
      .extensionContext;
    const { SourceDetailWebviewProvider } = await import('../providers/SourceDetailWebview');
    const provider = SourceDetailWebviewProvider.getInstance(context);
    await provider.showSourceForm(actualSourceId);
  } catch (error) {
    Logger.error('Failed to edit source', error instanceof Error ? error : undefined);
    notify(
      vscode.l10n.t(
        'Failed to manage source',
        error instanceof Error ? error.message : 'Unknown error',
      ),
      'error',
    );
  }
}

/**
 * 测试源连接
 */
export async function testConnectionCommand(
  sourceId?: string | { data?: { source?: { id: string } } },
): Promise<void> {
  try {
    // 从 TreeItem 提取 sourceId
    const actualSourceId =
      typeof sourceId === 'object' && sourceId?.data?.source?.id
        ? sourceId.data.source.id
        : typeof sourceId === 'string'
          ? sourceId
          : undefined;

    if (!actualSourceId) {
      notify(vscode.l10n.t('Source not found'), 'error');
      return;
    }

    const configManager = ConfigManager.getInstance();
    const sources = configManager.getSources();
    const source = sources.find((s) => s.id === actualSourceId);

    if (!source) {
      notify('Source not found', 'error');
      return;
    }

    // 显示进度
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Testing connection to ${source.name || source.gitUrl}`,
        cancellable: false,
      },
      async (progress) => {
        const pm = new ProgressManager({ progress, verbose: false });

        pm.report(10, 'Connecting...');

        try {
          // 调用 GitManager 测试连接
          const { GitManager } = await import('../services/GitManager');
          const gitManager = GitManager.getInstance();
          await gitManager.testConnection(source.gitUrl);

          pm.report(80, 'Connection successful');

          // 确保进度达到100%
          pm.ensureComplete('Completed');

          notify(`✓ Successfully connected to ${source.name || source.gitUrl}`, 'info');

          Logger.debug('Connection test progress completed', {
            finalProgress: pm.getCurrentProgress(),
          });
        } catch (error) {
          // 即使失败也要完成进度
          await pm.ensureComplete();

          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          notify(`✗ Failed to connect to ${source.name || source.gitUrl}: ${errorMsg}`, 'error');
        }
      },
    );
  } catch (error) {
    Logger.error('Failed to test connection', error instanceof Error ? error : undefined);
    notify(
      vscode.l10n.t(
        'Failed to manage source',
        error instanceof Error ? error.message : 'Unknown error',
      ),
      'error',
    );
  }
}

/**
 * 切换源启用状态
 */
export async function toggleSourceCommand(
  sourceId?: string | { data?: { source?: { id: string } } },
): Promise<void> {
  try {
    // 从 TreeItem 提取 sourceId
    const actualSourceId =
      typeof sourceId === 'object' && sourceId?.data?.source?.id
        ? sourceId.data.source.id
        : typeof sourceId === 'string'
          ? sourceId
          : undefined;

    if (!actualSourceId) {
      notify(vscode.l10n.t('Source not found'), 'error');
      return;
    }

    const configManager = ConfigManager.getInstance();
    const sources = configManager.getSources();
    const source = sources.find((s) => s.id === actualSourceId);

    if (!source) {
      notify(vscode.l10n.t('Source not found'), 'error');
      return;
    }

    const newStatus = !source.enabled;
    await configManager.updateSource(actualSourceId, { ...source, enabled: newStatus });

    const message = newStatus
      ? vscode.l10n.t('Source enabled', source.name || source.gitUrl)
      : vscode.l10n.t('Source disabled', source.name || source.gitUrl);
    notify(message, 'info');

    // 刷新树视图
    vscode.commands.executeCommand('turbo-ai-rules.refresh');
  } catch (error) {
    Logger.error('Failed to toggle source', error instanceof Error ? error : undefined);
    notify(
      vscode.l10n.t(
        'Failed to manage source',
        error instanceof Error ? error.message : 'Unknown error',
      ),
      'error',
    );
  }
}

/**
 * 复制规则内容
 */
export async function copyRuleContentCommand(
  ruleOrItem?: ParsedRule | { data?: { rule?: ParsedRule } },
): Promise<void> {
  try {
    // 从 TreeItem 或直接使用 ParsedRule
    const rule =
      ruleOrItem && typeof ruleOrItem === 'object' && 'data' in ruleOrItem
        ? ruleOrItem.data?.rule
        : (ruleOrItem as ParsedRule);

    if (!rule) {
      notify(vscode.l10n.t('No rule selected'), 'error');
      return;
    }

    // 使用原始内容（包含 frontmatter）
    const content = rule.rawContent;
    await vscode.env.clipboard.writeText(content);
    notify(vscode.l10n.t('Rule "{0}" copied to clipboard', rule.title), 'info');
  } catch (error) {
    Logger.error('Failed to copy rule content', error instanceof Error ? error : undefined);
    notify(
      vscode.l10n.t(
        'Failed to copy rule',
        error instanceof Error ? error.message : 'Unknown error',
      ),
      'error',
    );
  }
}

/**
 * 导出规则
 */
export async function exportRuleCommand(
  ruleOrItem?: ParsedRule | { data?: { rule?: ParsedRule } },
): Promise<void> {
  try {
    // 从 TreeItem 或直接使用 ParsedRule
    const rule =
      ruleOrItem && typeof ruleOrItem === 'object' && 'data' in ruleOrItem
        ? ruleOrItem.data?.rule
        : (ruleOrItem as ParsedRule);

    if (!rule) {
      notify(vscode.l10n.t('No rule selected'), 'error');
      return;
    }

    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`${rule.id}.md`),
      filters: {
        'Markdown files': ['md'],
        'All files': ['*'],
      },
    });

    if (uri) {
      // 直接使用原始内容（包含 frontmatter）
      const content = rule.rawContent;

      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
      notify(vscode.l10n.t('Rule exported to {0}', uri.fsPath), 'info');
    }
  } catch (error) {
    Logger.error('Failed to export rule', error instanceof Error ? error : undefined);
    notify(
      vscode.l10n.t(
        'Failed to export rule',
        error instanceof Error ? error.message : 'Unknown error',
      ),
      'error',
    );
  }
}

/**
 * 忽略规则
 *
 * 此命令会将规则取消选择（设置复选框为未选中状态），使其在生成配置文件时被排除。
 * 这不会删除规则文件，只是在同步和生成配置时忽略它。
 *
 * 功能说明：
 * - 取消规则的复选框选中状态
 * - 该规则将不会包含在生成的配置文件中
 * - 不影响源文件，只影响选择状态
 * - 可以随时通过重新选中复选框来恢复
 *
 * 设计说明：
 * - 当前实现使用 include 模式：从选中列表中移除该规则
 * - 未来优化：如果大部分规则被选中，可考虑自动切换到 exclude 模式
 */
export async function ignoreRuleCommand(
  ruleOrItem?: ParsedRule | { data?: { rule?: ParsedRule } },
): Promise<void> {
  try {
    // 从 TreeItem 或直接使用 ParsedRule
    const rule =
      ruleOrItem && typeof ruleOrItem === 'object' && 'data' in ruleOrItem
        ? ruleOrItem.data?.rule
        : (ruleOrItem as ParsedRule);

    if (!rule || !rule.filePath) {
      notify(vscode.l10n.t('No rule selected'), 'error');
      return;
    }

    const confirmed = await (notify(
      vscode.l10n.t(
        'Are you sure you want to ignore rule "{0}"? This will uncheck it and exclude from generated configs.',
        rule.title,
      ),
      'warning',
      undefined,
      vscode.l10n.t('Ignore Rule'),
      true,
    ) as Promise<boolean>);

    if (confirmed) {
      // 通过 SelectionStateManager 取消选择
      const { SelectionStateManager } = await import('../services/SelectionStateManager');
      const selectionStateManager = SelectionStateManager.getInstance();

      // 获取当前选择的路径（相对路径）
      const selectedPaths = selectionStateManager.getSelection(rule.sourceId);

      // 将 rule.filePath 转为相对路径后比较（SelectionStateManager 存储相对路径）
      const relativeFilePath = toRelativePath(rule.filePath, rule.sourceId);
      // 移除该规则的路径
      const newPaths = selectedPaths.filter((p) => p !== relativeFilePath);

      // 获取工作区路径
      const workspaceFolders = vscode.workspace.workspaceFolders;
      const workspacePath = workspaceFolders?.[0]?.uri.fsPath;

      // 更新选择状态
      selectionStateManager.updateSelection(rule.sourceId, newPaths, true, workspacePath);

      notify(vscode.l10n.t('Rule "{0}" unchecked and will be excluded', rule.title), 'info');
    }
  } catch (error) {
    Logger.error('Failed to ignore rule', error instanceof Error ? error : undefined);
    notify(
      vscode.l10n.t(
        'Failed to ignore rule',
        error instanceof Error ? error.message : 'Unknown error',
      ),
      'error',
    );
  }
}
