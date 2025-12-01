import React from 'react';
import { t } from '../utils/i18n';
import { SourceDetails as SourceDetailsType } from './SourceManager';

/**
 * SourceDetails 组件属性
 */
interface SourceDetailsProps {
  source: SourceDetailsType;
  onEdit: () => void;
  onDelete: () => void;
  onToggle: () => void;
  onSync: () => void;
}

/**
 * 规则源详情组件
 */
export const SourceDetails: React.FC<SourceDetailsProps> = ({
  source,
  onEdit,
  onDelete,
  onToggle,
  onSync,
}) => {
  // 格式化日期
  const formatDate = (dateString: string | null) => {
    if (!dateString) return t('never');
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  // 获取认证类型文本
  const getAuthTypeText = (authType: string) => {
    switch (authType) {
      case 'none':
        return t('authType.none');
      case 'token':
        return t('authType.token');
      case 'ssh':
        return t('authType.ssh');
      default:
        return authType;
    }
  };

  return (
    <div className="source-detail-card">
      <div className="detail-section">
        <span className="detail-label">{t('form.label.name')}</span>
        <div className="detail-value">{source.name}</div>
      </div>

      <div className="detail-section">
        <span className="detail-label">{t('form.label.gitUrl')}</span>
        <div className="detail-value">
          <code>{source.gitUrl}</code>
        </div>
      </div>

      <div className="detail-section">
        <span className="detail-label">{t('form.label.branch')}</span>
        <div className="detail-value">{source.branch}</div>
      </div>

      {source.subPath && (
        <div className="detail-section">
          <span className="detail-label">{t('form.label.subPath')}</span>
          <div className="detail-value">{source.subPath}</div>
        </div>
      )}

      <div className="detail-section">
        <span className="detail-label">{t('form.label.authType')}</span>
        <div className="detail-value">{getAuthTypeText(source.authType)}</div>
      </div>

      <div className="detail-section">
        <span className="detail-label">{t('form.label.status')}</span>
        <div className="detail-value">
          {source.enabled ? (
            <>
              <i
                className="codicon codicon-pass-filled"
                style={{ color: 'var(--vscode-testing-iconPassed)', marginRight: '8px' }}
              ></i>
              {t('enabled')}
            </>
          ) : (
            <>
              <i
                className="codicon codicon-circle-slash"
                style={{ color: 'var(--vscode-descriptionForeground)', marginRight: '8px' }}
              ></i>
              {t('disabled')}
            </>
          )}
        </div>
      </div>

      <div className="detail-section">
        <span className="detail-label">{t('sourceManager.ruleCount')}</span>
        <div className="detail-value">{source.ruleCount}</div>
      </div>

      <div className="detail-section">
        <span className="detail-label">{t('sourceManager.lastSync')}</span>
        <div className="detail-value">{formatDate(source.lastSync)}</div>
      </div>

      <div className="action-buttons">
        <button className="button" onClick={onEdit}>
          <i className="codicon codicon-edit"></i> {t('form.button.edit')}
        </button>
        <button className="button-secondary" onClick={onSync}>
          <i className="codicon codicon-sync"></i> {t('sourceManager.syncNow')}
        </button>
        <button className="button-secondary" onClick={onToggle}>
          <i className={`codicon codicon-${source.enabled ? 'circle-slash' : 'check'}`}></i>{' '}
          {source.enabled ? t('form.button.disable') : t('form.button.enable')}
        </button>
        <button className="button button-danger" onClick={onDelete}>
          <i className="codicon codicon-trash"></i> {t('form.button.delete')}
        </button>
      </div>
    </div>
  );
};
