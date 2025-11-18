/**
 * 规则详情 Webview 提供者
 * 显示规则的详细信息、内容预览和快速操作
 */

import * as vscode from 'vscode';

import type { ParsedRule } from '../types/rules';
import { Logger } from '../utils/logger';
import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';

/**
 * 规则详情提供者
 */
export class RuleDetailsWebviewProvider extends BaseWebviewProvider {
  private static instance: RuleDetailsWebviewProvider | undefined;
  private currentRule: ParsedRule | undefined;

  private constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(context: vscode.ExtensionContext): RuleDetailsWebviewProvider {
    if (!RuleDetailsWebviewProvider.instance) {
      RuleDetailsWebviewProvider.instance = new RuleDetailsWebviewProvider(context);
    }
    return RuleDetailsWebviewProvider.instance;
  }

  /**
   * 显示规则详情
   */
  public async showRuleDetails(rule: ParsedRule): Promise<void> {
    this.currentRule = rule;

    await this.show({
      viewType: 'turboAiRules.ruleDetails',
      title: `Rule: ${rule.title}`,
      viewColumn: vscode.ViewColumn.Beside,
    });
  }

  /**
   * 生成 HTML 内容
   */
  protected getHtmlContent(webview: vscode.Webview): string {
    if (!this.currentRule) {
      return this.getEmptyStateHtml(webview);
    }

    const nonce = this.getNonce();
    const rule = this.currentRule;

    return `${this.getHtmlHead(webview, rule.title)}
<body>
    <div class="container">
        <!-- 头部工具栏 -->
        <div class="header">
            <div class="title-section">
                <h1>${this.escapeHtml(rule.title)}</h1>
                <div class="rule-id">#${this.escapeHtml(rule.id)}</div>
            </div>
            <div class="toolbar">
                <button class="button" onclick="copyContent()" title="Copy content">
                    📋 Copy
                </button>
                <button class="button" onclick="exportRule()" title="Export rule">
                    📥 Export
                </button>
                <button class="button button-secondary" onclick="openInEditor()" title="Open in editor">
                    📝 Edit
                </button>
            </div>
        </div>

        <!-- 元数据卡片 -->
        <div class="metadata-section">
            <h2>📊 Metadata</h2>
            <div class="metadata-grid">
                ${this.renderMetadataItem('Source', rule.sourceId)}
                ${this.renderMetadataItem('File Path', rule.filePath)}
                ${
                  rule.metadata.version
                    ? this.renderMetadataItem('Version', rule.metadata.version)
                    : ''
                }
                ${
                  rule.metadata.author
                    ? this.renderMetadataItem('Author', rule.metadata.author)
                    : ''
                }
                ${
                  rule.metadata.priority
                    ? this.renderMetadataItem(
                        'Priority',
                        this.getPriorityBadge(rule.metadata.priority),
                      )
                    : ''
                }
            </div>
        </div>

        <!-- 描述区域 -->
        ${
          rule.metadata.description
            ? `
        <div class="section">
            <h2>📝 Description</h2>
            <div class="description-box">
                ${this.escapeHtml(rule.metadata.description)}
            </div>
        </div>
        `
            : ''
        }

        <!-- 标签区域 -->
        ${
          rule.metadata.tags && rule.metadata.tags.length > 0
            ? `
        <div class="section">
            <h2>🏷️ Tags</h2>
            <div class="tags-container">
                ${rule.metadata.tags
                  .map((tag) => `<span class="tag">${this.escapeHtml(tag)}</span>`)
                  .join('')}
            </div>
        </div>
        `
            : ''
        }

        <!-- 内容预览 -->
        <div class="section">
            <div class="content-header">
                <h2>📄 Content Preview</h2>
                <div class="content-actions">
                    <button class="button-icon" onclick="toggleWrap()" title="Toggle word wrap">
                        ↔️
                    </button>
                    <button class="button-icon" onclick="copyContent()" title="Copy content">
                        📋
                    </button>
                </div>
            </div>
            <div class="content-preview" id="contentPreview">
                <pre class="code-block"><code>${this.escapeHtml(rule.content)}</code></pre>
            </div>
        </div>

        <!-- 其他元数据 -->
        ${this.renderAdditionalMetadata(rule.metadata)}
    </div>

    <style>
        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: var(--spacing-lg);
            padding-bottom: var(--spacing-md);
            border-bottom: 2px solid var(--vscode-editorWidget-border);
        }
        
        .title-section h1 {
            margin: 0 0 var(--spacing-xs) 0;
            font-size: 1.8em;
        }
        
        .rule-id {
            color: var(--vscode-descriptionForeground);
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
        }
        
        .toolbar {
            display: flex;
            gap: var(--spacing-sm);
        }
        
        .button-icon {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: none;
            padding: var(--spacing-xs);
            border-radius: var(--border-radius);
            cursor: pointer;
            font-size: 1.2em;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .button-icon:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .metadata-section {
            margin-bottom: var(--spacing-lg);
        }
        
        .metadata-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: var(--spacing-md);
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: var(--border-radius);
            padding: var(--spacing-md);
        }
        
        .metadata-item {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-xs);
        }
        
        .metadata-label {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .metadata-value {
            font-weight: 500;
            word-break: break-all;
        }
        
        .priority-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .priority-high {
            background-color: var(--vscode-errorForeground);
            color: white;
        }
        
        .priority-medium {
            background-color: var(--vscode-editorWarning-foreground);
            color: white;
        }
        
        .priority-low {
            background-color: var(--vscode-charts-blue);
            color: white;
        }
        
        .section {
            margin-bottom: var(--spacing-lg);
        }
        
        .section h2 {
            margin-bottom: var(--spacing-md);
        }
        
        .description-box {
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: var(--border-radius);
            padding: var(--spacing-md);
            line-height: 1.6;
            white-space: pre-wrap;
        }
        
        .tags-container {
            display: flex;
            flex-wrap: wrap;
            gap: var(--spacing-sm);
        }
        
        .tag {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: var(--spacing-xs) var(--spacing-sm);
            border-radius: 12px;
            font-size: 0.9em;
            font-weight: 500;
        }
        
        .content-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--spacing-md);
        }
        
        .content-header h2 {
            margin: 0;
        }
        
        .content-actions {
            display: flex;
            gap: var(--spacing-xs);
        }
        
        .content-preview {
            background-color: var(--vscode-editor-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: var(--border-radius);
            overflow: auto;
            max-height: 600px;
        }
        
        .code-block {
            margin: 0;
            padding: var(--spacing-md);
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: 1.6;
            white-space: pre;
            overflow-x: auto;
        }
        
        .code-block.wrap {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
        
        .code-block code {
            font-family: inherit;
        }
        
        .additional-metadata {
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: var(--border-radius);
            padding: var(--spacing-md);
        }
        
        .additional-metadata h3 {
            margin-top: 0;
            margin-bottom: var(--spacing-md);
        }
        
        .metadata-list {
            display: flex;
            flex-direction: column;
            gap: var(--spacing-sm);
        }
        
        .metadata-list-item {
            display: flex;
            gap: var(--spacing-sm);
            padding: var(--spacing-xs) 0;
            border-bottom: 1px solid var(--vscode-editorWidget-border);
        }
        
        .metadata-list-item:last-child {
            border-bottom: none;
        }
        
        .metadata-list-key {
            min-width: 150px;
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
        }
        
        .metadata-list-value {
            flex: 1;
            word-break: break-all;
        }
        
        .empty-state {
            text-align: center;
            padding: var(--spacing-xl);
            color: var(--vscode-descriptionForeground);
        }
    </style>

    ${this.getVscodeApiScript()}
    ${this.getScriptTag(
      nonce,
      `
        function copyContent() {
            sendMessage('copyContent');
        }
        
        function exportRule() {
            sendMessage('exportRule');
        }
        
        function openInEditor() {
            sendMessage('openInEditor');
        }
        
        function toggleWrap() {
            const codeBlock = document.querySelector('.code-block');
            if (codeBlock) {
                codeBlock.classList.toggle('wrap');
            }
        }
    `,
    )}
</body>
</html>`;
  }

  /**
   * 渲染空状态 HTML
   */
  private getEmptyStateHtml(webview: vscode.Webview): string {
    return `${this.getHtmlHead(webview, 'Rule Details')}
<body>
    <div class="container">
        <div class="empty-state">
            <h2>No Rule Selected</h2>
            <p>Select a rule from the sidebar to view its details.</p>
        </div>
    </div>
    ${this.getVscodeApiScript()}
</body>
</html>`;
  }

  /**
   * 渲染元数据项
   */
  private renderMetadataItem(label: string, value: string): string {
    return `
      <div class="metadata-item">
        <div class="metadata-label">${label}</div>
        <div class="metadata-value">${this.escapeHtml(value)}</div>
      </div>
    `;
  }

  /**
   * 获取优先级徽章 HTML
   */
  private getPriorityBadge(priority: string): string {
    const icons: Record<string, string> = {
      high: '🔥',
      medium: '⚠️',
      low: 'ℹ️',
    };
    const icon = icons[priority] || '';
    return `<span class="priority-badge priority-${priority}">${icon} ${priority}</span>`;
  }

  /**
   * 渲染额外的元数据
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private renderAdditionalMetadata(metadata: any): string {
    // 排除已显示的标准字段
    const standardFields = ['id', 'title', 'version', 'tags', 'priority', 'author', 'description'];
    const additionalFields = Object.entries(metadata).filter(
      ([key]) => !standardFields.includes(key),
    );

    if (additionalFields.length === 0) {
      return '';
    }

    return `
      <div class="section">
        <h2>🔧 Additional Metadata</h2>
        <div class="additional-metadata">
          <div class="metadata-list">
            ${additionalFields
              .map(
                ([key, value]) => `
              <div class="metadata-list-item">
                <div class="metadata-list-key">${this.escapeHtml(key)}</div>
                <div class="metadata-list-value">${this.escapeHtml(String(value))}</div>
              </div>
            `,
              )
              .join('')}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * HTML 转义
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 处理来自 Webview 的消息
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    if (!this.currentRule) {
      return;
    }

    try {
      switch (message.type) {
        case 'copyContent':
          await this.handleCopyContent();
          break;

        case 'exportRule':
          await this.handleExportRule();
          break;

        case 'openInEditor':
          await this.handleOpenInEditor();
          break;

        default:
          Logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      Logger.error(
        'Failed to handle rule details message',
        error instanceof Error ? error : undefined,
      );
      vscode.window.showErrorMessage(
        `Failed to handle action: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 处理复制内容
   */
  private async handleCopyContent(): Promise<void> {
    if (!this.currentRule) return;

    await vscode.env.clipboard.writeText(this.currentRule.content);
    vscode.window.showInformationMessage('Rule content copied to clipboard');
  }

  /**
   * 处理导出规则
   */
  private async handleExportRule(): Promise<void> {
    if (!this.currentRule) return;

    const rule = this.currentRule;
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`${rule.id}.md`),
      filters: {
        'Markdown Files': ['md'],
      },
    });

    if (uri) {
      // 构建完整的 Markdown 内容（包含 frontmatter）
      const frontmatter = Object.entries(rule.metadata)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return `${key}:\n${value.map((v) => `  - ${v}`).join('\n')}`;
          }
          return `${key}: ${value}`;
        })
        .join('\n');

      const fullContent = `---\n${frontmatter}\n---\n\n${rule.content}`;

      await vscode.workspace.fs.writeFile(uri, Buffer.from(fullContent, 'utf8'));
      vscode.window.showInformationMessage(`Rule exported to ${uri.fsPath}`);
    }
  }

  /**
   * 处理在编辑器中打开
   */
  private async handleOpenInEditor(): Promise<void> {
    if (!this.currentRule) return;

    try {
      const uri = vscode.Uri.file(this.currentRule.filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document, {
        preview: false,
        viewColumn: vscode.ViewColumn.One,
      });
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
