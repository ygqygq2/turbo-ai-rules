import React from 'react';
import './Section.css';

/**
 * Section 组件属性
 */
export interface SectionProps {
  /** 标题 */
  title: string;
  /** 图标（emoji 或 codicon） */
  icon?: React.ReactNode;
  /** 右侧操作区 */
  actions?: React.ReactNode;
  /** 子内容 */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * @description 统一的区块组件，用于页面各部分的一致展示
 */
export const Section: React.FC<SectionProps> = ({
  title,
  icon,
  actions,
  children,
  className = '',
}) => {
  return (
    <div className={`section ${className}`}>
      <div className="section-header">
        <h2 className="section-title">
          {icon && <span className="section-title-icon">{icon}</span>}
          {title}
        </h2>
        {actions && <div className="section-actions">{actions}</div>}
      </div>
      <div className="section-content">{children}</div>
    </div>
  );
};
