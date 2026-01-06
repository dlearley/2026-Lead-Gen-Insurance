import { Router, Request, Response } from 'express';
import { getConfig } from '@insurance-lead-gen/config';
import { logger } from '@insurance-lead-gen/core';
import { KnowledgeBaseEntry, KnowledgeBaseSearchResult } from '@insurance-lead-gen/types';

const router = Router();
const config = getConfig();

const ORCHESTRATOR_URL = `http://localhost:${config.ports.orchestrator}`;

router.post('/', async (req: Request, res: Response) => {
  try {
    const entry: KnowledgeBaseEntry = req.body;

    const response = await fetch(`${ORCHESTRATOR_URL}/api/v1/knowledge-base`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to create knowledge base entry', { error });
    res.status(500).json({ success: false, error: 'Failed to create knowledge base entry' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const response = await fetch(`${ORCHESTRATOR_URL}/api/v1/knowledge-base/${id}`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to fetch knowledge base entry', { error });
    res.status(500).json({ success: false, error: 'Failed to fetch knowledge base entry' });
  }
});

router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates: Partial<KnowledgeBaseEntry> = req.body;

    const response = await fetch(`${ORCHESTRATOR_URL}/api/v1/knowledge-base/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to update knowledge base entry', { error });
    res.status(500).json({ success: false, error: 'Failed to update knowledge base entry' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const response = await fetch(`${ORCHESTRATOR_URL}/api/v1/knowledge-base/${id}`, {
      method: 'DELETE',
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to delete knowledge base entry', { error });
    res.status(500).json({ success: false, error: 'Failed to delete knowledge base entry' });
  }
});

router.post('/search', async (req: Request, res: Response) => {
  try {
    const { query, limit = 5, similarityThreshold = 0.6 } = req.body;

    const response = await fetch(`${ORCHESTRATOR_URL}/api/v1/knowledge-base/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, limit, similarityThreshold }),
    });

    const data: KnowledgeBaseSearchResult[] = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to search knowledge base', { error });
    res.status(500).json({ success: false, error: 'Failed to search knowledge base' });
  }
});

router.post('/search/category', async (req: Request, res: Response) => {
  try {
    const { category, query, limit = 5 } = req.body;

    const response = await fetch(`${ORCHESTRATOR_URL}/api/v1/knowledge-base/search/category`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category, query, limit }),
    });

    const data: KnowledgeBaseSearchResult[] = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    logger.error('Failed to search knowledge base by category', { error });
    res.status(500).json({ success: false, error: 'Failed to search knowledge base by category' });
  }
});

export default router;