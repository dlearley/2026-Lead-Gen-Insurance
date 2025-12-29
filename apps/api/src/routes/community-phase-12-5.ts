import { Router, Request, Response } from 'express';
import axios from 'axios';
import { logger } from '@insurance-lead-gen/core';

const router = Router();

const DATA_SERVICE_URL = process.env.DATA_SERVICE_URL || 'http://localhost:3001';

async function proxyToDataService(req: Request, res: Response, endpoint: string): Promise<void> {
  try {
    const response = await axios({
      method: req.method,
      url: `${DATA_SERVICE_URL}${endpoint}`,
      data: req.body,
      params: req.query,
    });
    res.status(response.status).json(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      logger.error('Proxy to data service failed', { endpoint, error: error.message });
      res.status(error.response?.status || 500).json({
        error: 'Failed to fetch community data',
        message: error.message,
      });
    } else {
      logger.error('Unknown error during proxy', { endpoint, error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// ========================================
// GROUPS
// ========================================
router.post('/groups', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community/groups');
});

router.get('/groups', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community/groups');
});

router.get('/groups/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/groups/${req.params.id}`);
});

router.post('/groups/:id/join', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/groups/${req.params.id}/join`);
});

router.post('/groups/:id/leave', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/groups/${req.params.id}/leave`);
});

// ========================================
// EVENTS
// ========================================
router.post('/events', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community/events');
});

router.get('/events', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community/events');
});

router.get('/events/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/events/${req.params.id}`);
});

router.post('/events/:id/register', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/events/${req.params.id}/register`);
});

router.post('/events/:id/cancel', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/events/${req.params.id}/cancel`);
});

// ========================================
// BADGES
// ========================================
router.get('/badges/types', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community/badges/types');
});

router.get('/badges/agents/:agentId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/badges/agents/${req.params.agentId}`);
});

router.post('/badges/agents/:agentId/award', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/badges/agents/${req.params.agentId}/award`);
});

router.get('/badges/leaderboard', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community/badges/leaderboard');
});

// ========================================
// MENTORSHIP
// ========================================
router.post('/mentorship/request', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community/mentorship/request');
});

router.post('/mentorship/:id/accept', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/mentorship/${req.params.id}/accept`);
});

router.get('/mentorship/mentor/:mentorId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/mentorship/mentor/${req.params.mentorId}`);
});

router.get('/mentorship/mentee/:menteeId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/mentorship/mentee/${req.params.menteeId}`);
});

router.post('/mentorship/:id/sessions', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/mentorship/${req.params.id}/sessions`);
});

router.get('/mentorship/:id/sessions', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/mentorship/${req.params.id}/sessions`);
});

router.post('/mentorship/sessions/:sessionId/complete', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/mentorship/sessions/${req.params.sessionId}/complete`);
});

// ========================================
// PROFILES
// ========================================
router.get('/profiles/:agentId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/profiles/${req.params.agentId}`);
});

router.put('/profiles/:agentId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/profiles/${req.params.agentId}`);
});

// ========================================
// CONNECTIONS
// ========================================
router.post('/connections/request', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community/connections/request');
});

router.post('/connections/accept', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community/connections/accept');
});

router.post('/connections/remove', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community/connections/remove');
});

router.get('/connections/:agentId/followers', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/connections/${req.params.agentId}/followers`);
});

router.get('/connections/:agentId/following', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/connections/${req.params.agentId}/following`);
});

router.get('/connections/:agentId/pending', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community/connections/${req.params.agentId}/pending`);
});

export default router;
