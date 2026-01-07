import type {
  CopilotSession,
  CopilotContext,
  CopilotSuggestion,
  CopilotInsight,
  CopilotSessionStatus,
  CopilotFeedback,
  CopilotFeedbackType,
  CopilotMetrics,
} from '@insurance-lead-gen/types';
import { logger } from '../logger.js';

/**
 * Service for managing copilot sessions
 */
export class CopilotSessionService {
  private sessions: Map<string, CopilotSession> = new Map();
  private sessionTimeout = 30 * 60 * 1000; // 30 minutes

  /**
   * Create a new copilot session
   */
  createSession(userId: string, context: CopilotContext): CopilotSession {
    const session: CopilotSession = {
      id: this.generateSessionId(),
      userId,
      leadId: context.leadId,
      agentId: context.agentId,
      status: 'active',
      context,
      suggestions: [],
      insights: [],
      startedAt: new Date(),
      lastActivityAt: new Date(),
    };

    this.sessions.set(session.id, session);
    logger.info('Created copilot session', { sessionId: session.id, userId });

    // Set timeout to auto-expire session
    this.scheduleSessionExpiry(session.id);

    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): CopilotSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found', { sessionId });
      return null;
    }
    return session;
  }

  /**
   * Update session context
   */
  updateContext(sessionId: string, context: Partial<CopilotContext>): CopilotSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Cannot update context: session not found', { sessionId });
      return null;
    }

    session.context = { ...session.context, ...context };
    session.lastActivityAt = new Date();
    this.sessions.set(sessionId, session);

    logger.info('Updated session context', { sessionId });
    return session;
  }

  /**
   * Add suggestion to session
   */
  addSuggestion(sessionId: string, suggestion: CopilotSuggestion): CopilotSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Cannot add suggestion: session not found', { sessionId });
      return null;
    }

    session.suggestions.push(suggestion);
    session.lastActivityAt = new Date();
    this.sessions.set(sessionId, session);

    logger.info('Added suggestion to session', { sessionId, suggestionId: suggestion.id });
    return session;
  }

  /**
   * Add insight to session
   */
  addInsight(sessionId: string, insight: CopilotInsight): CopilotSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Cannot add insight: session not found', { sessionId });
      return null;
    }

    session.insights.push(insight);
    session.lastActivityAt = new Date();
    this.sessions.set(sessionId, session);

    logger.info('Added insight to session', { sessionId, insightId: insight.id });
    return session;
  }

  /**
   * Get suggestions for a session
   */
  getSuggestions(
    sessionId: string,
    filters?: {
      types?: string[];
      limit?: number;
    }
  ): CopilotSuggestion[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    let suggestions = session.suggestions;

    if (filters?.types) {
      suggestions = suggestions.filter((s) => filters.types!.includes(s.type));
    }

    // Sort by priority and creation time
    suggestions.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    if (filters?.limit) {
      suggestions = suggestions.slice(0, filters.limit);
    }

    return suggestions;
  }

  /**
   * Get insights for a session
   */
  getInsights(sessionId: string, limit?: number): CopilotInsight[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return [];
    }

    let insights = session.insights;

    // Sort by creation time (most recent first)
    insights.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (limit) {
      insights = insights.slice(0, limit);
    }

    return insights;
  }

  /**
   * Pause a session
   */
  pauseSession(sessionId: string): CopilotSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    session.status = 'paused';
    session.lastActivityAt = new Date();
    this.sessions.set(sessionId, session);

    logger.info('Paused session', { sessionId });
    return session;
  }

  /**
   * Resume a paused session
   */
  resumeSession(sessionId: string): CopilotSession | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'paused') {
      return null;
    }

    session.status = 'active';
    session.lastActivityAt = new Date();
    this.sessions.set(sessionId, session);

    logger.info('Resumed session', { sessionId });
    return session;
  }

  /**
   * Complete a session
   */
  completeSession(sessionId: string): CopilotSession | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    session.status = 'completed';
    session.completedAt = new Date();
    session.lastActivityAt = new Date();
    this.sessions.set(sessionId, session);

    logger.info('Completed session', { sessionId });
    return session;
  }

  /**
   * Expire a session due to inactivity
   */
  expireSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'active') {
      return;
    }

    session.status = 'expired';
    session.lastActivityAt = new Date();
    this.sessions.set(sessionId, session);

    logger.info('Expired session due to inactivity', { sessionId });
  }

  /**
   * Record feedback for a suggestion
   */
  recordFeedback(
    suggestionId: string,
    userId: string,
    feedbackType: CopilotFeedbackType,
    rating?: number,
    comment?: string,
    modificationsApplied?: string
  ): CopilotFeedback {
    const feedback: CopilotFeedback = {
      id: this.generateId(),
      suggestionId,
      userId,
      feedbackType,
      rating,
      comment,
      modificationsApplied,
      createdAt: new Date(),
    };

    logger.info('Recorded feedback', { suggestionId, feedbackType, rating });
    return feedback;
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(sessionId: string): CopilotMetrics | null {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const totalSuggestions = session.suggestions.length;
    const acceptedSuggestions = session.suggestions.filter((s) => s.acceptedAt).length;
    const rejectedSuggestions = session.suggestions.filter((s) => s.rejectedAt).length;
    const modifiedSuggestions = session.suggestions.filter(
      (s) => s.acceptedAt && s.metadata?.modified
    ).length;

    const averageConfidence =
      totalSuggestions > 0
        ? session.suggestions.reduce((sum, s) => sum + s.confidence, 0) / totalSuggestions
        : 0;

    // Calculate suggestion type distribution
    const typeCount: Record<string, number> = {};
    session.suggestions.forEach((s) => {
      typeCount[s.type] = (typeCount[s.type] || 0) + 1;
    });
    const topSuggestionTypes = Object.entries(typeCount)
      .map(([type, count]) => ({ type: type as any, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      sessionId,
      totalSuggestions,
      acceptedSuggestions,
      rejectedSuggestions,
      modifiedSuggestions,
      averageConfidence,
      averageResponseTime: 0, // Would calculate from actual response times
      topSuggestionTypes,
      insightsGenerated: session.insights.length,
    };
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): CopilotSession[] {
    return Array.from(this.sessions.values()).filter(
      (session) => session.userId === userId && session.status === 'active'
    );
  }

  /**
   * Clean up expired sessions
   */
  cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleanedCount = 0;

    this.sessions.forEach((session, sessionId) => {
      const inactiveTime = now - session.lastActivityAt.getTime();
      if (session.status === 'active' && inactiveTime > this.sessionTimeout) {
        this.expireSession(sessionId);
        cleanedCount++;
      }
    });

    if (cleanedCount > 0) {
      logger.info('Cleaned up expired sessions', { count: cleanedCount });
    }
  }

  /**
   * Schedule session expiry
   */
  private scheduleSessionExpiry(sessionId: string): void {
    setTimeout(() => {
      this.expireSession(sessionId);
    }, this.sessionTimeout);
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
