import React from 'react';
import { Icon } from './Icon';

export interface ButtonProps {
  children: React.ReactNode;
  type?: 'primary' | 'secondary' | 'danger';
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean; // 选中状态
  className?: string;
  icon?: string; // Codicon name (without 'codicon-' prefix)
  iconSize?: number;
  buttonType?: 'button' | 'submit' | 'reset'; // native button type, default 'button' to avoid accidental form submit
  title?: string; // tooltip
}

export const Button: React.FC<ButtonProps> = ({
  children,
  type = 'primary',
  onClick,
  disabled,
  selected = false,
  className,
  icon,
  iconSize = 16,
  buttonType = 'button',
  title,
}) => (
  <button
    className={`button button-${type} ${selected ? 'button-selected' : ''} ${className ?? ''}`}
    onClick={onClick}
    disabled={disabled}
    type={buttonType}
    title={title}
  >
    {icon && <Icon icon={icon} size={iconSize} />}
    {children}
  </button>
);
