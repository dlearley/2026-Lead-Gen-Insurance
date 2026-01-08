import { Router } from 'express';
import axios from 'axios';
import { getConfig } from '@insurance-lead-gen/config';
import { logger } from '@insurance-lead-gen/core';

const router = Router();
const config = getConfig();
const DATA_SERVICE_URL = `http://localhost:${config.ports.dataService}/api/v1/territories`;

// Helper to proxy requests to data-service
const proxyToDataService = async (req: any, res: any, path: string = '') => {
  try {
    const url = `${DATA_SERVICE_URL}${path}`;
    const response = await axios({
      method: req.method,
      url,
      data: req.body,
      params: req.query,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    res.status(response.status).json(response.data);
  } catch (error: any) {
    const statusCode = error.response?.status || 500;
    const errorMessage = error.response?.data?.error || error.message || 'Internal server error';
    logger.error('Error proxying to territory data-service', { 
      error: errorMessage,
      path: req.path,
      method: req.method
    });
    res.status(statusCode).json({ error: errorMessage });
  }
};

router.post('/', (req, res) => proxyToDataService(req, res));
router.get('/', (req, res) => proxyToDataService(req, res));
router.get('/:id', (req, res) => proxyToDataService(req, res, `/${req.params.id}`));
router.patch('/:id', (req, res) => proxyToDataService(req, res, `/${req.params.id}`));
router.delete('/:id', (req, res) => proxyToDataService(req, res, `/${req.params.id}`));

// Assignments
router.post('/assignments', (req, res) => proxyToDataService(req, res, '/assignments'));
router.patch('/assignments/:id', (req, res) => proxyToDataService(req, res, `/assignments/${req.params.id}`));
router.delete('/assignments/:id', (req, res) => proxyToDataService(req, res, `/assignments/${req.params.id}`));

// Analytics & Matching
router.get('/:id/performance', (req, res) => proxyToDataService(req, res, `/${req.params.id}/performance`));
router.post('/match-lead', (req, res) => proxyToDataService(req, res, '/match-lead'));
router.post('/agents-for-lead', (req, res) => proxyToDataService(req, res, '/agents-for-lead'));

export default router;
