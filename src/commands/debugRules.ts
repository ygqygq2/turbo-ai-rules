/**
 * 调试命令：显示所有规则信息
 */

import * as vscode from 'vscode';

import { RulesManager } from '../services/RulesManager';
import { Logger } from '../utils/logger';

/**
 * @description 显示所有规则的详细信息（用于调试）
 */
export async function debugRulesCommand(): Promise<void> {
  const rulesManager = RulesManager.getInstance();
  const allRules = rulesManager.getAllRules();
  const conflicts = rulesManager.detectConflicts();

  Logger.info('[Debug] All rules information', {
    totalRules: allRules.length,
    conflicts: conflicts.length,
  });

  // 按 ID 分组统计
  const groupedById = new Map<string, typeof allRules>();
  for (const rule of allRules) {
    const existing = groupedById.get(rule.id) || [];
    existing.push(rule);
    groupedById.set(rule.id, existing);
  }

  // 输出详细信息
  const output = vscode.window.createOutputChannel('Turbo AI Rules - Debug');
  output.clear();
  output.appendLine('=== Turbo AI Rules Debug Information ===\n');
  output.appendLine(`Total Rules: ${allRules.length}`);
  output.appendLine(`Unique IDs: ${groupedById.size}`);
  output.appendLine(`Conflicts: ${conflicts.length}\n`);

  output.appendLine('=== Rules by ID ===\n');
  for (const [ruleId, rules] of groupedById.entries()) {
    if (rules.length > 1) {
      output.appendLine(`⚠️  ${ruleId} (${rules.length} duplicates)`);
    } else {
      output.appendLine(`✓  ${ruleId}`);
    }

    for (const rule of rules) {
      output.appendLine(`   - Source: ${rule.sourceId}`);
      output.appendLine(`   - File: ${rule.filePath}`);
      output.appendLine(`   - Title: ${rule.title}`);
      output.appendLine(`   - Priority: ${rule.metadata?.priority || 'medium'}`);
      output.appendLine('');
    }
  }

  if (conflicts.length > 0) {
    output.appendLine('\n=== Conflict Details ===\n');
    for (const conflict of conflicts) {
      output.appendLine(`Conflict: ${conflict.ruleId}`);
      output.appendLine(`Type: ${conflict.type}`);
      output.appendLine(`Duplicates: ${conflict.conflictingRules.length}`);
      if (conflict.recommended) {
        output.appendLine(
          `Recommended: ${conflict.recommended.title} (${conflict.recommended.sourceId})`,
        );
      }
      output.appendLine('');
    }
  }

  output.show();

  await vscode.window.showInformationMessage(vscode.l10n.t('Rule Debug Information'));
}
