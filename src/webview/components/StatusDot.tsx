import React from 'react';

export const StatusDot: React.FC<{
  status: 'enabled' | 'disabled' | 'syncing' | 'error';
  className?: string;
}> = ({ status, className }) => {
  const colors = {
    enabled: 'green',
    disabled: 'gray',
    syncing: 'orange',
    error: 'red',
  };
  return <span className={`status-dot status-${colors[status]} ${className ?? ''}`}></span>;
};
