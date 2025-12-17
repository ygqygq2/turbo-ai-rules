import React from 'react';
import { TreeNode } from './TreeNode';
import { getDirectoryFilePaths, type TreeNode as TreeNodeType } from './tree-utils';

/**
 * 树节点渲染器的参数接口
 */
export interface TreeRendererProps {
  /** 树节点数组 */
  nodes: TreeNodeType[];
  /** 完整的树结构（用于计算目录状态） */
  fullTree: TreeNodeType[];
  /** 已选择的路径数组 */
  selectedPaths: string[];
  /** 当前层级 */
  level?: number;
  /** 切换节点展开/折叠的回调 */
  onToggle: (path: string) => void;
  /** 选择/取消选择节点的回调 */
  onSelect: (path: string, checked: boolean, isDirectory: boolean) => void;
}

/**
 * 递归渲染树形节点（✅ 提取为通用组件，可被规则选择器和规则同步页复用）
 */
export const renderTreeNodes = ({
  nodes,
  fullTree,
  selectedPaths,
  level = 0,
  onToggle,
  onSelect,
}: TreeRendererProps): React.ReactElement[] => {
  return nodes.map((node) => {
    const isDirectory = node.type === 'directory';

    // 计算选中状态
    const isSelected = isDirectory
      ? getDirectoryFilePaths(fullTree, node.path).every((p) => selectedPaths.includes(p))
      : selectedPaths.includes(node.path);

    // 计算部分选中状态
    const isIndeterminate =
      isDirectory &&
      !isSelected &&
      getDirectoryFilePaths(fullTree, node.path).some((p) => selectedPaths.includes(p));

    return (
      <React.Fragment key={node.id}>
        <TreeNode
          node={node}
          level={level}
          isSelected={isSelected}
          isIndeterminate={isIndeterminate}
          onToggle={onToggle}
          onSelect={onSelect}
        />
        {node.expanded &&
          node.children &&
          renderTreeNodes({
            nodes: node.children,
            fullTree,
            selectedPaths,
            level: level + 1,
            onToggle,
            onSelect,
          })}
      </React.Fragment>
    );
  });
};

/**
 * 树渲染器组件（React 组件版本）
 */
export const TreeRenderer: React.FC<TreeRendererProps> = (props) => {
  return <>{renderTreeNodes(props)}</>;
};
