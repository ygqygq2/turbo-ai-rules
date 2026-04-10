/**
 * 规则相关的类型定义
 */

/**
 * 规则优先级
 */
export type RulePriority = 'low' | 'medium' | 'high';

// ─────────────────────────────────────────────────────────────────────────────
// v3 Asset 模型
// ─────────────────────────────────────────────────────────────────────────────

/**
 * AI 资产的语义类型
 */
export type AssetKind =
  | 'rule'
  | 'instruction'
  | 'skill'
  | 'agent'
  | 'prompt'
  | 'command'
  | 'hook'
  | 'mcp'
  | 'unknown';

/**
 * 资产的文件格式
 */
export type AssetFormat = 'markdown' | 'mdc' | 'json' | 'yaml' | 'text' | 'directory';

/**
 * 解析后的通用 AI 资产（v3 核心类型）
 *
 * 用于表示从规则源扫描出的任意"可同步单元"。
 * `ParsedRule` 是 `kind='rule'` 的 ParsedAsset 特例。
 */
export interface ParsedAsset {
  /** 资产唯一 ID */
  id: string;
  /** 来源的 RuleSource.id */
  sourceId: string;
  /** 原始文件绝对路径 */
  filePath: string;
  /** 相对于规则源 subPath 的路径 */
  relativePath: string;
  /** 资产语义类型 */
  kind: AssetKind;
  /** 文件格式 */
  format: AssetFormat;
  /** 标题（可选） */
  title?: string;
  /** 元数据（可选） */
  metadata?: Record<string, unknown>;
  /** 原始完整内容（可选） */
  rawContent?: string;
  /** 目录型资产的根目录（如 skill 目录） */
  rootDir?: string;
  /** 目录型资产的入口文件（如 SKILL.md） */
  entryFile?: string;
}

/**
 * 规则元数据
 */
export interface RuleMetadata {
  /** 规则 ID - 支持字符串或数字 */
  id?: string | number;
  /** 规则标题 */
  title?: string;
  /** 版本号 */
  version?: string;
  /** 标签列表 */
  tags?: string[];
  /** 优先级 */
  priority?: RulePriority;
  /** 作者 */
  author?: string;
  /** 描述 */
  description?: string;
  /** 其他自定义字段 */
  [key: string]: unknown;
}

/**
 * 解析后的规则
 *
 * v3 起额外携带可选的 `kind` / `format` / `relativePath` 字段；
 * 现有代码无感知，可按原有方式使用。
 */
export interface ParsedRule {
  /** 规则唯一 ID */
  id: string;
  /** 规则标题 */
  title: string;
  /** Markdown 内容（不含 frontmatter） */
  content: string;
  /** 原始完整内容（包含 frontmatter，用于适配器输出） */
  rawContent: string;
  /** 元数据 */
  metadata: RuleMetadata;
  /** 来源的 RuleSource.id */
  sourceId: string;
  /** 原始文件绝对路径 */
  filePath: string;
  // ── v3 扩展字段（可选，向后兼容） ────────────────────────────
  /** 资产语义类型（v3） */
  kind?: AssetKind;
  /** 文件格式（v3） */
  format?: AssetFormat;
  /** 相对于规则源 subPath 的路径（v3） */
  relativePath?: string;
}

/**
 * 规则验证结果
 */
export interface ValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误列表 */
  errors: ValidationError[];
  /** 警告列表 */
  warnings: ValidationWarning[];
}

/**
 * 验证错误
 */
export interface ValidationError {
  /** 错误码 */
  code: string;
  /** 错误消息 */
  message: string;
  /** 错误字段 */
  field?: string;
  /** 错误位置（行号） */
  line?: number;
}

/**
 * 验证警告
 */
export interface ValidationWarning {
  /** 警告码 */
  code: string;
  /** 警告消息 */
  message: string;
  /** 警告字段 */
  field?: string;
}

/**
 * 规则搜索过滤器
 */
export interface SearchFilters {
  /** 标签过滤 */
  tags?: string[];
  /** 优先级过滤 */
  priority?: RulePriority;
  /** 源 ID 过滤 */
  sourceId?: string;
  /** 是否只搜索启用的规则 */
  enabledOnly?: boolean;
}

/**
 * 规则冲突解决策略
 */
export type ConflictStrategy = 'priority' | 'merge' | 'skip-duplicates';

/**
 * 规则冲突信息
 */
export interface RuleConflict {
  /** 冲突的规则 ID */
  ruleId: string;
  /** 冲突的规则列表 */
  conflictingRules: ParsedRule[];
  /** 推荐使用的规则 */
  recommended?: ParsedRule;
  /** 冲突类型 */
  type: 'duplicate-id' | 'duplicate-title';
}
