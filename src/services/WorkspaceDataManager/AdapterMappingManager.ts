/**
 * 适配器映射管理器
 * 负责适配器规则映射的读写操作
 */

import * as path from 'path';

import { SystemError } from '../../types/errors';
import { pathExists, safeReadFile, safeWriteFile } from '../../utils/fileSystem';
import { Logger } from '../../utils/logger';
import type { AdapterMappings, AdapterRuleMapping } from './types';

/**
 * 适配器映射管理器类
 */
export class AdapterMappingManager {
  // 适配器映射缓存
  private adapterMappingsCache: AdapterMappings | null = null;
  private adapterMappingsCacheTimestamp = 0;
  private readonly cacheTTL = 5000; // 5s TTL

  constructor(private getWorkspaceDir: () => string) {}

  /**
   * @description 读取适配器映射配置
   * @return {Promise<AdapterMappings | null>}
   */
  public async readAdapterMappings(): Promise<AdapterMappings | null> {
    // 缓存命中
    if (
      this.adapterMappingsCache &&
      Date.now() - this.adapterMappingsCacheTimestamp < this.cacheTTL
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
