import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Toolbar } from '../components/Toolbar';
import { PriorityIcon } from '../components/PriorityIcon';
import { EmptyState } from '../components/EmptyState';
import { vscodeApi } from '../utils/vscode-api';
import '../global.css';
import './search.css';

interface SearchCriteria {
  namePattern?: string;
  contentPattern?: string;
  tags?: string[];
  priority?: string;
  source?: string;
}

interface SearchResultItem {
  rule: {
    id: string;
    title: string;
    priority: string;
    tags: string[];
    sourceId: string;
    description: string;
  };
  matchedFields: string[];
}

interface SearchHistory {
  criteria: SearchCriteria;
  resultCount: number;
  timestamp: number;
  summary: string;
}

const FIELD_NAMES: Record<string, string> = {
  title: '标题',
  content: '内容',
  tags: '标签',
  priority: '优先级',
  source: '源',
};

export const App: React.FC = () => {
  const [criteria, setCriteria] = useState<SearchCriteria>({});
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      console.log('[SearchApp] Received message:', message.type, message.payload);
      if (message.type === 'searchResults') {
        console.log('[SearchApp] Search results count:', message.payload.results.length);
        setResults(message.payload.results);
        setLoading(false);
        setSelectedResults(new Set());
      } else if (message.type === 'error') {
        setError(message.payload.message);
        setLoading(false);
      } else if (message.type === 'searchHistory') {
        setHistory(message.payload.history);
      } else if (message.type === 'success') {
        // 显示成功提示
        console.log('Success:', message.payload.message);
      }
    };
    window.addEventListener('message', handleMessage);

    // 组件加载时请求搜索历史
    vscodeApi.postMessage('loadHistory', {});

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCriteria((prev) => ({ ...prev, [name]: value }));
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCriteria((prev) => ({
      ...prev,
      tags: e.target.value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    }));
  };

  const handleSearch = () => {
    console.log('[SearchApp] Search triggered, criteria:', criteria);
    setLoading(true);
    setError(null);
    console.log('[SearchApp] Posting search message to backend');
    vscodeApi.postMessage('search', criteria);
  };

  const handleReset = () => {
    setCriteria({});
    setResults([]);
    setError(null);
    setSelectedResults(new Set());
  };

  const handleQuickFilter = (priority: 'high' | 'medium' | 'low') => {
    const newCriteria = { ...criteria, priority };
    console.log('[SearchApp] Quick filter triggered, priority:', priority);
    setCriteria(newCriteria);
    setLoading(true);
    setError(null);
    vscodeApi.postMessage('search', newCriteria);
  };

  const handleApplyHistory = (historyItem: SearchHistory) => {
    setCriteria(historyItem.criteria);
    setLoading(true);
    setError(null);
    vscodeApi.postMessage('search', historyItem.criteria);
  };

  const handleClearHistory = () => {
    vscodeApi.postMessage('clearHistory', {});
    setHistory([]);
  };

  const handleViewRule = (ruleId: string) => {
    vscodeApi.postMessage('viewRule', { ruleId });
  };

  const handleSelectRules = (ruleIds: string[]) => {
    const sourceIds = ruleIds.map(
      (id) => results.find((r) => r.rule.id === id)?.rule.sourceId || '',
    );
    vscodeApi.postMessage('selectRules', { ruleIds, sourceIds });
  };

  const handleToggleSelection = (ruleId: string) => {
    const newSelected = new Set(selectedResults);
    if (newSelected.has(ruleId)) {
      newSelected.delete(ruleId);
    } else {
      newSelected.add(ruleId);
    }
    setSelectedResults(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedResults.size === results.length) {
      setSelectedResults(new Set());
    } else {
      setSelectedResults(new Set(results.map((r) => r.rule.id)));
    }
  };

  const handleBatchSelect = () => {
    const selectedIds = Array.from(selectedResults);
    handleSelectRules(selectedIds);
  };

  const handleBatchExport = () => {
    const selectedIds = Array.from(selectedResults);
    vscodeApi.postMessage('exportResults', { ruleIds: selectedIds, format: 'json' });
  };

  return (
    <div className="container">
      <Card className="section search-form">
        <div className="section-title">🔍 Search Conditions</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Rule Name</label>
            <Input
              name="namePattern"
              value={criteria.namePattern ?? ''}
              onChange={handleInputChange}
              placeholder="Enter rule name..."
            />
          </div>
          <div className="form-group">
            <label className="form-label">Content</label>
            <Input
              name="contentPattern"
              value={criteria.contentPattern ?? ''}
              onChange={handleInputChange}
              placeholder="Search in rule content..."
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Tags (comma separated)</label>
            <Input
              name="tags"
              value={criteria.tags?.join(', ') ?? ''}
              onChange={handleTagsChange}
              placeholder="e.g., authentication, security"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Source (ID or Name)</label>
            <Input
              name="source"
              value={criteria.source ?? ''}
              onChange={handleInputChange}
              placeholder="Source ID or Name..."
            />
          </div>
        </div>
        <Toolbar>
          <Button type="primary" onClick={handleSearch} disabled={loading}>
            🔍 Search
          </Button>
          <Button type="secondary" onClick={handleReset}>
            ⟲ Reset
          </Button>
        </Toolbar>

        <div className="quick-filters">
          <div className="section-title">⚡ Quick Filters</div>
          <div className="filter-buttons">
            <button
              className={`quick-filter priority-high ${
                criteria.priority === 'high' ? 'active' : ''
              }`}
              onClick={() => handleQuickFilter('high')}
              title="High Priority"
            >
              🔴 High Priority
            </button>
            <button
              className={`quick-filter priority-medium ${
                criteria.priority === 'medium' ? 'active' : ''
              }`}
              onClick={() => handleQuickFilter('medium')}
              title="Medium Priority"
            >
              🟡 Medium Priority
            </button>
            <button
              className={`quick-filter priority-low ${criteria.priority === 'low' ? 'active' : ''}`}
              onClick={() => handleQuickFilter('low')}
              title="Low Priority"
            >
              🔵 Low Priority
            </button>
          </div>
        </div>
      </Card>

      {history.length > 0 && (
        <div className="history-section-compact">
          <span className="history-label">🕒</span>
          {history.map((item, index) => (
            <span key={index}>
              <a
                className="history-link"
                onClick={() => handleApplyHistory(item)}
                title={`${item.summary} (${item.resultCount} 条结果)`}
              >
                {item.summary}
              </a>
              {index < history.length - 1 && <span className="history-separator"> · </span>}
            </span>
          ))}
          <a className="history-clear" onClick={handleClearHistory} title="清空历史">
            ×
          </a>
        </div>
      )}

      <Card className="section">
        <div className="results-header">
          <div className="section-title">Results ({results.length} found)</div>
          {results.length > 0 && (
            <Button type="secondary" onClick={handleSelectAll}>
              {selectedResults.size === results.length ? '全不选' : '全选'}
            </Button>
          )}
        </div>
        {loading ? (
          <EmptyState icon={<span>⏳</span>}>Searching...</EmptyState>
        ) : error ? (
          <EmptyState icon={<span>❌</span>}>{error}</EmptyState>
        ) : results.length === 0 ? (
          <EmptyState icon={<span>📭</span>}>No results found</EmptyState>
        ) : (
          <div>
            {results.map((result) => (
              <Card key={result.rule.id} className={`result-item priority-${result.rule.priority}`}>
                <div className="result-header">
                  <div className="result-header-left">
                    <input
                      type="checkbox"
                      checked={selectedResults.has(result.rule.id)}
                      onChange={() => handleToggleSelection(result.rule.id)}
                      className="result-checkbox"
                    />
                    <PriorityIcon priority={result.rule.priority as 'high' | 'medium' | 'low'} />
                    <div className="result-title">{result.rule.title}</div>
                  </div>
                </div>
                <div className="result-meta">
                  <span>📦 {result.rule.sourceId}</span>
                  <span>🏷️ {result.rule.tags.join(', ')}</span>
                </div>
                {result.matchedFields.length > 0 && (
                  <div className="matched-fields">
                    ✓ 匹配:{' '}
                    {['title', 'content', 'tags', 'priority', 'source'].map((field) => (
                      <span
                        key={field}
                        className={result.matchedFields.includes(field) ? 'matched' : 'unmatched'}
                      >
                        {FIELD_NAMES[field] || field}
                      </span>
                    ))}
                  </div>
                )}
                <div className="result-desc">{result.rule.description}</div>
                <div className="result-actions">
                  <button className="view-button" onClick={() => handleViewRule(result.rule.id)}>
                    📄 预览 Markdown
                  </button>
                  <button
                    className="view-button"
                    onClick={() => handleSelectRules([result.rule.id])}
                  >
                    ✅ 选中规则
                  </button>
                </div>
              </Card>
            ))}
            {selectedResults.size > 0 && (
              <div className="batch-actions">
                <span>已选择 {selectedResults.size} 项</span>
                <Button type="primary" onClick={handleBatchSelect}>
                  批量选中
                </Button>
                <Button type="secondary" onClick={handleBatchExport}>
                  批量导出
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
