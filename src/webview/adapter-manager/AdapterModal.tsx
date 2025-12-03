import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { t } from '../utils/i18n';
import type { CustomAdapter, EditingAdapter } from './AdapterManager';

export interface AdapterModalProps {
  adapter: EditingAdapter;
  isNew: boolean;
  onSave: (adapter: CustomAdapter) => void;
  onClose: () => void;
}

/**
 * 适配器添加/编辑模态框组件
 */
export const AdapterModal: React.FC<AdapterModalProps> = ({ adapter, isNew, onSave, onClose }) => {
  // 表单状态
  const [id, setId] = useState(adapter.id || '');
  const [name, setName] = useState(adapter.name || '');
  const [outputPath, setOutputPath] = useState(adapter.outputPath || '');
  const [format, setFormat] = useState<'single-file' | 'directory'>(
    adapter.format || 'single-file',
  );
  const [isRuleType, setIsRuleType] = useState(adapter.isRuleType ?? false);
  const [singleFileTemplate, setSingleFileTemplate] = useState(adapter.singleFileTemplate || '');
  const [directoryFilePattern, setDirectoryFilePattern] = useState(
    adapter.directoryStructure?.filePattern || '',
  );
  const [directoryPathTemplate, setDirectoryPathTemplate] = useState(
    adapter.directoryStructure?.pathTemplate || '',
  );
  // 新增字段
  const [fileExtensions, setFileExtensions] = useState(adapter.fileExtensions?.join(', ') || '');
  const [organizeBySource, setOrganizeBySource] = useState(adapter.organizeBySource ?? true);
  const [generateIndex, setGenerateIndex] = useState(adapter.generateIndex ?? false);

  // 验证状态
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 当 id 变更时，自动生成建议名称
  useEffect(() => {
    if (isNew && id && !name) {
      // 将 kebab-case 转换为 Title Case
      const suggestedName = id
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      setName(suggestedName);
    }
  }, [id, isNew, name]);

  /**
   * @description 验证表单
   * @return default {boolean}
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // ID 验证（新增时必填）
    if (isNew) {
      if (!id.trim()) {
        newErrors.id = t('adapterManager.idRequired');
      } else if (!/^[a-z0-9-]+$/.test(id)) {
        newErrors.id = t('adapterManager.idInvalid');
      }
    }

    // 名称验证
    if (!name.trim()) {
      newErrors.name = t('adapterManager.nameRequired');
    }

    // 输出路径验证
    if (!outputPath.trim()) {
      newErrors.outputPath = t('adapterManager.outputPathRequired');
    }

    // 格式相关验证
    if (format === 'single-file') {
      if (!singleFileTemplate.trim()) {
        newErrors.singleFileTemplate = t('adapterManager.templateRequired');
      }
    } else {
      if (!directoryFilePattern.trim()) {
        newErrors.directoryFilePattern = t('adapterManager.filePatternRequired');
      }
      if (!directoryPathTemplate.trim()) {
        newErrors.directoryPathTemplate = t('adapterManager.pathTemplateRequired');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * @description 提交表单
   */
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!validateForm()) {
      return;
    }

    // 解析文件扩展名
    const parsedExtensions = fileExtensions
      .split(',')
      .map((ext) => ext.trim())
      .filter((ext) => ext.length > 0);

    const newAdapter: CustomAdapter = {
      id: isNew ? id : adapter.id!,
      name,
      outputPath,
      format,
      isRuleType,
      fileExtensions: parsedExtensions.length > 0 ? parsedExtensions : undefined,
      organizeBySource: format === 'directory' ? organizeBySource : undefined,
      generateIndex: format === 'directory' ? generateIndex : undefined,
      ...(format === 'single-file'
        ? { singleFileTemplate }
        : {
            directoryStructure: {
              filePattern: directoryFilePattern,
              pathTemplate: directoryPathTemplate,
            },
          }),
    };

    onSave(newAdapter);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <i className={`codicon ${isNew ? 'codicon-add' : 'codicon-edit'}`}></i>
            {isNew ? t('adapterManager.addCustomAdapter') : t('adapterManager.editCustomAdapter')}
          </h2>
          <button className="close-button" onClick={onClose}>
            <i className="codicon codicon-close"></i>
          </button>
        </div>

        <form className="modal-body" onSubmit={handleSubmit}>
          {/* ID 字段（仅新增时显示） */}
          {isNew && (
            <div className="form-group">
              <label htmlFor="adapter-id">
                <i className="codicon codicon-symbol-key"></i>
                {t('adapterManager.adapterId')}
                <span className="required">*</span>
              </label>
              <Input
                id="adapter-id"
                value={id}
                onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                placeholder={t('adapterManager.adapterIdPlaceholder')}
                className={errors.id ? 'error' : ''}
              />
              {errors.id && <span className="error-text">{errors.id}</span>}
              <span className="hint">{t('adapterManager.adapterIdHint')}</span>
            </div>
          )}

          {/* 名称字段 */}
          <div className="form-group">
            <label htmlFor="adapter-name">
              <i className="codicon codicon-tag"></i>
              {t('adapterManager.adapterName')}
              <span className="required">*</span>
            </label>
            <Input
              id="adapter-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('adapterManager.adapterNamePlaceholder')}
              className={errors.name ? 'error' : ''}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          {/* 输出路径字段 */}
          <div className="form-group">
            <label htmlFor="output-path">
              <i className="codicon codicon-folder"></i>
              {t('adapterManager.outputPath')}
              <span className="required">*</span>
            </label>
            <Input
              id="output-path"
              value={outputPath}
              onChange={(e) => setOutputPath(e.target.value)}
              placeholder={t('adapterManager.outputPathPlaceholder')}
              className={errors.outputPath ? 'error' : ''}
            />
            {errors.outputPath && <span className="error-text">{errors.outputPath}</span>}
            <span className="hint">{t('adapterManager.outputPathHint')}</span>
          </div>

          {/* 适配器类型 - isRuleType */}
          <div className="form-group">
            <label>
              <i className="codicon codicon-symbol-class"></i>
              {t('adapterManager.adapterType')}
            </label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="adapterType"
                  checked={isRuleType}
                  onChange={() => setIsRuleType(true)}
                />
                <span className="radio-label">
                  <i className="codicon codicon-law"></i>
                  {t('adapterManager.ruleType')}
                </span>
                <span className="radio-description">{t('adapterManager.ruleTypeDesc')}</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="adapterType"
                  checked={!isRuleType}
                  onChange={() => setIsRuleType(false)}
                />
                <span className="radio-label">
                  <i className="codicon codicon-tools"></i>
                  {t('adapterManager.skillType')}
                </span>
                <span className="radio-description">{t('adapterManager.skillTypeDesc')}</span>
              </label>
            </div>
          </div>

          {/* 输出格式 */}
          <div className="form-group">
            <label>
              <i className="codicon codicon-file-code"></i>
              {t('adapterManager.format')}
            </label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="format"
                  checked={format === 'single-file'}
                  onChange={() => setFormat('single-file')}
                />
                <span className="radio-label">{t('adapterManager.singleFile')}</span>
                <span className="radio-description">{t('adapterManager.singleFileDesc')}</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="format"
                  checked={format === 'directory'}
                  onChange={() => setFormat('directory')}
                />
                <span className="radio-label">{t('adapterManager.directory')}</span>
                <span className="radio-description">{t('adapterManager.directoryDesc')}</span>
              </label>
            </div>
          </div>

          {/* 文件过滤 */}
          <div className="form-group">
            <label htmlFor="file-extensions">
              <i className="codicon codicon-filter"></i>
              {t('adapterManager.fileFilter')}
            </label>
            <Input
              id="file-extensions"
              value={fileExtensions}
              onChange={(e) => setFileExtensions(e.target.value)}
              placeholder={t('adapterManager.fileFilterPlaceholder')}
            />
            <span className="hint">{t('adapterManager.fileFilterHint')}</span>
          </div>

          {/* 单文件模板 */}
          {format === 'single-file' && (
            <div className="form-group">
              <label htmlFor="single-file-template">
                <i className="codicon codicon-symbol-string"></i>
                {t('adapterManager.singleFileTemplate')}
                <span className="required">*</span>
              </label>
              <textarea
                id="single-file-template"
                value={singleFileTemplate}
                onChange={(e) => setSingleFileTemplate(e.target.value)}
                placeholder={t('adapterManager.singleFileTemplatePlaceholder')}
                className={`textarea ${errors.singleFileTemplate ? 'error' : ''}`}
                rows={6}
              />
              {errors.singleFileTemplate && (
                <span className="error-text">{errors.singleFileTemplate}</span>
              )}
              <span className="hint">{t('adapterManager.templateHint')}</span>
            </div>
          )}

          {/* 目录结构配置 */}
          {format === 'directory' && (
            <>
              <div className="form-group">
                <label htmlFor="file-pattern">
                  <i className="codicon codicon-regex"></i>
                  {t('adapterManager.filePattern')}
                  <span className="required">*</span>
                </label>
                <Input
                  id="file-pattern"
                  value={directoryFilePattern}
                  onChange={(e) => setDirectoryFilePattern(e.target.value)}
                  placeholder={t('adapterManager.filePatternPlaceholder')}
                  className={errors.directoryFilePattern ? 'error' : ''}
                />
                {errors.directoryFilePattern && (
                  <span className="error-text">{errors.directoryFilePattern}</span>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="path-template">
                  <i className="codicon codicon-folder-opened"></i>
                  {t('adapterManager.pathTemplate')}
                  <span className="required">*</span>
                </label>
                <Input
                  id="path-template"
                  value={directoryPathTemplate}
                  onChange={(e) => setDirectoryPathTemplate(e.target.value)}
                  placeholder={t('adapterManager.pathTemplatePlaceholder')}
                  className={errors.directoryPathTemplate ? 'error' : ''}
                />
                {errors.directoryPathTemplate && (
                  <span className="error-text">{errors.directoryPathTemplate}</span>
                )}
                <span className="hint">{t('adapterManager.pathTemplateHint')}</span>
              </div>

              {/* 目录选项 */}
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
                  </label>
                </div>
              </div>
            </>
          )}

          {/* 提示框 */}
          <div className="tip-box">
            <div className="tip-box-title">
              <i className="codicon codicon-lightbulb"></i>
              {t('adapterManager.tips')}
            </div>
            <ul>
              <li>{t('adapterManager.tip1')}</li>
              <li>{t('adapterManager.tip2')}</li>
              <li>{t('adapterManager.tip3')}</li>
            </ul>
          </div>
        </form>

        <div className="modal-footer">
          <Button type="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="primary" icon="save" onClick={() => handleSubmit()}>
            {isNew ? t('adapterManager.create') : t('adapterManager.save')}
          </Button>
        </div>
      </div>
    </div>
  );
};
