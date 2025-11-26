import React from 'react';
import './Tag.css';

/**
 * Tag 组件属性
 */
export interface TagProps {
  /** 标签文本 */
  children: React.ReactNode;
  /** 点击事件 */
  onClick?: () => void;
  /** 样式变体 */
  variant?: 'default' | 'filter' | 'chip';
  /** 是否激活（用于过滤按钮） */
  active?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 标题提示 */
  title?: string;
  /** 图标（可选） */
  icon?: React.ReactNode;
  /** 计数（用于 chip 变体） */
  count?: number;
}

/**
 * @description 统一的标签组件，基于规则详情页的最佳实践
 * 特性：
 * - 支持 linear-gradient 渐变背景
 * - hover 动画：translateY(-2px) + box-shadow
 * - 支持多种样式变体（default, filter, chip）
 * - 可点击、可激活状态
 */
export const Tag: React.FC<TagProps> = ({
  children,
  onClick,
  variant = 'default',
  active = false,
  className = '',
  title,
  icon,
  count,
}) => {
  const baseClass = 'tag';
  const variantClass = variant !== 'default' ? `tag-${variant}` : '';
  const activeClass = active ? 'tag-active' : '';
  const clickableClass = onClick ? 'tag-clickable' : '';

  const classes = [baseClass, variantClass, activeClass, clickableClass, className]
    .filter(Boolean)
    .join(' ');

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <span
      className={classes}
      onClick={handleClick}
      onKeyPress={handleKeyPress}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title={title}
    >
      {icon && <span className="tag-icon">{icon}</span>}
      <span className="tag-text">{children}</span>
      {count !== undefined && <span className="tag-count">{count}</span>}
    </span>
  );
};

/**
 * @description 标签容器组件，用于包裹多个标签
 */
export const TagsContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  return <div className={`tags-container ${className}`}>{children}</div>;
};
