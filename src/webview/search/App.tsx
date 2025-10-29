import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Toolbar } from '../components/Toolbar';
import { PriorityIcon } from '../components/PriorityIcon';
import { EmptyState } from '../components/EmptyState';
import { vscodeApi } from '../utils/vscode-api';
import '../styles/global.css';
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

export const App: React.FC = () => {
  const [criteria, setCriteria] = useState<SearchCriteria>({});
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'searchResults') {
        setResults(message.payload.results);
        setLoading(false);
      } else if (message.type === 'error') {
        setError(message.payload.message);
        setLoading(false);
      }
    };
    window.addEventListener('message', handleMessage);
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
    setLoading(true);
    setError(null);
    vscodeApi.postMessage('search', criteria);
  };

  const handleReset = () => {
    setCriteria({});
    setResults([]);
    setError(null);
  };

  return (
    <div className="container">
      <Card className="section">
        <div className="section-title">🔍 Search Conditions</div>
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
        <div className="form-group">
          <label className="form-label">Tags (comma separated)</label>
          <Input
            name="tags"
            value={criteria.tags?.join(', ') ?? ''}
            onChange={handleTagsChange}
            placeholder="e.g., authentication, security"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select
              className="input"
              name="priority"
              value={criteria.priority ?? ''}
              onChange={handleInputChange}
            >
              <option value="">All</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Source</label>
            <Input
              name="source"
              value={criteria.source ?? ''}
              onChange={handleInputChange}
              placeholder="Source ID..."
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
      </Card>
      <Card className="section">
        <div className="section-title">Results ({results.length} found)</div>
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
                  <div className="result-title">
                    <PriorityIcon priority={result.rule.priority as any} /> {result.rule.title}
                  </div>
                  <Button type="secondary">View</Button>
                </div>
                <div className="result-meta">
                  <span>Source: {result.rule.sourceId}</span>
                  <span>Tags: {result.rule.tags.join(', ')}</span>
                </div>
                <div className="result-desc">{result.rule.description}</div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
