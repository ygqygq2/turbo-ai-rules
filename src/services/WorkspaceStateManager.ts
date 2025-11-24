/**
 * WorkspaceState 管理服务
 * 管理存储在 VSCode workspaceState 中的轻量级元数据和状态
 * 严格控制大小 < 10KB
 */

import * as vscode from 'vscode';

import { SystemError } from '../types/errors';
import { Logger } from '../utils/logger';

/**
 * 规则源同步统计
 */
export interface SourceSyncStats {
  /** 上次同步成功时间 */
  lastSyncTime: string; // ISO 8601
  /** 上次同步成功包含的规则数 */
  syncedRulesCount: number;
  /** 上次同步时用户选择的规则路径（快照） */
  syncedRulePaths: string[];
  /** 同步状态 */
  syncStatus: 'success' | 'failed' | 'never';
  /** 错误信息（如果失败） */
  errorMessage?: string;
}

/**
 * workspaceState 完整数据结构
 * 严格控制大小：< 10KB
 */
interface WorkspaceState {
  /** 同步元数据（< 2KB） */
  syncMetadata: {
    lastSyncTime: { [sourceId: string]: string }; // ISO 时间戳
    sourceHashes: { [sourceId: string]: string }; // 内容哈希
  };

  /** 每个规则源的同步统计（< 3KB） */
  sourceSyncStats: {
    [sourceId: string]: SourceSyncStats;
  };

  /** 规则统计信息（< 1KB） - 用于状态栏显示 */
  rulesStats: {
    totalRules: number; // 所有源的规则总数
    totalSyncedRules: number; // 所有源已同步的规则总数
    sourceCount: number; // 规则源总数
    enabledSourceCount: number; // 已启用的规则源数量
    syncedSourceCount: number; // 至少同步过一次的源数量
  };

  /** UI 状态（< 2KB） */
  uiState: {
    expandedNodes: string[]; // TreeView 展开节点
    selectedSource: string | null; // 当前选中源
    sortOrder: 'priority' | 'name' | 'recent'; // 排序方式
    filterTags: string[]; // 过滤标签
  };

  /** 缓存元数据（< 2KB） */
  cacheMetadata: {
    lruQueue: string[]; // 最近访问的规则 ID
    lastCleanup: string; // 最后清理时间
  };

  /** 版本信息（< 1KB） */
  schemaVersion: number; // 数据结构版本
}

/**
 * 默认 workspaceState
 */
const DEFAULT_WORKSPACE_STATE: WorkspaceState = {
  syncMetadata: {
    lastSyncTime: {},
    sourceHashes: {},
  },
  sourceSyncStats: {},
  rulesStats: {
    totalRules: 0,
    totalSyncedRules: 0,
    sourceCount: 0,
    enabledSourceCount: 0,
    syncedSourceCount: 0,
  },
  uiState: {
    expandedNodes: [],
    selectedSource: null,
    sortOrder: 'priority',
    filterTags: [],
  },
  cacheMetadata: {
    lruQueue: [],
    lastCleanup: new Date().toISOString(),
  },
  schemaVersion: 1,
};

/**
 * WorkspaceState 大小限制（字节）
 */
const MAX_STATE_SIZE = 10 * 1024; // 10KB
const WARN_STATE_SIZE = 8 * 1024; // 8KB

/**
 * WorkspaceState 管理器
 */
export class WorkspaceStateManager {
  private static instance: WorkspaceStateManager;
  private context: vscode.ExtensionContext;
  private cache: WorkspaceState | null = null;

  private constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  /**
   * 获取 WorkspaceStateManager 实例
   */
  public static getInstance(context?: vscode.ExtensionContext): WorkspaceStateManager {
    if (!WorkspaceStateManager.instance) {
      if (!context) {
        throw new Error('WorkspaceStateManager requires ExtensionContext for initialization');
      }
      WorkspaceStateManager.instance = new WorkspaceStateManager(context);
    }
    return WorkspaceStateManager.instance;
  }

  /**
   * 计算数据大小（JSON 序列化后）
   */
  private calculateSize(data: WorkspaceState): number {
    return Buffer.byteLength(JSON.stringify(data), 'utf8');
  }

  /**
   * 检查并警告大小
   */
  private checkSize(state: WorkspaceState): void {
    const size = this.calculateSize(state);

    if (size > MAX_STATE_SIZE) {
      Logger.error(
        'WorkspaceState size exceeds limit',
        new SystemError('WorkspaceState size exceeds 10KB limit', 'TAI-5003'),
        {
          currentSize: size,
          maxSize: MAX_STATE_SIZE,
        },
      );
      throw new SystemError('WorkspaceState size exceeds 10KB limit', 'TAI-5003');
    }

    if (size > WARN_STATE_SIZE) {
      Logger.warn('WorkspaceState size approaching limit', {
        currentSize: size,
        warnSize: WARN_STATE_SIZE,
        maxSize: MAX_STATE_SIZE,
      });
    }
  }

  /**
   * 读取完整状态
   */
  private async readState(): Promise<WorkspaceState> {
    if (this.cache) {
      return this.cache;
    }

    try {
      const stored = this.context.workspaceState.get<WorkspaceState>('turboAiRulesState');

      if (!stored) {
        this.cache = { ...DEFAULT_WORKSPACE_STATE };
        return this.cache;
      }

      // 合并默认值（处理版本升级）
      this.cache = {
        ...DEFAULT_WORKSPACE_STATE,
        ...stored,
        syncMetadata: {
          ...DEFAULT_WORKSPACE_STATE.syncMetadata,
          ...stored.syncMetadata,
        },
        sourceSyncStats: {
          ...DEFAULT_WORKSPACE_STATE.sourceSyncStats,
          ...stored.sourceSyncStats,
        },
        rulesStats: {
          ...DEFAULT_WORKSPACE_STATE.rulesStats,
          ...stored.rulesStats,
        },
        uiState: {
          ...DEFAULT_WORKSPACE_STATE.uiState,
          ...stored.uiState,
        },
        cacheMetadata: {
          ...DEFAULT_WORKSPACE_STATE.cacheMetadata,
          ...stored.cacheMetadata,
        },
      };

      return this.cache;
    } catch (error) {
      Logger.error('Failed to read workspaceState', error as Error);
      this.cache = { ...DEFAULT_WORKSPACE_STATE };
      return this.cache;
    }
  }

  /**
   * 写入完整状态
   */
  private async writeState(state: WorkspaceState): Promise<void> {
    try {
      // 检查大小
      this.checkSize(state);

      // 写入
      await this.context.workspaceState.update('turboAiRulesState', state);
      this.cache = state;

      Logger.debug('WorkspaceState updated', {
        size: this.calculateSize(state),
      });
    } catch (error) {
      Logger.error('Failed to write workspaceState', error as Error);
      throw new SystemError(
        'Failed to write workspaceState',
        'TAI-5003',
        error instanceof Error ? error : undefined,
      );
    }
  }

  // ==================== 同步元数据 ====================

  /**
   * 获取源的最后同步时间
   */
  public async getLastSyncTime(sourceId: string): Promise<string | undefined> {
    const state = await this.readState();
    return state.syncMetadata.lastSyncTime[sourceId];
  }

  /**
   * 设置源的最后同步时间
   */
  public async setLastSyncTime(sourceId: string, timestamp: string): Promise<void> {
    const state = await this.readState();
    state.syncMetadata.lastSyncTime[sourceId] = timestamp;
    await this.writeState(state);
  }

  /**
   * 获取源的内容哈希
   */
  public async getSourceHash(sourceId: string): Promise<string | undefined> {
    const state = await this.readState();
    return state.syncMetadata.sourceHashes[sourceId];
  }

  /**
   * 设置源的内容哈希
   */
  public async setSourceHash(sourceId: string, hash: string): Promise<void> {
    const state = await this.readState();
    state.syncMetadata.sourceHashes[sourceId] = hash;
    await this.writeState(state);
  }

  /**
   * 删除源的同步元数据
   */
  public async deleteSyncMetadata(sourceId: string): Promise<void> {
    const state = await this.readState();
    delete state.syncMetadata.lastSyncTime[sourceId];
    delete state.syncMetadata.sourceHashes[sourceId];
    delete state.sourceSyncStats[sourceId];
    await this.writeState(state);
  }

  // ==================== 规则源同步统计 ====================

  /**
   * @description 获取单个规则源的同步统计
   * @return {Promise<SourceSyncStats | undefined>}
   * @param sourceId {string}
   */
  public async getSourceSyncStats(sourceId: string): Promise<SourceSyncStats | undefined> {
    const state = await this.readState();
    return state.sourceSyncStats[sourceId];
  }

  /**
   * @description 设置单个规则源的同步统计
   * @return {Promise<void>}
   * @param sourceId {string}
   * @param stats {SourceSyncStats}
   */
  public async setSourceSyncStats(sourceId: string, stats: SourceSyncStats): Promise<void> {
    const state = await this.readState();
    state.sourceSyncStats[sourceId] = stats;
    await this.writeState(state);

    Logger.debug('Source sync stats updated', {
      sourceId,
      syncStatus: stats.syncStatus,
      syncedRulesCount: stats.syncedRulesCount,
    });
  }

  /**
   * @description 获取所有规则源的同步统计
   * @return {Promise<{ [sourceId: string]: SourceSyncStats }>}
   */
  public async getAllSourceSyncStats(): Promise<{ [sourceId: string]: SourceSyncStats }> {
    const state = await this.readState();
    return state.sourceSyncStats;
  }

  /**
   * @description 删除规则源的同步统计
   * @return {Promise<void>}
   * @param sourceId {string}
   */
  public async deleteSourceSyncStats(sourceId: string): Promise<void> {
    const state = await this.readState();
    delete state.sourceSyncStats[sourceId];
    await this.writeState(state);
  }

  // ==================== 规则统计信息 ====================

  /**
   * 获取规则统计信息
   */
  public async getRulesStats(): Promise<{
    totalRules: number;
    totalSyncedRules: number;
    sourceCount: number;
    enabledSourceCount: number;
    syncedSourceCount: number;
  }> {
    const state = await this.readState();
    return state.rulesStats;
  }

  /**
   * 设置规则统计信息
   */
  public async setRulesStats(stats: {
    totalRules: number;
    totalSyncedRules: number;
    sourceCount: number;
    enabledSourceCount: number;
    syncedSourceCount: number;
  }): Promise<void> {
    const state = await this.readState();
    state.rulesStats = stats;
    await this.writeState(state);
  }

  // ==================== UI 状态 ====================

  /**
   * 获取展开的节点列表
   */
  public async getExpandedNodes(): Promise<string[]> {
    const state = await this.readState();
    return state.uiState.expandedNodes;
  }

  /**
   * 设置展开的节点列表
   */
  public async setExpandedNodes(nodes: string[]): Promise<void> {
    const state = await this.readState();
    state.uiState.expandedNodes = nodes;
    await this.writeState(state);
  }

  /**
   * 获取选中的源 ID
   */
  public async getSelectedSource(): Promise<string | null> {
    const state = await this.readState();
    return state.uiState.selectedSource;
  }

  /**
   * 设置选中的源 ID
   */
  public async setSelectedSource(sourceId: string | null): Promise<void> {
    const state = await this.readState();
    state.uiState.selectedSource = sourceId;
    await this.writeState(state);
  }

  /**
   * 获取排序方式
   */
  public async getSortOrder(): Promise<'priority' | 'name' | 'recent'> {
    const state = await this.readState();
    return state.uiState.sortOrder;
  }

  /**
   * 设置排序方式
   */
  public async setSortOrder(order: 'priority' | 'name' | 'recent'): Promise<void> {
    const state = await this.readState();
    state.uiState.sortOrder = order;
    await this.writeState(state);
  }

  /**
   * 获取过滤标签
   */
  public async getFilterTags(): Promise<string[]> {
    const state = await this.readState();
    return state.uiState.filterTags;
  }

  /**
   * 设置过滤标签
   */
  public async setFilterTags(tags: string[]): Promise<void> {
    const state = await this.readState();
    state.uiState.filterTags = tags;
    await this.writeState(state);
  }

  // ==================== 缓存元数据 ====================

  /**
   * 获取 LRU 队列
   */
  public async getLruQueue(): Promise<string[]> {
    const state = await this.readState();
    return state.cacheMetadata.lruQueue;
  }

  /**
   * 添加到 LRU 队列（最近访问）
   * 自动限制队列长度（最多 100 项）
   */
  public async addToLruQueue(ruleId: string): Promise<void> {
    const state = await this.readState();
    const queue = state.cacheMetadata.lruQueue;

    // 移除已存在的项
    const index = queue.indexOf(ruleId);
    if (index !== -1) {
      queue.splice(index, 1);
    }

    // 添加到队尾
    queue.push(ruleId);

    // 限制队列长度
    if (queue.length > 100) {
      queue.shift();
    }

    await this.writeState(state);
  }

  /**
   * 获取最后清理时间
   */
  public async getLastCleanup(): Promise<string> {
    const state = await this.readState();
    return state.cacheMetadata.lastCleanup;
  }

  /**
   * 设置最后清理时间
   */
  public async setLastCleanup(timestamp: string): Promise<void> {
    const state = await this.readState();
    state.cacheMetadata.lastCleanup = timestamp;
    await this.writeState(state);
  }

  // ==================== 清理操作 ====================

  /**
   * 清理已删除源的元数据
   */
  public async cleanupDeletedSources(validSourceIds: string[]): Promise<void> {
    const state = await this.readState();
    const validIdSet = new Set(validSourceIds);

    // 清理同步元数据
    for (const sourceId of Object.keys(state.syncMetadata.lastSyncTime)) {
      if (!validIdSet.has(sourceId)) {
        delete state.syncMetadata.lastSyncTime[sourceId];
      }
    }

    for (const sourceId of Object.keys(state.syncMetadata.sourceHashes)) {
      if (!validIdSet.has(sourceId)) {
        delete state.syncMetadata.sourceHashes[sourceId];
      }
    }

    // 清理规则源同步统计
    for (const sourceId of Object.keys(state.sourceSyncStats)) {
      if (!validIdSet.has(sourceId)) {
        delete state.sourceSyncStats[sourceId];
      }
    }

    // 清理 UI 状态
    if (state.uiState.selectedSource && !validIdSet.has(state.uiState.selectedSource)) {
      state.uiState.selectedSource = null;
    }

    await this.writeState(state);
    Logger.info('Cleaned up deleted sources metadata', {
      validSourceCount: validSourceIds.length,
    });
  }

  /**
   * 清理所有 workspaceState
   */
  public async clearAll(): Promise<void> {
    // 创建一个新的默认状态（避免引用问题）
    const freshState: WorkspaceState = {
      syncMetadata: {
        lastSyncTime: {},
        sourceHashes: {},
      },
      sourceSyncStats: {},
      rulesStats: {
        totalRules: 0,
        totalSyncedRules: 0,
        sourceCount: 0,
        enabledSourceCount: 0,
        syncedSourceCount: 0,
      },
      uiState: {
        expandedNodes: [],
        selectedSource: null,
        sortOrder: 'priority',
        filterTags: [],
      },
      cacheMetadata: {
        lruQueue: [],
        lastCleanup: new Date().toISOString(),
      },
      schemaVersion: 1,
    };

    await this.writeState(freshState);
    Logger.info('All workspaceState cleared');
  }

  /**
   * 获取当前状态大小（调试用）
   */
  public async getStateSize(): Promise<number> {
    const state = await this.readState();
    return this.calculateSize(state);
  }
}
