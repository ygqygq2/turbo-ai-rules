/**
 * 规则源详情页面数据助手
 * 处理数据加载、统计计算等工具方法
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import { ConfigManager } from '../../services/ConfigManager';
import { RulesManager } from '../../services/RulesManager';
import { formatBytes } from '../../utils/format';
import { Logger } from '../../utils/logger';
import type { ParsedRule, RuleSource } from '../types';

/**
 * 规则源统计信息
 */
export interface SourceStatistics {
  totalRules: number;
  priorityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  topTags: Array<{ tag: string; count: number }>;
  createdAt?: string;
  lastUpdated?: string;
  totalSyncs?: number;
}

/**
 * 同步信息
 */
export interface SyncInfo {
  lastSynced?: string;
  status: 'success' | 'error' | 'never';
  message?: string;
  cacheSize?: string;
  nextAutoSync?: string;
}

/**
 * 规则源详情数据
 */
export interface SourceDetailData {
  source: RuleSource;
  rules: ParsedRule[];
  statistics: SourceStatistics;
  syncInfo: SyncInfo;
}

/**
 * 规则源详情数据助手
 */
export class SourceDetailDataHelper {
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * 加载源详情数据
   */
  async loadSourceDetailData(sourceId: string): Promise<SourceDetailData> {
    const configManager = ConfigManager.getInstance(this.context);
    const rulesManager = RulesManager.getInstance();

    // 获取规则源
    const sources = await configManager.getSources();
    const source = sources.find((s) => s.id === sourceId);

    if (!source) {
      throw new Error(`Source not found: ${sourceId}`);
    }

    // 获取该源的所有规则
    const sourceRules = rulesManager.getRulesBySource(sourceId);

    // 计算统计数据
    const statistics = this.calculateStatistics(sourceRules);

    // 获取同步信息
    const syncInfo = await this.getSyncInfo(source);

    return {
      source,
      rules: sourceRules,
      statistics,
      syncInfo,
    };
  }

  /**
   * 计算规则源统计数据
   */
  calculateStatistics(rules: ParsedRule[]): SourceStatistics {
    const statistics: SourceStatistics = {
      totalRules: rules.length,
      priorityDistribution: {
        high: 0,
        medium: 0,
        low: 0,
      },
      topTags: [],
    };

    // 计算优先级分布
    rules.forEach((rule) => {
      const priority = rule.metadata?.priority || 'medium';
      if (priority === 'high') {
        statistics.priorityDistribution.high++;
      } else if (priority === 'low') {
        statistics.priorityDistribution.low++;
      } else {
        statistics.priorityDistribution.medium++;
      }
    });

    // 计算标签分布
    const tagCounts = new Map<string, number>();
    rules.forEach((rule) => {
      const tags = rule.metadata?.tags || [];
      tags.forEach((tag) => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });

    // 获取前6个最常用标签
    statistics.topTags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    return statistics;
  }

  /**
   * 获取同步信息
   */
  async getSyncInfo(source: RuleSource): Promise<SyncInfo> {
    const syncInfo: SyncInfo = {
      status: source.lastSync ? 'success' : 'never',
      lastSynced: source.lastSync,
    };

    // 计算缓存大小
    try {
      const cacheDir = path.join(this.context.globalStorageUri.fsPath, 'sources', source.id);

      if (fs.existsSync(cacheDir)) {
        const size = await this.getDirectorySize(cacheDir);
        syncInfo.cacheSize = formatBytes(size);
      }
    } catch {
      Logger.warn('Failed to calculate cache size');
    }

    // 计算下次自动同步时间
    if (source.syncInterval && source.syncInterval > 0 && source.lastSync) {
      const lastSyncTime = new Date(source.lastSync).getTime();
      const nextSyncTime = lastSyncTime + source.syncInterval * 60 * 1000;
      const now = Date.now();

      if (nextSyncTime > now) {
        const minutesLeft = Math.round((nextSyncTime - now) / 60000);
        syncInfo.nextAutoSync =
          minutesLeft > 60
            ? `in ${Math.round(minutesLeft / 60)} hours`
            : `in ${minutesLeft} minutes`;
      } else {
        syncInfo.nextAutoSync = 'pending';
      }
    }

    return syncInfo;
  }

  /**
   * 获取目录大小
   */
  private async getDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        totalSize += await this.getDirectorySize(filePath);
      } else {
        totalSize += stats.size;
      }
    }

    return totalSize;
  }
}
