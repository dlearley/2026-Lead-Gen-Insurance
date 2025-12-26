import React, { useState } from 'react';
import type { LeadStatus, LeadPriority } from '../types/lead';
import './LeadFilters.css';

interface LeadFiltersProps {
  filters: {
    status?: LeadStatus[];
    priority?: LeadPriority[];
    source_id?: number;
    campaign_id?: number;
    assignee_id?: number;
    unassigned?: boolean;
    date_from?: string;
    date_to?: string;
    search?: string;
  };
  sources: Array<{ id: number; name: string }>;
  campaigns: Array<{ id: number; name: string }>;
  onFilterChange: (filters: any) => void;
  onClearFilters: () => void;
}

export const LeadFilters: React.FC<LeadFiltersProps> = ({
  filters,
  sources,
  campaigns,
  onFilterChange,
  onClearFilters,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState(filters);

  const handleChange = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value || undefined };
    
    // Handle array filters
    if (key === 'status' || key === 'priority') {
      if (value && value.length > 0) {
        newFilters[key] = value;
      } else {
        delete newFilters[key];
      }
    }
    
    setLocalFilters(newFilters);
  };

  const handleApplyFilters = () => {
    onFilterChange(localFilters);
  };

  const handleClearFilters = () => {
    const emptyFilters = {};
    setLocalFilters(emptyFilters);
    onClearFilters();
  };

  const statusOptions = Object.values(LeadStatus);
  const priorityOptions = Object.values(LeadPriority);

  const activeFilterCount = Object.keys(localFilters).filter(
    (key) => localFilters[key as keyof typeof localFilters] !== undefined
  ).length;

  return (
    <div className="lead-filters">
      <div className="filters-header">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search leads..."
            value={localFilters.search || ''}
            onChange={(e) => handleChange('search', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
          />
          <button className="search-btn" onClick={handleApplyFilters}>
            🔍
          </button>
        </div>

        <div className="filters-actions">
          <button
            className={`filter-toggle ${isExpanded ? 'active' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            Filters {activeFilterCount > 0 && <span className="filter-count">{activeFilterCount}</span>}
          </button>
          
          {activeFilterCount > 0 && (
            <button className="clear-btn" onClick={handleClearFilters}>
              Clear All
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="filters-body">
          <div className="filter-group">
            <label>Status</label>
            <div className="filter-chips">
              {statusOptions.map((status) => (
                <label key={status} className="chip">
                  <input
                    type="checkbox"
                    checked={localFilters.status?.includes(status) || false}
                    onChange={(e) => {
                      const current = localFilters.status || [];
                      const newStatus = e.target.checked
                        ? [...current, status]
                        : current.filter((s) => s !== status);
                      handleChange('status', newStatus);
                    }}
                  />
                  <span>{status.replace('_', ' ')}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <label>Priority</label>
            <div className="filter-chips">
              {priorityOptions.map((priority) => (
                <label key={priority} className="chip">
                  <input
                    type="checkbox"
                    checked={localFilters.priority?.includes(priority) || false}
                    onChange={(e) => {
                      const current = localFilters.priority || [];
                      const newPriority = e.target.checked
                        ? [...current, priority]
                        : current.filter((p) => p !== priority);
                      handleChange('priority', newPriority);
                    }}
                  />
                  <span>{priority}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label>Lead Source</label>
              <select
                value={localFilters.source_id || ''}
                onChange={(e) => handleChange('source_id', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">All Sources</option>
                {sources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>Campaign</label>
              <select
                value={localFilters.campaign_id || ''}
                onChange={(e) => handleChange('campaign_id', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">All Campaigns</option>
                {campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>
                <input
                  type="checkbox"
                  checked={localFilters.unassigned || false}
                  onChange={(e) => handleChange('unassigned', e.target.checked || undefined)}
                />
                Unassigned Only
              </label>
            </div>
          </div>

          <div className="filter-row">
            <div className="filter-group">
              <label>Date From</label>
              <input
                type="date"
                value={localFilters.date_from || ''}
                onChange={(e) => handleChange('date_from', e.target.value || undefined)}
              />
            </div>

            <div className="filter-group">
              <label>Date To</label>
              <input
                type="date"
                value={localFilters.date_to || ''}
                onChange={(e) => handleChange('date_to', e.target.value || undefined)}
              />
            </div>
          </div>

          <div className="filter-actions">
            <button className="apply-btn" onClick={handleApplyFilters}>
              Apply Filters
            </button>
            <button className="reset-btn" onClick={handleClearFilters}>
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
