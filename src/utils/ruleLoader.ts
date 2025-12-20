/**
 * 规则加载工具函数
 */

import path from 'path';

import type { MdcParser } from '../parsers/MdcParser';
import type { RulesValidator } from '../parsers/RulesValidator';
import type { GitManager } from '../services/GitManager';
import type { RuleSource } from '../types/config';
import type { ParsedRule } from '../types/rules';
import { Logger } from './logger';

/**
 * 同步单个源（克隆或拉取 + 解析规则）
 * @param source 规则源
 * @param gitManager Git 管理器
 * @param parser MDC 解析器
 * @param validator 规则验证器
 * @returns 有效的规则列表
 */
export async function syncAndParseSource(
  source: RuleSource,
  gitManager: GitManager,
  parser: MdcParser,
  validator: RulesValidator,
): Promise<{ rules: ParsedRule[]; total: number; valid: number }> {
  // 1. 克隆或拉取仓库
  const exists = await gitManager.repositoryExists(source.id);

  if (!exists) {
    Logger.debug('Cloning repository', { sourceId: source.id });
    await gitManager.cloneRepository(source);
  } else {
    Logger.debug('Pulling updates', { sourceId: source.id });
    await gitManager.pullUpdates(source.id, source.branch);
  }

  // 2. 获取本地仓库路径
  const localPath = gitManager.getSourcePath(source.id);

  // 3. 构建规则目录路径（path.join 会自动处理路径分隔符）
  const rulesPath = path.join(localPath, source.subPath || '');

  Logger.debug('Parsing rules directory', {
    sourceId: source.id,
    rulesPath,
  });

  // 4. 解析规则
  const parsedRules = await parser.parseDirectory(rulesPath, source.id, {
    recursive: true,
  });

  // 5. 为规则添加 sourceId
  const rulesWithSource = parsedRules.map((rule) => ({
    ...rule,
    sourceId: source.id,
  }));

  // 6. 验证规则
  validator.validateRules(rulesWithSource);

  // 7. 返回有效的规则
  const validRules = validator.getValidRules(rulesWithSource);

  return {
    rules: validRules,
    total: parsedRules.length,
    valid: validRules.length,
  };
}
