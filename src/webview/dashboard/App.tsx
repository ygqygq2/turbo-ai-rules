import React, { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Section } from '../components/Section';
import { EmptyState } from '../components/EmptyState';
import { Icon } from '../components/Icon';
import { t } from '../utils/i18n';
import { vscodeApi } from '../utils/vscode-api';
import '../global.css';
import './dashboard.css';

/**
 * Dashboard 状态数据接口
 */
interface DashboardState {
  /** 规则源统计 */
  sources: {
    enabled: number;
    total: number;
    totalRules: number;
    lastSync: string | null;
    /** 规则源列表（简要信息） */
    list: Array<{
      id: string;
      name: string;
      enabled: boolean;
      ruleCount: number;
    }>;
  };
  /** 适配器状态列表 */
  adapters: Array<{
    id: string;
    name: string;
    type: 'preset' | 'custom'; // 适配器类型
    enabled: boolean;
    ruleCount: number;
    outputPath: string;
    lastGenerated: string | null;
  }>;
}

export const App: React.FC = () => {
  const [stats, setStats] = useState<DashboardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // VSCode 最佳实践: 前端加载完成后通知后端，请求初始状态
    vscodeApi.postMessage('ready');

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'updateStats':
          setStats(message.payload);
          setLoading(false);
          break;
        case 'error':
          setError(message.payload?.message || 'Unknown error');
          setLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 快捷操作处理函数
  const handleSyncAll = () => vscodeApi.postMessage('syncAll');
  const handleAddSource = () => vscodeApi.postMessage('addSource');
  const handleManageSources = () => vscodeApi.postMessage('manageSources');
  const handleSearchRules = () => vscodeApi.postMessage('searchRules');
  const handleManageAdapters = () => vscodeApi.postMessage('manageAdapters');
  const handleRegenerateAll = () => vscodeApi.postMessage('regenerateAll');
  const handleOpenRuleSyncPage = () => vscodeApi.postMessage('openRuleSyncPage');
  const handleOpenStatistics = () => vscodeApi.postMessage('openStatistics');
  const handleOpenAdvancedSearch = () => vscodeApi.postMessage('openAdvancedSearch');
  const handleOpenSettings = () => vscodeApi.postMessage('openSettings');
  const handleOpenDocs = () => vscodeApi.postMessage('openDocs');
  const handleOpenWelcome = () => vscodeApi.postMessage('openWelcome');
  const handleOpenRuleFormat = () => vscodeApi.postMessage('openRuleFormat');
  const handleOpenExamples = () => vscodeApi.postMessage('openExamples');

  // 加载状态
  if (loading) {
    return <EmptyState icon={<span>⏳</span>}>{t('common.loading')}</EmptyState>;
  }

  // 错误状态
  if (error) {
    return <EmptyState icon={<span>❌</span>}>{error}</EmptyState>;
  }

  // 无数据状态
  if (!stats) {
    return <EmptyState icon={<span>📭</span>}>{t('dashboard.noData')}</EmptyState>;
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <header className="dashboard-header">
        <h1>{t('dashboard.title')}</h1>
        <div className="header-actions">
          <Button type="secondary" icon="gear" onClick={handleOpenSettings}>
            {t('common.settings')}
          </Button>
          <Button type="secondary" icon="question" onClick={handleOpenDocs}>
            {t('common.help')}
          </Button>
        </div>
      </header>

      {/* 规则源管理 */}
      <Section title={t('dashboard.sources.title')}>
        <Card className="sources-card">
          {/* 规则源卡片网格 */}
          {stats.sources.list.length > 0 && (
            <div className="sources-grid">
              {stats.sources.list.map((source) => (
                <div
                  key={source.id}
                  className={`source-chip ${source.enabled ? 'enabled' : 'disabled'}`}
                >
                  <Icon
                    icon={source.enabled ? 'check' : 'circle-slash'}
                    size={14}
                    className="source-chip-icon"
                  />
                  <span className="source-chip-name">{source.name}</span>
                  <span className="source-chip-count">{source.ruleCount}</span>
                </div>
              ))}
            </div>
          )}

          {/* 统计信息行 */}
          <div className="sources-summary">
            <span className="summary-item">
              <Icon icon="clock" size={14} />
              {t('dashboard.sources.lastSync', {
                time: stats.sources.lastSync || t('common.never'),
              })}
            </span>
          </div>

          <div className="button-group">
            <Button type="primary" icon="sync" onClick={handleSyncAll}>
              {t('dashboard.sources.syncAll')}
            </Button>
            <Button type="secondary" icon="add" onClick={handleAddSource}>
              {t('dashboard.sources.addSource')}
            </Button>
            <Button type="secondary" icon="settings-gear" onClick={handleManageSources}>
              {t('dashboard.sources.manageSources')}
            </Button>
          </div>
        </Card>
      </Section>

      {/* 适配器状态 */}
      <Section title={t('dashboard.adapters.title')}>
        <Card className="adapters-card">
          {stats.adapters.length === 0 ? (
            <EmptyState icon={<span>📦</span>}>
              {t('dashboard.adapters.noAdaptersConfigured')}
            </EmptyState>
          ) : (
            <div className="adapters-grid">
              {stats.adapters.map((adapter) => (
                <div
                  key={adapter.id}
                  className={`adapter-chip ${adapter.enabled ? 'enabled' : 'disabled'}`}
                >
                  <Icon
                    icon={adapter.enabled ? 'pass' : 'circle-slash'}
                    size={14}
                    className="adapter-chip-icon"
                  />
                  <span className="adapter-chip-name">{adapter.name}</span>
                  <span className="adapter-chip-type">
                    {adapter.type === 'preset'
                      ? t('dashboard.adapters.preset')
                      : t('dashboard.adapters.custom')}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="button-group">
            <Button type="primary" icon="sync" onClick={handleOpenRuleSyncPage}>
              {t('dashboard.adapters.fineSync')}
            </Button>
            <Button type="secondary" icon="settings-gear" onClick={handleManageAdapters}>
              {t('dashboard.adapters.manageAdapters')}
            </Button>
            <Button type="secondary" icon="file-code" onClick={handleRegenerateAll}>
              {t('dashboard.adapters.regenerateAll')}
            </Button>
          </div>
        </Card>
      </Section>

      {/* 快速操作 */}
      <Section title={t('dashboard.quickActions.title')}>
        <Card className="quick-actions-card">
          <div className="quick-actions-grid">
            <button className="quick-action-button" onClick={handleOpenWelcome}>
              <Icon icon="book" size={24} />
              <span>{t('dashboard.quickActions.quickStart')}</span>
            </button>
            <button className="quick-action-button" onClick={handleOpenStatistics}>
              <Icon icon="graph" size={24} />
              <span>{t('dashboard.quickActions.statistics')}</span>
            </button>
            <button className="quick-action-button" onClick={handleOpenAdvancedSearch}>
              <Icon icon="search" size={24} />
              <span>{t('dashboard.quickActions.advancedSearch')}</span>
            </button>
            <button className="quick-action-button" onClick={handleOpenRuleSyncPage}>
              <Icon icon="sync" size={24} />
              <span>{t('dashboard.quickActions.ruleSyncPage')}</span>
            </button>
            <button className="quick-action-button" onClick={handleSearchRules}>
              <Icon icon="list-tree" size={24} />
              <span>{t('dashboard.quickActions.ruleTree')}</span>
            </button>
          </div>
        </Card>
      </Section>

      {/* 快速入门 */}
      <Section title={t('dashboard.gettingStarted.title')}>
        <Card className="getting-started-card">
          <div className="getting-started-content">
            <p className="getting-started-intro">{t('dashboard.gettingStarted.newUser')}</p>
            <ul className="quick-start-links">
              <li>
                <a href="#" onClick={handleOpenWelcome}>
                  {t('dashboard.gettingStarted.viewWelcome')}
                </a>
              </li>
              <li>
                <a href="#" onClick={handleOpenRuleFormat}>
                  {t('dashboard.gettingStarted.learnRuleFormat')}
                </a>
              </li>
              <li>
                <a href="#" onClick={handleOpenExamples}>
                  {t('dashboard.gettingStarted.browseExamples')}
                </a>
              </li>
            </ul>
          </div>
        </Card>
      </Section>
    </div>
  );
};
