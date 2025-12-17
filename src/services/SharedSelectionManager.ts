/**
 * 共享选择状态管理器
 * 负责工作区级别的选择状态文件的读写
 * 职责：
 * - 检查共享模式配置
 * - 读写工作区选择文件（.turbo-ai-rules/selections.json）
 * - 导入导出选择状态
 * - .gitignore 自动管理
 */

import * as path from 'path';
import * as vscode from 'vscode';

import { CONFIG_KEYS, CONFIG_PREFIX } from '../utils/constants';
import { ensureDir, pathExists, safeReadFile, safeWriteFile } from '../utils/fileSystem';
import { ensureIgnored, removeIgnored } from '../utils/gitignore';
import { Logger } from '../utils/logger';
import { toAbsolutePaths, toRelativePaths } from '../utils/rulePath';
import type { RuleSelection, RuleSelections } from './WorkspaceDataManager';

/**
 * 共享选择管理器
 */
export class SharedSelectionManager {
  private static instance: SharedSelectionManager;

  private constructor() {}

  /**
   * @description 获取 SharedSelectionManager 实例
   * @return {SharedSelectionManager}
   */
  public static getInstance(): SharedSelectionManager {
    if (!SharedSelectionManager.instance) {
      SharedSelectionManager.instance = new SharedSelectionManager();
    }
    return SharedSelectionManager.instance;
  }

  /**
   * @description 检查是否启用共享选择状态
   * @param workspaceFolder {vscode.WorkspaceFolder} 工作区文件夹
   * @return {boolean}
   */
  public isEnabled(workspaceFolder?: vscode.WorkspaceFolder): boolean {
    const config = vscode.workspace.getConfiguration(CONFIG_PREFIX, workspaceFolder?.uri);
    return config.get<boolean>(CONFIG_KEYS.ENABLE_SHARED_SELECTION, false);
  }

  /**
   * @description 获取共享选择文件的完整路径
   * @param workspacePath {string} 工作区路径
   * @return {string} 共享选择文件路径
   */
  public getFilePath(workspacePath: string): string {
    const workspaceFolder = vscode.workspace.workspaceFolders?.find(
      (folder) => folder.uri.fsPath === workspacePath,
    );
    const config = vscode.workspace.getConfiguration(CONFIG_PREFIX, workspaceFolder?.uri);
    const relativePath = config.get<string>(
      CONFIG_KEYS.SELECTION_FILE_PATH,
      '.turbo-ai-rules/selections.json',
    );
    return path.join(workspacePath, relativePath);
  }

  /**
   * @description 从工作区文件加载共享选择状态
   * @param workspacePath {string} 工作区路径
   * @return {Promise<RuleSelections | null>} 共享选择数据
   */
  public async load(workspacePath: string): Promise<RuleSelections | null> {
    const filePath = this.getFilePath(workspacePath);

    if (!(await pathExists(filePath))) {
      Logger.debug('Shared selection file not found', { filePath });
      return null;
    }

    try {
      const content = await safeReadFile(filePath);
      const data = JSON.parse(content) as RuleSelections;

      Logger.info('Loaded shared selection state from workspace', {
        filePath,
        sourcesCount: Object.keys(data.selections).length,
      });

      return data;
    } catch (error) {
      Logger.error('Failed to load shared selection state', error as Error, { filePath });
      return null;
    }
  }

  /**
   * @description 保存共享选择状态到工作区文件
   * @param workspacePath {string} 工作区路径
   * @param selections {Map<string, Set<string>>} 内存选择状态
   * @return {Promise<void>}
   */
  public async save(workspacePath: string, selections: Map<string, Set<string>>): Promise<void> {
    const filePath = this.getFilePath(workspacePath);

    // 确保目录存在
    await ensureDir(path.dirname(filePath));

    // 构建共享选择数据
    const selectionsData: { [sourceId: string]: RuleSelection } = {};

    for (const [sourceId, selectedPaths] of selections.entries()) {
      const relativePaths = toRelativePaths(Array.from(selectedPaths), sourceId);
      selectionsData[sourceId] = {
        mode: 'include',
        paths: relativePaths,
      };
    }

    const data: RuleSelections = {
      version: 1,
      workspacePath,
      lastUpdated: new Date().toISOString(),
      selections: selectionsData,
    };

    try {
      await safeWriteFile(filePath, JSON.stringify(data, null, 2));

      Logger.info('Saved shared selection state to workspace', {
        filePath,
        sourcesCount: Object.keys(selectionsData).length,
      });

      // 管理 .gitignore
      await this.manageGitignore(workspacePath);
    } catch (error) {
      Logger.error('Failed to save shared selection state', error as Error, { filePath });
      throw error;
    }
  }

  /**
   * @description 导入工作区选择状态到内存
   * @param workspacePath {string} 工作区路径
   * @param currentSelections {Map<string, Set<string>>} 当前内存选择状态
   * @param mergeMode {'replace' | 'merge'} 合并模式
   * @return {Promise<Map<string, Set<string>>>} 导入后的选择状态
   */
  public async import(
    workspacePath: string,
    currentSelections: Map<string, Set<string>>,
    mergeMode: 'replace' | 'merge' = 'replace',
  ): Promise<Map<string, Set<string>>> {
    const sharedData = await this.load(workspacePath);
    if (!sharedData) {
      return new Map(currentSelections);
    }

    const result = new Map(mergeMode === 'replace' ? [] : currentSelections);

    for (const [sourceId, selection] of Object.entries(sharedData.selections)) {
      if (selection.mode === 'include' && selection.paths) {
        const absolutePaths = toAbsolutePaths(selection.paths, sourceId);

        if (mergeMode === 'replace' || !result.has(sourceId)) {
          result.set(sourceId, new Set(absolutePaths));
        } else {
          // merge 模式：合并路径
          const existing = result.get(sourceId)!;
          absolutePaths.forEach((p) => existing.add(p));
        }
      }
    }

    Logger.info('Imported shared selection state', {
      workspacePath,
      sourcesCount: result.size,
      mergeMode,
    });

    return result;
  }

  /**
   * @description 导出当前选择状态到工作区文件
   * @param workspacePath {string} 工作区路径
   * @param selections {Map<string, Set<string>>} 内存选择状态
   * @return {Promise<void>}
   */
  public async export(workspacePath: string, selections: Map<string, Set<string>>): Promise<void> {
    await this.save(workspacePath, selections);
  }

  /**
   * @description 管理 .gitignore（根据配置自动添加/移除）
   * @param workspacePath {string} 工作区路径
   * @return {Promise<void>}
   */
  private async manageGitignore(workspacePath: string): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.find(
      (folder) => folder.uri.fsPath === workspacePath,
    );

    if (!workspaceFolder) {
      return;
    }

    const config = vscode.workspace.getConfiguration(CONFIG_PREFIX, workspaceFolder.uri);
    const autoGitignore = config.get<boolean>(CONFIG_KEYS.STORAGE_AUTO_GITIGNORE, true);
    const enabled = this.isEnabled(workspaceFolder);
    const relativePath = config.get<string>(
      CONFIG_KEYS.SELECTION_FILE_PATH,
      '.turbo-ai-rules/selections.json',
    );

    try {
      if (!enabled && autoGitignore) {
        // 共享模式关闭：从 .gitignore 移除
        await removeIgnored(workspacePath, [relativePath]);
        Logger.debug('Removed shared selection file from .gitignore', { relativePath });
      } else if (!enabled && !autoGitignore) {
        // 共享模式关闭且不自动管理：添加到 .gitignore（不提交）
        await ensureIgnored(workspacePath, [relativePath]);
        Logger.debug('Added shared selection file to .gitignore', { relativePath });
      }
      // 如果 enabled=true：文件应该被提交，确保不在 .gitignore 中
      else if (enabled) {
        await removeIgnored(workspacePath, [relativePath]);
        Logger.debug('Ensured shared selection file not in .gitignore', { relativePath });
      }
    } catch (error) {
      Logger.warn('Failed to manage .gitignore for shared selection', {
        error: String(error),
        relativePath,
      });
    }
  }

  /**
   * @description 初始化共享选择（首次启用时）
   * @param workspacePath {string} 工作区路径
   * @param currentSelections {Map<string, Set<string>>} 当前内存选择状态
   * @return {Promise<void>}
   */
  public async initialize(
    workspacePath: string,
    currentSelections: Map<string, Set<string>>,
  ): Promise<void> {
    // 检查是否已存在共享文件
    const filePath = this.getFilePath(workspacePath);
    const exists = await pathExists(filePath);

    if (exists) {
      Logger.info('Shared selection file already exists, skipping initialization', { filePath });
      return;
    }

    // 创建新文件
    await this.save(workspacePath, currentSelections);
    Logger.info('Initialized shared selection file', { filePath });
  }
}
