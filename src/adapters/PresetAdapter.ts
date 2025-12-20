/**
 * 预设适配器配置驱动实现
 * 通过配置定义预设适配器，避免为每个工具创建独立类
 */

import type { ParsedRule } from '../types/rules';
import { Logger } from '../utils/logger';
import type { GeneratedConfig } from './AIToolAdapter';
import { BaseAdapter } from './AIToolAdapter';

/**
 * 文件类型
 */
export type PresetFileType = 'file' | 'directory';

/**
 * 预设适配器配置
 */
export interface PresetAdapterConfig {
  /** 适配器 ID (kebab-case) */
  id: string;
  /** 适配器显示名称 */
  name: string;
  /** 目标文件路径（相对于工作区根目录） */
  filePath: string;
  /** 文件类型 */
  type: PresetFileType;
  /** 是否默认启用 */
  defaultEnabled?: boolean;
  /** 文件描述（用于注释） */
  description?: string;
  /** 工具官网链接 */
  website?: string;
}

/**
 * 主流 AI 编码工具预设配置列表
 *
 * 配置说明：
 * - file: 单文件配置（如 .cursorrules）
 * - directory: 目录配置（如 .continue/rules/）
 */
export const PRESET_ADAPTERS: readonly PresetAdapterConfig[] = [
  // === IDE 集成类工具 ===
  {
    id: 'cursor',
    name: 'Cursor',
    filePath: '.cursorrules',
    type: 'file',
    defaultEnabled: true,
    description: 'AI-first code editor with intelligent completions',
    website: 'https://cursor.sh',
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    filePath: '.windsurfrules',
    type: 'file',
    defaultEnabled: false,
    description: 'Codeium AI IDE with advanced context understanding',
    website: 'https://codeium.com/windsurf',
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    filePath: '.github/copilot-instructions.md',
    type: 'file',
    defaultEnabled: false,
    description: 'GitHub official AI pair programmer',
    website: 'https://github.com/features/copilot',
  },

  // === VSCode 扩展类工具 ===
  {
    id: 'continue',
    name: 'Continue',
    filePath: '.continuerules',
    type: 'file',
    defaultEnabled: false,
    description: 'Open-source AI coding assistant in VSCode',
    website: 'https://continue.dev',
  },
  {
    id: 'cline',
    name: 'Cline',
    filePath: '.clinerules',
    type: 'file',
    defaultEnabled: false,
    description: 'Autonomous coding agent formerly known as Claude Dev',
    website: 'https://github.com/clinebot/cline',
  },
  {
    id: 'roo-cline',
    name: 'Roo-Cline',
    filePath: '.roorules',
    type: 'file',
    defaultEnabled: false,
    description: 'Fork of Cline with enhanced features',
    website: 'https://github.com/RooVetGit/Roo-Cline',
  },

  // === 命令行工具 ===
  {
    id: 'aider',
    name: 'Aider',
    filePath: '.aider.conf.yml',
    type: 'file',
    defaultEnabled: false,
    description: 'AI pair programming in the terminal',
    website: 'https://aider.chat',
  },

  // === Web 平台类工具 ===
  {
    id: 'bolt',
    name: 'Bolt.new',
    filePath: '.bolt/prompt',
    type: 'file',
    defaultEnabled: false,
    description: 'StackBlitz AI-powered full-stack development',
    website: 'https://bolt.new',
  },
  {
    id: 'qodo-gen',
    name: 'Qodo Gen',
    filePath: '.qodo/rules.md',
    type: 'file',
    defaultEnabled: false,
    description: 'AI test generation and code quality tool',
    website: 'https://www.qodo.ai/products/qodo-gen/',
  },
] as const;

/**
 * 预设适配器类
 * 通过配置驱动，支持所有主流 AI 编码工具
 */
export class PresetAdapter extends BaseAdapter {
  readonly name: string;
  readonly enabled: boolean;
  private config: PresetAdapterConfig;
  private sortBy: 'id' | 'priority' | 'none';
  private sortOrder: 'asc' | 'desc';

  /**
   * 创建预设适配器实例
   * @param config 预设配置
   * @param enabled 是否启用
   * @param sortBy 排序方式（默认 priority）
   * @param sortOrder 排序顺序（默认 asc）
   */
  constructor(
    config: PresetAdapterConfig,
    enabled: boolean = false,
    sortBy: 'id' | 'priority' | 'none' = 'priority',
    sortOrder: 'asc' | 'desc' = 'asc',
  ) {
    super();
    this.config = config;
    this.name = config.name;
    this.enabled = enabled;
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
  }

  /**
   * 生成配置文件内容
   * @description 生成文件内容
   * @return default {Promise<GeneratedConfig>}
   * @param rules {ParsedRule[]}
   * @param _allRules {ParsedRule[]} - 所有可用规则（未使用，保持接口一致性）
   */
  async generate(rules: ParsedRule[], _allRules?: ParsedRule[]): Promise<GeneratedConfig> {
    Logger.info(`Generating ${this.name} configuration`, { ruleCount: rules.length });

    if (rules.length === 0) {
      Logger.warn(`No rules to generate for ${this.name}`);
      return {
        filePath: this.getFilePath(),
        content: this.generateEmptyConfig(),
        generatedAt: new Date(),
        ruleCount: 0,
      };
    }

    // 使用配置的排序方式
    const sortedRules = this.sortRules(rules, this.sortBy, this.sortOrder);

    // 生成内容
    let content = '';

    // 添加文件头部
    content += this.generateFileHeader(this.name, rules.length);

    // 添加工具特定描述
    if (this.config.description || this.config.website) {
      content += this.generateToolInfo();
    }

    // 添加目录
    content += this.generateTableOfContents(sortedRules);

    // 添加规则内容
    content += this.formatRulesContent(sortedRules);

    Logger.info(`${this.name} configuration generated`, {
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
   * 获取配置文件路径
   * @description 生成文件内容
   * @return default {string}
   */
  getFilePath(): string {
    return this.config.filePath;
  }

  /**
   * 生成工具信息说明
   * @description 生成文件内容
   * @return default {string}
   */
  private generateToolInfo(): string {
    let info = '';
    if (this.config.description) {
      info += `> **${this.name}**: ${this.config.description}\n`;
    }
    if (this.config.website) {
      info += `> **Website**: ${this.config.website}\n`;
    }
    info += '\n';
    return info;
  }

  /**
   * 格式化规则内容
   * @description 生成文件内容
   * @return default {string}
   * @param rules {ParsedRule[]}
   */
  private formatRulesContent(rules: ParsedRule[]): string {
    return rules
      .map((rule) => {
        // 使用不含 frontmatter 的 content，避免 YAML 元数据显示为文本
        const content = (rule.content || rule.rawContent)?.trim() || '';
        return content;
      })
      .join('\n\n---\n\n');
  }

  /**
   * 生成空配置（无规则时）
   * @description 生成文件内容
   * @return default {string}
   */
  private generateEmptyConfig(): string {
    let content = '';
    content += this.generateMetadata(0);
    content += `# AI Coding Rules for ${this.name}\n\n`;
    content += '> This file is empty because no rules are currently synced.\n';
    content += '> Please add and sync rules using Turbo AI Rules extension.\n\n';

    if (this.config.website) {
      content += `Learn more about ${this.name}: ${this.config.website}\n`;
    }

    return content;
  }

  /**
   * 获取适配器配置
   * @description 生成文件内容
   * @return default {PresetAdapterConfig}
   */
  public getConfig(): PresetAdapterConfig {
    return { ...this.config };
  }
}
