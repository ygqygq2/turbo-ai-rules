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
                <button class="button" onclick="openMarkdownPreview()" title="Open in VSCode Markdown preview">
                    👁️ Preview
                </button>
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
                ${rule.metadata.priority ? this.renderPriorityItem(rule.metadata.priority) : ''}
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
                  .map(
                    (tag) =>
                      `<span class="tag" onclick="searchByTag('${this.escapeHtml(
                        tag,
                      )}')" title="Click to search">${this.escapeHtml(tag)}</span>`,
                  )
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
                    <button class="button-icon" id="toggleViewBtn" onclick="toggleContentView()" title="Toggle between raw and rendered view">
                        🔄 Render
                    </button>
                    <button class="button-icon" onclick="copyContent()" title="Copy content">
                        📋
                    </button>
                </div>
            </div>
            <div class="content-preview" id="contentPreview">
                <pre class="code-block" id="rawContent"><code>${this.escapeHtml(
                  rule.content,
                )}</code></pre>
                <div class="rendered-content" id="renderedContent" style="display: none;"></div>
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
            padding: 6px 12px;
            border-radius: var(--border-radius);
            cursor: pointer;
            font-size: 0.9em;
            min-width: 80px;
            height: auto;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
            transition: background 0.2s;
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
            display: flex;
            align-items: center;
        }
        
        .priority-text {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 0.95em;
            font-weight: 600;
        }
        
        .priority-high {
            color: var(--vscode-errorForeground);
        }
        
        .priority-medium {
            color: var(--vscode-editorWarning-foreground);
        }
        
        .priority-low {
            color: var(--vscode-charts-blue);
        }
        
        .section {
            margin-bottom: var(--spacing-lg);
            min-height: 60px;
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
            gap: 10px;
            padding: 8px 0;
            min-height: 40px;
        }
        
        .tag {
            background: linear-gradient(135deg, var(--vscode-badge-background), var(--vscode-button-secondaryBackground));
            color: var(--vscode-badge-foreground);
            padding: 6px 14px;
            border-radius: 16px;
            font-size: 0.85em;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            border: 1px solid transparent;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .tag:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
            border-color: var(--vscode-focusBorder);
            background: linear-gradient(135deg, var(--vscode-button-background), var(--vscode-button-hoverBackground));
            color: var(--vscode-button-foreground);
        }
        
        .content-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: var(--spacing-md);
            padding: 8px 0;
        }
        
        .content-header h2 {
            margin: 0;
        }
        
        .content-actions {
            display: flex;
            gap: 8px;
            align-items: center;
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
        
        .rendered-content {
            padding: var(--spacing-md);
            line-height: 1.8;
            font-size: 14px;
        }
        
        .rendered-content h1,
        .rendered-content h2,
        .rendered-content h3 {
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            font-weight: 600;
        }
        
        .rendered-content h1 { font-size: 1.8em; border-bottom: 2px solid var(--vscode-editorWidget-border); padding-bottom: 0.3em; }
        .rendered-content h2 { font-size: 1.5em; border-bottom: 1px solid var(--vscode-editorWidget-border); padding-bottom: 0.2em; }
        .rendered-content h3 { font-size: 1.25em; }
        
        .rendered-content pre {
            background-color: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: 4px;
            padding: 12px;
            overflow-x: auto;
            margin: 1em 0;
        }
        
        .rendered-content code {
            background-color: var(--vscode-textCodeBlock-background);
            padding: 2px 6px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
        }
        
        .rendered-content pre code {
            background: none;
            padding: 0;
        }
        
        .rendered-content ul,
        .rendered-content ol {
            padding-left: 2em;
            margin: 1em 0;
        }
        
        .rendered-content li {
            margin: 0.5em 0;
        }
        
        .rendered-content blockquote {
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            background-color: var(--vscode-textBlockQuote-background);
            padding: 0.5em 1em;
            margin: 1em 0;
        }
        
        .rendered-content table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }
        
        .rendered-content th,
        .rendered-content td {
            border: 1px solid var(--vscode-editorWidget-border);
            padding: 8px 12px;
            text-align: left;
        }
        
        .rendered-content th {
            background-color: var(--vscode-editorWidget-background);
            font-weight: 600;
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
        const vscode = acquireVsCodeApi();
        let isRenderedView = false;
        
        function sendMessage(type, payload) {
            vscode.postMessage({ type, payload });
        }
        
        function openMarkdownPreview() {
            sendMessage('openMarkdownPreview');
        }
        
        function copyContent() {
            // 获取当前显示的内容
            const rawContent = document.getElementById('rawContent');
            if (rawContent) {
                const text = rawContent.textContent || '';
                // 使用Clipboard API复制
                navigator.clipboard.writeText(text).then(() => {
                    // 可以显示复制成功提示
                    const btn = document.querySelector('.content-actions button[title="Copy content"]');
                    if (btn) {
                        const originalText = btn.innerHTML;
                        btn.innerHTML = '✅ Copied!';
                        setTimeout(() => {
                            btn.innerHTML = originalText;
                        }, 2000);
                    }
                }).catch(err => {
                    console.error('Failed to copy:', err);
                    // 降级方案：发送消息给后端
                    sendMessage('copyContent');
                });
            }
        }
        
        function exportRule() {
            sendMessage('exportRule');
        }
        
        function openInEditor() {
            sendMessage('openInEditor');
        }
        
        function searchByTag(tag) {
            sendMessage('searchByTag', { tag });
        }
        
        function toggleContentView() {
            const rawContent = document.getElementById('rawContent');
            const renderedContent = document.getElementById('renderedContent');
            const toggleBtn = document.getElementById('toggleViewBtn');
            
            if (!rawContent || !renderedContent || !toggleBtn) {
                console.error('Required elements not found');
                return;
            }
            
            isRenderedView = !isRenderedView;
            
            if (isRenderedView) {
                // 切换到渲染视图
                if (!renderedContent.innerHTML) {
                    // 首次渲染，请求后端转换Markdown
                    sendMessage('renderMarkdown');
                }
                rawContent.style.display = 'none';
                renderedContent.style.display = 'block';
                toggleBtn.innerHTML = '📝 Raw';
                toggleBtn.title = 'Show raw content';
            } else {
                // 切换到原始视图
                rawContent.style.display = 'block';
                renderedContent.style.display = 'none';
                toggleBtn.innerHTML = '🔄 Render';
                toggleBtn.title = 'Show rendered view';
            }
        }
        
        // 接收渲染后的HTML
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'renderedHtml') {
                const renderedContent = document.getElementById('renderedContent');
                if (renderedContent) {
                    renderedContent.innerHTML = message.html;
                }
            }
        });
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
   * 渲染优先级项（不转义HTML）
   */
  private renderPriorityItem(priority: string): string {
    return `
      <div class="metadata-item">
        <div class="metadata-label">Priority</div>
        <div class="metadata-value">${this.getPriorityBadge(priority)}</div>
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
    return `<span class="priority-text priority-${priority}">${icon} ${priority}</span>`;
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
        case 'openMarkdownPreview':
          await this.handleOpenMarkdownPreview();
          break;

        case 'copyContent':
          await this.handleCopyContent();
          break;

        case 'exportRule':
          await this.handleExportRule();
          break;

        case 'openInEditor':
          await this.handleOpenInEditor();
          break;

        case 'renderMarkdown':
          await this.handleRenderMarkdown();
          break;

        case 'searchByTag':
          await this.handleSearchByTag(message.payload?.tag);
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
   * 处理渲染Markdown
   */
  private async handleRenderMarkdown(): Promise<void> {
    if (!this.currentRule || !this.panel) return;

    try {
      // 使用VSCode的Markdown引擎渲染
      const rendered = await vscode.commands.executeCommand<string>(
        'markdown.api.render',
        this.currentRule.content,
      );

      // 发送渲染后的HTML回前webview
      this.panel.webview.postMessage({
        type: 'renderedHtml',
        html: rendered || this.simpleMarkdownRender(this.currentRule.content),
      });

      Logger.debug('[RuleDetails] Markdown rendered successfully');
    } catch (error) {
      Logger.error(
        '[RuleDetails] Failed to render markdown',
        error instanceof Error ? error : undefined,
      );
      // 如果VSCode API失败，使用简单的渲染
      if (this.panel) {
        this.panel.webview.postMessage({
          type: 'renderedHtml',
          html: this.simpleMarkdownRender(this.currentRule.content),
        });
      }
    }
  }

  /**
   * 简单的Markdown渲染（备用）
   */
  private simpleMarkdownRender(content: string): string {
    let html = this.escapeHtml(content);

    // 基本的Markdown转换
    html = html
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hul])/gm, '<p>')
      .replace(/(?<![hul]>)$/gm, '</p>');

    return html;
  }

  /**
   * 处理按标签搜索
   */
  private async handleSearchByTag(tag: string): Promise<void> {
    if (!tag) return;

    try {
      // 打开高级搜索并预填标签
      await vscode.commands.executeCommand('turbo-ai-rules.advancedSearch');
      // TODO: 需要SearchWebviewProvider支持接收预填数据
      Logger.debug('[RuleDetails] Opened search with tag', { tag });
    } catch (error) {
      Logger.error(
        '[RuleDetails] Failed to search by tag',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 处理在VSCode中打开Markdown预览
   */
  private async handleOpenMarkdownPreview(): Promise<void> {
    if (!this.currentRule) return;

    try {
      const fileUri = vscode.Uri.file(this.currentRule.filePath);

      // 在编辑器中打开Markdown文件
      const doc = await vscode.workspace.openTextDocument(fileUri);
      await vscode.window.showTextDocument(doc, {
        preview: false,
        viewColumn: vscode.ViewColumn.One,
      });

      // 打开Markdown预览（侧边）
      await vscode.commands.executeCommand('markdown.showPreviewToSide', fileUri);

      Logger.debug('[RuleDetails] Opened VSCode Markdown preview', {
        filePath: this.currentRule.filePath,
      });
    } catch (error) {
      Logger.error(
        '[RuleDetails] Failed to open Markdown preview',
        error instanceof Error ? error : undefined,
      );
      vscode.window.showErrorMessage(
        `Failed to open Markdown preview: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * 处理复制内容
   */
  private async handleCopyContent(): Promise<void> {
    if (!this.currentRule) return;

    try {
      await vscode.env.clipboard.writeText(this.currentRule.content);
      vscode.window.showInformationMessage('Rule content copied to clipboard');
      Logger.debug('[RuleDetails] Content copied to clipboard');
    } catch (error) {
      Logger.error(
        '[RuleDetails] Failed to copy content',
        error instanceof Error ? error : undefined,
      );
      vscode.window.showErrorMessage('Failed to copy content to clipboard');
    }
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
