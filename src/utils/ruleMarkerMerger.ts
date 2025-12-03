/**
 * 规则标记合并器
 * 实现部分更新逻辑，合并新旧规则源区块
 */

import type { PartialUpdateOptions, SourceBlock } from '../types/ruleMarker';
import type { ParsedRule } from '../types/rules';
import { generateFileHeader, generateSourceBlock, groupRulesBySource } from './ruleMarkerGenerator';
import { parseMarkedFile, supportsPartialUpdate } from './ruleMarkerParser';

/**
 * 部分更新结果
 */
export interface PartialUpdateResult {
  /** 更新后的完整内容 */
  content: string;
  /** 是否执行了部分更新（false 表示全量更新） */
  isPartialUpdate: boolean;
  /** 更新的规则源 ID 列表 */
  updatedSources: string[];
  /** 保留的规则源 ID 列表 */
  preservedSources: string[];
}

/**
 * @description 执行部分更新
 * @return {PartialUpdateResult}
 * @param existingContent {string} 现有文件内容
 * @param newRules {ParsedRule[]} 新规则列表
 * @param headerContent {string} 头部内容
 * @param options {PartialUpdateOptions} 更新选项
 */
export function partialUpdate(
  existingContent: string,
  newRules: ParsedRule[],
  headerContent: string,
  options: PartialUpdateOptions,
): PartialUpdateResult {
  // 检查是否支持部分更新
  if (!supportsPartialUpdate(existingContent)) {
    // 不支持部分更新，执行全量更新
    return fullUpdate(newRules, headerContent);
  }

  // 解析现有文件
  const parsed = parseMarkedFile(existingContent);

  // 按规则源分组新规则
  const newRulesBySource = groupRulesBySource(newRules);
  const targetSourceIds = options.targetSourceIds;

  // 确定要更新和保留的规则源
  const updatedSources: string[] = [];
  const preservedSources: string[] = [];
  const finalBlocks: string[] = [];

  // 处理现有的规则源区块
  for (const block of parsed.sourceBlocks) {
    if (targetSourceIds.includes(block.sourceId)) {
      // 需要更新的规则源
      updatedSources.push(block.sourceId);
    } else if (options.preserveOtherSources !== false) {
      // 保留的规则源
      preservedSources.push(block.sourceId);
      finalBlocks.push(block.rawContent);
    }
  }

  // 添加更新的规则源区块
  for (const sourceId of targetSourceIds) {
    const sourceRules = newRulesBySource.get(sourceId) || [];
    if (sourceRules.length > 0) {
      finalBlocks.push(generateSourceBlock(sourceId, sourceRules));
      if (!updatedSources.includes(sourceId)) {
        updatedSources.push(sourceId);
      }
    }
  }

  // 添加新的规则源（不在现有文件中的）
  for (const [sourceId, sourceRules] of newRulesBySource) {
    if (!targetSourceIds.includes(sourceId) && !preservedSources.includes(sourceId)) {
      // 这是一个新的规则源
      finalBlocks.push(generateSourceBlock(sourceId, sourceRules));
      updatedSources.push(sourceId);
    }
  }

  // 保留用户内容
  let userContentBlock = '';
  if (options.preserveUserContent !== false && parsed.userContent) {
    userContentBlock = '\n' + parsed.userContent.rawContent;
  }

  // 组装最终内容
  const allSourceIds = [...new Set([...updatedSources, ...preservedSources])];
  const totalRuleCount = countTotalRules(newRules, parsed.sourceBlocks, targetSourceIds);

  const content =
    generateFileHeader(totalRuleCount, allSourceIds) +
    (headerContent ? headerContent.trim() + '\n\n' : '') +
    finalBlocks.join('\n\n') +
    userContentBlock;

  return {
    content,
    isPartialUpdate: true,
    updatedSources,
    preservedSources,
  };
}

/**
 * @description 执行全量更新
 * @return {PartialUpdateResult}
 * @param rules {ParsedRule[]} 规则列表
 * @param headerContent {string} 头部内容
 */
export function fullUpdate(rules: ParsedRule[], headerContent: string): PartialUpdateResult {
  const rulesBySource = groupRulesBySource(rules);
  const sourceIds = Array.from(rulesBySource.keys());

  const parts: string[] = [];

  // 文件元数据
  parts.push(generateFileHeader(rules.length, sourceIds));

  // 头部内容
  if (headerContent) {
    parts.push(headerContent.trim());
    parts.push('');
  }

  // 按规则源生成区块
  for (const [sourceId, sourceRules] of rulesBySource) {
    parts.push(generateSourceBlock(sourceId, sourceRules));
    parts.push('');
  }

  return {
    content: parts.join('\n'),
    isPartialUpdate: false,
    updatedSources: sourceIds,
    preservedSources: [],
  };
}

/**
 * @description 计算总规则数
 * @return {number}
 * @param newRules {ParsedRule[]} 新规则
 * @param existingBlocks {SourceBlock[]} 现有区块
 * @param targetSourceIds {string[]} 目标规则源 ID
 */
function countTotalRules(
  newRules: ParsedRule[],
  existingBlocks: SourceBlock[],
  targetSourceIds: string[],
): number {
  let count = 0;

  // 新规则数量
  count += newRules.length;

  // 保留的规则源中的规则数量
  for (const block of existingBlocks) {
    if (!targetSourceIds.includes(block.sourceId)) {
      count += block.count;
    }
  }

  return count;
}

/**
 * @description 合并规则源区块（保留指定源，替换其他源）
 * @return {string}
 * @param existingContent {string} 现有文件内容
 * @param sourceIdToReplace {string} 要替换的规则源 ID
 * @param newRules {ParsedRule[]} 新规则
 * @param headerContent {string} 头部内容
 */
export function replaceSourceBlock(
  existingContent: string,
  sourceIdToReplace: string,
  newRules: ParsedRule[],
  headerContent: string,
): PartialUpdateResult {
  return partialUpdate(existingContent, newRules, headerContent, {
    targetSourceIds: [sourceIdToReplace],
    preserveUserContent: true,
    preserveOtherSources: true,
  });
}

/**
 * @description 删除指定规则源的区块
 * @return {PartialUpdateResult}
 * @param existingContent {string} 现有文件内容
 * @param sourceIdToDelete {string} 要删除的规则源 ID
 * @param headerContent {string} 头部内容
 */
export function deleteSourceBlock(
  existingContent: string,
  sourceIdToDelete: string,
  headerContent: string,
): PartialUpdateResult {
  // 解析现有文件
  const parsed = parseMarkedFile(existingContent);

  // 过滤掉要删除的规则源
  const remainingBlocks = parsed.sourceBlocks.filter(
    (block) => block.sourceId !== sourceIdToDelete,
  );

  const sourceIds = remainingBlocks.map((block) => block.sourceId);
  const totalCount = remainingBlocks.reduce((sum, block) => sum + block.count, 0);

  const parts: string[] = [];

  // 文件元数据
  parts.push(generateFileHeader(totalCount, sourceIds));

  // 头部内容
  if (headerContent) {
    parts.push(headerContent.trim());
    parts.push('');
  }

  // 保留的规则源区块
  for (const block of remainingBlocks) {
    parts.push(block.rawContent);
    parts.push('');
  }

  // 保留用户内容
  if (parsed.userContent) {
    parts.push(parsed.userContent.rawContent);
  }

  return {
    content: parts.join('\n'),
    isPartialUpdate: true,
    updatedSources: [],
    preservedSources: sourceIds,
  };
}
