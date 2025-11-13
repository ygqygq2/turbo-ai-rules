import type { ParsedRule } from '../types/rules';
import { RulesManager } from './RulesManager';

export interface RuleLite {
  id: string;
  title: string;
  filePath: string;
  tags: string[];
  priority: string | number | undefined;
  sourceId: string;
}

/**
 * @description 获取分组后的规则映射（按 sourceId）
 * @return default {{ [sourceId: string]: RuleLite[] }}
 * @param rulesManager {RulesManager}
 */
export function getRulesBySourceMap(rulesManager: RulesManager): {
  [sourceId: string]: RuleLite[];
} {
  const allRules: ParsedRule[] = rulesManager.getAllRules();
  const map: { [sourceId: string]: RuleLite[] } = {};

  for (const rule of allRules) {
    if (!map[rule.sourceId]) map[rule.sourceId] = [];
    map[rule.sourceId].push({
      id: rule.id,
      title: rule.title,
      filePath: rule.filePath,
      tags: rule.metadata.tags || [],
      priority: rule.metadata.priority,
      sourceId: rule.sourceId,
    });
  }

  return map;
}
