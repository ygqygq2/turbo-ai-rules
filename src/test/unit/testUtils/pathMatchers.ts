/**
 * @file 跨平台路径测试工具函数
 * @description 提供跨平台路径匹配和断言工具，避免硬编码路径分隔符
 */

import * as path from 'path';
import { expect } from 'vitest';

/**
 * 将路径统一为 Unix 风格（用于比较）
 * @description 将 Windows 反斜杠 \ 统一转换为 Unix 斜杠 /
 * @param path 原始路径
 * @returns Unix 风格路径
 */
export function normalizePathForComparison(path: string): string {
  return path.replace(/\\/g, '/');
}

/**
 * 将路径数组统一为 Unix 风格（用于比较）
 * @param paths 原始路径数组
 * @returns Unix 风格路径数组
 */
export function normalizePathsForComparison(paths: string[]): string[] {
  return paths.map(normalizePathForComparison);
}

/**
 * 创建跨平台路径匹配正则表达式
 * @description 将 Unix 风格路径模式转换为跨平台正则（/ 或 \）
 * @param pattern Unix 风格路径模式，如 'sources/test/file.md'
 * @returns 跨平台正则表达式
 *
 * @example
 * ```typescript
 * const regex = createCrossPlatformPathRegex('sources/test/file.md');
 * expect('/path/sources/test/file.md').toMatch(regex);      // Unix
 * expect('C:\\path\\sources\\test\\file.md').toMatch(regex); // Windows
 * ```
 */
export function createCrossPlatformPathRegex(pattern: string): RegExp {
  // 转义正则特殊字符（除了 /）
  const escapedPattern = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // 将 / 替换为 [\\/] 以匹配两种分隔符
  const crossPlatformPattern = escapedPattern.replace(/\//g, '[\\\\/]');
  return new RegExp(crossPlatformPattern);
}

/**
 * 断言路径符合跨平台模式
 * @description 使用正规化后的路径进行断言，兼容 Windows/Unix
 * @param actual 实际路径
 * @param expected Unix 风格的期望路径
 *
 * @example
 * ```typescript
 * expectPathToBe('rules\\001.md', 'rules/001.md'); // Windows ✓
 * expectPathToBe('rules/001.md', 'rules/001.md');  // Unix ✓
 * ```
 */
export function expectPathToBe(actual: string, expected: string): void {
  expect(normalizePathForComparison(actual)).toBe(expected);
}

/**
 * 断言路径数组符合跨平台模式
 * @param actual 实际路径数组
 * @param expected Unix 风格的期望路径数组
 */
export function expectPathsToBe(actual: string[], expected: string[]): void {
  expect(normalizePathsForComparison(actual)).toEqual(expected);
}

/**
 * 断言路径匹配跨平台模式
 * @description 自动创建跨平台正则表达式进行匹配
 * @param actual 实际路径
 * @param pattern Unix 风格路径模式（支持正则特殊字符如 $ ^ .）
 *
 * @example
 * ```typescript
 * expectPathToMatch('/cache/sources/test-123', 'sources/test-123$');
 * expectPathToMatch('C:\\cache\\sources\\test-123', 'sources/test-123$');
 * ```
 */
export function expectPathToMatch(actual: string, pattern: string): void {
  // 判断 pattern 是否包含正则锚点或特殊字符
  const hasRegexChars = /[\^$.]/.test(pattern);

  if (hasRegexChars) {
    // 保留正则特殊字符，只转换路径分隔符
    const crossPlatformPattern = pattern.replace(/\//g, '[\\\\/]');
    expect(actual).toMatch(new RegExp(crossPlatformPattern));
  } else {
    // 完整的正则转义处理
    expect(actual).toMatch(createCrossPlatformPathRegex(pattern));
  }
}

/**
 * 断言两个路径在规范化后相等
 * @description 使用 path.normalize 规范化后比较，兼容不同平台的路径格式
 * @param actual 实际路径
 * @param expected 期望路径
 *
 * @example
 * ```typescript
 * expectNormalizedPathToBe('C:\\Users\\Test', 'C:/Users/Test');  // ✓
 * expectNormalizedPathToBe('/home/user', '/home/user');           // ✓
 * ```
 */
export function expectNormalizedPathToBe(actual: string, expected: string): void {
  expect(path.normalize(actual)).toBe(path.normalize(expected));
}
