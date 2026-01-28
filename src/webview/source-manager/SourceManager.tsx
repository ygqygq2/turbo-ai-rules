import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { t } from '../utils/i18n';
import { vscodeApi } from '../utils/vscode-api';

/**
 * 同步状态类型
 */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'failed';

/**
 * 规则源数据类型
 */
export interface Source {
  id: string;
  name: string;
  gitUrl: string;
  branch: string;
  enabled: boolean;
  ruleCount: number;
  lastSync: string | null;
  authType: 'none' | 'token' | 'ssh';
  subPath?: string;
  syncStatus?: SyncStatus;
}

/**
 * Source Manager 主组件 - 卡片网格布局
 */
export const SourceManager: React.FC = () => {
  // 状态管理
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 初始化数据
  useEffect(() => {
    // 监听来自扩展的消息
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'init':
          setSources(message.payload.sources || []);
          setIsLoading(false);
          break;

        case 'syncCompleted':
          // 更新规则源的规则数量和同步状态
          setSources((prevSources) =>
            prevSources.map((source) =>
              source.id === message.payload.sourceId
                ? {
                    ...source,
                    ruleCount: message.payload.ruleCount,
                    syncStatus: message.payload.success ? 'success' : 'failed',
                    lastSync: new Date().toISOString(),
                  }
                : source,
            ),
          );
          // 3秒后重置同步状态为 idle
          setTimeout(() => {
            setSources((prevSources) =>
              prevSources.map((source) =>
                source.id === message.payload.sourceId ? { ...source, syncStatus: 'idle' } : source,
              ),
            );
          }, 3000);
          break;

        case 'operationResult':
          if (message.payload.success) {
            // 操作成功（数据已在操作中更新，无需额外处理）
          } else {
            setError(message.payload.message);
            setTimeout(() => setError(null), 5000);
          }
          break;

        case 'updateSources':
          // 更新规则源列表
          setSources(message.payload.sources || []);
          setIsLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);

    // 请求初始化数据
    vscodeApi.postMessage('ready');

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  /**
   * @description 处理添加规则源
   * @return default {void}
   */
  const handleAddSource = () => {
    vscodeApi.postMessage('addSource');
  };

  /**
   * @description 处理编辑规则源
   * @return default {void}
   * @param sourceId {string}
   */
  const handleEditSource = (sourceId: string) => {
    vscodeApi.postMessage('editSource', { sourceId });
  };

  /**
   * @description 处理删除规则源
   * @return default {void}
   * @param source {Source}
   */
  const handleDeleteSource = (source: Source) => {
    vscodeApi.postMessage('deleteSource', { sourceId: source.id });
  };

  /**
   * @description 处理启用/禁用规则源
   * @return default {void}
   * @param source {Source}
   */
  const handleToggleSource = (source: Source) => {
    vscodeApi.postMessage('toggleSource', {
      sourceId: source.id,
      enabled: !source.enabled,
    });
    // 立即更新本地状态
    setSources((prevSources) =>
      prevSources.map((s) => (s.id === source.id ? { ...s, enabled: !s.enabled } : s)),
    );
  };

  /**
   * @description 处理立即同步
   * @return default {void}
   * @param sourceId {string}
   */
  const handleSyncSource = (sourceId: string) => {
    // 设置该源为 syncing 状态
    setSources((prevSources) =>
      prevSources.map((source) =>
        source.id === sourceId ? { ...source, syncStatus: 'syncing' } : source,
      ),
    );
    vscodeApi.postMessage('syncSource', { sourceId });
  };

  /**
   * @description 格式化最后同步时间
   * @return default {string}
   * @param lastSync {string | null}
   */
  const formatLastSync = (lastSync: string | null): string => {
    if (!lastSync) {
      return t('sourceManager.neverSynced');
    }
    const date = new Date(lastSync);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('sourceManager.justNow');
    if (minutes < 60) return t('sourceManager.minutesAgo', { count: minutes });
    if (hours < 24) return t('sourceManager.hoursAgo', { count: hours });
    return t('sourceManager.daysAgo', { count: days });
  };

  /**
   * @description 获取同步状态文本和样式
   * @return default {{ text: string, className: string, icon: string }}
   * @param syncStatus {SyncStatus | undefined}
   * @param lastSync {string | null}
   */
  const getSyncStatusDisplay = (
    syncStatus: SyncStatus | undefined,
    lastSync: string | null,
  ): { text: string; className: string; icon: string } => {
    switch (syncStatus) {
      case 'syncing':
        return {
          text: t('sourceManager.syncStatus.syncing'),
          className: 'sync-status syncing',
          icon: 'codicon-sync codicon-modifier-spin',
        };
      case 'success':
        return {
          text: t('sourceManager.syncStatus.success'),
          className: 'sync-status success',
          icon: 'codicon-check',
        };
      case 'failed':
        return {
          text: t('sourceManager.syncStatus.failed'),
          className: 'sync-status failed',
          icon: 'codicon-error',
        };
      default:
        if (!lastSync) {
          return {
            text: t('sourceManager.syncStatus.never'),
            className: 'sync-status never',
            icon: 'codicon-circle-outline',
          };
        }
        return {
          text: formatLastSync(lastSync),
          className: 'sync-status idle',
          icon: 'codicon-history',
        };
    }
  };

  return (
    <div className="source-manager-container">
      {/* 页面标题 */}
      <div className="page-header">
        <div className="header-content">
          <h1>{t('sourceManager.title')}</h1>
          <p className="subtitle">{t('sourceManager.subtitle')}</p>
        </div>
        <Button type="primary" icon="add" onClick={handleAddSource}>
          {t('form.button.addSource')}
        </Button>
      </div>

      {/* 消息显示 */}
      {error && <div className="error-message">{error}</div>}

      {/* 主内容区 */}
      {isLoading ? (
        <div className="loading">
          <i className="codicon codicon-sync codicon-modifier-spin"></i>
          <span>{t('loading')}</span>
        </div>
      ) : sources.length === 0 ? (
        <div className="empty-state">
          <i className="codicon codicon-archive icon"></i>
          <div className="message">{t('sourceManager.emptyState')}</div>
          <Button type="primary" icon="add" onClick={handleAddSource}>
            {t('form.button.addSource')}
          </Button>
        </div>
      ) : (
        <div className="source-cards-grid">
          {sources.map((source) => (
            <div
              key={source.id}
              className={`source-card ${source.enabled ? 'enabled' : 'disabled'}`}
            >
              {/* 卡片头部 */}
              <div className="card-header">
                <div className="source-title">
                  <i
                    className={`codicon ${
                      source.enabled ? 'codicon-pass-filled' : 'codicon-circle-large-outline'
                    } status-icon`}
                  ></i>
                  <h3>{source.name}</h3>
                </div>
                <div className="header-actions">
                  {/* 同步状态徽章 */}
                  {(() => {
                    const statusDisplay = getSyncStatusDisplay(source.syncStatus, source.lastSync);
                    return (
                      <span className={statusDisplay.className}>
                        <i className={`codicon ${statusDisplay.icon}`}></i>
                        <span>{statusDisplay.text}</span>
                      </span>
                    );
                  })()}
                  <Button
                    type="secondary"
                    icon="edit"
                    onClick={() => handleEditSource(source.id)}
                    title={t('form.button.edit')}
                  />
                </div>
              </div>

              {/* 卡片内容 */}
              <div className="card-body">
                <div className="info-row">
                  <span className="label">{t('form.label.gitUrl')}:</span>
                  <span className="value truncate" title={source.gitUrl}>
                    {source.gitUrl}
                  </span>
                </div>
                <div className="info-row">
                  <span className="label">{t('form.label.branch')}:</span>
                  <span className="value">{source.branch}</span>
                </div>
                {source.subPath && (
                  <div className="info-row">
                    <span className="label">{t('form.label.subPath')}:</span>
                    <span className="value truncate" title={source.subPath}>
                      {source.subPath}
                    </span>
                  </div>
                )}
                <div className="info-row">
                  <span className="label">{t('sourceManager.ruleCount')}:</span>
                  <span className="value highlight">{source.ruleCount}</span>
                </div>
              </div>

              {/* 卡片操作按钮 */}
              <div className="card-actions">
                <Button
                  type={source.enabled ? 'secondary' : 'primary'}
                  icon={source.enabled ? 'debug-pause' : 'debug-start'}
                  onClick={() => handleToggleSource(source)}
                  title={source.enabled ? t('form.button.disable') : t('form.button.enable')}
                >
                  {source.enabled ? t('form.button.disable') : t('form.button.enable')}
                </Button>
                <Button
                  type="secondary"
                  icon="sync"
                  onClick={() => handleSyncSource(source.id)}
                  title={t('form.button.sync')}
                  disabled={!source.enabled || source.syncStatus === 'syncing'}
                >
                  {source.syncStatus === 'syncing'
                    ? t('sourceManager.syncStatus.syncing')
                    : t('form.button.sync')}
                </Button>
                <Button
                  type="danger"
                  icon="trash"
                  onClick={() => handleDeleteSource(source)}
                  title={t('form.button.delete')}
                >
                  {t('form.button.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
