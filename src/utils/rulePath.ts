/**
 * @file 规则路径工具
 * @description 处理规则路径的转换（绝对路径 ↔ 相对路径）
 */

import * as path from 'path';

import { GLOBAL_CACHE_DIR, SOURCES_CACHE_DIR } from './constants';

/**
 * 获取源的根目录路径
 * @param sourceId 规则源 ID
 * @returns 源的根目录绝对路径
 */
export function getSourceRootPath(sourceId: string): string {
  return path.join(GLOBAL_CACHE_DIR, SOURCES_CACHE_DIR, sourceId);
}

/**
 * 将规则的绝对路径转换为相对路径
 * @param absolutePath 规则的绝对路径
 * @param sourceId 规则源 ID
 * @returns 相对于源根目录的路径
 *
 * @example
 * // 输入: /home/user/.cache/turbo-ai-rules/sources/my-source/rules/001.md
 * // 输出: rules/001.md
 */
export function toRelativePath(absolutePath: string, sourceId: string): string {
  const sourceRoot = getSourceRootPath(sourceId);

  // 如果路径以源根目录开头，提取相对路径
  if (absolutePath.startsWith(sourceRoot)) {
    return absolutePath.substring(sourceRoot.length).replace(/^\//, '');
  }

  // 如果不是以源根目录开头，返回原路径（向后兼容）
  return absolutePath;
}

/**
 * 将规则的相对路径转换为绝对路径
 * @param relativePath 相对于源根目录的路径
 * @param sourceId 规则源 ID
 * @returns 规则的绝对路径
 *
 * @example
 * // 输入: rules/001.md
 * // 输出: /home/user/.cache/turbo-ai-rules/sources/my-source/rules/001.md
 */
export function toAbsolutePath(relativePath: string, sourceId: string): string {
  const sourceRoot = getSourceRootPath(sourceId);

  // 如果已经是绝对路径（向后兼容），直接返回
  if (relativePath.startsWith('/') || relativePath.includes(sourceRoot)) {
    return relativePath;
  }

  // 否则拼接为绝对路径
  return path.join(sourceRoot, relativePath);
}

/**
 * 批量转换绝对路径为相对路径
 * @param absolutePaths 绝对路径数组
 * @param sourceId 规则源 ID
 * @returns 相对路径数组
 */
export function toRelativePaths(absolutePaths: string[], sourceId: string): string[] {
  return absolutePaths.map((p) => toRelativePath(p, sourceId)).filter((p) => p && p.trim()); // 过滤空路径和纯空格
}

/**
 * 批量转换相对路径为绝对路径
 * @param relativePaths 相对路径数组
 * @param sourceId 规则源 ID
 * @returns 绝对路径数组
 */
export function toAbsolutePaths(relativePaths: string[], sourceId: string): string[] {
  return relativePaths.map((p) => toAbsolutePath(p, sourceId));
}
