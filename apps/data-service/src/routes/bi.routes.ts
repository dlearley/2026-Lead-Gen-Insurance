import { Router } from 'express';
import { advancedAnalyticsService } from '../services/advanced-analytics';
import { logger } from '@insurance-lead-gen/core';
import { z } from 'zod';

const router = Router();

// Prediction endpoints
router.get('/predictive/leads/conversion', async (req, res) => {
  try {
    const leadId = req.query.leadId as string;
    if (!leadId) {
      return res.status(400).json({ error: 'leadId is required' });
    }
    
    const prediction = await advancedAnalyticsService.getLeadConversionPrediction(leadId);
    res.json({ data: prediction });
  } catch (error) {
    logger.error('Failed to get lead conversion prediction', { error });
    res.status(500).json({ error: 'Failed to get prediction' });
  }
});

router.get('/predictive/agents/performance', async (req, res) => {
  try {
    const agentId = req.query.agentId as string;
    if (!agentId) {
      return res.status(400).json({ error: 'agentId is required' });
    }
    
    const prediction = await advancedAnalyticsService.getAgentPerformancePrediction(agentId);
    res.json({ data: prediction });
  } catch (error) {
    logger.error('Failed to get agent performance prediction', { error });
    res.status(500).json({ error: 'Failed to get prediction' });
  }
});

router.get('/predictive/market/trends', async (req, res) => {
  try {
    const timeRange = req.query.timeRange as string || '30d';
    const prediction = await advancedAnalyticsService.getMarketTrendsPrediction(timeRange);
    res.json({ data: prediction });
  } catch (error) {
    logger.error('Failed to get market trends prediction', { error });
    res.status(500).json({ error: 'Failed to get prediction' });
  }
});

// Insights endpoints
router.get('/insights/leads', async (req, res) => {
  try {
    const timeRange = req.query.timeRange as string || '30d';
    const insights = await advancedAnalyticsService.getInsights('lead_quality', timeRange);
    res.json({ data: insights });
  } catch (error) {
    logger.error('Failed to get lead insights', { error });
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

router.get('/insights/agents', async (req, res) => {
  try {
    const timeRange = req.query.timeRange as string || '30d';
    const insights = await advancedAnalyticsService.getInsights('agent_performance', timeRange);
    res.json({ data: insights });
  } catch (error) {
    logger.error('Failed to get agent insights', { error });
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

router.get('/insights/market', async (req, res) => {
  try {
    const timeRange = req.query.timeRange as string || '30d';
    const insights = await advancedAnalyticsService.getInsights('market_trends', timeRange);
    res.json({ data: insights });
  } catch (error) {
    logger.error('Failed to get market insights', { error });
    res.status(500).json({ error: 'Failed to get insights' });
  }
});

// Recommendations endpoints
router.get('/recommendations/routing', async (req, res) => {
  try {
    const recommendations = await advancedAnalyticsService.getRecommendations('routing_optimization');
    res.json({ data: recommendations });
  } catch (error) {
    logger.error('Failed to get routing recommendations', { error });
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

router.get('/recommendations/performance', async (req, res) => {
  try {
    const recommendations = await advancedAnalyticsService.getRecommendations('performance_improvement');
    res.json({ data: recommendations });
  } catch (error) {
    logger.error('Failed to get performance recommendations', { error });
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

router.get('/recommendations/optimization', async (req, res) => {
  try {
    const recommendations = await advancedAnalyticsService.getRecommendations('process_optimization');
    res.json({ data: recommendations });
  } catch (error) {
    logger.error('Failed to get optimization recommendations', { error });
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

// Data exploration endpoint
router.post('/explore', async (req, res) => {
  try {
    const query = req.body;
    const result = await advancedAnalyticsService.exploreData(query);
    res.json({ data: result });
  } catch (error) {
    logger.error('Failed to explore data', { error });
    res.status(500).json({ error: 'Failed to explore data' });
  }
});

// What-if analysis endpoint
router.post('/analysis/what-if', async (req, res) => {
  try {
    const scenario = req.body;
    const analysis = await advancedAnalyticsService.performWhatIfAnalysis(scenario);
    res.json({ data: analysis });
  } catch (error) {
    logger.error('Failed to perform what-if analysis', { error });
    res.status(500).json({ error: 'Failed to perform analysis' });
  }
});

export default router;