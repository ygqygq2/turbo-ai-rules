import React, { useState, useEffect } from 'react';
import { vscodeApi } from '../utils/vscode-api';
import { Tag, TagsContainer } from '../components/Tag';
import { Section } from '../components/Section';
import { MetadataGrid, MetadataItem } from '../components/MetadataGrid';
import { PriorityIcon } from '../components/PriorityIcon';
import '../global.css';
import './rule-details.css';

interface RuleMetadata {
  version?: string;
  author?: string;
  priority?: string;
  description?: string;
  tags?: string[];
  [key: string]: unknown;
}

interface ParsedRule {
  id: string;
  title: string;
  content: string;
  sourceId: string;
  filePath: string;
  metadata: RuleMetadata;
}

export const App: React.FC = () => {
  const [rule, setRule] = useState<ParsedRule | null>(null);
  const [isRenderedView, setIsRenderedView] = useState(false);
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      switch (message.type) {
        case 'setRule':
          setRule(message.rule);
          setIsRenderedView(false);
          setRenderedHtml(null);
          break;
        case 'renderedHtml':
          setRenderedHtml(message.html);
          // 渲染完成后自动切换到渲染视图
          setIsRenderedView(true);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    vscodeApi.postMessage('webviewReady');

    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleOpenMarkdownPreview = () => {
    vscodeApi.postMessage('openMarkdownPreview');
  };

  const handleCopyContent = () => {
    if (!rule) return;

    navigator.clipboard
      .writeText(rule.content)
      .then(() => {
        // 可以添加视觉反馈
      })
      .catch(() => {
        vscodeApi.postMessage('copyContent');
      });
  };

  const handleExportRule = () => {
    vscodeApi.postMessage('exportRule');
  };

  const handleOpenInEditor = () => {
    vscodeApi.postMessage('openInEditor');
  };

  const handleSearchByTag = (tag: string) => {
    vscodeApi.postMessage('searchByTag', { tag });
  };

  const handleToggleContentView = () => {
    // 如果要切换到渲染视图且还没有渲染内容
    if (!isRenderedView && renderedHtml === null) {
      vscodeApi.postMessage('renderMarkdown');
      // 不立即切换视图，等待渲染完成后再切换
      return;
    }

    // 如果已有渲染内容或要切回原始视图，立即切换
    setIsRenderedView(!isRenderedView);
  };

  const renderAdditionalMetadata = (metadata: RuleMetadata) => {
    const excludeKeys = ['version', 'author', 'priority', 'description', 'tags'];
    const additionalKeys = Object.keys(metadata).filter((key) => !excludeKeys.includes(key));

    if (additionalKeys.length === 0) return null;

    return (
      <Section title="Additional Metadata" icon="📋">
        <div className="additional-metadata">
          <div className="metadata-list">
            {additionalKeys.map((key) => (
              <div className="metadata-list-item" key={key}>
                <div className="metadata-list-key">{key}</div>
                <div className="metadata-list-value">
                  {Array.isArray(metadata[key]) ? metadata[key].join(', ') : String(metadata[key])}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    );
  };

  if (!rule) {
    return (
      <div className="container">
        <div className="empty-state">
          <h2>No Rule Selected</h2>
          <p>Select a rule from the sidebar to view its details.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* 头部工具栏 */}
      <div className="header">
        <div className="title-section">
          <h1>{rule.title}</h1>
          <div className="rule-id">#{rule.id}</div>
        </div>
        <div className="toolbar">
          <button
            className="button button-primary"
            onClick={handleOpenMarkdownPreview}
            title="Open in VSCode Markdown preview"
          >
            👁️ Preview
          </button>
          <button
            className="button button-primary"
            onClick={handleCopyContent}
            title="Copy content"
          >
            📋 Copy
          </button>
          <button className="button button-primary" onClick={handleExportRule} title="Export rule">
            📥 Export
          </button>
          <button
            className="button button-secondary"
            onClick={handleOpenInEditor}
            title="Open in editor"
          >
            📝 Edit
          </button>
        </div>
      </div>

      {/* 元数据卡片 */}
      <Section title="Metadata" icon="📊">
        <MetadataGrid>
          <MetadataItem label="SOURCE" value={rule.sourceId} />
          <MetadataItem label="FILE PATH" value={rule.filePath} />
          {rule.metadata.version && <MetadataItem label="VERSION" value={rule.metadata.version} />}
          {rule.metadata.author && <MetadataItem label="AUTHOR" value={rule.metadata.author} />}
          {rule.metadata.priority && (
            <MetadataItem
              label="PRIORITY"
              value={
                <span className={`priority-text priority-${rule.metadata.priority.toLowerCase()}`}>
                  <PriorityIcon priority={rule.metadata.priority as 'high' | 'medium' | 'low'} />
                  <span>{rule.metadata.priority}</span>
                </span>
              }
            />
          )}
        </MetadataGrid>
      </Section>

      {/* 描述区域 */}
      {rule.metadata.description && (
        <Section title="Description" icon="📝">
          <div className="description-box">{rule.metadata.description}</div>
        </Section>
      )}

      {/* 标签区域 */}
      {rule.metadata.tags && rule.metadata.tags.length > 0 && (
        <Section title="Tags" icon="🏷️">
          <TagsContainer>
            {rule.metadata.tags.map((tag) => (
              <Tag key={tag} onClick={() => handleSearchByTag(tag)} title="Click to search">
                {tag}
              </Tag>
            ))}
          </TagsContainer>
        </Section>
      )}

      {/* 内容预览 */}
      <Section
        title="Content Preview"
        icon="📄"
        actions={
          <div className="content-actions">
            <button
              className="button-icon"
              onClick={handleToggleContentView}
              title="Toggle between raw and rendered view"
            >
              {isRenderedView ? '📝 Raw' : '🔄 Render'}
            </button>
            <button className="button-icon" onClick={handleCopyContent} title="Copy content">
              📋
            </button>
          </div>
        }
      >
        <div className="content-preview">
          {!isRenderedView ? (
            <pre className="code-block">
              <code>{rule.content}</code>
            </pre>
          ) : (
            <div
              className="rendered-content"
              dangerouslySetInnerHTML={{ __html: renderedHtml || '' }}
            />
          )}
        </div>
      </Section>

      {/* 其他元数据 */}
      {renderAdditionalMetadata(rule.metadata)}
    </div>
  );
};
