/**
 * 规则选择管理器
 * 负责规则选择和Skill选择的读写操作
 */

import * as path from 'path';

import { SystemError } from '../../types/errors';
import { pathExists, safeReadFile, safeWriteFile } from '../../utils/fileSystem';
import { Logger } from '../../utils/logger';
import type { RuleSelection, RuleSelections } from './types';

/**
 * 规则选择管理器类
 */
export class RuleSelectionManager {
  // 规则选择缓存（写穿 + TTL）
  private selectionsCache: RuleSelections | null = null;
  private selectionsCacheTimestamp = 0;
  // Skill 选择缓存
  private skillSelectionsCache: RuleSelections | null = null;
  private skillSelectionsCacheTimestamp = 0;
  private readonly selectionsCacheTTL = 5000; // 5s TTL

  constructor(private getWorkspaceDir: () => string) {}

  // ==================== 规则选择操作 ====================

  /**
   * @description 读取规则选择配置
   * @return {Promise<RuleSelections | null>}
   */
  public async readRuleSelections(): Promise<RuleSelections | null> {
    // 缓存命中
    if (
      this.selectionsCache &&
      Date.now() - this.selectionsCacheTimestamp < this.selectionsCacheTTL
    ) {
      Logger.debug('Rule selections cache hit');
      return this.selectionsCache;
    }

    const selectionsPath = path.join(this.getWorkspaceDir(), 'rule-selections.json');
    if (!(await pathExists(selectionsPath))) {
      this.selectionsCache = null;
      return null;
    }
    try {
      const content = await safeReadFile(selectionsPath);
      this.selectionsCache = JSON.parse(content) as RuleSelections;
      this.selectionsCacheTimestamp = Date.now();
      Logger.debug('Rule selections loaded from disk');
      return this.selectionsCache;
    } catch (error) {
      Logger.warn('Failed to read rule selections', { error: String(error) });
      this.selectionsCache = null;
      return null;
    }
  }

  /**
   * @description 写入规则选择配置
   * @return {Promise<void>}
   * @param workspacePath {string}
   * @param selections {{ [sourceId: string]: RuleSelection }}
   */
  public async writeRuleSelections(
    workspacePath: string,
    selections: { [sourceId: string]: RuleSelection },
  ): Promise<void> {
    const selectionsPath = path.join(this.getWorkspaceDir(), 'rule-selections.json');

    const data: RuleSelections = {
      version: 1,
      workspacePath,
      lastUpdated: new Date().toISOString(),
      selections,
    };

    try {
      const content = JSON.stringify(data, null, 2);
      await safeWriteFile(selectionsPath, content);
      // 更新缓存（写穿）
      this.selectionsCache = data;
      this.selectionsCacheTimestamp = Date.now();
      Logger.info('Rule selections written', {
        sourceCount: Object.keys(selections).length,
        cached: true,
      });
    } catch (error) {
      this.selectionsCache = null; // 防止缓存脏数据
      throw new SystemError(
        'Failed to write rule selections',
        'TAI-5003',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * @description 获取某源的规则选择
   * @return {Promise<RuleSelection | null>}
   * @param sourceId {string}
   */
  public async getRuleSelection(sourceId: string): Promise<RuleSelection | null> {
    const data = await this.readRuleSelections();
    if (!data) {
      return null;
    }
    return data.selections[sourceId] || null;
  }

  /**
   * @description 设置某源的规则选择
   * @return {Promise<void>}
   * @param workspacePath {string}
   * @param sourceId {string}
   * @param selection {RuleSelection}
   */
  public async setRuleSelection(
    workspacePath: string,
    sourceId: string,
    selection: RuleSelection,
  ): Promise<void> {
    const existing = (await this.readRuleSelections()) || {
      version: 1,
      workspacePath,
      lastUpdated: new Date().toISOString(),
      selections: {},
    };
    existing.selections[sourceId] = selection;
    existing.lastUpdated = new Date().toISOString();
    await this.writeRuleSelections(workspacePath, existing.selections);
  }

  /**
   * @description 删除某源的规则选择
   * @return {Promise<void>}
   * @param workspacePath {string}
   * @param sourceId {string}
   */
  public async deleteRuleSelection(workspacePath: string, sourceId: string): Promise<void> {
    const data = await this.readRuleSelections();
    if (!data || !data.selections[sourceId]) {
      return;
    }

    delete data.selections[sourceId];
    data.lastUpdated = new Date().toISOString();

    await this.writeRuleSelections(workspacePath, data.selections);
    Logger.info('Rule selection deleted', { sourceId });
  }

  // ==================== Skill 选择操作 ====================

  /**
   * @description 读取 Skill 选择配置
   * @return {Promise<RuleSelections | null>}
   */
  public async readSkillSelections(): Promise<RuleSelections | null> {
    // 缓存命中
    if (
      this.skillSelectionsCache &&
      Date.now() - this.skillSelectionsCacheTimestamp < this.selectionsCacheTTL
    ) {
      Logger.debug('Skill selections cache hit');
      return this.skillSelectionsCache;
    }

    const selectionsPath = path.join(this.getWorkspaceDir(), 'skill-selections.json');
    if (!(await pathExists(selectionsPath))) {
      this.skillSelectionsCache = null;
      return null;
    }
    try {
      const content = await safeReadFile(selectionsPath);
      this.skillSelectionsCache = JSON.parse(content) as RuleSelections;
      this.skillSelectionsCacheTimestamp = Date.now();
      Logger.debug('Skill selections loaded from disk');
      return this.skillSelectionsCache;
    } catch (error) {
      Logger.warn('Failed to read skill selections', { error: String(error) });
      this.skillSelectionsCache = null;
      return null;
    }
  }

  /**
   * @description 写入 Skill 选择配置
   * @return {Promise<void>}
   * @param workspacePath {string}
   * @param selections {{ [sourceId: string]: RuleSelection }}
   */
  public async writeSkillSelections(
    workspacePath: string,
    selections: { [sourceId: string]: RuleSelection },
  ): Promise<void> {
    const selectionsPath = path.join(this.getWorkspaceDir(), 'skill-selections.json');

    const data: RuleSelections = {
      version: 1,
      workspacePath,
      lastUpdated: new Date().toISOString(),
      selections,
    };

    try {
      const content = JSON.stringify(data, null, 2);
      await safeWriteFile(selectionsPath, content);
      // 更新缓存（写穿）
      this.skillSelectionsCache = data;
      this.skillSelectionsCacheTimestamp = Date.now();
      Logger.info('Skill selections written', {
        sourceCount: Object.keys(selections).length,
        cached: true,
      });
    } catch (error) {
      this.skillSelectionsCache = null; // 防止缓存脏数据
      throw new SystemError(
        'Failed to write skill selections',
        'TAI-5003',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * @description 获取某源的 Skill 选择
   * @return {Promise<RuleSelection | null>}
   * @param sourceId {string}
   */
  public async getSkillSelection(sourceId: string): Promise<RuleSelection | null> {
    const data = await this.readSkillSelections();
    if (!data) {
      return null;
    }
    return data.selections[sourceId] || null;
  }

  /**
   * @description 设置某源的 Skill 选择
   * @return {Promise<void>}
   * @param workspacePath {string}
   * @param sourceId {string}
   * @param selection {RuleSelection}
   */
  public async setSkillSelection(
    workspacePath: string,
    sourceId: string,
    selection: RuleSelection,
  ): Promise<void> {
    const existing = (await this.readSkillSelections()) || {
      version: 1,
      workspacePath,
      lastUpdated: new Date().toISOString(),
      selections: {},
    };
    existing.selections[sourceId] = selection;
    existing.lastUpdated = new Date().toISOString();
    await this.writeSkillSelections(workspacePath, existing.selections);
  }

  /**
   * @description 删除某源的 Skill 选择
   * @return {Promise<void>}
   * @param workspacePath {string}
   * @param sourceId {string}
   */
  public async deleteSkillSelection(workspacePath: string, sourceId: string): Promise<void> {
    const data = await this.readSkillSelections();
    if (!data || !data.selections[sourceId]) {
      return;
    }

    delete data.selections[sourceId];
    data.lastUpdated = new Date().toISOString();

    await this.writeSkillSelections(workspacePath, data.selections);
    Logger.info('Skill selection deleted', { sourceId });
  }
}
