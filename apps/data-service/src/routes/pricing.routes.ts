import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import {
  MarginAnalysisService,
  CompetitiveAnalysisService,
  PricingOptimizationService
} from '../services';
import { db } from '../database.js';
import {
  InsuranceType,
  CoverageTier,
  QuoteStatus
} from '@repo/types';

export function createPricingRoutes(
  marginService: MarginAnalysisService,
  competitiveService: CompetitiveAnalysisService,
  optimizationService: PricingOptimizationService
): Router {
  const router = Router();

/**
 * @swagger
 * tags:
 *   name: Pricing
 *   description: Pricing intelligence and margin optimization
 */

/**
 * @swagger
 * /api/pricing/margin-analysis/{quoteId}:
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
 *         description: Margin analysis details
 */
router.get(
  '/margin-analysis/:quoteId',
  authenticate,
  [
    param('quoteId').isString(),
    query('includeFactors').optional().isBoolean(),
    query('includeRecommendations').optional().isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { quoteId } = req.params;
      const includeFactors = req.query.includeFactors !== 'false';
      const includeRecommendations = req.query.includeRecommendations !== 'false';

      // Get quote details
      const quote = await db.quote.findUnique({
        where: { id: quoteId }
      });

      if (!quote) {
        return res.status(404).json({ error: 'Quote not found' });
      }

      // Perform margin analysis
      const analysis = await marginService.analyzeQuoteMargin(quote);

      res.json({
        success: true,
        data: {
          ...analysis,
          factors: includeFactors ? analysis.factors : undefined,
          recommendations: includeRecommendations ? analysis.recommendations : undefined
        }
      });
    } catch (error) {
      console.error('Error getting margin analysis:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/pricing/margin-analysis/{quoteId}/history:
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
 *         description: Margin analysis history
 */
router.get(
  '/margin-analysis/:quoteId/history',
  authenticate,
  [param('quoteId').isString()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { quoteId } = req.params;
      const history = await marginService.getQuoteMarginHistory(quoteId);

      res.json({
        success: true,
        data: history,
        count: history.length
      });
    } catch (error) {
      console.error('Error getting margin analysis history:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/pricing/margin-opportunities:
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
 *         description: Margin opportunities
 */
router.get(
  '/margin-opportunities',
  authenticate,
  [
    query('insuranceType').optional().isIn(['AUTO', 'HOME', 'LIFE', 'HEALTH', 'COMMERCIAL']),
    query('minPotential').optional().isNumeric(),
    query('agentId').optional().isString()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const filters = {
        insuranceType: req.query.insuranceType as InsuranceType,
        minPotential: req.query.minPotential ? parseFloat(req.query.minPotential as string) : undefined,
        agentId: req.query.agentId as string
      };

      const opportunities = await marginService.findMarginOpportunities(filters);

      res.json({
        success: true,
        data: opportunities,
        totalOpportunities: opportunities.length,
        potentialRevenue: opportunities.reduce((sum, opp) => sum + opp.revenueImpact, 0)
      });
    } catch (error) {
      console.error('Error finding margin opportunities:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/pricing/competitive-analysis:
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
 *         description: Competitive analysis
 */
router.get(
  '/competitive-analysis',
  authenticate,
  [
    query('insuranceType').isIn(['AUTO', 'HOME', 'LIFE', 'HEALTH', 'COMMERCIAL']),
    query('coverageTier').optional().isIn(['BASIC', 'STANDARD', 'PREMIUM', 'ELITE']),
    query('state').isLength({ min: 2, max: 2 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const insuranceType = req.query.insuranceType as InsuranceType;
      const coverageTier = (req.query.coverageTier as CoverageTier) || 'STANDARD';
      const state = req.query.state as string;

      const analysis = await competitiveService.getCompetitiveAnalysis(
        insuranceType,
        coverageTier,
        { state }
      );

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      console.error('Error getting competitive analysis:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/pricing/competitive-prices:
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
 *         description: Competitor price added
 */
router.post(
  '/competitive-prices',
  authenticate,
  [
    body('competitor').isString(),
    body('insuranceType').isIn(['AUTO', 'HOME', 'LIFE', 'HEALTH', 'COMMERCIAL']),
    body('coverageTier').optional().isIn(['BASIC', 'STANDARD', 'PREMIUM', 'ELITE']),
    body('premium').isNumeric(),
    body('coverage').optional().isObject(),
    body('location').isObject(),
    body('marketShare').optional().isNumeric(),
    body('qualityScore').optional().isNumeric()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const price = await competitiveService.addCompetitorPrice({
        competitor: req.body.competitor,
        insuranceType: req.body.insuranceType,
        coverageTier: req.body.coverageTier || 'STANDARD',
        premium: req.body.premium,
        coverage: req.body.coverage || {},
        location: req.body.location,
        marketShare: req.body.marketShare,
        qualityScore: req.body.qualityScore,
        notes: req.body.notes,
        dateCollected: new Date()
      });

      res.status(201).json({
        success: true,
        data: price
      });
    } catch (error) {
      console.error('Error adding competitive price:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/pricing/market-benchmark:
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
 *         description: Market benchmark data
 */
router.get(
  '/market-benchmark',
  authenticate,
  [
    query('insuranceType').isIn(['AUTO', 'HOME', 'LIFE', 'HEALTH', 'COMMERCIAL']),
    query('coverageTier').optional().isIn(['BASIC', 'STANDARD', 'PREMIUM', 'ELITE']),
    query('state').isLength({ min: 2, max: 2 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const insuranceType = req.query.insuranceType as InsuranceType;
      const coverageTier = (req.query.coverageTier as CoverageTier) || 'STANDARD';
      const state = req.query.state as string;

      const benchmark = await competitiveService.getMarketBenchmark(
        insuranceType,
        coverageTier,
        { state }
      );

      res.json({
        success: true,
        data: benchmark
      });
    } catch (error) {
      console.error('Error getting market benchmark:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/pricing/optimize:
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
 *         description: Price optimization result
 */
router.post(
  '/optimize',
  authenticate,
  [
    body('quoteId').isString(),
    body('constraints.minMargin').isNumeric(),
    body('constraints.targetMargin').isNumeric(),
    body('constraints.maxPremium').optional().isNumeric(),
    body('constraints.competitiveness').optional().isIn(['LEAD', 'MEET', 'OPTIMIZE']),
    body('factors.considerCompetition').isBoolean(),
    body('factors.considerDemand').isBoolean(),
    body('factors.considerCustomerSegment').isBoolean()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const optimization = await optimizationService.optimizePrice({
        quoteId: req.body.quoteId,
        constraints: req.body.constraints,
        factors: req.body.factors
      });

      res.json({
        success: true,
        data: optimization
      });
    } catch (error) {
      console.error('Error optimizing price:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/pricing/strategies:
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
 *         description: List of pricing strategies
 */
router.get(
  '/strategies',
  authenticate,
  [
    query('insuranceType').optional().isIn(['AUTO', 'HOME', 'LIFE', 'HEALTH', 'COMMERCIAL']),
    query('isActive').optional().isBoolean(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const skip = (page - 1) * limit;

      const whereClause: any = {
        ...(req.query.insuranceType && { insuranceType: req.query.insuranceType }),
        ...(req.query.isActive !== undefined && { isActive: req.query.isActive === 'true' })
      };

      const [strategies, total] = await Promise.all([
        db.pricingStrategy.findMany({
          where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        db.pricingStrategy.count({
          where: Object.keys(whereClause).length > 0 ? whereClause : undefined
        })
      ]);

      res.json({
        success: true,
        data: strategies,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Error getting pricing strategies:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

/**
 * @swagger
 * /api/pricing/strategies:
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
 *         description: Pricing strategy created
 */
router.post(
  '/strategies',
  authenticate,
  [
    body('name').isString(),
    body('description').optional().isString(),
    body('insuranceType').isIn(['AUTO', 'HOME', 'LIFE', 'HEALTH', 'COMMERCIAL']),
    body('rules').isArray(),
    body('marginTarget').isNumeric(),
    body('minMargin').isNumeric(),
    body('maxMargin').isNumeric()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const strategy = await optimizationService.createPricingStrategy(req.body);

      res.status(201).json({
        success: true,
        data: strategy
      });
    } catch (error) {
      console.error('Error creating pricing strategy:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
);

  return router;
}