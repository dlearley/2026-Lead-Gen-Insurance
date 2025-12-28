import React from 'react';
import { LeadStatus } from '../types/lead';
import './StatusBadge.css';

interface StatusBadgeProps {
  status: LeadStatus;
  onClick?: () => void;
  interactive?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  onClick,
  interactive = false,
}) => {
  const statusConfig: Record<LeadStatus, { label: string; color: string; bgColor: string }> = {
    [LeadStatus.NEW]: { label: 'New', color: '#1d4ed8', bgColor: '#dbeafe' },
    [LeadStatus.CONTACTED]: { label: 'Contacted', color: '#b45309', bgColor: '#fef3c7' },
    [LeadStatus.QUALIFIED]: { label: 'Qualified', color: '#047857', bgColor: '#d1fae5' },
    [LeadStatus.UNQUALIFIED]: { label: 'Unqualified', color: '#b91c1c', bgColor: '#fee2e2' },
    [LeadStatus.CONVERTED]: { label: 'Converted', color: '#166534', bgColor: '#dcfce7' },
    [LeadStatus.LOST]: { label: 'Lost', color: '#6b7280', bgColor: '#f3f4f6' },
  };

  const config = statusConfig[status];

  const style = {
    color: config.color,
    backgroundColor: config.bgColor,
  };

  const className = `status-badge ${interactive ? 'interactive' : ''}`;

  if (interactive && onClick) {
    return (
      <button className={className} style={style} onClick={onClick}>
        {config.label}
      </button>
    );
  }

  return (
    <span className={className} style={style}>
      {config.label}
    </span>
  );
};
