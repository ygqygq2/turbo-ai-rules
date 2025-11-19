/**
 * 扩展右键菜单命令
 * 处理树视图项目的上下文菜单操作
 */

import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import type { ParsedRule } from '../types/rules';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';

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
    const { SourceDetailWebviewProvider } = await import(
      '../providers/SourceDetailWebviewProvider'
    );
    const provider = SourceDetailWebviewProvider.getInstance(context);
    await provider.showSourceDetail(actualSourceId);
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
        let currentProgress = 0;

        /**
         * @description 报告进度增量并更新当前进度
         * @return default {void}
         * @param increment {number}
         * @param message {string}
         */
        const reportProgress = (increment: number, message?: string) => {
          currentProgress += increment;
          progress.report({
            message,
            increment,
          });
        };

        reportProgress(10, 'Connecting...');

        try {
          // 调用 GitManager 测试连接
          const { GitManager } = await import('../services/GitManager');
          const gitManager = GitManager.getInstance();
          await gitManager.testConnection(source.gitUrl);

          reportProgress(80, 'Connection successful');

          // 确保进度达到100%
          const remaining = 100 - currentProgress;
          if (remaining > 0) {
            reportProgress(remaining, 'Completed');
          }

          notify(`✓ Successfully connected to ${source.name || source.gitUrl}`, 'info');

          Logger.debug('Connection test progress completed', {
            finalProgress: currentProgress,
          });
        } catch (error) {
          // 即使失败也要完成进度
          const remaining = 100 - currentProgress;
          if (remaining > 0) {
            reportProgress(remaining);
          }

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
export async function copyRuleContentCommand(rule?: ParsedRule): Promise<void> {
  try {
    if (!rule) {
      notify('No rule selected', 'error');
      return;
    }

    const content = `# ${rule.title}\n\n${rule.content}`;
    await vscode.env.clipboard.writeText(content);
    notify(`Rule "${rule.title}" copied to clipboard`, 'info');
  } catch (error) {
    Logger.error('Failed to copy rule content', error instanceof Error ? error : undefined);
    notify(
      `Failed to copy rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'error',
    );
  }
}

/**
 * 导出规则
 */
export async function exportRuleCommand(rule?: ParsedRule): Promise<void> {
  try {
    if (!rule) {
      notify('No rule selected', 'error');
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
      const frontmatter = [
        '---',
        `id: ${rule.id}`,
        `title: ${rule.title}`,
        ...(rule.metadata.priority ? [`priority: ${rule.metadata.priority}`] : []),
        ...(rule.metadata.tags && rule.metadata.tags.length > 0
          ? [`tags: [${rule.metadata.tags.map((t: string) => `"${t}"`).join(', ')}]`]
          : []),
        ...(rule.metadata.description ? [`description: ${rule.metadata.description}`] : []),
        '---',
        '',
      ].join('\n');

      const content = frontmatter + rule.content;

      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
      notify(`Rule exported to ${uri.fsPath}`, 'info');
    }
  } catch (error) {
    Logger.error('Failed to export rule', error instanceof Error ? error : undefined);
    notify(
      `Failed to export rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'error',
    );
  }
}

/**
 * 忽略规则
 */
export async function ignoreRuleCommand(rule?: ParsedRule): Promise<void> {
  try {
    if (!rule) {
      notify('No rule selected', 'error');
      return;
    }

    const confirmed = await (notify(
      `Are you sure you want to ignore rule "${rule.title}"? This will exclude it from generated configs.`,
      'warning',
      undefined,
      'Ignore Rule',
      true,
    ) as Promise<boolean>);

    if (confirmed) {
      // TODO: 实现 RulesManager.ignoreRule 方法
      // const rulesManager = RulesManager.getInstance();
      // rulesManager.ignoreRule(rule.id);
      notify(`Rule "${rule.title}" will be ignored (feature coming soon)`, 'info');
    }
  } catch (error) {
    Logger.error('Failed to ignore rule', error instanceof Error ? error : undefined);
    notify(
      `Failed to ignore rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'error',
    );
  }
}
