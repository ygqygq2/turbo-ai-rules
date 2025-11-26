import React from 'react';
import './MetadataGrid.css';

/**
 * 元数据项属性
 */
export interface MetadataItemProps {
  /** 标签（显示在上方） */
  label: string;
  /** 值 */
  value: React.ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * @description 单个元数据项
 */
export const MetadataItem: React.FC<MetadataItemProps> = ({ label, value, className = '' }) => {
  return (
    <div className={`metadata-item ${className}`}>
      <div className="metadata-label">{label}</div>
      <div className="metadata-value">{value}</div>
    </div>
  );
};

/**
 * 元数据网格属性
 */
export interface MetadataGridProps {
  /** 子元素（MetadataItem） */
  children: React.ReactNode;
  /** 自定义类名 */
  className?: string;
}

/**
 * @description 元数据网格容器，响应式布局
 */
export const MetadataGrid: React.FC<MetadataGridProps> = ({ children, className = '' }) => {
  return <div className={`metadata-grid ${className}`}>{children}</div>;
};
