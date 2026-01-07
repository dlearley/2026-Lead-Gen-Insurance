// ========================================
// AI COPILOT TYPES
// ========================================

export type CopilotSuggestionType =
  | 'response_template'
  | 'next_action'
  | 'objection_handling'
  | 'product_recommendation'
  | 'competitive_insight'
  | 'policy_explanation'
  | 'risk_assessment'
  | 'cross_sell'
  | 'upsell'
  | 'follow_up';

export type CopilotSuggestionPriority = 'low' | 'medium' | 'high' | 'critical';

export type CopilotSessionStatus = 'active' | 'paused' | 'completed' | 'expired';

export type CopilotFeedbackType = 'accepted' | 'rejected' | 'modified' | 'ignored';

export interface CopilotSuggestion {
  id: string;
  sessionId: string;
  type: CopilotSuggestionType;
  priority: CopilotSuggestionPriority;
  title: string;
  content: string;
  reasoning?: string;
  confidence: number;
  context?: Record<string, unknown>;
  alternatives?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  expiresAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
}

export interface CopilotSession {
  id: string;
  userId: string;
  leadId?: string;
  agentId?: string;
  status: CopilotSessionStatus;
  context: CopilotContext;
  suggestions: CopilotSuggestion[];
  insights: CopilotInsight[];
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
}

export interface CopilotContext {
  leadId?: string;
  agentId?: string;
  currentPage?: string;
  leadData?: Record<string, unknown>;
  agentData?: Record<string, unknown>;
  conversationHistory?: ConversationMessage[];
  insuranceType?: string;
  stage?: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationMessage {
  role: 'agent' | 'lead' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface CopilotInsight {
  id: string;
  sessionId: string;
  type: InsightType;
  title: string;
  description: string;
  severity?: 'info' | 'warning' | 'critical';
  actionable: boolean;
  recommendedActions?: string[];
  data?: Record<string, unknown>;
  createdAt: Date;
}

export type InsightType =
  | 'risk_alert'
  | 'opportunity'
  | 'competitive_intelligence'
  | 'policy_gap'
  | 'price_sensitivity'
  | 'churn_risk'
  | 'upsell_opportunity'
  | 'engagement_pattern'
  | 'sentiment_analysis'
  | 'compliance_issue';

export interface RealTimeInsight {
  id: string;
  type: InsightType;
  leadId?: string;
  agentId?: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  actionable: boolean;
  actions?: InsightAction[];
  data?: Record<string, unknown>;
  timestamp: Date;
}

export interface InsightAction {
  id: string;
  label: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface CopilotFeedback {
  id: string;
  suggestionId: string;
  userId: string;
  feedbackType: CopilotFeedbackType;
  rating?: number;
  comment?: string;
  modificationsApplied?: string;
  createdAt: Date;
}

// Request/Response DTOs

export interface CreateCopilotSessionRequest {
  userId: string;
  context: CopilotContext;
}

export interface CreateCopilotSessionResponse {
  session: CopilotSession;
}

export interface UpdateCopilotContextRequest {
  context: Partial<CopilotContext>;
}

export interface GetSuggestionsRequest {
  sessionId: string;
  types?: CopilotSuggestionType[];
  limit?: number;
}

export interface GetSuggestionsResponse {
  suggestions: CopilotSuggestion[];
  count: number;
}

export interface ProvideFeedbackRequest {
  suggestionId: string;
  feedbackType: CopilotFeedbackType;
  rating?: number;
  comment?: string;
  modificationsApplied?: string;
}

export interface ProvideFeedbackResponse {
  feedback: CopilotFeedback;
  nextSuggestions?: CopilotSuggestion[];
}

export interface GenerateSuggestionRequest {
  sessionId: string;
  type: CopilotSuggestionType;
  context?: Record<string, unknown>;
  userInput?: string;
}

export interface GenerateSuggestionResponse {
  suggestion: CopilotSuggestion;
}

export interface GetInsightsRequest {
  sessionId?: string;
  leadId?: string;
  agentId?: string;
  types?: InsightType[];
  severity?: 'info' | 'warning' | 'critical';
  limit?: number;
}

export interface GetInsightsResponse {
  insights: RealTimeInsight[];
  count: number;
}

// WebSocket Message Types

export interface CopilotWebSocketMessage {
  type: CopilotMessageType;
  payload: unknown;
  timestamp: Date;
}

export type CopilotMessageType =
  | 'suggestion_generated'
  | 'insight_created'
  | 'context_updated'
  | 'session_started'
  | 'session_completed'
  | 'feedback_received'
  | 'error';

export interface SuggestionGeneratedMessage {
  type: 'suggestion_generated';
  payload: {
    suggestion: CopilotSuggestion;
  };
  timestamp: Date;
}

export interface InsightCreatedMessage {
  type: 'insight_created';
  payload: {
    insight: RealTimeInsight;
  };
  timestamp: Date;
}

export interface ContextUpdatedMessage {
  type: 'context_updated';
  payload: {
    context: CopilotContext;
  };
  timestamp: Date;
}

// Analytics and Metrics

export interface CopilotMetrics {
  sessionId: string;
  totalSuggestions: number;
  acceptedSuggestions: number;
  rejectedSuggestions: number;
  modifiedSuggestions: number;
  averageConfidence: number;
  averageResponseTime: number;
  topSuggestionTypes: Array<{
    type: CopilotSuggestionType;
    count: number;
  }>;
  insightsGenerated: number;
  averageFeedbackRating?: number;
}

export interface CopilotPerformanceStats {
  period: {
    start: Date;
    end: Date;
  };
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  totalSuggestions: number;
  acceptanceRate: number;
  averageSessionDuration: number;
  topPerformingSuggestionTypes: Array<{
    type: CopilotSuggestionType;
    acceptanceRate: number;
    count: number;
  }>;
  userSatisfactionScore?: number;
  impactMetrics?: {
    timesSaved: number;
    conversionsInfluenced: number;
    revenueImpact: number;
  };
}
