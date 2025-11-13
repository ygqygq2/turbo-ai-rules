import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { BaseWebviewProvider, type WebviewMessage } from './BaseWebviewProvider';
import { WorkspaceDataManager } from '../services/WorkspaceDataManager';
import { RulesManager } from '../services/RulesManager';
import { getRulesBySourceMap } from '../services/RuleQuery';
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

    // 打开后尽快发送初始数据（同时也等前端 ready 再发一遍，防止 race）
    await this.loadAndSendInitialData();
  }

  /**
   * @description 加载并发送初始数据到 webview
   * @return {Promise<void>}
   */
  private async loadAndSendInitialData(): Promise<void> {
    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        Logger.warn('No workspace folder found when loading initial data');
        this.postMessage({
          type: 'error',
          payload: { message: '未找到工作区', code: 'TAI-1001' },
        });
        return;
      }

      const workspacePath = workspaceFolders[0].uri.fsPath;
      const dataManager = WorkspaceDataManager.getInstance();
      const rulesManager = RulesManager.getInstance();

      // 读取所有规则选择数据
      const selections = await dataManager.readRuleSelections();

      // 分组后的规则
      const rulesBySource = getRulesBySourceMap(rulesManager);

      this.postMessage({
        type: 'initialData',
        payload: {
          workspacePath,
          selections: selections?.selections || {},
          rulesBySource,
        },
      });

      Logger.info('Initial data sent to rule selector webview', {
        sourceCount: Object.keys(rulesBySource).length,
        totalRules: Object.values(rulesBySource).reduce((acc, arr) => acc + arr.length, 0),
      });
    } catch (error) {
      Logger.error('Failed to load initial data', error as Error);
      this.postMessage({
        type: 'error',
        payload: { message: '加载数据失败', code: 'TAI-5002' },
      });
    }
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
        case 'webviewReady': {
          // 前端加载完成，发送初始数据
          this.loadAndSendInitialData().catch((err) =>
            Logger.error('Failed to send initial data on ready', err as Error),
          );
          break;
        }
        case 'close': {
          // 关闭 webview
          if (this.panel) {
            this.panel.dispose();
          }
          break;
        }
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
              Logger.info('Rule selection saved successfully', {
                sourceId,
                pathCount: paths.length,
              });
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
