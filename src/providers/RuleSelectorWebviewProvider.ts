import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';
import { WorkspaceDataManager } from '../services/WorkspaceDataManager';
import type { RuleSelection } from '../services/WorkspaceDataManager';
import { Logger } from '../utils/logger';
import { SystemError } from '../types/errors';

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

  protected handleMessage(_message: WebviewMessage): void {
    // 处理规则选择器消息：选择同步、保存等
    try {
      const { type, payload } = _message || { type: '', payload: undefined };
      switch (type) {
        case 'selectionChanged': {
          // payload: { sourceId: string, selectedPaths: string[] }
          if (!payload?.sourceId || !Array.isArray(payload?.selectedPaths)) {
            Logger.warn('selectionChanged payload invalid');
            return;
          }

          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (!workspaceFolders || workspaceFolders.length === 0) {
            Logger.error('No workspace folder found');
            return;
          }

          const workspacePath = workspaceFolders[0].uri.fsPath;
          const dataManager = WorkspaceDataManager.getInstance();

          const selection: RuleSelection = {
            mode: 'include',
            paths: payload.selectedPaths,
          };

          dataManager
            .setRuleSelection(workspacePath, payload.sourceId, selection)
            .then(() => {
              // 刷新侧边栏 TreeView（命令会触发 provider.refresh）
              vscode.commands.executeCommand('turbo-ai-rules.refresh');
              this.postMessage({
                type: 'selectionUpdated',
                payload: { count: payload.selectedPaths.length },
              });
            })
            .catch((err: Error) => {
              Logger.error('Failed to set rule selection', err, {
                sourceId: payload.sourceId,
              });
              this.postMessage({
                type: 'error',
                payload: {
                  message: '更新选择失败，请重试',
                  code: 'TAI-5003',
                },
              });
            });
          break;
        }
        case 'saveRuleSelection': {
          // payload: { sourceId: string, selection: { paths: string[] } }
          const sourceId = payload?.sourceId;
          const paths = payload?.selection?.paths as string[] | undefined;
          if (!sourceId || !Array.isArray(paths)) {
            Logger.warn('saveRuleSelection payload invalid');
            return;
          }

          const workspaceFolders = vscode.workspace.workspaceFolders;
          if (!workspaceFolders || workspaceFolders.length === 0) {
            Logger.error('No workspace folder found');
            return;
          }

          const workspacePath = workspaceFolders[0].uri.fsPath;
          const dataManager = WorkspaceDataManager.getInstance();

          const selection: RuleSelection = {
            mode: 'include',
            paths,
          };

          dataManager
            .setRuleSelection(workspacePath, sourceId, selection)
            .then(async () => {
              await vscode.commands.executeCommand('turbo-ai-rules.refresh');
              this.postMessage({ type: 'saveSuccess', payload: { message: '已保存' } });
            })
            .catch((err: Error) => {
              Logger.error('Failed to save rule selection', err, { sourceId });
              this.postMessage({
                type: 'error',
                payload: {
                  message: '保存失败，请检查工作区写入权限',
                  code: 'TAI-5003',
                },
              });
            });
          break;
        }
        case 'loadRuleTree': {
          // MVP：暂不从磁盘读取真实树，仅返回占位统计
          const sourceId = payload?.sourceId;
          const dataManager = WorkspaceDataManager.getInstance();
          dataManager
            .getRuleSelection(sourceId)
            .then((selection: RuleSelection | null) => {
              this.postMessage({
                type: 'treeData',
                payload: {
                  tree: null,
                  totalRules: 0,
                  selectedRules: selection?.paths?.length || 0,
                },
              });
            })
            .catch((err: Error) => {
              Logger.error('Failed to load rule tree placeholder', err, { sourceId });
            });
          break;
        }
        default:
          break;
      }
    } catch (error) {
      Logger.error('RuleSelector handleMessage failed', error as Error);
      throw new SystemError('RuleSelector message handling failed', 'TAI-5003', error as Error);
    }
  }
}
