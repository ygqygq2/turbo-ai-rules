import React, { useEffect, useState } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { vscodeApi } from '../utils/vscode-api';
import { t } from '../utils/i18n';

import { Card } from '../components/Card';
import { Toolbar } from '../components/Toolbar';
import { PriorityIcon } from '../components/PriorityIcon';
import { StatusDot } from '../components/StatusDot';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Tag, TagsContainer } from '../components/Tag';
import { Section } from '../components/Section';
import '../global.css';
import './source-detail.css';

interface RuleData {
  id: string;
  title: string;
  priority?: string;
  tags?: string[];
  description?: string;
  filePath?: string;
  metadata?: {
    title?: string;
    tags?: string[];
    priority?: 'high' | 'medium' | 'low';
    description?: string;
    [key: string]: unknown;
  };
  content?: string;
}

interface SourceData {
  id: string;
  name: string;
  gitUrl: string;
  branch?: string;
  enabled?: boolean;
  [key: string]: unknown;
}

interface StatisticsData {
  totalRules: number;
  priorityDistribution?: {
    high: number;
    medium: number;
    low: number;
  };
  topTags?: Array<{ tag: string; count: number }>;
  [key: string]: unknown;
}

interface SyncInfoData {
  lastSync?: string;
  lastSynced?: string;
  status?: 'enabled' | 'disabled' | 'syncing' | 'error';
  [key: string]: unknown;
}

interface SourceDetailData {
  source: SourceData;
  rules: RuleData[];
  statistics: StatisticsData;
  syncInfo: SyncInfoData;
}

/**
 * 规则源详情页面组件
 */
const App: React.FC = () => {
  const [mode, setMode] = useState<'loading' | 'view'>('loading');
  const [data, setData] = useState<SourceDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    // 通知扩展 webview 已准备好
    vscodeApi.postMessage('ready');

    // 监听来自扩展的消息
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'sourceData':
          setData(message.payload);
          setMode('view');
          setError(null);
          break;

        case 'error':
          setError(message.payload.message);
          setMode('view');
          break;

        case 'syncStatus':
          // 处理同步状态更新
          if (message.payload.status === 'success') {
            // 刷新数据
            vscodeApi.postMessage('refresh');
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 加载中
  if (mode === 'loading') {
    return (
      <div className="container">
        <EmptyState icon="⏳">
          <div className="empty-state-title">{t('source.loading')}</div>
          <div className="empty-state-description">{t('source.loadingDescription')}</div>
        </EmptyState>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="container">
        <EmptyState icon="❌">
          <div className="empty-state-title">{t('source.error')}</div>
          <div className="empty-state-description">{error}</div>
        </EmptyState>
      </div>
    );
  }

  // 没有数据
  if (!data) {
    return (
      <div className="container">
        <EmptyState icon="📭">
          <div className="empty-state-title">{t('source.noData')}</div>
          <div className="empty-state-description">{t('source.noDataDescription')}</div>
        </EmptyState>
      </div>
    );
  }

  // 查看模式：显示详情
  const { source, rules, statistics, syncInfo } = data;

  // 过滤规则
  const filteredRules = rules.filter((rule) => {
    const matchesSearch =
      !searchQuery ||
      rule.metadata?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.metadata?.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.metadata?.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = !selectedTag || rule.metadata?.tags?.includes(selectedTag);

    return matchesSearch && matchesTag;
  });

  return (
    <ErrorBoundary>
      <div className="container">
        {/* Header */}
        <div className="source-header">
          <div className="source-header-info">
            <h1>
              <StatusDot status={source.enabled ? 'enabled' : 'disabled'} />
              {source.name || source.gitUrl}
            </h1>
            <p className="source-url">{source.gitUrl}</p>
          </div>
          <Toolbar className="source-actions">
            <Button
              type="primary"
              onClick={() => vscodeApi.postMessage('syncSource', { sourceId: source.id })}
            >
              🔄 {t('source.sync')}
            </Button>
            <Button
              type="secondary"
              onClick={() => vscodeApi.postMessage('editSource', { sourceId: source.id })}
            >
              ✏️ {t('source.edit')}
            </Button>
            <Button
              type="secondary"
              onClick={() => vscodeApi.postMessage('toggleSource', { sourceId: source.id })}
            >
              {source.enabled ? `⏸️ ${t('source.disable')}` : `▶️ ${t('source.enable')}`}
            </Button>
          </Toolbar>
        </div>

        {/* Main Grid: Configuration + Statistics */}
        <div className="main-grid">
          <Card>
            <h3>Configuration Details</h3>
            <div className="config-list">
              <div className="config-item">
                <span className="config-label">Branch:</span>
                <span>{((source as Record<string, unknown>).branch as string) || 'main'}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Sub Path:</span>
                <span>{((source as Record<string, unknown>).subPath as string) || '/'}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Authentication:</span>
                <span>
                  {(source as Record<string, unknown>).authentication === 'token'
                    ? 'Private (Token)'
                    : (source as Record<string, unknown>).authentication === 'ssh'
                      ? 'Private (SSH)'
                      : 'Public'}
                </span>
              </div>
            </div>
            <h4 style={{ marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
              Sync Status
            </h4>
            <div className="config-list">
              <div className="config-item">
                <span className="config-label">Last Synced:</span>
                <span>{syncInfo.lastSynced || 'Never'}</span>
              </div>
              <div className="config-item">
                <span className="config-label">Status:</span>
                <div className="sync-info">
                  <StatusDot status={syncInfo.status || 'disabled'} />
                  <span>{syncInfo.status === 'enabled' ? 'Ready' : 'Disabled'}</span>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <h3>Statistics Overview</h3>
            <div className="stat-item">
              <span>Total Rules:</span>
              <span className="stat-value">{statistics.totalRules}</span>
            </div>
            <h4 style={{ marginTop: 'var(--spacing-md)', marginBottom: 'var(--spacing-sm)' }}>
              Priority Distribution
            </h4>
            <div className="priority-dist-bars">
              <div className="priority-bar-item">
                <div className="priority-bar-label">
                  <PriorityIcon priority="high" /> High
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar bg-prio-high"
                    style={{
                      width: `${
                        statistics.totalRules > 0
                          ? ((statistics.priorityDistribution?.high || 0) / statistics.totalRules) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
                <div className="priority-bar-value">
                  {statistics.priorityDistribution?.high || 0}{' '}
                  <span className="priority-bar-percent">
                    (
                    {statistics.totalRules > 0
                      ? Math.round(
                          ((statistics.priorityDistribution?.high || 0) / statistics.totalRules) *
                            100,
                        )
                      : 0}
                    %)
                  </span>
                </div>
              </div>
              <div className="priority-bar-item">
                <div className="priority-bar-label">
                  <PriorityIcon priority="medium" /> Medium
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar bg-prio-medium"
                    style={{
                      width: `${
                        statistics.totalRules > 0
                          ? ((statistics.priorityDistribution?.medium || 0) /
                              statistics.totalRules) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
                <div className="priority-bar-value">
                  {statistics.priorityDistribution?.medium || 0}{' '}
                  <span className="priority-bar-percent">
                    (
                    {statistics.totalRules > 0
                      ? Math.round(
                          ((statistics.priorityDistribution?.medium || 0) / statistics.totalRules) *
                            100,
                        )
                      : 0}
                    %)
                  </span>
                </div>
              </div>
              <div className="priority-bar-item">
                <div className="priority-bar-label">
                  <PriorityIcon priority="low" /> Low
                </div>
                <div className="progress-bar-bg">
                  <div
                    className="progress-bar bg-prio-low"
                    style={{
                      width: `${
                        statistics.totalRules > 0
                          ? ((statistics.priorityDistribution?.low || 0) / statistics.totalRules) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
                <div className="priority-bar-value">
                  {statistics.priorityDistribution?.low || 0}{' '}
                  <span className="priority-bar-percent">
                    (
                    {statistics.totalRules > 0
                      ? Math.round(
                          ((statistics.priorityDistribution?.low || 0) / statistics.totalRules) *
                            100,
                        )
                      : 0}
                    %)
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Tags */}
        {statistics.topTags && statistics.topTags.length > 0 && (
          <Section title="Top Tags" icon="🏷️">
            <TagsContainer>
              {statistics.topTags.map((tagItem: { tag: string; count: number }) => (
                <Tag
                  key={tagItem.tag}
                  onClick={() => setSelectedTag(selectedTag === tagItem.tag ? null : tagItem.tag)}
                  active={selectedTag === tagItem.tag}
                  count={tagItem.count}
                >
                  {tagItem.tag}
                </Tag>
              ))}
            </TagsContainer>
          </Section>
        )}

        {/* Rules List */}
        <div className="rules-section">
          <div className="rules-header">
            <h2>
              {t('common.rules')} ({filteredRules.length})
            </h2>
            <Input
              placeholder={t('source.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredRules.length === 0 ? (
            <EmptyState icon="🔍">
              <div className="empty-state-title">{t('source.noRulesFound')}</div>
              <div className="empty-state-description">
                {searchQuery ? t('source.tryDifferentSearch') : t('source.noRulesAvailable')}
              </div>
            </EmptyState>
          ) : (
            <div className="rules-list">
              {filteredRules.map((rule: RuleData, index: number) => (
                <Card key={index} className="rule-card">
                  <div className="rule-header">
                    <h3>
                      {rule.metadata?.title || 'Untitled Rule'}
                      <PriorityIcon priority={rule.metadata?.priority || 'medium'} />
                    </h3>
                  </div>
                  {rule.metadata?.description && (
                    <p className="rule-description">{rule.metadata.description}</p>
                  )}
                  {rule.metadata?.tags && rule.metadata.tags.length > 0 && (
                    <TagsContainer className="rule-tags">
                      {rule.metadata.tags.map((tag: string) => (
                        <Tag key={tag} onClick={() => setSelectedTag(tag)}>
                          {tag}
                        </Tag>
                      ))}
                    </TagsContainer>
                  )}
                  <Button
                    type="secondary"
                    onClick={() => vscodeApi.postMessage('viewRule', { rulePath: rule.filePath })}
                  >
                    View Details
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export { App };
