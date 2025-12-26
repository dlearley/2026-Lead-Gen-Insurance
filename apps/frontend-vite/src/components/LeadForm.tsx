import React, { useState } from 'react';
import { LeadStatus, LeadPriority } from '../types/lead';
import './LeadForm.css';

interface LeadFormProps {
  initialData?: Partial<any>;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  sources?: Array<{ id: number; name: string }>;
  campaigns?: Array<{ id: number; name: string }>;
}

export const LeadForm: React.FC<LeadFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  sources = [],
  campaigns = [],
}) => {
  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    phone: initialData?.phone || '',
    company: initialData?.company || '',
    job_title: initialData?.job_title || '',
    source_id: initialData?.source_id || '',
    campaign_id: initialData?.campaign_id || '',
    status: initialData?.status || LeadStatus.NEW,
    priority: initialData?.priority || LeadPriority.MEDIUM,
    notes: initialData?.notes || '',
    follow_up_date: initialData?.follow_up_date || '',
    value_estimate: initialData?.value_estimate || 0,
    insurance_type: initialData?.insurance_type || '',
    address: initialData?.address || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zip_code: initialData?.zip_code || '',
    country: initialData?.country || 'USA',
    tags: initialData?.tags || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (formData.phone && !/^[\d\s\-+()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone format';
    }
    if (formData.value_estimate < 0) {
      newErrors.value_estimate = 'Value must be positive';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      source_id: formData.source_id ? Number(formData.source_id) : undefined,
      campaign_id: formData.campaign_id ? Number(formData.campaign_id) : undefined,
      value_estimate: Number(formData.value_estimate),
    };

    await onSubmit(submitData);
  };

  return (
    <form className="lead-form" onSubmit={handleSubmit}>
      <div className="form-section">
        <h3>Basic Information</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="first_name">First Name *</label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              className={errors.first_name ? 'error' : ''}
              disabled={isLoading}
            />
            {errors.first_name && <span className="error-message">{errors.first_name}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="last_name">Last Name *</label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              className={errors.last_name ? 'error' : ''}
              disabled={isLoading}
            />
            {errors.last_name && <span className="error-message">{errors.last_name}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="email">Email *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              disabled={isLoading}
            />
            {errors.email && <span className="error-message">{errors.email}</span>}
          </div>
          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={errors.phone ? 'error' : ''}
              disabled={isLoading}
            />
            {errors.phone && <span className="error-message">{errors.phone}</span>}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="company">Company</label>
            <input
              type="text"
              id="company"
              name="company"
              value={formData.company}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="job_title">Job Title</label>
            <input
              type="text"
              id="job_title"
              name="job_title"
              value={formData.job_title}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Lead Details</h3>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="source_id">Lead Source</label>
            <select
              id="source_id"
              name="source_id"
              value={formData.source_id}
              onChange={handleChange}
              disabled={isLoading}
            >
              <option value="">Select a source</option>
              {sources.map((source) => (
                <option key={source.id} value={source.id}>
                  {source.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="campaign_id">Campaign</label>
            <select
              id="campaign_id"
              name="campaign_id"
              value={formData.campaign_id}
              onChange={handleChange}
              disabled={isLoading}
            >
              <option value="">Select a campaign</option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="status">Status</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              disabled={isLoading}
            >
              <option value={LeadStatus.NEW}>New</option>
              <option value={LeadStatus.CONTACTED}>Contacted</option>
              <option value={LeadStatus.QUALIFIED}>Qualified</option>
              <option value={LeadStatus.UNQUALIFIED}>Unqualified</option>
              <option value={LeadStatus.CONVERTED}>Converted</option>
              <option value={LeadStatus.LOST}>Lost</option>
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              disabled={isLoading}
            >
              <option value={LeadPriority.HIGH}>High</option>
              <option value={LeadPriority.MEDIUM}>Medium</option>
              <option value={LeadPriority.LOW}>Low</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="insurance_type">Insurance Type</label>
            <input
              type="text"
              id="insurance_type"
              name="insurance_type"
              value={formData.insurance_type}
              onChange={handleChange}
              placeholder="e.g., Auto, Home, Life, Health"
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="value_estimate">Estimated Value ($)</label>
            <input
              type="number"
              id="value_estimate"
              name="value_estimate"
              value={formData.value_estimate}
              onChange={handleChange}
              min="0"
              step="0.01"
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="follow_up_date">Follow-up Date</label>
            <input
              type="date"
              id="follow_up_date"
              name="follow_up_date"
              value={formData.follow_up_date}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="tags">Tags</label>
            <input
              type="text"
              id="tags"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              placeholder="Comma-separated tags"
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Address</h3>
        <div className="form-group full-width">
          <label htmlFor="address">Street Address</label>
          <input
            type="text"
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            disabled={isLoading}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="city">City</label>
            <input
              type="text"
              id="city"
              name="city"
              value={formData.city}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="state">State</label>
            <input
              type="text"
              id="state"
              name="state"
              value={formData.state}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="zip_code">ZIP Code</label>
            <input
              type="text"
              id="zip_code"
              name="zip_code"
              value={formData.zip_code}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Notes</h3>
        <div className="form-group full-width">
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            placeholder="Additional notes about this lead..."
            disabled={isLoading}
          />
        </div>
      </div>

      <div className="form-actions">
        <button type="button" onClick={onCancel} disabled={isLoading} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={isLoading} className="btn-primary">
          {isLoading ? 'Saving...' : initialData?.id ? 'Update Lead' : 'Create Lead'}
        </button>
      </div>
    </form>
  );
};
