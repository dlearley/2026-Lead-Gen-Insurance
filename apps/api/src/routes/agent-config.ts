import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { logger } from '@insurance-lead-gen/core';
import { AgentConfigurationService } from '@insurance-lead-gen/orchestrator';
import type {
  CreateAgentAvailabilityDto,
  UpdateAgentAvailabilityDto,
  CreateAgentLeadPreferencesDto,
  UpdateAgentLeadPreferencesDto,
  CreateAgentNotificationPreferencesDto,
  UpdateAgentNotificationPreferencesDto,
  CreateAgentProfileCustomizationDto,
  UpdateAgentProfileCustomizationDto,
  CreateAgentCertificationDto,
  UpdateAgentCertificationDto,
  CreateAgentSkillDto,
  UpdateAgentSkillDto,
  CreateAgentPerformanceThresholdsDto,
  UpdateAgentPerformanceThresholdsDto,
} from '@insurance-lead-gen/types';

const router = Router();
const configService = new AgentConfigurationService();

// Validation schemas
const workHoursSchema = z.object({
  dayOfWeek: z.enum(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
  isEnabled: z.boolean(),
  timezone: z.string().optional(),
});

const availabilitySchema = z.object({
  status: z.enum(['available', 'busy', 'away', 'offline']).optional(),
  workHours: z.array(workHoursSchema),
  breakTimes: z.array(z.object({
    startTime: z.string(),
    endTime: z.string(),
    description: z.string().optional(),
  })).optional(),
  timeOff: z.array(z.object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().optional(),
  })).optional(),
  maxConcurrentLeads: z.number().positive().optional(),
  autoAcceptLeads: z.boolean().optional(),
});

const leadPreferencesSchema = z.object({
  insuranceTypes: z.record(z.enum(['preferred', 'neutral', 'avoid'])),
  minLeadQualityScore: z.number().min(0).max(100).optional(),
  maxLeadQualityScore: z.number().min(0).max(100).optional(),
  preferredLocations: z.array(z.string()).optional(),
  excludedLocations: z.array(z.string()).optional(),
  minBudget: z.number().positive().optional(),
  maxBudget: z.number().positive().optional(),
  preferredLeadSources: z.array(z.string()).optional(),
  excludedLeadSources: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
});

const notificationPreferencesSchema = z.object({
  channels: z.object({
    email: z.boolean().optional(),
    sms: z.boolean().optional(),
    push: z.boolean().optional(),
    in_app: z.boolean().optional(),
  }).optional(),
  leadAssignment: z.object({
    enabled: z.boolean(),
    channels: z.array(z.enum(['email', 'sms', 'push', 'in_app'])),
    quietHours: z.object({
      startTime: z.string(),
      endTime: z.string(),
    }).optional(),
  }).optional(),
  leadUpdates: z.object({
    enabled: z.boolean(),
    channels: z.array(z.enum(['email', 'sms', 'push', 'in_app'])),
  }).optional(),
  performanceAlerts: z.object({
    enabled: z.boolean(),
    channels: z.array(z.enum(['email', 'sms', 'push', 'in_app'])),
  }).optional(),
  systemNotifications: z.object({
    enabled: z.boolean(),
    channels: z.array(z.enum(['email', 'sms', 'push', 'in_app'])),
  }).optional(),
});

const profileCustomizationSchema = z.object({
  bio: z.string().optional(),
  profileImageUrl: z.string().url().optional(),
  headline: z.string().optional(),
  yearsOfExperience: z.number().int().min(0).optional(),
  languages: z.array(z.string()).optional(),
  awards: z.array(z.string()).optional(),
  socialLinks: z.object({
    linkedin: z.string().url().optional(),
    twitter: z.string().url().optional(),
    website: z.string().url().optional(),
  }).optional(),
  videoIntroUrl: z.string().url().optional(),
  tagline: z.string().optional(),
});

const certificationSchema = z.object({
  name: z.string().min(1),
  issuingOrganization: z.string().min(1),
  certificationNumber: z.string().optional(),
  issueDate: z.coerce.date(),
  expirationDate: z.coerce.date().optional(),
  documentUrl: z.string().url().optional(),
});

const updateCertificationSchema = certificationSchema.partial().extend({
  status: z.enum(['active', 'expired', 'pending_renewal', 'suspended']).optional(),
});

const skillSchema = z.object({
  skillName: z.string().min(1),
  category: z.string().min(1),
  proficiencyLevel: z.number().int().min(1).max(5),
  yearsOfExperience: z.number().int().min(0).optional(),
});

const updateSkillSchema = skillSchema.partial().extend({
  endorsements: z.number().int().min(0).optional(),
  lastUsedAt: z.coerce.date().optional(),
});

const performanceThresholdsSchema = z.object({
  targets: z.object({
    monthlyLeadGoal: z.number().int().positive().optional(),
    monthlyConversionGoal: z.number().int().positive().optional(),
    targetConversionRate: z.number().min(0).max(100).optional(),
    targetResponseTime: z.number().positive().optional(),
    minQualityRating: z.number().min(1).max(5).optional(),
  }).optional(),
  alerts: z.object({
    lowConversionRate: z.object({
      enabled: z.boolean(),
      threshold: z.number().min(0).max(100),
    }).optional(),
    slowResponseTime: z.object({
      enabled: z.boolean(),
      threshold: z.number().positive(),
    }).optional(),
    capacityWarning: z.object({
      enabled: z.boolean(),
      threshold: z.number().min(0).max(100),
    }).optional(),
  }).optional(),
});

// ========================================
// AVAILABILITY ENDPOINTS
// ========================================

/**
 * POST /api/v1/agents/:agentId/availability
 * Create agent availability schedule
 */
router.post('/:agentId/availability', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const validated = availabilitySchema.parse(req.body);

    const availability = await configService.createAvailability(agentId, validated);

    logger.info('Agent availability created', { agentId });
    res.status(201).json(availability);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error creating agent availability', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/agents/:agentId/availability
 * Update agent availability schedule
 */
router.put('/:agentId/availability', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const validated = availabilitySchema.partial().parse(req.body);

    const availability = await configService.updateAvailability(agentId, validated);

    logger.info('Agent availability updated', { agentId });
    res.json(availability);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    logger.error('Error updating agent availability', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/agents/:agentId/availability
 * Get agent availability schedule
 */
router.get('/:agentId/availability', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const availability = await configService.getAvailability(agentId);

    if (!availability) {
      res.status(404).json({ error: 'Availability not found' });
      return;
    }

    res.json(availability);
  } catch (error) {
    logger.error('Error fetching agent availability', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/agents/:agentId/availability/check
 * Check if agent is currently available
 */
router.get('/:agentId/availability/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const isAvailable = await configService.isAgentAvailable(agentId);

    res.json({ agentId, isAvailable, checkedAt: new Date() });
  } catch (error) {
    logger.error('Error checking agent availability', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// LEAD PREFERENCES ENDPOINTS
// ========================================

/**
 * POST /api/v1/agents/:agentId/preferences
 * Create agent lead preferences
 */
router.post('/:agentId/preferences', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const validated = leadPreferencesSchema.parse(req.body);

    const preferences = await configService.createLeadPreferences(agentId, validated);

    logger.info('Agent lead preferences created', { agentId });
    res.status(201).json(preferences);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error creating agent lead preferences', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/agents/:agentId/preferences
 * Update agent lead preferences
 */
router.put('/:agentId/preferences', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const validated = leadPreferencesSchema.partial().parse(req.body);

    const preferences = await configService.updateLeadPreferences(agentId, validated);

    logger.info('Agent lead preferences updated', { agentId });
    res.json(preferences);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    logger.error('Error updating agent lead preferences', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/agents/:agentId/preferences
 * Get agent lead preferences
 */
router.get('/:agentId/preferences', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const preferences = await configService.getLeadPreferences(agentId);

    if (!preferences) {
      res.status(404).json({ error: 'Lead preferences not found' });
      return;
    }

    res.json(preferences);
  } catch (error) {
    logger.error('Error fetching agent lead preferences', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// NOTIFICATION PREFERENCES ENDPOINTS
// ========================================

/**
 * POST /api/v1/agents/:agentId/notifications
 * Create agent notification preferences
 */
router.post('/:agentId/notifications', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const validated = notificationPreferencesSchema.parse(req.body);

    const preferences = await configService.createNotificationPreferences(agentId, validated);

    logger.info('Agent notification preferences created', { agentId });
    res.status(201).json(preferences);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error creating agent notification preferences', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/agents/:agentId/notifications
 * Update agent notification preferences
 */
router.put('/:agentId/notifications', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const validated = notificationPreferencesSchema.partial().parse(req.body);

    const preferences = await configService.updateNotificationPreferences(agentId, validated);

    logger.info('Agent notification preferences updated', { agentId });
    res.json(preferences);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    logger.error('Error updating agent notification preferences', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/agents/:agentId/notifications
 * Get agent notification preferences
 */
router.get('/:agentId/notifications', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const preferences = await configService.getNotificationPreferences(agentId);

    if (!preferences) {
      res.status(404).json({ error: 'Notification preferences not found' });
      return;
    }

    res.json(preferences);
  } catch (error) {
    logger.error('Error fetching agent notification preferences', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// PROFILE CUSTOMIZATION ENDPOINTS
// ========================================

/**
 * POST /api/v1/agents/:agentId/profile
 * Create agent profile customization
 */
router.post('/:agentId/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const validated = profileCustomizationSchema.parse(req.body);

    const customization = await configService.createProfileCustomization(agentId, validated);

    logger.info('Agent profile customization created', { agentId });
    res.status(201).json(customization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error creating agent profile customization', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/agents/:agentId/profile
 * Update agent profile customization
 */
router.put('/:agentId/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const validated = profileCustomizationSchema.parse(req.body);

    const customization = await configService.updateProfileCustomization(agentId, validated);

    logger.info('Agent profile customization updated', { agentId });
    res.json(customization);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    logger.error('Error updating agent profile customization', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/agents/:agentId/profile
 * Get agent profile customization
 */
router.get('/:agentId/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const customization = await configService.getProfileCustomization(agentId);

    if (!customization) {
      res.status(404).json({ error: 'Profile customization not found' });
      return;
    }

    res.json(customization);
  } catch (error) {
    logger.error('Error fetching agent profile customization', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// PERFORMANCE THRESHOLDS ENDPOINTS
// ========================================

/**
 * POST /api/v1/agents/:agentId/thresholds
 * Create agent performance thresholds
 */
router.post('/:agentId/thresholds', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const validated = performanceThresholdsSchema.parse(req.body);

    const thresholds = await configService.createPerformanceThresholds(agentId, validated);

    logger.info('Agent performance thresholds created', { agentId });
    res.status(201).json(thresholds);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error creating agent performance thresholds', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/agents/:agentId/thresholds
 * Update agent performance thresholds
 */
router.put('/:agentId/thresholds', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const validated = performanceThresholdsSchema.parse(req.body);

    const thresholds = await configService.updatePerformanceThresholds(agentId, validated);

    logger.info('Agent performance thresholds updated', { agentId });
    res.json(thresholds);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    logger.error('Error updating agent performance thresholds', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/agents/:agentId/thresholds
 * Get agent performance thresholds
 */
router.get('/:agentId/thresholds', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const thresholds = await configService.getPerformanceThresholds(agentId);

    if (!thresholds) {
      res.status(404).json({ error: 'Performance thresholds not found' });
      return;
    }

    res.json(thresholds);
  } catch (error) {
    logger.error('Error fetching agent performance thresholds', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// CERTIFICATIONS ENDPOINTS
// ========================================

/**
 * POST /api/v1/agents/:agentId/certifications
 * Add agent certification
 */
router.post('/:agentId/certifications', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const validated = certificationSchema.parse(req.body);

    const certification = await configService.addCertification(agentId, validated);

    logger.info('Agent certification added', { agentId, certificationId: certification.id });
    res.status(201).json(certification);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error adding agent certification', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/agents/:agentId/certifications
 * Get agent certifications
 */
router.get('/:agentId/certifications', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const certifications = await configService.getCertifications(agentId);

    res.json({ agentId, certifications, total: certifications.length });
  } catch (error) {
    logger.error('Error fetching agent certifications', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/agents/certifications/:certificationId
 * Update agent certification
 */
router.put('/certifications/:certificationId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { certificationId } = req.params;
    const validated = updateCertificationSchema.parse(req.body);

    const certification = await configService.updateCertification(certificationId, validated);

    logger.info('Agent certification updated', { certificationId });
    res.json(certification);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    logger.error('Error updating agent certification', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// SKILLS ENDPOINTS
// ========================================

/**
 * POST /api/v1/agents/:agentId/skills
 * Add agent skill
 */
router.post('/:agentId/skills', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const validated = skillSchema.parse(req.body);

    const skill = await configService.addSkill(agentId, validated);

    logger.info('Agent skill added', { agentId, skillId: skill.id });
    res.status(201).json(skill);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    logger.error('Error adding agent skill', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/v1/agents/:agentId/skills
 * Get agent skills
 */
router.get('/:agentId/skills', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const skills = await configService.getSkills(agentId);

    res.json({ agentId, skills, total: skills.length });
  } catch (error) {
    logger.error('Error fetching agent skills', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/v1/agents/skills/:skillId
 * Update agent skill
 */
router.put('/skills/:skillId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { skillId } = req.params;
    const validated = updateSkillSchema.parse(req.body);

    const skill = await configService.updateSkill(skillId, validated);

    logger.info('Agent skill updated', { skillId });
    res.json(skill);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    if (error instanceof Error && error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
      return;
    }
    logger.error('Error updating agent skill', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========================================
// COMPLETE CONFIGURATION ENDPOINTS
// ========================================

/**
 * GET /api/v1/agents/:agentId/configuration
 * Get complete agent configuration
 */
router.get('/:agentId/configuration', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const configuration = await configService.getCompleteConfiguration(agentId);

    if (!configuration) {
      res.status(404).json({ error: 'Agent configuration not found or incomplete' });
      return;
    }

    res.json(configuration);
  } catch (error) {
    logger.error('Error fetching complete agent configuration', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/v1/agents/:agentId/configuration/initialize
 * Initialize default configuration for new agent
 */
router.post('/:agentId/configuration/initialize', async (req: Request, res: Response): Promise<void> => {
  try {
    const { agentId } = req.params;
    const configuration = await configService.initializeDefaultConfiguration(agentId);

    logger.info('Default agent configuration initialized', { agentId });
    res.status(201).json(configuration);
  } catch (error) {
    logger.error('Error initializing default agent configuration', { error });
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
