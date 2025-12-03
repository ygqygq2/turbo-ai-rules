/**
 * 规则标记生成器
 * 生成带标记的配置文件内容
 */

import { MARKER, type MarkerGeneratorOptions } from '../types/ruleMarker';
import type { ParsedRule } from '../types/rules';

/**
 * 默认生成选项
 */
const DEFAULT_OPTIONS: MarkerGeneratorOptions = {
  includeSourceMarkers: true,
  includeRuleMarkers: true,
  includePriority: true,
};

/**
 * @description 生成文件头部元数据
 * @return {string}
 * @param ruleCount {number} 规则数量
 * @param sourceIds {string[]} 规则源 ID 列表
 */
export function generateFileHeader(ruleCount: number, sourceIds: string[]): string {
  const timestamp = new Date().toISOString();
  const sourcesStr = sourceIds.join(', ');

  return (
    `${MARKER.GENERATOR_SIGNATURE} at ${timestamp} -->\n` +
    `<!-- Total rules: ${ruleCount} | Sources: ${sourcesStr} -->\n\n`
  );
}

/**
 * @description 生成单条规则的开始标记
 * @return {string}
 * @param sourceId {string} 规则源 ID
 * @param ruleId {string} 规则 ID
 * @param priority {string | undefined} 优先级
 * @param options {MarkerGeneratorOptions} 生成选项
 */
export function generateRuleBeginMarker(
  sourceId: string,
  ruleId: string,
  priority?: string,
  options: MarkerGeneratorOptions = DEFAULT_OPTIONS,
): string {
  if (!options.includeRuleMarkers) {
    return '';
  }

  let marker = `${MARKER.BEGIN_RULE} source="${sourceId}" id="${ruleId}"`;
  if (options.includePriority && priority) {
    marker += ` priority="${priority}"`;
  }
  marker += ' -->';
  return marker;
}

/**
 * @description 生成单条规则的结束标记
 * @return {string}
 * @param options {MarkerGeneratorOptions} 生成选项
 */
export function generateRuleEndMarker(options: MarkerGeneratorOptions = DEFAULT_OPTIONS): string {
  if (!options.includeRuleMarkers) {
    return '';
  }
  return MARKER.END_RULE;
}

/**
 * @description 生成规则源区块的开始标记
 * @return {string}
 * @param sourceId {string} 规则源 ID
 * @param count {number} 规则数量
 * @param options {MarkerGeneratorOptions} 生成选项
 */
export function generateSourceBeginMarker(
  sourceId: string,
  count: number,
  options: MarkerGeneratorOptions = DEFAULT_OPTIONS,
): string {
  if (!options.includeSourceMarkers) {
    return '';
  }
  return `${MARKER.BEGIN_SOURCE} source="${sourceId}" count="${count}" -->`;
}

/**
 * @description 生成规则源区块的结束标记
 * @return {string}
 * @param sourceId {string} 规则源 ID
 * @param options {MarkerGeneratorOptions} 生成选项
 */
export function generateSourceEndMarker(
  sourceId: string,
  options: MarkerGeneratorOptions = DEFAULT_OPTIONS,
): string {
  if (!options.includeSourceMarkers) {
    return '';
  }
  return `${MARKER.END_SOURCE} source="${sourceId}" -->`;
}

/**
 * @description 生成用户内容区块标记
 * @return {{ begin: string, end: string }}
 */
export function generateUserContentMarkers(): { begin: string; end: string } {
  return {
    begin: MARKER.BEGIN_USER_CONTENT,
    end: MARKER.END_USER_CONTENT,
  };
}

/**
 * @description 生成单条带标记的规则内容
 * @return {string}
 * @param rule {ParsedRule} 规则
 * @param options {MarkerGeneratorOptions} 生成选项
 */
export function generateMarkedRule(
  rule: ParsedRule,
  options: MarkerGeneratorOptions = DEFAULT_OPTIONS,
): string {
  const parts: string[] = [];

  // 开始标记
  const beginMarker = generateRuleBeginMarker(
    rule.sourceId,
    rule.id,
    rule.metadata.priority,
    options,
  );
  if (beginMarker) {
    parts.push(beginMarker);
  }

  // 规则内容
  const content = (rule.rawContent || rule.content)?.trim() || '';
  parts.push(content);

  // 结束标记
  const endMarker = generateRuleEndMarker(options);
  if (endMarker) {
    parts.push(endMarker);
  }

  return parts.join('\n');
}

/**
 * @description 生成单个规则源的完整区块内容
 * @return {string}
 * @param sourceId {string} 规则源 ID
 * @param rules {ParsedRule[]} 该源的规则列表
 * @param options {MarkerGeneratorOptions} 生成选项
 */
export function generateSourceBlock(
  sourceId: string,
  rules: ParsedRule[],
  options: MarkerGeneratorOptions = DEFAULT_OPTIONS,
): string {
  const parts: string[] = [];

  // 源区块开始标记
  const beginMarker = generateSourceBeginMarker(sourceId, rules.length, options);
  if (beginMarker) {
    parts.push(beginMarker);
    parts.push(''); // 空行
  }

  // 生成每条规则
  for (let i = 0; i < rules.length; i++) {
    parts.push(generateMarkedRule(rules[i], options));
    // 规则之间添加分隔
    if (i < rules.length - 1) {
      parts.push('');
      parts.push('---');
      parts.push('');
    }
  }

  // 源区块结束标记
  const endMarker = generateSourceEndMarker(sourceId, options);
  if (endMarker) {
    parts.push('');
    parts.push(endMarker);
  }

  return parts.join('\n');
}

/**
 * @description 按规则源分组规则
 * @return {Map<string, ParsedRule[]>}
 * @param rules {ParsedRule[]} 规则列表
 */
export function groupRulesBySource(rules: ParsedRule[]): Map<string, ParsedRule[]> {
  const groups = new Map<string, ParsedRule[]>();

  for (const rule of rules) {
    const sourceId = rule.sourceId || 'unknown';
    const existing = groups.get(sourceId) || [];
    existing.push(rule);
    groups.set(sourceId, existing);
  }

  return groups;
}

/**
 * @description 生成完整的带标记配置文件内容
 * @return {string}
 * @param rules {ParsedRule[]} 规则列表
 * @param headerContent {string} 头部内容（标题、说明等）
 * @param options {MarkerGeneratorOptions} 生成选项
 */
export function generateMarkedFileContent(
  rules: ParsedRule[],
  headerContent: string,
  options: MarkerGeneratorOptions = DEFAULT_OPTIONS,
): string {
  // 按规则源分组
  const rulesBySource = groupRulesBySource(rules);
  const sourceIds = Array.from(rulesBySource.keys());

  const parts: string[] = [];

  // 文件元数据
  parts.push(generateFileHeader(rules.length, sourceIds));

  // 头部内容（标题、说明等）
  if (headerContent) {
    parts.push(headerContent.trim());
    parts.push('');
  }

  // 按规则源生成区块
  for (const [sourceId, sourceRules] of rulesBySource) {
    parts.push(generateSourceBlock(sourceId, sourceRules, options));
    parts.push('');
  }

  return parts.join('\n');
}
