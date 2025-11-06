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
  buttonType?: 'button' | 'submit' | 'reset'; // native button type, default 'button' to avoid accidental form submit
}

export const Button: React.FC<ButtonProps> = ({
  children,
  type = 'primary',
  onClick,
  disabled,
  className,
  icon,
  iconSize = 16,
  buttonType = 'button',
}) => (
  <button
    className={`button button-${type} ${className ?? ''}`}
    onClick={onClick}
    disabled={disabled}
    type={buttonType}
  >
    {icon && <Icon icon={icon} size={iconSize} />}
    {children}
  </button>
);
