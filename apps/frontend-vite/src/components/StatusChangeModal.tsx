import React from 'react';
import type { LeadStatus } from '../types';
import { LeadStatus as LeadStatusEnum } from '../types';
import './StatusChangeModal.css';

interface StatusChangeModalProps {
  currentStatus: LeadStatus;
  onClose: () => void;
  onStatusChange: (newStatus: LeadStatus, reason?: string) => Promise<void>;
}

const STATUS_OPTIONS: { value: LeadStatus; label: string; description: string; icon: string }[] = [
  { value: LeadStatusEnum.NEW, label: 'New', description: 'Lead just created', icon: '✨' },
  { value: LeadStatusEnum.CONTACTED, label: 'Contacted', description: 'Agent has reached out', icon: '📞' },
  { value: LeadStatusEnum.QUALIFIED, label: 'Qualified', description: 'Lead meets qualification criteria', icon: '✅' },
  { value: LeadStatusEnum.UNQUALIFIED, label: 'Unqualified', description: 'Lead does not meet criteria', icon: '❌' },
  { value: LeadStatusEnum.CONVERTED, label: 'Converted', description: 'Lead became a customer', icon: '🎉' },
  { value: LeadStatusEnum.LOST, label: 'Lost', description: 'Lead is no longer interested', icon: '📉' },
];

export const StatusChangeModal: React.FC<StatusChangeModalProps> = ({
  currentStatus,
  onClose,
  onStatusChange,
}) => {
  const [selectedStatus, setSelectedStatus] = React.useState<LeadStatus | ''>('');
  const [reason, setReason] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedStatus) {
      setError('Please select a status');
      return;
    }

    if (selectedStatus === currentStatus) {
      setError('Please select a different status');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onStatusChange(selectedStatus, reason || undefined);
      onClose();
    } catch (err) {
      setError('Failed to change status. Please try again.');
      console.error('Error changing status:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: LeadStatus): string => {
    const colors: Record<LeadStatus, string> = {
      [LeadStatusEnum.NEW]: '#3b82f6',
      [LeadStatusEnum.CONTACTED]: '#f59e0b',
      [LeadStatusEnum.QUALIFIED]: '#10b981',
      [LeadStatusEnum.UNQUALIFIED]: '#ef4444',
      [LeadStatusEnum.CONVERTED]: '#059669',
      [LeadStatusEnum.LOST]: '#6b7280',
    };
    return colors[status];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Change Lead Status</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="status-form">
            <div className="form-group">
              <label>Current Status</label>
              <div className="current-status">
                <span
                  className="status-badge"
                  style={{ backgroundColor: getStatusColor(currentStatus) }}
                >
                  {STATUS_OPTIONS.find((s) => s.value === currentStatus)?.label}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>New Status</label>
              <div className="status-options">
                {STATUS_OPTIONS.map((status) => (
                  <div
                    key={status.value}
                    className={`status-option ${selectedStatus === status.value ? 'selected' : ''}`}
                    onClick={() => setSelectedStatus(status.value)}
                    style={
                      selectedStatus === status.value
                        ? { borderColor: getStatusColor(status.value) }
                        : undefined
                    }
                  >
                    <input
                      type="radio"
                      name="status"
                      value={status.value}
                      checked={selectedStatus === status.value}
                      onChange={() => setSelectedStatus(status.value)}
                    />
                    <div className="status-info">
                      <div className="status-header">
                        <span className="status-icon">{status.icon}</span>
                        <span className="status-label">{status.label}</span>
                      </div>
                      <span className="status-description">{status.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reason">Reason for Change (Optional)</label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why are you changing this lead's status?"
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={isSubmitting || !selectedStatus || selectedStatus === currentStatus}
              >
                {isSubmitting ? 'Changing Status...' : 'Change Status'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
