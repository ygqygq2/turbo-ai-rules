import React, { useState } from 'react';
import { Button } from '../components/Button';
import { t } from '../utils/i18n';

export interface PresetAdapterSettings {
  id: string;
  name: string;
  type: 'file' | 'directory' | 'merge-json';
  isRuleType: boolean;
  sortBy: 'id' | 'priority' | 'none';
  sortOrder: 'asc' | 'desc';
  // Directory specific settings
  organizeBySource?: boolean;
  preserveDirectoryStructure?: boolean;
  relativePathBase?: 'source-subpath' | 'asset-root';
  useOriginalFilename?: boolean;
  generateIndex?: boolean;
  indexPerSource?: boolean;
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
  const [organizeBySource, setOrganizeBySource] = useState(adapter.organizeBySource ?? false);
  const [preserveDirectoryStructure, setPreserveDirectoryStructure] = useState(
    adapter.preserveDirectoryStructure ?? true,
  );
  const [relativePathBase, setRelativePathBase] = useState<'source-subpath' | 'asset-root'>(
    adapter.relativePathBase ?? 'source-subpath',
  );
  const [useOriginalFilename, setUseOriginalFilename] = useState(
    adapter.useOriginalFilename ?? true,
  );
  const [generateIndex, setGenerateIndex] = useState(adapter.generateIndex ?? true);
  const [indexPerSource, setIndexPerSource] = useState(adapter.indexPerSource ?? false);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    onSave({
      ...adapter,
      sortBy,
      sortOrder,
      organizeBySource,
      preserveDirectoryStructure,
      relativePathBase,
      useOriginalFilename,
      generateIndex,
      indexPerSource,
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content preset-settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <i className="codicon codicon-gear"></i>
            {t('adapterManager.adapterSettings', adapter.name)}
          </h2>
          <button className="close-button" onClick={onClose}>
            <i className="codicon codicon-close"></i>
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {/* 单文件类型才显示排序选项 */}
          {adapter.type === 'file' ? (
            <>
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
            </>
          ) : adapter.type === 'directory' ? (
            /* 目录类型显示目录配置选项 */
            <div className="form-group">
              <div className="checkbox-group">
                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={organizeBySource}
                    onChange={(e) => setOrganizeBySource(e.target.checked)}
                  />
                  <span className="checkbox-label">
                    <i className="codicon codicon-folder-library"></i>
                    {t('adapterManager.organizeBySource')}
                  </span>
                  <span className="checkbox-description">
                    {t('adapterManager.organizeBySourceDesc')}
                  </span>
                </label>

                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={preserveDirectoryStructure}
                    onChange={(e) => setPreserveDirectoryStructure(e.target.checked)}
                  />
                  <span className="checkbox-label">
                    <i className="codicon codicon-folder-opened"></i>
                    {t('adapterManager.preserveDirectoryStructure')}
                  </span>
                  <span className="checkbox-description">
                    {t('adapterManager.preserveDirectoryStructureDesc')}
                  </span>
                </label>

                {preserveDirectoryStructure && (
                  <div className="form-group sub-option">
                    <label>
                      <i className="codicon codicon-symbol-namespace"></i>
                      {t('adapterManager.relativePathBase')}
                    </label>
                    <div className="radio-group">
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="preset-relativePathBase"
                          checked={relativePathBase === 'source-subpath'}
                          onChange={() => setRelativePathBase('source-subpath')}
                        />
                        <span className="radio-label">
                          {t('adapterManager.relativePathBase.sourceSubpath')}
                        </span>
                      </label>
                      <label className="radio-option">
                        <input
                          type="radio"
                          name="preset-relativePathBase"
                          checked={relativePathBase === 'asset-root'}
                          onChange={() => setRelativePathBase('asset-root')}
                        />
                        <span className="radio-label">
                          {t('adapterManager.relativePathBase.assetRoot')}
                        </span>
                      </label>
                    </div>
                    <span className="checkbox-description">
                      {t('adapterManager.relativePathBaseDesc')}
                    </span>
                  </div>
                )}

                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={useOriginalFilename}
                    onChange={(e) => setUseOriginalFilename(e.target.checked)}
                  />
                  <span className="checkbox-label">
                    <i className="codicon codicon-file"></i>
                    {t('adapterManager.useOriginalFilename')}
                  </span>
                  <span className="checkbox-description">
                    {t('adapterManager.useOriginalFilenameDesc')}
                  </span>
                </label>

                <label className="checkbox-option">
                  <input
                    type="checkbox"
                    checked={generateIndex}
                    onChange={(e) => setGenerateIndex(e.target.checked)}
                  />
                  <span className="checkbox-label">
                    <i className="codicon codicon-list-tree"></i>
                    {t('adapterManager.generateIndex')}
                  </span>
                  <span className="checkbox-description">
                    {t('adapterManager.generateIndexDesc')}
                  </span>
                </label>

                {organizeBySource && generateIndex && (
                  <label className="checkbox-option sub-option">
                    <input
                      type="checkbox"
                      checked={indexPerSource}
                      onChange={(e) => setIndexPerSource(e.target.checked)}
                    />
                    <span className="checkbox-label">
                      <i className="codicon codicon-file-submodule"></i>
                      {t('adapterManager.indexPerSource')}
                    </span>
                    <span className="checkbox-description">
                      {t('adapterManager.indexPerSourceDesc')}
                    </span>
                  </label>
                )}
              </div>
            </div>
          ) : (
            <div className="form-group">
              <label>
                <i className="codicon codicon-json"></i>
                Merge JSON
              </label>
              <p className="checkbox-description">
                此预设会把结构化 JSON/YAML 片段合并到目标设置文件中；当前无额外可调参数。
              </p>
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
