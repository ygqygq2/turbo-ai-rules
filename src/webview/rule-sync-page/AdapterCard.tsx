import React from 'react';
import { Icon } from '../components/Icon';

interface AdapterInfo {
  id: string;
  name: string;
  type: 'preset' | 'custom';
  enabled: boolean;
  outputPath: string;
  selectDisabled: boolean;
  isRuleType: boolean;
}

interface AdapterCardProps {
  adapter: AdapterInfo;
  isSelected: boolean;
  selectedRulesCount: number;
  onToggle: () => void;
}

// 适配器图标映射
const iconMap: { [key: string]: string } = {
  copilot: 'hubot',
  cursor: 'symbol-class',
  continue: 'debug-continue',
  default: 'folder',
};

/**
 * 适配器卡片组件
 */
export const AdapterCard: React.FC<AdapterCardProps> = ({
  adapter,
  isSelected,
  selectedRulesCount,
  onToggle,
}) => {
  const iconName = iconMap[adapter.id] || 'extensions';

  const handleClick = (e: React.MouseEvent) => {
    // 如果点击的是复选框，让复选框自己处理
    if ((e.target as HTMLElement).tagName === 'INPUT') {
      return;
    }
    // 如果适配器被禁用或因互斥被禁止选择，不响应点击
    if (!adapter.enabled || adapter.selectDisabled) {
      return;
    }
    onToggle();
  };

  const isDisabled = !adapter.enabled || adapter.selectDisabled;
  const disabledReason = adapter.selectDisabled
    ? adapter.isRuleType
      ? '已选择 Skills 适配器，无法选择规则适配器'
      : '已选择规则适配器，无法选择 Skills 适配器'
    : !adapter.enabled
      ? '适配器未启用'
      : '';

  return (
    <div
      className={`adapter-card ${isSelected ? 'checked' : ''} ${isDisabled ? 'disabled' : ''}`}
      onClick={handleClick}
      title={disabledReason}
    >
      <div className="adapter-card-header">
        <input
          type="checkbox"
          className="adapter-card-checkbox"
          checked={isSelected}
          disabled={isDisabled}
          onChange={onToggle}
          title={disabledReason}
        />
        <span className="adapter-card-icon">
          <Icon icon={iconName} size={16} />
        </span>
        <span className="adapter-card-name">{adapter.name}</span>
      </div>
      <div className="adapter-card-details">
        <div className="adapter-card-detail-item">
          <Icon icon="file" size={12} />
          <span>输出: {adapter.outputPath || '未配置'}</span>
        </div>
        <div className="adapter-card-detail-item">
          <Icon icon="check" size={12} />
          <span>
            将同步 <strong>{isSelected ? selectedRulesCount : 0}</strong> 条规则
          </span>
        </div>
      </div>
    </div>
  );
};
