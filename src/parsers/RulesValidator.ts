/**
 * 规则验证器
 */

import type {
  ParsedRule,
  ValidationError,
  ValidationResult,
  ValidationWarning,
} from '../types/rules';
import { Logger } from '../utils/logger';
import { validateRuleId } from '../utils/validator';

/**
 * 规则验证器
 */
export class RulesValidator {
  /**
   * 验证单个规则
   * @param rule 要验证的规则
   * @returns 验证结果
   */
  public validateRule(rule: ParsedRule): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // 验证必需字段
    if (!rule.id) {
      errors.push({
        code: 'MISSING_ID',
        message: 'Rule ID is required',
        field: 'id',
      });
    } else if (!validateRuleId(rule.id)) {
      errors.push({
        code: 'INVALID_ID_FORMAT',
        message: 'Rule ID must be in kebab-case format',
        field: 'id',
      });
    }

    if (!rule.title) {
      errors.push({
        code: 'MISSING_TITLE',
        message: 'Rule title is required',
        field: 'title',
      });
    }

    if (!rule.content || rule.content.trim() === '') {
      errors.push({
        code: 'EMPTY_CONTENT',
        message: 'Rule content cannot be empty',
        field: 'content',
      });
    }

    if (!rule.sourceId) {
      errors.push({
        code: 'MISSING_SOURCE_ID',
        message: 'Source ID is required',
        field: 'sourceId',
      });
    }

    if (!rule.filePath) {
      errors.push({
        code: 'MISSING_FILE_PATH',
        message: 'File path is required',
        field: 'filePath',
      });
    }

    // 验证元数据
    if (rule.metadata) {
      // 验证优先级
      if (rule.metadata.priority && !['low', 'medium', 'high'].includes(rule.metadata.priority)) {
        errors.push({
          code: 'INVALID_PRIORITY',
          message: "Priority must be one of: 'low', 'medium', 'high'",
          field: 'metadata.priority',
        });
      }

      // 验证标签
      if (rule.metadata.tags && !Array.isArray(rule.metadata.tags)) {
        errors.push({
          code: 'INVALID_TAGS',
          message: 'Tags must be an array',
          field: 'metadata.tags',
        });
      }

      // 警告：推荐字段
      if (!rule.metadata.version) {
        warnings.push({
          code: 'MISSING_VERSION',
          message: 'Consider adding a version to the rule metadata',
          field: 'metadata.version',
        });
      }

      if (!rule.metadata.tags || rule.metadata.tags.length === 0) {
        warnings.push({
          code: 'MISSING_TAGS',
          message: 'Consider adding tags to improve rule discoverability',
          field: 'metadata.tags',
        });
      }

      if (!rule.metadata.description) {
        warnings.push({
          code: 'MISSING_DESCRIPTION',
          message: 'Consider adding a description to the rule metadata',
          field: 'metadata.description',
        });
      }
    }

    // 内容质量检查
    if (rule.content && rule.content.length < 50) {
      warnings.push({
        code: 'SHORT_CONTENT',
        message: 'Rule content seems very short (< 50 characters)',
        field: 'content',
      });
    }

    if (rule.content && rule.content.length > 10000) {
      warnings.push({
        code: 'LONG_CONTENT',
        message: 'Rule content is very long (> 10000 characters)',
        field: 'content',
      });
    }

    const result: ValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
    };

    if (!result.valid) {
      Logger.warn('Rule validation failed', {
        ruleId: rule.id,
        errors: errors.length,
        warnings: warnings.length,
      });
    }

    return result;
  }

  /**
   * 批量验证规则
   * @param rules 要验证的规则列表
   * @returns 验证结果列表
   */
  public validateRules(rules: ParsedRule[]): Map<string, ValidationResult> {
    const results = new Map<string, ValidationResult>();

    for (const rule of rules) {
      const result = this.validateRule(rule);
      results.set(rule.id, result);
    }

    return results;
  }

  /**
   * 检查规则列表中是否有重复的 ID
   * @param rules 规则列表
   * @returns 重复的 ID 列表
   */
  public findDuplicateIds(rules: ParsedRule[]): string[] {
    const idCounts = new Map<string, number>();

    for (const rule of rules) {
      const count = idCounts.get(rule.id) || 0;
      idCounts.set(rule.id, count + 1);
    }

    const duplicates: string[] = [];
    for (const [id, count] of idCounts.entries()) {
      if (count > 1) {
        duplicates.push(id);
      }
    }

    if (duplicates.length > 0) {
      Logger.warn('Duplicate rule IDs found', { duplicates });
    }

    return duplicates;
  }

  /**
   * 获取有效的规则（过滤掉验证失败的）
   * @param rules 规则列表
   * @returns 有效的规则列表
   */
  public getValidRules(rules: ParsedRule[]): ParsedRule[] {
    const validRules: ParsedRule[] = [];

    for (const rule of rules) {
      const result = this.validateRule(rule);
      if (result.valid) {
        validRules.push(rule);
      }
    }

    Logger.info('Valid rules filtered', {
      total: rules.length,
      valid: validRules.length,
      invalid: rules.length - validRules.length,
    });

    return validRules;
  }
}
