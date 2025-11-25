/**
 * @file 规则路径工具单元测试
 */

import { describe, expect, it } from 'vitest';

import {
  getSourceRootPath,
  toAbsolutePath,
  toAbsolutePaths,
  toRelativePath,
  toRelativePaths,
} from '../../../utils/rulePath';
import { expectPathsToBe, expectPathToBe, expectPathToMatch } from '../testUtils/pathMatchers';

describe('rulePath 工具函数', () => {
  const sourceId = 'test-source-123';

  describe('getSourceRootPath', () => {
    it('应返回源的根目录路径', () => {
      const result = getSourceRootPath(sourceId);
      expectPathToMatch(result, 'sources/test-source-123$');
    });
  });

  describe('toRelativePath', () => {
    it('应将绝对路径转换为相对路径', () => {
      const sourceRoot = getSourceRootPath(sourceId);
      const absolutePath = `${sourceRoot}/rules/001-typescript.md`;
      const result = toRelativePath(absolutePath, sourceId);
      expectPathToBe(result, 'rules/001-typescript.md');
    });

    it('应处理开头带斜杠的路径', () => {
      const sourceRoot = getSourceRootPath(sourceId);
      const absolutePath = `${sourceRoot}/rules/002-react.md`;
      const result = toRelativePath(absolutePath, sourceId);
      expectPathToBe(result, 'rules/002-react.md');
    });

    it('应处理嵌套目录路径', () => {
      const sourceRoot = getSourceRootPath(sourceId);
      const absolutePath = `${sourceRoot}/rules/backend/001-nodejs.md`;
      const result = toRelativePath(absolutePath, sourceId);
      expectPathToBe(result, 'rules/backend/001-nodejs.md');
    });

    it('应返回不匹配的路径（向后兼容）', () => {
      const otherPath = '/some/other/path/rules/001.md';
      const result = toRelativePath(otherPath, sourceId);
      expect(result).toBe(otherPath);
    });
  });

  describe('toAbsolutePath', () => {
    it('应将相对路径转换为绝对路径', () => {
      const relativePath = 'rules/001-typescript.md';
      const result = toAbsolutePath(relativePath, sourceId);
      expectPathToMatch(result, 'sources/test-source-123/rules/001-typescript.md$');
    });

    it('应处理嵌套目录的相对路径', () => {
      const relativePath = 'rules/backend/001-nodejs.md';
      const result = toAbsolutePath(relativePath, sourceId);
      expectPathToMatch(result, 'sources/test-source-123/rules/backend/001-nodejs.md$');
    });

    it('应直接返回已经是绝对路径的路径（向后兼容）', () => {
      const absolutePath = '/home/user/.cache/turbo-ai-rules/sources/test-source-123/rules/001.md';
      const result = toAbsolutePath(absolutePath, sourceId);
      expect(result).toBe(absolutePath);
    });

    it('应处理包含源根目录的路径（向后兼容）', () => {
      const sourceRoot = getSourceRootPath(sourceId);
      const pathWithRoot = `${sourceRoot}/rules/001.md`;
      const result = toAbsolutePath(pathWithRoot, sourceId);
      expect(result).toBe(pathWithRoot);
    });
  });

  describe('toRelativePaths', () => {
    it('应批量转换绝对路径为相对路径', () => {
      const sourceRoot = getSourceRootPath(sourceId);
      const absolutePaths = [
        `${sourceRoot}/rules/001.md`,
        `${sourceRoot}/rules/002.md`,
        `${sourceRoot}/rules/backend/003.md`,
      ];
      const result = toRelativePaths(absolutePaths, sourceId);
      expectPathsToBe(result, ['rules/001.md', 'rules/002.md', 'rules/backend/003.md']);
    });

    it('应处理空数组', () => {
      const result = toRelativePaths([], sourceId);
      expect(result).toEqual([]);
    });

    it('应过滤掉空路径', () => {
      const result = toRelativePaths(['', '  '], sourceId);
      expect(result).toEqual([]);
    });
  });

  describe('toAbsolutePaths', () => {
    it('应批量转换相对路径为绝对路径', () => {
      const relativePaths = ['rules/001.md', 'rules/002.md', 'rules/backend/003.md'];
      const result = toAbsolutePaths(relativePaths, sourceId);
      expect(result).toHaveLength(3);
      result.forEach((path) => {
        expectPathToMatch(path, 'sources/test-source-123');
      });
    });

    it('应处理空数组', () => {
      const result = toAbsolutePaths([], sourceId);
      expect(result).toEqual([]);
    });

    it('应处理混合路径（向后兼容）', () => {
      const paths = [
        'rules/001.md', // 相对路径
        '/absolute/path/002.md', // 绝对路径
      ];
      const result = toAbsolutePaths(paths, sourceId);
      expect(result).toHaveLength(2);
      expectPathToMatch(result[0], 'sources/test-source-123/rules/001.md$');
      expect(result[1]).toBe('/absolute/path/002.md');
    });
  });
});
