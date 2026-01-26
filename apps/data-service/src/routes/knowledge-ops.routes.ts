import { Router, Request, Response } from 'express';
import { KnowledgeOpsService } from '../services/knowledge-ops.service.js';

const router = Router();
const knowledgeOpsService = new KnowledgeOpsService();

router.post('/articles', async (req: Request, res: Response) => {
  try {
    const article = await knowledgeOpsService.createKnowledgeArticle(req.body);
    res.status(201).json(article);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to create knowledge article', message: (error as Error).message });
  }
});

router.get('/articles', async (req: Request, res: Response) => {
  try {
    const { type, category, status, tags } = req.query;
    const filters: any = {};
    if (type) filters.type = type;
    if (category) filters.category = category;
    if (status) filters.status = status;
    if (tags) filters.tags = Array.isArray(tags) ? tags : [tags];

    const articles = await knowledgeOpsService.listKnowledgeArticles(filters);
    res.json(articles);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to list knowledge articles', message: (error as Error).message });
  }
});

router.get('/articles/:id', async (req: Request, res: Response) => {
  try {
    const article = await knowledgeOpsService.getKnowledgeArticle(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'Knowledge article not found' });
    }
    res.json(article);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to get knowledge article', message: (error as Error).message });
  }
});

router.put('/articles/:id', async (req: Request, res: Response) => {
  try {
    const article = await knowledgeOpsService.updateKnowledgeArticle(req.params.id, req.body);
    if (!article) {
      return res.status(404).json({ error: 'Knowledge article not found' });
    }
    res.json(article);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to update knowledge article', message: (error as Error).message });
  }
});

router.post('/articles/:id/publish', async (req: Request, res: Response) => {
  try {
    const { reviewerId } = req.body;
    const article = await knowledgeOpsService.publishKnowledgeArticle(req.params.id, reviewerId);
    if (!article) {
      return res.status(404).json({ error: 'Knowledge article not found' });
    }
    res.json(article);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to publish knowledge article', message: (error as Error).message });
  }
});

router.post('/articles/search', async (req: Request, res: Response) => {
  try {
    const results = await knowledgeOpsService.searchKnowledge(req.body);
    res.json(results);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to search knowledge', message: (error as Error).message });
  }
});

router.post('/runbooks', async (req: Request, res: Response) => {
  try {
    const runbook = await knowledgeOpsService.createRunbook(req.body);
    res.status(201).json(runbook);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create runbook', message: (error as Error).message });
  }
});

router.get('/runbooks', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;
    const runbooks = await knowledgeOpsService.listRunbooks(category as string);
    res.json(runbooks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list runbooks', message: (error as Error).message });
  }
});

router.get('/runbooks/:id', async (req: Request, res: Response) => {
  try {
    const runbook = await knowledgeOpsService.getRunbook(req.params.id);
    if (!runbook) {
      return res.status(404).json({ error: 'Runbook not found' });
    }
    res.json(runbook);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get runbook', message: (error as Error).message });
  }
});

router.post('/runbooks/execute', async (req: Request, res: Response) => {
  try {
    const execution = await knowledgeOpsService.executeRunbook(req.body);
    res.status(201).json(execution);
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute runbook', message: (error as Error).message });
  }
});

router.put('/runbooks/executions/:id', async (req: Request, res: Response) => {
  try {
    const execution = await knowledgeOpsService.updateRunbookExecution(req.params.id, req.body);
    if (!execution) {
      return res.status(404).json({ error: 'Runbook execution not found' });
    }
    res.json(execution);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to update runbook execution', message: (error as Error).message });
  }
});

router.get('/runbooks/executions/:id', async (req: Request, res: Response) => {
  try {
    const execution = await knowledgeOpsService.getRunbookExecution(req.params.id);
    if (!execution) {
      return res.status(404).json({ error: 'Runbook execution not found' });
    }
    res.json(execution);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to get runbook execution', message: (error as Error).message });
  }
});

router.get('/runbooks/:runbookId/executions', async (req: Request, res: Response) => {
  try {
    const executions = await knowledgeOpsService.getRunbookExecutions(req.params.runbookId);
    res.json(executions);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to get runbook executions', message: (error as Error).message });
  }
});

router.post('/incidents', async (req: Request, res: Response) => {
  try {
    const incident = await knowledgeOpsService.createIncident(req.body);
    res.status(201).json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create incident', message: (error as Error).message });
  }
});

router.get('/incidents', async (req: Request, res: Response) => {
  try {
    const { severity, status, service } = req.query;
    const filters: any = {};
    if (severity) filters.severity = severity;
    if (status) filters.status = status;
    if (service) filters.service = service;

    const incidents = await knowledgeOpsService.listIncidents(filters);
    res.json(incidents);
  } catch (error) {
    res.status(500).json({ error: 'Failed to list incidents', message: (error as Error).message });
  }
});

router.get('/incidents/:id', async (req: Request, res: Response) => {
  try {
    const incident = await knowledgeOpsService.getIncident(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get incident', message: (error as Error).message });
  }
});

router.put('/incidents/:id', async (req: Request, res: Response) => {
  try {
    const incident = await knowledgeOpsService.updateIncident(req.params.id, req.body);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(incident);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update incident', message: (error as Error).message });
  }
});

router.post('/incidents/:id/timeline', async (req: Request, res: Response) => {
  try {
    const incident = await knowledgeOpsService.addIncidentTimelineEvent(req.params.id, req.body);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(incident);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to add timeline event', message: (error as Error).message });
  }
});

router.post('/postmortems', async (req: Request, res: Response) => {
  try {
    const postmortem = await knowledgeOpsService.createPostmortem(req.body);
    res.status(201).json(postmortem);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to create postmortem', message: (error as Error).message });
  }
});

router.get('/postmortems', async (req: Request, res: Response) => {
  try {
    const postmortems = await knowledgeOpsService.listPostmortems();
    res.json(postmortems);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to list postmortems', message: (error as Error).message });
  }
});

router.get('/postmortems/:id', async (req: Request, res: Response) => {
  try {
    const postmortem = await knowledgeOpsService.getPostmortem(req.params.id);
    if (!postmortem) {
      return res.status(404).json({ error: 'Postmortem not found' });
    }
    res.json(postmortem);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get postmortem', message: (error as Error).message });
  }
});

router.post('/postmortems/:id/publish', async (req: Request, res: Response) => {
  try {
    const { reviewerId } = req.body;
    const postmortem = await knowledgeOpsService.publishPostmortem(req.params.id, reviewerId);
    if (!postmortem) {
      return res.status(404).json({ error: 'Postmortem not found' });
    }
    res.json(postmortem);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to publish postmortem', message: (error as Error).message });
  }
});

router.post('/handoff/checklists', async (req: Request, res: Response) => {
  try {
    const checklist = await knowledgeOpsService.createHandoffChecklist(req.body);
    res.status(201).json(checklist);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to create handoff checklist', message: (error as Error).message });
  }
});

router.get('/handoff/checklists/:id', async (req: Request, res: Response) => {
  try {
    const checklist = await knowledgeOpsService.getHandoffChecklist(req.params.id);
    if (!checklist) {
      return res.status(404).json({ error: 'Handoff checklist not found' });
    }
    res.json(checklist);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to get handoff checklist', message: (error as Error).message });
  }
});

router.get('/handoff/members/:teamMemberId/checklists', async (req: Request, res: Response) => {
  try {
    const checklists = await knowledgeOpsService.getTeamMemberChecklists(req.params.teamMemberId);
    res.json(checklists);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to get team member checklists', message: (error as Error).message });
  }
});

router.put(
  '/handoff/checklists/:checklistId/items/:itemId',
  async (req: Request, res: Response) => {
    try {
      const checklist = await knowledgeOpsService.updateChecklistItem(
        req.params.checklistId,
        req.params.itemId,
        req.body
      );
      if (!checklist) {
        return res.status(404).json({ error: 'Checklist or item not found' });
      }
      res.json(checklist);
    } catch (error) {
      res
        .status(500)
        .json({ error: 'Failed to update checklist item', message: (error as Error).message });
    }
  }
);

router.post('/team/assessments', async (req: Request, res: Response) => {
  try {
    const assessment = await knowledgeOpsService.createTeamReadinessAssessment(req.body);
    res.status(201).json(assessment);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create team readiness assessment',
      message: (error as Error).message,
    });
  }
});

router.get('/team/assessments/:id', async (req: Request, res: Response) => {
  try {
    const assessment = await knowledgeOpsService.getTeamReadinessAssessment(req.params.id);
    if (!assessment) {
      return res.status(404).json({ error: 'Team readiness assessment not found' });
    }
    res.json(assessment);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get team readiness assessment',
      message: (error as Error).message,
    });
  }
});

router.get('/team/members/:teamMemberId/assessments', async (req: Request, res: Response) => {
  try {
    const assessments = await knowledgeOpsService.getTeamMemberAssessments(req.params.teamMemberId);
    res.json(assessments);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to get team member assessments', message: (error as Error).message });
  }
});

router.post('/team/shadowing', async (req: Request, res: Response) => {
  try {
    const session = await knowledgeOpsService.createShadowingSession(req.body);
    res.status(201).json(session);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to create shadowing session', message: (error as Error).message });
  }
});

router.put('/team/shadowing/:id', async (req: Request, res: Response) => {
  try {
    const session = await knowledgeOpsService.updateShadowingSession(req.params.id, req.body);
    if (!session) {
      return res.status(404).json({ error: 'Shadowing session not found' });
    }
    res.json(session);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to update shadowing session', message: (error as Error).message });
  }
});

router.get('/team/shadowing/:id', async (req: Request, res: Response) => {
  try {
    const session = await knowledgeOpsService.getShadowingSession(req.params.id);
    if (!session) {
      return res.status(404).json({ error: 'Shadowing session not found' });
    }
    res.json(session);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to get shadowing session', message: (error as Error).message });
  }
});

router.get('/team/members/:userId/shadowing', async (req: Request, res: Response) => {
  try {
    const sessions = await knowledgeOpsService.getTeamMemberShadowingSessions(req.params.userId);
    res.json(sessions);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get team member shadowing sessions',
      message: (error as Error).message,
    });
  }
});

router.get('/metrics', async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'startDate and endDate query parameters are required' });
    }

    const metrics = await knowledgeOpsService.getOperationsMetrics(
      startDate as string,
      endDate as string
    );
    res.json(metrics);
  } catch (error) {
    res
      .status(500)
      .json({ error: 'Failed to get operations metrics', message: (error as Error).message });
  }
});

export default router;
