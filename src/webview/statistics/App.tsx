import React, { useEffect, useState } from 'react';
import { EmptyState } from '../components/EmptyState';
import { Tag, TagsContainer } from '../components/Tag';
import { Section } from '../components/Section';
import { vscodeApi } from '../utils/vscode-api';
import { t } from '../utils/i18n';
import '../global.css';
import './statistics.css';

interface StatisticsData {
  overview: {
    totalRules: number;
    totalSources: number;
    enabledSources: number;
    conflicts: number;
  };
  sourceStats: Array<{
    name: string;
    ruleCount: number;
    enabled: boolean;
    lastSync?: string;
  }>;
  priorityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  topTags: Array<{
    tag: string;
    count: number;
  }>;
}

export const App: React.FC = () => {
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    vscodeApi.postMessage('getStatistics');
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'statisticsData') {
        setStats(message.payload);
        setLoading(false);
      } else if (message.type === 'error') {
        setError(message.payload.message);
        setLoading(false);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleRefresh = () => {
    vscodeApi.postMessage('refresh');
    setLoading(true);
  };

  const handleExport = () => {
    vscodeApi.postMessage('export');
  };

  const handleTagClick = (tag: string) => {
    vscodeApi.postMessage('searchByTag', { tag });
  };

  if (loading) return <EmptyState icon={<span>⏳</span>}>{t('statistics.loading')}</EmptyState>;
  if (error) return <EmptyState icon={<span>❌</span>}>{error}</EmptyState>;
  if (!stats) return <EmptyState icon={<span>📭</span>}>{t('statistics.noData')}</EmptyState>;

  const total =
    stats.priorityDistribution.high +
    stats.priorityDistribution.medium +
    stats.priorityDistribution.low;
  const highPercent = total > 0 ? (stats.priorityDistribution.high / total) * 100 : 0;
  const mediumPercent = total > 0 ? (stats.priorityDistribution.medium / total) * 100 : 0;
  const lowPercent = total > 0 ? (stats.priorityDistribution.low / total) * 100 : 0;

  return (
    <div className="container">
      <div className="header">
        <h1>{t('statistics.title')}</h1>
        <div className="toolbar">
          <button className="button" onClick={handleRefresh}>
            {t('statistics.refresh')}
          </button>
          <button className="button button-secondary" onClick={handleExport}>
            {t('statistics.export')}
          </button>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">
            <span className="codicon codicon-file"></span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.overview.totalRules}</div>
            <div className="stat-label">{t('statistics.totalRules')}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="codicon codicon-package"></span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.overview.totalSources}</div>
            <div className="stat-label">{t('statistics.totalSources')}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">
            <span className="codicon codicon-check"></span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.overview.enabledSources}</div>
            <div className="stat-label">{t('statistics.enabledSources')}</div>
          </div>
        </div>

        <div className={`stat-card ${stats.overview.conflicts > 0 ? 'stat-warning' : ''}`}>
          <div className="stat-icon">
            <span className="codicon codicon-warning"></span>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.overview.conflicts}</div>
            <div className="stat-label">{t('statistics.conflicts')}</div>
          </div>
        </div>
      </div>

      {/* 优先级分布 */}
      <div className="section">
        <h2 className="section-title">{t('statistics.priorityDistribution')}</h2>
        <div className="chart-container">
          <div className="bar-chart">
            <div className="bar-item">
              <div className="bar-label">{t('common.high')}</div>
              <div className="bar-wrapper">
                <div className="bar-fill priority-high" style={{ width: `${highPercent}%` }}></div>
                <span className="bar-text">
                  {stats.priorityDistribution.high} ({highPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="bar-item">
              <div className="bar-label">{t('common.medium')}</div>
              <div className="bar-wrapper">
                <div
                  className="bar-fill priority-medium"
                  style={{ width: `${mediumPercent}%` }}
                ></div>
                <span className="bar-text">
                  {stats.priorityDistribution.medium} ({mediumPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="bar-item">
              <div className="bar-label">{t('common.low')}</div>
              <div className="bar-wrapper">
                <div className="bar-fill priority-low" style={{ width: `${lowPercent}%` }}></div>
                <span className="bar-text">
                  {stats.priorityDistribution.low} ({lowPercent.toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 源统计 */}
      <div className="section">
        <h2 className="section-title">{t('statistics.sourcesOverview')}</h2>
        <div className="table-container">
          <table className="stats-table">
            <thead>
              <tr>
                <th>{t('statistics.sourceName')}</th>
                <th>{t('common.rules')}</th>
                <th>{t('common.status')}</th>
                <th>{t('statistics.lastSync')}</th>
              </tr>
            </thead>
            <tbody>
              {stats.sourceStats.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center' }}>
                    {t('statistics.noSourcesConfigured')}
                  </td>
                </tr>
              ) : (
                stats.sourceStats.map((source) => (
                  <tr key={source.name}>
                    <td>{source.name}</td>
                    <td>{source.ruleCount}</td>
                    <td>
                      <span
                        className={`status-badge ${
                          source.enabled ? 'status-enabled' : 'status-disabled'
                        }`}
                      >
                        {source.enabled ? t('common.enabled') : t('common.disabled')}
                      </span>
                    </td>
                    <td>{source.lastSync || t('common.never')}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 热门标签 */}
      <Section title={t('statistics.topTags')} icon="🏷️">
        {stats.topTags.length === 0 ? (
          <p className="empty-state">{t('statistics.noTagsFound')}</p>
        ) : (
          <TagsContainer>
            {stats.topTags.slice(0, 20).map((tag) => (
              <Tag
                key={tag.tag}
                onClick={() => handleTagClick(tag.tag)}
                title={t('statistics.clickToSearch', tag.tag)}
                count={tag.count}
              >
                {tag.tag}
              </Tag>
            ))}
          </TagsContainer>
        )}
      </Section>
    </div>
  );
};
