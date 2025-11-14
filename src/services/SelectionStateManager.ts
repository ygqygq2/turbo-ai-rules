/**
 * 规则选择状态管理器
 * 实现左侧树视图和右侧选择器的内存状态同步
 * 左侧延时落盘，右侧通过确认按钮落盘
 */

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';
import { WorkspaceDataManager } from './WorkspaceDataManager';

/**
 * 选择状态变更事件
 */
export interface SelectionStateChangeEvent {
  sourceId: string;
  selectedPaths: string[];
  totalCount: number;
  timestamp: number;
  // 是否来自持久化操作（用于避免循环更新）
  fromPersistence?: boolean;
}

/**
 * 选择状态管理器（单例）
 */
export class SelectionStateManager {
  private static instance: SelectionStateManager;
  private _onSelectionChanged = new vscode.EventEmitter<SelectionStateChangeEvent>();

  // 内存中的选择状态（sourceId -> Set<filePath>）
  private memoryState = new Map<string, Set<string>>();

  // 延时落盘定时器（sourceId -> timeout）
  private persistenceTimers = new Map<string, NodeJS.Timeout>();

  // 延时时间（毫秒）
  private readonly PERSISTENCE_DELAY = 500;

  /**
   * 选择状态变更事件
   */
  public readonly onSelectionChanged = this._onSelectionChanged.event;

  private constructor() {}

  /**
   * 获取 SelectionStateManager 实例
   */
  public static getInstance(): SelectionStateManager {
    if (!SelectionStateManager.instance) {
      SelectionStateManager.instance = new SelectionStateManager();
    }
    return SelectionStateManager.instance;
  }

  /**
   * @description 更新内存中的选择状态（不立即落盘）
   * @param sourceId {string} 规则源 ID
   * @param selectedPaths {string[]} 已选择的规则路径
   * @param totalCount {number} 总规则数量
   * @param schedulePersistence {boolean} 是否安排延时落盘
   * @return {void}
   */
  public updateMemoryState(
    sourceId: string,
    selectedPaths: string[],
    totalCount: number,
    schedulePersistence = false,
  ): void {
    // 更新内存状态
    this.memoryState.set(sourceId, new Set(selectedPaths));

    // 触发内存状态变更事件
    const event: SelectionStateChangeEvent = {
      sourceId,
      selectedPaths,
      totalCount,
      timestamp: Date.now(),
      fromPersistence: false,
    };

    Logger.debug('Memory state updated', {
      sourceId,
      selectedCount: selectedPaths.length,
      totalCount,
      schedulePersistence,
    });
    this._onSelectionChanged.fire(event);

    // 如果需要延时落盘（左侧树视图）
    if (schedulePersistence) {
      this.schedulePersistence(sourceId);
    }
  }

  /**
   * @description 获取内存中的选择状态
   * @param sourceId {string} 规则源 ID
   * @return {string[] | undefined}
   */
  public getMemoryState(sourceId: string): string[] | undefined {
    const state = this.memoryState.get(sourceId);
    return state ? Array.from(state) : undefined;
  }

  /**
   * @description 安排延时落盘
   * @param sourceId {string} 规则源 ID
   * @return {void}
   */
  private schedulePersistence(sourceId: string): void {
    // 清除旧的定时器
    const existingTimer = this.persistenceTimers.get(sourceId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // 设置新的延时落盘定时器
    const timer = setTimeout(() => {
      this.persistToDisk(sourceId).catch((error) => {
        Logger.error('Failed to persist selection to disk', error as Error, { sourceId });
      });
    }, this.PERSISTENCE_DELAY);

    this.persistenceTimers.set(sourceId, timer);
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
    const dataManager = WorkspaceDataManager.getInstance();

    try {
      await dataManager.setRuleSelection(workspacePath, sourceId, {
        mode: 'include',
        paths: Array.from(selectedPaths),
      });

      Logger.info('Selection persisted to disk', {
        sourceId,
        selectedCount: selectedPaths.size,
      });

      // 触发持久化完成事件
      this._onSelectionChanged.fire({
        sourceId,
        selectedPaths: Array.from(selectedPaths),
        totalCount: selectedPaths.size,
        timestamp: Date.now(),
        fromPersistence: true,
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
   * @description 触发选择状态变更事件（兼容旧代码）
   * @param sourceId {string} 规则源 ID
   * @param selectedCount {number} 已选择的规则数量
   * @param totalCount {number} 总规则数量
   * @return {void}
   */
  public notifySelectionChanged(sourceId: string, selectedCount: number, totalCount: number): void {
    Logger.debug('Legacy notification (deprecated)', {
      sourceId,
      selectedCount,
      totalCount,
    });
  }

  /**
   * @description 释放资源
   * @return {void}
   */
  public dispose(): void {
    // 清除所有延时定时器
    for (const timer of this.persistenceTimers.values()) {
      clearTimeout(timer);
    }
    this.persistenceTimers.clear();
    this.memoryState.clear();
    this._onSelectionChanged.dispose();
  }
}
