import type { ParsedRule, RuleSource } from '../../types';
export declare function loadSourceDetailData(
  sourceId: string | undefined,
  context: any,
): Promise<{ source: RuleSource | undefined; sourceRules: ParsedRule[] }>;
