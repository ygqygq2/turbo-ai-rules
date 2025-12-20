/**
 * 搜索索引管理器
 * 负责搜索索引的读写操作
 */

import * as path from 'path';

import { SystemError } from '../../types/errors';
import type { ParsedRule } from '../../types/rules';
import { pathExists, safeReadFile, safeWriteFile } from '../../utils/fileSystem';
import { Logger } from '../../utils/logger';
import type { SearchIndex } from './types';

/**
 * 搜索索引管理器类
 */
export class SearchIndexManager {
  constructor(private getWorkspaceDir: () => string) {}

  /**
   * @description 读取搜索索引
   * @return {Promise<SearchIndex | null>}
   */
  public async readSearchIndex(): Promise<SearchIndex | null> {
    const indexPath = path.join(this.getWorkspaceDir(), 'search.index.json');

    if (!(await pathExists(indexPath))) {
      return null;
    }

    try {
      const content = await safeReadFile(indexPath);
      return JSON.parse(content) as SearchIndex;
    } catch (error) {
      Logger.warn('Failed to read search index', { error: String(error) });
      return null;
    }
  }

  /**
   * @description 写入搜索索引
   * @return {Promise<void>}
   * @param rules {ParsedRule[]}
   */
  public async writeSearchIndex(rules: ParsedRule[]): Promise<void> {
    const indexPath = path.join(this.getWorkspaceDir(), 'search.index.json');

    // 构建倒排索引
    const keywords: { [keyword: string]: Set<string> } = {};
    const tags: { [tag: string]: Set<string> } = {};

    for (const rule of rules) {
      // 索引标题中的关键词
      const titleWords = rule.title.toLowerCase().split(/\s+/);
      for (const word of titleWords) {
        if (word.length > 2) {
          // 忽略太短的词
          if (!keywords[word]) {
            keywords[word] = new Set();
          }
          keywords[word].add(rule.id);
        }
      }

      // 索引标签
      const ruleTags = rule.metadata.tags || [];
      for (const tag of ruleTags) {
        const normalizedTag = tag.toLowerCase();
        if (!tags[normalizedTag]) {
          tags[normalizedTag] = new Set();
        }
        tags[normalizedTag].add(rule.id);
      }
    }

    // 转换 Set 为数组
    const keywordsObj: { [keyword: string]: string[] } = {};
    for (const [keyword, ruleIds] of Object.entries(keywords)) {
      keywordsObj[keyword] = Array.from(ruleIds);
    }

    const tagsObj: { [tag: string]: string[] } = {};
    for (const [tag, ruleIds] of Object.entries(tags)) {
      tagsObj[tag] = Array.from(ruleIds);
    }

    const index: SearchIndex = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      keywords: keywordsObj,
      tags: tagsObj,
    };

    try {
      const content = JSON.stringify(index, null, 2);
      await safeWriteFile(indexPath, content);
      Logger.info('Search index written', {
        keywordCount: Object.keys(keywordsObj).length,
        tagCount: Object.keys(tagsObj).length,
      });
    } catch (error) {
      throw new SystemError(
        'Failed to write search index',
        'TAI-5003',
        error instanceof Error ? error : undefined,
      );
    }
  }
}
