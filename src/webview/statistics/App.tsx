import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Toolbar } from '../components/Toolbar';
import { Badge } from '../components/Badge';
import { PriorityIcon } from '../components/PriorityIcon';
import { vscodeApi } from '../utils/vscode-api';
import { t } from '../utils/i18n';
import '../global.css';
import './statistics.css';

interface StatisticsData {
  totalRules: number;
  activeSources: number;
  conflicts: number;
  cacheSize: string;
  syncHistory: Array<{ date: string; success: number; failed: number }>;
  topTags: Array<{ tag: string; count: number }>;
  priority: { high: number; medium: number; low: number };
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

  if (loading) return <EmptyState icon={<span>⏳</span>}>{t('statistics.loading')}</EmptyState>;
  if (error) return <EmptyState icon={<span>❌</span>}>{error}</EmptyState>;
  if (!stats) return <EmptyState icon={<span>📭</span>}>{t('statistics.noData')}</EmptyState>;

  return (
    <div className="container">
      <h1>{t('statistics.title')}</h1>
      <Card>
        <Toolbar>
          <Badge>
            {t('statistics.totalRules')}: {stats.totalRules}
          </Badge>
          <Badge>
            {t('statistics.activeSources')}: {stats.activeSources}
          </Badge>
          <Badge>
            {t('statistics.conflicts')}: {stats.conflicts}
          </Badge>
          <Badge>
            {t('statistics.cacheSize')}: {stats.cacheSize}
          </Badge>
        </Toolbar>
      </Card>
      <Card>
        <div className="section-title">{t('statistics.topTags')}</div>
        <Toolbar>
          {stats.topTags.map((tag) => (
            <Badge key={tag.tag}>
              {tag.tag} ({tag.count})
            </Badge>
          ))}
        </Toolbar>
      </Card>
      <Card>
        <div className="section-title">{t('statistics.priorityDistribution')}</div>
        <Toolbar>
          <Badge>
            <PriorityIcon priority="high" /> {t('common.high')}: {stats.priority.high}
          </Badge>
          <Badge>
            <PriorityIcon priority="medium" /> {t('common.medium')}: {stats.priority.medium}
          </Badge>
          <Badge>
            <PriorityIcon priority="low" /> {t('common.low')}: {stats.priority.low}
          </Badge>
        </Toolbar>
      </Card>
      {/* 可扩展更多统计内容，如同步历史图表等 */}
    </div>
  );
};
