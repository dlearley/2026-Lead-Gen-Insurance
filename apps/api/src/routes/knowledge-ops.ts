import { Router, Request, Response } from 'express';
import axios from 'axios';

const router = Router();
const DATA_SERVICE_URL = process.env.DATA_SERVICE_URL || 'http://localhost:3001';

const proxyRequest = async (
  req: Request,
  res: Response,
  path: string,
  method: string = 'GET'
): Promise<void> => {
  try {
    const url = `${DATA_SERVICE_URL}/api/v1/knowledge-ops${path}`;
    const config: any = {
      method,
      url,
      headers: req.headers,
    };

    if (method !== 'GET' && method !== 'DELETE') {
      config.data = req.body;
    }

    if (method === 'GET') {
      config.params = req.query;
    }

    const response = await axios(config);
    res.status(response.status).json(response.data);
  } catch (error: any) {
    const status = error.response?.status || 500;
    const message = error.response?.data || { error: 'Internal server error' };
    res.status(status).json(message);
  }
};

router.post('/articles', (req, res) => {
  void proxyRequest(req, res, '/articles', 'POST');
});
router.get('/articles', (req, res) => {
  void proxyRequest(req, res, '/articles', 'GET');
});
router.get('/articles/:id', (req, res) => {
  void proxyRequest(req, res, `/articles/${req.params.id}`, 'GET');
});
router.put('/articles/:id', (req, res) => {
  void proxyRequest(req, res, `/articles/${req.params.id}`, 'PUT');
});
router.post('/articles/:id/publish', (req, res) => {
  void proxyRequest(req, res, `/articles/${req.params.id}/publish`, 'POST');
});
router.post('/articles/search', (req, res) => {
  void proxyRequest(req, res, '/articles/search', 'POST');
});

router.post('/runbooks', (req, res) => {
  void proxyRequest(req, res, '/runbooks', 'POST');
});
router.get('/runbooks', (req, res) => {
  void proxyRequest(req, res, '/runbooks', 'GET');
});
router.get('/runbooks/:id', (req, res) => {
  void proxyRequest(req, res, `/runbooks/${req.params.id}`, 'GET');
});
router.post('/runbooks/execute', (req, res) => {
  void proxyRequest(req, res, '/runbooks/execute', 'POST');
});
router.put('/runbooks/executions/:id', (req, res) => {
  void proxyRequest(req, res, `/runbooks/executions/${req.params.id}`, 'PUT');
});
router.get('/runbooks/executions/:id', (req, res) => {
  void proxyRequest(req, res, `/runbooks/executions/${req.params.id}`, 'GET');
});
router.get('/runbooks/:runbookId/executions', (req, res) => {
  void proxyRequest(req, res, `/runbooks/${req.params.runbookId}/executions`, 'GET');
});

router.post('/incidents', (req, res) => {
  void proxyRequest(req, res, '/incidents', 'POST');
});
router.get('/incidents', (req, res) => {
  void proxyRequest(req, res, '/incidents', 'GET');
});
router.get('/incidents/:id', (req, res) => {
  void proxyRequest(req, res, `/incidents/${req.params.id}`, 'GET');
});
router.put('/incidents/:id', (req, res) => {
  void proxyRequest(req, res, `/incidents/${req.params.id}`, 'PUT');
});
router.post('/incidents/:id/timeline', (req, res) => {
  void proxyRequest(req, res, `/incidents/${req.params.id}/timeline`, 'POST');
});

router.post('/postmortems', (req, res) => {
  void proxyRequest(req, res, '/postmortems', 'POST');
});
router.get('/postmortems', (req, res) => {
  void proxyRequest(req, res, '/postmortems', 'GET');
});
router.get('/postmortems/:id', (req, res) => {
  void proxyRequest(req, res, `/postmortems/${req.params.id}`, 'GET');
});
router.post('/postmortems/:id/publish', (req, res) => {
  void proxyRequest(req, res, `/postmortems/${req.params.id}/publish`, 'POST');
});

router.post('/handoff/checklists', (req, res) => {
  void proxyRequest(req, res, '/handoff/checklists', 'POST');
});
router.get('/handoff/checklists/:id', (req, res) => {
  void proxyRequest(req, res, `/handoff/checklists/${req.params.id}`, 'GET');
});
router.get('/handoff/members/:teamMemberId/checklists', (req, res) => {
  void proxyRequest(req, res, `/handoff/members/${req.params.teamMemberId}/checklists`, 'GET');
});
router.put('/handoff/checklists/:checklistId/items/:itemId', (req, res) => {
  void proxyRequest(
    req,
    res,
    `/handoff/checklists/${req.params.checklistId}/items/${req.params.itemId}`,
    'PUT'
  );
});

router.post('/team/assessments', (req, res) => {
  void proxyRequest(req, res, '/team/assessments', 'POST');
});
router.get('/team/assessments/:id', (req, res) => {
  void proxyRequest(req, res, `/team/assessments/${req.params.id}`, 'GET');
});
router.get('/team/members/:teamMemberId/assessments', (req, res) => {
  void proxyRequest(req, res, `/team/members/${req.params.teamMemberId}/assessments`, 'GET');
});

router.post('/team/shadowing', (req, res) => {
  void proxyRequest(req, res, '/team/shadowing', 'POST');
});
router.put('/team/shadowing/:id', (req, res) => {
  void proxyRequest(req, res, `/team/shadowing/${req.params.id}`, 'PUT');
});
router.get('/team/shadowing/:id', (req, res) => {
  void proxyRequest(req, res, `/team/shadowing/${req.params.id}`, 'GET');
});
router.get('/team/members/:userId/shadowing', (req, res) => {
  void proxyRequest(req, res, `/team/members/${req.params.userId}/shadowing`, 'GET');
});

router.get('/metrics', (req, res) => {
  void proxyRequest(req, res, '/metrics', 'GET');
});

export default router;
