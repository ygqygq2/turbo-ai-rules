import React, { useState, useEffect } from 'react';
import { t } from '../utils/i18n';

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
  tags?: string[];
}

/**
 * Source Manager 主组件 - 卡片网格布局
 */
export const SourceManager: React.FC = () => {
  // 状态管理
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
                ? { ...source, ruleCount: message.payload.ruleCount }
                : source,
            ),
          );
          setSuccessMessage(message.payload.message);
          setTimeout(() => setSuccessMessage(null), 3000);
          break;

        case 'operationResult':
          if (message.payload.success) {
            // 操作成功，刷新数据
            window.vscode?.postMessage({ type: 'ready' });
            setSuccessMessage(message.payload.message);
            setTimeout(() => setSuccessMessage(null), 3000);
          } else {
            setError(message.payload.message);
            setTimeout(() => setError(null), 5000);
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    // 请求初始化数据
    window.vscode?.postMessage({ type: 'ready' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  /**
   * @description 处理添加规则源
   * @return default {void}
   */
  const handleAddSource = () => {
    window.vscode?.postMessage({ type: 'addSource' });
  };

  /**
   * @description 处理编辑规则源
   * @return default {void}
   * @param sourceId {string}
   */
  const handleEditSource = (sourceId: string) => {
    window.vscode?.postMessage({ type: 'editSource', payload: { sourceId } });
  };

  /**
   * @description 处理删除规则源
   * @return default {void}
   * @param source {Source}
   */
  const handleDeleteSource = (source: Source) => {
    if (confirm(t('confirm.deleteSource', { name: source.name }))) {
      window.vscode?.postMessage({
        type: 'deleteSource',
        payload: { sourceId: source.id },
      });
    }
  };

  /**
   * @description 处理启用/禁用规则源
   * @return default {void}
   * @param source {Source}
   */
  const handleToggleSource = (source: Source) => {
    window.vscode?.postMessage({
      type: 'toggleSource',
      payload: {
        sourceId: source.id,
        enabled: !source.enabled,
      },
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
    window.vscode?.postMessage({
      type: 'syncSource',
      payload: { sourceId },
    });
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

  return (
    <div className="source-manager-container">
      {/* 页面标题 */}
      <div className="page-header">
        <div className="header-content">
          <h1>{t('sourceManager.title')}</h1>
          <p className="subtitle">{t('sourceManager.subtitle')}</p>
        </div>
        <button className="button primary" onClick={handleAddSource}>
          <i className="codicon codicon-add"></i>
          {t('form.button.addSource')}
        </button>
      </div>

      {/* 消息显示 */}
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

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
          <button className="button primary" onClick={handleAddSource}>
            <i className="codicon codicon-add"></i>
            {t('form.button.addSource')}
          </button>
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
                <button
                  className="icon-button"
                  onClick={() => handleEditSource(source.id)}
                  title={t('form.button.edit')}
                >
                  <i className="codicon codicon-edit"></i>
                </button>
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
                <div className="info-row">
                  <span className="label">{t('sourceManager.lastSync')}:</span>
                  <span className="value">{formatLastSync(source.lastSync)}</span>
                </div>
              </div>

              {/* 卡片操作按钮 */}
              <div className="card-actions">
                <button
                  className={`button ${source.enabled ? 'secondary' : 'primary'}`}
                  onClick={() => handleToggleSource(source)}
                  title={source.enabled ? t('form.button.disable') : t('form.button.enable')}
                >
                  <i
                    className={`codicon ${
                      source.enabled ? 'codicon-debug-pause' : 'codicon-debug-start'
                    }`}
                  ></i>
                  {source.enabled ? t('form.button.disable') : t('form.button.enable')}
                </button>
                <button
                  className="button secondary"
                  onClick={() => handleSyncSource(source.id)}
                  title={t('form.button.sync')}
                  disabled={!source.enabled}
                >
                  <i className="codicon codicon-sync"></i>
                  {t('form.button.sync')}
                </button>
                <button
                  className="button danger"
                  onClick={() => handleDeleteSource(source)}
                  title={t('form.button.delete')}
                >
                  <i className="codicon codicon-trash"></i>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
