import { Router, Request, Response, NextFunction } from 'express';
import {
  CopilotService,
  CopilotSessionService,
  logger,
} from '@insurance-lead-gen/core';
import type {
  CreateCopilotSessionRequest,
  UpdateCopilotContextRequest,
  GenerateSuggestionRequest,
  ProvideFeedbackRequest,
  GetInsightsRequest,
  CopilotSuggestionType,
} from '@insurance-lead-gen/types';

const router = Router();
const copilotService = new CopilotService();
const sessionService = new CopilotSessionService();

// Cleanup expired sessions every 5 minutes
setInterval(() => {
  sessionService.cleanupExpiredSessions();
}, 5 * 60 * 1000);

/**
 * POST /api/v1/copilot/sessions
 * Create a new copilot session
 */
router.post('/sessions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, context } = req.body as CreateCopilotSessionRequest;

    if (!userId || !context) {
      return res.status(400).json({
        error: 'Missing required fields: userId and context',
      });
    }

    const session = sessionService.createSession(userId, context);

    // Generate initial suggestions
    const initialSuggestion = await copilotService.generateSuggestion(
      session.id,
      'next_action',
      context
    );
    sessionService.addSuggestion(session.id, initialSuggestion);

    // Analyze initial insights
    const insights = await copilotService.analyzeRealTimeInsights(context);
    insights.forEach((insight) => {
      sessionService.addInsight(session.id, {
        id: insight.id,
        sessionId: session.id,
        type: insight.type,
        title: insight.title,
        description: insight.message,
        severity: insight.severity,
        actionable: insight.actionable,
        recommendedActions: insight.actions?.map((a) => a.label),
        data: insight.data,
        createdAt: insight.timestamp,
      });
    });

    logger.info('Created copilot session with initial suggestions', {
      sessionId: session.id,
    });

    res.status(201).json({ session: sessionService.getSession(session.id) });
  } catch (error) {
    logger.error('Failed to create copilot session', { error });
    next(error);
  }
});

/**
 * GET /api/v1/copilot/sessions/:sessionId
 * Get copilot session details
 */
router.get('/sessions/:sessionId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const session = sessionService.getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    logger.error('Failed to get copilot session', { error });
    next(error);
  }
});

/**
 * PATCH /api/v1/copilot/sessions/:sessionId/context
 * Update session context
 */
router.patch(
  '/sessions/:sessionId/context',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { context } = req.body as UpdateCopilotContextRequest;

      const session = sessionService.updateContext(sessionId, context);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Re-analyze insights with updated context
      const insights = await copilotService.analyzeRealTimeInsights(session.context);
      insights.forEach((insight) => {
        sessionService.addInsight(sessionId, {
          id: insight.id,
          sessionId,
          type: insight.type,
          title: insight.title,
          description: insight.message,
          severity: insight.severity,
          actionable: insight.actionable,
          recommendedActions: insight.actions?.map((a) => a.label),
          data: insight.data,
          createdAt: insight.timestamp,
        });
      });

      res.json({ session: sessionService.getSession(sessionId) });
    } catch (error) {
      logger.error('Failed to update session context', { error });
      next(error);
    }
  }
);

/**
 * POST /api/v1/copilot/sessions/:sessionId/pause
 * Pause a session
 */
router.post('/sessions/:sessionId/pause', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const session = sessionService.pauseSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ session });
  } catch (error) {
    logger.error('Failed to pause session', { error });
    next(error);
  }
});

/**
 * POST /api/v1/copilot/sessions/:sessionId/resume
 * Resume a paused session
 */
router.post('/sessions/:sessionId/resume', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId } = req.params;
    const session = sessionService.resumeSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: 'Session not found or not paused' });
    }

    res.json({ session });
  } catch (error) {
    logger.error('Failed to resume session', { error });
    next(error);
  }
});

/**
 * POST /api/v1/copilot/sessions/:sessionId/complete
 * Complete a session
 */
router.post(
  '/sessions/:sessionId/complete',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const session = sessionService.completeSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      const metrics = sessionService.getSessionMetrics(sessionId);
      res.json({ session, metrics });
    } catch (error) {
      logger.error('Failed to complete session', { error });
      next(error);
    }
  }
);

/**
 * GET /api/v1/copilot/sessions/:sessionId/suggestions
 * Get suggestions for a session
 */
router.get(
  '/sessions/:sessionId/suggestions',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { types, limit } = req.query;

      const suggestions = sessionService.getSuggestions(sessionId, {
        types: types ? (types as string).split(',') : undefined,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({ suggestions, count: suggestions.length });
    } catch (error) {
      logger.error('Failed to get suggestions', { error });
      next(error);
    }
  }
);

/**
 * POST /api/v1/copilot/suggestions
 * Generate a new suggestion
 */
router.post('/suggestions', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, type, context, userInput } = req.body as GenerateSuggestionRequest;

    if (!sessionId || !type) {
      return res.status(400).json({
        error: 'Missing required fields: sessionId and type',
      });
    }

    const session = sessionService.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const suggestionContext = context || session.context;
    const suggestion = await copilotService.generateSuggestion(
      sessionId,
      type as CopilotSuggestionType,
      suggestionContext,
      userInput
    );

    sessionService.addSuggestion(sessionId, suggestion);

    logger.info('Generated new suggestion', { sessionId, type, suggestionId: suggestion.id });

    res.status(201).json({ suggestion });
  } catch (error) {
    logger.error('Failed to generate suggestion', { error });
    next(error);
  }
});

/**
 * POST /api/v1/copilot/suggestions/:suggestionId/feedback
 * Provide feedback on a suggestion
 */
router.post(
  '/suggestions/:suggestionId/feedback',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { suggestionId } = req.params;
      const { feedbackType, rating, comment, modificationsApplied } =
        req.body as ProvideFeedbackRequest;

      if (!feedbackType) {
        return res.status(400).json({ error: 'Missing required field: feedbackType' });
      }

      // Get userId from auth middleware (placeholder)
      const userId = (req as any).user?.id || 'system';

      const feedback = sessionService.recordFeedback(
        suggestionId,
        userId,
        feedbackType,
        rating,
        comment,
        modificationsApplied
      );

      logger.info('Recorded feedback for suggestion', { suggestionId, feedbackType });

      // Optionally generate follow-up suggestions based on feedback
      const nextSuggestions: any[] = [];

      res.json({ feedback, nextSuggestions });
    } catch (error) {
      logger.error('Failed to record feedback', { error });
      next(error);
    }
  }
);

/**
 * GET /api/v1/copilot/sessions/:sessionId/insights
 * Get insights for a session
 */
router.get(
  '/sessions/:sessionId/insights',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const { limit } = req.query;

      const insights = sessionService.getInsights(
        sessionId,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({ insights, count: insights.length });
    } catch (error) {
      logger.error('Failed to get insights', { error });
      next(error);
    }
  }
);

/**
 * POST /api/v1/copilot/insights
 * Get real-time insights
 */
router.post('/insights', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { sessionId, leadId, agentId, types, severity, limit } =
      req.body as GetInsightsRequest;

    let session = null;
    if (sessionId) {
      session = sessionService.getSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }
    }

    // Generate insights based on context
    const context = session?.context || { leadId, agentId };
    const insights = await copilotService.analyzeRealTimeInsights(context);

    // Filter by types if specified
    let filteredInsights = insights;
    if (types) {
      filteredInsights = filteredInsights.filter((i) => types.includes(i.type));
    }
    if (severity) {
      filteredInsights = filteredInsights.filter((i) => i.severity === severity);
    }
    if (limit) {
      filteredInsights = filteredInsights.slice(0, limit);
    }

    res.json({ insights: filteredInsights, count: filteredInsights.length });
  } catch (error) {
    logger.error('Failed to get insights', { error });
    next(error);
  }
});

/**
 * GET /api/v1/copilot/sessions/:sessionId/metrics
 * Get session metrics
 */
router.get(
  '/sessions/:sessionId/metrics',
  (req: Request, res: Response, next: NextFunction) => {
    try {
      const { sessionId } = req.params;
      const metrics = sessionService.getSessionMetrics(sessionId);

      if (!metrics) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({ metrics });
    } catch (error) {
      logger.error('Failed to get session metrics', { error });
      next(error);
    }
  }
);

/**
 * GET /api/v1/copilot/users/:userId/sessions
 * Get all sessions for a user
 */
router.get('/users/:userId/sessions', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = req.params;
    const sessions = sessionService.getUserSessions(userId);

    res.json({ sessions, count: sessions.length });
  } catch (error) {
    logger.error('Failed to get user sessions', { error });
    next(error);
  }
});

export default router;
