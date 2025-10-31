import React, { useEffect, useState, Suspense } from 'react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { vscodeApi } from '../utils/vscode-api';

import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Toolbar } from '../components/Toolbar';
import { PriorityIcon } from '../components/PriorityIcon';
import { StatusDot } from '../components/StatusDot';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import '../global.css';
import './source-detail.css';

const LazyNewSourceForm = React.lazy(() =>
  import('./NewSourceForm').then((m) => ({ default: m.NewSourceForm })),
);

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

interface WindowWithInitialMode extends Window {
  initialMode?: string;
}

/**
 * 规则源详情页面组件
 */
const App: React.FC = () => {
  // 同步检查初始模式，避免闪烁
  const initialMode = (window as WindowWithInitialMode).initialMode === 'new' ? 'new' : 'loading';
  const [mode, setMode] = useState<'loading' | 'new' | 'view'>(initialMode);
  const [data, setData] = useState<SourceDetailData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  useEffect(() => {
    // 如果已经是新增模式，不需要监听消息
    if (mode === 'new') {
      return;
    }

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

  // 新增模式：显示表单
  if (mode === 'new') {
    return (
      <ErrorBoundary>
        <div className="container">
          <Suspense
            fallback={
              <div className="loading-spinner">
                <div className="spinner">⏳</div>
                <p>Loading form...</p>
              </div>
            }
          >
            <LazyNewSourceForm />
          </Suspense>
        </div>
      </ErrorBoundary>
    );
  }

  // 加载中
  if (mode === 'loading') {
    return (
      <div className="container">
        <EmptyState icon="⏳">
          <div className="empty-state-title">Loading...</div>
          <div className="empty-state-description">
            Please wait while we load the source details
          </div>
        </EmptyState>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div className="container">
        <EmptyState icon="❌">
          <div className="empty-state-title">Error</div>
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
          <div className="empty-state-title">No Data</div>
          <div className="empty-state-description">No source data available</div>
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
      rule.content?.toLowerCase().includes(searchQuery.toLowerCase());

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
              🔄 Sync
            </Button>
            <Button
              type="secondary"
              onClick={() => vscodeApi.postMessage('editSource', { sourceId: source.id })}
            >
              ✏️ Edit
            </Button>
            <Button
              type="secondary"
              onClick={() => vscodeApi.postMessage('toggleSource', { sourceId: source.id })}
            >
              {source.enabled ? '⏸️ Disable' : '▶️ Enable'}
            </Button>
          </Toolbar>
        </div>

        {/* Statistics */}
        <div className="statistics-grid">
          <Card>
            <h3>Total Rules</h3>
            <div className="stat-value">{statistics.totalRules}</div>
          </Card>
          <Card>
            <h3>Priority Distribution</h3>
            <div className="priority-dist">
              <div>
                <PriorityIcon priority="high" /> {statistics.priorityDistribution?.high || 0}
              </div>
              <div>
                <PriorityIcon priority="medium" /> {statistics.priorityDistribution?.medium || 0}
              </div>
              <div>
                <PriorityIcon priority="low" /> {statistics.priorityDistribution?.low || 0}
              </div>
            </div>
          </Card>
          <Card>
            <h3>Sync Status</h3>
            <div className="sync-info">
              <StatusDot status={syncInfo.status || 'disabled'} />
              <span>{syncInfo.lastSynced || 'Never synced'}</span>
            </div>
          </Card>
        </div>

        {/* Tags */}
        {statistics.topTags && statistics.topTags.length > 0 && (
          <div className="tags-section">
            <h3>Top Tags</h3>
            <div className="tags-list">
              {statistics.topTags.map((tag: { tag: string; count: number }) => (
                <span
                  key={tag.tag}
                  className={`badge ${
                    selectedTag === tag.tag ? 'badge-primary' : 'badge-secondary'
                  }`}
                  onClick={() => setSelectedTag(selectedTag === tag.tag ? null : tag.tag)}
                  style={{ cursor: 'pointer' }}
                >
                  {tag.tag} ({tag.count})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Rules List */}
        <div className="rules-section">
          <div className="rules-header">
            <h2>Rules ({filteredRules.length})</h2>
            <Input
              placeholder="Search rules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {filteredRules.length === 0 ? (
            <EmptyState icon="🔍">
              <div className="empty-state-title">No Rules Found</div>
              <div className="empty-state-description">
                {searchQuery ? 'Try a different search term' : 'No rules available'}
              </div>
            </EmptyState>
          ) : (
            <div className="rules-list">
              {filteredRules.map((rule: RuleData, index: number) => (
                <Card key={index} className="rule-card">
                  <div className="rule-header">
                    <h3>{rule.metadata?.title || 'Untitled Rule'}</h3>
                    <PriorityIcon priority={rule.metadata?.priority || 'medium'} />
                  </div>
                  {rule.metadata?.description && (
                    <p className="rule-description">{rule.metadata.description}</p>
                  )}
                  {rule.metadata?.tags && rule.metadata.tags.length > 0 && (
                    <div className="rule-tags">
                      {rule.metadata.tags.map((tag: string) => (
                        <Badge key={tag} className="badge-secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
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

export default App;
