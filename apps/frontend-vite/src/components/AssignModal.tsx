import React, { useState, useEffect } from 'react';
import type { Agent } from '../types';
import { agentApi } from '../services/agentApi';
import './AssignModal.css';

interface AssignModalProps {
  leadId?: number;
  onClose: () => void;
  onAssign: (agentId: string, reason?: string) => Promise<void>;
}

export const AssignModal: React.FC<AssignModalProps> = ({
  onClose,
  onAssign,
}) => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await agentApi.getAgents({ active: true });
      setAgents(response.agents);
    } catch (err) {
      setError('Failed to load agents. Please try again.');
      console.error('Error loading agents:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedAgentId) {
      setError('Please select an agent');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onAssign(selectedAgentId, reason || undefined);
      onClose();
    } catch (err) {
      setError('Failed to assign lead. Please try again.');
      console.error('Error assigning lead:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCapacityColor = (agent: Agent): string => {
    const percentage = (agent.currentLeadCount / agent.maxLeadCapacity) * 100;
    if (percentage >= 90) return '#ef4444';
    if (percentage >= 70) return '#f59e0b';
    return '#10b981';
  };

  const getCapacityText = (agent: Agent): string => {
    const available = agent.maxLeadCapacity - agent.currentLeadCount;
    if (available === 0) return 'Full';
    if (available <= 2) return `${available} left`;
    return `${available} available`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Assign Lead to Agent</h2>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}

          {isLoading ? (
            <div className="loading-spinner">Loading agents...</div>
          ) : agents.length === 0 ? (
            <div className="no-agents">
              No active agents available. Please add agents first.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="assign-form">
              <div className="form-group">
                <label>Select Agent</label>
                <div className="agents-list">
                  {agents.map((agent) => (
                    <div
                      key={agent.id}
                      className={`agent-option ${selectedAgentId === agent.id ? 'selected' : ''}`}
                      onClick={() => setSelectedAgentId(agent.id)}
                    >
                      <input
                        type="radio"
                        name="agent"
                        value={agent.id}
                        checked={selectedAgentId === agent.id}
                        onChange={() => setSelectedAgentId(agent.id)}
                      />
                      <div className="agent-info">
                        <div className="agent-name">
                          {agent.firstName} {agent.lastName}
                          {agent.rating > 0 && (
                            <span className="agent-rating">
                              ★ {agent.rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                        <div className="agent-email">{agent.email}</div>
                        <div className="agent-details">
                          <span className="agent-location">
                            📍 {agent.location.city}, {agent.location.state}
                          </span>
                          {agent.specializations.length > 0 && (
                            <span className="agent-specializations">
                              🏷️ {agent.specializations.join(', ')}
                            </span>
                          )}
                        </div>
                        <div className="agent-metrics">
                          <span
                            className="capacity-badge"
                            style={{ backgroundColor: getCapacityColor(agent) }}
                          >
                            {getCapacityText(agent)}
                          </span>
                          <span className="conversion-rate">
                            {agent.conversionRate > 0 ? `${(agent.conversionRate * 100).toFixed(1)}% conv` : ''}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="reason">Assignment Reason (Optional)</label>
                <textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Why are you assigning this lead to this agent?"
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
                  disabled={isSubmitting || !selectedAgentId}
                >
                  {isSubmitting ? 'Assigning...' : 'Assign Lead'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
