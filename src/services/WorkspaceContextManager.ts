/**
 * 工作空间上下文管理器
 * 解决 Webview 切换导致 activeEditor 丢失，无法确定当前工作空间的问题
 */

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';

/**
 * 工作空间上下文管理器
 * 负责记住用户当前使用的工作空间，即使切换到 Webview 也能恢复
 */
export class WorkspaceContextManager {
  private static instance: WorkspaceContextManager;
  private context: vscode.ExtensionContext;
  private currentWorkspaceFolder: vscode.WorkspaceFolder | undefined;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.currentWorkspaceFolder = undefined;

    // 监听活动编辑器变化，自动更新当前工作空间
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
        if (workspaceFolder) {
          this.setCurrentWorkspaceFolder(workspaceFolder);
        }
      }
    });

    // 初始化：如果有活动编辑器，使用其工作空间
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
      if (workspaceFolder) {
        this.currentWorkspaceFolder = workspaceFolder;
      }
    }

    // 如果没有活动编辑器，尝试从 globalState 恢复
    if (!this.currentWorkspaceFolder) {
      this.restoreFromState();
    }

    // 如果还是没有，使用第一个工作空间
    if (!this.currentWorkspaceFolder) {
      const folders = vscode.workspace.workspaceFolders;
      if (folders && folders.length > 0) {
        this.currentWorkspaceFolder = folders[0];
      }
    }
  }

  /**
   * 获取单例实例
   */
  public static getInstance(context?: vscode.ExtensionContext): WorkspaceContextManager {
    if (!WorkspaceContextManager.instance) {
      if (!context) {
        throw new Error('WorkspaceContextManager requires ExtensionContext for initialization');
      }
      WorkspaceContextManager.instance = new WorkspaceContextManager(context);
    }
    return WorkspaceContextManager.instance;
  }

  /**
   * 设置当前工作空间文件夹
   */
  public setCurrentWorkspaceFolder(folder: vscode.WorkspaceFolder): void {
    this.currentWorkspaceFolder = folder;
    this.saveToState(folder);
    Logger.debug('Current workspace folder updated', {
      name: folder.name,
      path: folder.uri.fsPath,
    });
  }

  /**
   * 获取当前工作空间文件夹
   * 优先级：
   * 1. 缓存的当前工作空间
   * 2. activeEditor 所在的工作空间
   * 3. globalState 中保存的工作空间
   * 4. 第一个工作空间
   */
  public getCurrentWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    // 1. 如果有缓存，直接返回
    if (this.currentWorkspaceFolder) {
      // 验证该工作空间是否还存在
      const folders = vscode.workspace.workspaceFolders;
      if (folders?.some((f) => f.uri.fsPath === this.currentWorkspaceFolder!.uri.fsPath)) {
        return this.currentWorkspaceFolder;
      }
      // 如果不存在了，清除缓存
      this.currentWorkspaceFolder = undefined;
    }

    // 2. 尝试从 activeEditor 获取
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeEditor.document.uri);
      if (workspaceFolder) {
        this.setCurrentWorkspaceFolder(workspaceFolder);
        return workspaceFolder;
      }
    }

    // 3. 尝试从 globalState 恢复
    const restored = this.restoreFromState();
    if (restored) {
      this.currentWorkspaceFolder = restored;
      return restored;
    }

    // 4. 使用第一个工作空间
    const folders = vscode.workspace.workspaceFolders;
    if (folders && folders.length > 0) {
      this.setCurrentWorkspaceFolder(folders[0]);
      return folders[0];
    }

    return undefined;
  }

  /**
   * 保存当前工作空间到 globalState
   */
  private saveToState(folder: vscode.WorkspaceFolder): void {
    try {
      this.context.globalState.update('currentWorkspaceFolderPath', folder.uri.fsPath);
    } catch (error) {
      Logger.warn('Failed to save workspace context', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 从 globalState 恢复工作空间
   */
  private restoreFromState(): vscode.WorkspaceFolder | undefined {
    try {
      const savedPath = this.context.globalState.get<string>('currentWorkspaceFolderPath');
      if (!savedPath) {
        return undefined;
      }

      const folders = vscode.workspace.workspaceFolders;
      if (!folders) {
        return undefined;
      }

      // 查找匹配的工作空间
      const folder = folders.find((f) => f.uri.fsPath === savedPath);
      if (folder) {
        Logger.debug('Restored workspace folder from state', {
          name: folder.name,
          path: folder.uri.fsPath,
        });
        return folder;
      }
    } catch (error) {
      Logger.warn('Failed to restore workspace context', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return undefined;
  }

  /**
   * 清除当前工作空间上下文
   */
  public clear(): void {
    this.currentWorkspaceFolder = undefined;
    this.context.globalState.update('currentWorkspaceFolderPath', undefined);
  }
}
