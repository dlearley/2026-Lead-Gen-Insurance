export type KnowledgeArticleType =
  | 'runbook'
  | 'sop'
  | 'architecture_decision'
  | 'postmortem'
  | 'troubleshooting'
  | 'faq'
  | 'best_practice'
  | 'configuration';

export type KnowledgeArticleStatus = 'draft' | 'review' | 'published' | 'archived' | 'deprecated';

export type ArticleCategory =
  | 'operations'
  | 'infrastructure'
  | 'security'
  | 'monitoring'
  | 'deployment'
  | 'incident_response'
  | 'development'
  | 'integration';

export type IncidentSeverity = 'sev1' | 'sev2' | 'sev3' | 'sev4';

export type IncidentStatus =
  | 'investigating'
  | 'identified'
  | 'monitoring'
  | 'resolved'
  | 'postmortem_pending'
  | 'closed';

export type RunbookExecutionStatus =
  | 'started'
  | 'in_progress'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type TeamReadinessLevel =
  | 'not_ready'
  | 'training'
  | 'shadowing'
  | 'reverse_shadowing'
  | 'ready'
  | 'certified';

export type HandoffPhase =
  | 'documentation_review'
  | 'deep_dive'
  | 'shadowing'
  | 'reverse_shadowing'
  | 'completed';

export interface KnowledgeArticle {
  id: string;
  title: string;
  type: KnowledgeArticleType;
  category: ArticleCategory;
  status: KnowledgeArticleStatus;
  content: string;
  summary: string;
  tags: string[];
  relatedArticles: string[];
  relatedCourses: string[];
  prerequisites: string[];
  author: string;
  reviewers: string[];
  version: number;
  metadata: {
    estimatedReadTime?: number;
    difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    lastTested?: string;
    applicableServices?: string[];
    relevantAlerts?: string[];
  };
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  deprecatedAt?: string;
}

export interface Runbook {
  id: string;
  articleId: string;
  title: string;
  description: string;
  category: ArticleCategory;
  steps: RunbookStep[];
  prerequisites: string[];
  estimatedDuration: number;
  automationAvailable: boolean;
  automationScript?: string;
  requiredPermissions: string[];
  tags: string[];
  createdBy: string;
  lastExecutedAt?: string;
  executionCount: number;
  successRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface RunbookStep {
  id: string;
  orderIndex: number;
  title: string;
  description: string;
  command?: string;
  expectedOutput?: string;
  validationChecks?: string[];
  rollbackSteps?: string[];
  notes?: string;
}

export interface RunbookExecution {
  id: string;
  runbookId: string;
  executedBy: string;
  status: RunbookExecutionStatus;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  steps: ExecutionStep[];
  context: {
    triggeredBy?: string;
    incidentId?: string;
    environment?: string;
    reason?: string;
  };
  outcome: {
    success: boolean;
    notes?: string;
    lessonsLearned?: string[];
    issuesEncountered?: string[];
  };
  createdAt: string;
}

export interface ExecutionStep {
  stepId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  startedAt?: string;
  completedAt?: string;
  output?: string;
  error?: string;
  notes?: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  affectedServices: string[];
  detectedAt: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  respondents: IncidentRespondent[];
  timeline: IncidentTimelineEvent[];
  rootCause?: string;
  resolution?: string;
  postmortemId?: string;
  relatedRunbooks: string[];
  relatedIncidents: string[];
  metadata: {
    oncallEngineer?: string;
    escalatedTo?: string[];
    customerImpact?: string;
    estimatedAffectedUsers?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface IncidentRespondent {
  userId: string;
  role: 'incident_commander' | 'responder' | 'observer';
  joinedAt: string;
  leftAt?: string;
}

export interface IncidentTimelineEvent {
  id: string;
  timestamp: string;
  eventType:
    | 'detection'
    | 'acknowledgement'
    | 'update'
    | 'escalation'
    | 'resolution'
    | 'communication';
  description: string;
  author: string;
  metadata?: Record<string, any>;
}

export interface Postmortem {
  id: string;
  incidentId: string;
  title: string;
  summary: string;
  impact: {
    duration: number;
    affectedUsers?: number;
    affectedServices: string[];
    businessImpact?: string;
    severity: IncidentSeverity;
  };
  timeline: PostmortemTimelineEntry[];
  rootCause: {
    description: string;
    contributingFactors: string[];
    fiveyWhys?: string[];
  };
  resolution: {
    description: string;
    temporaryFixes?: string[];
    permanentFixes?: string[];
  };
  actionItems: PostmortemActionItem[];
  lessonsLearned: string[];
  whatWentWell: string[];
  whatWentWrong: string[];
  author: string;
  reviewers: string[];
  status: 'draft' | 'under_review' | 'published';
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostmortemTimelineEntry {
  timestamp: string;
  description: string;
  source?: string;
}

export interface PostmortemActionItem {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  assignee: string;
  dueDate?: string;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  completedAt?: string;
}

export interface TeamMember {
  userId: string;
  name: string;
  role: string;
  email: string;
  timezone: string;
}

export interface HandoffChecklist {
  id: string;
  teamMemberId: string;
  phase: HandoffPhase;
  items: HandoffChecklistItem[];
  completionPercentage: number;
  startedAt: string;
  completedAt?: string;
  certifiedBy?: string;
  certifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HandoffChecklistItem {
  id: string;
  category: string;
  title: string;
  description: string;
  required: boolean;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  relatedArticles?: string[];
  relatedCourses?: string[];
}

export interface TeamReadinessAssessment {
  id: string;
  teamMemberId: string;
  assessmentDate: string;
  assessor: string;
  readinessLevel: TeamReadinessLevel;
  areas: ReadinessArea[];
  overallScore: number;
  certifications: string[];
  completedTraining: string[];
  shadowingSessions: number;
  incidentsHandled: number;
  runbooksExecuted: number;
  strengths: string[];
  improvementAreas: string[];
  recommendations: string[];
  nextAssessmentDate?: string;
  approvedForProduction: boolean;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReadinessArea {
  area: string;
  score: number;
  maxScore: number;
  notes?: string;
}

export interface ShadowingSession {
  id: string;
  type: 'shadowing' | 'reverse_shadowing';
  traineeId: string;
  mentorId: string;
  activity: string;
  description: string;
  scheduledAt: string;
  duration: number;
  completed: boolean;
  completedAt?: string;
  feedback: {
    mentorFeedback?: string;
    traineeFeedback?: string;
    skillsDemonstrated?: string[];
    areasForImprovement?: string[];
    rating?: number;
  };
  relatedRunbooks?: string[];
  relatedIncidents?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface OperationsMetrics {
  period: {
    start: string;
    end: string;
  };
  incidents: {
    total: number;
    bySeverity: Record<IncidentSeverity, number>;
    meanTimeToAcknowledge: number;
    meanTimeToResolve: number;
    withPostmortem: number;
  };
  runbooks: {
    totalExecutions: number;
    uniqueRunbooks: number;
    successRate: number;
    averageDuration: number;
  };
  knowledge: {
    totalArticles: number;
    published: number;
    drafts: number;
    averageAge: number;
    mostViewed: Array<{ articleId: string; title: string; views: number }>;
  };
  team: {
    totalMembers: number;
    certified: number;
    inTraining: number;
    averageReadinessScore: number;
    shadowingSessionsCompleted: number;
  };
}

export interface KnowledgeSearchQuery {
  query: string;
  type?: KnowledgeArticleType;
  category?: ArticleCategory;
  tags?: string[];
  status?: KnowledgeArticleStatus;
}

export interface KnowledgeSearchResult {
  article: KnowledgeArticle;
  score: number;
  highlights?: string[];
}

export interface CreateKnowledgeArticleRequest {
  title: string;
  type: KnowledgeArticleType;
  category: ArticleCategory;
  content: string;
  summary: string;
  tags?: string[];
  relatedArticles?: string[];
  relatedCourses?: string[];
  prerequisites?: string[];
  author: string;
  metadata?: KnowledgeArticle['metadata'];
}

export interface UpdateKnowledgeArticleRequest {
  title?: string;
  content?: string;
  summary?: string;
  tags?: string[];
  relatedArticles?: string[];
  relatedCourses?: string[];
  prerequisites?: string[];
  metadata?: KnowledgeArticle['metadata'];
}

export interface CreateRunbookRequest {
  title: string;
  description: string;
  category: ArticleCategory;
  steps: Omit<RunbookStep, 'id'>[];
  prerequisites?: string[];
  estimatedDuration: number;
  automationAvailable?: boolean;
  automationScript?: string;
  requiredPermissions?: string[];
  tags?: string[];
  createdBy: string;
}

export interface ExecuteRunbookRequest {
  runbookId: string;
  executedBy: string;
  context?: RunbookExecution['context'];
}

export interface CreateIncidentRequest {
  title: string;
  description: string;
  severity: IncidentSeverity;
  affectedServices: string[];
  detectedAt?: string;
  metadata?: Incident['metadata'];
}

export interface UpdateIncidentRequest {
  title?: string;
  description?: string;
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  affectedServices?: string[];
  rootCause?: string;
  resolution?: string;
  metadata?: Incident['metadata'];
}

export interface AddIncidentTimelineEventRequest {
  eventType: IncidentTimelineEvent['eventType'];
  description: string;
  author: string;
  metadata?: Record<string, any>;
}

export interface CreatePostmortemRequest {
  incidentId: string;
  title: string;
  summary: string;
  impact: Postmortem['impact'];
  timeline: PostmortemTimelineEntry[];
  rootCause: Postmortem['rootCause'];
  resolution: Postmortem['resolution'];
  actionItems: Omit<PostmortemActionItem, 'id'>[];
  lessonsLearned: string[];
  whatWentWell: string[];
  whatWentWrong: string[];
  author: string;
}

export interface CreateHandoffChecklistRequest {
  teamMemberId: string;
  phase: HandoffPhase;
  items: Omit<HandoffChecklistItem, 'id' | 'completed' | 'completedAt' | 'completedBy'>[];
}

export interface CreateTeamReadinessAssessmentRequest {
  teamMemberId: string;
  assessor: string;
  readinessLevel: TeamReadinessLevel;
  areas: ReadinessArea[];
  overallScore: number;
  certifications?: string[];
  completedTraining?: string[];
  shadowingSessions?: number;
  incidentsHandled?: number;
  runbooksExecuted?: number;
  strengths?: string[];
  improvementAreas?: string[];
  recommendations?: string[];
  approvedForProduction?: boolean;
}

export interface CreateShadowingSessionRequest {
  type: 'shadowing' | 'reverse_shadowing';
  traineeId: string;
  mentorId: string;
  activity: string;
  description: string;
  scheduledAt: string;
  duration: number;
  relatedRunbooks?: string[];
  relatedIncidents?: string[];
}

export interface UpdateShadowingSessionRequest {
  completed?: boolean;
  completedAt?: string;
  feedback?: ShadowingSession['feedback'];
}
