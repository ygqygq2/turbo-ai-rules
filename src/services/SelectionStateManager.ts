/**
 * 规则选择状态管理器（单一数据源）
 * 负责管理所有规则源的选择状态，提供统一的读写接口
 */

import * as path from 'path';
import * as vscode from 'vscode';

import { Logger } from '../utils/logger';
import { toRelativePaths } from '../utils/rulePath';
import { SharedSelectionManager } from './SharedSelectionManager';
import type { RuleSelection } from './WorkspaceDataManager';
import { WorkspaceDataManager } from './WorkspaceDataManager';

/**
 * 状态变更事件
 */
export interface SelectionStateChangeEvent {
  sourceId: string;
  selectedPaths: string[];
  totalCount: number;
  timestamp: number;
}

/**
 * 状态变更监听器
 */
export type SelectionStateChangeListener = (event: SelectionStateChangeEvent) => void;

/**
 * SelectionStateManager（单例）
 * 作为规则选择状态的唯一权威数据源（Single Source of Truth）
 */
export class SelectionStateManager {
  private static instance: SelectionStateManager;

  // 内存中的选择状态（sourceId -> Set<relativePath>）
  // 统一存储相对路径，减少冗余数据
  private memoryState = new Map<string, Set<string>>();

  // 规则总数缓存（sourceId -> totalCount）
  private totalCountCache = new Map<string, number>();

  // 工作区路径缓存（sourceId -> workspacePath）
  // 用于延时持久化时知道保存到哪个工作区
  private workspacePathCache = new Map<string, string>();

  // 状态变更监听器
  private listeners: SelectionStateChangeListener[] = [];

  // 延时持久化定时器（sourceId -> timeout）
  private persistenceTimers = new Map<string, NodeJS.Timeout>();

  // 延时时间（毫秒）
  private readonly PERSISTENCE_DELAY = 500;

  private workspaceDataManager: WorkspaceDataManager;
  private sharedManager: SharedSelectionManager;

  private constructor() {
    this.workspaceDataManager = WorkspaceDataManager.getInstance();
    this.sharedManager = SharedSelectionManager.getInstance();
  }

  /**
   * @description 获取 SelectionStateManager 实例
   * @return {SelectionStateManager}
   */
  public static getInstance(): SelectionStateManager {
    if (!SelectionStateManager.instance) {
      SelectionStateManager.instance = new SelectionStateManager();
    }
    return SelectionStateManager.instance;
  }

  /**
   * @description 初始化源的选择状态（从磁盘加载）
   * @param sourceId {string} 规则源 ID
   * @param totalCount {number} 规则总数
   * @param _allRulePaths {string[]} 保留参数以兼容旧代码（不再使用）
   * @return {Promise<string[]>} 选择的路径列表
   */
  public async initializeState(
    sourceId: string,
    totalCount: number,
    _allRulePaths?: string[],
  ): Promise<string[]> {
    // 缓存规则总数
    this.totalCountCache.set(sourceId, totalCount);

    // 如果内存中已有状态，直接返回
    if (this.memoryState.has(sourceId)) {
      return Array.from(this.memoryState.get(sourceId)!);
    }

    // 优先从共享选择文件加载（如果启用了共享选择）
    const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (workspacePath && this.sharedManager.isEnabled(workspaceFolder)) {
      try {
        const sharedData = await this.sharedManager.load(workspacePath);
        if (sharedData?.selections[sourceId]) {
          const paths = sharedData.selections[sourceId].paths || [];
          this.memoryState.set(sourceId, new Set(paths));

          Logger.info('Selection state initialized from shared file', {
            sourceId,
            selectedCount: paths.length,
            totalCount,
          });

          return paths;
        }
      } catch (error) {
        Logger.warn('Failed to load from shared selection file, falling back to workspace state', {
          error: String(error),
          sourceId,
        });
      }
    }

    // 从 WorkspaceDataManager 加载（兼容旧版本或未启用共享选择时）
    try {
      const selection = await this.workspaceDataManager.getRuleSelection(sourceId);
      let paths: string[] = [];

      if (selection) {
        // 兼容旧格式（有 mode 字段）
        if ('mode' in selection) {
          const legacySelection = selection as {
            mode: 'include' | 'exclude';
            paths?: string[];
            excludePaths?: string[];
          };

          if (legacySelection.mode === 'include') {
            const savedPaths = legacySelection.paths || [];

            // 兼容性处理：如果磁盘中存储的是绝对路径，转换为相对路径
            const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
            if (savedPaths.length > 0 && workspacePath && path.isAbsolute(savedPaths[0])) {
              Logger.info('Converting legacy absolute paths to relative paths', {
                sourceId,
                pathCount: savedPaths.length,
                samplePath: savedPaths[0],
              });
              paths = toRelativePaths(savedPaths, workspacePath);
            } else {
              paths = savedPaths;
            }
          } else {
            // exclude 模式：转换为空选择（用户需要重新选择）
            Logger.warn('Legacy exclude mode detected, converting to empty selection', {
              sourceId,
              excludePathsCount: legacySelection.excludePaths?.length || 0,
            });
            paths = [];
          }
        } else {
          // 新格式：直接使用 paths
          const savedPaths = selection.paths || [];

          // 兼容性处理：如果是绝对路径，转换为相对路径
          const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
          if (savedPaths.length > 0 && workspacePath && path.isAbsolute(savedPaths[0])) {
            Logger.info('Converting legacy absolute paths to relative paths', {
              sourceId,
              pathCount: savedPaths.length,
              samplePath: savedPaths[0],
            });
            paths = toRelativePaths(savedPaths, workspacePath);
          } else {
            paths = savedPaths;
          }
        }
      } else {
        // 如果没有保存的选择状态，默认全不选（等待用户主动勾选）
        paths = [];
      }

      this.memoryState.set(sourceId, new Set(paths));

      Logger.debug('Selection state initialized from disk', {
        sourceId,
        selectedCount: paths.length,
        totalCount,
        defaultToAll: !selection && paths.length > 0,
      });

      return paths;
    } catch (error) {
      Logger.error('Failed to initialize selection state', error as Error, { sourceId });
      // 出错时默认全不选（等待用户主动勾选）
      this.memoryState.set(sourceId, new Set([]));
      return [];
    }
  }

  /**
   * @description 获取选择状态
   * @param sourceId {string} 规则源 ID
   * @return {string[]} 选择的路径列表
   */
  public getSelection(sourceId: string): string[] {
    const state = this.memoryState.get(sourceId);
    return state ? Array.from(state) : [];
  }

  /**
   * @description 获取选择数量
   * @param sourceId {string} 规则源 ID
   * @return {number} 选择的规则数量
   */
  public getSelectionCount(sourceId: string): number {
    const state = this.memoryState.get(sourceId);
    if (!state) {
      // 如果没有初始化，返回 0（需要先调用 initializeState）
      return 0;
    }
    return state.size;
  }

  /**
   * @description 更新选择状态
   * @param sourceId {string} 规则源 ID
   * @param selectedPaths {string[]} 选择的路径列表
   * @param schedulePersistence {boolean} 是否安排延时持久化（默认 true）
   * @param workspacePath {string} 可选的工作区路径（用于持久化）
   */
  public updateSelection(
    sourceId: string,
    selectedPaths: string[],
    schedulePersistence: boolean = true,
    workspacePath?: string,
  ): void {
    // 更新内存状态
    this.memoryState.set(sourceId, new Set(selectedPaths));

    // 缓存 workspacePath（如果提供）
    if (workspacePath) {
      this.workspacePathCache.set(sourceId, workspacePath);
    }

    // 触发状态变更事件
    const totalCount = this.totalCountCache.get(sourceId) || selectedPaths.length;
    this.notifyListeners({
      sourceId,
      selectedPaths,
      totalCount,
      timestamp: Date.now(),
    });

    // 安排延时持久化
    if (schedulePersistence) {
      this.schedulePersistence(sourceId);
    }

    Logger.debug('Selection state updated', {
      sourceId,
      selectedCount: selectedPaths.length,
      totalCount,
    });
  }

  /**
   * @description 立即持久化到磁盘
   * @param sourceId {string} 规则源 ID
   * @param workspacePath {string} 可选的工作区路径（默认使用第一个工作区）
   * @return {Promise<void>}
   */
  public async persistToDisk(sourceId: string, workspacePath?: string): Promise<void> {
    const selectedPaths = this.memoryState.get(sourceId);
    if (!selectedPaths) {
      Logger.warn('No memory state found for persistence', { sourceId });
      return;
    }

    // 如果没有提供 workspacePath，则使用第一个工作区
    if (!workspacePath) {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        Logger.warn('No workspace folder found for persistence');
        return;
      }
      workspacePath = workspaceFolders[0].uri.fsPath;
    }

    try {
      // 内存中已经是相对路径，但使用 toRelativePaths 做安全检查（处理可能的历史绝对路径数据）
      const relativePaths = toRelativePaths(Array.from(selectedPaths), sourceId);

      const selection: RuleSelection = {
        paths: relativePaths,
      };

      await this.workspaceDataManager.setRuleSelection(workspacePath, sourceId, selection);

      Logger.debug('Selection persisted to disk (relative paths)', {
        sourceId,
        workspacePath,
        selectedCount: relativePaths.length,
        samplePath: relativePaths[0],
      });

      // 如果启用共享模式，同时保存到工作区文件
      const workspaceFolder = vscode.workspace.workspaceFolders?.find(
        (folder) => folder.uri.fsPath === workspacePath,
      );
      if (this.sharedManager.isEnabled(workspaceFolder)) {
        await this.sharedManager.save(workspacePath, this.memoryState).catch((err) => {
          Logger.warn('Failed to save to shared selection file', {
            error: String(err),
            sourceId,
          });
        });
      }
    } catch (error) {
      Logger.error('Failed to persist selection', error as Error, { sourceId, workspacePath });
      throw error;
    } finally {
      // 清除定时器
      this.persistenceTimers.delete(sourceId);
    }
  }

  /**
   * @description 注册状态变更监听器
   * @param listener {SelectionStateChangeListener} 监听器函数
   * @return {() => void} 取消监听的函数
   */
  public onStateChanged(listener: SelectionStateChangeListener): () => void {
    this.listeners.push(listener);

    // 返回取消监听函数
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * @description 通知所有监听器
   * @param event {SelectionStateChangeEvent} 状态变更事件
   */
  private notifyListeners(event: SelectionStateChangeEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (error) {
        Logger.error('Error in state change listener', error as Error);
      }
    });
  }

  /**
   * @description 安排延时持久化
   * @param sourceId {string} 规则源 ID
   */
  private schedulePersistence(sourceId: string): void {
    // 清除旧的定时器
    const existingTimer = this.persistenceTimers.get(sourceId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 设置新的延时持久化定时器
    const timer = setTimeout(() => {
      // 使用缓存的 workspacePath（如果有）
      const workspacePath = this.workspacePathCache.get(sourceId);
      this.persistToDisk(sourceId, workspacePath).catch((error) => {
        Logger.error('Failed to persist selection to disk', error as Error, { sourceId });
      });
    }, this.PERSISTENCE_DELAY);

    this.persistenceTimers.set(sourceId, timer);
  }

  /**
   * @description 清除源的状态
   * @param sourceId {string} 规则源 ID
   */
  public clearState(sourceId: string): void {
    this.memoryState.delete(sourceId);
    this.totalCountCache.delete(sourceId);
    this.workspacePathCache.delete(sourceId);

    const timer = this.persistenceTimers.get(sourceId);
    if (timer) {
      clearTimeout(timer);
      this.persistenceTimers.delete(sourceId);
    }

    Logger.info('Selection state cleared', { sourceId });
  }

  /**
   * @description 释放资源
   */
  public dispose(): void {
    // 清除所有定时器
    for (const timer of this.persistenceTimers.values()) {
      clearTimeout(timer);
    }
    this.persistenceTimers.clear();

    // 清除状态
    this.memoryState.clear();
    this.totalCountCache.clear();
    this.workspacePathCache.clear();

    // 清除监听器
    this.listeners = [];

    Logger.info('SelectionStateManager disposed');
  }

  // ==================== 共享选择状态 API（委托模式）====================

  /**
   * @description 导入工作区共享选择状态
   * @param workspacePath {string} 工作区路径
   * @param mergeMode {'replace' | 'merge'} 合并模式
   * @return {Promise<number>} 导入的源数量
   */
  public async importSharedSelection(
    workspacePath: string,
    mergeMode: 'replace' | 'merge' = 'replace',
  ): Promise<number> {
    const imported = await this.sharedManager.import(workspacePath, this.memoryState, mergeMode);

    // 更新内存状态
    let importedCount = 0;
    for (const [sourceId, paths] of imported.entries()) {
      this.memoryState.set(sourceId, paths);
      // 持久化到本地缓存
      await this.persistToDisk(sourceId, workspacePath);
      importedCount++;
    }

    return importedCount;
  }

  /**
   * @description 导出选择状态到工作区共享文件
   * @param workspacePath {string} 工作区路径
   * @return {Promise<void>}
   */
  public async exportSharedSelection(workspacePath: string): Promise<void> {
    await this.sharedManager.export(workspacePath, this.memoryState);
  }

  /**
   * @description 初始化共享选择（首次启用时）
   * @param workspacePath {string} 工作区路径
   * @return {Promise<void>}
   */
  public async initializeSharedSelection(workspacePath: string): Promise<void> {
    await this.sharedManager.initialize(workspacePath, this.memoryState);
  }

  /**
   * @description 检查是否启用共享选择
   * @param workspaceFolder {vscode.WorkspaceFolder} 工作区文件夹
   * @return {boolean}
   */
  public isSharedSelectionEnabled(workspaceFolder?: vscode.WorkspaceFolder): boolean {
    return this.sharedManager.isEnabled(workspaceFolder);
  }
}
