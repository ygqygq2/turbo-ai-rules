import React from 'react';

import { Icon } from '../components/Icon';
import { t } from '../utils/i18n';

interface SuiteInfo {
  id: string;
  name: string;
  description: string;
  adapterIds: string[];
}

interface AdapterInfo {
  id: string;
  name: string;
  type: 'preset' | 'custom';
  enabled: boolean;
  outputPath: string;
  selectDisabled: boolean;
  isRuleType: boolean;
}

interface AdapterSuiteCardProps {
  suite: SuiteInfo;
  adapters: AdapterInfo[];
  isSelected: boolean;
  isIndeterminate: boolean;
  selectedAdapters: Set<string>;
  onToggleSuite: () => void;
  onToggleAdapter: (adapterId: string) => void;
}

export const AdapterSuiteCard: React.FC<AdapterSuiteCardProps> = ({
  suite,
  adapters,
  isSelected,
  isIndeterminate,
  selectedAdapters,
  onToggleSuite,
  onToggleAdapter,
}) => {
  return (
    <div className={`adapter-suite-card ${isSelected ? 'checked' : ''}`}>
      <div className="adapter-suite-header" onClick={onToggleSuite}>
        <input
          type="checkbox"
          className="adapter-card-checkbox"
          checked={isSelected}
          onClick={(event) => event.stopPropagation()}
          ref={(node) => {
            if (node) {
              node.indeterminate = isIndeterminate;
            }
          }}
          onChange={onToggleSuite}
        />
        <span className="adapter-card-icon">
          <Icon icon="extensions" size={16} />
        </span>
        <div className="adapter-suite-meta">
          <div className="adapter-card-name">{suite.name}</div>
          <div className="adapter-suite-description">{suite.description}</div>
        </div>
      </div>

      <div className="adapter-suite-children">
        {adapters.map((adapter) => (
          <label
            key={adapter.id}
            className={`adapter-suite-child ${selectedAdapters.has(adapter.id) ? 'checked' : ''} ${
              !adapter.enabled ? 'disabled' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={selectedAdapters.has(adapter.id)}
              disabled={!adapter.enabled}
              onChange={() => onToggleAdapter(adapter.id)}
            />
            <span className="adapter-suite-child-name">{adapter.name}</span>
            <span className="adapter-suite-child-path-row">
              <span className="adapter-suite-child-path">
                {adapter.outputPath || t('ruleSyncPage.suite.notConfigured')}
              </span>
              {!adapter.enabled && (
                <span className="adapter-suite-child-status">
                  {t('ruleSyncPage.adapterDisabled')}
                </span>
              )}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};
