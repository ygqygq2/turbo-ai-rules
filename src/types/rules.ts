/**
 * 规则相关的类型定义
 */

/**
 * 规则优先级
 */
export type RulePriority = 'low' | 'medium' | 'high';

/**
 * 规则元数据
 */
export interface RuleMetadata {
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
 */
export interface ParsedRule {
  /** 规则唯一 ID */
  id: string;
  /** 规则标题 */
  title: string;
  /** Markdown 内容（不含 frontmatter） */
  content: string;
  /** 元数据 */
  metadata: RuleMetadata;
  /** 来源的 RuleSource.id */
  sourceId: string;
  /** 原始文件路径 */
  filePath: string;
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
