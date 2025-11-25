/**
 * 规则详情 Webview 提供者（React 版本）
 * 使用独立的 HTML/CSS/JS 文件
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { RulesManager } from '../services/RulesManager';
import type { ParsedRule } from '../types/rules';
import { EXTENSION_ICON_PATH } from '../utils/constants';
import { Logger } from '../utils/logger';
import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';
import { SearchWebviewProvider } from './SearchWebviewProvider';

export class RuleDetailsWebviewProvider extends BaseWebviewProvider {
  private static instance: RuleDetailsWebviewProvider | undefined;
  private currentRule: ParsedRule | null = null;

  private constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  public static getInstance(context: vscode.ExtensionContext): RuleDetailsWebviewProvider {
    if (!RuleDetailsWebviewProvider.instance) {
      RuleDetailsWebviewProvider.instance = new RuleDetailsWebviewProvider(context);
    }
    return RuleDetailsWebviewProvider.instance;
  }

  public async showRuleDetails(rule: ParsedRule): Promise<void> {
    Logger.debug(`[RuleDetails] showRuleDetails called with rule: ${rule.id}`);
    this.currentRule = rule;

    await this.show({
      viewType: 'turboAiRules.ruleDetails',
      title: `Rule: ${rule.title}`,
      viewColumn: vscode.ViewColumn.Beside,
      iconPath: EXTENSION_ICON_PATH,
    });

    // 发送规则数据到 webview
    if (this.panel) {
      this.panel.webview.postMessage({
        type: 'setRule',
        rule: this.currentRule,
      });
      Logger.debug(`[RuleDetails] Sent rule data to webview`);
    }

    Logger.debug(`[RuleDetails] showRuleDetails completed, panel exists: ${!!this.panel}`);
  }

  /**
   * 生成 HTML 内容 - 从文件加载
   */
  protected async getHtmlContent(webview: vscode.Webview): Promise<string> {
    const htmlPath = path.join(
      this.context.extensionPath,
      'out',
      'webview',
      'src',
      'webview',
      'rule-details',
      'index.html',
    );

    let html = fs.readFileSync(htmlPath, 'utf-8');

    // 替换 CSP 占位符
    const cspSource = this.getCspSource(webview);
    html = html.replace(/\{\{cspSource\}\}/g, cspSource);

    // 转换资源路径为 webview URI
    const htmlDir = path.dirname(htmlPath);
    html = html.replace(/(?:src|href)="([^"]+)"/g, (match, resourcePath) => {
      try {
        // 如果是绝对路径以 / 开头，则将其视为相对于 out/webview 根目录
        let absPath: string;
        if (resourcePath.startsWith('/')) {
          absPath = path.join(
            this.context.extensionPath,
            'out',
            'webview',
            resourcePath.replace(/^\//, ''),
          );
        } else {
          // 相对路径相对于 HTML 文件所在目录
          absPath = path.resolve(htmlDir, resourcePath);
        }

        if (!fs.existsSync(absPath)) {
          return match; // 文件不存在则保留原引用
        }

        const assetUri = webview.asWebviewUri(vscode.Uri.file(absPath));
        return match.replace(resourcePath, assetUri.toString());
      } catch (_e) {
        return match;
      }
    });

    return html;
  }

  /**
   * 处理来自 Webview 的消息
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    Logger.debug(
      `[RuleDetails] Received message: type=${message.type}, payload=${JSON.stringify(
        message.payload,
      )}`,
    );

    if (!this.currentRule) {
      Logger.warn('[RuleDetails] No current rule, ignoring message');
      return;
    }

    try {
      switch (message.type) {
        case 'webviewReady':
          Logger.debug('[RuleDetails] Webview ready, sending rule data');
          if (this.panel) {
            this.panel.webview.postMessage({
              type: 'setRule',
              rule: this.currentRule,
            });
          }
          break;

        case 'openMarkdownPreview':
          Logger.debug('[RuleDetails] Handling openMarkdownPreview');
          await this.handleOpenMarkdownPreview();
          break;

        case 'copyContent':
          Logger.debug('[RuleDetails] Handling copyContent');
          await this.handleCopyContent();
          break;

        case 'exportRule':
          Logger.debug('[RuleDetails] Handling exportRule');
          await this.handleExportRule();
          break;

        case 'openInEditor':
          Logger.debug('[RuleDetails] Handling openInEditor');
          await this.handleOpenInEditor();
          break;

        case 'renderMarkdown':
          Logger.debug('[RuleDetails] Handling renderMarkdown');
          await this.handleRenderMarkdown();
          break;

        case 'searchByTag':
          Logger.debug(`[RuleDetails] Handling searchByTag: ${message.payload?.tag}`);
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

      // 发送渲染后的HTML回webview
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
   * 简单的Markdown渲染（备用方案）
   */
  private simpleMarkdownRender(markdown: string): string {
    const html = markdown
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
    if (!tag) {
      Logger.warn('[RuleDetails] handleSearchByTag: No tag provided');
      return;
    }

    Logger.debug(`[RuleDetails] handleSearchByTag: Searching for tag "${tag}"`);

    try {
      const searchProvider = SearchWebviewProvider.getInstance(
        this.context,
        (global as { rulesManagerInstance?: unknown }).rulesManagerInstance as RulesManager,
      );
      await searchProvider.showSearchWithCriteria({ tags: [tag] });
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
    if (!this.currentRule) {
      Logger.warn('[RuleDetails] handleOpenMarkdownPreview: No current rule');
      return;
    }

    Logger.debug(`[RuleDetails] handleOpenMarkdownPreview: Opening ${this.currentRule.filePath}`);

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
    if (!this.currentRule) {
      Logger.warn('[RuleDetails] handleCopyContent: No current rule');
      return;
    }

    Logger.debug(
      `[RuleDetails] handleCopyContent: Copying ${this.currentRule.content.length} characters`,
    );

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
    if (!this.currentRule) {
      Logger.warn('[RuleDetails] handleExportRule: No current rule');
      return;
    }

    Logger.debug(`[RuleDetails] handleExportRule: Exporting rule ${this.currentRule.id}`);

    const rule = this.currentRule;
    const uri = await vscode.window.showSaveDialog({
      defaultUri: vscode.Uri.file(`${rule.id}.md`),
      filters: {
        'Markdown Files': ['md'],
      },
    });

    if (uri) {
      Logger.debug(`[RuleDetails] handleExportRule: Saving to ${uri.fsPath}`);
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
      Logger.debug(`[RuleDetails] handleExportRule: Successfully exported to ${uri.fsPath}`);
      vscode.window.showInformationMessage(`Rule exported to ${uri.fsPath}`);
    } else {
      Logger.debug('[RuleDetails] handleExportRule: User cancelled save dialog');
    }
  }

  /**
   * 处理在编辑器中打开
   */
  private async handleOpenInEditor(): Promise<void> {
    if (!this.currentRule) {
      Logger.warn('[RuleDetails] handleOpenInEditor: No current rule');
      return;
    }

    Logger.debug(`[RuleDetails] handleOpenInEditor: Opening ${this.currentRule.filePath}`);

    try {
      const uri = vscode.Uri.file(this.currentRule.filePath);
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document, {
        preview: false,
        viewColumn: vscode.ViewColumn.One,
      });
      Logger.debug('[RuleDetails] handleOpenInEditor: Successfully opened in editor');
    } catch (error) {
      Logger.error(
        '[RuleDetails] handleOpenInEditor: Failed to open file',
        error instanceof Error ? error : undefined,
      );
      vscode.window.showErrorMessage(
        `Failed to open file: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
