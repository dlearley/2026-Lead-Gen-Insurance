import React, { useState, useEffect } from 'react';
import { useLeads } from '../hooks/useLeads';
import { useLeadStore } from '../store/leadStore';
import {
  LeadsTable,
  LeadFilters,
  Pagination,
  LeadForm,
  LeadDetail,
  AssignModal,
  StatusChangeModal,
} from '../components';
import { leadSourceApi } from '../services/leadSourceApi';
import { campaignApi } from '../services/campaignApi';
import { leadApi } from '../services/leadApi';
import type { Lead, LeadSource, Campaign } from '../types';
import './LeadsPage.css';

export const LeadsPage: React.FC = () => {
  const {
    leads,
    filters,
    page,
    pageSize,
    total,
    totalPages,
    sortBy,
    sortOrder,
    isLoading,
    error,
    fetchLeads,
    createLead,
    updateLead,
    deleteLead,
    setFilters,
    clearFilters,
    setPage,
    setPageSize,
    setSortBy,
    setSortOrder,
  } = useLeads();

  const [sources, setSources] = useState<LeadSource[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [viewingLead, setViewingLead] = useState<Lead | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [leadToAssign, setLeadToAssign] = useState<Lead | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load sources and campaigns
  useEffect(() => {
    const loadData = async () => {
      try {
        const [sourcesData, campaignsData] = await Promise.all([
          leadSourceApi.getSources(),
          campaignApi.getCampaigns(),
        ]);
        setSources(sourcesData);
        setCampaigns(campaignsData);
      } catch (err) {
        console.error('Failed to load sources and campaigns:', err);
      }
    };
    loadData();
  }, []);

  // Show notification
  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Handlers
  const handleFilterChange = (newFilters: any) => {
    setFilters(newFilters);
    fetchLeads();
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    fetchLeads();
  };

  const handleCreateLead = async (leadData: any) => {
    try {
      await createLead(leadData);
      setShowCreateModal(false);
      showNotification('success', 'Lead created successfully!');
    } catch (err) {
      showNotification('error', 'Failed to create lead. Please try again.');
    }
  };

  const handleUpdateLead = async (leadData: any) => {
    if (!editingLead) return;
    
    try {
      await updateLead(editingLead.id, leadData);
      setEditingLead(null);
      showNotification('success', 'Lead updated successfully!');
    } catch (err) {
      showNotification('error', 'Failed to update lead. Please try again.');
    }
  };

  const handleDeleteLead = async (lead: Lead) => {
    if (!window.confirm(`Are you sure you want to delete ${lead.full_name}?`)) {
      return;
    }

    try {
      await deleteLead(lead.id);
      showNotification('success', 'Lead deleted successfully!');
    } catch (err) {
      showNotification('error', 'Failed to delete lead. Please try again.');
    }
  };

  const handleExportLeads = async () => {
    try {
      const blob = await leadApi.exportLeads(filters, 'csv');
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `leads-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      showNotification('success', 'Leads exported successfully!');
    } catch (err) {
      showNotification('error', 'Failed to export leads. Please try again.');
    }
  };

  const handleBulkDelete = async () => {
    const selectedCount = useLeadStore.getState().selectedLeadIds.length;
    if (selectedCount === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedCount} leads?`)) {
      return;
    }

    try {
      const ids = useLeadStore.getState().selectedLeadIds;
      const result = await leadApi.bulkDelete(ids);
      
      if (result.success.length > 0) {
        showNotification('success', `Deleted ${result.success.length} leads successfully!`);
        fetchLeads();
      }
      
      if (result.failed.length > 0) {
        showNotification('error', `Failed to delete ${result.failed.length} leads.`);
      }
    } catch (err) {
      showNotification('error', 'Failed to delete leads. Please try again.');
    }
  };

  return (
    <div className="leads-page">
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
          <button onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      <header className="page-header">
        <div className="header-left">
          <h1>Leads</h1>
          <span className="lead-count">{total} total leads</span>
        </div>
        <div className="header-actions">
          <button className="export-btn" onClick={handleExportLeads} disabled={total === 0}>
            📤 Export
          </button>
          <button className="create-btn" onClick={() => setShowCreateModal(true)}>
            + Add Lead
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={fetchLeads}>Retry</button>
        </div>
      )}

      <LeadFilters
        filters={filters}
        sources={sources}
        campaigns={campaigns}
        onFilterChange={handleFilterChange}
        onClearFilters={clearFilters}
      />

      <div className="bulk-actions-bar">
        <span>{useLeadStore.getState().selectedLeadIds.length} selected</span>
        <div className="bulk-actions">
          <button
            className="bulk-action-btn"
            disabled={useLeadStore.getState().selectedLeadIds.length === 0}
            onClick={handleBulkDelete}
          >
            🗑️ Delete Selected
          </button>
        </div>
      </div>

      <LeadsTable
        leads={leads}
        selectedLeadIds={useLeadStore.getState().selectedLeadIds}
        isLoading={isLoading}
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSelectLead={(id) => useLeadStore.getState().toggleLeadSelection(id)}
        onSelectAll={() => {
          if (useLeadStore.getState().selectedLeadIds.length === leads.length) {
            useLeadStore.getState().clearSelection();
          } else {
            useLeadStore.getState().selectAllLeads();
          }
        }}
        onSort={handleSort}
        onViewLead={setViewingLead}
        onEditLead={setEditingLead}
        onDeleteLead={handleDeleteLead}
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        total={total}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          fetchLeads();
        }}
      />

      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Lead</h2>
              <button className="close-btn" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>
            <LeadForm
              sources={sources}
              campaigns={campaigns}
              onSubmit={handleCreateLead}
              onCancel={() => setShowCreateModal(false)}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {editingLead && (
        <div className="modal-overlay" onClick={() => setEditingLead(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Lead</h2>
              <button className="close-btn" onClick={() => setEditingLead(null)}>
                ✕
              </button>
            </div>
            <LeadForm
              initialData={editingLead}
              sources={sources}
              campaigns={campaigns}
              onSubmit={handleUpdateLead}
              onCancel={() => setEditingLead(null)}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {viewingLead && (
        <LeadDetail
          lead={viewingLead as any}
          onClose={() => setViewingLead(null)}
          onEdit={() => {
            setEditingLead(viewingLead);
            setViewingLead(null);
          }}
          onAssign={() => {
            setLeadToAssign(viewingLead);
            setViewingLead(null);
            setShowAssignModal(true);
          }}
          onStatusChange={() => {
            setLeadToAssign(viewingLead);
            setViewingLead(null);
            setShowStatusModal(true);
          }}
        />
      )}

      {showAssignModal && leadToAssign && (
        <AssignModal
          leadId={leadToAssign.id}
          onClose={() => {
            setShowAssignModal(false);
            setLeadToAssign(null);
          }}
          onAssign={async (agentId, reason) => {
            await leadApi.assignLead(leadToAssign.id, { assignee_id: parseInt(agentId), reason });
            showNotification('success', 'Lead assigned successfully!');
            fetchLeads();
          }}
        />
      )}

      {showStatusModal && leadToAssign && (
        <StatusChangeModal
          currentStatus={leadToAssign.status}
          onClose={() => {
            setShowStatusModal(false);
            setLeadToAssign(null);
          }}
          onStatusChange={async (newStatus, reason) => {
            await leadApi.updateLeadStatus(leadToAssign.id, { status: newStatus, reason });
            showNotification('success', 'Status changed successfully!');
            fetchLeads();
          }}
        />
      )}
    </div>
  );
};
