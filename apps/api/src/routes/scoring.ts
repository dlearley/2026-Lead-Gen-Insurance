import { Router, Request, Response } from 'express';
import { logger } from '@insurance-lead-gen/core';
import {
  LeadScoringService,
  LeadQualificationService,
} from '@insurance-lead-gen/orchestrator';
import type {
  LeadBasicInfo,
  VehicleInfo,
  PropertyInfo,
  LifeInsuranceInfo,
  HealthInsuranceInfo,
  CommercialInsuranceInfo,
  LeadScoringResult,
  QualificationResult,
  ScoringConfig,
  RuleSet,
  InsuranceType,
} from '@insurance-lead-gen/types';

// Singleton instances
let scoringService: LeadScoringService | null = null;
let qualificationService: LeadQualificationService | null = null;

export const initializeScoringRoutes = (
  scoringSvc: LeadScoringService,
  qualificationSvc: LeadQualificationService
): Router => {
  scoringService = scoringSvc;
  qualificationService = qualificationSvc;
  return createScoringRouter();
};

const createScoringRouter = (): Router => {
  const router = Router();

  /**
   * POST /api/v1/scoring/score-lead
   * Score a lead based on provided information
   */
  router.post('/score-lead', async (req: Request, res: Response) => {
    try {
      if (!scoringService) {
        return res.status(503).json({
          success: false,
          error: 'Scoring service not initialized',
        });
      }

      const {
        leadId,
        leadData,
        vehicleInfo,
        propertyInfo,
        lifeInsuranceInfo,
        healthInsuranceInfo,
        commercialInfo,
      } = req.body as {
        leadId: string;
        leadData: LeadBasicInfo;
        vehicleInfo?: VehicleInfo;
        propertyInfo?: PropertyInfo;
        lifeInsuranceInfo?: LifeInsuranceInfo;
        healthInsuranceInfo?: HealthInsuranceInfo;
        commercialInfo?: CommercialInsuranceInfo;
      };

      if (!leadId || !leadData) {
        return res.status(400).json({
          success: false,
          error: 'leadId and leadData are required',
        });
      }

      const result = await scoringService.scoreLead(
        leadData,
        vehicleInfo,
        propertyInfo,
        lifeInsuranceInfo,
        healthInsuranceInfo,
        commercialInfo
      );

      logger.info('Lead scored via API', { leadId, score: result.normalizedScore });

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      logger.error('Failed to score lead', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to score lead',
      });
    }
  });

  /**
   * POST /api/v1/scoring/qualify-lead
   * Qualify a lead based on scoring and rules
   */
  router.post('/qualify-lead', async (req: Request, res: Response) => {
    try {
      if (!qualificationService) {
        return res.status(503).json({
          success: false,
          error: 'Qualification service not initialized',
        });
      }

      const {
        leadId,
        leadData,
        scoringResult,
        vehicleInfo,
        propertyInfo,
        lifeInsuranceInfo,
        healthInsuranceInfo,
        commercialInfo,
      } = req.body as {
        leadId: string;
        leadData: LeadBasicInfo;
        scoringResult?: LeadScoringResult;
        vehicleInfo?: VehicleInfo;
        propertyInfo?: PropertyInfo;
        lifeInsuranceInfo?: LifeInsuranceInfo;
        healthInsuranceInfo?: HealthInsuranceInfo;
        commercialInfo?: CommercialInsuranceInfo;
      };

      if (!leadId || !leadData) {
        return res.status(400).json({
          success: false,
          error: 'leadId and leadData are required',
        });
      }

      const result = await qualificationService.qualifyLead(
        leadData,
        scoringResult,
        vehicleInfo,
        propertyInfo,
        lifeInsuranceInfo,
        healthInsuranceInfo,
        commercialInfo
      );

      logger.info('Lead qualified via API', {
        leadId,
        qualification: result.qualificationLevel,
      });

      res.json({
        success: true,
        result,
      });
    } catch (error) {
      logger.error('Failed to qualify lead', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to qualify lead',
      });
    }
  });

  /**
   * POST /api/v1/scoring/score-and-qualify
   * Score and qualify a lead in one call
   */
  router.post('/score-and-qualify', async (req: Request, res: Response) => {
    try {
      if (!scoringService || !qualificationService) {
        return res.status(503).json({
          success: false,
          error: 'Services not initialized',
        });
      }

      const {
        leadId,
        leadData,
        vehicleInfo,
        propertyInfo,
        lifeInsuranceInfo,
        healthInsuranceInfo,
        commercialInfo,
      } = req.body as {
        leadId: string;
        leadData: LeadBasicInfo;
        vehicleInfo?: VehicleInfo;
        propertyInfo?: PropertyInfo;
        lifeInsuranceInfo?: LifeInsuranceInfo;
        healthInsuranceInfo?: HealthInsuranceInfo;
        commercialInfo?: CommercialInsuranceInfo;
      };

      if (!leadId || !leadData) {
        return res.status(400).json({
          success: false,
          error: 'leadId and leadData are required',
        });
      }

      // First score the lead
      const scoringResult = await scoringService.scoreLead(
        leadData,
        vehicleInfo,
        propertyInfo,
        lifeInsuranceInfo,
        healthInsuranceInfo,
        commercialInfo
      );

      // Then qualify the lead
      const qualificationResult = await qualificationService.qualifyLead(
        leadData,
        scoringResult,
        vehicleInfo,
        propertyInfo,
        lifeInsuranceInfo,
        healthInsuranceInfo,
        commercialInfo
      );

      logger.info('Lead scored and qualified via API', {
        leadId,
        score: scoringResult.normalizedScore,
        qualification: qualificationResult.qualificationLevel,
      });

      res.json({
        success: true,
        scoringResult,
        qualificationResult,
      });
    } catch (error) {
      logger.error('Failed to score and qualify lead', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to process lead',
      });
    }
  });

  /**
   * GET /api/v1/scoring/config
   * Get current scoring configuration
   */
  router.get('/config', (_req: Request, res: Response) => {
    try {
      if (!scoringService) {
        return res.status(503).json({
          success: false,
          error: 'Scoring service not initialized',
        });
      }
      const config = scoringService.getConfig();
      res.json({
        success: true,
        config,
      });
    } catch (error) {
      logger.error('Failed to get scoring config', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration',
      });
    }
  });

  /**
   * PUT /api/v1/scoring/config
   * Update scoring configuration
   */
  router.put('/config', (req: Request, res: Response) => {
    try {
      if (!scoringService) {
        return res.status(503).json({
          success: false,
          error: 'Scoring service not initialized',
        });
      }
      const { insuranceType, weights } = req.body as {
        insuranceType: InsuranceType | 'all';
        weights: Partial<ScoringConfig['weights'][keyof ScoringConfig['weights']]>;
      };

      if (!insuranceType || !weights) {
        return res.status(400).json({
          success: false,
          error: 'insuranceType and weights are required',
        });
      }

      scoringService.updateConfig({
        weights: {
          [insuranceType]: weights as ScoringConfig['weights'][keyof ScoringConfig['weights']],
        },
      } as Partial<ScoringConfig>);

      const config = scoringService.getConfig();
      res.json({
        success: true,
        config,
      });
    } catch (error) {
      logger.error('Failed to update scoring config', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration',
      });
    }
  });

  /**
   * GET /api/v1/scoring/rules
   * Get qualification rules
   */
  router.get('/rules', (_req: Request, res: Response) => {
    try {
      if (!qualificationService) {
        return res.status(503).json({
          success: false,
          error: 'Qualification service not initialized',
        });
      }
      const ruleSets = qualificationService.getRuleSets();
      res.json({
        success: true,
        rules: ruleSets,
        total: ruleSets.reduce((acc, rs) => acc + rs.rules.length, 0),
      });
    } catch (error) {
      logger.error('Failed to get scoring rules', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get rules',
      });
    }
  });

  /**
   * POST /api/v1/scoring/rules
   * Add a new rule set
   */
  router.post('/rules', (req: Request, res: Response) => {
    try {
      if (!qualificationService) {
        return res.status(503).json({
          success: false,
          error: 'Qualification service not initialized',
        });
      }
      const ruleSet = req.body as RuleSet;

      if (!ruleSet.id || !ruleSet.name) {
        return res.status(400).json({
          success: false,
          error: 'ruleSet must have id and name',
        });
      }

      qualificationService.addRuleSet(ruleSet);
      res.json({
        success: true,
        message: 'Rule set added successfully',
      });
    } catch (error) {
      logger.error('Failed to add scoring rule', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to add rule',
      });
    }
  });

  /**
   * GET /api/v1/scoring/qualification-config
   * Get qualification configuration
   */
  router.get('/qualification-config', (_req: Request, res: Response) => {
    try {
      if (!qualificationService) {
        return res.status(503).json({
          success: false,
          error: 'Qualification service not initialized',
        });
      }
      const config = qualificationService.getConfig();
      res.json({
        success: true,
        config,
      });
    } catch (error) {
      logger.error('Failed to get qualification config', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to get configuration',
      });
    }
  });

  /**
   * PUT /api/v1/scoring/qualification-config
   * Update qualification configuration
   */
  router.put('/qualification-config', (req: Request, res: Response) => {
    try {
      if (!qualificationService) {
        return res.status(503).json({
          success: false,
          error: 'Qualification service not initialized',
        });
      }
      const config = req.body;

      qualificationService.updateConfig(config);
      const updatedConfig = qualificationService.getConfig();

      res.json({
        success: true,
        config: updatedConfig,
      });
    } catch (error) {
      logger.error('Failed to update qualification config', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to update configuration',
      });
    }
  });

  /**
   * GET /api/v1/scoring/insurance-types
   * Get supported insurance types
   */
  router.get('/insurance-types', (_req: Request, res: Response) => {
    res.json({
      success: true,
      insuranceTypes: ['auto', 'home', 'life', 'health', 'commercial'],
    });
  });

  /**
   * POST /api/v1/scoring/batch-score
   * Score multiple leads in batch
   */
  router.post('/batch-score', async (req: Request, res: Response) => {
    try {
      if (!scoringService) {
        return res.status(503).json({
          success: false,
          error: 'Scoring service not initialized',
        });
      }

      const { leads } = req.body as {
        leads: Array<{
          leadId: string;
          leadData: LeadBasicInfo;
          vehicleInfo?: VehicleInfo;
          propertyInfo?: PropertyInfo;
          lifeInsuranceInfo?: LifeInsuranceInfo;
          healthInsuranceInfo?: HealthInsuranceInfo;
          commercialInfo?: CommercialInsuranceInfo;
        }>;
      };

      if (!leads || !Array.isArray(leads)) {
        return res.status(400).json({
          success: false,
          error: 'leads array is required',
        });
      }

      const results = await Promise.all(
        leads.map(async (lead) => {
          try {
            const result = await scoringService.scoreLead(
              lead.leadData,
              lead.vehicleInfo,
              lead.propertyInfo,
              lead.lifeInsuranceInfo,
              lead.healthInsuranceInfo,
              lead.commercialInfo
            );
            return { leadId: lead.leadId, success: true, result };
          } catch (error) {
            return { leadId: lead.leadId, success: false, error: 'Failed to score' };
          }
        })
      );

      const successful = results.filter((r) => r.success).length;

      logger.info('Batch scoring completed', {
        total: leads.length,
        successful,
        failed: leads.length - successful,
      });

      res.json({
        success: true,
        results,
        summary: {
          total: leads.length,
          successful,
          failed: leads.length - successful,
        },
      });
    } catch (error) {
      logger.error('Failed to batch score leads', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to process batch',
      });
    }
  });

  /**
   * POST /api/v1/scoring/batch-qualify
   * Qualify multiple leads in batch
   */
  router.post('/batch-qualify', async (req: Request, res: Response) => {
    try {
      if (!qualificationService) {
        return res.status(503).json({
          success: false,
          error: 'Qualification service not initialized',
        });
      }

      const { leads } = req.body as {
        leads: Array<{
          leadId: string;
          leadData: LeadBasicInfo;
          vehicleInfo?: VehicleInfo;
          propertyInfo?: PropertyInfo;
          lifeInsuranceInfo?: LifeInsuranceInfo;
          healthInsuranceInfo?: HealthInsuranceInfo;
          commercialInfo?: CommercialInsuranceInfo;
        }>;
      };

      if (!leads || !Array.isArray(leads)) {
        return res.status(400).json({
          success: false,
          error: 'leads array is required',
        });
      }

      const results = await Promise.all(
        leads.map(async (lead) => {
          try {
            const result = await qualificationService.qualifyLead(
              lead.leadData,
              undefined,
              lead.vehicleInfo,
              lead.propertyInfo,
              lead.lifeInsuranceInfo,
              lead.healthInsuranceInfo,
              lead.commercialInfo
            );
            return { leadId: lead.leadId, success: true, result };
          } catch (error) {
            return { leadId: lead.leadId, success: false, error: 'Failed to qualify' };
          }
        })
      );

      const successful = results.filter((r) => r.success).length;
      const qualified = results.filter(
        (r) => r.success && (r.result as QualificationResult)?.isQualified
      ).length;

      logger.info('Batch qualification completed', {
        total: leads.length,
        successful,
        qualified,
        failed: leads.length - successful,
      });

      res.json({
        success: true,
        results,
        summary: {
          total: leads.length,
          successful,
          qualified,
          failed: leads.length - successful,
        },
      });
    } catch (error) {
      logger.error('Failed to batch qualify leads', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to process batch',
      });
    }
  });

  return router;
};

// Default export for router
export default createScoringRouter();
