import React from 'react';
import { Button } from '../components/Button';
import { t } from '../utils/i18n';

export interface AdapterCardProps {
  // id is reserved for future use (e.g., data-testid)
  id?: string;
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
  /** 排序依据（仅单文件模式） */
  sortBy?: 'id' | 'priority' | 'none';
  /** 排序顺序（仅单文件模式） */
  sortOrder?: 'asc' | 'desc';
  /** 是否为预设适配器 */
  isPreset: boolean;
  /** 切换启用状态（仅预设适配器） */
  onToggle?: () => void;
  /** 编辑（仅自定义适配器） */
  onEdit?: () => void;
  /** 删除（仅自定义适配器） */
  onDelete?: () => void;
  /** 设置（预设适配器） */
  onSettings?: () => void;
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
  sortBy,
  sortOrder,
  isPreset,
  onToggle,
  onEdit,
  onDelete,
  onSettings,
}) => {
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
                isPreset ? 'codicon-verified-filled' : 'codicon-symbol-property'
              } adapter-icon`}
            ></i>
            <h3 title={name}>{name}</h3>
            {/* 类型标签 */}
            <div className={`type-badge ${isRuleType ? 'rule-type' : 'skill-type'}`}>
              <i className={`codicon ${typeIcon}`}></i>
              <span>{typeLabel}</span>
            </div>
          </div>
          {isPreset && description && <p className="adapter-description">{description}</p>}
        </div>
        {/* 设置按钮（所有适配器都显示） */}
        {onSettings && (
          <button className="settings-button" onClick={onSettings} title={t('common.settings')}>
            <i className="codicon codicon-gear"></i>
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
            {/* 单文件模式排序选项 */}
            {format === 'single-file' && (sortBy || sortOrder) && (
              <>
                {sortBy && (
                  <div className="info-row">
                    <span className="label">
                      <i className="codicon codicon-symbol-numeric"></i>
                      {t('adapterManager.sortBy')}
                    </span>
                    <span className="value">{t(`adapterManager.sortBy.${sortBy}`)}</span>
                  </div>
                )}
                {sortOrder && (
                  <div className="info-row">
                    <span className="label">
                      <i className="codicon codicon-arrow-swap"></i>
                      {t('adapterManager.sortOrder')}
                    </span>
                    <span className="value">{t(`adapterManager.sortOrder.${sortOrder}`)}</span>
                  </div>
                )}
              </>
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
      </div>

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
