// ========================================
// SUPPORT, SLA & INCIDENT RESPONSE TYPES (Phase 13.9)
// ========================================

// ============ SUPPORT TICKET TYPES ============

export type TicketPriority = 'P0_CRITICAL' | 'P1_HIGH' | 'P2_MEDIUM' | 'P3_LOW';

export type TicketStatus = 
  | 'OPEN' 
  | 'ASSIGNED' 
  | 'IN_PROGRESS' 
  | 'WAITING_CUSTOMER' 
  | 'WAITING_INTERNAL'
  | 'RESOLVED' 
  | 'CLOSED'
  | 'CANCELLED';

export type TicketCategory = 
  | 'TECHNICAL'
  | 'BILLING'
  | 'ACCOUNT'
  | 'DATA'
  | 'INTEGRATION'
  | 'PERFORMANCE'
  | 'SECURITY'
  | 'FEATURE_REQUEST'
  | 'BUG_REPORT'
  | 'GENERAL';

export type TicketChannel = 
  | 'EMAIL'
  | 'PHONE'
  | 'CHAT'
  | 'WEB_FORM'
  | 'API'
  | 'INTERNAL';

export interface SupportTicket {
  id: string;
  ticketNumber: string; // Format: TKT-YYYYMMDD-XXXX
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  category: TicketCategory;
  channel: TicketChannel;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  assignedTo?: string;
  assignedToName?: string;
  createdBy: string;
  createdByName?: string;
  tags: string[];
  affectedSystems: string[];
  // SLA Tracking
  slaId?: string;
  responseDeadline?: Date;
  resolutionDeadline?: Date;
  responseAt?: Date;
  resolvedAt?: Date;
  slaBreached: boolean;
  slaBreachReason?: string;
  // Escalation
  escalationLevel: number;
  escalatedAt?: Date;
  escalatedTo?: string;
  escalationReason?: string;
  // Relationships
  relatedTickets: string[];
  relatedIncidents: string[];
  knowledgeBaseArticles: string[];
  // Metadata
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
  // Relations
  comments?: TicketComment[];
  updates?: TicketUpdate[];
  attachments?: TicketAttachment[];
}

export interface TicketComment {
  id: string;
  ticketId: string;
  authorId: string;
  authorName: string;
  authorRole: 'CUSTOMER' | 'AGENT' | 'ADMIN' | 'SYSTEM';
  content: string;
  isInternal: boolean;
  isSystemGenerated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketUpdate {
  id: string;
  ticketId: string;
  updatedBy: string;
  updatedByName: string;
  updateType: 'STATUS_CHANGE' | 'ASSIGNMENT' | 'PRIORITY_CHANGE' | 'ESCALATION' | 'SLA_BREACH' | 'OTHER';
  previousValue?: string;
  newValue?: string;
  notes?: string;
  createdAt: Date;
}

export interface TicketAttachment {
  id: string;
  ticketId: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  uploadedBy: string;
  uploadedByName: string;
  createdAt: Date;
}

// ============ SLA TYPES ============

export type SLAMetricType = 'RESPONSE_TIME' | 'RESOLUTION_TIME' | 'UPTIME';

export interface SLAPolicy {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  priority: TicketPriority;
  customerTier?: string; // 'ENTERPRISE' | 'PROFESSIONAL' | 'STANDARD' | 'FREE'
  // Response Times (in minutes)
  responseTimeTarget: number;
  responseTimeWarningThreshold: number; // Percentage before breach (e.g., 80)
  // Resolution Times (in minutes)
  resolutionTimeTarget: number;
  resolutionTimeWarningThreshold: number;
  // Business Hours
  applyBusinessHoursOnly: boolean;
  businessHoursStart?: string; // e.g., '09:00'
  businessHoursEnd?: string; // e.g., '17:00'
  businessDays?: number[]; // 0 = Sunday, 6 = Saturday
  timezone: string;
  // Escalation
  autoEscalateOnBreach: boolean;
  escalationChain: string[]; // User IDs
  // Notifications
  notifyOnWarning: boolean;
  notifyOnBreach: boolean;
  notificationEmails: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SLAMetric {
  id: string;
  slaId: string;
  ticketId?: string;
  incidentId?: string;
  metricType: SLAMetricType;
  targetValue: number;
  actualValue: number;
  unit: 'MINUTES' | 'HOURS' | 'DAYS' | 'PERCENTAGE';
  isMet: boolean;
  breachTime?: Date;
  breachDuration?: number; // Minutes past target
  measuredAt: Date;
  createdAt: Date;
}

export interface SLAReport {
  period: {
    startDate: Date;
    endDate: Date;
  };
  overallMetrics: {
    totalTickets: number;
    ticketsMetSLA: number;
    ticketsBreachedSLA: number;
    complianceRate: number; // Percentage
    averageResponseTime: number; // Minutes
    averageResolutionTime: number; // Minutes
  };
  byPriority: Record<TicketPriority, {
    totalTickets: number;
    metSLA: number;
    breachedSLA: number;
    complianceRate: number;
    avgResponseTime: number;
    avgResolutionTime: number;
  }>;
  byCategory: Record<TicketCategory, {
    totalTickets: number;
    complianceRate: number;
  }>;
  topBreaches: Array<{
    ticketId: string;
    ticketNumber: string;
    breachDuration: number;
    priority: TicketPriority;
  }>;
}

// ============ INCIDENT TYPES ============

export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type IncidentStatus = 
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'IDENTIFIED'
  | 'MONITORING'
  | 'RESOLVED'
  | 'CLOSED';

export type IncidentImpact = 'WIDESPREAD' | 'MAJOR' | 'MINOR' | 'MINIMAL';

export type IncidentCategory = 
  | 'OUTAGE'
  | 'DEGRADATION'
  | 'SECURITY_BREACH'
  | 'DATA_LOSS'
  | 'DATA_CORRUPTION'
  | 'INFRASTRUCTURE'
  | 'APPLICATION'
  | 'NETWORK'
  | 'DATABASE'
  | 'THIRD_PARTY';

export interface Incident {
  id: string;
  incidentNumber: string; // Format: INC-YYYYMMDD-XXXX
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  category: IncidentCategory;
  impact: IncidentImpact;
  // Systems & Services
  affectedSystems: string[];
  affectedServices: string[];
  affectedCustomers: number;
  affectedAgents: number;
  // Personnel
  incidentCommander?: string;
  incidentCommanderName?: string;
  assignedTeam: string[];
  reportedBy: string;
  reportedByName?: string;
  // Timeline
  detectedAt: Date;
  acknowledgedAt?: Date;
  mitigatedAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  // Response & Resolution
  rootCause?: string;
  resolution?: string;
  preventiveMeasures?: string[];
  // SLA
  responseTimeTarget: number; // Minutes
  resolutionTimeTarget: number; // Minutes
  responseTimeActual?: number;
  resolutionTimeActual?: number;
  slaBreached: boolean;
  // Communication
  customerNotificationSent: boolean;
  customerNotificationAt?: Date;
  statusPageUpdated: boolean;
  statusPageUrl?: string;
  // Post-Mortem
  postMortemRequired: boolean;
  postMortemCompleted: boolean;
  postMortemUrl?: string;
  postMortemCompletedAt?: Date;
  // Metadata
  tags: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  // Relations
  relatedTickets: string[];
  timeline?: IncidentTimelineEntry[];
  updates?: IncidentUpdate[];
}

export interface IncidentTimelineEntry {
  id: string;
  incidentId: string;
  timestamp: Date;
  eventType: 
    | 'DETECTED'
    | 'ACKNOWLEDGED'
    | 'UPDATE'
    | 'ESCALATION'
    | 'MITIGATION'
    | 'RESOLVED'
    | 'CUSTOMER_NOTIFICATION'
    | 'SYSTEM_CHANGE'
    | 'OTHER';
  description: string;
  performedBy: string;
  performedByName?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface IncidentUpdate {
  id: string;
  incidentId: string;
  updateType: 'STATUS' | 'INVESTIGATION' | 'MITIGATION' | 'RESOLUTION' | 'GENERAL';
  title: string;
  description: string;
  isPublic: boolean; // For status page
  createdBy: string;
  createdByName?: string;
  createdAt: Date;
}

export interface IncidentPostMortem {
  id: string;
  incidentId: string;
  title: string;
  summary: string;
  timeline: string;
  rootCause: string;
  contributingFactors: string[];
  impact: {
    downtime: number; // Minutes
    affectedCustomers: number;
    financialImpact?: number;
    reputationalImpact?: string;
  };
  resolution: string;
  lessonsLearned: string[];
  actionItems: Array<{
    description: string;
    owner: string;
    dueDate: Date;
    status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  }>;
  preventiveMeasures: string[];
  createdBy: string;
  reviewedBy?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ============ KNOWLEDGE BASE TYPES ============

export type KBArticleStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export type KBArticleCategory = 
  | 'TROUBLESHOOTING'
  | 'HOW_TO'
  | 'FAQ'
  | 'KNOWN_ISSUE'
  | 'PRODUCT_GUIDE'
  | 'API_DOCUMENTATION'
  | 'BEST_PRACTICES';

export interface KnowledgeBaseArticle {
  id: string;
  articleNumber: string; // Format: KB-XXXX
  title: string;
  summary: string;
  content: string;
  category: KBArticleCategory;
  status: KBArticleStatus;
  tags: string[];
  keywords: string[];
  // Related Items
  relatedArticles: string[];
  relatedTickets: string[];
  relatedIncidents: string[];
  // Metadata
  views: number;
  helpfulCount: number;
  notHelpfulCount: number;
  rating: number; // 1-5
  ratingCount: number;
  // Publishing
  author: string;
  authorName?: string;
  lastModifiedBy?: string;
  publishedAt?: Date;
  archivedAt?: Date;
  // Search & Discovery
  searchBoost: number; // For search ranking
  isPinned: boolean;
  isInternal: boolean; // Internal use only
  createdAt: Date;
  updatedAt: Date;
}

export interface KBArticleFeedback {
  id: string;
  articleId: string;
  userId?: string;
  userName?: string;
  isHelpful: boolean;
  rating?: number; // 1-5
  comment?: string;
  createdAt: Date;
}

// ============ ESCALATION TYPES ============

export interface EscalationRule {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  // Trigger Conditions
  priority?: TicketPriority;
  category?: TicketCategory;
  slaBreachThreshold: number; // Minutes before deadline
  autoEscalate: boolean;
  // Escalation Chain
  escalationLevels: Array<{
    level: number;
    escalateToUserIds: string[];
    escalateToRoles: string[];
    escalateAfterMinutes: number;
    notificationTemplate: string;
  }>;
  // Notifications
  notifyCustomer: boolean;
  notifyManagement: boolean;
  notificationEmails: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EscalationHistory {
  id: string;
  ticketId?: string;
  incidentId?: string;
  escalationRuleId?: string;
  fromLevel: number;
  toLevel: number;
  escalatedBy: string;
  escalatedByName?: string;
  escalatedTo: string[];
  escalationReason: string;
  isAutomatic: boolean;
  notificationsSent: string[];
  createdAt: Date;
}

// ============ SUPPORT ANALYTICS TYPES ============

export interface SupportAnalytics {
  period: {
    startDate: Date;
    endDate: Date;
  };
  ticketMetrics: {
    totalTickets: number;
    openTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    averageResolutionTime: number; // Minutes
    averageResponseTime: number; // Minutes
    firstContactResolutionRate: number; // Percentage
    reopenRate: number; // Percentage
  };
  slaMetrics: {
    overallCompliance: number; // Percentage
    responseCompliance: number;
    resolutionCompliance: number;
    breachedTickets: number;
  };
  byPriority: Record<TicketPriority, {
    count: number;
    avgResolutionTime: number;
  }>;
  byCategory: Record<TicketCategory, {
    count: number;
    percentage: number;
  }>;
  byChannel: Record<TicketChannel, {
    count: number;
    percentage: number;
  }>;
  agentPerformance: Array<{
    agentId: string;
    agentName: string;
    ticketsResolved: number;
    avgResolutionTime: number;
    avgResponseTime: number;
    customerSatisfaction: number;
  }>;
  incidentMetrics: {
    totalIncidents: number;
    criticalIncidents: number;
    averageResolutionTime: number;
    mttr: number; // Mean Time To Resolve
    mtta: number; // Mean Time To Acknowledge
  };
  customerSatisfaction: {
    averageRating: number; // 1-5
    totalResponses: number;
    nps: number; // Net Promoter Score
  };
}

export interface AgentPerformanceReport {
  agentId: string;
  agentName: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  metrics: {
    ticketsAssigned: number;
    ticketsResolved: number;
    ticketsEscalated: number;
    averageResponseTime: number;
    averageResolutionTime: number;
    firstContactResolution: number;
    customerSatisfactionScore: number;
    slaComplianceRate: number;
  };
  performanceScore: number; // 0-100
  strengths: string[];
  improvementAreas: string[];
}

// ============ DTOs ============

export interface CreateTicketDto {
  title: string;
  description: string;
  priority: TicketPriority;
  category: TicketCategory;
  channel?: TicketChannel;
  customerId?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  tags?: string[];
  affectedSystems?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateTicketDto {
  title?: string;
  description?: string;
  priority?: TicketPriority;
  status?: TicketStatus;
  category?: TicketCategory;
  assignedTo?: string;
  tags?: string[];
  affectedSystems?: string[];
  relatedTickets?: string[];
  relatedIncidents?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateIncidentDto {
  title: string;
  description: string;
  severity: IncidentSeverity;
  category: IncidentCategory;
  impact: IncidentImpact;
  affectedSystems?: string[];
  affectedServices?: string[];
  affectedCustomers?: number;
  affectedAgents?: number;
  incidentCommander?: string;
  assignedTeam?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateIncidentDto {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  category?: IncidentCategory;
  impact?: IncidentImpact;
  incidentCommander?: string;
  assignedTeam?: string[];
  rootCause?: string;
  resolution?: string;
  preventiveMeasures?: string[];
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface CreateKBArticleDto {
  title: string;
  summary: string;
  content: string;
  category: KBArticleCategory;
  tags?: string[];
  keywords?: string[];
  relatedArticles?: string[];
  isInternal?: boolean;
}

export interface UpdateKBArticleDto {
  title?: string;
  summary?: string;
  content?: string;
  category?: KBArticleCategory;
  status?: KBArticleStatus;
  tags?: string[];
  keywords?: string[];
  relatedArticles?: string[];
  isInternal?: boolean;
  searchBoost?: number;
  isPinned?: boolean;
}

export interface CreateSLAPolicyDto {
  name: string;
  description?: string;
  priority: TicketPriority;
  customerTier?: string;
  responseTimeTarget: number;
  responseTimeWarningThreshold?: number;
  resolutionTimeTarget: number;
  resolutionTimeWarningThreshold?: number;
  applyBusinessHoursOnly?: boolean;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  businessDays?: number[];
  timezone?: string;
  autoEscalateOnBreach?: boolean;
  escalationChain?: string[];
  notifyOnWarning?: boolean;
  notifyOnBreach?: boolean;
  notificationEmails?: string[];
}

export interface UpdateSLAPolicyDto {
  name?: string;
  description?: string;
  isActive?: boolean;
  responseTimeTarget?: number;
  responseTimeWarningThreshold?: number;
  resolutionTimeTarget?: number;
  resolutionTimeWarningThreshold?: number;
  applyBusinessHoursOnly?: boolean;
  businessHoursStart?: string;
  businessHoursEnd?: string;
  businessDays?: number[];
  timezone?: string;
  autoEscalateOnBreach?: boolean;
  escalationChain?: string[];
  notifyOnWarning?: boolean;
  notifyOnBreach?: boolean;
  notificationEmails?: string[];
}

// ============ FILTER PARAMS ============

export interface TicketFilterParams {
  status?: TicketStatus | TicketStatus[];
  priority?: TicketPriority | TicketPriority[];
  category?: TicketCategory | TicketCategory[];
  assignedTo?: string;
  customerId?: string;
  createdBy?: string;
  slaBreached?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IncidentFilterParams {
  status?: IncidentStatus | IncidentStatus[];
  severity?: IncidentSeverity | IncidentSeverity[];
  category?: IncidentCategory | IncidentCategory[];
  incidentCommander?: string;
  assignedTeam?: string[];
  slaBreached?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface KBArticleFilterParams {
  status?: KBArticleStatus;
  category?: KBArticleCategory | KBArticleCategory[];
  author?: string;
  isInternal?: boolean;
  isPinned?: boolean;
  search?: string;
  tags?: string[];
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
