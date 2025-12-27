/**
 * AI 工具适配器接口
 * 定义不同 AI 工具的配置生成规范
 */

import type { ParsedRule } from '../types/rules';
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

  /** 是否启用用户规则 */
  protected enableUserRules: boolean = true;

  /** 排序配置 */
  protected sortBy: 'id' | 'priority' | 'none' = 'priority';
  protected sortOrder: 'asc' | 'desc' = 'asc';

  /**
   * 统一的生成方法（模板方法模式）
   * 子类一般不需要重写，除非有特殊逻辑
   */
  async generate(rules: ParsedRule[], _allRules?: ParsedRule[]): Promise<GeneratedConfig> {
    // 1. 加载用户规则（作为 sourceId = 'user-rules' 的规则源）
    const userRules = await this.loadUserRules();

    // 2. 合并规则（去重、排序）
    const allRules = this.mergeWithUserRules(rules, userRules);

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
   * 目录模式生成
   * 子类需要实现（如 CustomAdapter）
   */
  protected generateDirectory(_rules: ParsedRule[]): Promise<GeneratedConfig> {
    throw new Error('Directory mode not implemented. Subclass should override this method.');
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
   * @description 加载用户规则
   * @return default {Promise<ParsedRule[]>}
   */
  protected async loadUserRules(): Promise<ParsedRule[]> {
    if (process.env.TEST_DEBUG === 'true') {
      console.log(`[BaseAdapter] loadUserRules called, enableUserRules:`, this.enableUserRules);
    }
    if (!this.enableUserRules) {
      if (process.env.TEST_DEBUG === 'true') {
        console.log(`[BaseAdapter] User rules disabled, returning empty array`);
      }
      return [];
    }

    const { loadUserRules } = await import('../utils/userRules');
    const rules = await loadUserRules();
    if (process.env.TEST_DEBUG === 'true') {
      console.log(`[BaseAdapter] loadUserRules returned`, rules.length, 'rules');
    }
    return rules;
  }

  /**
   * @description 合并远程规则和用户规则，按排序配置处理冲突
   * @return default {ParsedRule[]}
   * @param remoteRules {ParsedRule[]}
   * @param userRules {ParsedRule[]}
   */
  protected mergeWithUserRules(remoteRules: ParsedRule[], userRules: ParsedRule[]): ParsedRule[] {
    if (userRules.length === 0) {
      return this.sortRules(remoteRules); // 即使没有用户规则，也要排序
    }

    // 合并所有规则
    const allRules = [...remoteRules, ...userRules];

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
