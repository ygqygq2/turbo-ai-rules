import React from 'react';
import { Button } from '../components/Button';
import { t } from '../utils/i18n';
import type { AdapterSuite } from './AdapterManager';

interface AdapterSuiteCardProps {
  suite: AdapterSuite;
  memberNames: string[];
  variant?: 'preset' | 'custom';
  onToggle: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const AdapterSuiteCard: React.FC<AdapterSuiteCardProps> = ({
  suite,
  memberNames,
  variant = 'custom',
  onToggle,
  onEdit,
  onDelete,
}) => {
  return (
    <div className={`adapter-card ${suite.enabled ? 'enabled' : 'disabled'} custom suite-card`}>
      <div className="card-header">
        <div className="adapter-info">
          <div className="adapter-name">
            <i className="codicon codicon-group-by-ref-type adapter-icon"></i>
            <h3 title={suite.name}>{suite.name}</h3>
            <div className="type-badge suite-type">
              <i className="codicon codicon-symbol-array"></i>
              <span>{t('adapterManager.suiteMemberCount', suite.adapterIds.length)}</span>
            </div>
            <div
              className={`type-badge ${variant === 'preset' ? 'preset-suite-type' : 'custom-suite-type'}`}
            >
              <i
                className={`codicon ${variant === 'preset' ? 'codicon-verified-filled' : 'codicon-wrench'}`}
              ></i>
              <span>
                {variant === 'preset'
                  ? t('adapterManager.presetSuites')
                  : t('adapterManager.customSuites')}
              </span>
            </div>
          </div>
          {suite.description && <p className="adapter-description">{suite.description}</p>}
        </div>
      </div>

      <div className="card-body">
        <div className="info-row">
          <span className="label">
            <i className="codicon codicon-symbol-key"></i>
            {t('adapterManager.suiteId')}
          </span>
          <span className="value truncate" title={suite.id}>
            {suite.id}
          </span>
        </div>
        <div className="info-row suite-members-row">
          <span className="label">
            <i className="codicon codicon-list-unordered"></i>
            {t('adapterManager.suiteMembers')}
          </span>
          <div className="suite-member-tags">
            {memberNames.map((memberName) => (
              <span key={memberName} className="suite-member-tag" title={memberName}>
                <span className="suite-member-tag-text">{memberName}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="card-actions">
        <Button
          type={suite.enabled ? 'secondary' : 'primary'}
          icon={suite.enabled ? 'debug-pause' : 'debug-start'}
          onClick={onToggle}
        >
          {suite.enabled ? t('form.button.disable') : t('form.button.enable')}
        </Button>
        {onEdit && (
          <Button type="secondary" icon="edit" onClick={onEdit}>
            {t('form.button.edit')}
          </Button>
        )}
        {onDelete && (
          <Button type="danger" icon="trash" onClick={onDelete}>
            {t('form.button.delete')}
          </Button>
        )}
      </div>
    </div>
  );
};
