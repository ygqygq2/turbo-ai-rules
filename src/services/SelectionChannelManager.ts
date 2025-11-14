/**
 * 规则选择 MessageChannel 管理器
 * 使用 VSCode MessageChannel 实现左侧树视图与右侧 Webview 的实时同步
 * 优势：专用通道、微秒级延迟、不经过主消息队列
 */

import * as vscode from 'vscode';

import { Logger } from '../utils/logger';
import { WorkspaceDataManager } from './WorkspaceDataManager';

/**
 * 选择状态变更消息
 */
export interface SelectionChangeMessage {
  type: 'selectionChanged';
  sourceId: string;
  selectedPaths: string[];
  totalCount: number;
  timestamp: number;
  // 是否来自持久化操作（用于避免循环更新）
  fromPersistence?: boolean;
}

/**
 * MessageChannel 端口包装
 */
interface ChannelPort {
  sourceId: string;
  port: MessagePort;
  webview: vscode.Webview;
  createdAt: number;
}

/**
 * SelectionChannelManager（单例）
 * 管理规则选择的 MessageChannel 通信
 */
export class SelectionChannelManager {
  private static instance: SelectionChannelManager;

  // 活跃的 MessageChannel 端口（sourceId -> ChannelPort）
  private channels = new Map<string, ChannelPort>();

  // 内存中的选择状态（sourceId -> Set<filePath>）
  private memoryState = new Map<string, Set<string>>();

  // 延时落盘定时器（sourceId -> timeout）
  private persistenceTimers = new Map<string, NodeJS.Timeout>();

  // 延时时间（毫秒）
  private readonly PERSISTENCE_DELAY = 500;

  private constructor() {}

  /**
   * @description 获取 SelectionChannelManager 实例
   * @return {SelectionChannelManager}
   */
  public static getInstance(): SelectionChannelManager {
    if (!SelectionChannelManager.instance) {
      SelectionChannelManager.instance = new SelectionChannelManager();
    }
    return SelectionChannelManager.instance;
  }

  /**
   * @description 为指定源创建 MessageChannel 并初始化 Webview
   * @param sourceId {string} 规则源 ID
   * @param webview {vscode.Webview} Webview 实例
   * @return {void}
   */
  public createChannel(sourceId: string, webview: vscode.Webview): void {
    // 关闭旧通道
    this.closeChannel(sourceId);

    // 创建新的 MessageChannel
    const channel = new MessageChannel();

    // 设置端口 1 的消息监听器（Extension 端）
    channel.port1.onmessage = (event: MessageEvent<SelectionChangeMessage>) => {
      this.handleWebviewMessage(sourceId, event.data);
    };

    // 启动端口
    channel.port1.start();

    // 将端口 2 传递给 Webview
    webview.postMessage(
      {
        type: 'initSelectionChannel',
        sourceId,
        port: channel.port2,
      },
      [channel.port2],
    );

    // 保存通道信息
    this.channels.set(sourceId, {
      sourceId,
      port: channel.port1,
      webview,
      createdAt: Date.now(),
    });

    Logger.info('MessageChannel created for source', { sourceId });
  }

  /**
   * @description 处理来自 Webview 的消息
   * @param sourceId {string} 规则源 ID
   * @param message {SelectionChangeMessage} 消息内容
   * @return {void}
   */
  private handleWebviewMessage(sourceId: string, message: SelectionChangeMessage): void {
    if (message.type !== 'selectionChanged') {
      Logger.warn('Unknown message type from webview', { type: message.type });
      return;
    }

    Logger.debug('Received selection change from webview', {
      sourceId,
      selectedCount: message.selectedPaths.length,
      totalCount: message.totalCount,
    });

    // 更新内存状态（不立即落盘）
    this.updateMemoryState(sourceId, message.selectedPaths, message.totalCount, false);

    // 触发延时落盘（右侧 Webview 也会延时落盘，但可通过"确认"按钮立即落盘）
    this.schedulePersistence(sourceId);
  }

  /**
   * @description 更新内存中的选择状态并广播到所有监听者
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

    // 通过 MessageChannel 广播到 Webview
    const channelPort = this.channels.get(sourceId);
    if (channelPort) {
      const message: SelectionChangeMessage = {
        type: 'selectionChanged',
        sourceId,
        selectedPaths,
        totalCount,
        timestamp: Date.now(),
        fromPersistence: false,
      };

      channelPort.port.postMessage(message);

      Logger.debug('Broadcasted selection change via MessageChannel', {
        sourceId,
        selectedCount: selectedPaths.length,
        totalCount,
      });
    }

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

      // 通知持久化完成（通过 MessageChannel）
      const channelPort = this.channels.get(sourceId);
      if (channelPort) {
        const message: SelectionChangeMessage = {
          type: 'selectionChanged',
          sourceId,
          selectedPaths: Array.from(selectedPaths),
          totalCount: selectedPaths.size,
          timestamp: Date.now(),
          fromPersistence: true,
        };

        channelPort.port.postMessage(message);
      }
    } catch (error) {
      Logger.error('Failed to persist selection', error as Error, { sourceId });
      throw error;
    } finally {
      // 清除定时器
      this.persistenceTimers.delete(sourceId);
    }
  }

  /**
   * @description 关闭指定源的 MessageChannel
   * @param sourceId {string} 规则源 ID
   * @return {void}
   */
  public closeChannel(sourceId: string): void {
    const channelPort = this.channels.get(sourceId);
    if (channelPort) {
      channelPort.port.close();
      this.channels.delete(sourceId);
      Logger.info('MessageChannel closed for source', { sourceId });
    }

    // 清除延时定时器
    const timer = this.persistenceTimers.get(sourceId);
    if (timer) {
      clearTimeout(timer);
      this.persistenceTimers.delete(sourceId);
    }
  }

  /**
   * @description 关闭所有 MessageChannel
   * @return {void}
   */
  public closeAllChannels(): void {
    for (const sourceId of this.channels.keys()) {
      this.closeChannel(sourceId);
    }
    this.memoryState.clear();
    Logger.info('All MessageChannels closed');
  }

  /**
   * @description 释放资源
   * @return {void}
   */
  public dispose(): void {
    this.closeAllChannels();
  }
}
