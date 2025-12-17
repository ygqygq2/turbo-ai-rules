import React from 'react';
import { Icon } from '../Icon';
import type { TreeNode as TreeNodeType } from './tree-utils';

interface TreeNodeProps {
  node: TreeNodeType;
  level: number;
  isSelected: boolean;
  isIndeterminate: boolean;
  onToggle: (path: string) => void;
  onSelect: (path: string, checked: boolean, isDirectory: boolean) => void;
}

/**
 * 树形节点组件
 * 支持展开/收起、选择、缩进显示
 */
export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  isSelected,
  isIndeterminate,
  onToggle,
  onSelect,
}) => {
  const isDirectory = node.type === 'directory';
  const hasChildren = isDirectory && node.children && node.children.length > 0;

  /**
   * @description 处理展开/收起
   */
  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDirectory) {
      onToggle(node.path);
    }
  };

  /**
   * @description 处理复选框变化
   */
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    onSelect(node.path, e.target.checked, isDirectory);
  };

  const indentStyle = { paddingLeft: `${level * 20}px` };

  return (
    <div className="tree-node-container">
      <div className="tree-node-item" style={indentStyle}>
        {/* 展开/收起图标 */}
        <span className="tree-node-chevron" onClick={handleToggle}>
          {isDirectory && hasChildren ? (
            node.expanded ? (
              <Icon icon="chevron-down" />
            ) : (
              <Icon icon="chevron-right" />
            )
          ) : (
            <span style={{ width: 16, display: 'inline-block' }}></span>
          )}
        </span>

        {/* 复选框 */}
        <input
          type="checkbox"
          checked={isSelected}
          ref={(input) => {
            if (input) {
              input.indeterminate = isIndeterminate;
            }
          }}
          onChange={handleCheckboxChange}
          className="tree-node-checkbox"
        />

        {/* 文件/目录图标 */}
        <span className="tree-node-icon">
          <Icon icon={isDirectory ? 'folder' : 'file'} />
        </span>

        {/* 名称 */}
        <span className="tree-node-name" onClick={handleToggle}>
          {node.name}
        </span>

        {/* 规则数量（文件节点） */}
        {!isDirectory && node.ruleCount && node.ruleCount > 0 && (
          <span className="tree-node-count">({node.ruleCount})</span>
        )}
      </div>
    </div>
  );
};
