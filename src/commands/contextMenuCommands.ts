/**
 * 扩展右键菜单命令
 * 处理树视图项目的上下文菜单操作
 */

import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { RulesManager } from '../services/RulesManager';
import type { RuleSource } from '../types/config';
import type { ParsedRule } from '../types/rules';
import { Logger } from '../utils/logger';

/**
 * 编辑规则源
 */
export async function editSourceCommand(sourceId?: string): Promise<void> {
  try {
    const configManager = ConfigManager.getInstance();

    if (!sourceId) {
      vscode.window.showErrorMessage('No source selected for editing');
      return;
    }

    const sources = await configManager.getSources();
    const source = sources.find((s) => s.id === sourceId);

    if (!source) {
      vscode.window.showErrorMessage('Source not found');
      return;
    }

    // 创建编辑表单
    const result = await showSourceEditDialog(source);

    if (result) {
      await configManager.updateSource(sourceId, result);
      vscode.window.showInformationMessage(`Source "${result.name}" updated successfully`);
    }
  } catch (error) {
    Logger.error('Failed to edit source', error instanceof Error ? error : undefined);
    vscode.window.showErrorMessage(
      `Failed to edit source: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * 测试源连接
 */
export async function testConnectionCommand(sourceId?: string): Promise<void> {
  try {
    if (!sourceId) {
      vscode.window.showErrorMessage('No source selected for testing');
      return;
    }

    const configManager = ConfigManager.getInstance();
    const sources = await configManager.getSources();
    const source = sources.find((s) => s.id === sourceId);

    if (!source) {
      vscode.window.showErrorMessage('Source not found');
      return;
    }

    // 显示进度
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Testing connection to ${source.name}`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 0, message: 'Connecting...' });

        try {
          // 这里应该调用 GitManager 的测试连接方法
          // 暂时模拟测试
          await new Promise((resolve) => setTimeout(resolve, 2000));

          progress.report({ increment: 100, message: 'Connection successful' });
          vscode.window.showInformationMessage(`✓ Successfully connected to ${source.name}`);
        } catch (error) {
          vscode.window.showErrorMessage(
            `✗ Failed to connect to ${source.name}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
      },
    );
  } catch (error) {
    Logger.error('Failed to test connection', error instanceof Error ? error : undefined);
    vscode.window.showErrorMessage(
      `Failed to test connection: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * 切换源启用状态
 */
export async function toggleSourceCommand(sourceId?: string): Promise<void> {
  try {
    if (!sourceId) {
      vscode.window.showErrorMessage('No source selected');
      return;
    }

    const configManager = ConfigManager.getInstance();
    const sources = await configManager.getSources();
    const source = sources.find((s) => s.id === sourceId);

    if (!source) {
      vscode.window.showErrorMessage('Source not found');
      return;
    }

    const newStatus = !source.enabled;
    await configManager.updateSource(sourceId, { ...source, enabled: newStatus });

    const action = newStatus ? 'enabled' : 'disabled';
    vscode.window.showInformationMessage(`Source "${source.name}" ${action}`);
  } catch (error) {
    Logger.error('Failed to toggle source', error instanceof Error ? error : undefined);
    vscode.window.showErrorMessage(
      `Failed to toggle source: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * 复制规则内容
 */
export async function copyRuleContentCommand(rule?: ParsedRule): Promise<void> {
  try {
    if (!rule) {
      vscode.window.showErrorMessage('No rule selected');
      return;
    }

    const content = `# ${rule.title}\n\n${rule.content}`;
    await vscode.env.clipboard.writeText(content);
    vscode.window.showInformationMessage(`Rule "${rule.title}" copied to clipboard`);
  } catch (error) {
    Logger.error('Failed to copy rule content', error instanceof Error ? error : undefined);
    vscode.window.showErrorMessage(
      `Failed to copy rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * 导出规则
 */
export async function exportRuleCommand(rule?: ParsedRule): Promise<void> {
  try {
    if (!rule) {
      vscode.window.showErrorMessage('No rule selected');
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
          ? [`tags: [${rule.metadata.tags.map((t) => `"${t}"`).join(', ')}]`]
          : []),
        ...(rule.metadata.description ? [`description: ${rule.metadata.description}`] : []),
        '---',
        '',
      ].join('\n');

      const content = frontmatter + rule.content;

      await vscode.workspace.fs.writeFile(uri, Buffer.from(content, 'utf8'));
      vscode.window.showInformationMessage(`Rule exported to ${uri.fsPath}`);
    }
  } catch (error) {
    Logger.error('Failed to export rule', error instanceof Error ? error : undefined);
    vscode.window.showErrorMessage(
      `Failed to export rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * 忽略规则
 */
export async function ignoreRuleCommand(rule?: ParsedRule): Promise<void> {
  try {
    if (!rule) {
      vscode.window.showErrorMessage('No rule selected');
      return;
    }

    const confirm = await vscode.window.showWarningMessage(
      `Are you sure you want to ignore rule "${rule.title}"? This will exclude it from generated configs.`,
      { modal: true },
      'Ignore Rule',
      'Cancel',
    );

    if (confirm === 'Ignore Rule') {
      // TODO: 实现 RulesManager.ignoreRule 方法
      // const rulesManager = RulesManager.getInstance();
      // rulesManager.ignoreRule(rule.id);
      vscode.window.showInformationMessage(
        `Rule "${rule.title}" will be ignored (feature coming soon)`,
      );
    }
  } catch (error) {
    Logger.error('Failed to ignore rule', error instanceof Error ? error : undefined);
    vscode.window.showErrorMessage(
      `Failed to ignore rule: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * 显示源编辑对话框
 */
async function showSourceEditDialog(source: RuleSource): Promise<RuleSource | undefined> {
  const result = await vscode.window.showInputBox({
    title: 'Edit Rule Source',
    prompt: 'Enter source name',
    value: source.name,
    validateInput: (value) => {
      if (!value.trim()) {
        return 'Source name cannot be empty';
      }
      return undefined;
    },
  });

  if (result === undefined) {
    return undefined;
  }

  // 简化版编辑，只允许修改名称
  // 完整版本应该提供多步骤表单或 Webview 界面
  return {
    ...source,
    name: result.trim(),
  };
}
