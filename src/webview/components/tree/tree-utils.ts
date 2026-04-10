/**
 * 规则树工具函数
 * 用于将文件树转换为UI树形结构
 */

export interface FileTreeNode {
  path: string;
  name: string;
  type: 'file' | 'directory';
  children?: FileTreeNode[];
  checked?: boolean; // ✅ 添加选中状态（后端标记）
  /** 资产语义类型，由后端 AssetClassifier 填充 */
  kind?: string;
}

export interface TreeNode {
  id: string; // 唯一标识
  name: string; // 显示名称
  path: string; // 完整路径
  type: 'directory' | 'file';
  children?: TreeNode[]; // 子节点（目录）
  expanded?: boolean; // 是否展开
  checked?: boolean; // ✅ 选中状态（保留后端标记）
  /** 资产语义类型 */
  kind?: string;
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
 * @description 转换单个文件节点（✅ 保留后端的 checked 属性）
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
    checked: node.checked, // ✅ 保留后端标记的选中状态
    kind: node.kind,
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

/**
 * @description 收集树中所有文件节点的 kind 值（去重）
 * @return default {string[]}
 * @param nodes {TreeNode[]}
 */
export function collectKinds(nodes: TreeNode[]): string[] {
  const kinds = new Set<string>();
  const walk = (list: TreeNode[]) => {
    for (const node of list) {
      if (node.type === 'file' && node.kind) {
        kinds.add(node.kind);
      }
      if (node.children) walk(node.children);
    }
  };
  walk(nodes);
  return Array.from(kinds).sort();
}

/**
 * @description 按 kind 过滤树（仅保留 kind 匹配的文件节点及所在的父目录）
 * 若 kind 为 null/undefined 则返回原树
 * @return default {TreeNode[]}
 * @param nodes {TreeNode[]}
 * @param kind {string | null}
 */
export function filterTreeByKind(nodes: TreeNode[], kind: string | null): TreeNode[] {
  if (!kind) return nodes;

  const filter = (list: TreeNode[]): TreeNode[] => {
    const result: TreeNode[] = [];
    for (const node of list) {
      if (node.type === 'file') {
        if (node.kind === kind) result.push(node);
      } else if (node.children) {
        const filteredChildren = filter(node.children);
        if (filteredChildren.length > 0) {
          result.push({ ...node, children: filteredChildren });
        }
      }
    }
    return result;
  };

  return filter(nodes);
}
