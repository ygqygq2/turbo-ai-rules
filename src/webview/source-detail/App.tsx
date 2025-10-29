import React, { useEffect, useState } from 'react';
import { vscodeApi } from '../utils/vscode-api';

import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Toolbar } from '../components/Toolbar';
import { PriorityIcon } from '../components/PriorityIcon';
import { StatusDot } from '../components/StatusDot';
import { EmptyState } from '../components/EmptyState';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import '../styles/global.css';
import './source-detail.css';

/**
 * 类型定义
 */
interface RuleSource {
  id: string;
  name: string;
  gitUrl: string;
  branch?: string;
  subPath?: string;
  enabled: boolean;
  syncInterval?: number;
  lastSync?: string;
  authentication?: {
    type: 'token' | 'ssh' | 'none';
  };
}

interface ParsedRule {
  id: string;
  title: string;
  content: string;
  filePath: string;
  sourceId: string;
  metadata?: {
    priority?: 'high' | 'medium' | 'low';
    tags?: string[];
  };
}

interface SourceStatistics {
  totalRules: number;
  priorityDistribution: {
    high: number;
    medium: number;
    low: number;
  };
  topTags: Array<{ tag: string; count: number }>;
  createdAt?: string;
  lastUpdated?: string;
  totalSyncs?: number;
}

interface SyncInfo {
  lastSynced?: string;
  status: 'success' | 'error' | 'never';
  message?: string;
  cacheSize?: string;
  nextAutoSync?: string;
}

interface SourceDetailData {
  source: RuleSource;
  rules: ParsedRule[];
  statistics: SourceStatistics;
  syncInfo: SyncInfo;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * 主应用组件
 */
export const App: React.FC = () => {
  const [data, setData] = useState<SourceDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [visibleRules, setVisibleRules] = useState(20);

  // 监听来自扩展的消息
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'sourceData':
          setData(message.payload);
          setLoading(false);
          break;

        case 'syncStatus':
          setSyncStatus(message.payload.status);
          if (message.payload.status === 'success') {
            setTimeout(() => setSyncStatus('idle'), 3000);
          }
          break;

        case 'error':
          setError(message.payload.message);
          setLoading(false);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // 请求刷新数据
  const handleRefresh = () => {
    vscodeApi.postMessage('refresh');
  };

  const handleSync = () => {
    if (data) {
      setSyncStatus('syncing');
      vscodeApi.postMessage('syncSource', { sourceId: data.source.id });
    }
  };

  if (loading) return <EmptyState icon={<span>⏳</span>}>Loading source details...</EmptyState>;
  if (error) return <EmptyState icon={<span>❌</span>}>{error}</EmptyState>;
  if (!data) return <EmptyState icon={<span>📭</span>}>No source data</EmptyState>;

  const filteredRules = data.rules.filter((rule) => {
    if (searchQuery && !rule.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedPriority !== 'all' && rule.metadata?.priority !== selectedPriority) return false;
    if (selectedTag && !(rule.metadata?.tags ?? []).includes(selectedTag)) return false;
    return true;
  });

  return (
    <div className="container">
      <Card>
        <Toolbar>
          <Badge>Source: {data.source.name}</Badge>
          <Badge>
            Status: <StatusDot status={data.source.enabled ? 'enabled' : 'disabled'} />
          </Badge>
          <Badge>Last Sync: {data.syncInfo.lastSynced ?? 'Never'}</Badge>
          <Badge>Cache: {data.syncInfo.cacheSize ?? '-'}</Badge>
        </Toolbar>
        <Toolbar>
          <Button type="primary" onClick={handleSync} disabled={syncStatus === 'syncing'}>
            {syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}
          </Button>
          <Button type="secondary" onClick={handleRefresh}>
            Refresh
          </Button>
        </Toolbar>
      </Card>
      <Card>
        <div className="section-title">Statistics</div>
        <Toolbar>
          <Badge>Total Rules: {data.statistics.totalRules}</Badge>
          <Badge>
            <PriorityIcon priority="high" /> High: {data.statistics.priorityDistribution.high}
          </Badge>
          <Badge>
            <PriorityIcon priority="medium" /> Medium: {data.statistics.priorityDistribution.medium}
          </Badge>
          <Badge>
            <PriorityIcon priority="low" /> Low: {data.statistics.priorityDistribution.low}
          </Badge>
        </Toolbar>
        <Toolbar>
          {data.statistics.topTags.map((tag) => (
            <Badge key={tag.tag}>
              {tag.tag} ({tag.count})
            </Badge>
          ))}
        </Toolbar>
      </Card>
      <Card>
        <div className="section-title">Rules</div>
        <Toolbar>
          <Input
            placeholder="Search rule title..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
          />
          <select
            className="input"
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
          >
            <option value="all">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            className="input"
            value={selectedTag ?? ''}
            onChange={(e) => setSelectedTag(e.target.value || null)}
          >
            <option value="">All Tags</option>
            {Array.from(new Set(data.rules.flatMap((r) => r.metadata?.tags ?? []))).map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </Toolbar>
        {filteredRules.length === 0 ? (
          <EmptyState icon={<span>📭</span>}>No rules found</EmptyState>
        ) : (
          <div>
            {filteredRules.slice(0, visibleRules).map((rule) => (
              <Card
                key={rule.id}
                className={`rule-item priority-${rule.metadata?.priority ?? 'low'}`}
              >
                <div className="result-header">
                  <div className="result-title">
                    <PriorityIcon priority={rule.metadata?.priority ?? 'low'} /> {rule.title}
                  </div>
                  <Badge>{rule.metadata?.tags?.join(', ')}</Badge>
                </div>
                <div className="result-desc">{rule.content}</div>
              </Card>
            ))}
            {filteredRules.length > visibleRules && (
              <Toolbar>
                <Button type="primary" onClick={() => setVisibleRules((v) => v + 20)}>
                  Load More
                </Button>
              </Toolbar>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
// 以上为旧渲染代码块，已被主 React 组件导出部分替代，故全部删除。

// 以上为旧逻辑和渲染代码块，已被主 App 组件 hooks 和渲染部分替代，故全部删除。

// 以上为旧渲染和逻辑代码块，已被主 App 组件 hooks 和渲染部分替代，故全部删除。
