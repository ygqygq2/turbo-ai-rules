/**
 * Continue AI 适配器
 * 生成 .continuerules 文件
 */

import type { ParsedRule } from '../types/rules';
import { Logger } from '../utils/logger';
import type { GeneratedConfig } from './AIToolAdapter';
import { BaseAdapter } from './AIToolAdapter';

/**
 * Continue AI 适配器
 *
 * Continue 使用 .continuerules 文件，格式为纯 Markdown
 * 类似于 Cursor，但可能有特定的格式要求
 */
export class ContinueAdapter extends BaseAdapter {
  readonly name = 'Continue';
  readonly enabled: boolean;

  constructor(enabled: boolean = true) {
    super();
    this.enabled = enabled;
  }

  /**
   * 生成 .continuerules 文件内容
   */
  async generate(rules: ParsedRule[]): Promise<GeneratedConfig> {
    Logger.info('Generating Continue configuration', { ruleCount: rules.length });

    if (rules.length === 0) {
      Logger.warn('No rules to generate for Continue');
      return {
        filePath: this.getFilePath(),
        content: this.generateEmptyConfig(),
        generatedAt: new Date(),
        ruleCount: 0,
      };
    }

    // 按优先级排序
    const sortedRules = this.sortByPriority(rules);

    // 生成内容
    let content = '';

    // 添加统一的文件头部
    content += this.generateFileHeader('Continue', rules.length);

    // 添加目录（Table of Contents）以便快速导航
    content += this.generateTableOfContents(sortedRules);

    // 添加规则详情
    content += this.formatRulesForContinue(sortedRules);

    Logger.info('Continue configuration generated', {
      ruleCount: rules.length,
      contentLength: content.length,
    });

    return {
      filePath: this.getFilePath(),
      content,
      generatedAt: new Date(),
      ruleCount: rules.length,
    };
  }

  /**
   * 格式化规则为 Continue 格式
   */
  private formatRulesForContinue(rules: ParsedRule[]): string {
    return rules
      .map((rule) => {
        // 使用不含 frontmatter 的 content，避免 YAML 元数据显示为文本
        // frontmatter 中的元数据已通过其他方式（如标记、目录）体现
        const content = (rule.content || rule.rawContent)?.trim() || '';
        return content;
      })
      .join('\n\n---\n\n');
  }

  /**
   * 生成空配置
   */
  private generateEmptyConfig(): string {
    return this.generateFileHeader('Continue', 0) + '> No rules configured yet.\n';
  }

  /**
   * 验证配置文件
   */
  validate(content: string): boolean {
    if (!super.validate(content)) {
      return false;
    }

    // 检查是否包含标题
    return content.includes('# ');
  }

  /**
   * 获取文件路径
   */
  getFilePath(): string {
    return '.continuerules';
  }
}
