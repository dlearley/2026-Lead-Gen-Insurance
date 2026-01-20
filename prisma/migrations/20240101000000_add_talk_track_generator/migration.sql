-- Talk Track Generator Database Schema Migration
-- Task 6.1: AI Talk Track Generator

-- Talk Track Enum Types
CREATE TYPE talk_track_type AS ENUM (
  'DISCOVERY',
  'DEMO',
  'CLOSING',
  'FOLLOW_UP',
  'NEGOTIATION',
  'OBJECTION_HANDLING',
  'COLD_CALL',
  'WARM_CALL',
  'PARTNERSHIP',
  'RENEWAL'
);

CREATE TYPE talk_track_tone AS ENUM (
  'PROFESSIONAL',
  'FRIENDLY',
  'FORMAL',
  'CASUAL',
  'DIRECT',
  'CONSULTATIVE'
);

CREATE TYPE talk_track_status AS ENUM (
  'DRAFT',
  'APPROVED',
  'ARCHIVED'
);

CREATE TYPE objection_type AS ENUM (
  'PRICE',
  'TIMING',
  'AUTHORITY',
  'NEED',
  'COMPETITION',
  'TRUST',
  'FEATURE',
  'IMPLEMENTATION',
  'CONTRACT',
  'SUPPORT'
);

CREATE TYPE sales_stage AS ENUM (
  'LEAD',
  'QUALIFIED',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED'
);

CREATE TYPE usage_outcome AS ENUM (
  'scheduled',
  'no_interest',
  'follow_up',
  'closed',
  'not_qualified'
);

-- Talk Tracks Table
CREATE TABLE talk_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(500) NOT NULL,
  type talk_track_type NOT NULL,
  tone talk_track_tone NOT NULL DEFAULT 'PROFESSIONAL',
  status talk_track_status NOT NULL DEFAULT 'DRAFT',
  target_audience TEXT[],
  industry TEXT[],
  product_focus TEXT[],
  estimated_duration INT, -- in minutes
  tags TEXT[],
  created_by VARCHAR(255) NOT NULL DEFAULT 'system',
  version INT NOT NULL DEFAULT 1,
  parent_id UUID REFERENCES talk_tracks(id) ON DELETE SET NULL,
  is_template BOOLEAN NOT NULL DEFAULT false,
  usage_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for talk_tracks
CREATE INDEX idx_talk_tracks_org_id ON talk_tracks(organization_id);
CREATE INDEX idx_talk_tracks_type ON talk_tracks(type);
CREATE INDEX idx_talk_tracks_tone ON talk_tracks(tone);
CREATE INDEX idx_talk_tracks_status ON talk_tracks(status);
CREATE INDEX idx_talk_tracks_is_template ON talk_tracks(is_template);
CREATE INDEX idx_talk_tracks_tags ON talk_tracks USING GIN(tags);
CREATE INDEX idx_talk_tracks_industry ON talk_tracks USING GIN(industry);
CREATE INDEX idx_talk_tracks_created_at ON talk_tracks(created_at DESC);
CREATE INDEX idx_talk_tracks_usage_count ON talk_tracks(usage_count DESC);

-- Talk Track Sections Table
CREATE TABLE talk_track_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_track_id UUID NOT NULL REFERENCES talk_tracks(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  "order" INT NOT NULL,
  content TEXT NOT NULL,
  tips TEXT[],
  key_points TEXT[],
  required_fields TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for talk_track_sections
CREATE INDEX idx_talk_track_sections_talk_track_id ON talk_track_sections(talk_track_id);
CREATE INDEX idx_talk_track_sections_order ON talk_track_sections(talk_track_id, "order");

-- Objection Handlers Table
CREATE TABLE objection_handlers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_track_id UUID REFERENCES talk_tracks(id) ON DELETE SET NULL,
  objection_type objection_type NOT NULL,
  objection TEXT NOT NULL,
  response TEXT NOT NULL,
  techniques TEXT[],
  fallback_responses TEXT[],
  confidence DECIMAL(3,2) NOT NULL DEFAULT 0.50, -- 0.00 to 1.00
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for objection_handlers
CREATE INDEX idx_objection_handlers_talk_track_id ON objection_handlers(talk_track_id);
CREATE INDEX idx_objection_handlers_objection_type ON objection_handlers(objection_type);

-- Talk Track Usage Table
CREATE TABLE talk_track_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_track_id UUID NOT NULL REFERENCES talk_tracks(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  lead_id VARCHAR(255),
  stage sales_stage NOT NULL,
  duration INT, -- in minutes
  sections_used TEXT[],
  modifications TEXT[],
  outcome usage_outcome,
  rating INT CHECK (rating >= 1 AND rating <= 5),
  helpful BOOLEAN,
  comments TEXT,
  what_worked TEXT[],
  what_didnt_work TEXT[],
  suggestions TEXT,
  used_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for talk_track_usage
CREATE INDEX idx_talk_track_usage_talk_track_id ON talk_track_usage(talk_track_id);
CREATE INDEX idx_talk_track_usage_agent_id ON talk_track_usage(agent_id);
CREATE INDEX idx_talk_track_usage_used_at ON talk_track_usage(used_at DESC);
CREATE INDEX idx_talk_track_usage_stage ON talk_track_usage(stage);
CREATE INDEX idx_talk_track_usage_outcome ON talk_track_usage(outcome);

-- Talk Track Favorites Table
CREATE TABLE talk_track_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_track_id UUID NOT NULL REFERENCES talk_tracks(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  notes TEXT,
  added_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(talk_track_id, agent_id)
);

-- Indexes for talk_track_favorites
CREATE INDEX idx_talk_track_favorites_talk_track_id ON talk_track_favorites(talk_track_id);
CREATE INDEX idx_talk_track_favorites_agent_id ON talk_track_favorites(agent_id);
CREATE INDEX idx_talk_track_favorites_added_at ON talk_track_favorites(added_at DESC);

-- Talk Track Customizations Table
CREATE TABLE talk_track_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  talk_track_id UUID NOT NULL REFERENCES talk_tracks(id) ON DELETE CASCADE,
  agent_id VARCHAR(255) NOT NULL,
  customizations JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for talk_track_customizations
CREATE INDEX idx_talk_track_customizations_talk_track_id ON talk_track_customizations(talk_track_id);
CREATE INDEX idx_talk_track_customizations_agent_id ON talk_track_customizations(agent_id);
CREATE INDEX idx_talk_track_customizations_updated_at ON talk_track_customizations(updated_at DESC);

-- Trigger for updated_at on talk_tracks
CREATE OR REPLACE FUNCTION update_talk_tracks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER talk_tracks_updated_at
  BEFORE UPDATE ON talk_tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_talk_tracks_updated_at();

-- Trigger for updated_at on objection_handlers
CREATE TRIGGER objection_handlers_updated_at
  BEFORE UPDATE ON objection_handlers
  FOR EACH ROW
  EXECUTE FUNCTION update_talk_tracks_updated_at();

-- Trigger for updated_at on talk_track_customizations
CREATE TRIGGER talk_track_customizations_updated_at
  BEFORE UPDATE ON talk_track_customizations
  FOR EACH ROW
  EXECUTE FUNCTION update_talk_tracks_updated_at();

-- Function to increment usage count
CREATE OR REPLACE FUNCTION increment_talk_track_usage_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE talk_tracks
  SET usage_count = usage_count + 1
  WHERE id = NEW.talk_track_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_usage_count
  AFTER INSERT ON talk_track_usage
  FOR EACH ROW
  EXECUTE FUNCTION increment_talk_track_usage_count();

-- Comments for documentation
COMMENT ON TABLE talk_tracks IS 'Stores AI-generated and custom sales conversation scripts (talk tracks)';
COMMENT ON TABLE talk_track_sections IS 'Stores individual sections of talk tracks with content and tips';
COMMENT ON TABLE objection_handlers IS 'Stores AI-generated objection handling responses';
COMMENT ON TABLE talk_track_usage IS 'Tracks talk track usage with agent feedback and outcomes';
COMMENT ON TABLE talk_track_favorites IS 'Stores agent favorites for quick access';
COMMENT ON TABLE talk_track_customizations IS 'Stores agent-specific customizations to talk tracks';

COMMENT ON COLUMN talk_tracks.type IS 'Type of sales conversation (DISCOVERY, DEMO, CLOSING, etc.)';
COMMENT ON COLUMN talk_tracks.tone IS 'Tone of conversation (PROFESSIONAL, FRIENDLY, etc.)';
COMMENT ON COLUMN talk_tracks.confidence IS 'AI confidence score for generated content (0-1)';
COMMENT ON COLUMN objection_handlers.confidence IS 'Effectiveness confidence score (0-1)';
COMMENT ON COLUMN talk_track_usage.outcome IS 'Result of using the talk track';
