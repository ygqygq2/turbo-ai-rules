/**
 * 规则选择状态管理器（单一数据源）
 * 负责管理所有规则源的选择状态，提供统一的读写接口
 */

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';
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

  // 内存中的选择状态（sourceId -> Set<filePath>）
  private memoryState = new Map<string, Set<string>>();

  // 规则总数缓存（sourceId -> totalCount）
  private totalCountCache = new Map<string, number>();

  // 状态变更监听器
  private listeners: SelectionStateChangeListener[] = [];

  // 延时持久化定时器（sourceId -> timeout）
  private persistenceTimers = new Map<string, NodeJS.Timeout>();

  // 延时时间（毫秒）
  private readonly PERSISTENCE_DELAY = 500;

  private workspaceDataManager: WorkspaceDataManager;

  private constructor() {
    this.workspaceDataManager = WorkspaceDataManager.getInstance();
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
   * @return {Promise<string[]>} 选择的路径列表
   */
  public async initializeState(sourceId: string, totalCount: number): Promise<string[]> {
    // 缓存规则总数
    this.totalCountCache.set(sourceId, totalCount);

    // 如果内存中已有状态，直接返回
    if (this.memoryState.has(sourceId)) {
      return Array.from(this.memoryState.get(sourceId)!);
    }

    // 从磁盘加载
    try {
      const selection = await this.workspaceDataManager.getRuleSelection(sourceId);
      let paths: string[] = [];

      if (selection) {
        if (selection.mode === 'include') {
          paths = selection.paths || [];
        } else {
          // exclude 模式暂不支持，默认全选
          Logger.warn('Exclude mode not supported, defaulting to all selected');
          paths = [];
        }
      }

      // 如果没有配置或配置为空，默认全选（使用空数组表示）
      // 注意：空数组会在 UI 层解释为"需要全选"
      this.memoryState.set(sourceId, new Set(paths));

      Logger.info('Selection state initialized from disk', {
        sourceId,
        selectedCount: paths.length,
        totalCount,
      });

      return paths;
    } catch (error) {
      Logger.error('Failed to initialize selection state', error as Error, { sourceId });
      // 出错时默认全选
      this.memoryState.set(sourceId, new Set());
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
      // 如果没有初始化，默认全选
      return this.totalCountCache.get(sourceId) || 0;
    }
    return state.size === 0 ? this.totalCountCache.get(sourceId) || 0 : state.size;
  }

  /**
   * @description 更新选择状态
   * @param sourceId {string} 规则源 ID
   * @param selectedPaths {string[]} 选择的路径列表
   * @param schedulePersistence {boolean} 是否安排延时持久化（默认 true）
   */
  public updateSelection(
    sourceId: string,
    selectedPaths: string[],
    schedulePersistence: boolean = true,
  ): void {
    // 更新内存状态
    this.memoryState.set(sourceId, new Set(selectedPaths));

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
   * @return {Promise<void>}
   */
  public async persistToDisk(sourceId: string): Promise<void> {
    const selectedPaths = this.memoryState.get(sourceId);
    if (!selectedPaths) {
      Logger.warn('No memory state found for persistence', { sourceId });
      return;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      Logger.warn('No workspace folder found for persistence');
      return;
    }

    const workspacePath = workspaceFolders[0].uri.fsPath;

    try {
      const selection: RuleSelection = {
        mode: 'include',
        paths: Array.from(selectedPaths),
      };

      await this.workspaceDataManager.setRuleSelection(workspacePath, sourceId, selection);

      Logger.info('Selection persisted to disk', {
        sourceId,
        selectedCount: selectedPaths.size,
      });
    } catch (error) {
      Logger.error('Failed to persist selection', error as Error, { sourceId });
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
      this.persistToDisk(sourceId).catch((error) => {
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

    // 清除监听器
    this.listeners = [];

    Logger.info('SelectionStateManager disposed');
  }
}
