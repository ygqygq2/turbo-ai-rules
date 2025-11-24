import React from 'react';

export const PriorityIcon: React.FC<{
  priority: 'high' | 'medium' | 'low';
  className?: string;
}> = ({ priority, className }) => {
  const icons = { high: '🔥', medium: '⭐', low: 'ℹ️' };
  return (
    <span className={`priority-icon priority-${priority} ${className ?? ''}`}>
      {icons[priority]}
    </span>
  );
};
