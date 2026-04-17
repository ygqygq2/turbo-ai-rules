/**
 * 预设适配器配置驱动实现
 * 通过配置定义预设适配器，避免为每个工具创建独立类
 * 支持规则源标记，实现部分更新
 */

import * as path from 'path';
import yaml from 'js-yaml';

import type { RelativePathBase } from '../types/config';
import type { AssetKind, ParsedRule } from '../types/rules';
import { BaseAdapter } from './AIToolAdapter';

/**
 * 文件类型
 */
export type PresetFileType = 'file' | 'directory' | 'merge-json';

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
  /** 是否为规则类型（true=rules, false=skills），默认 true */
  isRuleType?: boolean;
  /** 接受的资产类型；未指定时默认接受 rule + instruction */
  assetKinds?: AssetKind[];
  /** 仅接受指定扩展名 */
  fileExtensions?: string[];
  /** 目录型预设的默认相对路径基准 */
  relativePathBase?: RelativePathBase;
  /** merge-json 模式下由适配器托管的顶层 JSON 键 */
  managedJsonRootKeys?: string[];
}

/**
 * 主流 AI 编码工具预设配置列表
 *
 * 配置说明：
 * - file: 单文件配置（如 .cursorrules）
 * - directory: 目录配置（暂未使用，预留扩展）
 *
 * 路径已通过 GitHub 实际使用验证
 */
export const PRESET_ADAPTERS: readonly PresetAdapterConfig[] = [
  // === IDE 集成类工具 ===
  {
    id: 'claude-md',
    name: 'Claude Code',
    filePath: 'CLAUDE.md',
    type: 'file',
    defaultEnabled: false,
    description: 'Claude Code project instructions',
    website: 'https://docs.anthropic.com/en/docs/claude-code',
    assetKinds: ['rule', 'instruction'],
  },
  {
    id: 'cursor',
    name: 'Cursor',
    filePath: '.cursorrules',
    type: 'file',
    defaultEnabled: true,
    description: 'AI-first code editor',
    website: 'https://cursor.com',
    assetKinds: ['rule', 'instruction'],
  },
  {
    id: 'windsurf',
    name: 'Windsurf',
    filePath: '.windsurfrules',
    type: 'file',
    defaultEnabled: false,
    description: 'Codeium AI IDE',
    website: 'https://codeium.com/windsurf',
    assetKinds: ['rule', 'instruction'],
  },
  {
    id: 'copilot',
    name: 'GitHub Copilot',
    filePath: '.github/copilot-instructions.md',
    type: 'file',
    defaultEnabled: false,
    description: 'GitHub AI pair programmer',
    website: 'https://github.com/features/copilot',
    assetKinds: ['rule', 'instruction'],
  },
  {
    id: 'copilot-instructions-files',
    name: 'GitHub Copilot Instructions Files',
    filePath: '.github/instructions',
    type: 'directory',
    defaultEnabled: false,
    description: 'Scoped Copilot instruction files (*.instructions.md)',
    website: 'https://code.visualstudio.com/docs/copilot/customization/custom-instructions',
    assetKinds: ['instruction'],
    relativePathBase: 'asset-root',
  },
  {
    id: 'copilot-agents',
    name: 'GitHub Copilot Agents',
    filePath: '.github/agents',
    type: 'directory',
    defaultEnabled: false,
    description: 'Custom Copilot agents (*.agent.md)',
    website: 'https://code.visualstudio.com/docs/copilot/customization/custom-agents',
    assetKinds: ['agent'],
    relativePathBase: 'asset-root',
  },
  {
    id: 'copilot-prompts',
    name: 'GitHub Copilot Prompts',
    filePath: '.github/prompts',
    type: 'directory',
    defaultEnabled: false,
    description: 'Copilot prompt files (*.prompt.md)',
    website: 'https://code.visualstudio.com/docs/copilot/customization/prompt-files',
    assetKinds: ['prompt'],
    relativePathBase: 'asset-root',
  },
  {
    id: 'copilot-hooks',
    name: 'GitHub Copilot Hooks',
    filePath: '.github/hooks',
    type: 'directory',
    defaultEnabled: false,
    description: 'Copilot lifecycle hook configs (*.json)',
    website: 'https://code.visualstudio.com/docs/copilot/customization/hooks',
    assetKinds: ['hook'],
    relativePathBase: 'asset-root',
  },
  {
    id: 'claude-hooks',
    name: 'Claude Hook Scripts',
    filePath: '.claude/hooks',
    type: 'directory',
    defaultEnabled: false,
    description: 'Claude Code hook runtime scripts',
    website: 'https://docs.anthropic.com/en/docs/claude-code',
    assetKinds: ['hook'],
    fileExtensions: ['.sh', '.bash', '.zsh', '.py', '.js', '.mjs', '.cjs', '.ts'],
    relativePathBase: 'asset-root',
  },
  {
    id: 'claude-hooks-settings',
    name: 'Claude Hook Settings',
    filePath: '.claude/settings.json',
    type: 'merge-json',
    defaultEnabled: false,
    description: 'Claude Code hook settings fragments merged into settings.json',
    website: 'https://docs.anthropic.com/en/docs/claude-code',
    assetKinds: ['hook'],
    fileExtensions: ['.json', '.yaml', '.yml'],
    managedJsonRootKeys: ['hooks'],
  },

  // === VSCode 扩展类工具 ===
  {
    id: 'continue',
    name: 'Continue',
    filePath: '.continuerules',
    type: 'file',
    defaultEnabled: false,
    description: 'Open-source AI assistant',
    website: 'https://continue.dev',
    assetKinds: ['rule', 'instruction'],
  },
  {
    id: 'cline',
    name: 'Cline',
    filePath: '.clinerules',
    type: 'file',
    defaultEnabled: false,
    description: 'Autonomous coding agent',
    website: 'https://github.com/cline/cline',
    assetKinds: ['rule', 'instruction'],
  },
  {
    id: 'roo-cline',
    name: 'Roo-Cline',
    filePath: '.roorules',
    type: 'file',
    defaultEnabled: false,
    description: 'Enhanced Cline fork',
    website: 'https://github.com/RooVetGit/Roo-Cline',
    assetKinds: ['rule', 'instruction'],
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
    assetKinds: ['rule', 'instruction'],
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
    assetKinds: ['rule', 'instruction'],
  },

  // === Skills 适配器 ===
  {
    id: 'claude-skills',
    name: 'Claude Skills',
    filePath: '.claude/skills',
    type: 'directory',
    defaultEnabled: false,
    description: 'Claude Code skills library',
    website: 'https://docs.anthropic.com/en/docs/claude-code',
    isRuleType: false,
    assetKinds: ['skill'],
    relativePathBase: 'asset-root',
  },
  {
    id: 'claude-commands',
    name: 'Claude Commands',
    filePath: '.claude/commands',
    type: 'directory',
    defaultEnabled: false,
    description: 'Claude Code slash commands',
    website: 'https://docs.anthropic.com/en/docs/claude-code',
    assetKinds: ['command'],
    relativePathBase: 'asset-root',
  },
  {
    id: 'claude-agents',
    name: 'Claude Agents',
    filePath: '.claude/agents',
    type: 'directory',
    defaultEnabled: false,
    description: 'Claude Code agent definitions',
    website: 'https://docs.anthropic.com/en/docs/claude-code',
    assetKinds: ['agent'],
    relativePathBase: 'asset-root',
  },
  {
    id: 'cursor-skills',
    name: 'Cursor Skills',
    filePath: '.cursor/skills',
    type: 'directory',
    defaultEnabled: false,
    description: 'Cursor AI skills library',
    website: 'https://cursor.com/docs/context/skills',
    isRuleType: false,
    assetKinds: ['skill'],
    relativePathBase: 'asset-root',
  },
  {
    id: 'copilot-skills',
    name: 'GitHub Copilot Skills',
    filePath: '.github/skills',
    type: 'directory',
    defaultEnabled: false,
    description: 'GitHub Copilot agent skills',
    website: 'https://code.visualstudio.com/docs/copilot/customization/agent-skills',
    isRuleType: false,
    assetKinds: ['skill'],
    relativePathBase: 'asset-root',
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
  protected sortBy: 'id' | 'priority' | 'none';
  protected sortOrder: 'asc' | 'desc';

  /**
   * 创建预设适配器实例
   * @param config 预设配置
   * @param enabled 是否启用
   * @param sortBy 排序方式（默认 priority）
   * @param sortOrder 排序顺序（默认 asc）
   * @param preserveDirectoryStructure 是否保持目录结构（默认 true）
   * @param relativePathBase 目录输出的相对路径基准（默认取预设配置）
   */
  constructor(
    config: PresetAdapterConfig,
    enabled: boolean = false,
    sortBy: 'id' | 'priority' | 'none' = 'priority',
    sortOrder: 'asc' | 'desc' = 'asc',
    preserveDirectoryStructure: boolean = true,
    relativePathBase: RelativePathBase = config.relativePathBase ?? 'source-subpath',
  ) {
    super();
    this.config = config;
    this.name = config.name;
    this.enabled = enabled;
    this.sortBy = sortBy;
    this.sortOrder = sortOrder;
    this.preserveDirectoryStructure = preserveDirectoryStructure;
    this.relativePathBase = relativePathBase;
  }

  override async generate(rules: ParsedRule[], allRules?: ParsedRule[]) {
    const filteredRules = this.filterRules(rules);

    if (this.config.type === 'merge-json') {
      return this.generateMergedJson(filteredRules);
    }

    return super.generate(filteredRules, allRules);
  }

  /**
   * 获取输出类型（PresetAdapter 都是单文件模式）
   */
  protected getOutputType(): 'file' | 'directory' | 'merge-json' {
    return this.config.type;
  }

  public override getManagedJsonRootKeys(): string[] | undefined {
    return this.config.managedJsonRootKeys;
  }

  /**
   * 获取目录输出路径
   */
  protected getDirectoryOutputPath(): string {
    return this.config.filePath;
  }

  /**
   * 目录型预设不生成额外索引文件，避免污染工具约定目录
   */
  protected shouldGenerateIndex(): boolean {
    return this.config.type === 'file';
  }

  override validate(content: string): boolean {
    if (this.config.type === 'merge-json') {
      try {
        JSON.parse(content);
        return true;
      } catch {
        return false;
      }
    }

    return super.validate(content);
  }

  /**
   * 是否应该复制 SKILL.md 的整个目录
   * Skills 适配器（isRuleType: false）应该复制整个目录
   */
  protected shouldCopySkillDirectory(): boolean {
    return this.config.isRuleType === false;
  }

  /**
   * 生成头部内容（文件元数据、工具信息、目录）
   */
  protected generateHeaderContent(rules: ParsedRule[]): string {
    const totalCount = rules.length;
    let header = '';

    // 文件头部
    header += this.generateFileHeader(this.name, totalCount);

    // 添加工具特定描述
    if (this.config.description || this.config.website) {
      header += this.generateToolInfo();
    }

    // 添加目录
    header += this.generateTableOfContents(rules);

    return header;
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

  public filterRules(rules: ParsedRule[]): ParsedRule[] {
    return this.filterRulesByExtension(this.filterRulesByKind(rules));
  }

  private filterRulesByKind(rules: ParsedRule[]): ParsedRule[] {
    const acceptedKinds = this.config.assetKinds ?? ['rule', 'instruction'];
    return rules.filter((rule) => acceptedKinds.includes((rule.kind ?? 'rule') as AssetKind));
  }

  private filterRulesByExtension(rules: ParsedRule[]): ParsedRule[] {
    if (!this.config.fileExtensions || this.config.fileExtensions.length === 0) {
      return rules;
    }

    return rules.filter((rule) => {
      const ext = path.extname(rule.filePath).toLowerCase();
      return this.config.fileExtensions!.includes(ext);
    });
  }

  private generateMergedJson(rules: ParsedRule[]) {
    const merged = rules.reduce<Record<string, unknown>>((acc, rule) => {
      if (!rule.rawContent?.trim()) {
        return acc;
      }

      const ext = path.extname(rule.filePath).toLowerCase();
      let parsed: unknown;

      if (ext === '.json') {
        parsed = JSON.parse(rule.rawContent);
      } else if (ext === '.yaml' || ext === '.yml') {
        parsed = yaml.load(rule.rawContent);
      } else {
        return acc;
      }

      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return acc;
      }

      return this.deepMerge(acc, parsed as Record<string, unknown>);
    }, {});

    return {
      filePath: this.getFilePath(),
      content: `${JSON.stringify(merged, null, 2)}\n`,
      generatedAt: new Date(),
      ruleCount: rules.length,
    };
  }

  private deepMerge(
    target: Record<string, unknown>,
    source: Record<string, unknown>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = { ...target };

    for (const [key, value] of Object.entries(source)) {
      const existingValue = result[key];
      if (this.isPlainObject(existingValue) && this.isPlainObject(value)) {
        result[key] = this.deepMerge(
          existingValue as Record<string, unknown>,
          value as Record<string, unknown>,
        );
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  private isPlainObject(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
}
