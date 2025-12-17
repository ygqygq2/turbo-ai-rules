import React from 'react';
import { Icon } from '../components/Icon';
import { renderTreeNodes, getAllFilePaths, type TreeNodeType } from '../components/tree';

/**
 * 简化版规则选择器组件（用于规则同步页）
 * - 只显示树和统计信息
 * - 不包含保存/取消按钮
 * - 支持外部状态管理
 */
interface CompactRuleSelectorProps {
  /** 源名称 */
  sourceName: string;
  /** 树节点数组 */
  treeNodes: TreeNodeType[];
  /** 已选择的路径数组 */
  selectedPaths: string[];
  /** 展开的节点集合 */
  expandedNodes?: Set<string>;
  /** 切换节点展开/折叠 */
  onToggleNode: (path: string) => void;
  /** 选择/取消选择节点 */
  onSelectNode: (path: string, checked: boolean, isDirectory: boolean) => void;
  /** 是否展开源节点 */
  isExpanded: boolean;
  /** 切换源节点展开状态 */
  onToggleSource: () => void;
}

export const CompactRuleSelector: React.FC<CompactRuleSelectorProps> = ({
  sourceName,
  treeNodes,
  selectedPaths,
  onToggleNode,
  onSelectNode,
  isExpanded,
  onToggleSource,
}) => {
  const allPaths = getAllFilePaths(treeNodes);
  const selectedCount = selectedPaths.length;
  const isAllSelected = selectedCount === allPaths.length && allPaths.length > 0;
  const isIndeterminate = selectedCount > 0 && selectedCount < allPaths.length;

  return (
    <div className="compact-rule-selector">
      {/* 源节点头部 */}
      <div className="source-header">
        <div className="source-header-left">
          <span className="source-chevron" onClick={onToggleSource}>
            <Icon icon={isExpanded ? 'chevron-down' : 'chevron-right'} />
          </span>
          <input
            type="checkbox"
            className="source-checkbox"
            checked={isAllSelected}
            ref={(input) => {
              if (input) {
                input.indeterminate = isIndeterminate;
              }
            }}
            onChange={(e) => {
              // 全选/全不选该源的所有规则
              const shouldSelect = e.target.checked;
              allPaths.forEach((path) => onSelectNode(path, shouldSelect, false));
            }}
          />
          <Icon icon="folder" />
          <span className="source-name">{sourceName}</span>
        </div>
        <div className="source-stats">
          <span>
            {selectedCount} / {allPaths.length}
          </span>
        </div>
      </div>

      {/* 树内容 */}
      {isExpanded && (
        <div className="source-tree-content">
          {treeNodes.length === 0 ? (
            <div className="tree-placeholder">
              <p>暂无规则</p>
            </div>
          ) : (
            <div className="tree-nodes">
              {renderTreeNodes({
                nodes: treeNodes,
                fullTree: treeNodes,
                selectedPaths,
                onToggle: onToggleNode,
                onSelect: onSelectNode,
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
