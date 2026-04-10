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
    selectedPathsBySource,
    expandedNodes, // ✅ 添加展开状态
    adapters,
    selectedAdapters,
    searchTerm,
    kindFilter,
    syncing,
    setInitialData,
    toggleTreeNode,
    selectNode,
    updateSelectionFromExtension, // ✅ 新增：从扩展更新选择
    toggleAllAdapters,
    toggleAdapter,
    setSearchTerm,
    setKindFilter,
    sync,
    cancel,
    isAllAdaptersSelected,
    getSelectedAssetCount,
    getSelectedAdaptersCount,
    getTotalAssetCount,
    getAvailableKinds,
    getFilteredTreeNodes,
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
        console.log('✅ [RuleSyncPage] Selection changed from extension', {
          sourceId: payload.sourceId,
          selectedCount: payload.selectedPaths.length,
          paths: payload.selectedPaths.slice(0, 3), // 显示前3个路径
        });
        // ✅ 使用 store action 更新状态（触发 React 重新渲染）
        updateSelectionFromExtension(payload.sourceId, payload.selectedPaths);
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
  }, [rpc, setInitialData, updateSelectionFromExtension]);

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
      const tree = getFilteredTreeNodes(source.id);
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

  const availableKinds = getAvailableKinds();

  const selectedAssetCount = getSelectedAssetCount();
  const selectedAdaptersCount = getSelectedAdaptersCount();
  const totalAssetCount = getTotalAssetCount();
  // 只要选择了适配器就可以同步，0条资产表示清空（保留用户自定义规则）
  const canSync = selectedAdaptersCount > 0;

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
            <Icon icon="file" /> {t('ruleSyncPage.totalAssets')}: <strong>{totalAssetCount}</strong>
          </span>
          <span>
            <Icon icon="check" /> {t('ruleSyncPage.selectedAssets')}:{' '}
            <strong>{selectedAssetCount}</strong>
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
              placeholder={t('ruleSyncPage.searchAssets')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {/* 资产类型过滤 tabs */}
            {availableKinds.length > 0 && (
              <div className="kind-filter-tabs">
                <button
                  className={`kind-filter-tab ${kindFilter === null ? 'active' : ''}`}
                  onClick={() => setKindFilter(null)}
                >
                  {t('ruleSyncPage.allKinds') ?? 'All'}
                </button>
                {availableKinds.map((k) => (
                  <button
                    key={k}
                    className={`kind-filter-tab kind-filter-tab-${k} ${kindFilter === k ? 'active' : ''}`}
                    onClick={() => setKindFilter(kindFilter === k ? null : k)}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}
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
                selectedAssetCount={selectedAssetCount}
                onToggle={() => toggleAdapter(adapter.id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-info">
          {selectedAssetCount === 0 ? (
            <>💡 {t('ruleSyncPage.clearAssetsHint', selectedAdaptersCount)}</>
          ) : (
            <>💡 {t('ruleSyncPage.footerInfo', selectedAssetCount, selectedAdaptersCount)}</>
          )}
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
