/**
 * 文件生成服务
 * 负责编排适配器，生成不同 AI 工具的配置文件
 */

import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

import type { AIToolAdapter, GeneratedConfig } from '../adapters';
import { CustomAdapter, PRESET_ADAPTERS, PresetAdapter } from '../adapters';
import type { AdaptersConfig } from '../types/config';
import { GenerateError, SystemError } from '../types/errors';
import type { PartialUpdateOptions } from '../types/ruleMarker';
import type { ConflictStrategy, ParsedRule } from '../types/rules';
import { debugLog } from '../utils/debugLog';
import { ensureDir, safeWriteFile } from '../utils/fileSystem';
import { ensureIgnored } from '../utils/gitignore';
import { Logger } from '../utils/logger';
import { partialUpdate } from '../utils/ruleMarkerMerger';

/**
 * 生成结果
 */
export interface GenerateResult {
  /** 成功生成的文件列表 */
  success: GeneratedConfig[];
  /** 失败的适配器列表 */
  failures: Array<{ adapter: string; error: string }>;
}

/**
 * 文件生成服务
 */
export class FileGenerator {
  private static instance: FileGenerator;
  private adapters: Map<string, AIToolAdapter>;

  private constructor() {
    this.adapters = new Map();
  }

  /**
   * 获取 FileGenerator 实例
   */
  public static getInstance(): FileGenerator {
    if (!FileGenerator.instance) {
      FileGenerator.instance = new FileGenerator();
    }
    return FileGenerator.instance;
  }

  /**
   * 初始化适配器
   * @param config 适配器配置
   */
  public initializeAdapters(config: AdaptersConfig): void {
    Logger.debug('Initializing adapters', config as Record<string, unknown>);

    this.adapters.clear();

    // 注册预设适配器（配置驱动）
    for (const presetConfig of PRESET_ADAPTERS) {
      const adapterConfig = (
        config as Record<
          string,
          {
            enabled?: boolean;
            enableUserRules?: boolean;
            sortBy?: string;
            sortOrder?: string;
            preserveDirectoryStructure?: boolean;
          }
        >
      )[presetConfig.id];
      const enabled = adapterConfig?.enabled ?? false;
      Logger.debug(`Preset adapter ${presetConfig.id} config:`, {
        enabled,
        enableUserRules: adapterConfig?.enableUserRules,
        sortBy: adapterConfig?.sortBy,
        sortOrder: adapterConfig?.sortOrder,
        preserveDirectoryStructure: adapterConfig?.preserveDirectoryStructure,
        rawConfig: adapterConfig,
      });
      if (enabled) {
        const sortBy = (adapterConfig?.sortBy as 'id' | 'priority' | 'none') || 'priority';
        const sortOrder = (adapterConfig?.sortOrder as 'asc' | 'desc') || 'asc';
        const enableUserRules = adapterConfig?.enableUserRules ?? true;
        const preserveDirectoryStructure = adapterConfig?.preserveDirectoryStructure ?? true;

        Logger.debug(
          `Creating PresetAdapter ${presetConfig.id} with sortBy=${sortBy}, sortOrder=${sortOrder}, enableUserRules=${enableUserRules}, preserveDirectoryStructure=${preserveDirectoryStructure}`,
        );
        const adapter = new PresetAdapter(
          presetConfig,
          true,
          sortBy,
          sortOrder,
          preserveDirectoryStructure,
        );
        adapter.setEnableUserRules(enableUserRules);

        this.adapters.set(presetConfig.id, adapter);
        Logger.debug(`Registered preset adapter: ${presetConfig.id} (${presetConfig.name})`);
      }
    }

    // 注册自定义适配器
    if (config.custom && Array.isArray(config.custom)) {
      Logger.debug('[initializeAdapters] Processing custom adapters', {
        count: config.custom.length,
        adapters: config.custom.map((a) => ({
          id: a.id,
          enabled: a.enabled,
          isRuleType: a.isRuleType,
        })),
      });
      for (const customConfig of config.custom) {
        if (customConfig.enabled) {
          const adapter = new CustomAdapter(customConfig);

          // 设置用户规则启用状态（已在构造函数中根据isRuleType设置默认值）
          // 如果配置中明确指定enableUserRules，以配置为准
          if (customConfig.enableUserRules !== undefined) {
            adapter.setEnableUserRules(customConfig.enableUserRules);
          }

          // 设置排序配置
          const sortBy = (customConfig.sortBy as 'id' | 'priority' | 'none') || 'priority';
          const sortOrder = (customConfig.sortOrder as 'asc' | 'desc') || 'asc';
          adapter.setSortConfig(sortBy, sortOrder);

          // 设置目录结构保持（仅目录类型，已在构造函数中设置默认值）
          if (
            customConfig.outputType === 'directory' &&
            customConfig.preserveDirectoryStructure !== undefined
          ) {
            adapter.setPreserveDirectoryStructure(customConfig.preserveDirectoryStructure);
          }

          this.adapters.set(`custom-${customConfig.id}`, adapter);
          Logger.debug(
            `Registered custom adapter: ${customConfig.id}, isRuleType=${customConfig.isRuleType ?? true}, enableUserRules=${customConfig.enableUserRules ?? customConfig.isRuleType ?? true}`,
            customConfig as unknown as Record<string, unknown>,
          );
        } else {
          Logger.debug(`Skipping disabled custom adapter: ${customConfig.id}`);
        }
      }
    } else {
      Logger.debug('[initializeAdapters] No custom adapters in config');
    }

    Logger.debug('Adapters initialized', {
      count: this.adapters.size,
      adapters: Array.from(this.adapters.keys()),
    });
  }

  /**
   * 生成所有配置文件
   * @param rules 规则列表
   * @param workspaceRoot 工作区根目录
   * @param strategy 冲突解决策略
   * @param targetAdapters 目标适配器列表（可选，如果提供则只为这些适配器生成配置）
   * @param allRules 所有可用规则（用于用户规则保护）
   * @param workspaceUri 工作区 URI（用于多工作区环境）
   * @returns 生成结果
   */
  public async generateAll(
    rules: ParsedRule[],
    workspaceRoot: string,
    strategy: ConflictStrategy = 'priority',
    targetAdapters?: string[],
    allRules?: ParsedRule[],
    workspaceUri?: vscode.Uri,
  ): Promise<GenerateResult> {
    Logger.debug('Generating all config files', {
      ruleCount: rules.length,
      userRulesCount: (allRules || []).filter((r) => r.sourceId === 'user-rules').length,
      adapterCount: this.adapters.size,
      conflictStrategy: strategy,
      targetAdapters: targetAdapters || 'all',
      workspaceUri: workspaceUri?.toString(),
    });
    const result: GenerateResult = {
      success: [],
      failures: [],
    };

    // 如果没有启用的适配器
    if (this.adapters.size === 0) {
      Logger.warn('No adapters enabled');
      throw new GenerateError(
        'No adapters enabled. Please enable at least one adapter in settings.',
        'TAI-4001',
      );
    }

    // 即使没有规则，也要生成空配置以清空之前的内容
    if (rules.length === 0) {
      Logger.info('No rules selected, generating empty configurations to clear previous content');
    }

    Logger.debug('[generateAll] Starting generation', {
      adaptersCount: this.adapters.size,
      adapterNames: Array.from(this.adapters.keys()),
      rulesCount: rules.length,
      targetAdapters,
    });

    // 为每个适配器生成配置
    for (const [name, adapter] of this.adapters.entries()) {
      // 适配器名称匹配规则：
      // - 预置适配器：直接匹配（如 'copilot', 'cursor', 'continue'）
      // - 自定义适配器：name 格式为 'custom-{id}'，需要匹配 id 部分
      const adapterId = name.startsWith('custom-') ? name.substring(7) : name;

      debugLog(
        `[FileGenerator] Processing adapter: ${name}, adapterId: ${adapterId}, rules count: ${rules.length}`,
      );
      Logger.debug(`[generateAll] Processing adapter ${name}`, {
        adapterId,
        isCustomAdapter: adapter instanceof CustomAdapter,
        config: adapter instanceof CustomAdapter ? adapter.config : undefined,
        targetAdapters,
      });

      // ✅ 如果指定了目标适配器，只为目标适配器生成配置
      if (targetAdapters && targetAdapters.length > 0) {
        if (!targetAdapters.includes(adapterId) && !targetAdapters.includes(name)) {
          Logger.debug(`Skipping adapter ${name} (not in target list)`, {
            adapterId,
            targetAdapters,
          });
          continue;
        }
      } else {
        // ✅ 未指定目标适配器时，只为规则类型（isRuleType=true）的适配器生成配置
        // 预设适配器默认都是规则类型，自定义适配器需要检查 isRuleType 属性
        if (adapter instanceof CustomAdapter) {
          const isRuleType = adapter.config.isRuleType ?? true;
          Logger.debug(`[generateAll] Custom adapter ${name} isRuleType check`, {
            adapterId,
            isRuleType,
            configIsRuleType: adapter.config.isRuleType,
          });
          if (!isRuleType) {
            Logger.debug(`Skipping skills adapter ${name} (isRuleType=false, not in target list)`, {
              adapterId,
            });
            continue;
          }
        }
      }
      try {
        debugLog(
          `[FileGenerator] Calling generateForAdapter for ${name}, rules: ${rules.length}, allRules: ${allRules?.length || 0}`,
        );
        // ✅ 所有适配器都使用传入的规则列表（用户选择的规则）
        // 自定义适配器的特殊过滤逻辑在其 generate() 方法内部处理
        const config = await this.generateForAdapter(adapter, rules, workspaceRoot, allRules);
        debugLog(
          `[FileGenerator] Generated config for ${name}: ${config.filePath}, ruleCount: ${config.ruleCount}`,
        );
        result.success.push(config);

        Logger.debug(`Generated config for ${name}`, {
          filePath: config.filePath,
          ruleCount: config.ruleCount,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.failures.push({ adapter: name, error: errorMessage });

        Logger.error(
          `Failed to generate config for ${name}`,
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    }

    // 确保生成的文件被 .gitignore
    await this.ensureGitIgnore(workspaceRoot);

    Logger.debug('Generation complete', {
      successCount: result.success.length,
      failureCount: result.failures.length,
    });

    return result;
  }

  /**
   * 为单个适配器生成配置
   * @param adapter 适配器
   * @param rules 规则列表
   * @param workspaceRoot 工作区根目录
   * @param allRules 所有可用规则（用于用户规则保护）
   * @returns 生成的配置
   */
  private async generateForAdapter(
    adapter: AIToolAdapter,
    rules: ParsedRule[],
    workspaceRoot: string,
    allRules?: ParsedRule[],
  ): Promise<GeneratedConfig> {
    // 生成配置内容（传递 allRules 用于用户规则保护）
    const config = await adapter.generate(rules, allRules);

    // 验证内容
    if (!adapter.validate(config.content)) {
      throw new GenerateError(`Generated content for ${adapter.name} is invalid`, 'TAI-4002');
    }

    // 写入文件（传递 adapter 和 rules 用于判断输出类型和清理旧文件）
    const fullPath = path.join(workspaceRoot, config.filePath);
    await this.writeConfigFile(fullPath, config.content, adapter, rules);

    return config;
  }

  /**
   * 写入配置文件（支持用户规则保护）
   * @param filePath 文件路径
   * @param content 文件内容
   * @param adapter 适配器实例（用于判断输出类型）
   * @param rules 当前规则列表（用于目录模式下的清理）
   */
  private async writeConfigFile(
    filePath: string,
    content: string,
    adapter?: AIToolAdapter,
    rules?: ParsedRule[],
  ): Promise<void> {
    debugLog(`[FileGenerator.writeConfigFile] Called with:`, {
      filePath,
      contentLength: content.length,
      adapterName: adapter?.name,
      rulesCount: rules?.length || 0,
    });

    try {
      // 确保目录存在
      const dir = path.dirname(filePath);
      await ensureDir(dir);

      // 判断是目录模式还是文件模式
      const isDirectoryMode = adapter && this.isDirectoryOutput(adapter);
      debugLog(`[FileGenerator.writeConfigFile] isDirectoryMode:`, isDirectoryMode);

      if (isDirectoryMode) {
        // 目录模式：清理旧文件，然后写入新文件
        debugLog(
          `[FileGenerator.writeConfigFile] Directory mode detected, calling cleanObsoleteDirectoryFiles`,
        );
        await this.cleanObsoleteDirectoryFiles(dir, adapter, rules || []);
        await this.writeDirectoryModeFile(dir, filePath, content);
      } else {
        // 单文件模式：使用规则源标记
        await this.writeSingleFileMode(filePath, content);
      }
    } catch (error) {
      throw new SystemError(
        `Failed to write config file: ${filePath}`,
        'TAI-5003',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * 判断是否为目录输出模式
   */
  private isDirectoryOutput(adapter: AIToolAdapter): boolean {
    // 对于 CustomAdapter，检查其配置
    if ('config' in adapter && adapter.config) {
      const customConfig = adapter.config as { outputType?: string };
      return customConfig.outputType === 'directory';
    }

    // 对于内置适配器，都是单文件模式
    return false;
  }

  /**
   * 清理目录中不在当前规则列表中的旧文件
   * @param dir 目录路径
   * @param adapter 适配器实例
   * @param rules 当前规则列表（选中的规则）
   */
  private async cleanObsoleteDirectoryFiles(
    dir: string,
    adapter: AIToolAdapter,
    rules: ParsedRule[],
  ): Promise<void> {
    debugLog(`[FileGenerator.cleanObsoleteDirectoryFiles] Called with:`, {
      dir,
      adapterName: adapter.name,
      rulesCount: rules.length,
    });

    // 检查目录是否存在
    if (!fs.existsSync(dir)) {
      debugLog(`[FileGenerator.cleanObsoleteDirectoryFiles] Directory does not exist, skipping`);
      return;
    }

    // ⚠️ 如果规则为空，跳过清理（避免删除输出目录本身）
    if (rules.length === 0) {
      debugLog(`[FileGenerator.cleanObsoleteDirectoryFiles] Rules is empty, skipping cleanup`);
      Logger.debug('Skipping cleanup: no rules provided');
      return;
    }

    // 如果适配器启用了用户规则，需要加载用户内容并加入期望列表
    let allRules = [...rules];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ('enableUserRules' in adapter && (adapter as any).enableUserRules) {
      try {
        // 根据适配器类型加载用户内容
        // 检查是否是 CustomAdapter 且 isRuleType 明确设置为 false (skills 适配器)
        const isSkillAdapter =
          'config' in adapter &&
          (adapter as { config?: { isRuleType?: boolean } }).config?.isRuleType === false;

        if (isSkillAdapter) {
          // 技能适配器：加载 ai-skills/
          // FIXME: loadUserSkills not implemented yet
          // const { loadUserSkills } = await import('../utils/userRules');
          // const userSkills = await loadUserSkills();
          // allRules = [...allRules, ...userSkills];
          // Logger.debug('Added user skills to expected list for cleanup', {
          //   count: userSkills.length,
          // });
        } else {
          // 规则适配器：加载 ai-rules/
          const { loadUserRules } = await import('../utils/userRules');
          const userRules = await loadUserRules();
          allRules = [...allRules, ...userRules];
          Logger.debug('Added user rules to expected list for cleanup', {
            count: userRules.length,
          });
        }
      } catch (error) {
        Logger.warn('Failed to load user content for cleanup', { error: (error as Error).message });
      }
    }

    // 获取期望的文件路径和 SKILL 目录映射
    const { filePaths, skillDirs } = await this.getExpectedFilePaths(adapter, allRules);

    Logger.debug('Expected file paths for cleanup', {
      fileCount: filePaths.size,
      skillDirCount: skillDirs.size,
      files: Array.from(filePaths),
      skillDirs: Array.from(skillDirs.keys()),
    });

    // 递归清理不需要的文件和空目录
    const deletedCount = await this.recursiveCleanup(dir, dir, filePaths, skillDirs);

    if (deletedCount.files > 0 || deletedCount.directories > 0) {
      Logger.info('Cleaned obsolete items', {
        files: deletedCount.files,
        directories: deletedCount.directories,
      });
    }
  }

  /**
   * 递归清理目录
   * @param baseDir 基础目录（输出根目录）
   * @param currentDir 当前扫描的目录
   * @param expectedFiles 期望的文件路径集合（相对于 baseDir）
   * @param skillDirs SKILL 目录映射（目录相对路径 -> 源目录绝对路径）
   * @param currentSkillContext 当前的 SKILL 上下文（如果在 SKILL 目录内）
   * @returns 删除的文件和目录数量
   */
  private async recursiveCleanup(
    baseDir: string,
    currentDir: string,
    expectedFiles: Set<string>,
    skillDirs: Map<string, string>,
    currentSkillContext?: { sourceDir: string; skillRelativePath: string },
  ): Promise<{ files: number; directories: number }> {
    const deletedCount = { files: 0, directories: 0 };

    if (!fs.existsSync(currentDir)) {
      return deletedCount;
    }

    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    // 计算当前目录相对于基础目录的路径
    const relativeDir = path.relative(baseDir, currentDir);

    // 确定当前的 SKILL 上下文
    let skillContext = currentSkillContext;

    if (!skillContext) {
      // 检查当前目录是否是 SKILL 目录的起点
      if (skillDirs.has(relativeDir)) {
        skillContext = {
          sourceDir: skillDirs.get(relativeDir)!,
          skillRelativePath: relativeDir,
        };
        Logger.debug('[FileGenerator] Entering SKILL directory context', {
          relativeDir,
          sourceDir: skillContext.sourceDir,
          currentDir,
        });
      } else {
        // 检查是否是 SKILL 目录但不在期望列表中
        const skillMdPath = path.join(currentDir, 'SKILL.md');
        const hasSkillMd = fs.existsSync(skillMdPath);
        if (hasSkillMd) {
          Logger.debug('[FileGenerator] Found SKILL.md but directory not in expected list', {
            relativeDir,
            currentDir,
            expectedDirs: Array.from(skillDirs.keys()),
          });
        }
      }
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      const relativePath = path.relative(baseDir, fullPath);

      // 跳过索引文件
      // 1. 根目录的 index.md (总是跳过)
      // 2. 源目录的 index.md (当启用 indexPerSource 时跳过)
      if (entry.name === 'index.md') {
        if (currentDir === baseDir) {
          // 根目录的 index.md，总是跳过
          continue;
        }
        // 检查是否是源目录的 index.md (相对路径只有一层，如 "sourceId/index.md")
        const pathParts = relativePath.split(path.sep);
        if (pathParts.length === 2) {
          // 可能是源目录的 index.md，跳过
          continue;
        }
      }

      if (entry.isDirectory()) {
        // 递归处理子目录，传递 SKILL 上下文
        const subResult = await this.recursiveCleanup(
          baseDir,
          fullPath,
          expectedFiles,
          skillDirs,
          skillContext, // 传递当前的 SKILL 上下文到子目录
        );
        deletedCount.files += subResult.files;
        deletedCount.directories += subResult.directories;

        // 检查目录是否为空，如果为空则删除
        const remaining = fs.readdirSync(fullPath);
        if (remaining.length === 0) {
          try {
            fs.rmdirSync(fullPath);
            deletedCount.directories++;
            Logger.debug('Deleted empty directory', { directory: relativePath });
          } catch (error) {
            Logger.warn('Failed to delete empty directory', {
              directory: relativePath,
              error: (error as Error).message,
            });
          }
        }
      } else {
        // 处理文件
        let shouldDelete = false;

        if (skillContext) {
          // 在 SKILL 目录内 - 与源目录同步
          // 计算文件相对于 SKILL 目录的路径
          const fileRelativeToSkill = path.relative(
            path.join(baseDir, skillContext.skillRelativePath),
            fullPath,
          );
          const sourceFilePath = path.join(skillContext.sourceDir, fileRelativeToSkill);
          shouldDelete = !fs.existsSync(sourceFilePath);

          if (shouldDelete) {
            Logger.debug('File not in source SKILL directory', {
              file: relativePath,
              sourceFile: sourceFilePath,
            });
          }
        } else {
          // 普通文件 - 检查是否在期望列表中
          shouldDelete = !expectedFiles.has(relativePath);
        }

        if (shouldDelete) {
          try {
            fs.unlinkSync(fullPath);
            deletedCount.files++;
            Logger.debug('Deleted obsolete file', { file: relativePath });
          } catch (error) {
            Logger.warn('Failed to delete file', {
              file: relativePath,
              error: (error as Error).message,
            });
          }
        }
      }
    }

    return deletedCount;
  }

  /**
   * 获取期望的文件路径集合（完整相对路径）和 SKILL 目录映射
   * @param adapter 适配器
   * @param rules 规则列表
   * @returns 期望的文件路径集合和 SKILL 目录源路径映射
   */
  private async getExpectedFilePaths(
    adapter: AIToolAdapter,
    rules: ParsedRule[],
  ): Promise<{ filePaths: Set<string>; skillDirs: Map<string, string> }> {
    const filePaths = new Set<string>();
    const skillDirs = new Map<string, string>(); // 目录 -> 源目录路径

    if ('config' in adapter && adapter.config) {
      const { CustomAdapter } = await import('../adapters');
      if (adapter instanceof CustomAdapter) {
        const customConfig = adapter.config as { isRuleType?: boolean };
        const isSkillsAdapter = customConfig.isRuleType === false;

        for (const rule of rules) {
          const isSkillFile = path.basename(rule.filePath).toLowerCase() === 'skill.md';
          const isUserSkill = rule.sourceId === 'user-skills';

          if (isSkillFile && isSkillsAdapter) {
            // SKILL.md 文件 - 记录需要同步的目录

            if (isUserSkill) {
              // 用户技能：从 ai-skills/ 目录计算相对路径
              // FIXME: getUserSkillsDirectory not implemented yet
              // const { getUserSkillsDirectory } = await import('../utils/userRules');
              // const userSkillsDir = getUserSkillsDirectory();
              const userSkillsDir = null;

              if (userSkillsDir) {
                // 获取相对于 ai-skills/ 的路径
                const relativePath = path.relative(userSkillsDir, rule.filePath);
                const skillDirName = path.dirname(relativePath); // 例如：my-tool

                // 用户技能直接使用目录名（不按源组织）
                skillDirs.set(skillDirName, path.dirname(rule.filePath));

                Logger.debug('[FileGenerator] Added user SKILL directory mapping', {
                  ruleId: rule.id,
                  ruleFilePath: rule.filePath,
                  sourceId: rule.sourceId,
                  skillDirPath: skillDirName,
                  sourceDirPath: path.dirname(rule.filePath),
                });
              }
            } else {
              // 远程技能：使用原有逻辑
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const relativePath = await (adapter as any).getRelativePathFromSubPath(
                rule.filePath,
                rule.sourceId,
              );
              if (relativePath) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const preserveStructure = (adapter as any).preserveDirectoryStructure ?? true;
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const organizeBySource = (adapter as any).shouldOrganizeBySource?.() ?? false;

                // 获取 SKILL.md 的父目录相对路径
                let skillDirPath: string;
                if (preserveStructure) {
                  // 保持目录结构：1300-skills/git-workflow-expert
                  skillDirPath = path.dirname(relativePath);
                } else {
                  // 平铺模式：git-workflow-expert（只取最后一层目录名）
                  skillDirPath = path.basename(path.dirname(relativePath));
                }

                // 如果按源组织，前面加上 sourceId
                if (organizeBySource && rule.sourceId) {
                  skillDirPath = path.join(rule.sourceId, skillDirPath);
                }

                // 记录源目录路径，用于后续同步检查
                skillDirs.set(skillDirPath, path.dirname(rule.filePath));

                Logger.debug('[FileGenerator] Added SKILL directory mapping', {
                  ruleId: rule.id,
                  ruleFilePath: rule.filePath,
                  sourceId: rule.sourceId,
                  relativePath,
                  skillDirPath,
                  sourceDirPath: path.dirname(rule.filePath),
                  preserveStructure,
                  organizeBySource,
                });
              }
            }
          } else {
            // 普通文件 - 记录完整相对路径
            const isUserSkill = rule.sourceId === 'user-skills';
            const isUserRule = rule.sourceId === 'user-rules';

            if (isUserSkill || isUserRule) {
              // 用户内容（规则或技能）：使用文件名
              const fileName = adapter.getRuleFileName(rule);
              filePaths.add(fileName);
            } else {
              // 远程内容：使用原有逻辑
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const preserveStructure = (adapter as any).preserveDirectoryStructure ?? true;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const organizeBySource = (adapter as any).shouldOrganizeBySource?.() ?? false;

              if (preserveStructure && rule.sourceId) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const relativePath = await (adapter as any).getRelativePathFromSubPath(
                  rule.filePath,
                  rule.sourceId,
                );
                if (relativePath) {
                  // 如果按源组织，前面加上 sourceId
                  const finalPath = organizeBySource
                    ? path.join(rule.sourceId, relativePath)
                    : relativePath;
                  filePaths.add(finalPath);
                } else {
                  const fileName = adapter.getRuleFileName(rule);
                  const finalPath =
                    organizeBySource && rule.sourceId
                      ? path.join(rule.sourceId, fileName)
                      : fileName;
                  filePaths.add(finalPath);
                }
              } else {
                const fileName = adapter.getRuleFileName(rule);
                const finalPath =
                  organizeBySource && rule.sourceId ? path.join(rule.sourceId, fileName) : fileName;
                filePaths.add(finalPath);
              }
            }
          }
        }
      }
    }

    Logger.debug('[FileGenerator] Final expected paths summary', {
      filePathsCount: filePaths.size,
      skillDirsCount: skillDirs.size,
      skillDirsMappings: Array.from(skillDirs.entries()).map(([outputPath, sourcePath]) => ({
        outputPath,
        sourcePath,
      })),
      sampleFilePaths: Array.from(filePaths).slice(0, 5),
    });

    return { filePaths, skillDirs };
  }

  /**
   * 目录模式写入（前缀保护）
   */
  private async writeDirectoryModeFile(
    _dir: string,
    filePath: string,
    content: string,
  ): Promise<void> {
    // 目录模式下，旧文件已通过 cleanObsoleteDirectoryFiles 统一清理
    // 这里直接写入文件
    await safeWriteFile(filePath, content);
  }

  /**
   * 单文件模式写入（使用规则源标记）
   */
  private async writeSingleFileMode(filePath: string, newContent: string): Promise<void> {
    // 检查文件是否存在
    const fileExists = fs.existsSync(filePath);

    if (!fileExists) {
      // 文件不存在，直接写入
      await safeWriteFile(filePath, newContent);
      return;
    }

    // 文件存在，读取现有内容
    const existingContent = fs.readFileSync(filePath, 'utf-8');

    // 获取顶层标记配置（blockMarkers 是全局标记，用于识别文件是否被扩展管理）
    const { getBlockMarkers } = await import('../utils/userRules');
    const blockMarkers = getBlockMarkers();

    // 检查文件是否已包含顶层标记（说明已被扩展管理）
    const hasManagedMarkers =
      existingContent.includes(blockMarkers.begin) && existingContent.includes(blockMarkers.end);

    if (!hasManagedMarkers) {
      // 文件存在但没有管理标记 - 这是用户自己的文件，不能覆盖
      const fileName = filePath.split(/[/\\]/).pop() || filePath;
      const errorMessage = `Cannot generate: File "${fileName}" already exists and is not managed by Turbo AI Rules.\n\nPlease:\n1. Back up and remove the existing file, OR\n2. Rename it to a different name\n\nThen try generating again.`;

      Logger.warn('File exists but not managed by extension', {
        filePath,
        hasBeginMarker: existingContent.includes(blockMarkers.begin),
        hasEndMarker: existingContent.includes(blockMarkers.end),
      });

      // 显示错误提示给用户
      const vscode = await import('vscode');
      await vscode.window
        .showErrorMessage(errorMessage, { modal: true }, 'Open File Location')
        .then((selection) => {
          if (selection === 'Open File Location') {
            vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(filePath));
          }
        });

      throw new GenerateError(`File already exists and is not managed: ${fileName}`, 'TAI-4004');
    }

    // 文件已被管理，正常覆盖
    await safeWriteFile(filePath, newContent);
  }

  /**
   * 确保生成的文件在 .gitignore 中（动态管理）
   * @param workspaceRoot 工作区根目录
   */
  private async ensureGitIgnore(workspaceRoot: string): Promise<void> {
    try {
      const patterns: string[] = [];

      // 收集所有已启用适配器的文件路径
      for (const adapter of this.adapters.values()) {
        patterns.push(adapter.getFilePath());
      }

      if (patterns.length > 0) {
        await ensureIgnored(workspaceRoot, patterns);
        Logger.debug('Updated .gitignore with enabled adapters', {
          patterns,
          count: patterns.length,
        });
      }
    } catch (error) {
      // .gitignore 失败不影响主流程
      Logger.warn('Failed to update .gitignore', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 预览生成的内容（不写入文件）
   * @param adapter 适配器名称
   * @param rules 规则列表
   * @returns 生成的配置
   */
  public async preview(adapter: string, rules: ParsedRule[]): Promise<GeneratedConfig> {
    const adapterInstance = this.adapters.get(adapter);

    if (!adapterInstance) {
      throw new GenerateError(`Adapter not found or not enabled: ${adapter}`, 'TAI-4003');
    }

    return await adapterInstance.generate(rules);
  }

  /**
   * 获取启用的适配器列表
   * @returns 适配器名称列表
   */
  public getEnabledAdapters(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * 部分更新：只更新指定规则源的规则
   * @param rules 新规则列表
   * @param workspaceRoot 工作区根目录
   * @param targetSourceIds 目标规则源 ID 列表
   * @param adapterIds 目标适配器 ID 列表（可选，默认全部）
   * @returns 生成结果
   */
  public async partialUpdate(
    rules: ParsedRule[],
    workspaceRoot: string,
    targetSourceIds: string[],
    adapterIds?: string[],
  ): Promise<GenerateResult> {
    Logger.debug('Partial update started', {
      ruleCount: rules.length,
      targetSourceIds,
      adapterIds,
    });

    const result: GenerateResult = {
      success: [],
      failures: [],
    };

    // 确定要更新的适配器
    const adaptersToUpdate = adapterIds
      ? Array.from(this.adapters.entries()).filter(([id]) => adapterIds.includes(id))
      : Array.from(this.adapters.entries());

    for (const [name, adapter] of adaptersToUpdate) {
      try {
        // 只对单文件适配器执行部分更新
        if (this.isDirectoryOutput(adapter)) {
          // 目录模式：直接覆盖对应文件
          const config = await this.generateForAdapter(adapter, rules, workspaceRoot);
          result.success.push(config);
        } else {
          // 单文件模式：使用部分更新逻辑
          const config = await this.partialUpdateSingleFile(
            adapter,
            rules,
            workspaceRoot,
            targetSourceIds,
          );
          result.success.push(config);
        }

        Logger.debug(`Partial update completed for ${name}`, {
          targetSourceIds,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        result.failures.push({ adapter: name, error: errorMessage });
        Logger.error(
          `Failed to partial update for ${name}`,
          error instanceof Error ? error : undefined,
        );
      }
    }

    return result;
  }

  /**
   * 对单文件适配器执行部分更新
   */
  private async partialUpdateSingleFile(
    adapter: AIToolAdapter,
    rules: ParsedRule[],
    workspaceRoot: string,
    targetSourceIds: string[],
  ): Promise<GeneratedConfig> {
    const filePath = path.join(workspaceRoot, adapter.getFilePath());

    // 读取现有文件内容
    let existingContent = '';
    try {
      if (fs.existsSync(filePath)) {
        existingContent = fs.readFileSync(filePath, 'utf-8');
      }
    } catch (_error) {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '';
      const relativeFilePath = workspaceRoot ? path.relative(workspaceRoot, filePath) : filePath;
      Logger.warn('Failed to read existing file for partial update', {
        filePath: relativeFilePath,
      });
    }

    // 只获取目标规则源的规则
    const targetRules = rules.filter((rule) => targetSourceIds.includes(rule.sourceId));

    // 生成新内容（仅用于验证适配器能够处理这些规则）
    await adapter.generate(targetRules);

    // 提取头部内容（不含元数据，用于部分更新）
    const headerContent = this.extractHeaderContent(adapter);

    // 执行部分更新
    const options: PartialUpdateOptions = {
      targetSourceIds,
      preserveUserContent: true,
      preserveOtherSources: true,
    };

    const updateResult = partialUpdate(existingContent, targetRules, headerContent, options);

    // 写入文件
    await ensureDir(path.dirname(filePath));
    await safeWriteFile(filePath, updateResult.content);

    Logger.info('Partial update completed', {
      filePath: adapter.getFilePath(),
      isPartialUpdate: updateResult.isPartialUpdate,
      updatedSources: updateResult.updatedSources,
      preservedSources: updateResult.preservedSources,
    });

    return {
      filePath: adapter.getFilePath(),
      content: updateResult.content,
      generatedAt: new Date(),
      ruleCount: targetRules.length,
    };
  }

  /**
   * 提取适配器的头部内容（不含元数据）
   */
  private extractHeaderContent(adapter: AIToolAdapter): string {
    // 根据适配器类型返回对应的头部内容
    if (adapter.name === 'GitHub Copilot') {
      return (
        '# GitHub Copilot Instructions\n\n' +
        '> This file provides coding guidelines and rules for GitHub Copilot.\n' +
        '> Generated by Turbo AI Rules extension.\n\n'
      );
    } else if (adapter.name === 'Cursor') {
      return (
        '# Cursor Rules\n\n' +
        '> This file provides coding rules for Cursor IDE.\n' +
        '> Generated by Turbo AI Rules extension.\n\n'
      );
    } else if (adapter.name === 'Continue') {
      return (
        '# Continue Rules\n\n' +
        '> This file provides coding rules for Continue extension.\n' +
        '> Generated by Turbo AI Rules extension.\n\n'
      );
    }

    // 自定义适配器
    return `# ${adapter.name} Rules\n\n> Generated by Turbo AI Rules extension.\n\n`;
  }

  /**
   * 显示生成结果通知
   * @param result 生成结果
   */
  public async showGenerationNotification(result: GenerateResult): Promise<void> {
    const { notify } = await import('../utils/notifications');
    if (result.success.length > 0 && result.failures.length === 0) {
      // 全部成功（瞬时提示）
      notify(`Generated ${result.success.length} config file(s)`, 'info');
    } else if (result.success.length > 0 && result.failures.length > 0) {
      // 部分成功（瞬时提示 + 日志详情）
      const message = `Generated ${result.success.length} file(s), ${result.failures.length} failed`;
      notify(message, 'warning');
      this.showGenerationDetails(result);
    } else if (result.failures.length > 0) {
      // 全部失败（瞬时提示 + 日志详情）
      notify('Failed to generate config files', 'error');
      this.showGenerationDetails(result);
    }
  }

  /**
   * 显示生成详情
   * @param result 生成结果
   */
  private showGenerationDetails(result: GenerateResult): void {
    const lines: string[] = [];

    if (result.success.length > 0) {
      lines.push('✅ Successfully generated:');
      for (const config of result.success) {
        lines.push(`  - ${config.filePath} (${config.ruleCount} rules)`);
      }
      lines.push('');
    }

    if (result.failures.length > 0) {
      lines.push('❌ Failed to generate:');
      for (const failure of result.failures) {
        lines.push(`  - ${failure.adapter}: ${failure.error}`);
      }
    }

    const content = lines.join('\n');

    // 在日志中输出详情
    Logger.info('Generation Report:\n' + content);
  }
}
