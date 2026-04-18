import React, { useMemo, useState } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { t } from '../utils/i18n';
import type { AdapterSuite, EditingAdapterSuite, SuiteMemberOption } from './AdapterManager';

interface AdapterSuiteModalProps {
  suite: EditingAdapterSuite;
  isNew: boolean;
  existingSuites: AdapterSuite[];
  availableAdapters: SuiteMemberOption[];
  onSave: (suite: AdapterSuite) => void;
  onClose: () => void;
}

export const AdapterSuiteModal: React.FC<AdapterSuiteModalProps> = ({
  suite,
  isNew,
  existingSuites,
  availableAdapters,
  onSave,
  onClose,
}) => {
  const [id, setId] = useState(suite.id || '');
  const [name, setName] = useState(suite.name || '');
  const [description, setDescription] = useState(suite.description || '');
  const [enabled, setEnabled] = useState(suite.enabled ?? true);
  const [adapterIds, setAdapterIds] = useState<string[]>(suite.adapterIds || []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);

  const sortedAvailableAdapters = useMemo(
    () => [...availableAdapters].sort((a, b) => a.name.localeCompare(b.name)),
    [availableAdapters],
  );

  const toggleAdapter = (adapterId: string) => {
    setAdapterIds((prev) =>
      prev.includes(adapterId) ? prev.filter((id) => id !== adapterId) : [...prev, adapterId],
    );
  };

  const validateForm = (): boolean => {
    const nextErrors: Record<string, string> = {};

    if (isNew) {
      if (!id.trim()) {
        nextErrors.id = t('adapterManager.idRequired');
      } else if (!/^[a-z0-9-]+$/.test(id)) {
        nextErrors.id = t('adapterManager.idInvalid');
      } else if (existingSuites.some((item) => item.id === id.trim())) {
        nextErrors.id = t('adapterManager.suiteIdDuplicate');
      }
    }

    if (!name.trim()) {
      nextErrors.name = t('adapterManager.nameRequired');
    }

    if (adapterIds.length < 2) {
      nextErrors.adapterIds = t('adapterManager.suiteMinAdapters');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSave({
      id: isNew ? id.trim() : suite.id!,
      name: name.trim(),
      description: description.trim() || undefined,
      adapterIds,
      enabled,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content suite-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <i className={`codicon ${isNew ? 'codicon-add' : 'codicon-edit'}`}></i>
            {isNew ? t('adapterManager.addCustomSuite') : t('adapterManager.editCustomSuite')}
          </h2>
          <button className="close-button" onClick={onClose}>
            <i className="codicon codicon-close"></i>
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="suite-id">
              <i className="codicon codicon-symbol-key"></i>
              {t('adapterManager.suiteId')}
              {isNew && <span className="required">*</span>}
            </label>
            <Input
              id="suite-id"
              value={id}
              onChange={(e) => {
                const nextId = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                setId(nextId);
                if (isNew && nextId && !nameManuallyEdited) {
                  setName(
                    nextId
                      .split('-')
                      .filter(Boolean)
                      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' '),
                  );
                }
              }}
              placeholder={t('adapterManager.suiteIdPlaceholder')}
              className={errors.id ? 'error' : ''}
              disabled={!isNew}
            />
            {errors.id && <span className="error-text">{errors.id}</span>}
            <span className="hint">{t('adapterManager.suiteIdHint')}</span>
          </div>

          <div className="form-group">
            <label htmlFor="suite-name">
              <i className="codicon codicon-tag"></i>
              {t('adapterManager.suiteName')}
              <span className="required">*</span>
            </label>
            <Input
              id="suite-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameManuallyEdited(true);
              }}
              placeholder={t('adapterManager.suiteNamePlaceholder')}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="suite-description">
              <i className="codicon codicon-note"></i>
              {t('adapterManager.suiteDescription')}
            </label>
            <textarea
              id="suite-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('adapterManager.suiteDescriptionPlaceholder')}
              className="textarea"
              rows={3}
            />
          </div>

          <div className="form-group">
            <div className="checkbox-group">
              <label className="checkbox-option">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
                <span className="checkbox-label">
                  <i className="codicon codicon-check-all"></i>
                  {t('common.enabled')}
                </span>
                <span className="checkbox-description">{t('adapterManager.suiteEnabledDesc')}</span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label>
              <i className="codicon codicon-list-unordered"></i>
              {t('adapterManager.suiteMembers')}
              <span className="required">*</span>
            </label>
            <span className="hint">{t('adapterManager.suiteMembersHint')}</span>
            <div className="suite-member-picker">
              {sortedAvailableAdapters.map((adapter) => {
                const checked = adapterIds.includes(adapter.id);
                return (
                  <label key={adapter.id} className="checkbox-option suite-member-option">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAdapter(adapter.id)}
                    />
                    <span className="checkbox-label suite-member-label-row">
                      <span className="suite-member-name-block">
                        <span>{adapter.name}</span>
                        <span
                          className={`type-badge ${adapter.isRuleType ? 'rule-type' : 'skill-type'}`}
                        >
                          <i
                            className={`codicon ${adapter.isRuleType ? 'codicon-law' : 'codicon-tools'}`}
                          ></i>
                          <span>
                            {adapter.isRuleType
                              ? t('adapterManager.ruleType')
                              : t('adapterManager.skillType')}
                          </span>
                        </span>
                      </span>
                    </span>
                    <span className="checkbox-description suite-member-meta-row">
                      <span className="suite-member-source">
                        {adapter.source === 'preset'
                          ? t('adapterManager.presetAdapters')
                          : t('adapterManager.customAdapters')}
                      </span>
                      <span className="suite-member-path" title={adapter.outputPath}>
                        {adapter.outputPath}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.adapterIds && <span className="error-text">{errors.adapterIds}</span>}
          </div>
        </form>

        <div className="modal-footer">
          <Button type="secondary" icon="close" onClick={onClose}>
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
