import React from 'react';

export const Toolbar: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <div className={`toolbar ${className ?? ''}`}>{children}</div>;
