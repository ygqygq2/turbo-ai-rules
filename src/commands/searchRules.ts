/**
 * 搜索规则命令
 */

import * as vscode from 'vscode';

import { RulesManager } from '../services/RulesManager';
import type { ParsedRule } from '../types/rules';
import { Logger } from '../utils/logger';
import { notify } from '../utils/notifications';

/**
 * 搜索规则命令处理器
 */
export async function searchRulesCommand(): Promise<void> {
  Logger.info('Executing searchRules command');

  try {
    const rulesManager = RulesManager.getInstance();

    // 1. 获取所有规则
    const allRules = rulesManager.getAllRules();

    if (allRules.length === 0) {
      notify('No rules available. Please sync rules first.', 'info');
      return;
    }

    // 2. 输入搜索查询
    const query = await vscode.window.showInputBox({
      prompt: 'Enter search query (searches in ID, title, and content)',
      placeHolder: 'typescript, react, error handling...',
    });

    if (!query) {
      Logger.info('Search cancelled: no query provided');
      return;
    }

    // 3. 执行搜索
    const results = rulesManager.search(query);

    if (results.length === 0) {
      notify(`No rules found for "${query}"`, 'info');
      return;
    }

    // 4. 显示结果
    const items = results.map((rule) => ({
      label: `$(file) ${rule.title}`,
      description: rule.id,
      detail: `${
        rule.metadata.priority ? `[${rule.metadata.priority.toUpperCase()}] ` : ''
      }${rule.content.substring(0, 100)}...`,
      rule,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Found ${results.length} rule(s) for "${query}"`,
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (!selected) {
      return;
    }

    // 5. 显示规则详情
    await showRuleDetail(selected.rule);
  } catch (error) {
    Logger.error('Failed to search rules', error instanceof Error ? error : undefined);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    notify(`Failed to search rules: ${errorMessage}`, 'error');
  }
}

/**
 * 显示规则详情
 */
async function showRuleDetail(rule: ParsedRule): Promise<void> {
  // 创建详情面板
  const panel = vscode.window.createWebviewPanel('ruleDetail', rule.title, vscode.ViewColumn.One, {
    enableScripts: false,
  });

  // 生成 HTML 内容
  panel.webview.html = generateRuleDetailHtml(rule);
}

/**
 * 生成规则详情 HTML
 */
function generateRuleDetailHtml(rule: ParsedRule): string {
  const metadata = Object.entries(rule.metadata)
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `<li><strong>${key}:</strong> ${value.join(', ')}</li>`;
      }
      return `<li><strong>${key}:</strong> ${value}</li>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${rule.title}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
            line-height: 1.6;
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            border-bottom: 2px solid var(--vscode-textLink-foreground);
            padding-bottom: 10px;
        }
        .metadata {
            background-color: var(--vscode-textBlockQuote-background);
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            padding: 15px;
            margin: 20px 0;
        }
        .metadata ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }
        .metadata li {
            padding: 5px 0;
        }
        .content {
            margin-top: 20px;
            white-space: pre-wrap;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 12px;
            font-weight: bold;
            margin-right: 5px;
        }
        .badge-high {
            background-color: #f44336;
            color: white;
        }
        .badge-medium {
            background-color: #ff9800;
            color: white;
        }
        .badge-low {
            background-color: #4caf50;
            color: white;
        }
    </style>
</head>
<body>
    <h1>
        ${rule.title}
        ${
          rule.metadata.priority
            ? `<span class="badge badge-${
                rule.metadata.priority
              }">${rule.metadata.priority.toUpperCase()}</span>`
            : ''
        }
    </h1>
    
    <div class="metadata">
        <h3>Metadata</h3>
        <ul>
            <li><strong>ID:</strong> ${rule.id}</li>
            <li><strong>Source:</strong> ${rule.sourceId}</li>
            ${metadata}
        </ul>
    </div>

    <div class="content">
        <h3>Content</h3>
        ${escapeHtml(rule.content)}
    </div>
</body>
</html>`;
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
