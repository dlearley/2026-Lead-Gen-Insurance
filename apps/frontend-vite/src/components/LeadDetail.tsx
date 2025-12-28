import React from 'react';
import type { LeadDetail as LeadDetailType } from '../types/lead';
import { ActivityType } from '../types/lead';
import './LeadDetail.css';

interface LeadDetailProps {
  lead: LeadDetailType;
  onClose: () => void;
  onEdit: () => void;
  onAssign: () => void;
  onStatusChange: (status: string) => void;
}

export function LeadDetail({
  lead,
  onClose,
  onEdit,
  onAssign,
}: LeadDetailProps): React.ReactElement {
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  };

  const getActivityIcon = (type: ActivityType): string => {
    const icons: Record<ActivityType, string> = {
      [ActivityType.CREATED]: '✨',
      [ActivityType.UPDATED]: '📝',
      [ActivityType.ASSIGNED]: '👤',
      [ActivityType.STATUS_CHANGED]: '🔄',
      [ActivityType.DELETED]: '🗑️',
      [ActivityType.VIEWED]: '👁️',
      [ActivityType.EXPORTED]: '📤',
      [ActivityType.BULK_UPDATED]: '📋',
      [ActivityType.REASSIGNED]: '🔀',
    };
    return icons[type] || '📌';
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      new: '#3b82f6',
      contacted: '#f59e0b',
      qualified: '#10b981',
      unqualified: '#ef4444',
      converted: '#059669',
      lost: '#6b7280',
    };
    return colors[status] || '#6b7280';
  };

  return (
    <div className="lead-detail-overlay" onClick={onClose}>
      <div className="lead-detail" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <div className="header-content">
            <h2>{lead.full_name}</h2>
            <span
              className="status-badge"
              style={{ backgroundColor: getStatusColor(lead.status) }}
            >
              {lead.status.replace('_', ' ')}
            </span>
          </div>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="detail-content">
          <div className="detail-main">
            <section className="detail-section">
              <h3>Contact Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Email</span>
                  <span className="value">{lead.email}</span>
                </div>
                <div className="info-item">
                  <span className="label">Phone</span>
                  <span className="value">{lead.phone || '-'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Company</span>
                  <span className="value">{lead.company || '-'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Job Title</span>
                  <span className="value">{lead.job_title || '-'}</span>
                </div>
              </div>
            </section>

            <section className="detail-section">
              <h3>Lead Details</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">Source</span>
                  <span className="value">{lead.source_name || '-'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Campaign</span>
                  <span className="value">{lead.campaign_name || '-'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Priority</span>
                  <span className={`value priority-${lead.priority}`}>
                    {lead.priority}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">Insurance Type</span>
                  <span className="value">{lead.insurance_type || '-'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Estimated Value</span>
                  <span className="value">{formatCurrency(lead.value_estimate || 0)}</span>
                </div>
                <div className="info-item">
                  <span className="label">Follow-up Date</span>
                  <span className="value">
                    {lead.follow_up_date
                      ? new Date(lead.follow_up_date).toLocaleDateString()
                      : '-'}
                  </span>
                </div>
              </div>
            </section>

            {lead.address && (
              <section className="detail-section">
                <h3>Address</h3>
                <div className="info-grid">
                  <div className="info-item full-width">
                    <span className="value">{lead.address}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">City</span>
                    <span className="value">{lead.city || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">State</span>
                    <span className="value">{lead.state || '-'}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">ZIP Code</span>
                    <span className="value">{lead.zip_code || '-'}</span>
                  </div>
                </div>
              </section>
            )}

            {lead.notes && (
              <section className="detail-section">
                <h3>Notes</h3>
                <p className="notes-content">{lead.notes}</p>
              </section>
            )}

            <section className="detail-section">
              <h3>Activity Timeline</h3>
              <div className="activity-timeline">
                {lead.activities && lead.activities.length > 0 ? (
                  lead.activities.map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <span className="activity-icon">{getActivityIcon(activity.activity_type)}</span>
                      <div className="activity-content">
                        <p className="activity-description">{activity.description}</p>
                        <span className="activity-time">
                          {formatDate(activity.created_at)}
                          {activity.user_name && ` by ${activity.user_name}`}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="no-activities">No activities recorded</p>
                )}
              </div>
            </section>
          </div>

          <div className="detail-sidebar">
            <section className="sidebar-section">
              <h4>Quick Actions</h4>
              <button className="action-btn primary" onClick={onEdit}>
                ✏️ Edit Lead
              </button>
              <button className="action-btn secondary" onClick={onAssign}>
                👤 Assign Lead
              </button>
            </section>

            <section className="sidebar-section">
              <h4>Status History</h4>
              {lead.status_history && lead.status_history.length > 0 ? (
                <ul className="status-history-list">
                  {lead.status_history.map((sh) => (
                    <li key={sh.id} className="status-history-item">
                      <span
                        className="status-dot"
                        style={{ backgroundColor: getStatusColor(sh.new_status) }}
                      />
                      <div className="status-info">
                        <span className="status-change">
                          {sh.old_status || 'New'} → {sh.new_status}
                        </span>
                        <span className="status-date">
                          {formatDate(sh.created_at)}
                        </span>
                        {sh.reason && <span className="status-reason">{sh.reason}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-history">No status changes</p>
              )}
            </section>

            <section className="sidebar-section">
              <h4>Assignment History</h4>
              {lead.assignment_history && lead.assignment_history.length > 0 ? (
                <ul className="assignment-history-list">
                  {lead.assignment_history.map((ah) => (
                    <li key={ah.id} className="assignment-history-item">
                      <span className="assign-icon">👤</span>
                      <div className="assignment-info">
                        <span className="assignee-name">{ah.agent_name || 'Unknown'}</span>
                        <span className="assignment-date">
                          {formatDate(ah.created_at)}
                        </span>
                        {ah.reason && <span className="assignment-reason">{ah.reason}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="no-history">No assignments</p>
              )}
            </section>

            <section className="sidebar-section">
              <h4>Metadata</h4>
              <div className="metadata-list">
                <div className="metadata-item">
                  <span className="label">Created</span>
                  <span className="value">{formatDate(lead.created_at)}</span>
                </div>
                <div className="metadata-item">
                  <span className="label">Last Updated</span>
                  <span className="value">{formatDate(lead.updated_at)}</span>
                </div>
                {lead.tags && (
                  <div className="metadata-item">
                    <span className="label">Tags</span>
                    <div className="tags-list">
                      {lead.tags.split(',').map((tag, index) => (
                        <span key={index} className="tag">{tag.trim()}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
