/**
 * 规则加载工具函数
 */

import * as path from 'path';

import type { MdcParser } from '../parsers/MdcParser';
import type { RulesValidator } from '../parsers/RulesValidator';
import type { GitManager } from '../services/GitManager';
import type { RulesManager } from '../services/RulesManager';
import type { RuleSource } from '../types/config';
import { Logger } from './logger';

/**
 * 解析并加载规则到 RulesManager（可被多个模块复用）
 * @param source 规则源
 * @param parser MDC 解析器
 * @param validator 规则验证器
 * @param gitManager Git 管理器
 * @param rulesManager 规则管理器
 */
export async function parseAndLoadRules(
  source: RuleSource,
  parser: MdcParser,
  validator: RulesValidator,
  gitManager: GitManager,
  rulesManager: RulesManager,
): Promise<{ total: number; valid: number }> {
  const cacheDir = gitManager.getSourcePath(source.id);
  const rulesPath = path.join(cacheDir, source.subPath || '');

  Logger.debug('Parsing rules from cache', {
    sourceId: source.id,
    path: rulesPath,
  });

  // 解析规则（使用默认参数确保解析所有规则）
  const parsedRules = await parser.parseDirectory(rulesPath, source.id, {
    recursive: true,
  });

  // 验证规则
  const validationResults = validator.validateRules(parsedRules);

  // 只保留有效的规则
  const validRules = parsedRules.filter((rule) => {
    const result = validationResults.get(rule.id);
    return result && result.valid;
  });

  // 更新 RulesManager（会替换该源的所有规则）
  rulesManager.addRules(source.id, validRules);

  Logger.debug('Rules parsed and loaded', {
    sourceId: source.id,
    totalRules: parsedRules.length,
    validRules: validRules.length,
  });

  return {
    total: parsedRules.length,
    valid: validRules.length,
  };
}
