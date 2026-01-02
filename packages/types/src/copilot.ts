export interface ConversationMessage {
  id: string;
  role: 'agent' | 'lead' | 'system';
  content: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface ConversationContext {
  conversationId: string;
  agentId: string;
  leadId?: string;
  insuranceType?: string;
  messages: ConversationMessage[];
  metadata?: Record<string, unknown>;
}

export interface SentimentAnalysis {
  score: number; // -1 to 1
  label: 'positive' | 'neutral' | 'negative';
  confidence: number; // 0-100
  emotion?: string;
  keywords: string[];
}

export interface IntentDetection {
  primary: string;
  confidence: number; // 0-100
  categories: string[];
  urgency: number; // 0-100
  purchaseIntent: number; // 0-100
}

export interface EntityExtraction {
  entity: string;
  type: string; // PRODUCT, AMOUNT, DATE, CONTACT, LOCATION, POLICY, NAME, ORGANIZATION
  value: string;
  confidence: number; // 0-100
  start?: number;
  end?: number;
}

export interface ConversationAnalysis {
  sentiment: SentimentAnalysis;
  intent: IntentDetection;
  entities: EntityExtraction[];
  summary: string;
  keyTopics: string[];
  engagement: number; // 0-100
  churnRisk: number; // 0-100
}

export type RecommendationType = 'response' | 'action' | 'knowledge' | 'coaching';
export type RecommendationPriority = 'high' | 'medium' | 'low';

export interface BaseRecommendation {
  id: string;
  type: RecommendationType;
  confidence: number;
  priority: RecommendationPriority;
  timestamp: number;
}

export interface ResponseRecommendation extends BaseRecommendation {
  type: 'response';
  title: string;
  content: string;
  category?: string;
  metadata?: {
    tone?: string;
    length?: string;
    followUp?: boolean;
  };
}

export interface ActionRecommendation extends BaseRecommendation {
  type: 'action';
  title: string;
  description: string;
  action: {
    type: string;
    payload?: Record<string, unknown>;
  };
  expectedOutcome?: string;
}

export interface KnowledgeRecommendation extends BaseRecommendation {
  type: 'knowledge';
  title: string;
  content: string;
  source: string;
  relevance: number;
  category?: string;
}

export interface CoachingRecommendation extends BaseRecommendation {
  type: 'coaching';
  title: string;
  insight: string;
  suggestion: string;
  performanceArea: string;
}

export type Recommendation = 
  | ResponseRecommendation 
  | ActionRecommendation 
  | KnowledgeRecommendation 
  | CoachingRecommendation;

export interface PerformanceInsight {
  id: string;
  type: 'performance' | 'coaching' | 'trend' | 'opportunity';
  title: string;
  description: string;
  severity?: 'high' | 'medium' | 'low' | 'info';
  actionable: boolean;
  actions?: Array<{
    label: string;
    type: string;
    payload?: Record<string, unknown>;
  }>;
  metrics?: Record<string, number>;
  timestamp: number;
  validUntil?: number;
}

export interface CopilotMessage {
  type: 'message' | 'analysis' | 'recommendation' | 'insight' | 'typing' | 'system';
  payload: {
    conversationId: string;
    messageId?: string;
    content?: string;
    timestamp: number;
    metadata?: Record<string, unknown>;
  };
}

export interface WebSocketAuth {
  token: string;
  agentId: string;
  agentName?: string;
}

export interface ConversationSummary {
  conversationId: string;
  agentId: string;
  leadId?: string;
  startTime: number;
  endTime?: number;
  messageCount: number;
  finalSentiment: SentimentAnalysis;
  primaryIntent: string;
  recommendationsProvided: number;
  insightsGenerated: number;
  outcome?: 'converted' | 'follow_up' | 'not_interested' | 'disconnected';
}

export interface AgentPerformance {
  agentId: string;
  date: string;
  metrics: {
    conversationsHandled: number;
    averageResponseTime: number;
    conversionRate: number;
    customerSatisfaction: number;
    recommendationsAccepted: number;
    coachingInsightsApplied: number;
  };
  improvements: string[];
  strengths: string[];
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  source: string;
  confidence?: number;
  updatedAt: number;
  createdAt: number;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeSearchResult {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  relevance: number;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface RealTimeAnalysis {
  sentiment: SentimentAnalysis;
  intent: IntentDetection;
  entities: EntityExtraction[];
  engagement: number;
  churnRisk: number;
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: string;
  payload: any;
  timestamp: number;
  id: string;
}

export interface TypingEvent {
  conversationId: string;
  agentId: string;
  isTyping: boolean;
  role: 'agent' | 'lead';
}

export interface ReadReceiptEvent {
  messageId: string;
  conversationId: string;
  agentId: string;
  timestamp: number;
}

export interface ConversationEndEvent {
  conversationId: string;
  reason: 'completed' | 'transferred' | 'abandoned' | 'timeout';
  timestamp: number;
}

// API Response Types
export interface CopilotAnalysisResponse {
  analysis?: ConversationAnalysis;
  recommendations: Recommendation[];
  insights: PerformanceInsight[];
  streaming?: boolean;
}

export interface CopilotHealthResponse {
  uptime: number;
  message: string;
  timestamp: number;
  version: string;
  activeConversations?: number;
  activeConnections?: number;
}

export interface CopilotMetricsResponse {
  activeConnections: number;
  connectionDetails: Array<{
    socketId: string;
    agentId: string;
    agentName: string;
    connectedAt: number;
    conversationId?: string;
  }>;
  totalConversations: number;
  totalMessages: number;
  avgResponseTime: number;
  recommendationAcceptanceRate: number;
}