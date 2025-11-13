/**
 * 规则树工具函数
 * 用于将平铺的规则列表转换为树形结构
 */

interface RuleItem {
  id: string;
  title: string;
  filePath: string;
  tags: string[];
  priority: number;
}

export interface TreeNode {
  id: string; // 唯一标识
  name: string; // 显示名称
  path: string; // 完整路径
  type: 'directory' | 'file';
  children?: TreeNode[]; // 子节点（目录）
  expanded?: boolean; // 是否展开
  rules?: RuleItem[]; // 文件节点的规则列表
  ruleCount?: number; // 规则数量
}

/**
 * @description 从路径列表构建树形结构
 * @return default {TreeNode[]}
 * @param rules {RuleItem[]}
 */
export function buildTree(rules: RuleItem[]): TreeNode[] {
  const root: { [key: string]: TreeNode } = {};

  for (const rule of rules) {
    const pathParts = rule.filePath.split('/').filter((p) => p);
    let currentLevel = root;
    let currentPath = '';

    for (let i = 0; i < pathParts.length; i++) {
      const part = pathParts[i];
      currentPath = currentPath ? `${currentPath}/${part}` : part;
      const isFile = i === pathParts.length - 1;

      if (!currentLevel[part]) {
        currentLevel[part] = {
          id: currentPath,
          name: part,
          path: currentPath,
          type: isFile ? 'file' : 'directory',
          children: isFile ? undefined : {},
          expanded: false,
          rules: isFile ? [] : undefined,
          ruleCount: 0,
        } as any;
      }

      if (isFile) {
        // 文件节点：添加规则
        if (!currentLevel[part].rules) currentLevel[part].rules = [];
        currentLevel[part].rules!.push(rule);
        currentLevel[part].ruleCount = (currentLevel[part].ruleCount || 0) + 1;
      } else {
        // 目录节点：继续向下
        currentLevel = currentLevel[part].children as any;
      }
    }
  }

  return convertToArray(root);
}

/**
 * @description 将对象形式的树转为数组
 * @return default {TreeNode[]}
 * @param obj {{ [key: string]: TreeNode }}
 */
function convertToArray(obj: { [key: string]: TreeNode }): TreeNode[] {
  const result: TreeNode[] = [];

  for (const key in obj) {
    const node = obj[key];
    if (node.type === 'directory' && node.children) {
      node.children = convertToArray(node.children as any);
    }
    result.push(node);
  }

  // 排序：目录优先，然后按名称
  result.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return result;
}

/**
 * @description 展开/收起节点
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
