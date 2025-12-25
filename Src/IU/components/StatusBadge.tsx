
import React from 'react';

interface StatusBadgeProps {
  status: 'Started' | 'Stopped' | 'Unknown' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStyles = () => {
    switch (status) {
      case 'Started':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Stopped':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${getStyles()}`}>
      {status}
    </span>
  );
};
