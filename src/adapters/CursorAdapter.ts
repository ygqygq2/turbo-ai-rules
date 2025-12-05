/**
 * Cursor AI 适配器
 * 生成 .cursorrules 文件
 */

import type { ParsedRule } from '../types/rules';
import { Logger } from '../utils/logger';
import type { GeneratedConfig } from './AIToolAdapter';
import { BaseAdapter } from './AIToolAdapter';

/**
 * Cursor AI 适配器
 *
 * Cursor 使用 .cursorrules 文件，格式为纯 Markdown
 * 规则按优先级排序，高优先级规则放在前面
 */
export class CursorAdapter extends BaseAdapter {
  readonly name = 'Cursor';
  readonly enabled: boolean;

  constructor(enabled: boolean = true) {
    super();
    this.enabled = enabled;
  }

  /**
   * 生成 .cursorrules 文件内容
   */
  async generate(rules: ParsedRule[]): Promise<GeneratedConfig> {
    Logger.info('Generating Cursor configuration', { ruleCount: rules.length });

    if (rules.length === 0) {
      Logger.warn('No rules to generate for Cursor');
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
    content += this.generateFileHeader('Cursor', rules.length);

    // 添加目录（Table of Contents）以便快速导航
    content += this.generateTableOfContents(sortedRules);

    // 添加规则
    content += this.formatRulesForCursor(sortedRules);

    Logger.info('Cursor configuration generated', {
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
   * 格式化规则为 Cursor 格式
   */
  private formatRulesForCursor(rules: ParsedRule[]): string {
    return rules
      .map((rule) => {
        // 使用不含 frontmatter 的 content，避免 YAML 元数据在 Markdown 预览中显示为文本
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
    return this.generateFileHeader('Cursor', 0) + '> No rules configured yet.\n';
  }

  /**
   * 验证 .cursorrules 文件
   */
  validate(content: string): boolean {
    // Cursor 的配置文件是纯 Markdown，只需检查非空
    if (!super.validate(content)) {
      return false;
    }

    // 可以添加更多验证逻辑，例如检查是否包含标题
    return content.includes('# ');
  }

  /**
   * 获取文件路径
   */
  getFilePath(): string {
    return '.cursorrules';
  }
}
