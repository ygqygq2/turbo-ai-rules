/**
 * 欢迎页面 Webview 提供者
 * 显示首次使用引导和快速开始
 */

import * as vscode from 'vscode';

import { ConfigManager } from '../services/ConfigManager';
import { Logger } from '../utils/logger';
import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';

/**
 * 欢迎页面提供者
 */
export class WelcomeWebviewProvider extends BaseWebviewProvider {
  private static instance: WelcomeWebviewProvider | undefined;

  private constructor(context: vscode.ExtensionContext) {
    super(context);
  }

  /**
   * 获取单例实例
   */
  public static getInstance(context: vscode.ExtensionContext): WelcomeWebviewProvider {
    if (!WelcomeWebviewProvider.instance) {
      WelcomeWebviewProvider.instance = new WelcomeWebviewProvider(context);
    }
    return WelcomeWebviewProvider.instance;
  }

  /**
   * 显示欢迎页面
   */
  public async showWelcome(): Promise<void> {
    await this.show({
      viewType: 'turboAiRules.welcome',
      title: 'Welcome to Turbo AI Rules',
      viewColumn: vscode.ViewColumn.One,
    });
  }

  /**
   * 生成 HTML 内容
   */
  protected getHtmlContent(webview: vscode.Webview): string {
    const nonce = this.getNonce();

    return `${this.getHtmlHead(webview, 'Welcome to Turbo AI Rules')}
<body>
    <div class="container">
        <div class="hero">
            <h1>🚀 Welcome to Turbo AI Rules</h1>
            <p class="subtitle">Sync AI coding rules from Git repositories and automatically generate configuration files</p>
        </div>

        <div class="steps">
            <div class="step-card">
                <div class="step-number">1</div>
                <div class="step-content">
                    <h2>Add a Rule Source</h2>
                    <p>Configure your first Git repository to sync rules from</p>
                    <button class="button" onclick="addSource()">
                        ➕ Add Source
                    </button>
                </div>
            </div>

            <div class="step-card">
                <div class="step-number">2</div>
                <div class="step-content">
                    <h2>Sync Rules</h2>
                    <p>Fetch and update AI rules from your configured sources</p>
                    <button class="button" onclick="syncRules()">
                        🔄 Sync Now
                    </button>
                </div>
            </div>

            <div class="step-card">
                <div class="step-number">3</div>
                <div class="step-content">
                    <h2>Generate Configs</h2>
                    <p>Create configuration files for your AI coding tools</p>
                    <button class="button button-secondary" onclick="generateConfigs()">
                        📝 Generate Configs
                    </button>
                </div>
            </div>
        </div>

        <div class="templates">
            <h2>📚 Quick Start Templates</h2>
            <p class="section-desc">Popular rule repositories to get you started</p>
            
            <div class="template-grid">
                <div class="template-card" onclick="useTemplate('typescript')">
                    <div class="template-icon">TS</div>
                    <h3>TypeScript Best Practices</h3>
                    <p>Coding standards and style guide for TypeScript projects</p>
                </div>
                
                <div class="template-card" onclick="useTemplate('react')">
                    <div class="template-icon">⚛️</div>
                    <h3>React Development Rules</h3>
                    <p>Component patterns and React hooks best practices</p>
                </div>
                
                <div class="template-card" onclick="useTemplate('python')">
                    <div class="template-icon">🐍</div>
                    <h3>Python Style Guide</h3>
                    <p>PEP 8 compliant coding standards for Python</p>
                </div>
            </div>
        </div>

        <div class="footer">
            <button class="button button-secondary" onclick="viewDocs()">
                📖 Documentation
            </button>
            <button class="button button-secondary" onclick="getHelp()">
                💬 Get Help
            </button>
            <button class="button button-secondary" onclick="dismiss()">
                ✓ Don't Show Again
            </button>
        </div>
    </div>

    <style>
        .hero {
            text-align: center;
            margin-bottom: var(--spacing-lg);
            padding: var(--spacing-lg) 0;
        }
        
        .hero h1 {
            font-size: 2em;
            margin-bottom: var(--spacing-sm);
        }
        
        .subtitle {
            color: var(--vscode-descriptionForeground);
            font-size: 1.1em;
        }
        
        .steps {
            margin-bottom: var(--spacing-lg);
        }
        
        .step-card {
            display: flex;
            align-items: flex-start;
            gap: var(--spacing-md);
            padding: var(--spacing-md);
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: var(--border-radius);
            margin-bottom: var(--spacing-md);
        }
        
        .step-number {
            flex-shrink: 0;
            width: 40px;
            height: 40px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.2em;
            font-weight: bold;
        }
        
        .step-content {
            flex: 1;
        }
        
        .step-content h2 {
            font-size: 1.2em;
            margin-bottom: var(--spacing-sm);
        }
        
        .step-content p {
            color: var(--vscode-descriptionForeground);
            margin-bottom: var(--spacing-sm);
        }
        
        .templates {
            margin-bottom: var(--spacing-lg);
        }
        
        .templates h2 {
            margin-bottom: var(--spacing-sm);
        }
        
        .section-desc {
            color: var(--vscode-descriptionForeground);
            margin-bottom: var(--spacing-md);
        }
        
        .template-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: var(--spacing-md);
        }
        
        .template-card {
            padding: var(--spacing-md);
            background-color: var(--vscode-editorWidget-background);
            border: 1px solid var(--vscode-editorWidget-border);
            border-radius: var(--border-radius);
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .template-card:hover {
            border-color: var(--vscode-focusBorder);
            transform: translateY(-2px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        
        .template-icon {
            font-size: 2em;
            margin-bottom: var(--spacing-sm);
        }
        
        .template-card h3 {
            font-size: 1em;
            margin-bottom: var(--spacing-sm);
        }
        
        .template-card p {
            color: var(--vscode-descriptionForeground);
            font-size: 0.9em;
        }
        
        .footer {
            display: flex;
            gap: var(--spacing-sm);
            justify-content: center;
            padding-top: var(--spacing-lg);
            border-top: 1px solid var(--vscode-editorWidget-border);
        }
    </style>

    ${this.getVscodeApiScript()}
    ${this.getScriptTag(
      nonce,
      `
        function addSource() {
            sendMessage('addSource');
        }
        
        function syncRules() {
            sendMessage('syncRules');
        }
        
        function generateConfigs() {
            sendMessage('generateConfigs');
        }
        
        function useTemplate(type) {
            sendMessage('useTemplate', { type });
        }
        
        function viewDocs() {
            sendMessage('viewDocs');
        }
        
        function getHelp() {
            sendMessage('getHelp');
        }
        
        function dismiss() {
            sendMessage('dismiss');
        }
    `,
    )}
</body>
</html>`;
  }

  /**
   * 处理来自 Webview 的消息
   */
  protected async handleMessage(message: WebviewMessage): Promise<void> {
    try {
      switch (message.type) {
        case 'addSource':
          await vscode.commands.executeCommand('turbo-ai-rules.addSource');
          break;

        case 'syncRules':
          await vscode.commands.executeCommand('turbo-ai-rules.syncRules');
          break;

        case 'generateConfigs':
          await vscode.commands.executeCommand('turbo-ai-rules.generateConfigs');
          break;

        case 'useTemplate':
          await this.handleUseTemplate(message.payload?.type);
          break;

        case 'viewDocs':
          await vscode.env.openExternal(
            vscode.Uri.parse(
              'https://github.com/ygqygq2/turbo-ai-rules/blob/main/docs/user-guide/README.md',
            ),
          );
          break;

        case 'getHelp':
          await vscode.env.openExternal(
            vscode.Uri.parse('https://github.com/ygqygq2/turbo-ai-rules/discussions'),
          );
          break;

        case 'dismiss':
          await this.handleDismiss();
          break;

        default:
          Logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      Logger.error('Failed to handle webview message', error instanceof Error ? error : undefined);
      vscode.window.showErrorMessage(
        `Failed to handle action: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * 处理使用模板
   */
  private async handleUseTemplate(type: string): Promise<void> {
    const templates: Record<string, { url: string; name: string }> = {
      typescript: {
        url: 'https://github.com/example/typescript-rules.git',
        name: 'TypeScript Best Practices',
      },
      react: {
        url: 'https://github.com/example/react-rules.git',
        name: 'React Development Rules',
      },
      python: {
        url: 'https://github.com/example/python-rules.git',
        name: 'Python Style Guide',
      },
    };

    const template = templates[type];
    if (!template) {
      vscode.window.showErrorMessage('Unknown template type');
      return;
    }

    // 这里可以实现自动添加模板源的逻辑
    const confirm = await vscode.window.showInformationMessage(
      `Add "${template.name}" template as a rule source?`,
      'Add Source',
      'Cancel',
    );

    if (confirm === 'Add Source') {
      // TODO: 实现添加预配置源的逻辑
      vscode.window.showInformationMessage(
        `Template feature coming soon! You can manually add: ${template.url}`,
      );
    }
  }

  /**
   * 处理关闭欢迎页面
   */
  private async handleDismiss(): Promise<void> {
    const configManager = ConfigManager.getInstance(this.context);
    await this.context.globalState.update('welcomeShown', true);
    this.dispose();
    vscode.window.showInformationMessage(
      "Welcome page dismissed. You can always access it from the command palette ('Turbo AI Rules: Show Welcome').",
    );
  }
}
