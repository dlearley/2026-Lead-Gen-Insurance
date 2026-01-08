import { Router, Request, Response, NextFunction } from 'express';
import { deduplicationService } from '../services/deduplication.service.js';
import {
  DeduplicationJob,
  DuplicateGroup,
  DeduplicationRule,
  DeduplicationAction,
  MatchAlgorithm,
} from '@insurance-lead-gen/types';
import { validate } from '../middleware/validation.js';
import { body, param, query } from 'express-validator';

const deduplicationRouter = Router();

/**
 * @swagger
 * tags:
 *   name: Deduplication
 *   description: Advanced deduplication engine API
 */

// ========================================
// DEDUPLICATION JOBS
// ========================================

/**
 * @swagger
 * /api/v1/deduplication/jobs:
 *   post:
 *     summary: Create a new deduplication job
 *     tags: [Deduplication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - source
 *               - sourceType
 *               - algorithm
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               source:
 *                 type: string
 *               sourceType:
 *                 type: string
 *                 enum: [CRM, CSV, API, DATABASE]
 *               algorithm:
 *                 type: string
 *                 enum: [EXACT, FUZZY, ML, HYBRID]
 *               rules:
 *                 type: array
 *                 items:
 *                   type: string
 *               config:
 *                 type: object
 *     responses:
 *       201:
 *         description: Deduplication job created successfully
 *       400:
 *         description: Invalid request
 */
deduplicationRouter.post(
  '/jobs',
  validate([
    body('name').isString().withMessage('Job name is required'),
    body('source').isString().withMessage('Source is required'),
    body('sourceType').isIn(['CRM', 'CSV', 'API', 'DATABASE']).withMessage('Invalid source type'),
    body('algorithm').isIn(['EXACT', 'FUZZY', 'ML', 'HYBRID']).withMessage('Invalid algorithm'),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await deduplicationService.createJob(req.body);
      res.status(201).json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/deduplication/jobs:
 *   get:
 *     summary: List deduplication jobs
 *     tags: [Deduplication]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED]
 *       - in: query
 *         name: sourceType
 *         schema:
 *           type: string
 *           enum: [CRM, CSV, API, DATABASE]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: List of deduplication jobs
 */
deduplicationRouter.get('/jobs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      status: req.query.status as string,
      sourceType: req.query.sourceType as string,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    
    const { jobs, total } = await deduplicationService.listJobs(filters);
    res.json({
      success: true,
      data: jobs,
      total,
      page: filters.page || 1,
      totalPages: Math.ceil(total / (filters.limit || 10)),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/deduplication/jobs/{jobId}:
 *   get:
 *     summary: Get a deduplication job by ID
 *     tags: [Deduplication]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deduplication job details
 *       404:
 *         description: Job not found
 */
deduplicationRouter.get(
  '/jobs/:jobId',
  validate([param('jobId').isString().withMessage('Job ID is required')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const job = await deduplicationService.getJob(req.params.jobId);
      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found',
        });
      }
      res.json({
        success: true,
        data: job,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// DUPLICATE GROUPS
// ========================================

/**
 * @swagger
 * /api/v1/deduplication/groups:
 *   get:
 *     summary: List duplicate groups
 *     tags: [Deduplication]
 *     parameters:
 *       - in: query
 *         name: jobId
 *         schema:
 *           type: string
 *       - in: query
 *         name: confidence
 *         schema:
 *           type: string
 *           enum: [HIGH, MEDIUM, LOW, UNCERTAIN]
 *       - in: query
 *         name: reviewed
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: minScore
 *         schema:
 *           type: number
 *           minimum: 0
 *           maximum: 1
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: List of duplicate groups
 */
deduplicationRouter.get('/groups', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      jobId: req.query.jobId as string,
      confidence: req.query.confidence as string,
      reviewed: req.query.reviewed ? req.query.reviewed === 'true' : undefined,
      minScore: req.query.minScore ? parseFloat(req.query.minScore as string) : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    
    const { groups, total } = await deduplicationService.listGroups(filters);
    res.json({
      success: true,
      data: groups,
      total,
      page: filters.page || 1,
      totalPages: Math.ceil(total / (filters.limit || 10)),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/deduplication/groups/{groupId}:
 *   get:
 *     summary: Get duplicate group details
 *     tags: [Deduplication]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Duplicate group details
 *       404:
 *         description: Group not found
 */
deduplicationRouter.get(
  '/groups/:groupId',
  validate([param('groupId').isString().withMessage('Group ID is required')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await deduplicationService.getGroupDetails(req.params.groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found',
        });
      }
      res.json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/deduplication/groups/{groupId}:
 *   patch:
 *     summary: Update duplicate group
 *     tags: [Deduplication]
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reviewed:
 *                 type: boolean
 *               reviewStatus:
 *                 type: string
 *                 enum: [APPROVED, REJECTED, MANUAL]
 *     responses:
 *       200:
 *         description: Group updated successfully
 *       404:
 *         description: Group not found
 */
deduplicationRouter.patch(
  '/groups/:groupId',
  validate([
    param('groupId').isString().withMessage('Group ID is required'),
    body('reviewed').optional().isBoolean().withMessage('Reviewed must be a boolean'),
    body('reviewStatus').optional().isIn(['APPROVED', 'REJECTED', 'MANUAL']).withMessage('Invalid review status'),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const group = await deduplicationService.updateGroup(req.params.groupId, req.body);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found',
        });
      }
      res.json({
        success: true,
        data: group,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// DEDUPLICATION RULES
// ========================================

/**
 * @swagger
 * /api/v1/deduplication/rules:
 *   post:
 *     summary: Create a new deduplication rule
 *     tags: [Deduplication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - type
 *               - priority
 *               - conditions
 *               - action
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [EXACT_MATCH, FUZZY_MATCH, PHONE_NORMALIZATION, EMAIL_NORMALIZATION, NAME_MATCHING, ADDRESS_MATCHING, CUSTOM_FUNCTION]
 *               priority:
 *                 type: number
 *               enabled:
 *                 type: boolean
 *               conditions:
 *                 type: array
 *                 items:
 *                   type: object
 *               action:
 *                 type: string
 *                 enum: [MERGE, SKIP, FLAG, REVIEW, AUTO_RESOLVE]
 *     responses:
 *       201:
 *         description: Rule created successfully
 *       400:
 *         description: Invalid request
 */
deduplicationRouter.post(
  '/rules',
  validate([
    body('name').isString().withMessage('Rule name is required'),
    body('type').isIn(['EXACT_MATCH', 'FUZZY_MATCH', 'PHONE_NORMALIZATION', 'EMAIL_NORMALIZATION', 'NAME_MATCHING', 'ADDRESS_MATCHING', 'CUSTOM_FUNCTION']).withMessage('Invalid rule type'),
    body('priority').isInt({ min: 1, max: 1000 }).withMessage('Priority must be between 1 and 1000'),
    body('action').isIn(['MERGE', 'SKIP', 'FLAG', 'REVIEW', 'AUTO_RESOLVE']).withMessage('Invalid action'),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rule = await deduplicationService.createRule(req.body);
      res.status(201).json({
        success: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/deduplication/rules:
 *   get:
 *     summary: List deduplication rules
 *     tags: [Deduplication]
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [EXACT_MATCH, FUZZY_MATCH, PHONE_NORMALIZATION, EMAIL_NORMALIZATION, NAME_MATCHING, ADDRESS_MATCHING, CUSTOM_FUNCTION]
 *       - in: query
 *         name: enabled
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *     responses:
 *       200:
 *         description: List of deduplication rules
 */
deduplicationRouter.get('/rules', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const filters = {
      type: req.query.type as string,
      enabled: req.query.enabled ? req.query.enabled === 'true' : undefined,
      page: req.query.page ? parseInt(req.query.page as string) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
    };
    
    const { rules, total } = await deduplicationService.listRules(filters);
    res.json({
      success: true,
      data: rules,
      total,
      page: filters.page || 1,
      totalPages: Math.ceil(total / (filters.limit || 10)),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/deduplication/rules/{ruleId}:
 *   get:
 *     summary: Get a rule by ID
 *     tags: [Deduplication]
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Rule details
 *       404:
 *         description: Rule not found
 */
deduplicationRouter.get(
  '/rules/:ruleId',
  validate([param('ruleId').isString().withMessage('Rule ID is required')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rule = await deduplicationService.getRule(req.params.ruleId);
      if (!rule) {
        return res.status(404).json({
          success: false,
          error: 'Rule not found',
        });
      }
      res.json({
        success: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/deduplication/rules/{ruleId}:
 *   patch:
 *     summary: Update a rule
 *     tags: [Deduplication]
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               priority:
 *                 type: number
 *               enabled:
 *                 type: boolean
 *               action:
 *                 type: string
 *                 enum: [MERGE, SKIP, FLAG, REVIEW, AUTO_RESOLVE]
 *     responses:
 *       200:
 *         description: Rule updated successfully
 *       404:
 *         description: Rule not found
 */
deduplicationRouter.patch(
  '/rules/:ruleId',
  validate([
    param('ruleId').isString().withMessage('Rule ID is required'),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const rule = await deduplicationService.updateRule(req.params.ruleId, req.body);
      if (!rule) {
        return res.status(404).json({
          success: false,
          error: 'Rule not found',
        });
      }
      res.json({
        success: true,
        data: rule,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/deduplication/rules/{ruleId}:
 *   delete:
 *     summary: Delete a rule
 *     tags: [Deduplication]
 *     parameters:
 *       - in: path
 *         name: ruleId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Rule deleted successfully
 *       404:
 *         description: Rule not found
 */
deduplicationRouter.delete(
  '/rules/:ruleId',
  validate([param('ruleId').isString().withMessage('Rule ID is required')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const deleted = await deduplicationService.deleteRule(req.params.ruleId);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Rule not found',
        });
      }
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// BATCH OPERATIONS
// ========================================

/**
 * @swagger
 * /api/v1/deduplication/batch-merge:
 *   post:
 *     summary: Merge multiple duplicate groups
 *     tags: [Deduplication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - duplicateGroupIds
 *               - mergeStrategy
 *             properties:
 *               duplicateGroupIds:
 *                 type: array
 *                 items:
 *                   type: string
 *               mergeStrategy:
 *                 type: string
 *                 enum: [prefer_newest, prefer_oldest, prefer_highest_score, custom]
 *               reviewMode:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Merge completed successfully
 *       400:
 *         description: Invalid request
 */
deduplicationRouter.post(
  '/batch-merge',
  validate([
    body('duplicateGroupIds').isArray({ min: 1 }).withMessage('At least one group ID is required'),
    body('mergeStrategy').isIn(['prefer_newest', 'prefer_oldest', 'prefer_highest_score', 'custom']).withMessage('Invalid merge strategy'),
  ]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await deduplicationService.batchMerge(req.body);
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
);

// ========================================
// ANALYTICS & REPORTS
// ========================================

/**
 * @swagger
 * /api/v1/deduplication/analytics:
 *   get:
 *     summary: Get deduplication analytics
 *     tags: [Deduplication]
 *     responses:
 *       200:
 *         description: Analytics data
 */
deduplicationRouter.get('/analytics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analytics = await deduplicationService.getAnalytics();
    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/deduplication/reports/{jobId}:
 *   get:
 *     summary: Generate deduplication report
 *     tags: [Deduplication]
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Deduplication report
 *       404:
 *         description: Job not found
 */
deduplicationRouter.get(
  '/reports/:jobId',
  validate([param('jobId').isString().withMessage('Job ID is required')]),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const report = await deduplicationService.generateReport(req.params.jobId);
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default deduplicationRouter;