import React, { useEffect } from 'react';
import { Icon } from '../components/Icon';
import { TreeNode } from './TreeNode';
import { useRuleSelectorStore } from './store';
import { getDirectoryFilePaths } from './tree-utils';
import type { TreeNode as TreeNodeType } from './tree-utils';
import '../global.css';
import './rule-selector.css';

// 新的 RPC 封装（单例）
import { createWebviewRPC } from '../common/messaging';

interface RuleSelection {
  mode: 'include' | 'exclude';
  paths?: string[];
  excludePaths?: string[];
}

interface SourceInfo {
  id: string;
  name: string;
  totalRules?: number; // 后端传递的真实规则数
}

interface InitialData {
  workspacePath: string;
  selections: { [sourceId: string]: RuleSelection };
  fileTreeBySource: { [sourceId: string]: unknown[] };
  sourceList?: SourceInfo[]; // 源信息列表（包含 id、name 和真实规则数）
  currentSourceId?: string; // 当前选择的源 ID
}

interface SelectionChangeMessage {
  type: 'selectionChanged';
  sourceId: string;
  selectedPaths: string[];
  totalCount: number;
  timestamp: number;
  fromPersistence?: boolean;
}

/**
 * RuleSelector App 入口
 * 使用 Zustand 管理状态，负责渲染规则树、选择、统计、保存等 UI
 */
export const App: React.FC = () => {
  // 从 Zustand store 获取状态和 actions
  const {
    currentSourceId,
    availableSources,
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

  // 获取 RPC 实例（延迟到使用时获取，确保只调用一次 acquireVsCodeApi）
  const rpc = React.useMemo(() => createWebviewRPC(), []);

  // 监听来自扩展的消息
  useEffect(() => {
    // 请求初始数据（RPC）
    rpc
      .request('getInitialData')
      .catch((err) => console.error('Failed to request initial data', err));

    // 监听 initialData 推送
    const offInitial = rpc.on('initialData', (payload: InitialData) => {
      setInitialData(payload);
    });

    // 监听 MessageChannel 初始化消息 (实际上是 postMessage,非真正的 MessageChannel)
    const offInitChannel = rpc.on('initSelectionChannel', (payload: { sourceId: string }) => {
      console.log('Selection channel initialized for source', { sourceId: payload.sourceId });
    });

    // 监听选择变更消息 (来自左侧树视图)
    const offSelectionChanged = rpc.on('selectionChanged', (payload: SelectionChangeMessage) => {
      // 不使用闭包中的 currentSourceId，而是从 store 中获取最新值
      const state = useRuleSelectorStore.getState();

      if (payload.sourceId === state.currentSourceId && !payload.fromPersistence) {
        console.log('Selection changed from extension (left tree)', {
          sourceId: payload.sourceId,
          selectedCount: payload.selectedPaths.length,
          totalCount: payload.totalCount,
        });

        // 直接更新 Zustand store
        useRuleSelectorStore.setState({
          selectedPaths: payload.selectedPaths,
          totalRules: payload.totalCount,
        });
      }
    });

    // 保存成功事件（如果扩展侧未来推送）
    const offSave = rpc.on('saveSuccess', () => {
      updateAfterSave();
    });

    const offError = rpc.on('error', (payload: { message?: string }) => {
      setSaving(false);
      alert(payload?.message || '操作失败');
    });

    return () => {
      offInitial();
      offInitChannel();
      offSelectionChanged();
      offSave();
      offError();
    };
  }, [setInitialData, updateAfterSave, setSaving]);

  // 保存（确认持久化）
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await rpc.request<{ message: string }>('saveRuleSelection', {
        sourceId: currentSourceId,
        selection: { paths: selectedPaths },
        totalCount: totalRules,
      });
      updateAfterSave();
      // 显示成功提示
      console.log('已确认并持久化:', res.message);
    } catch (error) {
      setSaving(false);
      alert((error as Error).message || '保存失败');
    }
  };

  // 关闭
  const handleClose = () => {
    rpc.notify('close');
  };

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
        {availableSources.length > 0 && (
          <select
            className="input"
            value={currentSourceId}
            onChange={(e) => switchSource(e.target.value)}
            style={{ width: 200, marginRight: 8 }}
          >
            {availableSources.map((source) => (
              <option key={source.id} value={source.id}>
                {source.name}
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
          title="确认当前选择并持久化（已实时同步到左侧树视图）"
        >
          {saving ? '确认中...' : '确认'}
        </button>
      </footer>
    </div>
  );
};
