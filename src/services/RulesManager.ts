/**
 * 规则管理器
 * 负责规则的索引、搜索、缓存和冲突解决
 */

import type { ConflictStrategy, ParsedRule, RuleConflict, SearchFilters } from '../types/rules';
import { LRU_CACHE_SIZE } from '../utils/constants';
import { Logger } from '../utils/logger';
import { ConfigManager } from './ConfigManager';

/**
 * LRU 缓存实现
 */
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // LRU: 重新插入到末尾
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // 如果超过最大值，删除最旧的（第一个）
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

/**
 * 规则管理器
 */
export class RulesManager {
  private static instance: RulesManager;
  private rulesCache: LRUCache<string, ParsedRule>;
  private rulesIndex: Map<string, ParsedRule[]>; // sourceId -> rules
  private conflictsCache: RuleConflict[] | null = null; // 缓存冲突检测结果

  private constructor() {
    this.rulesCache = new LRUCache(LRU_CACHE_SIZE);
    this.rulesIndex = new Map();
  }

  /**
   * 获取 RulesManager 实例
   */
  public static getInstance(): RulesManager {
    if (!RulesManager.instance) {
      RulesManager.instance = new RulesManager();
    }
    return RulesManager.instance;
  }

  /**
   * 添加规则到索引
   * @param sourceId 规则源 ID
   * @param rules 规则列表
   */
  public addRules(sourceId: string, rules: ParsedRule[]): void {
    Logger.info('Adding rules to index', { sourceId, count: rules.length });

    this.rulesIndex.set(sourceId, rules);

    // 更新缓存
    for (const rule of rules) {
      const cacheKey = `${sourceId}:${rule.id}`;
      this.rulesCache.set(cacheKey, rule);
    }

    // 清除冲突缓存，因为规则已更新
    this.conflictsCache = null;

    Logger.debug('Rules added to index', {
      sourceId,
      count: rules.length,
      cacheSize: this.rulesCache.size,
    });
  }

  /**
   * 获取指定源的所有规则
   * @param sourceId 规则源 ID
   * @returns 规则列表
   */
  public getRulesBySource(sourceId: string): ParsedRule[] {
    return this.rulesIndex.get(sourceId) || [];
  }

  /**
   * 获取所有规则
   * @returns 所有规则的列表
   */
  public getAllRules(): ParsedRule[] {
    const allRules: ParsedRule[] = [];

    for (const rules of this.rulesIndex.values()) {
      allRules.push(...rules);
    }

    return allRules;
  }

  /**
   * 根据 ID 获取规则
   * @param ruleId 规则 ID
   * @param sourceId 规则源 ID（可选）
   * @returns 规则或 undefined
   */
  public getRuleById(ruleId: string, sourceId?: string): ParsedRule | undefined {
    if (sourceId) {
      const cacheKey = `${sourceId}:${ruleId}`;
      const cached = this.rulesCache.get(cacheKey);
      if (cached) {
        return cached;
      }

      const rules = this.getRulesBySource(sourceId);
      return rules.find((r) => r.id === ruleId);
    }

    // 如果没有指定源，搜索所有源
    for (const rules of this.rulesIndex.values()) {
      const found = rules.find((r) => r.id === ruleId);
      if (found) {
        return found;
      }
    }

    return undefined;
  }

  /**
   * 搜索规则
   * @param query 搜索查询
   * @param filters 搜索过滤器
   * @returns 匹配的规则列表
   */
  public search(query: string, filters?: SearchFilters): ParsedRule[] {
    Logger.debug('Searching rules', { query, filters });

    const allRules = this.getAllRules();
    const lowerQuery = query.toLowerCase();

    const results = allRules.filter((rule) => {
      // 搜索 ID、标题和内容
      const matchesQuery =
        rule.id.toLowerCase().includes(lowerQuery) ||
        rule.title.toLowerCase().includes(lowerQuery) ||
        rule.content.toLowerCase().includes(lowerQuery);

      if (!matchesQuery) {
        return false;
      }

      // 应用过滤器
      if (filters) {
        // 标签过滤
        if (filters.tags && filters.tags.length > 0) {
          const ruleTags = rule.metadata.tags || [];
          const hasMatchingTag = filters.tags.some((tag) => ruleTags.includes(tag));
          if (!hasMatchingTag) {
            return false;
          }
        }

        // 优先级过滤
        if (filters.priority && rule.metadata.priority !== filters.priority) {
          return false;
        }

        // 源过滤
        if (filters.sourceId && rule.sourceId !== filters.sourceId) {
          return false;
        }
      }

      return true;
    });

    Logger.debug('Search complete', { query, resultCount: results.length });

    return results;
  }

  /**
   * 按标签过滤规则
   * @param tags 标签列表
   * @returns 匹配的规则列表
   */
  public filterByTags(tags: string[]): ParsedRule[] {
    return this.search('', { tags });
  }

  /**
   * 按优先级排序规则
   * @param rules 规则列表
   * @returns 排序后的规则列表
   */
  public sortByPriority(rules: ParsedRule[]): ParsedRule[] {
    const priorityOrder = { high: 3, medium: 2, low: 1 };

    return [...rules].sort((a, b) => {
      const aPriority = a.metadata.priority || 'low';
      const bPriority = b.metadata.priority || 'low';
      return priorityOrder[bPriority] - priorityOrder[aPriority];
    });
  }

  /**
   * 检测规则冲突
   * @returns 冲突列表
   */
  public detectConflicts(): RuleConflict[] {
    // 使用缓存避免重复计算
    if (this.conflictsCache !== null) {
      return this.conflictsCache;
    }

    const allRules = this.getAllRules();
    const conflicts: RuleConflict[] = [];

    // 按 ID 分组
    const groupedById = new Map<string, ParsedRule[]>();
    for (const rule of allRules) {
      const existing = groupedById.get(rule.id) || [];
      existing.push(rule);
      groupedById.set(rule.id, existing);
    }

    // 找出冲突
    for (const [ruleId, rules] of groupedById.entries()) {
      if (rules.length > 1) {
        // 推荐使用优先级最高的
        const sortedByPriority = this.sortByPriority(rules);

        conflicts.push({
          ruleId,
          conflictingRules: rules,
          recommended: sortedByPriority[0],
          type: 'duplicate-id',
        });
      }
    }

    // 只在检测到冲突时记录简要警告
    if (conflicts.length > 0) {
      Logger.warn('Rule conflicts detected', {
        count: conflicts.length,
        ruleIds: conflicts.map((c) => c.ruleId),
      });
    }

    // 缓存结果
    this.conflictsCache = conflicts;
    return conflicts;
  }
  /**
   * 合并规则（解决冲突）
   * @param strategy 冲突解决策略
   * @returns 合并后的规则列表
   */
  public mergeRules(strategy: ConflictStrategy = 'priority'): ParsedRule[] {
    const allRules = this.getAllRules();

    if (strategy === 'skip-duplicates') {
      // 跳过重复，只保留第一个
      const seen = new Set<string>();
      return allRules.filter((rule) => {
        if (seen.has(rule.id)) {
          return false;
        }
        seen.add(rule.id);
        return true;
      });
    }

    if (strategy === 'priority') {
      // 按优先级保留
      const groupedById = new Map<string, ParsedRule[]>();
      for (const rule of allRules) {
        const existing = groupedById.get(rule.id) || [];
        existing.push(rule);
        groupedById.set(rule.id, existing);
      }

      const merged: ParsedRule[] = [];
      for (const rules of groupedById.values()) {
        if (rules.length === 1) {
          merged.push(rules[0]);
        } else {
          // 选择优先级最高的
          const sortedByPriority = this.sortByPriority(rules);
          merged.push(sortedByPriority[0]);
        }
      }

      return merged;
    }

    // 默认返回所有规则
    return allRules;
  }

  /**
   * 移除指定源的规则
   * @param sourceId 规则源 ID
   */
  public removeRules(sourceId: string): void {
    this.rulesIndex.delete(sourceId);
    // 清除冲突缓存
    this.conflictsCache = null;
    Logger.info('Rules removed from index', { sourceId });
  }

  /**
   * 清除指定源的规则（removeRules 的别名）
   * @param sourceId 规则源 ID
   */
  public clearSource(sourceId: string): void {
    this.removeRules(sourceId);
  }

  /**
   * 清空所有规则
   */
  public clear(): void {
    this.rulesIndex.clear();
    this.rulesCache.clear();
    this.conflictsCache = null;
    Logger.info('All rules cleared from index');
  }
  /**
   * 清除所有规则
   */
  public clearAll(): void {
    this.rulesIndex.clear();
    this.rulesCache.clear();
    Logger.info('All rules cleared');
  }

  /**
   * 重建缓存
   */
  private rebuildCache(): void {
    this.rulesCache.clear();

    for (const [sourceId, rules] of this.rulesIndex.entries()) {
      for (const rule of rules) {
        const cacheKey = `${sourceId}:${rule.id}`;
        this.rulesCache.set(cacheKey, rule);
      }
    }
  }

  /**
   * 获取统计信息
   */
  public getStats(): {
    totalRules: number;
    sourceCount: number;
    enabledSourceCount: number;
    cacheSize: number;
    conflictCount: number;
  } {
    const conflicts = this.detectConflicts();
    const configManager = ConfigManager.getInstance();
    const sources = configManager.getSources();
    const enabledSources = sources.filter((s) => s.enabled !== false);

    return {
      totalRules: this.getAllRules().length,
      sourceCount: this.rulesIndex.size,
      enabledSourceCount: enabledSources.length,
      cacheSize: this.rulesCache.size,
      conflictCount: conflicts.length,
    };
  }
}
