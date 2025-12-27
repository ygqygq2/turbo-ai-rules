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
 * @description 生成规则元数据摘要（Markdown 表格格式）
 * @return {string} 格式化的元数据表格，如果没有元数据则返回空字符串
 * @param rule {ParsedRule} 规则
 */
export function generateMetadataSummary(rule: ParsedRule): string {
  const meta = rule.metadata;
  const entries = Object.entries(meta);

  // 如果没有任何元数据，返回空
  if (entries.length === 0) {
    return '';
  }

  const rows: Array<{ key: string; value: string }> = [];

  // 动态遍历所有元数据字段，原样保留
  for (const [key, value] of entries) {
    let formattedValue: string;

    if (value === undefined || value === null) {
      formattedValue = '';
    } else if (Array.isArray(value)) {
      // 数组：用代码格式展示每个元素
      formattedValue = value.length > 0 ? value.map((v) => `\`${v}\``).join(', ') : '';
    } else if (typeof value === 'boolean') {
      // 布尔值
      formattedValue = String(value);
    } else if (typeof value === 'object') {
      // 对象：转为 JSON 字符串
      formattedValue = JSON.stringify(value);
    } else {
      // 字符串或数字，原样保留
      formattedValue = String(value);
    }

    rows.push({ key, value: formattedValue });
  }

  // 生成表格
  const lines: string[] = [];
  lines.push('| Property | Value |');
  lines.push('|----------|-------|');
  for (const row of rows) {
    lines.push(`| ${row.key} | ${row.value} |`);
  }
  lines.push('');

  return lines.join('\n');
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

  // 规则内容（使用不含 frontmatter 的 content）
  const content = (rule.content || rule.rawContent)?.trim() || '';

  // 在内容开头添加元数据摘要（如果有）
  const metaSummary = generateMetadataSummary(rule);
  if (metaSummary) {
    // 检查内容是否以标题开头，如果是则在标题后插入元数据
    const titleMatch = content.match(/^(#+ .+\n)/);
    if (titleMatch) {
      const title = titleMatch[1];
      const restContent = content.slice(title.length);
      parts.push(title + metaSummary + restContent);
    } else {
      parts.push(metaSummary + '\n' + content);
    }
  } else {
    parts.push(content);
  }

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

  // 添加全局顶层 blockMarkers 开始标记（包裹所有自动生成的内容）
  if (options.blockMarkers) {
    parts.push(options.blockMarkers.begin);
    parts.push('');
  }

  // 头部内容（标题、说明等）
  if (headerContent) {
    parts.push(headerContent.trim());
    parts.push('');
  }

  // 按规则源生成区块
  for (const [sourceId, sourceRules] of rulesBySource) {
    // 如果是用户规则源且有 userRulesMarkers 配置，添加用户规则专用包裹
    if (sourceId === 'user-rules' && options.userRulesMarkers) {
      parts.push(options.userRulesMarkers.begin);
    }

    parts.push(generateSourceBlock(sourceId, sourceRules, options));

    if (sourceId === 'user-rules' && options.userRulesMarkers) {
      parts.push(options.userRulesMarkers.end);
    }

    parts.push('');
  }

  // 添加全局顶层 blockMarkers 结束标记
  if (options.blockMarkers) {
    parts.push(options.blockMarkers.end);
  }

  return parts.join('\n');
}
