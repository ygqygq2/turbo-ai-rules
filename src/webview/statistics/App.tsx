import React, { useEffect, useState } from 'react';
import { Card } from '../components/Card';
import { EmptyState } from '../components/EmptyState';
import { Toolbar } from '../components/Toolbar';
import { Badge } from '../components/Badge';
import { PriorityIcon } from '../components/PriorityIcon';
import { vscodeApi } from '../utils/vscode-api';
import '../styles/global.css';
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

  if (loading) return <EmptyState icon={<span>⏳</span>}>Loading statistics...</EmptyState>;
  if (error) return <EmptyState icon={<span>❌</span>}>{error}</EmptyState>;
  if (!stats) return <EmptyState icon={<span>📭</span>}>No statistics data</EmptyState>;

  return (
    <div className="container">
      <h1>📊 Statistics Dashboard</h1>
      <Card>
        <Toolbar>
          <Badge>Total Rules: {stats.totalRules}</Badge>
          <Badge>Active Sources: {stats.activeSources}</Badge>
          <Badge>Conflicts: {stats.conflicts}</Badge>
          <Badge>Cache Size: {stats.cacheSize}</Badge>
        </Toolbar>
      </Card>
      <Card>
        <div className="section-title">Top Tags</div>
        <Toolbar>
          {stats.topTags.map((tag) => (
            <Badge key={tag.tag}>
              {tag.tag} ({tag.count})
            </Badge>
          ))}
        </Toolbar>
      </Card>
      <Card>
        <div className="section-title">Rules by Priority</div>
        <Toolbar>
          <Badge>
            <PriorityIcon priority="high" /> High: {stats.priority.high}
          </Badge>
          <Badge>
            <PriorityIcon priority="medium" /> Medium: {stats.priority.medium}
          </Badge>
          <Badge>
            <PriorityIcon priority="low" /> Low: {stats.priority.low}
          </Badge>
        </Toolbar>
      </Card>
      {/* 可扩展更多统计内容，如同步历史图表等 */}
    </div>
  );
};
