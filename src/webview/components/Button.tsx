import React from 'react';

export interface ButtonProps {
  children: React.ReactNode;
  type?: 'primary' | 'secondary';
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  type = 'primary',
  onClick,
  disabled,
  className,
}) => (
  <button
    className={`button button-${type} ${className ?? ''}`}
    onClick={onClick}
    disabled={disabled}
  >
    {children}
  </button>
);
