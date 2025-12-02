import React, { useEffect, useMemo } from 'react';
import { Icon } from '../components/Icon';
import { TreeNode } from './TreeNode';
import { AdapterCard } from './AdapterCard';
import { useRuleSyncPageStore } from './store';
import {
  getDirectoryFilePaths,
  getAllFilePaths,
  type TreeNode as TreeNodeType,
} from '../rule-selector/tree-utils';
import { t } from '../utils/i18n';
import { createWebviewRPC } from '../common/messaging';
import '../global.css';
import './rule-sync-page.css';

// 定义节点接口，用于类型安全
interface DisplayNode {
  id: string;
  path: string;
  name: string;
  type: 'file' | 'directory';
  expanded?: boolean;
  children?: DisplayNode[];
}

/**
 * 规则同步页主组件
 */
export const App: React.FC = () => {
  const {
    sources,
    treeNodesBySource,
    selectedPaths,
    adapters,
    selectedAdapters,
    searchTerm,
    syncing,
    setInitialData,
    toggleTreeNode,
    selectNode,
    toggleAllRules,
    toggleAllAdapters,
    toggleAdapter,
    setSearchTerm,
    sync,
    cancel,
    isAllRulesSelected,
    isAllAdaptersSelected,
    getSelectedRulesCount,
    getSelectedAdaptersCount,
    getTotalRulesCount,
  } = useRuleSyncPageStore();

  const rpc = useMemo(() => createWebviewRPC(), []);

  // 初始化
  useEffect(() => {
    rpc
      .request('getInitialData')
      .catch((err) => console.error('Failed to request initial data', err));

    const offInit = rpc.on('init', (payload: Parameters<typeof setInitialData>[0]) => {
      setInitialData(payload);
    });

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
      offInit();
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

  // 渲染规则树
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
      const allPaths = getAllFilePaths(tree);
      const selectedCount = allPaths.filter((p) => selectedPaths.has(`${source.id}:${p}`)).length;

      return (
        <div key={source.id} className="source-section">
          {/* 源节点 */}
          <div className="tree-node source-node">
            <div className="tree-node-item">
              <span className="tree-node-chevron" onClick={() => toggleTreeNode(source.id, '')}>
                <Icon icon="chevron-down" />
              </span>
              <input
                type="checkbox"
                className="tree-node-checkbox"
                checked={selectedCount === allPaths.length && allPaths.length > 0}
                ref={(input) => {
                  if (input) {
                    input.indeterminate = selectedCount > 0 && selectedCount < allPaths.length;
                  }
                }}
                onChange={(e) => {
                  // 选中/取消源下所有文件
                  allPaths.forEach((path) => {
                    selectNode(source.id, path, e.target.checked, false);
                  });
                }}
              />
              <span className="tree-node-icon">
                <Icon icon="archive" />
              </span>
              <span className="tree-node-name">{source.name}</span>
              <span className="tree-node-badge">
                {selectedCount}/{allPaths.length}
              </span>
            </div>
          </div>
          {/* 子节点 */}
          {renderTreeNodes(source.id, tree as unknown as DisplayNode[], 1)}
        </div>
      );
    });
  };

  // 递归渲染树节点
  const renderTreeNodes = (
    sourceId: string,
    _nodes: DisplayNode[],
    level: number,
  ): React.ReactElement[] => {
    const tree = treeNodesBySource[sourceId] || [];

    return (tree as unknown as DisplayNode[])
      .filter((node) => {
        // 搜索过滤
        if (searchTerm) {
          return node.name.toLowerCase().includes(searchTerm.toLowerCase());
        }
        return true;
      })
      .map((node) => {
        const isDirectory = node.type === 'directory';
        const fullPath = `${sourceId}:${node.path}`;

        let isSelected = false;
        let isIndeterminate = false;

        if (isDirectory) {
          const dirPaths = getDirectoryFilePaths(
            tree as unknown as Parameters<typeof getDirectoryFilePaths>[0],
            node.path,
          );
          const selectedDirPaths = dirPaths.filter((p) => selectedPaths.has(`${sourceId}:${p}`));
          isSelected = selectedDirPaths.length === dirPaths.length && dirPaths.length > 0;
          isIndeterminate =
            selectedDirPaths.length > 0 && selectedDirPaths.length < dirPaths.length;
        } else {
          isSelected = selectedPaths.has(fullPath);
        }

        return (
          <React.Fragment key={node.id}>
            <TreeNode
              node={node as TreeNodeType}
              level={level}
              isSelected={isSelected}
              isIndeterminate={isIndeterminate}
              onToggle={(path: string) => toggleTreeNode(sourceId, path)}
              onSelect={(path: string, checked: boolean, isDir: boolean) =>
                selectNode(sourceId, path, checked, isDir)
              }
            />
            {node.expanded && node.children && renderTreeNodes(sourceId, node.children, level + 1)}
          </React.Fragment>
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
            <div className="panel-actions">
              <button className="btn btn-secondary btn-small" onClick={toggleAllRules}>
                {isAllRulesSelected() ? t('common.deselectAll') : t('common.selectAll')}
              </button>
            </div>
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
