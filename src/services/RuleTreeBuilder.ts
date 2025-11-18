/**
 * 规则树构建服务
 * 扫描 Git 仓库的本地缓存目录，构建文件/目录树形结构
 */

import * as fs from 'fs-extra';
import * as path from 'path';

import { MdcParser } from '../parsers/MdcParser';
import { SystemError } from '../types/errors';
import { Logger } from '../utils/logger';
import { GitManager } from './GitManager';

/**
 * 树节点类型
 */
export interface TreeNode {
  id: string; // 唯一标识（路径）
  name: string; // 文件/目录名
  path: string; // 相对路径（相对于 subPath）
  type: 'directory' | 'file';
  checked: boolean; // 是否选中
  indeterminate: boolean; // 是否半选（仅目录）
  ruleCount?: number; // 规则数（仅文件）
  children?: TreeNode[]; // 子节点（仅目录）
  expanded?: boolean; // 是否展开（仅目录）
}

/**
 * 树构建选项
 */
export interface TreeBuildOptions {
  /** 最大递归深度 */
  maxDepth?: number;
  /** 最大节点数（防止过大仓库卡死） */
  maxNodes?: number;
  /** 已选中的路径列表 */
  selectedPaths?: string[];
  /** 是否计算规则数量（耗时操作） */
  countRules?: boolean;
}

/**
 * 树构建结果
 */
export interface TreeBuildResult {
  tree: TreeNode;
  totalFiles: number;
  totalRules: number;
  selectedFiles: number;
}

/**
 * 规则树构建器
 */
export class RuleTreeBuilder {
  private static instance: RuleTreeBuilder;
  private gitManager: GitManager;
  private mdcParser: MdcParser;

  private constructor() {
    this.gitManager = GitManager.getInstance();
    this.mdcParser = new MdcParser();
  }

  /**
   * @description 获取 RuleTreeBuilder 实例
   * @return {RuleTreeBuilder}
   */
  public static getInstance(): RuleTreeBuilder {
    if (!RuleTreeBuilder.instance) {
      RuleTreeBuilder.instance = new RuleTreeBuilder();
    }
    return RuleTreeBuilder.instance;
  }

  /**
   * @description 为指定源构建规则树
   * @return {Promise<TreeBuildResult>}
   * @param sourceId {string} 源 ID
   * @param subPath {string} 子目录路径
   * @param options {TreeBuildOptions} 构建选项
   */
  public async buildTree(
    sourceId: string,
    subPath: string,
    options: TreeBuildOptions = {},
  ): Promise<TreeBuildResult> {
    try {
      const { maxDepth = 10, maxNodes = 5000, selectedPaths = [], countRules = true } = options;

      // 获取源的本地路径
      const repoPath = this.gitManager.getSourcePath(sourceId);
      if (!(await fs.pathExists(repoPath))) {
        throw new SystemError(`Repository not found: ${sourceId}`, 'TAI-2004');
      }

      // 计算完整扫描路径
      const scanPath = path.join(repoPath, subPath || '');
      if (!(await fs.pathExists(scanPath))) {
        throw new SystemError(`Subpath not found: ${subPath} in source ${sourceId}`, 'TAI-2004');
      }

      Logger.info('Building rule tree', { sourceId, subPath, scanPath });

      const selectedSet = new Set(selectedPaths);
      let nodeCount = 0;
      let totalFiles = 0;
      let totalRules = 0;

      /**
       * @description 递归构建节点
       * @return {Promise<TreeNode | null>}
       * @param absolutePath {string} 绝对路径
       * @param relativePath {string} 相对路径
       * @param depth {number} 当前深度
       */
      const buildNode = async (
        absolutePath: string,
        relativePath: string,
        depth: number,
      ): Promise<TreeNode | null> => {
        // 检查节点数限制
        if (nodeCount >= maxNodes) {
          Logger.warn('Max nodes limit reached', { maxNodes, nodeCount });
          return null;
        }

        // 检查深度限制
        if (depth > maxDepth) {
          Logger.warn('Max depth limit reached', { maxDepth, depth, relativePath });
          return null;
        }

        nodeCount++;

        const stat = await fs.stat(absolutePath);
        const name = path.basename(absolutePath);

        // 安全检查：拒绝包含 .. 的路径
        if (relativePath.includes('..')) {
          Logger.warn('Path traversal detected, skipping', { relativePath });
          return null;
        }

        // 排除规则
        if (
          name.startsWith('.') || // 隐藏文件
          name === 'node_modules' ||
          name === '.git'
        ) {
          return null;
        }

        if (stat.isDirectory()) {
          // 目录节点
          const children: TreeNode[] = [];
          const entries = await fs.readdir(absolutePath);

          for (const entry of entries) {
            const childAbsolute = path.join(absolutePath, entry);
            const childRelative = relativePath ? path.join(relativePath, entry) : entry;
            const childNode = await buildNode(childAbsolute, childRelative, depth + 1);
            if (childNode) {
              children.push(childNode);
            }
          }

          // 如果目录为空（没有有效子项），不显示
          if (children.length === 0) {
            return null;
          }

          // 计算选中状态
          const allChecked = children.every((c) => c.checked);
          const someChecked = children.some((c) => c.checked || c.indeterminate);
          const checked = allChecked;
          const indeterminate = !allChecked && someChecked;

          return {
            id: relativePath || '/',
            name,
            path: relativePath || '/',
            type: 'directory',
            checked,
            indeterminate,
            children,
            expanded: depth < 2, // 默认展开前两层
          };
        } else if (stat.isFile()) {
          // 文件节点：仅包含 .md/.mdc 文件
          const ext = path.extname(name).toLowerCase();
          if (!['.md', '.mdc'].includes(ext)) {
            return null;
          }

          totalFiles++;

          // 计算规则数量（可选，耗时）
          let ruleCount = 0;
          if (countRules) {
            try {
              const content = await fs.readFile(absolutePath, 'utf-8');
              const parsed = await this.mdcParser.parse(content, absolutePath);
              ruleCount = parsed ? 1 : 0; // 简化：每个有效文件算 1 条规则
              totalRules += ruleCount;
            } catch {
              // 解析失败，跳过
            }
          }

          const checked = selectedSet.has(relativePath);
          if (checked) {
            // 已选中的文件也计入统计（后续会用到）
          }

          return {
            id: relativePath,
            name,
            path: relativePath,
            type: 'file',
            checked,
            indeterminate: false,
            ruleCount,
          };
        }

        return null;
      };

      const rootNode = await buildNode(scanPath, '', 0);

      if (!rootNode) {
        throw new SystemError('Failed to build tree: empty or invalid directory', 'TAI-5003');
      }

      // 计算已选文件数
      const selectedFiles = this.countSelectedFiles(rootNode);

      Logger.info('Rule tree built successfully', {
        sourceId,
        nodeCount,
        totalFiles,
        totalRules,
        selectedFiles,
      });

      return {
        tree: rootNode,
        totalFiles,
        totalRules,
        selectedFiles,
      };
    } catch (error) {
      Logger.error('Failed to build rule tree', error as Error, { sourceId, subPath });
      throw new SystemError(
        'Failed to build rule tree',
        'TAI-5003',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * @description 递归统计已选文件数
   * @return {number}
   * @param node {TreeNode}
   */
  private countSelectedFiles(node: TreeNode): number {
    if (node.type === 'file') {
      return node.checked ? 1 : 0;
    }

    if (node.type === 'directory' && node.children) {
      return node.children.reduce((sum, child) => sum + this.countSelectedFiles(child), 0);
    }

    return 0;
  }
}
