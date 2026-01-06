import { Router } from 'express';
import { KnowledgeBaseService } from '../services/knowledge-base.service';
import { OpenAIClient } from '../ai/openai';
import { config } from '@insurance-lead-gen/config';
import { logger } from '@insurance-lead-gen/core';

const router = Router();

// Initialize services
const openaiClient = new OpenAIClient(config.openaiApiKey);
const knowledgeBaseService = new KnowledgeBaseService(openaiClient);

// Initialize knowledge base service
knowledgeBaseService.initialize().catch(error => {
  logger.error('Failed to initialize knowledge base service', { error: error.message });
});

router.post('/', async (req, res) => {
  try {
    const entry = req.body;
    const result = await knowledgeBaseService.addEntry(entry);
    res.status(201).json(result);
  } catch (error) {
    logger.error('Failed to add knowledge base entry', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const entry = await knowledgeBaseService.getEntryById(id);
    if (!entry) {
      return res.status(404).json({ success: false, error: 'Entry not found' });
    }
    res.json(entry);
  } catch (error) {
    logger.error('Failed to get knowledge base entry', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const result = await knowledgeBaseService.updateEntry(id, updates);
    res.json(result);
  } catch (error) {
    logger.error('Failed to update knowledge base entry', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await knowledgeBaseService.deleteEntry(id);
    res.json({ success: result });
  } catch (error) {
    logger.error('Failed to delete knowledge base entry', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/search', async (req, res) => {
  try {
    const { query, limit = 5, similarityThreshold = 0.6 } = req.body;
    const results = await knowledgeBaseService.search(query, limit, similarityThreshold);
    res.json(results);
  } catch (error) {
    logger.error('Failed to search knowledge base', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/search/category', async (req, res) => {
  try {
    const { category, query, limit = 5 } = req.body;
    const results = await knowledgeBaseService.searchByCategory(category, query, limit);
    res.json(results);
  } catch (error) {
    logger.error('Failed to search knowledge base by category', { error: error.message });
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;