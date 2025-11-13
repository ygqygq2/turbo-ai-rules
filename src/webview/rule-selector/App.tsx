import React, { useEffect } from 'react';
import { Icon } from '../components/Icon';
import { TreeNode } from './TreeNode';
import { useRuleSelectorStore } from './store';
import { getDirectoryFilePaths } from './tree-utils';
import type { TreeNode as TreeNodeType } from './tree-utils';
import '../global.css';
import './rule-selector.css';

// 定义消息类型
interface VsCodeApi {
  postMessage(message: any): void;
  getState(): any;
  setState(state: any): void;
}

declare const acquireVsCodeApi: () => VsCodeApi;
const vscode = acquireVsCodeApi();

interface RuleSelection {
  mode: 'include' | 'exclude';
  paths?: string[];
  excludePaths?: string[];
}

interface RuleItem {
  id: string;
  title: string;
  filePath: string;
  tags: string[];
  priority: number;
}

interface InitialData {
  workspacePath: string;
  selections: { [sourceId: string]: RuleSelection };
  rulesBySource: { [sourceId: string]: RuleItem[] };
}

/**
 * RuleSelector App 入口
 * 使用 Zustand 管理状态，负责渲染规则树、选择、统计、保存等 UI
 */
export const App: React.FC = () => {
  // 从 Zustand store 获取状态和 actions
  const {
    workspacePath,
    currentSourceId,
    availableSources,
    rules,
    selectedPaths,
    originalPaths,
    totalRules,
    searchTerm,
    saving,
    treeNodes,
    setInitialData,
    switchSource,
    toggleNode: toggleTreeNode,
    selectNode,
    selectAll,
    clearAll,
    reset,
    setSearchTerm,
    setSaving,
    updateAfterSave,
  } = useRuleSelectorStore();

  // 监听来自扩展的消息
  useEffect(() => {
    // 页面就绪，通知扩展端发送初始数据
    try {
      vscode.postMessage({ type: 'webviewReady' });
    } catch (_) {
      // ignore
    }

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'initialData': {
          const data = message.payload as InitialData;
          setInitialData(data);
          break;
        }
        case 'saveSuccess': {
          updateAfterSave();
          break;
        }
        case 'error': {
          setSaving(false);
          alert(message.payload.message || '操作失败');
          break;
        }
        default:
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setInitialData, updateAfterSave, setSaving]);

  // 保存
  const handleSave = () => {
    setSaving(true);
    vscode.postMessage({
      type: 'saveRuleSelection',
      payload: {
        sourceId: currentSourceId,
        selection: {
          paths: selectedPaths,
        },
      },
    });
  };

  // 关闭
  const handleClose = () => {
    vscode.postMessage({
      type: 'close',
    });
  };

  // 过滤规则
  const filteredRules = rules.filter((rule) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      rule.title.toLowerCase().includes(term) ||
      rule.filePath.toLowerCase().includes(term) ||
      rule.tags.some((tag) => tag.toLowerCase().includes(term))
    );
  });

  /**
   * @description 递归渲染树形节点
   * @return default {React.ReactElement[]}
   * @param nodes {TreeNodeType[]}
   * @param level {number}
   */
  const renderTreeNodes = (nodes: TreeNodeType[], level: number = 0): React.ReactElement[] => {
    return nodes.map((node) => {
      const isDirectory = node.type === 'directory';
      const isSelected = isDirectory
        ? getDirectoryFilePaths(treeNodes, node.path).every((p) => selectedPaths.includes(p))
        : selectedPaths.includes(node.path);

      const isIndeterminate =
        isDirectory &&
        !isSelected &&
        getDirectoryFilePaths(treeNodes, node.path).some((p) => selectedPaths.includes(p));

      return (
        <React.Fragment key={node.id}>
          <TreeNode
            node={node}
            level={level}
            isSelected={isSelected}
            isIndeterminate={isIndeterminate}
            onToggle={toggleTreeNode}
            onSelect={selectNode}
          />
          {node.expanded && node.children && renderTreeNodes(node.children, level + 1)}
        </React.Fragment>
      );
    });
  };

  const hasChanges = JSON.stringify(selectedPaths.sort()) !== JSON.stringify(originalPaths.sort());
  const selectedCount = selectedPaths.length;
  const excludedCount = totalRules - selectedCount;
  return (
    <div className="rule-selector-container">
      {/* Header */}
      <header className="rule-selector-header">
        <span className="title">
          <Icon icon="list-tree" size={20} /> 选择同步规则
        </span>
        <button
          className="button button-secondary"
          style={{ marginLeft: 'auto' }}
          onClick={handleClose}
        >
          关闭
        </button>
      </header>
      {/* Toolbar */}
      <div className="rule-selector-toolbar">
        {availableSources.length > 1 && (
          <select
            className="input"
            value={currentSourceId}
            onChange={(e) => switchSource(e.target.value)}
            style={{ width: 200, marginRight: 8 }}
          >
            {availableSources.map((sourceId) => (
              <option key={sourceId} value={sourceId}>
                {sourceId}
              </option>
            ))}
          </select>
        )}
        <input
          className="input"
          placeholder="搜索目录/文件/标签..."
          style={{ width: 220 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="button button-secondary" onClick={selectAll}>
          <Icon icon="check-all" /> 全选
        </button>
        <button className="button button-secondary" onClick={clearAll}>
          <Icon icon="circle-slash" /> 清除
        </button>
        <button className="button button-secondary" onClick={reset} disabled={!hasChanges}>
          <Icon icon="refresh" /> 重置
        </button>
      </div>
      {/* Statistics */}
      <div className="rule-selector-stats">
        <span>
          总规则数: <b>{totalRules}</b>
        </span>
        <span>
          已选: <b>{selectedCount}</b>
        </span>
        <span>
          排除: <b>{excludedCount}</b>
        </span>
      </div>
      {/* Tree */}
      <div className="rule-selector-tree">
        {treeNodes.length === 0 ? (
          <div className="tree-placeholder">
            <p>暂无规则数据</p>
            <p style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
              {currentSourceId
                ? `当前源: ${currentSourceId} - 请先同步规则`
                : '请先添加规则源并同步'}
            </p>
          </div>
        ) : (
          <div>{renderTreeNodes(treeNodes)}</div>
        )}
      </div>
      {/* Footer */}
      <footer className="rule-selector-footer">
        <button className="button button-secondary" onClick={handleClose}>
          取消
        </button>
        <button
          className="button button-primary"
          onClick={handleSave}
          disabled={!hasChanges || saving}
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </footer>
    </div>
  );
};
