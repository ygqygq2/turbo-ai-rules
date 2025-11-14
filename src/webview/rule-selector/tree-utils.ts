/**
 * 规则树工具函数
 * 用于将文件树转换为UI树形结构
 */

export interface FileTreeNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
}

export interface TreeNode {
  id: string; // 唯一标识
  name: string; // 显示名称
  path: string; // 完整路径
  type: 'directory' | 'file';
  children?: TreeNode[]; // 子节点（目录）
  expanded?: boolean; // 是否展开
}

/**
 * @description 从后端文件树构建前端树形结构
 * @return default {TreeNode[]}
 * @param fileTree {FileTreeNode[]}
 */
export function buildTree(fileTree: FileTreeNode[]): TreeNode[] {
  return fileTree.map(convertFileNode);
}

/**
 * @description 转换单个文件节点
 * @return default {TreeNode}
 * @param node {FileTreeNode}
 */
function convertFileNode(node: FileTreeNode): TreeNode {
  return {
    id: node.path,
    name: node.name,
    path: node.path,
    type: node.type,
    children: node.children ? node.children.map(convertFileNode) : undefined,
    expanded: false,
  };
}

/**
 * @description 展开/收起树节点
 * @return default {TreeNode[]}
 * @param nodes {TreeNode[]}
 * @param targetPath {string}
 */
export function toggleNode(nodes: TreeNode[], targetPath: string): TreeNode[] {
  return nodes.map((node) => {
    if (node.path === targetPath) {
      return { ...node, expanded: !node.expanded };
    }
    if (node.children) {
      return { ...node, children: toggleNode(node.children, targetPath) };
    }
    return node;
  });
}

/**
 * @description 获取所有文件路径（用于全选）
 * @return default {string[]}
 * @param nodes {TreeNode[]}
 */
export function getAllFilePaths(nodes: TreeNode[]): string[] {
  const paths: string[] = [];

  for (const node of nodes) {
    if (node.type === 'file') {
      paths.push(node.path);
    } else if (node.children) {
      paths.push(...getAllFilePaths(node.children));
    }
  }

  return paths;
}

/**
 * @description 获取目录下的所有文件路径
 * @return default {string[]}
 * @param nodes {TreeNode[]}
 * @param targetPath {string}
 */
export function getDirectoryFilePaths(nodes: TreeNode[], targetPath: string): string[] {
  for (const node of nodes) {
    if (node.path === targetPath && node.type === 'directory') {
      return getAllFilePaths(node.children || []);
    }
    if (node.children) {
      const result = getDirectoryFilePaths(node.children, targetPath);
      if (result.length > 0) return result;
    }
  }
  return [];
}

/**
 * @description 扁平化树节点（用于搜索/过滤）
 * @return default {TreeNode[]}
 * @param nodes {TreeNode[]}
 * @param filterFn {(node: TreeNode) => boolean}
 */
export function flattenTree(nodes: TreeNode[], filterFn?: (node: TreeNode) => boolean): TreeNode[] {
  const result: TreeNode[] = [];

  for (const node of nodes) {
    if (!filterFn || filterFn(node)) {
      result.push(node);
    }
    if (node.children) {
      result.push(...flattenTree(node.children, filterFn));
    }
  }

  return result;
}
