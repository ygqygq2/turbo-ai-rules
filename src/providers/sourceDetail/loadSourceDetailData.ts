import type * as vscode from 'vscode';

import { ConfigManager } from '../../services/ConfigManager';
import { RulesManager } from '../../services/RulesManager';
import type { ParsedRule, RuleSource } from '../../types';

interface SourceDetailData {
  source: RuleSource | undefined;
  sourceRules: ParsedRule[];
}

export async function loadSourceDetailData(
  sourceId: string | undefined,
  context: vscode.ExtensionContext,
): Promise<SourceDetailData> {
  if (!sourceId || sourceId === 'new') {
    return { source: undefined, sourceRules: [] };
  }
  const configManager = ConfigManager.getInstance(context);
  const rulesManager = RulesManager.getInstance();
  const sources = await configManager.getSources();
  const source = sources.find((s) => s.id === sourceId);
  if (!source) throw new Error(`Source not found: ${sourceId}`);
  const sourceRules = rulesManager.getRulesBySource(sourceId);
  return { source, sourceRules };
}
