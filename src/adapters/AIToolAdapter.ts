/**
 * AI 工具适配器接口
 * 定义不同 AI 工具的配置生成规范
 */

import * as path from 'path';
import * as vscode from 'vscode';

import type { ParsedRule } from '../types/rules';
import { debugLog } from '../utils/debugLog';
import { generateMarkedFileContent } from '../utils/ruleMarkerGenerator';
import { getBlockMarkers, getMarkers } from '../utils/userRules';

/**
 * 生成的配置信息
 */
export interface GeneratedConfig {
  /** 输出文件路径（相对于工作区根目录） */
  filePath: string;
  /** 生成的内容 */
  content: string;
  /** 生成时间 */
  generatedAt: Date;
  /** 使用的规则数量 */
  ruleCount: number;
}

/**
 * AI 工具适配器接口
 */
export interface AIToolAdapter {
  /** 适配器名称 */
  readonly name: string;

  /** 是否启用 */
  readonly enabled: boolean;

  /**
   * 生成配置文件内容
   * @param rules 选中的规则列表
   * @param allRules 所有可用规则（用于用户规则保护）
   * @returns 生成的配置信息
   */
  generate(rules: ParsedRule[], allRules?: ParsedRule[]): Promise<GeneratedConfig>;

  /**
   * 验证生成的配置
   * @param content 配置内容
   * @returns 是否有效
   */
  validate(content: string): boolean;

  /**
   * 获取配置文件路径
   * @returns 配置文件相对路径
   */
  getFilePath(): string;
}

/**
 * 抽象基类，提供通用功能
 */
export abstract class BaseAdapter implements AIToolAdapter {
  abstract readonly name: string;
  abstract readonly enabled: boolean;

  /** 是否为规则类型适配器（true=规则，false=技能） */
  protected isRuleType: boolean = true;

  /** 是否启用用户规则 */
  protected enableUserRules: boolean = true;

  /** 排序配置 */
  protected sortBy: 'id' | 'priority' | 'none' = 'priority';
  protected sortOrder: 'asc' | 'desc' = 'asc';

  /** 是否保持目录层级结构（仅目录模式有效，默认 true 保持目录结构） */
  protected preserveDirectoryStructure: boolean = true;

  /**
   * 统一的生成方法（模板方法模式）
   * 子类一般不需要重写，除非有特殊逻辑
   */
  async generate(rules: ParsedRule[], _allRules?: ParsedRule[]): Promise<GeneratedConfig> {
    // 1. 加载用户规则（作为 sourceId = 'user-rules' 的规则源）
    const userRules = await this.loadUserRules();

    // 2. 合并规则（去重、排序）
    const allRules = await this.mergeWithUserRules(rules, userRules);

    // 3. 根据输出类型生成
    const outputType = this.getOutputType();
    if (outputType === 'file') {
      return this.generateSingleFile(allRules);
    } else {
      return this.generateDirectory(allRules);
    }
  }

  /**
   * 单文件模式生成（使用规则源标记）
   * 子类一般不需要重写
   */
  protected generateSingleFile(rules: ParsedRule[]): GeneratedConfig {
    const headerContent = this.generateHeaderContent(rules);

    // 读取配置
    const userRulesMarkers = getMarkers();
    const blockMarkers = getBlockMarkers();

    const content = generateMarkedFileContent(rules, headerContent, {
      includeSourceMarkers: true,
      includeRuleMarkers: true,
      includePriority: true,
      blockMarkers,
      userRulesMarkers,
    });

    return {
      filePath: this.getFilePath(),
      content,
      generatedAt: new Date(),
      ruleCount: rules.length,
    };
  }

  /**
   * 目录模式生成（基础实现）
   * 子类可以重写以自定义行为，或直接使用此默认实现
   */
  protected async generateDirectory(
    rules: ParsedRule[],
    _allRules?: ParsedRule[],
  ): Promise<GeneratedConfig> {
    const { WorkspaceContextManager } = await import('../services/WorkspaceContextManager');
    const { safeWriteFile } = await import('../utils/fileSystem');
    const { ensureDir } = await import('fs-extra');

    // 获取当前工作区
    const currentWorkspace = WorkspaceContextManager.getInstance().getCurrentWorkspaceFolder();
    const workspaceRoot =
      currentWorkspace?.uri.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    const files: Map<string, string> = new Map();
    const organizeBySource = this.shouldOrganizeBySource();
    const outputPath = this.getDirectoryOutputPath();

    // 确保输出目录存在（即使规则为空）
    const outputAbsolutePath = path.join(workspaceRoot, outputPath);
    await ensureDir(outputAbsolutePath);

    if (organizeBySource) {
      // 按源 ID 组织
      await this.generateBySource(rules, workspaceRoot, outputPath, files);
    } else {
      // 平铺结构
      await this.generateFlat(rules, workspaceRoot, outputPath, files);
    }

    // 生成索引文件
    let indexContent = '';
    let indexPath = '';
    if (this.shouldGenerateIndex()) {
      const indexFileName = this.getIndexFileName();

      // 检查是否为每个源目录生成单独索引
      const generatePerSource = organizeBySource && this.shouldGenerateIndexPerSource();

      if (generatePerSource) {
        // 为每个源目录生成单独的索引
        const rulesBySource = new Map<string, ParsedRule[]>();
        for (const rule of rules) {
          const sourceRules = rulesBySource.get(rule.sourceId) || [];
          sourceRules.push(rule);
          rulesBySource.set(rule.sourceId, sourceRules);
        }

        for (const [sourceId, sourceRules] of rulesBySource) {
          // 为源目录生成索引，传入 sourceId 表示索引位置在该源目录下
          const sourceIndexContent = await this.generateDirectoryIndex(
            sourceRules,
            false,
            files,
            sourceId,
          );
          const sourceIndexPath = path.join(outputPath, sourceId, indexFileName);
          const sourceIndexAbsolutePath = path.join(workspaceRoot, sourceIndexPath);
          await safeWriteFile(sourceIndexAbsolutePath, sourceIndexContent);
        }

        // 仍然生成根目录的总索引
        indexContent = await this.generateDirectoryIndex(rules, organizeBySource, files);
        indexPath = path.join(outputPath, indexFileName);
        const indexAbsolutePath = path.join(workspaceRoot, indexPath);
        await safeWriteFile(indexAbsolutePath, indexContent);
      } else {
        // 只生成根目录的索引
        indexContent = await this.generateDirectoryIndex(rules, organizeBySource, files);
        indexPath = path.join(outputPath, indexFileName);
        const indexAbsolutePath = path.join(workspaceRoot, indexPath);
        await safeWriteFile(indexAbsolutePath, indexContent);
      }
    }

    const Logger = (await import('../utils/logger')).Logger;
    Logger.info(`Generated directory: ${outputPath}`, {
      fileCount: files.size,
      ruleCount: rules.length,
    });

    debugLog(`[${this.name}] Directory generated:`, {
      outputPath,
      fileCount: files.size,
      ruleCount: rules.length,
    });

    return {
      filePath: indexPath || outputPath,
      content: indexContent,
      generatedAt: new Date(),
      ruleCount: rules.length,
    };
  }

  /**
   * 判断是否按源组织（子类可重写）
   */
  protected shouldOrganizeBySource(): boolean {
    return false;
  }

  /**
   * 判断是否生成索引文件（子类可重写）
   */
  protected shouldGenerateIndex(): boolean {
    return true;
  }

  /**
   * 判断是否为每个源目录生成单独索引（子类可重写）
   * 仅当 organizeBySource=true 且 generateIndex=true 时有效
   */
  protected shouldGenerateIndexPerSource(): boolean {
    return false;
  }

  /**
   * 获取索引文件名（子类可重写）
   */
  protected getIndexFileName(): string {
    return 'index.md';
  }

  /**
   * 获取目录输出路径（子类必须实现）
   */
  protected getDirectoryOutputPath(): string {
    throw new Error('getDirectoryOutputPath must be implemented by subclass');
  }

  /**
   * 获取规则文件名（子类可重写以自定义命名规则）
   */
  protected getRuleFileName(rule: ParsedRule): string {
    return path.basename(rule.filePath);
  }

  /**
   * 按源 ID 组织文件
   */
  protected async generateBySource(
    rules: ParsedRule[],
    workspaceRoot: string,
    outputPath: string,
    files: Map<string, string>,
  ): Promise<void> {
    // 按源 ID 分组
    const rulesBySource = new Map<string, ParsedRule[]>();
    for (const rule of rules) {
      const sourceRules = rulesBySource.get(rule.sourceId) || [];
      sourceRules.push(rule);
      rulesBySource.set(rule.sourceId, sourceRules);
    }

    // 为每个源生成文件
    for (const [sourceId, sourceRules] of rulesBySource) {
      for (const rule of sourceRules) {
        await this.writeRuleFile(rule, workspaceRoot, outputPath, sourceId, files);
      }
    }
  }

  /**
   * 平铺结构(不按源组织)
   */
  protected async generateFlat(
    rules: ParsedRule[],
    workspaceRoot: string,
    outputPath: string,
    files: Map<string, string>,
  ): Promise<void> {
    for (const rule of rules) {
      await this.writeRuleFile(rule, workspaceRoot, outputPath, undefined, files);
    }
  }

  /**
   * 计算规则文件相对于规则源 subPath 的相对路径
   * 例如：filePath = /cache/source/1300-skills/a/b/c/file.md, subPath = 1300-skills/
   * 返回：a/b/c/file.md
   *
   * 对于用户技能/规则（sourceId = 'user-skills' | 'user-rules'），返回相对于用户目录的路径
   */
  private async getRelativePathFromSubPath(
    filePath: string,
    sourceId: string,
  ): Promise<string | null> {
    try {
      const path = await import('path');
      const {
        getUserSkillsDirectory,
        getUserRulesDirectory,
        USER_SKILLS_SOURCE_ID,
        USER_RULES_SOURCE_ID,
      } = await import('../utils/userRules');

      // 对于用户技能/规则（虚拟规则源），使用用户目录作为基准
      if (sourceId === USER_SKILLS_SOURCE_ID) {
        const userSkillsDir = getUserSkillsDirectory();
        if (!userSkillsDir) {
          return null;
        }
        const relativePath = path.relative(userSkillsDir, filePath);
        if (relativePath.startsWith('..')) {
          return null;
        }
        return relativePath;
      }

      if (sourceId === USER_RULES_SOURCE_ID) {
        const userRulesDir = getUserRulesDirectory();
        if (!userRulesDir) {
          return null;
        }
        const relativePath = path.relative(userRulesDir, filePath);
        if (relativePath.startsWith('..')) {
          return null;
        }
        return relativePath;
      }

      // 对于远程规则源
      const { ConfigManager } = await import('../services/ConfigManager');
      const { GitManager } = await import('../services/GitManager');

      const configManager = ConfigManager.getInstance();
      const gitManager = GitManager.getInstance();

      // 获取规则源配置
      const config = await configManager.getConfig();
      const source = config.sources.find((s) => s.id === sourceId);

      if (!source) {
        return null;
      }

      // 获取规则源本地路径
      const sourcePath = gitManager.getSourcePath(sourceId);
      const rulesBasePath = path.join(sourcePath, source.subPath || '');

      // 计算相对路径
      const relativePath = path.relative(rulesBasePath, filePath);

      // 如果相对路径以 .. 开头，说明文件不在 subPath 下，返回 null
      if (relativePath.startsWith('..')) {
        return null;
      }

      return relativePath;
    } catch (_error) {
      return null;
    }
  }

  /**
   * 写入规则文件
   * 对于 SKILL.md 文件（Skills 适配器），会复制整个父目录
   * 保持相对于规则源 subPath 的目录结构
   */
  protected async writeRuleFile(
    rule: ParsedRule,
    workspaceRoot: string,
    outputPath: string,
    sourceId: string | undefined,
    files: Map<string, string>,
  ): Promise<void> {
    const path = await import('path');
    const { safeWriteFile, safeCopyDir } = await import('../utils/fileSystem');
    const Logger = (await import('../utils/logger')).Logger;
    const { toRelativePath } = await import('../utils/pathHelper');

    // 计算相对于 subPath 的路径
    let relativeToSubPath: string | null = null;
    if (rule.sourceId) {
      relativeToSubPath = await this.getRelativePathFromSubPath(rule.filePath, rule.sourceId);
    }

    // 检查是否是 SKILL.md 文件（不区分大小写）
    const isSkillFile = path.basename(rule.filePath).toLowerCase() === 'skill.md';
    const shouldCopy = this.shouldCopySkillDirectory();

    if (isSkillFile && shouldCopy && relativeToSubPath) {
      // 复制整个父目录
      const sourceDir = path.dirname(rule.filePath);

      // 平铺模式：只使用父目录名（去掉所有上层路径）
      // 保持目录结构：使用完整的相对路径
      let dirRelativePath: string;
      if (this.preserveDirectoryStructure) {
        // 保持目录结构：1300-skills/git-workflow-expert
        dirRelativePath = path.dirname(relativeToSubPath);
      } else {
        // 平铺模式：git-workflow-expert（只取最后一层目录名）
        dirRelativePath = path.basename(path.dirname(relativeToSubPath));
      }

      const targetDir = sourceId
        ? path.join(workspaceRoot, outputPath, sourceId, dirRelativePath)
        : path.join(workspaceRoot, outputPath, dirRelativePath);

      Logger.debug('Copying skill directory', {
        sourceDir: toRelativePath(sourceDir),
        targetDir: toRelativePath(targetDir),
        relativeToSubPath: dirRelativePath,
        preserveStructure: this.preserveDirectoryStructure,
      });
      await safeCopyDir(sourceDir, targetDir);

      const relativePath = sourceId
        ? path.join(outputPath, sourceId, dirRelativePath)
        : path.join(outputPath, dirRelativePath);

      files.set(relativePath, `[Directory: ${path.basename(sourceDir)}]`);
      Logger.info(`✅ Copied skill directory: ${relativePath}`);
    } else {
      // 普通文件处理
      let targetPath: string;

      if (this.preserveDirectoryStructure && relativeToSubPath) {
        // 保持相对于 subPath 的目录结构
        targetPath = sourceId
          ? path.join(outputPath, sourceId, relativeToSubPath)
          : path.join(outputPath, relativeToSubPath);
      } else {
        // 平铺模式：所有文件直接放在输出目录下，不包含任何子目录
        // 例如: .skills/rule1.md, .skills/rule2.md
        // 注意：SKILL.md 文件会在前面的逻辑中复制整个父目录，不会到这里
        const fileName = this.getRuleFileName(rule);
        targetPath = sourceId
          ? path.join(outputPath, sourceId, fileName)
          : path.join(outputPath, fileName);
      }

      const absolutePath = path.join(workspaceRoot, targetPath);
      // 使用原始内容（包含 frontmatter），保持规则文件原样
      const content = rule.rawContent;

      await safeWriteFile(absolutePath, content);
      files.set(targetPath, content);
      Logger.debug(`Written rule file: ${targetPath}`);
    }
  }

  /**
   * 是否应该复制 SKILL.md 的整个目录（子类可重写）
   * 默认返回 false，Skills 适配器应该重写为 true
   */
  protected shouldCopySkillDirectory(): boolean {
    return false;
  }

  /**
   * 生成目录索引
   * @param rules 规则列表
   * @param organizeBySource 是否按源组织
   * @param filesMap 已生成的文件路径映射（key为相对路径）
   * @param indexLocationSourceId 索引文件所在的源目录（如果在源目录下生成）
   */
  protected async generateDirectoryIndex(
    rules: ParsedRule[],
    organizeBySource: boolean,
    filesMap?: Map<string, string>,
    indexLocationSourceId?: string,
  ): Promise<string> {
    const lines: string[] = [];

    lines.push(`# ${this.name}\n`);
    lines.push(this.generateMetadata(rules.length));

    if (organizeBySource) {
      // 按源分组显示
      const rulesBySource = new Map<string, ParsedRule[]>();
      for (const rule of rules) {
        const sourceRules = rulesBySource.get(rule.sourceId) || [];
        sourceRules.push(rule);
        rulesBySource.set(rule.sourceId, sourceRules);
      }

      for (const [sourceId, sourceRules] of rulesBySource) {
        lines.push(`## Source: ${sourceId}\n`);
        lines.push(`Total rules: ${sourceRules.length}\n`);

        for (const rule of sourceRules) {
          // 尝试从 filesMap 中找到实际路径
          const actualPath = await this.findRulePathInFilesMap(
            rule,
            filesMap,
            indexLocationSourceId,
          );
          const linkPath = actualPath || `./${sourceId}/${rule.id}.md`;
          lines.push(`- [${rule.title}](${linkPath})`);
        }

        lines.push('');
      }
    } else {
      // 平铺列表
      lines.push(`## All Rules\n`);
      lines.push(`Total rules: ${rules.length}\n`);

      for (const rule of rules) {
        // 尝试从 filesMap 中找到实际路径
        const actualPath = await this.findRulePathInFilesMap(rule, filesMap, indexLocationSourceId);
        const linkPath = actualPath || `./${rule.sourceId}-${rule.id}.md`;
        lines.push(`- [${rule.title}](${linkPath}) *(from ${rule.sourceId})*`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 从 filesMap 中查找规则的实际路径
   * @param rule 规则对象
   * @param filesMap 已生成的文件映射
   * @param indexLocationSourceId 索引文件所在的源目录（如果在源目录下生成）
   * @returns 相对于索引文件的路径，例如 ./sourceId/a/b/c/file.md 或 ./a/b/c/file.md
   */
  private async findRulePathInFilesMap(
    rule: ParsedRule,
    filesMap?: Map<string, string>,
    indexLocationSourceId?: string,
  ): Promise<string | null> {
    if (!filesMap) {
      return null;
    }

    const path = await import('path');

    // 检查是否是 SKILL.md 文件
    const isSkillFile = path.basename(rule.filePath).toLowerCase() === 'skill.md';

    // 遍历 filesMap，找到匹配的文件
    for (const [relativePath, content] of filesMap) {
      // 检查是否是目录条目（SKILL 目录）
      if (content.startsWith('[Directory:')) {
        // 对于 SKILL 目录，如果当前规则是 SKILL.md，则返回目录下的 SKILL.md 路径
        if (isSkillFile) {
          // relativePath 格式: .skills/sourceId/1300-skills/git-workflow-expert 或 .skills/git-workflow-expert
          const parts = relativePath.split(path.sep);
          if (parts.length > 1) {
            // 去掉第一个部分（outputPath）
            let relativeToIndex = parts.slice(1).join('/');

            // 如果索引在源目录下，还要去掉 sourceId
            if (indexLocationSourceId && relativeToIndex.startsWith(indexLocationSourceId + '/')) {
              relativeToIndex = relativeToIndex.substring(indexLocationSourceId.length + 1);
            }

            return `./${relativeToIndex}/SKILL.md`;
          } else {
            const dirName = path.basename(relativePath);
            return `./${dirName}/SKILL.md`;
          }
        }
        continue;
      }

      const basename = path.basename(relativePath);
      const ruleFileName = this.getRuleFileName(rule);

      // 检查文件名是否匹配
      if (basename === ruleFileName || basename === `${rule.id}.md`) {
        // relativePath 格式: outputPath/sourceId/a/b/c/file.md
        // 索引文件在: outputPath/index.md 或 outputPath/sourceId/index.md
        // 需要提取相对路径部分

        // 分割路径，去掉第一个部分（outputPath）
        const parts = relativePath.split(path.sep);
        if (parts.length > 1) {
          let relativeToIndex = parts.slice(1).join('/');

          // 如果索引在源目录下，去掉 sourceId 前缀
          if (indexLocationSourceId && relativeToIndex.startsWith(indexLocationSourceId + '/')) {
            relativeToIndex = relativeToIndex.substring(indexLocationSourceId.length + 1);
          }

          return `./${relativeToIndex}`;
        } else {
          // 如果路径只有一层（不太可能），直接返回
          return `./${basename}`;
        }
      }
    }

    return null;
  }

  /**
   * 获取输出类型
   * 子类需要实现
   */
  protected abstract getOutputType(): 'file' | 'directory';

  /**
   * 生成头部内容（文件元数据、标题、说明、目录等）
   * 子类需要实现
   */
  protected abstract generateHeaderContent(rules: ParsedRule[]): string;

  abstract getFilePath(): string;

  /**
   * 设置用户规则配置
   */
  setEnableUserRules(enabled: boolean): void {
    this.enableUserRules = enabled;
  }

  /**
   * 设置排序配置
   */
  setSortConfig(sortBy: 'id' | 'priority' | 'none', sortOrder: 'asc' | 'desc'): void {
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
  }

  /**
   * 设置是否保持目录层级结构
   */
  setPreserveDirectoryStructure(preserve: boolean): void {
    this.preserveDirectoryStructure = preserve;
  }

  /**
   * @description 加载用户规则或用户技能（根据适配器类型）
   * @return default {Promise<ParsedRule[]>}
   */
  protected async loadUserRules(): Promise<ParsedRule[]> {
    if (!this.enableUserRules) {
      return [];
    }

    if (this.isRuleType) {
      // 加载用户规则（ai-rules/）
      const { loadUserRules } = await import('../utils/userRules');
      return await loadUserRules();
    } else {
      // 加载用户技能（ai-skills/）
      const { loadUserSkills } = await import('../utils/userRules');
      return await loadUserSkills();
    }
  }

  /**
   * @description 合并远程规则和用户规则/技能，按排序配置处理冲突
   * @return default {ParsedRule[]}
   * @param remoteRules {ParsedRule[]}
   * @param userRules {ParsedRule[]}
   */
  protected async mergeWithUserRules(
    remoteRules: ParsedRule[],
    userRules: ParsedRule[],
  ): Promise<ParsedRule[]> {
    // 对于技能适配器，应用 skill.md 过滤逻辑
    let processedUserRules = userRules;
    if (!this.isRuleType && userRules.length > 0) {
      const { filterSkillRules } = await import('../utils/userRules');
      processedUserRules = filterSkillRules(userRules);
    }

    if (processedUserRules.length === 0) {
      return this.sortRules(remoteRules); // 即使没有用户规则，也要排序
    }

    // 合并所有规则
    const allRules = [...remoteRules, ...processedUserRules];

    // 按 ID 去重，使用排序后的结果（排序高的优先）
    const ruleMap = new Map<string, ParsedRule>();

    // 先排序
    const sortedRules = this.sortRules(allRules);

    // 再去重（排序后的顺序会影响冲突解决）
    for (const rule of sortedRules) {
      if (!ruleMap.has(rule.id)) {
        ruleMap.set(rule.id, rule);
      }
    }

    return Array.from(ruleMap.values());
  }

  /**
   * @description 排序规则
   * @return default {ParsedRule[]}
   * @param rules {ParsedRule[]}
   * @param sortBy {('id' | 'priority' | 'none')} - 可选，默认使用实例的 sortBy
   * @param sortOrder {('asc' | 'desc')} - 可选，默认使用实例的 sortOrder
   */
  protected sortRules(
    rules: ParsedRule[],
    sortBy?: 'id' | 'priority' | 'none',
    sortOrder?: 'asc' | 'desc',
  ): ParsedRule[] {
    const actualSortBy = sortBy ?? this.sortBy;
    const actualSortOrder = sortOrder ?? this.sortOrder;

    if (actualSortBy === 'none') {
      return rules;
    }

    return [...rules].sort((a, b) => {
      let comparison = 0;

      if (actualSortBy === 'id') {
        comparison = a.id.localeCompare(b.id);
      } else if (actualSortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.metadata.priority as keyof typeof priorityOrder] || 0;
        const bPriority = priorityOrder[b.metadata.priority as keyof typeof priorityOrder] || 0;
        comparison = aPriority - bPriority;

        // 优先级相同时，使用 id 作为次要排序条件
        // 没有 id 的算作最小的 id，排在前面
        if (comparison === 0) {
          const aHasId = a.id && a.id.trim().length > 0;
          const bHasId = b.id && b.id.trim().length > 0;

          if (aHasId && !bHasId) {
            comparison = 1; // a 有 id，b 没 id，b 排前面（没 id = 最小）
          } else if (!aHasId && bHasId) {
            comparison = -1; // a 没 id，b 有 id，a 排前面（没 id = 最小）
          } else if (aHasId && bHasId) {
            comparison = a.id.localeCompare(b.id); // 都有 id，按字母顺序
          }
        }
      }

      return actualSortOrder === 'asc' ? comparison : -comparison;
    });
  }

  /**
   * 默认验证：检查内容是否非空
   */
  validate(content: string): boolean {
    return content.trim().length > 0;
  }

  /**
   * 格式化规则内容（通用工具方法）
   * @param rules 规则列表
   * @returns 格式化后的内容
   */
  protected formatRules(rules: ParsedRule[]): string {
    return rules
      .map((rule) => {
        const header = `# ${rule.title}\n`;
        const content = rule.content;
        const separator = '\n---\n\n';
        return header + content + separator;
      })
      .join('');
  }

  /**
   * 生成元数据注释
   * @param ruleCount 规则数量
   * @returns 元数据注释
   */
  protected generateMetadata(ruleCount: number): string {
    const timestamp = new Date().toISOString();
    return (
      `<!-- Generated by Turbo AI Rules at ${timestamp} -->\n` +
      `<!-- Total rules: ${ruleCount} -->\n\n`
    );
  }

  /**
   * 生成统一的文件头部（元数据 + 标题 + 说明）
   * @param toolName AI 工具名称
   * @param ruleCount 规则数量
   * @returns 文件头部内容
   */
  protected generateFileHeader(toolName: string, ruleCount: number): string {
    let header = '';
    header += this.generateMetadata(ruleCount);
    header += `# AI Coding Rules for ${toolName}\n\n`;
    header += '> This file is automatically generated by Turbo AI Rules extension.\n';
    return header;
  }

  /**
   * 生成目录（Table of Contents）
   * @param rules 规则列表
   * @returns 目录内容
   */
  protected generateTableOfContents(rules: ParsedRule[]): string {
    if (!rules || rules.length === 0) return '';

    let toc = '## Table of Contents\n\n';

    for (const rule of rules) {
      const anchor = this.createAnchor(rule.title);
      toc += `- [${rule.title}](#${anchor})\n`;
    }

    toc += '\n---\n\n';
    return toc;
  }

  /**
   * 创建标题锚点
   * @param title 标题
   * @returns 锚点字符串
   */
  protected createAnchor(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * 格式化规则元数据为单行
   * @param rule 规则
   * @returns 元数据字符串
   */
  protected formatRuleMetadata(rule: ParsedRule): string {
    const metaParts: string[] = [];
    if (rule.metadata.priority) metaParts.push(`**Priority:** ${rule.metadata.priority}`);
    if (rule.metadata.tags && rule.metadata.tags.length > 0)
      metaParts.push(`**Tags:** ${rule.metadata.tags.join(', ')}`);
    if (rule.sourceId) metaParts.push(`**Source:** ${rule.sourceId}`);
    if (rule.filePath) metaParts.push(`**File:** ${rule.filePath}`);
    if (rule.metadata.author) metaParts.push(`**Author:** ${rule.metadata.author}`);
    if (rule.metadata.version) metaParts.push(`**Version:** ${rule.metadata.version}`);

    return metaParts.length > 0 ? metaParts.join(' | ') : '';
  }

  /**
   * 按优先级排序规则
   * @param rules 规则列表
   * @returns 排序后的规则列表
   */
  protected sortByPriority(rules: ParsedRule[]): ParsedRule[] {
    const priorityOrder = { high: 3, medium: 2, low: 1 };

    return [...rules].sort((a, b) => {
      const aPriority = a.metadata.priority || 'low';
      const bPriority = b.metadata.priority || 'low';
      return priorityOrder[bPriority] - priorityOrder[aPriority];
    });
  }

  /**
   * 按 ID 排序规则（字符串排序）
   * @param rules 规则列表
   * @returns 排序后的规则列表
   */
  protected sortById(rules: ParsedRule[]): ParsedRule[] {
    return [...rules].sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * 按标签分组规则
   * @param rules 规则列表
   * @returns 按标签分组的 Map
   */
  protected groupByTag(rules: ParsedRule[]): Map<string, ParsedRule[]> {
    const groups = new Map<string, ParsedRule[]>();

    for (const rule of rules) {
      const tags = rule.metadata.tags || ['general'];
      for (const tag of tags) {
        const existing = groups.get(tag) || [];
        existing.push(rule);
        groups.set(tag, existing);
      }
    }

    return groups;
  }
}
