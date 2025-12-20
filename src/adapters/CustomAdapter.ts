/**
 * 自定义适配器
 * 支持灵活的输出配置: 文件/目录、文件过滤、源组织等
 */

import * as path from 'path';
import * as vscode from 'vscode';

import type { CustomAdapterConfig } from '../types/config';
import type { ParsedRule } from '../types/rules';
import { CONFIG_KEYS, CONFIG_PREFIX } from '../utils/constants';
import { safeWriteFile } from '../utils/fileSystem';
import { Logger } from '../utils/logger';
import type { UserRulesProtectionConfig } from '../utils/userRulesProtection';
import {
  cleanDirectoryByRules,
  isUserDefinedRule,
  mergeRuleLists,
} from '../utils/userRulesProtection';
import { BaseAdapter, GeneratedConfig } from './AIToolAdapter';

/**
 * 自定义适配器
 * 支持灵活的输出配置: 文件/目录、文件过滤、源组织等
 */
export class CustomAdapter extends BaseAdapter {
  public readonly name: string;
  public readonly enabled: boolean;
  public readonly config: CustomAdapterConfig;
  private protectionConfig: UserRulesProtectionConfig;

  constructor(config: CustomAdapterConfig) {
    super();
    this.config = config;
    this.name = config.name;
    this.enabled = config.enabled;
    this.protectionConfig = this.loadProtectionConfig();
  }

  /**
   * 加载用户规则保护配置
   */
  private loadProtectionConfig(): UserRulesProtectionConfig {
    const config = vscode.workspace.getConfiguration(CONFIG_PREFIX);
    return {
      enabled: config.get<boolean>(CONFIG_KEYS.PROTECT_USER_RULES, true),
      userPrefixRange: config.get(CONFIG_KEYS.USER_PREFIX_RANGE, { min: 80000, max: 99999 }),
      blockMarkers: config.get(CONFIG_KEYS.BLOCK_MARKERS),
    };
  }

  /**
   * 获取配置文件路径
   */
  public getFilePath(): string {
    return this.config.outputPath;
  }

  /**
   * 生成输出配置
   */
  public async generate(rules: ParsedRule[], allRules?: ParsedRule[]): Promise<GeneratedConfig> {
    try {
      Logger.info(`Generating custom adapter output: ${this.config.id}`, {
        ruleCount: rules.length,
        outputType: this.config.outputType,
      });

      // 过滤规则
      const filteredRules = this.filterRules(rules);
      Logger.debug(`Filtered rules: ${filteredRules.length}/${rules.length}`);

      if (filteredRules.length === 0) {
        Logger.warn(`No rules match filter for adapter: ${this.config.id}`);
      }

      // 根据输出类型生成
      if (this.config.outputType === 'file') {
        return await this.generateFile(filteredRules);
      } else {
        // 目录模式：合并用户保护规则
        const finalRules = this.mergeWithProtectedRules(filteredRules, allRules);
        return await this.generateDirectory(finalRules, allRules);
      }
    } catch (error) {
      Logger.error(`Failed to generate custom adapter output: ${this.config.id}`, error as Error);
      throw error;
    }
  }

  /**
   * 合并过滤后的规则和用户保护规则
   */
  private mergeWithProtectedRules(
    filteredRules: ParsedRule[],
    allRules?: ParsedRule[],
  ): ParsedRule[] {
    if (!this.protectionConfig.enabled || !allRules) {
      return filteredRules;
    }

    // 从所有规则中识别用户保护规则
    const protectedRules = allRules.filter((rule) =>
      isUserDefinedRule(rule, this.protectionConfig),
    );

    if (protectedRules.length > 0) {
      Logger.info('Merging user-protected rules', {
        filtered: filteredRules.length,
        protected: protectedRules.length,
      });
      return mergeRuleLists(filteredRules, protectedRules);
    }

    return filteredRules;
  }

  /**
   * 过滤规则
   * 根据文件后缀过滤
   * @param rules 所有规则
   * @returns 过滤后的规则列表
   */
  private filterRules(rules: ParsedRule[]): ParsedRule[] {
    // 未配置过滤规则，同步所有文件(不过滤)
    if (!this.config.fileExtensions || this.config.fileExtensions.length === 0) {
      return rules;
    }

    // 根据文件后缀过滤
    return rules.filter((rule) => {
      // 检查规则的源文件是否匹配任一后缀
      if (!rule.filePath) {
        return true; // 没有源文件信息，保留
      }
      return this.config.fileExtensions!.some((ext) => rule.filePath.endsWith(ext));
    });
  }

  /**
   * @description 生成单个文件输出
   * @return default {auto}
   */
  private async generateFile(rules: ParsedRule[]): Promise<GeneratedConfig> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    // 按优先级排序
    const sortedRules = this.sortByPriority(rules);

    // 生成内容
    const content = this.generateFileContent(sortedRules);

    // 写入文件
    const absolutePath = path.join(workspaceRoot, this.config.outputPath);
    await safeWriteFile(absolutePath, content);

    Logger.info(`Generated file: ${this.config.outputPath}`, {
      ruleCount: rules.length,
      contentLength: content.length,
    });

    return {
      filePath: this.config.outputPath,
      content,
      generatedAt: new Date(),
      ruleCount: rules.length,
    };
  }

  /**
   * @description 生成文件内容
   * @return default {string}
   * @param rules {ParsedRule[]}
   */
  private generateFileContent(rules: ParsedRule[]): string {
    let content = '';

    // 使用统一的文件头部（但使用自定义名称）
    content += this.generateMetadata(rules.length);
    content += `# ${this.config.name}\n\n`;
    content += '> This file is automatically generated by Turbo AI Rules extension.\n';
    content += '> Do not edit manually - changes will be overwritten on next sync.\n\n';

    // 添加目录
    content += this.generateTableOfContents(rules);

    // 添加规则
    for (const rule of rules) {
      content += `## ${rule.title}\n\n`;

      // 使用原始内容（包含 frontmatter）
      content += `${rule.rawContent.trim()}\n`;
    }

    // 添加最后的分隔符
    if (rules.length > 0) {
      content = content.replace(/\n$/, '\n\n---\n\n');
    }

    return content;
  }

  /**
   * 生成目录结构输出
   */
  private async generateDirectory(
    rules: ParsedRule[],
    _allRules?: ParsedRule[],
  ): Promise<GeneratedConfig> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    const files: Map<string, string> = new Map();
    const organizeBySource = this.config.organizeBySource ?? false;

    if (organizeBySource) {
      // 按源 ID 组织
      await this.generateBySource(rules, workspaceRoot, files);
    } else {
      // 平铺结构
      await this.generateFlat(rules, workspaceRoot, files);
    }

    // 生成索引文件
    let indexContent = '';
    let indexPath = '';
    if (this.config.generateIndex ?? true) {
      indexContent = this.generateDirectoryIndex(rules, organizeBySource);
      const indexFileName = this.config.indexFileName || 'index.md';
      indexPath = path.join(this.config.outputPath, indexFileName);
      const indexAbsolutePath = path.join(workspaceRoot, indexPath);
      await safeWriteFile(indexAbsolutePath, indexContent);
    }

    // 清理未选中的文件（所有目录类型适配器都执行清理）
    const outputDir = path.join(workspaceRoot, this.config.outputPath);
    const cleanupResult = await cleanDirectoryByRules(outputDir, rules, this.protectionConfig);

    if (cleanupResult.deleted.length > 0) {
      Logger.info('Cleaned unselected rules from directory', {
        adapter: this.config.id,
        deleted: cleanupResult.deleted.length,
        protected: cleanupResult.protectedFiles.length,
        kept: cleanupResult.kept.length,
      });
    }

    Logger.info(`Generated directory: ${this.config.outputPath}`, {
      fileCount: files.size,
      ruleCount: rules.length,
      cleaned: cleanupResult.deleted.length,
    });

    return {
      filePath: indexPath || this.config.outputPath,
      content: indexContent,
      generatedAt: new Date(),
      ruleCount: rules.length,
    };
  }

  /**
   * 按源 ID 组织文件
   */
  private async generateBySource(
    rules: ParsedRule[],
    workspaceRoot: string,
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
    const useOriginalFilename = this.config.useOriginalFilename ?? true;
    for (const [sourceId, sourceRules] of rulesBySource) {
      for (const rule of sourceRules) {
        const fileName = useOriginalFilename ? path.basename(rule.filePath) : `${rule.id}.md`;
        const relativePath = path.join(this.config.outputPath, sourceId, fileName);
        const absolutePath = path.join(workspaceRoot, relativePath);
        // 使用原始内容（包含 frontmatter）
        const content = rule.rawContent;

        await safeWriteFile(absolutePath, content);
        files.set(relativePath, content);
        Logger.debug(`Written rule file: ${relativePath}`);
      }
    }
  }

  /**
   * 平铺结构(不按源组织)
   */
  private async generateFlat(
    rules: ParsedRule[],
    workspaceRoot: string,
    files: Map<string, string>,
  ): Promise<void> {
    const useOriginalFilename = this.config.useOriginalFilename ?? true;
    for (const rule of rules) {
      // 使用原文件名或 sourceId-ruleId 格式
      const fileName = useOriginalFilename
        ? path.basename(rule.filePath)
        : `${rule.sourceId}-${rule.id}.md`;
      const relativePath = path.join(this.config.outputPath, fileName);
      const absolutePath = path.join(workspaceRoot, relativePath);
      // 使用原始内容（包含 frontmatter）
      const content = rule.rawContent;

      await safeWriteFile(absolutePath, content);
      files.set(relativePath, content);
      Logger.debug(`Written rule file: ${relativePath}`);
    }
  }

  /**
   * 生成目录索引
   */
  private generateDirectoryIndex(rules: ParsedRule[], organizeBySource: boolean): string {
    const lines: string[] = [];

    lines.push(`# ${this.config.name}\n`);
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
          lines.push(`- [${rule.title}](./${sourceId}/${rule.id}.md)`);
        }

        lines.push('');
      }
    } else {
      // 平铺列表
      lines.push(`## All Rules\n`);
      lines.push(`Total rules: ${rules.length}\n`);

      for (const rule of rules) {
        const fileName = `${rule.sourceId}-${rule.id}.md`;
        lines.push(`- [${rule.title}](./${fileName}) *(from ${rule.sourceId})*`);
      }
    }

    return lines.join('\n');
  }
}
