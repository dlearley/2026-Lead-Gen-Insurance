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
        error: 'Failed to fetch community network data',
        message: error.response?.data?.error || error.message,
      });
    } else {
      logger.error('Unknown error during proxy', { endpoint, error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// Connection routes
router.post('/connections', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community-network/connections');
});

router.get('/connections/:agentId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/connections/${req.params.agentId}`);
});

router.patch('/connections/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/connections/${req.params.id}`);
});

router.delete('/connections/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/connections/${req.params.id}`);
});

router.post('/follows', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community-network/follows');
});

router.delete('/follows', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community-network/follows');
});

router.get('/followers/:agentId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/followers/${req.params.agentId}`);
});

router.get('/following/:agentId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/following/${req.params.agentId}`);
});

router.get('/connection-stats/:agentId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/connection-stats/${req.params.agentId}`);
});

router.get('/suggested-connections/:agentId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/suggested-connections/${req.params.agentId}`);
});

// Mentorship routes
router.post('/mentors', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community-network/mentors');
});

router.get('/mentors', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community-network/mentors');
});

router.get('/mentors/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/mentors/${req.params.id}`);
});

router.get('/mentors/by-agent/:agentId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/mentors/by-agent/${req.params.agentId}`);
});

router.patch('/mentors/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/mentors/${req.params.id}`);
});

router.post('/mentorship-requests', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community-network/mentorship-requests');
});

router.patch('/mentorship-requests/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/mentorship-requests/${req.params.id}`);
});

router.get('/mentorship-requests/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/mentorship-requests/${req.params.id}`);
});

router.get('/mentorship-requests/by-mentor/:mentorId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/mentorship-requests/by-mentor/${req.params.mentorId}`);
});

router.get('/mentorship-requests/by-mentee/:menteeId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/mentorship-requests/by-mentee/${req.params.menteeId}`);
});

router.post('/mentorship-sessions', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community-network/mentorship-sessions');
});

router.patch('/mentorship-sessions/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/mentorship-sessions/${req.params.id}`);
});

router.get('/mentorship-sessions/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/mentorship-sessions/${req.params.id}`);
});

router.get('/mentorship-sessions/by-request/:mentorshipRequestId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/mentorship-sessions/by-request/${req.params.mentorshipRequestId}`);
});

// Group routes
router.post('/groups', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community-network/groups');
});

router.get('/groups', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community-network/groups');
});

router.get('/groups/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/groups/${req.params.id}`);
});

router.patch('/groups/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/groups/${req.params.id}`);
});

router.delete('/groups/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/groups/${req.params.id}`);
});

router.post('/groups/:id/join', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/groups/${req.params.id}/join`);
});

router.post('/groups/:id/leave', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/groups/${req.params.id}/leave`);
});

router.get('/groups/:id/members', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/groups/${req.params.id}/members`);
});

router.patch('/group-memberships/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/group-memberships/${req.params.id}`);
});

router.get('/agent-groups/:agentId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/agent-groups/${req.params.agentId}`);
});

// Referral network routes
router.post('/referrals', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/community-network/referrals');
});

router.get('/referrals/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/referrals/${req.params.id}`);
});

router.patch('/referrals/:id', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/referrals/${req.params.id}`);
});

router.get('/referrals/by-agent/:agentId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/referrals/by-agent/${req.params.agentId}`);
});

router.get('/referral-stats/:agentId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/referral-stats/${req.params.agentId}`);
});

router.post('/referrals/:id/mark-paid', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/community-network/referrals/${req.params.id}/mark-paid`);
});

export default router;
