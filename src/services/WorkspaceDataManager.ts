/**
 * 工作区数据管理服务
 * 管理存储在全局缓存 workspaces/ 目录下的工作区数据
 * 包括规则索引、搜索索引、生成清单等
 */

import * as crypto from 'crypto';
import * as path from 'path';

import { SystemError } from '../types/errors';
import type { ParsedRule } from '../types/rules';
import { GLOBAL_CACHE_DIR } from '../utils/constants';
import { ensureDir, pathExists, safeReadFile, safeWriteFile } from '../utils/fileSystem';
import { Logger } from '../utils/logger';

/**
 * 规则索引数据
 */
export interface RulesIndex {
  version: number;
  workspacePath: string;
  lastUpdated: string;
  rules: RuleIndexItem[];
}

/**
 * 规则索引项（摘要信息）
 */
export interface RuleIndexItem {
  id: string;
  title: string;
  sourceId: string;
  tags: string[];
  priority: number;
  hash: string;
}

/**
 * 搜索索引数据
 */
export interface SearchIndex {
  version: number;
  lastUpdated: string;
  keywords: { [keyword: string]: string[] }; // keyword -> ruleIds
  tags: { [tag: string]: string[] }; // tag -> ruleIds
}

/**
 * 生成清单数据
 */
export interface GenerationManifest {
  version: number;
  workspacePath: string;
  lastGenerated: string;
  artifacts: ArtifactInfo[];
}

/**
 * 生成的文件信息
 */
export interface ArtifactInfo {
  path: string;
  sha256: string;
  size: number;
  policy: 'overwrite' | 'preserve' | 'merge' | 'backup';
  adapter: string;
  generatedAt: string;
}

/**
 * 规则选择配置
 */
export interface RuleSelection {
  mode: 'include' | 'exclude';
  paths?: string[]; // 包含模式：选中的路径
  excludePaths?: string[]; // 排除模式：排除的路径
}

/**
 * 规则选择数据
 */
export interface RuleSelections {
  version: number;
  workspacePath: string;
  lastUpdated: string;
  selections: { [sourceId: string]: RuleSelection };
}

/**
 * 单个适配器的规则映射
 */
export interface AdapterRuleMapping {
  adapterId: string;
  selectedRules: string[]; // 格式：sourceId/relativePath
  lastSyncedAt?: string;
  autoSync: boolean;
}

/**
 * 适配器规则映射文件结构
 */
export interface AdapterMappings {
  version: number;
  workspacePath: string;
  lastUpdated: string;
  mappings: { [adapterId: string]: AdapterRuleMapping };
}

/**
 * 工作区数据管理器
 */
export class WorkspaceDataManager {
  private static instance: WorkspaceDataManager;
  private workspaceHash: string | null = null;
  private workspaceDir: string | null = null;
  // 规则选择缓存（写穿 + TTL）
  private selectionsCache: RuleSelections | null = null;
  private selectionsCacheTimestamp = 0;
  // Skill 选择缓存
  private skillSelectionsCache: RuleSelections | null = null;
  private skillSelectionsCacheTimestamp = 0;
  // 适配器映射缓存
  private adapterMappingsCache: AdapterMappings | null = null;
  private adapterMappingsCacheTimestamp = 0;
  private readonly selectionsCacheTTL = 5000; // 5s TTL

  private constructor() {}

  /**
   * 获取 WorkspaceDataManager 实例
   */
  public static getInstance(): WorkspaceDataManager {
    if (!WorkspaceDataManager.instance) {
      WorkspaceDataManager.instance = new WorkspaceDataManager();
    }
    return WorkspaceDataManager.instance;
  }

  /**
   * 计算工作区路径的哈希值（SHA256 前 16 位）
   */
  private calculateWorkspaceHash(workspacePath: string): string {
    const normalized = path.resolve(path.normalize(workspacePath));
    const hash = crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * 初始化工作区数据目录
   */
  public async initWorkspace(workspacePath: string): Promise<void> {
    this.workspaceHash = this.calculateWorkspaceHash(workspacePath);
    this.workspaceDir = path.join(GLOBAL_CACHE_DIR, 'workspaces', this.workspaceHash);

    await ensureDir(this.workspaceDir);

    Logger.debug('Workspace data directory initialized', {
      workspacePath,
      workspaceHash: this.workspaceHash,
      workspaceDir: this.workspaceDir,
    });
  }

  /**
   * 获取工作区数据目录路径
   */
  public getWorkspaceDir(): string {
    if (!this.workspaceDir) {
      throw new SystemError('Workspace not initialized', 'TAI-5001');
    }
    return this.workspaceDir;
  }

  /**
   * 获取工作区哈希
   */
  public getWorkspaceHash(): string {
    if (!this.workspaceHash) {
      throw new SystemError('Workspace not initialized', 'TAI-5001');
    }
    return this.workspaceHash;
  }

  // ==================== 规则索引 ====================

  /**
   * 读取规则索引
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
   * 写入规则索引
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
   * 计算规则内容哈希
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
   * 将 RulePriority 转换为数字
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

  // ==================== 搜索索引 ====================

  /**
   * 读取搜索索引
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
   * 写入搜索索引
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

  // ==================== 生成清单 ====================

  /**
   * 读取生成清单
   */
  public async readGenerationManifest(): Promise<GenerationManifest | null> {
    const manifestPath = path.join(this.getWorkspaceDir(), 'generation.manifest.json');

    if (!(await pathExists(manifestPath))) {
      return null;
    }

    try {
      const content = await safeReadFile(manifestPath);
      return JSON.parse(content) as GenerationManifest;
    } catch (error) {
      Logger.warn('Failed to read generation manifest', { error: String(error) });
      return null;
    }
  }

  /**
   * 写入生成清单
   */
  public async writeGenerationManifest(
    workspacePath: string,
    artifacts: ArtifactInfo[],
  ): Promise<void> {
    const manifestPath = path.join(this.getWorkspaceDir(), 'generation.manifest.json');

    const manifest: GenerationManifest = {
      version: 1,
      workspacePath,
      lastGenerated: new Date().toISOString(),
      artifacts,
    };

    try {
      const content = JSON.stringify(manifest, null, 2);
      await safeWriteFile(manifestPath, content);
      Logger.info('Generation manifest written', {
        artifactCount: artifacts.length,
      });
    } catch (error) {
      throw new SystemError(
        'Failed to write generation manifest',
        'TAI-5003',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 添加生成的文件到清单
   */
  public async addArtifact(workspacePath: string, artifact: ArtifactInfo): Promise<void> {
    const manifest = (await this.readGenerationManifest()) || {
      version: 1,
      workspacePath,
      lastGenerated: new Date().toISOString(),
      artifacts: [],
    };

    // 查找是否已存在
    const existingIndex = manifest.artifacts.findIndex((a) => a.path === artifact.path);

    if (existingIndex >= 0) {
      // 更新现有记录
      manifest.artifacts[existingIndex] = artifact;
    } else {
      // 添加新记录
      manifest.artifacts.push(artifact);
    }

    manifest.lastGenerated = new Date().toISOString();

    await this.writeGenerationManifest(workspacePath, manifest.artifacts);
  }

  // ==================== 清理操作 ====================

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

  // ==================== 清理操作 ====================

  /**
   * 清理当前工作区的所有数据
   */
  public async clearWorkspaceData(): Promise<void> {
    const workspaceDir = this.getWorkspaceDir();

    const files = [
      'rules.index.json',
      'search.index.json',
      'generation.manifest.json',
      'rule-selections.json',
      'skill-selections.json',
      'adapter-mappings.json',
    ];

    for (const file of files) {
      const filePath = path.join(workspaceDir, file);
      if (await pathExists(filePath)) {
        const fs = await import('fs-extra');
        await fs.remove(filePath);
      }
    }

    Logger.info('Workspace data cleared', {
      workspaceDir,
    });
  }

  /**
   * 清理过期的工作区数据（基于访问时间）
   * @param maxAgeInDays 最大保留天数（默认 90 天）
   */
  public async cleanupExpiredWorkspaces(maxAgeInDays: number = 90): Promise<void> {
    const workspacesDir = path.join(GLOBAL_CACHE_DIR, 'workspaces');

    if (!(await pathExists(workspacesDir))) {
      return;
    }

    const fs = await import('fs-extra');
    const dirs = await fs.readdir(workspacesDir);
    const now = Date.now();
    const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000;

    let cleanedCount = 0;

    for (const dir of dirs) {
      const dirPath = path.join(workspacesDir, dir);
      const stats = await fs.stat(dirPath);

      // 检查最后访问时间
      const age = now - stats.atimeMs;

      if (age > maxAge) {
        await fs.remove(dirPath);
        cleanedCount++;
        Logger.info('Expired workspace data cleaned', {
          workspaceHash: dir,
          ageInDays: Math.floor(age / (24 * 60 * 60 * 1000)),
        });
      }
    }

    Logger.info('Expired workspaces cleanup completed', {
      cleanedCount,
      totalChecked: dirs.length,
    });
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

  // ==================== 适配器映射操作 ====================

  /**
   * @description 读取适配器映射配置
   * @return {Promise<AdapterMappings | null>}
   */
  public async readAdapterMappings(): Promise<AdapterMappings | null> {
    // 缓存命中
    if (
      this.adapterMappingsCache &&
      Date.now() - this.adapterMappingsCacheTimestamp < this.selectionsCacheTTL
    ) {
      Logger.debug('Adapter mappings cache hit');
      return this.adapterMappingsCache;
    }

    const mappingsPath = path.join(this.getWorkspaceDir(), 'adapter-mappings.json');
    if (!(await pathExists(mappingsPath))) {
      this.adapterMappingsCache = null;
      return null;
    }
    try {
      const content = await safeReadFile(mappingsPath);
      this.adapterMappingsCache = JSON.parse(content) as AdapterMappings;
      this.adapterMappingsCacheTimestamp = Date.now();
      Logger.debug('Adapter mappings loaded from disk');
      return this.adapterMappingsCache;
    } catch (error) {
      Logger.warn('Failed to read adapter mappings', { error: String(error) });
      this.adapterMappingsCache = null;
      return null;
    }
  }

  /**
   * @description 写入适配器映射配置
   * @return {Promise<void>}
   * @param workspacePath {string}
   * @param mappings {{ [adapterId: string]: AdapterRuleMapping }}
   */
  public async writeAdapterMappings(
    workspacePath: string,
    mappings: { [adapterId: string]: AdapterRuleMapping },
  ): Promise<void> {
    const mappingsPath = path.join(this.getWorkspaceDir(), 'adapter-mappings.json');

    const data: AdapterMappings = {
      version: 1,
      workspacePath,
      lastUpdated: new Date().toISOString(),
      mappings,
    };

    try {
      const content = JSON.stringify(data, null, 2);
      await safeWriteFile(mappingsPath, content);
      // 更新缓存（写穿）
      this.adapterMappingsCache = data;
      this.adapterMappingsCacheTimestamp = Date.now();
      Logger.info('Adapter mappings written', {
        adapterCount: Object.keys(mappings).length,
        cached: true,
      });
    } catch (error) {
      this.adapterMappingsCache = null; // 防止缓存脏数据
      throw new SystemError(
        'Failed to write adapter mappings',
        'TAI-5003',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * @description 获取某适配器的规则映射
   * @return {Promise<AdapterRuleMapping | null>}
   * @param adapterId {string}
   */
  public async getAdapterMapping(adapterId: string): Promise<AdapterRuleMapping | null> {
    const data = await this.readAdapterMappings();
    if (!data) {
      return null;
    }
    return data.mappings[adapterId] || null;
  }

  /**
   * @description 设置某适配器的规则映射
   * @return {Promise<void>}
   * @param workspacePath {string}
   * @param adapterId {string}
   * @param mapping {AdapterRuleMapping}
   */
  public async setAdapterMapping(
    workspacePath: string,
    adapterId: string,
    mapping: AdapterRuleMapping,
  ): Promise<void> {
    const existing = (await this.readAdapterMappings()) || {
      version: 1,
      workspacePath,
      lastUpdated: new Date().toISOString(),
      mappings: {},
    };
    existing.mappings[adapterId] = mapping;
    existing.lastUpdated = new Date().toISOString();
    await this.writeAdapterMappings(workspacePath, existing.mappings);
  }

  /**
   * @description 删除某适配器的规则映射
   * @return {Promise<void>}
   * @param workspacePath {string}
   * @param adapterId {string}
   */
  public async deleteAdapterMapping(workspacePath: string, adapterId: string): Promise<void> {
    const data = await this.readAdapterMappings();
    if (!data || !data.mappings[adapterId]) {
      return;
    }

    delete data.mappings[adapterId];
    data.lastUpdated = new Date().toISOString();

    await this.writeAdapterMappings(workspacePath, data.mappings);
    Logger.info('Adapter mapping deleted', { adapterId });
  }
}
