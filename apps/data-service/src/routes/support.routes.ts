import { Router, Request, Response } from 'express';
import { SupportService } from '../services/support.service';
import {
  CreateTicketDto,
  UpdateTicketDto,
  CreateIncidentDto,
  UpdateIncidentDto,
  CreateKBArticleDto,
  UpdateKBArticleDto,
  CreateSLAPolicyDto,
  UpdateSLAPolicyDto,
  TicketFilterParams,
  IncidentFilterParams,
  KBArticleFilterParams,
} from '@insurance/types';

const router = Router();
const supportService = new SupportService();

// ============ SUPPORT TICKET ROUTES ============

// Create ticket
router.post('/tickets', async (req: Request, res: Response) => {
  try {
    const data: CreateTicketDto = req.body;
    const createdBy = req.body.createdBy || 'system';
    
    const ticket = await supportService.createTicket(data, createdBy);
    res.status(201).json(ticket);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get tickets with filters
router.get('/tickets', async (req: Request, res: Response) => {
  try {
    const filter: TicketFilterParams = {
      status: req.query.status as any,
      priority: req.query.priority as any,
      category: req.query.category as any,
      assignedTo: req.query.assignedTo as string,
      customerId: req.query.customerId as string,
      slaBreached: req.query.slaBreached === 'true',
      search: req.query.search as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const result = await supportService.getTickets(filter);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get single ticket
router.get('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const ticket = await supportService.getTicket(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update ticket
router.put('/tickets/:id', async (req: Request, res: Response) => {
  try {
    const data: UpdateTicketDto = req.body;
    const updatedBy = req.body.updatedBy || 'system';
    
    const ticket = await supportService.updateTicket(req.params.id, data, updatedBy);
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Add comment to ticket
router.post('/tickets/:id/comments', async (req: Request, res: Response) => {
  try {
    const { authorId, authorName, authorRole, content, isInternal } = req.body;
    
    const comment = await supportService.addTicketComment(
      req.params.id,
      authorId,
      authorName,
      authorRole,
      content,
      isInternal
    );
    
    res.status(201).json(comment);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Escalate ticket
router.post('/tickets/:id/escalate', async (req: Request, res: Response) => {
  try {
    const { escalatedBy, escalatedTo, reason, isAutomatic } = req.body;
    
    const ticket = await supportService.escalateTicket(
      req.params.id,
      escalatedBy,
      escalatedTo,
      reason,
      isAutomatic
    );
    
    res.json(ticket);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============ INCIDENT ROUTES ============

// Create incident
router.post('/incidents', async (req: Request, res: Response) => {
  try {
    const data: CreateIncidentDto = req.body;
    const reportedBy = req.body.reportedBy || 'system';
    
    const incident = await supportService.createIncident(data, reportedBy);
    res.status(201).json(incident);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get incidents with filters
router.get('/incidents', async (req: Request, res: Response) => {
  try {
    const filter: IncidentFilterParams = {
      status: req.query.status as any,
      severity: req.query.severity as any,
      category: req.query.category as any,
      incidentCommander: req.query.incidentCommander as string,
      slaBreached: req.query.slaBreached === 'true',
      search: req.query.search as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const result = await supportService.getIncidents(filter);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get single incident
router.get('/incidents/:id', async (req: Request, res: Response) => {
  try {
    const incident = await supportService.getIncident(req.params.id);
    if (!incident) {
      return res.status(404).json({ error: 'Incident not found' });
    }
    res.json(incident);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update incident
router.put('/incidents/:id', async (req: Request, res: Response) => {
  try {
    const data: UpdateIncidentDto = req.body;
    const updatedBy = req.body.updatedBy || 'system';
    
    const incident = await supportService.updateIncident(req.params.id, data, updatedBy);
    res.json(incident);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Add incident update
router.post('/incidents/:id/updates', async (req: Request, res: Response) => {
  try {
    const { updateType, title, description, isPublic, createdBy } = req.body;
    
    const update = await supportService.addIncidentUpdate(
      req.params.id,
      updateType,
      title,
      description,
      isPublic,
      createdBy
    );
    
    res.status(201).json(update);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============ KNOWLEDGE BASE ROUTES ============

// Create KB article
router.post('/kb-articles', async (req: Request, res: Response) => {
  try {
    const data: CreateKBArticleDto = req.body;
    const author = req.body.author || 'system';
    
    const article = await supportService.createKBArticle(data, author);
    res.status(201).json(article);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Search KB articles
router.get('/kb-articles', async (req: Request, res: Response) => {
  try {
    const filter: KBArticleFilterParams = {
      status: req.query.status as any,
      category: req.query.category as any,
      author: req.query.author as string,
      isInternal: req.query.isInternal === 'true',
      isPinned: req.query.isPinned === 'true',
      search: req.query.search as string,
      tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
      sortBy: req.query.sortBy as string,
      sortOrder: req.query.sortOrder as 'asc' | 'desc',
    };

    const result = await supportService.searchKBArticles(filter);
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get single KB article
router.get('/kb-articles/:id', async (req: Request, res: Response) => {
  try {
    const article = await supportService.getKBArticle(req.params.id);
    if (!article) {
      return res.status(404).json({ error: 'KB Article not found' });
    }
    res.json(article);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Update KB article
router.put('/kb-articles/:id', async (req: Request, res: Response) => {
  try {
    const data: UpdateKBArticleDto = req.body;
    const updatedBy = req.body.updatedBy || 'system';
    
    const article = await supportService.updateKBArticle(req.params.id, data, updatedBy);
    res.json(article);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============ SLA ROUTES ============

// Create SLA policy
router.post('/sla-policies', async (req: Request, res: Response) => {
  try {
    const data: CreateSLAPolicyDto = req.body;
    
    const policy = await supportService.createSLAPolicy(data);
    res.status(201).json(policy);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get SLA policies
router.get('/sla-policies', async (req: Request, res: Response) => {
  try {
    const policies = await supportService.getSLAPolicies();
    res.json(policies);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Get SLA report
router.get('/sla-reports', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : new Date();

    const report = await supportService.getSLAReport(startDate, endDate);
    res.json(report);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// ============ ANALYTICS ROUTES ============

// Get support analytics
router.get('/analytics', async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate 
      ? new Date(req.query.startDate as string) 
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
    const endDate = req.query.endDate 
      ? new Date(req.query.endDate as string) 
      : new Date();

    const analytics = await supportService.getSupportAnalytics(startDate, endDate);
    res.json(analytics);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

export default router;
