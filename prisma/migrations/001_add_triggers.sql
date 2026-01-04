-- Database triggers for enhanced validation and audit trail

-- Trigger to update updated_at and updated_by timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp update triggers to all tables with audit columns
CREATE TRIGGER leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER agents_updated_at
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER lead_assignments_updated_at
  BEFORE UPDATE ON lead_assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER carriers_updated_at
  BEFORE UPDATE ON carriers
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER carrier_performance_metrics_updated_at
  BEFORE UPDATE ON carrier_performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();

-- Trigger to increment version for optimistic locking
CREATE OR REPLACE FUNCTION increment_version()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.version IS NOT NULL THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_version
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

CREATE TRIGGER agents_version
  BEFORE UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

CREATE TRIGGER lead_assignments_version
  BEFORE UPDATE ON lead_assignments
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

CREATE TRIGGER carriers_version
  BEFORE UPDATE ON carriers
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

CREATE TRIGGER carrier_performance_metrics_version
  BEFORE UPDATE ON carrier_performance_metrics
  FOR EACH ROW
  EXECUTE FUNCTION increment_version();

-- Trigger to validate lead status transitions
CREATE OR REPLACE FUNCTION validate_lead_status()
RETURNS TRIGGER AS $$
DECLARE
  valid_transition BOOLEAN;
BEGIN
  valid_transition := FALSE;

  -- Define valid status transitions
  IF OLD.status = 'RECEIVED' THEN
    valid_transition := NEW.status IN ('PROCESSING', 'REJECTED');
  ELSIF OLD.status = 'PROCESSING' THEN
    valid_transition := NEW.status IN ('QUALIFIED', 'REJECTED');
  ELSIF OLD.status = 'QUALIFIED' THEN
    valid_transition := NEW.status IN ('ROUTED', 'REJECTED');
  ELSIF OLD.status = 'ROUTED' THEN
    valid_transition := NEW.status IN ('CONVERTED', 'REJECTED');
  ELSIF OLD.status = 'CONVERTED' OR OLD.status = 'REJECTED' THEN
    valid_transition := FALSE; -- No transitions allowed from final states
  END IF;

  IF NOT valid_transition THEN
    RAISE EXCEPTION 'Invalid lead status transition from % to %', OLD.status, NEW.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_status_validation
  BEFORE UPDATE OF status ON leads
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION validate_lead_status();

-- Trigger to prevent invalid partnership status transitions
CREATE OR REPLACE FUNCTION validate_partnership_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure contract dates are valid
  IF NEW.contract_end_date IS NOT NULL AND NEW.contract_end_date <= NEW.contract_start_date THEN
    RAISE EXCEPTION 'Contract end date must be after start date';
  END IF;

  -- Validate commission rate
  IF NEW.commission_rate < 0 OR NEW.commission_rate > 100 THEN
    RAISE EXCEPTION 'Commission rate must be between 0 and 100';
  END IF;

  -- Validate performance score
  IF NEW.performance_score < 0 OR NEW.performance_score > 100 THEN
    RAISE EXCEPTION 'Performance score must be between 0 and 100';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER carriers_validation
  BEFORE INSERT OR UPDATE ON carriers
  FOR EACH ROW
  EXECUTE FUNCTION validate_partnership_status();

-- Trigger to enforce agent capacity
CREATE OR REPLACE FUNCTION validate_agent_capacity()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.current_lead_count > NEW.max_lead_capacity THEN
    RAISE EXCEPTION 'Agent current lead count (%s) exceeds max capacity (%s)', 
      NEW.current_lead_count, NEW.max_lead_capacity;
  END IF;

  IF NEW.max_lead_capacity < 0 THEN
    RAISE EXCEPTION 'Max lead capacity must be positive';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER agents_capacity_validation
  BEFORE INSERT OR UPDATE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION validate_agent_capacity();

-- Trigger to prevent updates on converted/rejected leads
CREATE OR REPLACE FUNCTION prevent_final_state_updates()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IN ('CONVERTED', 'REJECTED') AND OLD.status = NEW.status THEN
    RAISE EXCEPTION 'Cannot modify leads in % status', OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_final_state_protection
  BEFORE UPDATE ON leads
  FOR EACH ROW
  WHEN (OLD.status IN ('CONVERTED', 'REJECTED'))
  EXECUTE FUNCTION prevent_final_state_updates();

-- Audit logging trigger
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log on certain tables and operations
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (entity_type, entity_id, action, changes)
    VALUES (
      TG_TABLE_NAME,
      COALESCE(NEW.id::text, OLD.id::text),
      'UPDATE',
      jsonb_build_object(
        'old', row_to_json(OLD),
        'new', row_to_json(NEW)
      )
    );
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (entity_type, entity_id, action, changes)
    VALUES (
      TG_TABLE_NAME,
      OLD.id::text,
      'DELETE',
      row_to_json(OLD)
    );
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (entity_type, entity_id, action, changes)
    VALUES (
      TG_TABLE_NAME,
      NEW.id::text,
      'INSERT',
      row_to_json(NEW)
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Apply audit logging to sensitive tables
CREATE TRIGGER leads_audit
  AFTER INSERT OR UPDATE OR DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION audit_changes();

CREATE TRIGGER agents_audit
  AFTER INSERT OR UPDATE OR DELETE ON agents
  FOR EACH ROW
  EXECUTE FUNCTION audit_changes();

CREATE TRIGGER carriers_audit
  AFTER INSERT OR UPDATE OR DELETE ON carriers
  FOR EACH ROW
  EXECUTE FUNCTION audit_changes();

-- Check constraint for lead quality score
ALTER TABLE leads ADD CONSTRAINT chk_leads_quality_score 
  CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 100));

-- Check constraint for agent rating
ALTER TABLE agents ADD CONSTRAINT chk_agents_rating 
  CHECK (rating >= 0 AND rating <= 5);

-- Check constraint for email format (basic validation)
ALTER TABLE leads ADD CONSTRAINT chk_leads_email_format
  CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

ALTER TABLE agents ADD CONSTRAINT chk_agents_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Check constraint for phone format (E.164 format validation)
ALTER TABLE leads ADD CONSTRAINT chk_leads_phone_format
  CHECK (phone IS NULL OR phone ~ '^\+?[1-9]\d{1,14}$');

ALTER TABLE agents ADD CONSTRAINT chk_agents_phone_format
  CHECK (phone ~ '^\+?[1-9]\d{1,14}$');

-- Function to prevent deletion of active leads
CREATE OR REPLACE FUNCTION prevent_active_lead_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status NOT IN ('CONVERTED', 'REJECTED') THEN
    RAISE EXCEPTION 'Cannot delete active lead with status: %', OLD.status;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER leads_prevent_deletion
  BEFORE DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION prevent_active_lead_deletion();

-- Create function to log slow queries
CREATE OR REPLACE FUNCTION log_slow_query()
RETURNS event_trigger AS $$
DECLARE
  query text;
BEGIN
  FOR query IN SELECT query FROM pg_stat_statements WHERE mean_exec_time > 500
  LOOP
    RAISE NOTICE 'Slow query detected: %', query;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
