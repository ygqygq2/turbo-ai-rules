/**
 * File Tree Builder Utility
 *
 * 提供从规则列表构建文件树的通用方法
 */

import * as path from 'path';

import type { ParsedRule } from '../types/rules';

/**
 * 通用文件树节点
 */
export interface FileTreeNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

/**
 * @description 从规则列表构建文件树
 * @param rules {ParsedRule[]} 规则列表
 * @param basePath {string} 基础路径，用于计算相对路径
 * @return {FileTreeNode[]} 文件树节点数组
 */
export function buildFileTreeFromRules(rules: ParsedRule[], basePath: string): FileTreeNode[] {
  // 按目录分组规则
  const dirMap = new Map<string, ParsedRule[]>();

  for (const rule of rules) {
    const relativePath = path.relative(basePath, rule.filePath);
    const dirPath = path.dirname(relativePath);

    if (!dirMap.has(dirPath)) {
      dirMap.set(dirPath, []);
    }
    dirMap.get(dirPath)!.push(rule);
  }

  // 递归构建树结构
  const buildTreeRecursive = (currentPath: string): FileTreeNode[] => {
    const nodes: FileTreeNode[] = [];
    const filesInCurrentDir = dirMap.get(currentPath) || [];

    // 添加文件节点
    for (const rule of filesInCurrentDir) {
      const relativePath = path.relative(basePath, rule.filePath);
      const fileName = path.basename(rule.filePath);

      nodes.push({
        path: relativePath,
        name: fileName,
        type: 'file',
      });
    }

    // 查找子目录
    const subDirs = new Set<string>();
    for (const dirPath of dirMap.keys()) {
      const isSubDir =
        currentPath === '.'
          ? dirPath !== '.' && !dirPath.includes(path.sep)
          : dirPath.startsWith(currentPath + path.sep);

      if (isSubDir) {
        const relativePart =
          currentPath === '.' ? dirPath : dirPath.substring(currentPath.length + 1);
        const firstDir = relativePart.split(path.sep)[0];
        if (firstDir) {
          subDirs.add(firstDir);
        }
      }
    }

    // 递归处理子目录
    for (const subDir of subDirs) {
      const subDirPath = currentPath === '.' ? subDir : path.join(currentPath, subDir);
      const children = buildTreeRecursive(subDirPath);

      if (children.length > 0) {
        nodes.push({
          path: subDirPath,
          name: subDir,
          type: 'directory',
          children,
        });
      }
    }

    return nodes.sort((a, b) => {
      // 目录优先，然后按名称排序
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  };

  return buildTreeRecursive('.');
}
