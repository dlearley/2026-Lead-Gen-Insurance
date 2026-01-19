import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireRole } from '../middleware/auth.js';
import { APIGatewayService } from '@insurance-lead-gen/core';
import { 
  APIGatewayConfig, 
  PerformanceMetrics, 
  SecurityEvent,
  Session,
  RateLimitRule
} from '@insurance-lead-gen/types';
import { validateBody } from '../utils/validation.js';

const router = Router();

/**
 * GET /api/v1/gateway/config
 * Get current API Gateway configuration
 */
router.get('/config', async (req: Request, res: Response) => {
  try {
    const gatewayService = req.app.get('APIGatewayService') as APIGatewayService;
    const config = gatewayService.getConfig();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve gateway configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PUT /api/v1/gateway/config
 * Update API Gateway configuration (Admin only)
 */
router.put('/config', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const gatewayService = req.app.get('APIGatewayService') as APIGatewayService;
    
    const configSchema = z.object({
      rateLimits: z.object({
        global: z.object({
          requests: z.number(),
          windowMs: z.number(),
          strategy: z.enum(['sliding', 'fixed', 'token_bucket'])
        }),
        burstLimit: z.number(),
        rateLimitHeaders: z.boolean()
      }),
      security: z.object({
        jwt: z.object({
          expiresIn: z.string(),
          enableBlacklisting: z.boolean()
        }),
        cors: z.object({
          origin: z.union([z.string(), z.array(z.string()), z.boolean()]),
          methods: z.array(z.string()),
          credentials: z.boolean()
        }),
        auditLogging: z.boolean()
      })
    });

    const validatedConfig = validateBody(configSchema, req.body);
    await gatewayService.updateConfig(validatedConfig);
    
    res.json({
      success: true,
      message: 'Gateway configuration updated successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: 'Invalid configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/gateway/metrics
 * Get API Gateway performance metrics
 */
router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const gatewayService = req.app.get('APIGatewayService') as APIGatewayService;
    
    const timeRange = (req.query.timeRange as string) || '1h';
    const metrics = await gatewayService.getPerformanceMetrics(timeRange);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/gateway/metrics/realtime
 * Get real-time API Gateway metrics
 */
router.get('/metrics/realtime', async (req: Request, res: Response) => {
  try {
    const gatewayService = req.app.get('APIGatewayService') as APIGatewayService;
    
    const metrics = await gatewayService.getRealTimeMetrics();
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve real-time metrics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/gateway/security/events
 * Get security events (Admin only)
 */
router.get('/security/events', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const gatewayService = req.app.get('APIGatewayService') as APIGatewayService;
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const severity = req.query.severity as string;
    const type = req.query.type as string;
    
    const events = await gatewayService.getSecurityEvents({
      page,
      limit,
      severity,
      type
    });
    
    res.json({
      success: true,
      data: events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve security events',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/gateway/security/events/:eventId/resolve
 * Resolve a security event (Admin only)
 */
router.post('/security/events/:eventId/resolve', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const gatewayService = req.app.get('APIGatewayService') as APIGatewayService;
    const eventId = req.params.eventId;
    const { resolution } = req.body;
    
    await gatewayService.resolveSecurityEvent(eventId, resolution, req.user!.id);
    
    res.json({
      success: true,
      message: 'Security event resolved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resolve security event',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/gateway/auth/sessions
 * Get active sessions (Admin only)
 */
router.get('/auth/sessions', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const gatewayService = req.app.get('APIGatewayService') as APIGatewayService;
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    const sessions = await gatewayService.getActiveSessions({
      page,
      limit
    });
    
    res.json({
      success: true,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve sessions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/v1/gateway/auth/sessions/:sessionId
 * Invalidate a session (Admin only)
 */
router.delete('/auth/sessions/:sessionId', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const gatewayService = req.app.get('APIGatewayService') as APIGatewayService;
    const sessionId = req.params.sessionId;
    const reason = req.body.reason || 'Manual invalidation';
    
    await gatewayService.invalidateSession(sessionId, reason, req.user!.id);
    
    res.json({
      success: true,
      message: 'Session invalidated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to invalidate session',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/gateway/auth/logout
 * Logout current user (invalidate session)
 */
router.post('/auth/logout', async (req: Request, res: Response) => {
  try {
    const gatewayService = req.app.get('APIGatewayService') as APIGatewayService;
    
    if (req.auth?.metadata?.sessionId) {
      await gatewayService.invalidateSession(
        req.auth.metadata.sessionId, 
        'User logout', 
        req.user?.id || 'system'
      );
    }
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to logout',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/gateway/rate-limits/status
 * Get current rate limit status for the user
 */
router.get('/rate-limits/status', async (req: Request, res: Response) => {
  try {
    const gatewayService = req.app.get('APIGatewayService') as APIGatewayService;
    
    if (!req.apiContext) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_CONTEXT',
        message: 'Request context not found'
      });
    }
    
    const status = await gatewayService.getRateLimitStatus(req.apiContext);
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve rate limit status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/gateway/rate-limits/reset
 * Reset rate limit for user (Admin only)
 */
router.post('/rate-limits/reset', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const gatewayService = req.app.get('APIGatewayService') as APIGatewayService;
    const { userId, ipAddress } = req.body;
    
    if (!userId && !ipAddress) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_PARAMETERS',
        message: 'Either userId or ipAddress is required'
      });
    }
    
    await gatewayService.resetRateLimit(userId, ipAddress);
    
    res.json({
      success: true,
      message: 'Rate limit reset successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reset rate limit',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/gateway/health
 * Gateway health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const gatewayService = req.app.get('APIGatewayService') as APIGatewayService;
    
    const health = await gatewayService.getHealthStatus();
    
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      error: 'Gateway unhealthy',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/gateway/health/reload
 * Reload gateway configuration (Admin only)
 */
router.post('/health/reload', requireRole('admin'), async (req: Request, res: Response) => {
  try {
    const gatewayService = req.app.get('APIGatewayService') as APIGatewayService;
    
    await gatewayService.reloadConfiguration();
    
    res.json({
      success: true,
      message: 'Gateway configuration reloaded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reload configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/v1/gateway/alerts
 * Get active alerts
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const gatewayService = req.app.get('APIGatewayService') as APIGatewayService;
    
    const alerts = await gatewayService.getActiveAlerts();
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alerts',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/v1/gateway/alerts/:alertId/acknowledge
 * Acknowledge an alert
 */
router.post('/alerts/:alertId/acknowledge', async (req: Request, res: Response) => {
  try {
    const gatewayService = req.app.get('APIGatewayService') as APIGatewayService;
    const alertId = req.params.alertId;
    
    await gatewayService.acknowledgeAlert(alertId, req.user?.id);
    
    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;