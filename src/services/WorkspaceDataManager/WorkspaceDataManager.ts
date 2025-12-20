/**
 * 工作区数据管理服务
 * 管理存储在全局缓存 workspaces/ 目录下的工作区数据
 * 包括规则索引、搜索索引、生成清单等
 *
 * @description 此类作为门面模式的入口，协调各个子管理器
 */

import * as crypto from 'crypto';
import * as path from 'path';

import { SystemError } from '../../types/errors';
import type { ParsedRule } from '../../types/rules';
import { GLOBAL_CACHE_DIR } from '../../utils/constants';
import { ensureDir, pathExists } from '../../utils/fileSystem';
import { Logger } from '../../utils/logger';
import { AdapterMappingManager } from './AdapterMappingManager';
import { GenerationManifestManager } from './GenerationManifestManager';
import { RuleSelectionManager } from './RuleSelectionManager';
import { RulesIndexManager } from './RulesIndexManager';
import { SearchIndexManager } from './SearchIndexManager';
import type { AdapterRuleMapping, ArtifactInfo, RuleSelection } from './types';

/**
 * 工作区数据管理器（主类）
 * 使用组合模式，将职责委托给各个子管理器
 */
export class WorkspaceDataManager {
  private static instance: WorkspaceDataManager;
  private workspaceHash: string | null = null;
  private workspaceDir: string | null = null;

  // 子管理器实例
  private rulesIndexManager!: RulesIndexManager;
  private searchIndexManager!: SearchIndexManager;
  private generationManifestManager!: GenerationManifestManager;
  private ruleSelectionManager!: RuleSelectionManager;
  private adapterMappingManager!: AdapterMappingManager;

  private constructor() {}

  /**
   * @description 获取 WorkspaceDataManager 实例
   * @return {WorkspaceDataManager}
   */
  public static getInstance(): WorkspaceDataManager {
    if (!WorkspaceDataManager.instance) {
      WorkspaceDataManager.instance = new WorkspaceDataManager();
    }
    return WorkspaceDataManager.instance;
  }

  /**
   * @description 计算工作区路径的哈希值（SHA256 前 16 位）
   * @return {string}
   * @param workspacePath {string}
   */
  private calculateWorkspaceHash(workspacePath: string): string {
    const normalized = path.resolve(path.normalize(workspacePath));
    const hash = crypto.createHash('sha256').update(normalized, 'utf8').digest('hex');
    return hash.substring(0, 16);
  }

  /**
   * @description 初始化工作区数据目录和子管理器
   * @return {Promise<void>}
   * @param workspacePath {string}
   */
  public async initWorkspace(workspacePath: string): Promise<void> {
    this.workspaceHash = this.calculateWorkspaceHash(workspacePath);
    this.workspaceDir = path.join(GLOBAL_CACHE_DIR, 'workspaces', this.workspaceHash);

    await ensureDir(this.workspaceDir);

    // 初始化所有子管理器
    const getWorkspaceDir = () => this.getWorkspaceDir();
    this.rulesIndexManager = new RulesIndexManager(getWorkspaceDir);
    this.searchIndexManager = new SearchIndexManager(getWorkspaceDir);
    this.generationManifestManager = new GenerationManifestManager(getWorkspaceDir);
    this.ruleSelectionManager = new RuleSelectionManager(getWorkspaceDir);
    this.adapterMappingManager = new AdapterMappingManager(getWorkspaceDir);

    Logger.debug('Workspace data directory initialized', {
      workspacePath,
      workspaceHash: this.workspaceHash,
      workspaceDir: this.workspaceDir,
    });
  }

  /**
   * @description 获取工作区数据目录路径
   * @return {string}
   */
  public getWorkspaceDir(): string {
    if (!this.workspaceDir) {
      throw new SystemError('Workspace not initialized', 'TAI-5001');
    }
    return this.workspaceDir;
  }

  /**
   * @description 获取工作区哈希
   * @return {string}
   */
  public getWorkspaceHash(): string {
    if (!this.workspaceHash) {
      throw new SystemError('Workspace not initialized', 'TAI-5001');
    }
    return this.workspaceHash;
  }

  // ==================== 规则索引 - 委托给 RulesIndexManager ====================

  public async readRulesIndex() {
    return this.rulesIndexManager.readRulesIndex();
  }

  public async writeRulesIndex(workspacePath: string, rules: ParsedRule[]) {
    return this.rulesIndexManager.writeRulesIndex(workspacePath, rules);
  }

  // ==================== 搜索索引 - 委托给 SearchIndexManager ====================

  public async readSearchIndex() {
    return this.searchIndexManager.readSearchIndex();
  }

  public async writeSearchIndex(rules: ParsedRule[]) {
    return this.searchIndexManager.writeSearchIndex(rules);
  }

  // ==================== 生成清单 - 委托给 GenerationManifestManager ====================

  public async readGenerationManifest() {
    return this.generationManifestManager.readGenerationManifest();
  }

  public async writeGenerationManifest(workspacePath: string, artifacts: ArtifactInfo[]) {
    return this.generationManifestManager.writeGenerationManifest(workspacePath, artifacts);
  }

  public async addArtifact(workspacePath: string, artifact: ArtifactInfo) {
    return this.generationManifestManager.addArtifact(workspacePath, artifact);
  }

  // ==================== 规则选择 - 委托给 RuleSelectionManager ====================

  public async readRuleSelections() {
    return this.ruleSelectionManager.readRuleSelections();
  }

  public async writeRuleSelections(
    workspacePath: string,
    selections: { [sourceId: string]: RuleSelection },
  ) {
    return this.ruleSelectionManager.writeRuleSelections(workspacePath, selections);
  }

  public async getRuleSelection(sourceId: string) {
    return this.ruleSelectionManager.getRuleSelection(sourceId);
  }

  public async setRuleSelection(workspacePath: string, sourceId: string, selection: RuleSelection) {
    return this.ruleSelectionManager.setRuleSelection(workspacePath, sourceId, selection);
  }

  public async deleteRuleSelection(workspacePath: string, sourceId: string) {
    return this.ruleSelectionManager.deleteRuleSelection(workspacePath, sourceId);
  }

  // ==================== Skill 选择 - 委托给 RuleSelectionManager ====================

  public async readSkillSelections() {
    return this.ruleSelectionManager.readSkillSelections();
  }

  public async writeSkillSelections(
    workspacePath: string,
    selections: { [sourceId: string]: RuleSelection },
  ) {
    return this.ruleSelectionManager.writeSkillSelections(workspacePath, selections);
  }

  public async getSkillSelection(sourceId: string) {
    return this.ruleSelectionManager.getSkillSelection(sourceId);
  }

  public async setSkillSelection(
    workspacePath: string,
    sourceId: string,
    selection: RuleSelection,
  ) {
    return this.ruleSelectionManager.setSkillSelection(workspacePath, sourceId, selection);
  }

  public async deleteSkillSelection(workspacePath: string, sourceId: string) {
    return this.ruleSelectionManager.deleteSkillSelection(workspacePath, sourceId);
  }

  // ==================== 适配器映射 - 委托给 AdapterMappingManager ====================

  public async readAdapterMappings() {
    return this.adapterMappingManager.readAdapterMappings();
  }

  public async writeAdapterMappings(
    workspacePath: string,
    mappings: { [adapterId: string]: AdapterRuleMapping },
  ) {
    return this.adapterMappingManager.writeAdapterMappings(workspacePath, mappings);
  }

  public async getAdapterMapping(adapterId: string) {
    return this.adapterMappingManager.getAdapterMapping(adapterId);
  }

  public async setAdapterMapping(
    workspacePath: string,
    adapterId: string,
    mapping: AdapterRuleMapping,
  ) {
    return this.adapterMappingManager.setAdapterMapping(workspacePath, adapterId, mapping);
  }

  public async deleteAdapterMapping(workspacePath: string, adapterId: string) {
    return this.adapterMappingManager.deleteAdapterMapping(workspacePath, adapterId);
  }

  // ==================== 清理操作 ====================

  /**
   * @description 清理当前工作区的所有数据
   * @return {Promise<void>}
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
   * @description 清理过期的工作区数据（基于访问时间）
   * @return {Promise<void>}
   * @param maxAgeInDays {number} 最大保留天数（默认 90 天）
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
}
