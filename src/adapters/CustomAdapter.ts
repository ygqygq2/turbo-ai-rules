/**
 * 自定义适配器
 * 支持灵活的输出配置: 文件/目录、文件过滤、源组织等
 */

import * as path from 'path';
import * as vscode from 'vscode';

import { WorkspaceContextManager } from '../services/WorkspaceContextManager';
import type { CustomAdapterConfig } from '../types/config';
import type { ParsedRule } from '../types/rules';
import { safeWriteFile } from '../utils/fileSystem';
import { Logger } from '../utils/logger';
import { getBlockMarkers } from '../utils/userRules';
import { BaseAdapter, GeneratedConfig } from './AIToolAdapter';

/**
 * 自定义适配器
 * 支持灵活的输出配置: 文件/目录、文件过滤、源组织等
 */
export class CustomAdapter extends BaseAdapter {
  public readonly name: string;
  public readonly enabled: boolean;
  public readonly config: CustomAdapterConfig;

  constructor(config: CustomAdapterConfig) {
    super();
    this.config = config;
    this.name = config.name;
    this.enabled = config.enabled;

    // 设置enableUserRules：
    // - 如果配置中明确指定，使用配置值
    // - 否则：skills类型(isRuleType=false)默认为false，规则类型默认为true
    const isRuleType = config.isRuleType ?? true;
    this.enableUserRules = config.enableUserRules ?? isRuleType;
  }

  /**
   * 设置是否启用用户规则
   */
  public setEnableUserRules(enabled: boolean): void {
    this.enableUserRules = enabled;
  }

  /**
   * 设置排序配置
   */
  public setSortConfig(sortBy: 'id' | 'priority' | 'none', sortOrder: 'asc' | 'desc'): void {
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
  }

  /**
   * 获取配置文件路径
   */
  public getFilePath(): string {
    return this.config.outputPath;
  }

  /**
   * 获取输出类型
   */
  protected getOutputType(): 'file' | 'directory' {
    return this.config.outputType;
  }

  /**
   * 生成文件头部内容
   */
  protected generateHeaderContent(rules: ParsedRule[]): string {
    const totalCount = rules.length;
    let header = '';

    // 文件头部（元数据 + 标题 + 说明）
    header += this.generateFileHeader(this.config.name, totalCount);

    // 添加目录索引
    header += this.generateTableOfContents(rules);

    return header;
  }

  /**
   * 单文件模式生成（支持自定义模板）
   * @description 如果配置了 fileTemplate，使用模板生成；否则使用父类默认格式
   */
  protected generateSingleFile(rules: ParsedRule[]): GeneratedConfig {
    // 如果配置了自定义模板，使用模板生成
    if (this.config.fileTemplate) {
      return this.generateWithTemplate(rules);
    }

    // 否则使用父类的默认格式（包含规则源标记）
    return super.generateSingleFile(rules);
  }

  /**
   * 使用自定义模板生成文件内容
   * @description 用户的前缀和后缀会被插入到全局标记（TURBO-AI-RULES:BEGIN/END）内部
   */
  private generateWithTemplate(rules: ParsedRule[]): GeneratedConfig {
    const template = this.config.fileTemplate!;

    // 使用父类方法生成完整的带标记的规则内容
    const { content: fullContent } = super.generateSingleFile(rules);

    // 从配置获取全局标记
    const blockMarkers = getBlockMarkers();
    const blockBeginMarker = blockMarkers.begin;
    const blockEndMarker = blockMarkers.end;

    // 找到全局标记的位置
    const beginIndex = fullContent.indexOf(blockBeginMarker);
    const endIndex = fullContent.lastIndexOf(blockEndMarker);

    if (beginIndex === -1 || endIndex === -1) {
      // 如果没有全局标记，直接替换（降级处理）
      return {
        filePath: this.getFilePath(),
        content: template.replace(/\{\{rules\}\}/g, fullContent),
        generatedAt: new Date(),
        ruleCount: rules.length,
      };
    }

    // 提取全局标记之间的内容
    const beforeBegin = fullContent.substring(0, beginIndex + blockBeginMarker.length);
    const afterBegin = fullContent.substring(beginIndex + blockBeginMarker.length, endIndex);
    const afterEnd = fullContent.substring(endIndex);

    // 构建模板内容（用户的 {{rules}} 会被替换为全局标记之间的系统内容）
    const templateWithRules = template.replace(/\{\{rules\}\}/g, afterBegin.trim());

    // 重新组装：全局开始标记 + 模板内容 + 全局结束标记
    const content = `${beforeBegin}\n${templateWithRules}\n${afterEnd}`;

    return {
      filePath: this.getFilePath(),
      content,
      generatedAt: new Date(),
      ruleCount: rules.length,
    };
  }

  /**
   * 统一的生成方法（覆盖父类以支持自定义适配器的特殊逻辑）
   * @description 在调用父类方法前应用自定义适配器的所有预处理逻辑
   */
  async generate(rules: ParsedRule[], allRules?: ParsedRule[]): Promise<GeneratedConfig> {
    // 1. 应用自定义适配器的预处理逻辑
    const filteredRules = this.applyCustomFilters(rules);

    // 2. 调用父类方法处理统一的同步逻辑（加载用户规则、合并、排序、生成）
    return super.generate(filteredRules, allRules);
  }

  /**
   * 应用自定义适配器的所有过滤逻辑
   * @description 集中处理所有自定义过滤需求，便于扩展
   * @param rules 原始规则列表
   * @returns 过滤后的规则列表
   */
  private applyCustomFilters(rules: ParsedRule[]): ParsedRule[] {
    let filteredRules = rules;

    // 过滤器1: 文件扩展名过滤
    filteredRules = this.filterByExtension(filteredRules);

    // 未来可以在这里添加更多过滤器
    // 过滤器2: ...
    // 过滤器3: ...

    Logger.debug(`Custom filters applied for adapter ${this.config.id}`, {
      originalCount: rules.length,
      filteredCount: filteredRules.length,
    });

    if (filteredRules.length === 0) {
      Logger.warn(`No rules match custom filters for adapter: ${this.config.id}`);
    }

    return filteredRules;
  }

  /**
   * 过滤规则（公开方法，供外部需要时使用）
   * @param rules 规则列表
   * @returns 过滤后的规则列表
   */
  public filterRules(rules: ParsedRule[]): ParsedRule[] {
    return this.applyCustomFilters(rules);
  }

  /**
   * 根据文件扩展名过滤规则
   * @param rules 所有规则
   * @returns 过滤后的规则列表
   */
  private filterByExtension(rules: ParsedRule[]): ParsedRule[] {
    // 未配置过滤规则，同步所有文件(不过滤)
    if (!this.config.fileExtensions || this.config.fileExtensions.length === 0) {
      return rules;
    }

    // 调试：输出规则文件路径
    if (rules.length > 0) {
      Logger.debug(`Filtering rules for adapter: ${this.config.id}`, {
        totalRules: rules.length,
        extensions: this.config.fileExtensions,
        samplePaths: rules.slice(0, 3).map((r) => r.filePath),
      });
    }

    // 根据文件后缀过滤
    const filtered = rules.filter((rule) => {
      // 检查规则的源文件是否匹配任一后缀
      if (!rule.filePath) {
        return true; // 没有源文件信息，保留
      }
      return this.config.fileExtensions!.some((ext) => rule.filePath.endsWith(ext));
    });

    Logger.debug(`Filter result for adapter: ${this.config.id}`, {
      before: rules.length,
      after: filtered.length,
    });

    return filtered;
  }

  /**
   * 生成目录结构输出
   */
  protected async generateDirectory(
    rules: ParsedRule[],
    _allRules?: ParsedRule[],
  ): Promise<GeneratedConfig> {
    // 使用 WorkspaceContextManager 获取当前工作区，而不是默认第一个
    const currentWorkspace = WorkspaceContextManager.getInstance().getCurrentWorkspaceFolder();
    const workspaceRoot =
      currentWorkspace?.uri.fsPath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
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

    Logger.info(`Generated directory: ${this.config.outputPath}`, {
      fileCount: files.size,
      ruleCount: rules.length,
    });

    return {
      filePath: indexPath || this.config.outputPath,
      content: indexContent,
      generatedAt: new Date(),
      ruleCount: rules.length,
    };
  }

  /**
   * 替换路径模板中的占位符
   */
  private replacePathTemplate(template: string, rule: ParsedRule): string {
    return template
      .replace(/\{\{ruleId\}\}/g, rule.id)
      .replace(/\{\{ruleName\}\}/g, rule.title || rule.id)
      .replace(/\{\{sourceId\}\}/g, rule.sourceId);
  }

  /**
   * 获取规则文件名（公开方法，供FileGenerator清理时使用）
   */
  public getRuleFileName(rule: ParsedRule): string {
    // 如果配置了 directoryStructure.pathTemplate，使用模板
    if (this.config.directoryStructure?.pathTemplate) {
      return this.replacePathTemplate(this.config.directoryStructure.pathTemplate, rule);
    }

    // 否则使用 useOriginalFilename 设置
    const useOriginalFilename = this.config.useOriginalFilename ?? true;
    return useOriginalFilename ? path.basename(rule.filePath) : `${rule.sourceId}-${rule.id}.md`;
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
    for (const [sourceId, sourceRules] of rulesBySource) {
      for (const rule of sourceRules) {
        const fileName = this.getRuleFileName(rule);
        const relativePath = path.join(this.config.outputPath, sourceId, fileName);
        const absolutePath = path.join(workspaceRoot, relativePath);
        // 使用原始内容（包含 frontmatter），保持规则文件原样
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
    for (const rule of rules) {
      // 使用模板或原文件名
      const fileName = this.getRuleFileName(rule);
      const relativePath = path.join(this.config.outputPath, fileName);
      const absolutePath = path.join(workspaceRoot, relativePath);
      // 使用原始内容（包含 frontmatter），保持规则文件原样
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
