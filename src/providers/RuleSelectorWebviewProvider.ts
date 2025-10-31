import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';

/**
 * @description 规则选择器 Webview Provider
 */
export class RuleSelectorWebviewProvider extends BaseWebviewProvider {
  private static instance: RuleSelectorWebviewProvider | undefined;

  private constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  public static getInstance(context: vscode.ExtensionContext): RuleSelectorWebviewProvider {
    if (!RuleSelectorWebviewProvider.instance) {
      RuleSelectorWebviewProvider.instance = new RuleSelectorWebviewProvider(context);
    }
    return RuleSelectorWebviewProvider.instance;
  }

  public async showRuleSelector(): Promise<void> {
    await this.show({
      viewType: 'turboAiRules.ruleSelector',
      title: '规则选择器',
      viewColumn: vscode.ViewColumn.Active,
    });
  }

  protected async getHtmlContent(webview: vscode.Webview): Promise<string> {
    const htmlPath = path.join(
      this.context.extensionPath,
      'out',
      'webview',
      'src',
      'webview',
      'rule-selector',
      'index.html',
    );
    let html = fs.readFileSync(htmlPath, 'utf-8');
    const cspSource = this.getCspSource(webview);
    html = html.replace(/\{\{cspSource\}\}/g, cspSource);
    const htmlDir = path.dirname(htmlPath);
    html = html.replace(/(?:src|href)="([^"]+)"/g, (match, resourcePath) => {
      try {
        let absPath: string;
        if (resourcePath.startsWith('/')) {
          absPath = path.join(
            this.context.extensionPath,
            'out',
            'webview',
            resourcePath.replace(/^\//, ''),
          );
        } else {
          absPath = path.join(htmlDir, resourcePath);
        }
        const webviewUri = webview.asWebviewUri(vscode.Uri.file(absPath));
        return match.replace(resourcePath, webviewUri.toString());
      } catch {
        return match;
      }
    });
    return html;
  }

  protected handleMessage(message: WebviewMessage): void {
    // TODO: 处理规则选择器消息
  }
}
