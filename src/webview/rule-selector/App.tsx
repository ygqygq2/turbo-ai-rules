import React, { useEffect } from 'react';
import { Icon } from '../components/Icon';
import { renderTreeNodes } from '../components/tree';
import { useRuleSelectorStore } from './store';
import { t } from '../utils/i18n';
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
      alert(payload?.message || t('ruleSelector.operationFailed'));
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
      alert((error as Error).message || t('ruleSelector.saveFailed'));
    }
  };

  // 关闭
  const handleClose = () => {
    rpc.notify('close');
  };

  // ✅ 使用提取的通用渲染函数

  const hasChanges = JSON.stringify(selectedPaths.sort()) !== JSON.stringify(originalPaths.sort());
  const selectedCount = selectedPaths.length;
  const excludedCount = totalRules - selectedCount;
  return (
    <div className="rule-selector-container">
      {/* Header */}
      <header className="rule-selector-header">
        <span className="title">
          <Icon icon="list-tree" size={20} /> {t('ruleSelector.title')}
        </span>
        <button
          className="button button-secondary"
          style={{ marginLeft: 'auto' }}
          onClick={handleClose}
        >
          {t('ruleSelector.cancel')}
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
          placeholder={t('ruleSelector.filterByTag')}
          style={{ width: 220 }}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          className="button button-secondary"
          onClick={() => {
            if (selectedCount === totalRules) {
              clearAll();
            } else {
              selectAll();
            }
          }}
        >
          {selectedCount === totalRules ? (
            <>
              <Icon icon="circle-slash" /> {t('ruleSelector.deselectAll')}
            </>
          ) : (
            <>
              <Icon icon="check-all" /> {t('ruleSelector.selectAll')}
            </>
          )}
        </button>
      </div>
      {/* Statistics */}
      <div className="rule-selector-stats">
        <span>
          {t('statistics.totalRules')}: <b>{totalRules}</b>
        </span>
        <span>{t('ruleSelector.selected', selectedCount)}</span>
        <span>
          {t('search.deselectAll')}: <b>{excludedCount}</b>
        </span>
      </div>
      {/* Tree */}
      <div className="rule-selector-tree">
        {treeNodes.length === 0 ? (
          <div className="tree-placeholder">
            <p>{t('ruleSelector.noSourcesDescription')}</p>
            <p style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
              {currentSourceId
                ? `${t('common.status')}: ${currentSourceId} - ${t(
                    'No rules available. Please sync rules first.',
                  )}`
                : t('ruleSelector.noSourcesDescription')}
            </p>
          </div>
        ) : (
          <div>
            {renderTreeNodes({
              nodes: treeNodes,
              fullTree: treeNodes,
              selectedPaths,
              onToggle: toggleTreeNode,
              onSelect: selectNode,
            })}
          </div>
        )}
      </div>
      {/* Footer */}
      <footer className="rule-selector-footer">
        <button className="button button-secondary" onClick={handleClose}>
          {t('form.cancel')}
        </button>
        <button
          className="button button-primary"
          onClick={handleSave}
          disabled={!hasChanges || saving}
          title={t('ruleSelector.saveSelection')}
        >
          {saving ? t('form.submitting') : t('ruleSelector.saveSelection')}
        </button>
      </footer>
    </div>
  );
};
