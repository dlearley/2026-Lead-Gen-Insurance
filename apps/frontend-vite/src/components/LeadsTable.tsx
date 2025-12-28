import React from 'react';
import type { Lead } from '../types/lead';
import { LeadStatus, LeadPriority } from '../types/lead';
import './LeadsTable.css';

interface LeadsTableProps {
  leads: Lead[];
  selectedLeadIds: number[];
  isLoading: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  onSelectLead: (id: number) => void;
  onSelectAll: () => void;
  onSort: (field: string) => void;
  onViewLead: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (lead: Lead) => void;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  selectedLeadIds,
  isLoading,
  sortBy,
  sortOrder,
  onSelectLead,
  onSelectAll,
  onSort,
  onViewLead,
  onEditLead,
  onDeleteLead,
}) => {
  const getStatusClass = (status: LeadStatus): string => {
    const statusClasses: Record<LeadStatus, string> = {
      [LeadStatus.NEW]: 'status-new',
      [LeadStatus.CONTACTED]: 'status-contacted',
      [LeadStatus.QUALIFIED]: 'status-qualified',
      [LeadStatus.UNQUALIFIED]: 'status-unqualified',
      [LeadStatus.CONVERTED]: 'status-converted',
      [LeadStatus.LOST]: 'status-lost',
    };
    return statusClasses[status] || '';
  };

  const getPriorityClass = (priority: LeadPriority): string => {
    const priorityClasses: Record<LeadPriority, string> = {
      [LeadPriority.HIGH]: 'priority-high',
      [LeadPriority.MEDIUM]: 'priority-medium',
      [LeadPriority.LOW]: 'priority-low',
    };
    return priorityClasses[priority] || '';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const allSelected = leads.length > 0 && selectedLeadIds.length === leads.length;

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return null;
    return <span className="sort-icon">{sortOrder === 'asc' ? '↑' : '↓'}</span>;
  };

  if (isLoading && leads.length === 0) {
    return (
      <div className="leads-table-loading">
        <div className="loading-spinner"></div>
        <p>Loading leads...</p>
      </div>
    );
  }

  if (leads.length === 0) {
    return (
      <div className="leads-table-empty">
        <div className="empty-icon">📋</div>
        <h3>No leads found</h3>
        <p>Try adjusting your filters or create a new lead.</p>
      </div>
    );
  }

  return (
    <div className="leads-table-container">
      <table className="leads-table">
        <thead>
          <tr>
            <th className="checkbox-cell">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={onSelectAll}
              />
            </th>
            <th onClick={() => onSort('first_name')} className="sortable">
              Name {renderSortIcon('first_name')}
            </th>
            <th onClick={() => onSort('email')} className="sortable">
              Email {renderSortIcon('email')}
            </th>
            <th>Phone</th>
            <th onClick={() => onSort('company')} className="sortable">
              Company {renderSortIcon('company')}
            </th>
            <th>Source</th>
            <th onClick={() => onSort('status')} className="sortable">
              Status {renderSortIcon('status')}
            </th>
            <th onClick={() => onSort('priority')} className="sortable">
              Priority {renderSortIcon('priority')}
            </th>
            <th>Insurance</th>
            <th onClick={() => onSort('value_estimate')} className="sortable">
              Value {renderSortIcon('value_estimate')}
            </th>
            <th onClick={() => onSort('created_at')} className="sortable">
              Created {renderSortIcon('created_at')}
            </th>
            <th className="actions-cell">Actions</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr
              key={lead.id}
              className={selectedLeadIds.includes(lead.id) ? 'selected' : ''}
            >
              <td className="checkbox-cell">
                <input
                  type="checkbox"
                  checked={selectedLeadIds.includes(lead.id)}
                  onChange={() => onSelectLead(lead.id)}
                />
              </td>
              <td className="name-cell">
                <div className="lead-name">
                  <span className="first-name">{lead.first_name}</span>
                  <span className="last-name">{lead.last_name}</span>
                </div>
                {lead.assignee_name && (
                  <span className="assignee">→ {lead.assignee_name}</span>
                )}
              </td>
              <td className="email-cell">{lead.email}</td>
              <td className="phone-cell">{lead.phone || '-'}</td>
              <td className="company-cell">{lead.company || '-'}</td>
              <td className="source-cell">{lead.source_name || '-'}</td>
              <td>
                <span className={`status-badge ${getStatusClass(lead.status)}`}>
                  {lead.status.replace('_', ' ')}
                </span>
              </td>
              <td>
                <span className={`priority-badge ${getPriorityClass(lead.priority)}`}>
                  {lead.priority}
                </span>
              </td>
              <td className="insurance-cell">{lead.insurance_type || '-'}</td>
              <td className="value-cell">
                {formatCurrency(lead.value_estimate || 0)}
              </td>
              <td className="date-cell">{formatDate(lead.created_at)}</td>
              <td className="actions-cell">
                <button
                  className="action-btn view-btn"
                  onClick={() => onViewLead(lead)}
                  title="View Details"
                >
                  👁️
                </button>
                <button
                  className="action-btn edit-btn"
                  onClick={() => onEditLead(lead)}
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  className="action-btn delete-btn"
                  onClick={() => onDeleteLead(lead)}
                  title="Delete"
                >
                  🗑️
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
