import React from 'react';

export const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => <span className={`badge ${className ?? ''}`}>{children}</span>;
