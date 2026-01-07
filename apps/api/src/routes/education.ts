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
        error: 'Failed to fetch education data',
        message: error.message,
      });
    } else {
      logger.error('Unknown error during proxy', { endpoint, error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

// ========================================
// COURSE ROUTES
// ========================================

router.post('/courses', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/education/courses');
});

router.get('/courses', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/education/courses');
});

router.get('/courses/:courseId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/courses/${req.params.courseId}`);
});

router.put('/courses/:courseId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/courses/${req.params.courseId}`);
});

router.post('/courses/:courseId/publish', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/courses/${req.params.courseId}/publish`);
});

router.post('/courses/:courseId/archive', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/courses/${req.params.courseId}/archive`);
});

router.post('/courses/:courseId/modules', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/courses/${req.params.courseId}/modules`);
});

// ========================================
// ENROLLMENT ROUTES
// ========================================

router.post('/enrollments', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/education/enrollments');
});

router.get('/enrollments/:enrollmentId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/enrollments/${req.params.enrollmentId}`);
});

router.post('/enrollments/:enrollmentId/start', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/enrollments/${req.params.enrollmentId}/start`);
});

router.post('/enrollments/:enrollmentId/modules/:moduleId/complete', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/enrollments/${req.params.enrollmentId}/modules/${req.params.moduleId}/complete`);
});

router.post('/enrollments/:enrollmentId/assessment', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/enrollments/${req.params.enrollmentId}/assessment`);
});

router.get('/agents/:agentId/enrollments', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/agents/${req.params.agentId}/enrollments`);
});

router.get('/courses/:courseId/enrollments', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/courses/${req.params.courseId}/enrollments`);
});

// ========================================
// CERTIFICATE ROUTES
// ========================================

router.post('/certificates', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/education/certificates');
});

router.get('/certificates/:certificateId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/certificates/${req.params.certificateId}`);
});

router.get('/certificates/verify/:certificateNumber', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/certificates/verify/${req.params.certificateNumber}`);
});

router.get('/agents/:agentId/certificates', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/agents/${req.params.agentId}/certificates`);
});

router.post('/certificates/:certificateId/revoke', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/certificates/${req.params.certificateId}/revoke`);
});

// ========================================
// LEARNING PATH ROUTES
// ========================================

router.post('/learning-paths', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/education/learning-paths');
});

router.get('/learning-paths', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/education/learning-paths');
});

router.get('/learning-paths/:pathId', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/learning-paths/${req.params.pathId}`);
});

// ========================================
// RECOMMENDATIONS & ANALYTICS
// ========================================

router.get('/agents/:agentId/recommendations', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, `/api/v1/education/agents/${req.params.agentId}/recommendations`);
});

router.get('/analytics', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/v1/education/analytics');
});

export default router;
