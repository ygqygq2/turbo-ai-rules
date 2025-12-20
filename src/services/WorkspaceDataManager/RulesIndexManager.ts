/**
 * 规则索引管理器
 * 负责规则索引的读写操作
 */

import * as crypto from 'crypto';
import * as path from 'path';

import { SystemError } from '../../types/errors';
import type { ParsedRule } from '../../types/rules';
import { pathExists, safeReadFile, safeWriteFile } from '../../utils/fileSystem';
import { Logger } from '../../utils/logger';
import type { RuleIndexItem, RulesIndex } from './types';

/**
 * 规则索引管理器类
 */
export class RulesIndexManager {
  constructor(private getWorkspaceDir: () => string) {}

  /**
   * @description 读取规则索引
   * @return {Promise<RulesIndex | null>}
   */
  public async readRulesIndex(): Promise<RulesIndex | null> {
    const indexPath = path.join(this.getWorkspaceDir(), 'rules.index.json');

    if (!(await pathExists(indexPath))) {
      return null;
    }

    try {
      const content = await safeReadFile(indexPath);
      return JSON.parse(content) as RulesIndex;
    } catch (error) {
      Logger.warn('Failed to read rules index', { error: String(error) });
      return null;
    }
  }

  /**
   * @description 写入规则索引
   * @return {Promise<void>}
   * @param workspacePath {string}
   * @param rules {ParsedRule[]}
   */
  public async writeRulesIndex(workspacePath: string, rules: ParsedRule[]): Promise<void> {
    const indexPath = path.join(this.getWorkspaceDir(), 'rules.index.json');

    const indexItems: RuleIndexItem[] = rules.map((rule) => ({
      id: rule.id,
      title: rule.title,
      sourceId: rule.sourceId,
      tags: rule.metadata.tags || [],
      priority: this.priorityToNumber(rule.metadata.priority),
      hash: this.calculateRuleHash(rule),
    }));

    const index: RulesIndex = {
      version: 1,
      workspacePath,
      lastUpdated: new Date().toISOString(),
      rules: indexItems,
    };

    try {
      const content = JSON.stringify(index, null, 2);
      await safeWriteFile(indexPath, content);
      Logger.info('Rules index written', {
        ruleCount: rules.length,
      });
    } catch (error) {
      throw new SystemError(
        'Failed to write rules index',
        'TAI-5003',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * @description 计算规则内容哈希
   * @return {string}
   * @param rule {ParsedRule}
   */
  private calculateRuleHash(rule: ParsedRule): string {
    const content = JSON.stringify({
      id: rule.id,
      title: rule.title,
      content: rule.content,
      metadata: rule.metadata,
    });
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex').substring(0, 16);
  }

  /**
   * @description 将 RulePriority 转换为数字
   * @return {number}
   * @param priority {string | number | undefined}
   */
  private priorityToNumber(priority?: string | number): number {
    if (typeof priority === 'number') {
      return priority;
    }

    switch (priority) {
      case 'low':
        return 1;
      case 'medium':
        return 5;
      case 'high':
        return 10;
      default:
        return 0;
    }
  }
}
