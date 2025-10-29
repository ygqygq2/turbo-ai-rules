import React from 'react';

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}> = ({ icon, children, className }) => (
  <div className={`empty-state ${className ?? ''}`}>
    {icon && <div className="empty-icon">{icon}</div>}
    {children}
  </div>
);
