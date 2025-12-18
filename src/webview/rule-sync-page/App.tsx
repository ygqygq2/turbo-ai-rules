import React, { useEffect, useMemo } from 'react';
import { Icon } from '../components/Icon';
import { CompactRuleSelector } from '../components/CompactRuleSelector';
import { AdapterCard } from './AdapterCard';
import { useRuleSyncPageStore } from './store';
import { t } from '../utils/i18n';
import { createWebviewRPC } from '../common/messaging';
import '../global.css';
import '../rule-selector/rule-selector.css'; // ✅ 导入TreeNode的样式
import './rule-sync-page.css';

/**
 * 规则同步页主组件（✅ 使用CompactRuleSelector复用规则选择器逻辑）
 */
export const App: React.FC = () => {
  const {
    sources,
    treeNodesBySource,
    selectedPathsBySource,
    expandedNodes, // ✅ 添加展开状态
    adapters,
    selectedAdapters,
    searchTerm,
    syncing,
    setInitialData,
    toggleTreeNode,
    selectNode,
    toggleAllAdapters,
    toggleAdapter,
    setSearchTerm,
    sync,
    cancel,
    isAllAdaptersSelected,
    getSelectedRulesCount,
    getSelectedAdaptersCount,
    getTotalRulesCount,
  } = useRuleSyncPageStore();

  const rpc = useMemo(() => createWebviewRPC(), []);

  // 初始化
  useEffect(() => {
    // 使用 RPC 请求初始数据
    rpc
      .request('getInitialData')
      .then((payload) => {
        setInitialData(payload as Parameters<typeof setInitialData>[0]);
      })
      .catch((err) => console.error('Failed to request initial data', err));

    // 监听选择变更事件（来自其他页面或左侧树视图）
    const offSelectionChanged = rpc.on(
      'selectionChanged',
      (payload: { sourceId: string; selectedPaths: string[]; totalCount: number }) => {
        console.log('Selection changed from extension', {
          sourceId: payload.sourceId,
          selectedCount: payload.selectedPaths.length,
        });
        // ✅ 更新该源的选择状态（复用规则选择器逻辑）
        const store = useRuleSyncPageStore.getState();
        useRuleSyncPageStore.setState({
          selectedPathsBySource: {
            ...store.selectedPathsBySource,
            [payload.sourceId]: payload.selectedPaths, // ✅ 直接使用后端返回的路径数组
          },
        });
      },
    );

    // 监听同步完成事件（非 RPC）
    const offSyncComplete = rpc.on(
      'syncComplete',
      (payload: { success: boolean; error?: string }) => {
        if (payload.success) {
          // 同步成功，可以关闭页面
        } else {
          alert(t('ruleSyncPage.syncFailed') + ': ' + (payload.error || ''));
        }
      },
    );

    return () => {
      offSelectionChanged();
      offSyncComplete();
    };
  }, [rpc, setInitialData]);

  // 处理同步
  const handleSync = async () => {
    try {
      await sync();
    } catch (error) {
      alert(t('ruleSyncPage.syncFailed') + ': ' + (error as Error).message);
    }
  };

  // ✅ 渲染规则树（使用独立的规则选择器组件实例）
  const renderRuleTree = () => {
    if (sources.length === 0) {
      return (
        <div className="tree-placeholder">
          <p>{t('ruleSyncPage.noSources')}</p>
        </div>
      );
    }

    return sources.map((source) => {
      const tree = treeNodesBySource[source.id] || [];
      const selectedPaths = selectedPathsBySource[source.id] || [];
      const isExpanded = expandedNodes.has(source.id);

      return (
        <CompactRuleSelector
          key={source.id}
          sourceName={source.name}
          treeNodes={tree}
          selectedPaths={selectedPaths}
          onToggleNode={(path) => toggleTreeNode(source.id, path)}
          onSelectNode={(path, checked, isDir) => selectNode(source.id, path, checked, isDir)}
          isExpanded={isExpanded}
          onToggleSource={() => toggleTreeNode(source.id, '')}
        />
      );
    });
  };

  const selectedRulesCount = getSelectedRulesCount();
  const selectedAdaptersCount = getSelectedAdaptersCount();
  const totalRulesCount = getTotalRulesCount();
  const canSync = selectedRulesCount > 0 && selectedAdaptersCount > 0;

  return (
    <div className="rule-sync-page">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <Icon icon="sync" size={18} />
          <h1 className="header-title">{t('ruleSyncPage.title')}</h1>
        </div>
        <div className="header-stats">
          <span>
            <Icon icon="file" /> {t('ruleSyncPage.totalRules')}: <strong>{totalRulesCount}</strong>
          </span>
          <span>
            <Icon icon="check" /> {t('ruleSyncPage.selectedRules')}:{' '}
            <strong>{selectedRulesCount}</strong>
          </span>
          <span>
            <Icon icon="extensions" /> {t('ruleSyncPage.targetAdapters')}:{' '}
            <strong>{selectedAdaptersCount}</strong>
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-content">
        {/* 左侧面板 - 规则树 */}
        <div className="left-panel">
          <div className="panel-header">
            <input
              type="text"
              className="search-input"
              placeholder={t('ruleSyncPage.searchRules')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="rules-tree-container">{renderRuleTree()}</div>
        </div>

        {/* 右侧面板 - 适配器列表 */}
        <div className="right-panel">
          <div className="panel-header">
            <span className="panel-title">
              <Icon icon="extensions" />
              {t('ruleSyncPage.selectAdapters')}
            </span>
            <div className="panel-actions">
              <button className="btn btn-secondary btn-small" onClick={toggleAllAdapters}>
                {isAllAdaptersSelected() ? t('common.deselectAll') : t('common.selectAll')}
              </button>
            </div>
          </div>
          <div className="adapters-container">
            {adapters.map((adapter) => (
              <AdapterCard
                key={adapter.id}
                adapter={adapter}
                isSelected={selectedAdapters.has(adapter.id)}
                selectedRulesCount={selectedRulesCount}
                onToggle={() => toggleAdapter(adapter.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-info">
          💡 {t('ruleSyncPage.footerInfo', selectedRulesCount, selectedAdaptersCount)}
        </div>
        <div className="footer-actions">
          <button className="btn btn-secondary" onClick={cancel}>
            {t('common.cancel')}
          </button>
          <button className="btn btn-primary" onClick={handleSync} disabled={!canSync || syncing}>
            <Icon icon="sync" />
            {syncing ? t('ruleSyncPage.syncing') : t('ruleSyncPage.sync')}
          </button>
        </div>
      </footer>
    </div>
  );
};
