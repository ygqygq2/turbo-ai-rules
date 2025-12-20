/**
 * 生成清单管理器
 * 负责生成清单的读写操作和构件(artifact)管理
 */

import * as path from 'path';

import { SystemError } from '../../types/errors';
import { pathExists, safeReadFile, safeWriteFile } from '../../utils/fileSystem';
import { Logger } from '../../utils/logger';
import type { ArtifactInfo, GenerationManifest } from './types';

/**
 * 生成清单管理器类
 */
export class GenerationManifestManager {
  constructor(private getWorkspaceDir: () => string) {}

  /**
   * @description 读取生成清单
   * @return {Promise<GenerationManifest | null>}
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
   * @description 写入生成清单
   * @return {Promise<void>}
   * @param workspacePath {string}
   * @param artifacts {ArtifactInfo[]}
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
   * @description 添加生成的文件到清单
   * @return {Promise<void>}
   * @param workspacePath {string}
   * @param artifact {ArtifactInfo}
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
}
