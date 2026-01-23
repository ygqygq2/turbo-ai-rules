/**
 * 自定义适配器
 * 支持灵活的输出配置: 文件/目录、文件过滤、源组织等
 */

import * as path from 'path';

import type { CustomAdapterConfig } from '../types/config';
import type { ParsedRule } from '../types/rules';
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

    // 设置preserveDirectoryStructure：仅目录类型有效
    if (config.outputType === 'directory') {
      this.preserveDirectoryStructure = config.preserveDirectoryStructure ?? true;
    }
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
   * 判断是否按源组织（重写基类方法）
   */
  protected shouldOrganizeBySource(): boolean {
    return this.config.organizeBySource ?? false;
  }

  /**
   * 判断是否生成索引文件（重写基类方法）
   */
  protected shouldGenerateIndex(): boolean {
    return this.config.generateIndex ?? true;
  }

  /**
   * 判断是否为每个源目录生成单独索引
   */
  protected shouldGenerateIndexPerSource(): boolean {
    return this.config.indexPerSource ?? false;
  }

  /**
   * 获取索引文件名（重写基类方法）
   */
  protected getIndexFileName(): string {
    return this.config.indexFileName || 'index.md';
  }

  /**
   * 获取目录输出路径（重写基类方法）
   */
  protected getDirectoryOutputPath(): string {
    return this.config.outputPath;
  }

  /**
   * 是否应该复制 SKILL.md 的整个目录（重写基类方法）
   * Skills 适配器（isRuleType: false）应该复制整个目录
   */
  protected shouldCopySkillDirectory(): boolean {
    return this.config.isRuleType === false;
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

    // 过滤器1: 规则源过滤
    filteredRules = this.filterBySourceIds(filteredRules);

    // 过滤器2: 文件扩展名过滤
    filteredRules = this.filterByExtension(filteredRules);

    // 未来可以在这里添加更多过滤器
    // 过滤器3: ...
    // 过滤器4: ...

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
   * 根据规则源 ID 过滤规则
   * @param rules 所有规则
   * @returns 过滤后的规则列表
   */
  private filterBySourceIds(rules: ParsedRule[]): ParsedRule[] {
    // 未配置 sourceIds，不过滤
    if (!this.config.sourceIds || this.config.sourceIds.length === 0) {
      return rules;
    }

    const filtered = rules.filter((rule) => this.config.sourceIds!.includes(rule.sourceId));

    Logger.debug(`Filtered rules by sourceIds for adapter: ${this.config.id}`, {
      totalRules: rules.length,
      sourceIds: this.config.sourceIds,
      filteredCount: filtered.length,
    });

    return filtered;
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
   * 替换路径模板中的占位符
   */
  private replacePathTemplate(template: string, rule: ParsedRule): string {
    return template
      .replace(/\{\{ruleId\}\}/g, rule.id)
      .replace(/\{\{ruleName\}\}/g, rule.title || rule.id)
      .replace(/\{\{sourceId\}\}/g, rule.sourceId);
  }

  /**
   * 获取规则文件名（覆盖基类以支持路径模板）
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
}
