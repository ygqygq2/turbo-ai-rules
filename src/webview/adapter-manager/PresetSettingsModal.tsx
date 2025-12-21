import React, { useState } from 'react';
import { Button } from '../components/Button';
import { t } from '../utils/i18n';

export interface PresetAdapterSettings {
  id: string;
  name: string;
  sortBy: 'id' | 'priority' | 'none';
  sortOrder: 'asc' | 'desc';
}

export interface PresetSettingsModalProps {
  adapter: PresetAdapterSettings;
  onSave: (settings: PresetAdapterSettings) => void;
  onClose: () => void;
}

/**
 * 预设适配器设置弹出框组件
 */
export const PresetSettingsModal: React.FC<PresetSettingsModalProps> = ({
  adapter,
  onSave,
  onClose,
}) => {
  const [sortBy, setSortBy] = useState<'id' | 'priority' | 'none'>(adapter.sortBy || 'priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(adapter.sortOrder || 'asc');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSave({
      ...adapter,
      sortBy,
      sortOrder,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content preset-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <i className="codicon codicon-gear"></i>
            {t('adapterManager.adapterSettings', { name: adapter.name })}
          </h2>
          <button className="close-button" onClick={onClose}>
            <i className="codicon codicon-close"></i>
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {/* 排序依据 */}
          <div className="form-group">
            <label>
              <i className="codicon codicon-symbol-numeric"></i>
              {t('adapterManager.sortBy')}
            </label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="sortBy"
                  checked={sortBy === 'priority'}
                  onChange={() => setSortBy('priority')}
                />
                <span className="radio-label">{t('adapterManager.sortBy.priority')}</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="sortBy"
                  checked={sortBy === 'id'}
                  onChange={() => setSortBy('id')}
                />
                <span className="radio-label">{t('adapterManager.sortBy.id')}</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="sortBy"
                  checked={sortBy === 'none'}
                  onChange={() => setSortBy('none')}
                />
                <span className="radio-label">{t('adapterManager.sortBy.none')}</span>
              </label>
            </div>
          </div>

          {/* 排序顺序（仅当选择了排序依据时显示） */}
          {sortBy !== 'none' && (
            <div className="form-group">
              <label>
                <i className="codicon codicon-arrow-swap"></i>
                {t('adapterManager.sortOrder')}
              </label>
              <div className="radio-group">
                <label className="radio-option">
                  <input
                    type="radio"
                    name="sortOrder"
                    checked={sortOrder === 'asc'}
                    onChange={() => setSortOrder('asc')}
                  />
                  <span className="radio-label">{t('adapterManager.sortOrder.asc')}</span>
                </label>
                <label className="radio-option">
                  <input
                    type="radio"
                    name="sortOrder"
                    checked={sortOrder === 'desc'}
                    onChange={() => setSortOrder('desc')}
                  />
                  <span className="radio-label">{t('adapterManager.sortOrder.desc')}</span>
                </label>
              </div>
            </div>
          )}
        </form>

        <div className="modal-footer">
          <Button type="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="primary" icon="save" onClick={() => handleSubmit()}>
            {t('adapterManager.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};
