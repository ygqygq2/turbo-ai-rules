import React, { useState } from 'react';
import { Button } from '../components/Button';
import { t } from '../utils/i18n';

export interface AdapterCardProps {
  // id is reserved for future use (e.g., data-testid)
  name: string;
  description?: string;
  enabled?: boolean;
  outputPath: string;
  /** 是否为规则类型适配器 */
  isRuleType: boolean;
  /** 输出格式（自定义适配器） */
  format?: 'single-file' | 'directory';
  /** 文件过滤扩展名 */
  fileExtensions?: string[];
  /** 是否按源组织子目录 */
  organizeBySource?: boolean;
  /** 是否为预设适配器 */
  isPreset: boolean;
  /** 切换启用状态（仅预设适配器） */
  onToggle?: () => void;
  /** 编辑（仅自定义适配器） */
  onEdit?: () => void;
  /** 删除（仅自定义适配器） */
  onDelete?: () => void;
}

/**
 * 适配器卡片组件
 */
export const AdapterCard: React.FC<AdapterCardProps> = ({
  name,
  description,
  enabled = true,
  outputPath,
  isRuleType,
  format,
  fileExtensions,
  organizeBySource,
  isPreset,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const [expanded, setExpanded] = useState(false);
  const typeLabel = isRuleType ? t('adapterManager.ruleType') : t('adapterManager.skillType');
  const typeIcon = isRuleType ? 'codicon-law' : 'codicon-tools';

  return (
    <div
      className={`adapter-card ${enabled ? 'enabled' : 'disabled'} ${
        isPreset ? 'preset' : 'custom'
      }`}
    >
      {/* 卡片头部 */}
      <div className="card-header">
        <div className="adapter-info">
          <div className="adapter-name">
            <i
              className={`codicon ${
                isPreset ? 'codicon-verified-filled' : 'codicon-symbol-misc'
              } adapter-icon`}
            ></i>
            <h3>{name}</h3>
            {/* 类型标签 */}
            <div className={`type-badge ${isRuleType ? 'rule-type' : 'skill-type'}`}>
              <i className={`codicon ${typeIcon}`}></i>
              <span>{typeLabel}</span>
            </div>
          </div>
          {isPreset && description && <p className="adapter-description">{description}</p>}
        </div>
        {/* 展开/折叠按钮（仅预设适配器） */}
        {isPreset && (
          <button
            className="expand-toggle"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
          >
            <span>{t('adapterManager.detailConfig')}</span>
            <i
              className={`codicon ${expanded ? 'codicon-chevron-up' : 'codicon-chevron-down'}`}
            ></i>
          </button>
        )}
      </div>

      {/* 卡片内容 */}
      <div className="card-body">
        <div className="info-row">
          <span className="label">
            <i
              className={`codicon ${format === 'directory' ? 'codicon-folder' : 'codicon-file'}`}
            ></i>
            {t('adapterManager.outputPath')}
          </span>
          <span className="value truncate" title={outputPath}>
            {outputPath}
          </span>
        </div>
        {!isPreset && format && (
          <>
            <div className="info-row">
              <span className="label">
                <i className="codicon codicon-file-code"></i>
                {t('adapterManager.format')}
              </span>
              <span className="value">
                {format === 'single-file'
                  ? t('adapterManager.singleFile')
                  : t('adapterManager.directory')}
              </span>
            </div>
            {fileExtensions && fileExtensions.length > 0 && (
              <div className="info-row">
                <span className="label">
                  <i className="codicon codicon-filter"></i>
                  {t('adapterManager.fileFilter')}
                </span>
                <span className="value">{fileExtensions.join(', ')}</span>
              </div>
            )}
            {format === 'directory' && organizeBySource && (
              <div className="info-row">
                <span className="label">
                  <i className="codicon codicon-folder-library"></i>
                  {t('adapterManager.organizeBySource')}
                </span>
                <span className="value status-value status-enabled">
                  <i className="codicon codicon-check"></i>
                </span>
              </div>
            )}
          </>
        )}
        {/* 状态显示（预设和自定义适配器都显示） */}
        <div className="info-row">
          <span className="label">
            <i className="codicon codicon-circle-large-outline"></i>
            {t('form.label.status')}
          </span>
          <span className={`value status-value ${enabled ? 'status-enabled' : 'status-disabled'}`}>
            <i
              className={`codicon ${
                enabled ? 'codicon-pass-filled' : 'codicon-circle-large-outline'
              }`}
            ></i>
            {enabled ? t('enabled') : t('disabled')}
          </span>
        </div>
      </div>

      {/* 展开的详细配置（仅预设适配器） */}
      {isPreset && expanded && (
        <div className="adapter-options">
          <div className="option-item">
            <input type="checkbox" id={`${name}-auto-update`} defaultChecked />
            <label htmlFor={`${name}-auto-update`}>{t('adapterManager.autoUpdate')}</label>
          </div>
          <div className="option-item">
            <input type="checkbox" id={`${name}-metadata`} />
            <label htmlFor={`${name}-metadata`}>{t('adapterManager.includeMetadata')}</label>
          </div>
        </div>
      )}

      {/* 卡片操作 */}
      <div className="card-actions">
        {/* 启用/禁用按钮（预设和自定义适配器都有） */}
        <Button
          type={enabled ? 'secondary' : 'primary'}
          icon={enabled ? 'debug-pause' : 'debug-start'}
          onClick={onToggle}
        >
          {enabled ? t('form.button.disable') : t('form.button.enable')}
        </Button>
        {/* 编辑和删除按钮（仅自定义适配器） */}
        {!isPreset && (
          <>
            <Button type="secondary" icon="edit" onClick={onEdit}>
              {t('form.button.edit')}
            </Button>
            <Button type="danger" icon="trash" onClick={onDelete}>
              {t('form.button.delete')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
