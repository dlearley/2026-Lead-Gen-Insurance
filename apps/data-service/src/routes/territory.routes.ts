import { Router } from 'express';
import { TerritoryService } from '../services/territory.service.js';
import { TerritoryRepository } from '../repositories/territory.repository.js';
import { prisma } from '../prisma/client.js';

export const createTerritoryRoutes = () => {
  const router = Router();
  const repository = new TerritoryRepository(prisma);
  const service = new TerritoryService(repository, prisma);

  // Territory CRUD
  router.post('/', async (req, res) => {
    try {
      const territory = await service.createTerritory(req.body);
      res.status(201).json(territory);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.get('/', async (req, res) => {
    try {
      const result = await service.listTerritories(req.query);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.get('/:id', async (req, res) => {
    try {
      const territory = await service.getTerritory(req.params.id);
      if (!territory) return res.status(404).json({ error: 'Territory not found' });
      res.json(territory);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.patch('/:id', async (req, res) => {
    try {
      const territory = await service.updateTerritory(req.params.id, req.body);
      res.json(territory);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.delete('/:id', async (req, res) => {
    try {
      await service.deleteTerritory(req.params.id);
      res.status(204).end();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Assignments
  router.post('/assignments', async (req, res) => {
    try {
      const assignment = await service.assignAgent(req.body);
      res.status(201).json(assignment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.patch('/assignments/:id', async (req, res) => {
    try {
      const assignment = await service.updateAssignment(req.params.id, req.body);
      res.json(assignment);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  router.delete('/assignments/:id', async (req, res) => {
    try {
      await service.removeAssignment(req.params.id);
      res.status(204).end();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Analytics & Matching
  router.get('/:id/performance', async (req, res) => {
    try {
      const { start, end } = req.query;
      if (!start || !end) return res.status(400).json({ error: 'Start and end dates required' });
      
      const performance = await service.getTerritoryPerformance(
        req.params.id, 
        { start: new Date(start as string), end: new Date(end as string) }
      );
      res.json(performance);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/match-lead', async (req, res) => {
    try {
      const territory = await service.findBestTerritoryForLead(req.body);
      res.json({ territory });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  router.post('/agents-for-lead', async (req, res) => {
    try {
      const agents = await service.getAgentsForLead(req.body);
      res.json({ agents });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  return router;
};
