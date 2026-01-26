import { v4 as uuidv4 } from 'uuid';
import type {
  KnowledgeArticle,
  Runbook,
  RunbookExecution,
  Incident,
  Postmortem,
  HandoffChecklist,
  TeamReadinessAssessment,
  ShadowingSession,
  OperationsMetrics,
  KnowledgeSearchQuery,
  KnowledgeSearchResult,
  CreateKnowledgeArticleRequest,
  UpdateKnowledgeArticleRequest,
  CreateRunbookRequest,
  ExecuteRunbookRequest,
  CreateIncidentRequest,
  UpdateIncidentRequest,
  AddIncidentTimelineEventRequest,
  CreatePostmortemRequest,
  CreateHandoffChecklistRequest,
  CreateTeamReadinessAssessmentRequest,
  CreateShadowingSessionRequest,
  UpdateShadowingSessionRequest,
  RunbookExecutionStatus,
  ExecutionStep,
} from '@leadgen/types';

export class KnowledgeOpsService {
  private knowledgeArticles: Map<string, KnowledgeArticle> = new Map();
  private runbooks: Map<string, Runbook> = new Map();
  private runbookExecutions: Map<string, RunbookExecution> = new Map();
  private incidents: Map<string, Incident> = new Map();
  private postmortems: Map<string, Postmortem> = new Map();
  private handoffChecklists: Map<string, HandoffChecklist> = new Map();
  private readinessAssessments: Map<string, TeamReadinessAssessment> = new Map();
  private shadowingSessions: Map<string, ShadowingSession> = new Map();

  async createKnowledgeArticle(data: CreateKnowledgeArticleRequest): Promise<KnowledgeArticle> {
    const article: KnowledgeArticle = {
      id: uuidv4(),
      ...data,
      status: 'draft',
      relatedArticles: data.relatedArticles || [],
      relatedCourses: data.relatedCourses || [],
      prerequisites: data.prerequisites || [],
      reviewers: [],
      version: 1,
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.knowledgeArticles.set(article.id, article);
    return article;
  }

  async getKnowledgeArticle(id: string): Promise<KnowledgeArticle | null> {
    return this.knowledgeArticles.get(id) || null;
  }

  async updateKnowledgeArticle(
    id: string,
    data: UpdateKnowledgeArticleRequest
  ): Promise<KnowledgeArticle | null> {
    const article = this.knowledgeArticles.get(id);
    if (!article) return null;

    const updated: KnowledgeArticle = {
      ...article,
      ...data,
      version: article.version + 1,
      updatedAt: new Date().toISOString(),
    };

    this.knowledgeArticles.set(id, updated);
    return updated;
  }

  async publishKnowledgeArticle(id: string, reviewerId: string): Promise<KnowledgeArticle | null> {
    const article = this.knowledgeArticles.get(id);
    if (!article) return null;

    const updated: KnowledgeArticle = {
      ...article,
      status: 'published',
      reviewers: [...article.reviewers, reviewerId],
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.knowledgeArticles.set(id, updated);
    return updated;
  }

  async searchKnowledge(query: KnowledgeSearchQuery): Promise<KnowledgeSearchResult[]> {
    const articles = Array.from(this.knowledgeArticles.values());

    const results = articles
      .filter((article) => {
        if (query.type && article.type !== query.type) return false;
        if (query.category && article.category !== query.category) return false;
        if (query.status && article.status !== query.status) return false;
        if (query.tags && query.tags.length > 0) {
          const hasTag = query.tags.some((tag) => article.tags.includes(tag));
          if (!hasTag) return false;
        }

        const searchText = `${article.title} ${article.summary} ${article.content}`.toLowerCase();
        return searchText.includes(query.query.toLowerCase());
      })
      .map((article) => ({
        article,
        score: this.calculateRelevanceScore(article, query.query),
        highlights: this.extractHighlights(article, query.query),
      }))
      .sort((a, b) => b.score - a.score);

    return results;
  }

  async listKnowledgeArticles(filters?: {
    type?: string;
    category?: string;
    status?: string;
    tags?: string[];
  }): Promise<KnowledgeArticle[]> {
    let articles = Array.from(this.knowledgeArticles.values());

    if (filters) {
      if (filters.type) {
        articles = articles.filter((a) => a.type === filters.type);
      }
      if (filters.category) {
        articles = articles.filter((a) => a.category === filters.category);
      }
      if (filters.status) {
        articles = articles.filter((a) => a.status === filters.status);
      }
      if (filters.tags && filters.tags.length > 0) {
        articles = articles.filter((a) => filters.tags!.some((tag) => a.tags.includes(tag)));
      }
    }

    return articles.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async createRunbook(data: CreateRunbookRequest): Promise<Runbook> {
    const articleData: CreateKnowledgeArticleRequest = {
      title: data.title,
      type: 'runbook',
      category: data.category,
      content: `# ${data.title}\n\n${data.description}\n\n## Steps\n\n${data.steps.map((s, i) => `${i + 1}. ${s.title}`).join('\n')}`,
      summary: data.description,
      tags: data.tags || [],
      author: data.createdBy,
      prerequisites: data.prerequisites,
    };

    const article = await this.createKnowledgeArticle(articleData);

    const runbook: Runbook = {
      id: uuidv4(),
      articleId: article.id,
      title: data.title,
      description: data.description,
      category: data.category,
      steps: data.steps.map((step, index) => ({
        ...step,
        id: uuidv4(),
        orderIndex: index,
      })),
      prerequisites: data.prerequisites || [],
      estimatedDuration: data.estimatedDuration,
      automationAvailable: data.automationAvailable || false,
      automationScript: data.automationScript,
      requiredPermissions: data.requiredPermissions || [],
      tags: data.tags || [],
      createdBy: data.createdBy,
      executionCount: 0,
      successRate: 100,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.runbooks.set(runbook.id, runbook);
    return runbook;
  }

  async getRunbook(id: string): Promise<Runbook | null> {
    return this.runbooks.get(id) || null;
  }

  async listRunbooks(category?: string): Promise<Runbook[]> {
    let runbooks = Array.from(this.runbooks.values());

    if (category) {
      runbooks = runbooks.filter((r) => r.category === category);
    }

    return runbooks.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async executeRunbook(data: ExecuteRunbookRequest): Promise<RunbookExecution> {
    const runbook = this.runbooks.get(data.runbookId);
    if (!runbook) {
      throw new Error('Runbook not found');
    }

    const execution: RunbookExecution = {
      id: uuidv4(),
      runbookId: data.runbookId,
      executedBy: data.executedBy,
      status: 'started',
      startedAt: new Date().toISOString(),
      steps: runbook.steps.map((step) => ({
        stepId: step.id,
        status: 'pending',
      })),
      context: data.context || {},
      outcome: {
        success: false,
      },
      createdAt: new Date().toISOString(),
    };

    this.runbookExecutions.set(execution.id, execution);

    const updated = this.runbooks.get(data.runbookId);
    if (updated) {
      updated.lastExecutedAt = new Date().toISOString();
      updated.executionCount += 1;
      this.runbooks.set(data.runbookId, updated);
    }

    return execution;
  }

  async updateRunbookExecution(
    id: string,
    updates: {
      status?: RunbookExecutionStatus;
      steps?: ExecutionStep[];
      outcome?: RunbookExecution['outcome'];
    }
  ): Promise<RunbookExecution | null> {
    const execution = this.runbookExecutions.get(id);
    if (!execution) return null;

    const updated: RunbookExecution = {
      ...execution,
      ...updates,
    };

    if (updates.status === 'completed' || updates.status === 'failed') {
      updated.completedAt = new Date().toISOString();
      updated.duration =
        new Date(updated.completedAt).getTime() - new Date(execution.startedAt).getTime();

      const runbook = this.runbooks.get(execution.runbookId);
      if (runbook) {
        const totalExecutions = runbook.executionCount;
        const currentSuccess = runbook.successRate * (totalExecutions - 1);
        const newSuccess = updates.status === 'completed' ? 1 : 0;
        runbook.successRate = (currentSuccess + newSuccess) / totalExecutions;
        this.runbooks.set(runbook.id, runbook);
      }
    }

    this.runbookExecutions.set(id, updated);
    return updated;
  }

  async getRunbookExecution(id: string): Promise<RunbookExecution | null> {
    return this.runbookExecutions.get(id) || null;
  }

  async getRunbookExecutions(runbookId: string): Promise<RunbookExecution[]> {
    return Array.from(this.runbookExecutions.values())
      .filter((e) => e.runbookId === runbookId)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }

  async createIncident(data: CreateIncidentRequest): Promise<Incident> {
    const incident: Incident = {
      id: uuidv4(),
      title: data.title,
      description: data.description,
      severity: data.severity,
      status: 'investigating',
      affectedServices: data.affectedServices,
      detectedAt: data.detectedAt || new Date().toISOString(),
      respondents: [],
      timeline: [
        {
          id: uuidv4(),
          timestamp: new Date().toISOString(),
          eventType: 'detection',
          description: 'Incident detected',
          author: 'system',
        },
      ],
      relatedRunbooks: [],
      relatedIncidents: [],
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.incidents.set(incident.id, incident);
    return incident;
  }

  async getIncident(id: string): Promise<Incident | null> {
    return this.incidents.get(id) || null;
  }

  async updateIncident(id: string, data: UpdateIncidentRequest): Promise<Incident | null> {
    const incident = this.incidents.get(id);
    if (!incident) return null;

    const updated: Incident = {
      ...incident,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    if (data.status === 'resolved' && !incident.resolvedAt) {
      updated.resolvedAt = new Date().toISOString();
    }

    this.incidents.set(id, updated);
    return updated;
  }

  async addIncidentTimelineEvent(
    incidentId: string,
    data: AddIncidentTimelineEventRequest
  ): Promise<Incident | null> {
    const incident = this.incidents.get(incidentId);
    if (!incident) return null;

    const event = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ...data,
    };

    incident.timeline.push(event);
    incident.updatedAt = new Date().toISOString();

    this.incidents.set(incidentId, incident);
    return incident;
  }

  async listIncidents(filters?: {
    severity?: string;
    status?: string;
    service?: string;
  }): Promise<Incident[]> {
    let incidents = Array.from(this.incidents.values());

    if (filters) {
      if (filters.severity) {
        incidents = incidents.filter((i) => i.severity === filters.severity);
      }
      if (filters.status) {
        incidents = incidents.filter((i) => i.status === filters.status);
      }
      if (filters.service) {
        incidents = incidents.filter((i) => i.affectedServices.includes(filters.service));
      }
    }

    return incidents.sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );
  }

  async createPostmortem(data: CreatePostmortemRequest): Promise<Postmortem> {
    const postmortem: Postmortem = {
      id: uuidv4(),
      ...data,
      actionItems: data.actionItems.map((item) => ({
        ...item,
        id: uuidv4(),
      })),
      reviewers: [],
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.postmortems.set(postmortem.id, postmortem);

    const incident = this.incidents.get(data.incidentId);
    if (incident) {
      incident.postmortemId = postmortem.id;
      incident.status = 'closed';
      this.incidents.set(incident.id, incident);
    }

    return postmortem;
  }

  async getPostmortem(id: string): Promise<Postmortem | null> {
    return this.postmortems.get(id) || null;
  }

  async publishPostmortem(id: string, reviewerId: string): Promise<Postmortem | null> {
    const postmortem = this.postmortems.get(id);
    if (!postmortem) return null;

    postmortem.status = 'published';
    postmortem.reviewers.push(reviewerId);
    postmortem.publishedAt = new Date().toISOString();
    postmortem.updatedAt = new Date().toISOString();

    this.postmortems.set(id, postmortem);
    return postmortem;
  }

  async listPostmortems(): Promise<Postmortem[]> {
    return Array.from(this.postmortems.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async createHandoffChecklist(data: CreateHandoffChecklistRequest): Promise<HandoffChecklist> {
    const checklist: HandoffChecklist = {
      id: uuidv4(),
      teamMemberId: data.teamMemberId,
      phase: data.phase,
      items: data.items.map((item) => ({
        ...item,
        id: uuidv4(),
        completed: false,
      })),
      completionPercentage: 0,
      startedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.handoffChecklists.set(checklist.id, checklist);
    return checklist;
  }

  async updateChecklistItem(
    checklistId: string,
    itemId: string,
    updates: { completed: boolean; completedBy?: string; notes?: string }
  ): Promise<HandoffChecklist | null> {
    const checklist = this.handoffChecklists.get(checklistId);
    if (!checklist) return null;

    const itemIndex = checklist.items.findIndex((i) => i.id === itemId);
    if (itemIndex === -1) return null;

    checklist.items[itemIndex] = {
      ...checklist.items[itemIndex],
      ...updates,
      completedAt: updates.completed ? new Date().toISOString() : undefined,
    };

    const completedCount = checklist.items.filter((i) => i.completed).length;
    checklist.completionPercentage = (completedCount / checklist.items.length) * 100;

    if (checklist.completionPercentage === 100 && !checklist.completedAt) {
      checklist.completedAt = new Date().toISOString();
    }

    checklist.updatedAt = new Date().toISOString();
    this.handoffChecklists.set(checklistId, checklist);
    return checklist;
  }

  async getHandoffChecklist(id: string): Promise<HandoffChecklist | null> {
    return this.handoffChecklists.get(id) || null;
  }

  async getTeamMemberChecklists(teamMemberId: string): Promise<HandoffChecklist[]> {
    return Array.from(this.handoffChecklists.values())
      .filter((c) => c.teamMemberId === teamMemberId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async createTeamReadinessAssessment(
    data: CreateTeamReadinessAssessmentRequest
  ): Promise<TeamReadinessAssessment> {
    const assessment: TeamReadinessAssessment = {
      id: uuidv4(),
      ...data,
      assessmentDate: new Date().toISOString(),
      certifications: data.certifications || [],
      completedTraining: data.completedTraining || [],
      shadowingSessions: data.shadowingSessions || 0,
      incidentsHandled: data.incidentsHandled || 0,
      runbooksExecuted: data.runbooksExecuted || 0,
      strengths: data.strengths || [],
      improvementAreas: data.improvementAreas || [],
      recommendations: data.recommendations || [],
      approvedForProduction: data.approvedForProduction || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (assessment.approvedForProduction) {
      assessment.approvedBy = data.assessor;
      assessment.approvedAt = new Date().toISOString();
    }

    this.readinessAssessments.set(assessment.id, assessment);
    return assessment;
  }

  async getTeamReadinessAssessment(id: string): Promise<TeamReadinessAssessment | null> {
    return this.readinessAssessments.get(id) || null;
  }

  async getTeamMemberAssessments(teamMemberId: string): Promise<TeamReadinessAssessment[]> {
    return Array.from(this.readinessAssessments.values())
      .filter((a) => a.teamMemberId === teamMemberId)
      .sort((a, b) => new Date(b.assessmentDate).getTime() - new Date(a.assessmentDate).getTime());
  }

  async createShadowingSession(data: CreateShadowingSessionRequest): Promise<ShadowingSession> {
    const session: ShadowingSession = {
      id: uuidv4(),
      ...data,
      completed: false,
      feedback: {},
      relatedRunbooks: data.relatedRunbooks || [],
      relatedIncidents: data.relatedIncidents || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.shadowingSessions.set(session.id, session);
    return session;
  }

  async updateShadowingSession(
    id: string,
    data: UpdateShadowingSessionRequest
  ): Promise<ShadowingSession | null> {
    const session = this.shadowingSessions.get(id);
    if (!session) return null;

    const updated: ShadowingSession = {
      ...session,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    this.shadowingSessions.set(id, updated);
    return updated;
  }

  async getShadowingSession(id: string): Promise<ShadowingSession | null> {
    return this.shadowingSessions.get(id) || null;
  }

  async getTeamMemberShadowingSessions(userId: string): Promise<ShadowingSession[]> {
    return Array.from(this.shadowingSessions.values())
      .filter((s) => s.traineeId === userId || s.mentorId === userId)
      .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime());
  }

  async getOperationsMetrics(startDate: string, endDate: string): Promise<OperationsMetrics> {
    const incidents = Array.from(this.incidents.values()).filter(
      (i) => i.detectedAt >= startDate && i.detectedAt <= endDate
    );

    const runbookExecutions = Array.from(this.runbookExecutions.values()).filter(
      (e) => e.startedAt >= startDate && e.startedAt <= endDate
    );

    const uniqueRunbooks = new Set(runbookExecutions.map((e) => e.runbookId)).size;
    const successfulExecutions = runbookExecutions.filter((e) => e.outcome.success).length;
    const avgDuration =
      runbookExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) / runbookExecutions.length ||
      0;

    const articles = Array.from(this.knowledgeArticles.values());
    const published = articles.filter((a) => a.status === 'published');
    const sortedByViews = published.slice(0, 10);

    const allAssessments = Array.from(this.readinessAssessments.values());
    const recentAssessments = allAssessments.filter(
      (a) => a.assessmentDate >= startDate && a.assessmentDate <= endDate
    );

    const certified = new Set(
      recentAssessments.filter((a) => a.approvedForProduction).map((a) => a.teamMemberId)
    ).size;

    const avgReadiness =
      recentAssessments.length > 0
        ? recentAssessments.reduce((sum, a) => sum + a.overallScore, 0) / recentAssessments.length
        : 0;

    const shadowingSessions = Array.from(this.shadowingSessions.values()).filter(
      (s) => s.completed && s.completedAt && s.completedAt >= startDate && s.completedAt <= endDate
    );

    const incidentsBySeverity = incidents.reduce(
      (acc, incident) => {
        acc[incident.severity] = (acc[incident.severity] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const acknowledgedIncidents = incidents.filter((i) => i.acknowledgedAt);
    const resolvedIncidents = incidents.filter((i) => i.resolvedAt);

    const mttr =
      resolvedIncidents.length > 0
        ? resolvedIncidents.reduce((sum, i) => {
            return sum + (new Date(i.resolvedAt!).getTime() - new Date(i.detectedAt).getTime());
          }, 0) / resolvedIncidents.length
        : 0;

    const mtta =
      acknowledgedIncidents.length > 0
        ? acknowledgedIncidents.reduce((sum, i) => {
            return sum + (new Date(i.acknowledgedAt!).getTime() - new Date(i.detectedAt).getTime());
          }, 0) / acknowledgedIncidents.length
        : 0;

    return {
      period: { start: startDate, end: endDate },
      incidents: {
        total: incidents.length,
        bySeverity: incidentsBySeverity as any,
        meanTimeToAcknowledge: mtta,
        meanTimeToResolve: mttr,
        withPostmortem: incidents.filter((i) => i.postmortemId).length,
      },
      runbooks: {
        totalExecutions: runbookExecutions.length,
        uniqueRunbooks,
        successRate:
          runbookExecutions.length > 0
            ? (successfulExecutions / runbookExecutions.length) * 100
            : 100,
        averageDuration: avgDuration,
      },
      knowledge: {
        totalArticles: articles.length,
        published: published.length,
        drafts: articles.filter((a) => a.status === 'draft').length,
        averageAge: this.calculateAverageAge(articles),
        mostViewed: sortedByViews.map((a) => ({
          articleId: a.id,
          title: a.title,
          views: 0,
        })),
      },
      team: {
        totalMembers: new Set(allAssessments.map((a) => a.teamMemberId)).size,
        certified,
        inTraining: new Set(
          recentAssessments.filter((a) => !a.approvedForProduction).map((a) => a.teamMemberId)
        ).size,
        averageReadinessScore: avgReadiness,
        shadowingSessionsCompleted: shadowingSessions.length,
      },
    };
  }

  private calculateRelevanceScore(article: KnowledgeArticle, query: string): number {
    const lowerQuery = query.toLowerCase();
    let score = 0;

    if (article.title.toLowerCase().includes(lowerQuery)) score += 10;
    if (article.summary.toLowerCase().includes(lowerQuery)) score += 5;
    if (article.content.toLowerCase().includes(lowerQuery)) score += 1;

    return score;
  }

  private extractHighlights(article: KnowledgeArticle, query: string): string[] {
    const highlights: string[] = [];
    const lowerQuery = query.toLowerCase();

    if (article.title.toLowerCase().includes(lowerQuery)) {
      highlights.push(article.title);
    }
    if (article.summary.toLowerCase().includes(lowerQuery)) {
      highlights.push(article.summary);
    }

    return highlights.slice(0, 3);
  }

  private calculateAverageAge(articles: KnowledgeArticle[]): number {
    if (articles.length === 0) return 0;

    const now = new Date().getTime();
    const totalAge = articles.reduce((sum, article) => {
      const age = now - new Date(article.createdAt).getTime();
      return sum + age;
    }, 0);

    return totalAge / articles.length / (1000 * 60 * 60 * 24);
  }
}
