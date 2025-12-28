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
      headers: {
        'Authorization': req.headers.authorization || ''
      }
    });
    res.status(response.status).json(response.data);
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      logger.error('Proxy to data service failed', { endpoint, error: error.message });
      res.status(error.response?.status || 500).json({
        error: 'Failed to proxy to data service',
        message: error.message,
        details: error.response?.data
      });
    } else {
      logger.error('Unknown error during proxy', { endpoint, error });
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

/**
 * @swagger
 * tags:
 *   name: Pricing
 *   description: Pricing intelligence and margin optimization endpoints
 */

/**
 * @swagger
 * /api/v1/pricing/margin-analysis/{quoteId}:
 *   get:
 *     summary: Get margin analysis for a quote
 *     tags: [Pricing]
 *     parameters:
 *       - in: path
 *         name: quoteId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: includeFactors
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: includeRecommendations
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: Successfully retrieved margin analysis
 *       404:
 *         description: Quote not found
 *       500:
 *         description: Internal server error
 */
router.get('/margin-analysis/:quoteId', async (req: Request, res: Response): Promise<void> => {
  const { quoteId } = req.params;
  await proxyToDataService(req, res, `/api/pricing/margin-analysis/${quoteId}`);
});

/**
 * @swagger
 * /api/v1/pricing/margin-analysis/{quoteId}/history:
 *   get:
 *     summary: Get margin analysis history for a quote
 *     tags: [Pricing]
 *     parameters:
 *       - in: path
 *         name: quoteId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved margin analysis history
 *       404:
 *         description: Quote not found
 *       500:
 *         description: Internal server error
 */
router.get('/margin-analysis/:quoteId/history', async (req: Request, res: Response): Promise<void> => {
  const { quoteId } = req.params;
  await proxyToDataService(req, res, `/api/pricing/margin-analysis/${quoteId}/history`);
});

/**
 * @swagger
 * /api/v1/pricing/margin-opportunities:
 *   get:
 *     summary: Find margin improvement opportunities
 *     tags: [Pricing]
 *     parameters:
 *       - in: query
 *         name: insuranceType
 *         schema:
 *           type: string
 *           enum: [AUTO, HOME, LIFE, HEALTH, COMMERCIAL]
 *       - in: query
 *         name: minPotential
 *         schema:
 *           type: number
 *       - in: query
 *         name: agentId
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved margin opportunities
 *       500:
 *         description: Internal server error
 */
router.get('/margin-opportunities', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/pricing/margin-opportunities');
});

/**
 * @swagger
 * /api/v1/pricing/competitive-analysis:
 *   get:
 *     summary: Get competitive pricing analysis
 *     tags: [Pricing]
 *     parameters:
 *       - in: query
 *         name: insuranceType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [AUTO, HOME, LIFE, HEALTH, COMMERCIAL]
 *       - in: query
 *         name: coverageTier
 *         schema:
 *           type: string
 *           enum: [BASIC, STANDARD, PREMIUM, ELITE]
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved competitive analysis
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Internal server error
 */
router.get('/competitive-analysis', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/pricing/competitive-analysis');
});

/**
 * @swagger
 * /api/v1/pricing/competitive-prices:
 *   post:
 *     summary: Add competitor price data
 *     tags: [Pricing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [competitor, insuranceType, premium, location]
 *             properties:
 *               competitor:
 *                 type: string
 *               insuranceType:
 *                 type: string
 *               coverageTier:
 *                 type: string
 *               premium:
 *                 type: number
 *               coverage:
 *                 type: object
 *               location:
 *                 type: object
 *               marketShare:
 *                 type: number
 *               qualityScore:
 *                 type: number
 *     responses:
 *       201:
 *         description: Successfully added competitor price
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: Internal server error
 */
router.post('/competitive-prices', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/pricing/competitive-prices');
});

/**
 * @swagger
 * /api/v1/pricing/market-benchmark:
 *   get:
 *     summary: Get market benchmark data
 *     tags: [Pricing]
 *     parameters:
 *       - in: query
 *         name: insuranceType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [AUTO, HOME, LIFE, HEALTH, COMMERCIAL]
 *       - in: query
 *         name: coverageTier
 *         schema:
 *           type: string
 *           enum: [BASIC, STANDARD, PREMIUM, ELITE]
 *       - in: query
 *         name: state
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successfully retrieved market benchmark
 *       400:
 *         description: Invalid parameters
 *       500:
 *         description: Internal server error
 */
router.get('/market-benchmark', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/pricing/market-benchmark');
});

/**
 * @swagger
 * /api/v1/pricing/optimize:
 *   post:
 *     summary: Optimize pricing for maximum margins
 *     tags: [Pricing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quoteId, constraints, factors]
 *             properties:
 *               quoteId:
 *                 type: string
 *               constraints:
 *                 type: object
 *                 properties:
 *                   minMargin:
 *                     type: number
 *                   targetMargin:
 *                     type: number
 *                   maxPremium:
 *                     type: number
 *                   competitiveness:
 *                     type: string
 *                     enum: [LEAD, MEET, OPTIMIZE]
 *               factors:
 *                 type: object
 *                 properties:
 *                   considerCompetition:
 *                     type: boolean
 *                   considerDemand:
 *                     type: boolean
 *                   considerCustomerSegment:
 *                     type: boolean
 *     responses:
 *       200:
 *         description: Successfully optimized pricing
 *       400:
 *         description: Invalid request body
 *       404:
 *         description: Quote not found
 *       500:
 *         description: Internal server error
 */
router.post('/optimize', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/pricing/optimize');
});

/**
 * @swagger
 * /api/v1/pricing/strategies:
 *   get:
 *     summary: List pricing strategies
 *     tags: [Pricing]
 *     parameters:
 *       - in: query
 *         name: insuranceType
 *         schema:
 *           type: string
 *           enum: [AUTO, HOME, LIFE, HEALTH, COMMERCIAL]
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Successfully retrieved pricing strategies
 *       500:
 *         description: Internal server error
 */
router.get('/strategies', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/pricing/strategies');
});

/**
 * @swagger
 * /api/v1/pricing/strategies:
 *   post:
 *     summary: Create a pricing strategy
 *     tags: [Pricing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, insuranceType, rules, marginTarget, minMargin, maxMargin]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               insuranceType:
 *                 type: string
 *               rules:
 *                 type: array
 *               marginTarget:
 *                 type: number
 *               minMargin:
 *                 type: number
 *               maxMargin:
 *                 type: number
 *     responses:
 *       201:
 *         description: Successfully created pricing strategy
 *       400:
 *         description: Invalid request body
 *       500:
 *         description: Internal server error
 */
router.post('/strategies', async (req: Request, res: Response): Promise<void> => {
  await proxyToDataService(req, res, '/api/pricing/strategies');
});

export default router;