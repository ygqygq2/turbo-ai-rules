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

    // 添加规则概览
    content += this.generateOverview(sortedRules);

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
   * 生成规则概览
   */
  private generateOverview(rules: ParsedRule[]): string {
    const highPriorityCount = rules.filter((r) => r.metadata.priority === 'high').length;
    const mediumPriorityCount = rules.filter((r) => r.metadata.priority === 'medium').length;
    const lowPriorityCount = rules.filter((r) => r.metadata.priority === 'low').length;

    // 收集所有标签
    const allTags = new Set<string>();
    for (const rule of rules) {
      if (rule.metadata.tags) {
        rule.metadata.tags.forEach((tag) => allTags.add(tag));
      }
    }

    let overview = '## Overview\n\n';
    overview += `- **Total Rules:** ${rules.length}\n`;
    overview += `- **High Priority:** ${highPriorityCount}\n`;
    overview += `- **Medium Priority:** ${mediumPriorityCount}\n`;
    overview += `- **Low Priority:** ${lowPriorityCount}\n`;

    if (allTags.size > 0) {
      overview += `- **Tags:** ${Array.from(allTags).join(', ')}\n`;
    }

    overview += '\n---\n\n';

    return overview;
  }

  /**
   * 格式化规则为 Continue 格式
   */
  private formatRulesForContinue(rules: ParsedRule[]): string {
    let content = '## Rules\n\n';

    for (const rule of rules) {
      content += `### ${rule.title}\n\n`;

      // 添加徽章样式的元数据
      const badges = this.generateBadges(rule);
      if (badges) {
        content += `${badges}\n\n`;
      }

      // 添加描述
      if (rule.metadata.description) {
        content += `> ${rule.metadata.description}\n\n`;
      }

      // 添加规则内容
      content += `${rule.content}\n\n`;

      // 添加元信息
      const metaInfo = this.generateMetaInfo(rule);
      if (metaInfo) {
        content += `<details>\n<summary>Rule Information</summary>\n\n${metaInfo}\n</details>\n\n`;
      }

      content += '---\n\n';
    }

    return content;
  }

  /**
   * 生成徽章
   */
  private generateBadges(rule: ParsedRule): string {
    const badges: string[] = [];

    // 优先级徽章
    if (rule.metadata.priority) {
      const color = this.getPriorityColor(rule.metadata.priority);
      badges.push(
        `![Priority](https://img.shields.io/badge/priority-${rule.metadata.priority}-${color})`,
      );
    }

    // 标签徽章
    if (rule.metadata.tags && rule.metadata.tags.length > 0) {
      for (const tag of rule.metadata.tags.slice(0, 3)) {
        // 最多显示 3 个
        badges.push(`![${tag}](https://img.shields.io/badge/${tag}-blue)`);
      }
    }

    return badges.join(' ');
  }

  /**
   * 获取优先级颜色
   */
  private getPriorityColor(priority: string): string {
    const colorMap: Record<string, string> = {
      high: 'red',
      medium: 'yellow',
      low: 'green',
    };
    return colorMap[priority] || 'gray';
  }

  /**
   * 生成元信息
   */
  private generateMetaInfo(rule: ParsedRule): string {
    const info: string[] = [];

    info.push(`- **Rule ID:** \`${rule.id}\``);
    info.push(`- **Source:** ${rule.sourceId}`);

    if (rule.metadata.author) {
      info.push(`- **Author:** ${rule.metadata.author}`);
    }

    if (rule.metadata.version) {
      info.push(`- **Version:** ${rule.metadata.version}`);
    }

    return info.length > 0 ? info.join('\n') : '';
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
