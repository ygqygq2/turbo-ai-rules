import React from 'react';
import { Icon } from './Icon';

export interface ButtonProps {
  children: React.ReactNode;
  type?: 'primary' | 'secondary';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  icon?: string; // Codicon name (without 'codicon-' prefix)
  iconSize?: number;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  type = 'primary',
  onClick,
  disabled,
  className,
  icon,
  iconSize = 16,
}) => (
  <button
    className={`button button-${type} ${className ?? ''}`}
    onClick={onClick}
    disabled={disabled}
  >
    {icon && <Icon icon={icon} size={iconSize} />}
    {children}
  </button>
);
