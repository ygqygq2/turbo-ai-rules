import React from 'react';
import { t } from '../utils/i18n';
import { vscodeApi } from '../utils/vscode-api';
import { Source } from './SourceManager';

/**
 * SourceList 组件属性
 */
interface SourceListProps {
  sources: Source[];
  selectedSourceId: string;
  onSelectSource: (sourceId: string) => void;
  onAddSource: () => void;
  onEditSource: () => void;
  onDeleteSource: () => void;
  onToggleSource: () => void;
  onSyncSource: () => void;
}

/**
 * 规则源列表组件
 */
export const SourceList: React.FC<SourceListProps> = ({
  sources,
  selectedSourceId,
  onSelectSource,
  onAddSource,
  onEditSource,
  onDeleteSource,
}) => {
  // 获取状态图标
  const getStatusIcon = (source: Source) => {
    if (source.enabled) {
      return <i className="codicon codicon-pass-filled status-icon" aria-label="Enabled"></i>;
    } else {
      return <i className="codicon codicon-circle-slash status-icon" aria-label="Disabled"></i>;
    }
  };

  // 处理键盘事件
  const handleKeyDown = (event: React.KeyboardEvent, sourceId: string, index: number) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelectSource(sourceId);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (index > 0) {
          const prevItem = document.querySelector(`[data-source-id="${sources[index - 1].id}"]`);
          (prevItem as HTMLElement)?.focus();
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (index < sources.length - 1) {
          const nextItem = document.querySelector(`[data-source-id="${sources[index + 1].id}"]`);
          (nextItem as HTMLElement)?.focus();
        }
        break;
      case 'Delete':
        event.preventDefault();
        onDeleteSource();
        break;
      case 'F2':
        event.preventDefault();
        onSelectSource(sourceId);
        onEditSource();
        break;
      default:
        break;
    }
  };

  // 处理右键菜单
  const handleContextMenu = (event: React.MouseEvent, sourceId: string) => {
    event.preventDefault();
    onSelectSource(sourceId);

    // 使用 VS Code API 显示上下文菜单
    // 注意：这里需要通过消息通信来触发
    vscodeApi.postMessage('showContextMenu', { sourceId });
  };

  return (
    <div className="source-list-panel">
      <div className="source-list-header">
        <span className="codicon codicon-archive"></span>{' '}
        {t('sourceManager.sources', { count: sources.length })}
      </div>

      <div className="source-list-content" role="list" aria-label="Rule sources">
        {sources.map((source, index) => (
          <div
            key={source.id}
            data-source-id={source.id}
            className={`source-item ${source.enabled ? 'enabled' : 'disabled'} ${
              selectedSourceId === source.id ? 'selected' : ''
            }`}
            role="listitem"
            aria-selected={selectedSourceId === source.id}
            tabIndex={0}
            onClick={() => onSelectSource(source.id)}
            onContextMenu={(e) => handleContextMenu(e, source.id)}
            onKeyDown={(e) => handleKeyDown(e, source.id, index)}
          >
            {getStatusIcon(source)}
            <div className="source-info">
              <div className="source-name">{source.name}</div>
              <div className="source-meta">{source.ruleCount} rules</div>
            </div>
          </div>
        ))}
      </div>

      <div className="source-list-footer">
        <button className="button" onClick={onAddSource}>
          <i className="codicon codicon-add"></i> {t('form.button.addSource')}
        </button>
      </div>
    </div>
  );
};
