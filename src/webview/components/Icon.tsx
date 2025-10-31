import React from 'react';
import '@vscode/codicons/dist/codicon.css';

export interface IconProps {
  icon: string; // codicon name without 'codicon-' prefix, e.g., 'add', 'sync'
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Icon component using VSCode Codicons
 * Automatically adapts to VSCode theme (dark/light)
 *
 * @example
 * <Icon icon="add" />
 * <Icon icon="sync" size={20} />
 */
export const Icon: React.FC<IconProps> = ({ icon, size, className = '', style }) => {
  const iconStyle: React.CSSProperties = {
    ...style,
  };

  if (size) {
    iconStyle.fontSize = `${size}px`;
  }

  return <i className={`codicon codicon-${icon} ${className}`} style={iconStyle} />;
};
