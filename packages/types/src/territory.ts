export type TerritoryType = 'geographic' | 'zip_code' | 'state' | 'county' | 'region' | 'custom';

export type TerritoryStatus = 'active' | 'inactive' | 'archived';

export type AssignmentRole = 'primary' | 'secondary' | 'backup';

export interface TerritoryCriteria {
  country?: string;
  states?: string[];
  counties?: string[];
  zipCodes?: string[];
  regions?: string[];
  customRules?: Record<string, any>;
}

export interface Territory {
  id: string;
  name: string;
  description?: string;
  type: TerritoryType;
  parentTerritoryId?: string;
  status: TerritoryStatus;
  criteria: TerritoryCriteria;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TerritoryAssignment {
  id: string;
  territoryId: string;
  agentId: string;
  role: AssignmentRole;
  priority: number; // 1-100, higher is more priority
  effectiveFrom: Date;
  effectiveTo?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TerritoryLeadMatch {
  leadId: string;
  territoryId: string;
  matchScore: number;
  matchReasons: string[];
}

export interface TerritoryPerformance {
  territoryId: string;
  period: { start: Date; end: Date };
  metrics: {
    totalLeads: number;
    assignedLeads: number;
    convertedLeads: number;
    conversionRate: number;
    totalRevenue: number;
    avgTimeToConvert: number;
    activeAgents: number;
  };
}

export interface TerritoryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  overlaps: string[]; // IDs of overlapping territories
}

export interface TerritoryConfig {
  allowOverlaps: boolean;
  autoAssignmentEnabled: boolean;
  defaultAssignmentRole: AssignmentRole;
  maxAgentsPerTerritory?: number;
}
