import React, { useState, useEffect } from 'react';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { t } from '../utils/i18n';
import type { CustomAdapter, EditingAdapter } from './AdapterManager';

export interface AdapterModalProps {
  adapter: EditingAdapter;
  isNew: boolean;
  serverError?: string | null;
  onSave: (adapter: CustomAdapter) => void;
  onClose: () => void;
}

/**
 * 适配器添加/编辑模态框组件
 */
export const AdapterModal: React.FC<AdapterModalProps> = ({
  adapter,
  isNew,
  serverError,
  onSave,
  onClose,
}) => {
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
    adapter.directoryStructure?.filePattern || '*.md',
  );
  const [directoryPathTemplate, setDirectoryPathTemplate] = useState(
    adapter.directoryStructure?.pathTemplate || '{{ruleName}}.md',
  );
  // 新增字段
  const [fileExtensions, setFileExtensions] = useState(adapter.fileExtensions?.join(', ') || '');
  const [organizeBySource, setOrganizeBySource] = useState(adapter.organizeBySource ?? true);
  const [generateIndex, setGenerateIndex] = useState(adapter.generateIndex ?? false);
  const [preserveDirectoryStructure, setPreserveDirectoryStructure] = useState(
    adapter.preserveDirectoryStructure ?? false,
  );
  const [useOriginalFilename, setUseOriginalFilename] = useState(
    adapter.useOriginalFilename ?? true,
  );
  const [indexFileName, setIndexFileName] = useState(adapter.indexFileName || 'index.md');
  // 排序设置（仅单文件模式）
  const [sortBy, setSortBy] = useState<'id' | 'priority' | 'none'>(adapter.sortBy || 'priority');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>(adapter.sortOrder || 'asc');

  // 验证状态
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 跟踪用户是否手动修改过 Display Name
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);

  // 当 id 变更时，自动生成建议名称（仅当用户未手动修改过 name 时）
  useEffect(() => {
    if (isNew && id && !nameManuallyEdited) {
      // 将 kebab-case 转换为 Title Case
      const suggestedName = id
        .split('-')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      setName(suggestedName);
    }
  }, [id, isNew, nameManuallyEdited]);

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
      enabled: adapter.enabled ?? true,
      fileExtensions: parsedExtensions.length > 0 ? parsedExtensions : [],
      organizeBySource: format === 'directory' ? organizeBySource : undefined,
      generateIndex: format === 'directory' ? generateIndex : undefined,
      preserveDirectoryStructure: format === 'directory' ? preserveDirectoryStructure : undefined,
      useOriginalFilename: format === 'directory' ? useOriginalFilename : undefined,
      indexFileName: format === 'directory' && generateIndex ? indexFileName : undefined,
      sortBy: format === 'single-file' ? sortBy : undefined,
      sortOrder: format === 'single-file' ? sortOrder : undefined,
      isNew, // 传递 isNew 标志给 Provider
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

        {/* 服务器端错误提示 - 放在标题下方 */}
        {serverError && (
          <div className="modal-error-banner">
            <i className="codicon codicon-error"></i>
            <span>{serverError}</span>
          </div>
        )}

        <form className="modal-body" onSubmit={handleSubmit}>
          {/* ID 字段 */}
          <div className="form-group">
            <label htmlFor="adapter-id">
              <i className="codicon codicon-symbol-key"></i>
              {t('adapterManager.adapterId')}
              {isNew && <span className="required">*</span>}
            </label>
            <Input
              id="adapter-id"
              value={id}
              onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
              placeholder={t('adapterManager.adapterIdPlaceholder')}
              className={errors.id ? 'error' : ''}
              disabled={!isNew}
            />
            {errors.id && <span className="error-text">{errors.id}</span>}
            <span className="hint">
              {isNew ? t('adapterManager.adapterIdHint') : t('adapterManager.adapterIdReadonly')}
            </span>
          </div>

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
              onChange={(e) => {
                setName(e.target.value);
                setNameManuallyEdited(true);
              }}
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
              placeholder=""
            />
            <span className="hint">{t('adapterManager.fileFilterHint')}</span>
          </div>

          {/* 单文件模板 */}
          {format === 'single-file' && (
            <>
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

              {/* 排序设置 */}
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
                    <span className="checkbox-description">
                      {t('adapterManager.organizeBySourceDesc')}
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
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={preserveDirectoryStructure}
                      onChange={(e) => setPreserveDirectoryStructure(e.target.checked)}
                    />
                    <span className="checkbox-label">
                      <i className="codicon codicon-file-directory"></i>
                      {t('adapterManager.preserveDirectoryStructure')}
                    </span>
                    <span className="checkbox-description">
                      {t('adapterManager.preserveDirectoryStructureDesc')}
                    </span>
                  </label>
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={useOriginalFilename}
                      onChange={(e) => setUseOriginalFilename(e.target.checked)}
                    />
                    <span className="checkbox-label">
                      <i className="codicon codicon-file-text"></i>
                      {t('adapterManager.useOriginalFilename')}
                    </span>
                    <span className="checkbox-description">
                      {t('adapterManager.useOriginalFilenameDesc')}
                    </span>
                  </label>
                </div>
              </div>

              {/* 索引文件名（仅当生成索引时显示） */}
              {generateIndex && (
                <div className="form-group">
                  <label htmlFor="index-filename">
                    <i className="codicon codicon-file-code"></i>
                    {t('adapterManager.indexFileName')}
                  </label>
                  <Input
                    id="index-filename"
                    value={indexFileName}
                    onChange={(e) => setIndexFileName(e.target.value)}
                    placeholder={t('adapterManager.indexFileNamePlaceholder')}
                  />
                </div>
              )}
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
