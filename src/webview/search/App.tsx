import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Toolbar } from '../components/Toolbar';
import { PriorityIcon } from '../components/PriorityIcon';
import { EmptyState } from '../components/EmptyState';
import { vscodeApi } from '../utils/vscode-api';
import { t } from '../utils/i18n';
import '../global.css';
import './search.css';

interface SearchCriteria {
  namePattern?: string;
  contentPattern?: string;
  tags?: string[];
  priorities?: string[]; // 支持多选优先级
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
  title: t('search.field.title'),
  content: t('search.field.content'),
  tags: t('search.field.tags'),
  priority: t('search.field.priority'),
  source: t('search.field.source'),
};

export const App: React.FC = () => {
  const [criteria, setCriteria] = useState<SearchCriteria>({});
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SearchHistory[]>([]);
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set());

  useEffect(() => {
    // 通知后端 Webview 已准备就绪
    vscodeApi.postMessage('webviewReady', {});

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'searchResults') {
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
      } else if (message.type === 'prefillCriteria') {
        // 从统计页面跳转过来时预填搜索条件并执行搜索
        const newCriteria = message.payload;
        setCriteria(newCriteria);
        setLoading(true);
        setError(null);
        // 直接使用 payload 中的条件进行搜索，而不是依赖状态更新
        vscodeApi.postMessage('search', newCriteria);
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
    const currentPriorities = criteria.priorities || [];
    let newPriorities: string[];

    // 切换逻辑：如果已选中则取消，否则添加
    if (currentPriorities.includes(priority)) {
      newPriorities = currentPriorities.filter((p) => p !== priority);
    } else {
      newPriorities = [...currentPriorities, priority];
    }

    const newCriteria = { ...criteria, priorities: newPriorities };
    console.log('[SearchApp] Quick filter toggled, priorities:', newPriorities);
    setCriteria(newCriteria);
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
        <div className="section-title">{t('search.conditions')}</div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t('search.label.ruleName')}</label>
            <Input
              name="namePattern"
              value={criteria.namePattern ?? ''}
              onChange={handleInputChange}
              placeholder={t('search.placeholder.name')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('search.label.content')}</label>
            <Input
              name="contentPattern"
              value={criteria.contentPattern ?? ''}
              onChange={handleInputChange}
              placeholder={t('search.placeholder.content')}
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">{t('search.label.tags')}</label>
            <Input
              name="tags"
              value={criteria.tags?.join(', ') ?? ''}
              onChange={handleTagsChange}
              placeholder={t('search.placeholder.tags')}
            />
          </div>
          <div className="form-group">
            <label className="form-label">{t('search.label.source')}</label>
            <Input
              name="source"
              value={criteria.source ?? ''}
              onChange={handleInputChange}
              placeholder={t('search.placeholder.source')}
            />
          </div>
        </div>
        <Toolbar>
          <Button type="primary" onClick={handleSearch} disabled={loading}>
            {t('search.button.search')}
          </Button>
          <Button type="secondary" onClick={handleReset}>
            {t('search.button.reset')}
          </Button>
        </Toolbar>

        <div className="quick-filters">
          <div className="section-title">{t('search.quickFilters')}</div>
          <div className="filter-buttons">
            <button
              className={`quick-filter priority-high ${
                (criteria.priorities || []).includes('high') ? 'active' : ''
              }`}
              onClick={() => handleQuickFilter('high')}
              title={t('search.filter.high')}
            >
              {t('search.filter.high')}
            </button>
            <button
              className={`quick-filter priority-medium ${
                (criteria.priorities || []).includes('medium') ? 'active' : ''
              }`}
              onClick={() => handleQuickFilter('medium')}
              title={t('search.filter.medium')}
            >
              {t('search.filter.medium')}
            </button>
            <button
              className={`quick-filter priority-low ${
                (criteria.priorities || []).includes('low') ? 'active' : ''
              }`}
              onClick={() => handleQuickFilter('low')}
              title={t('search.filter.low')}
            >
              {t('search.filter.low')}
            </button>
          </div>
        </div>
      </Card>

      {history.length > 0 && (
        <div className="history-section-compact">
          <span className="history-label">{t('search.history.label')}</span>
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
          <a
            className="history-clear"
            onClick={handleClearHistory}
            title={t('search.history.clear')}
          >
            ×
          </a>
        </div>
      )}

      <Card className="section">
        <div className="results-header">
          <div className="section-title">{t('search.results', results.length)}</div>
          {results.length > 0 && (
            <Button type="secondary" onClick={handleSelectAll}>
              {selectedResults.size === results.length
                ? t('search.deselectAll')
                : t('search.selectAll')}
            </Button>
          )}
        </div>
        {loading ? (
          <EmptyState icon={<span>⏳</span>}>{t('search.searching')}</EmptyState>
        ) : error ? (
          <EmptyState icon={<span>❌</span>}>{error}</EmptyState>
        ) : results.length === 0 ? (
          <EmptyState icon={<span>📭</span>}>{t('search.noResults')}</EmptyState>
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
                    {t('search.matched')}{' '}
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
                    {t('search.viewMarkdown')}
                  </button>
                  <button
                    className="view-button"
                    onClick={() => handleSelectRules([result.rule.id])}
                  >
                    {t('search.selectRule')}
                  </button>
                </div>
              </Card>
            ))}
            {selectedResults.size > 0 && (
              <div className="batch-actions">
                <span>{t('search.selected', selectedResults.size)}</span>
                <Button type="primary" onClick={handleBatchSelect}>
                  {t('search.batchSelect')}
                </Button>
                <Button type="secondary" onClick={handleBatchExport}>
                  {t('search.batchExport')}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};
