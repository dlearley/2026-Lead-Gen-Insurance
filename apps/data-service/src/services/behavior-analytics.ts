import { logger } from '@insurance-lead-gen/core';
import { 
  BehaviorEvent,
  BehavioralSegment,
  PersonalizationRule,
  BehaviorExperiment,
  BehavioralTrigger,
  BehaviorAnalytics,
  BehaviorInsights,
  CohortAnalysis,
  FunnelAnalysis,
  TriggerExecution,
  SegmentType,
  SegmentStatus,
  PersonalizationStatus,
  ExperimentStatus,
  TriggerStatus,
  BehaviorEventType,
  BehaviorCategory,
  TrackBehaviorEventRequest,
  GetBehaviorAnalyticsRequest,
  CreateSegmentRequest,
  CreatePersonalizationRuleRequest,
  CreateExperimentRequest,
  CreateTriggerRequest
} from '@insurance-lead-gen/types';
import { PrismaClient } from '@prisma/client';

/**
 * Behavior Analytics Service
 * Handles behavior tracking, segmentation, personalization, A/B testing, and triggers
 */
export class BehaviorAnalyticsService {
  private prisma: PrismaClient;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 60000; // 1 minute cache

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    logger.info('Behavior Analytics service initialized');
  }

  // ========================================
  // BEHAVIOR TRACKING
  // ========================================

  /**
   * Track a behavior event
   */
  async trackEvent(
    sessionId: string, 
    request: TrackBehaviorEventRequest, 
    leadId?: string, 
    userId?: string
  ): Promise<BehaviorEvent> {
    try {
      const event: BehaviorEvent = {
        id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        leadId,
        sessionId,
        userId,
        eventType: request.eventType,
        category: request.category,
        timestamp: new Date(),
        source: 'web',
        properties: request.properties || {},
        context: request.context,
        value: request.value,
        metadata: request.metadata,
      };

      // Store event in database
      await this.prisma.behaviorEvent.create({
        data: {
          id: event.id,
          leadId,
          sessionId,
          userId,
          eventType: event.eventType,
          category: event.category,
          timestamp: event.timestamp,
          source: event.source,
          page: event.page,
          properties: event.properties as any,
          context: event.context as any,
          value: event.value,
          metadata: event.metadata as any,
        }
      });

      // Update behavior analytics
      await this.updateBehaviorAnalytics(leadId || sessionId, event);

      // Check for trigger conditions
      await this.evaluateTriggers(event);

      // Cache event for real-time access
      this.cache.set(`event_${event.id}`, {
        data: event,
        timestamp: Date.now()
      });

      logger.debug('Behavior event tracked', { 
        eventType: event.eventType, 
        sessionId, 
        leadId 
      });

      return event;
    } catch (error) {
      logger.error('Failed to track behavior event', { error, sessionId });
      throw error;
    }
  }

  /**
   * Get behavior analytics for a lead or session
   */
  async getBehaviorAnalytics(request: GetBehaviorAnalyticsRequest): Promise<{
    analytics: BehaviorAnalytics;
    insights: BehaviorInsights;
    segments: BehavioralSegment[];
    activeRules: PersonalizationRule[];
  }> {
    try {
      const { leadId, sessionId, timeRange, includeEvents = false } = request;
      
      // Get behavior events
      const events = await this.getBehaviorEvents(leadId, sessionId, timeRange);
      
      // Calculate analytics
      const analytics = await this.calculateBehaviorAnalytics(leadId || sessionId, events);
      
      // Generate insights
      const insights = await this.generateBehaviorInsights(leadId || sessionId, events);
      
      // Get relevant segments
      const segments = await this.getRelevantSegments(leadId);
      
      // Get active personalization rules
      const activeRules = await this.getActivePersonalizationRules(segments.map(s => s.id));

      return {
        analytics,
        insights,
        segments,
        activeRules,
      };
    } catch (error) {
      logger.error('Failed to get behavior analytics', { error });
      throw error;
    }
  }

  /**
   * Get behavior events for a lead or session
   */
  private async getBehaviorEvents(
    leadId?: string,
    sessionId?: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<BehaviorEvent[]> {
    const where: any = {};
    
    if (leadId) where.leadId = leadId;
    if (sessionId) where.sessionId = sessionId;
    if (timeRange) {
      where.timestamp = {
        gte: timeRange.start,
        lte: timeRange.end,
      };
    }

    const events = await this.prisma.behaviorEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 1000, // Limit for performance
    });

    return events.map(event => ({
      id: event.id,
      leadId: event.leadId,
      sessionId: event.sessionId,
      userId: event.userId,
      eventType: event.eventType as BehaviorEventType,
      category: event.category as BehaviorCategory,
      timestamp: event.timestamp,
      source: event.source,
      page: event.page as any,
      properties: event.properties as Record<string, unknown>,
      context: event.context as any,
      value: event.value,
      metadata: event.metadata as Record<string, unknown>,
    }));
  }

  // ========================================
  // BEHAVIORAL SEGMENTATION
  // ========================================

  /**
   * Create a new behavioral segment
   */
  async createSegment(request: CreateSegmentRequest): Promise<BehavioralSegment> {
    try {
      const segment: BehavioralSegment = {
        id: `segment_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: request.name,
        description: request.description,
        type: request.type,
        status: 'active',
        criteria: request.criteria,
        leadCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: request.isPublic || false,
        tags: request.tags || [],
      };

      // Store in database
      await this.prisma.behavioralSegment.create({
        data: {
          id: segment.id,
          name: segment.name,
          description: segment.description,
          type: segment.type,
          status: segment.status,
          criteria: segment.criteria as any,
          leadCount: segment.leadCount,
          isPublic: segment.isPublic,
          tags: segment.tags,
        }
      });

      // Calculate initial membership
      await this.calculateSegmentMembership(segment.id);

      logger.info('Behavioral segment created', { 
        segmentId: segment.id, 
        name: segment.name,
        type: segment.type
      });

      return segment;
    } catch (error) {
      logger.error('Failed to create behavioral segment', { error });
      throw error;
    }
  }

  /**
   * Get all segments
   */
  async getSegments(page = 1, limit = 20, type?: SegmentType): Promise<{
    segments: BehavioralSegment[];
    total: number;
  }> {
    try {
      const where: any = {};
      if (type) where.type = type;

      const [segments, total] = await Promise.all([
        this.prisma.behavioralSegment.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.behavioralSegment.count({ where }),
      ]);

      return {
        segments: segments.map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          type: s.type as SegmentType,
          status: s.status as SegmentStatus,
          criteria: s.criteria as any,
          leadCount: s.leadCount,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          isPublic: s.isPublic,
          tags: s.tags,
        })),
        total,
      };
    } catch (error) {
      logger.error('Failed to get segments', { error });
      throw error;
    }
  }

  /**
   * Update segment criteria and recalculate membership
   */
  async updateSegment(segmentId: string, updates: Partial<BehavioralSegment>): Promise<BehavioralSegment> {
    try {
      const segment = await this.prisma.behavioralSegment.update({
        where: { id: segmentId },
        data: {
          name: updates.name,
          description: updates.description,
          criteria: updates.criteria as any,
          status: updates.status,
          isPublic: updates.isPublic,
          tags: updates.tags,
          updatedAt: new Date(),
        }
      });

      // Recalculate membership if criteria changed
      if (updates.criteria) {
        await this.calculateSegmentMembership(segmentId);
      }

      logger.info('Segment updated', { segmentId });

      return {
        id: segment.id,
        name: segment.name,
        description: segment.description,
        type: segment.type as SegmentType,
        status: segment.status as SegmentStatus,
        criteria: segment.criteria as any,
        leadCount: segment.leadCount,
        createdAt: segment.createdAt,
        updatedAt: segment.updatedAt,
        isPublic: segment.isPublic,
        tags: segment.tags,
      };
    } catch (error) {
      logger.error('Failed to update segment', { error, segmentId });
      throw error;
    }
  }

  /**
   * Delete a segment
   */
  async deleteSegment(segmentId: string): Promise<void> {
    try {
      await this.prisma.behavioralSegment.delete({
        where: { id: segmentId }
      });

      logger.info('Segment deleted', { segmentId });
    } catch (error) {
      logger.error('Failed to delete segment', { error, segmentId });
      throw error;
    }
  }

  /**
   * Calculate which leads belong to a segment based on criteria
   */
  private async calculateSegmentMembership(segmentId: string): Promise<void> {
    try {
      const segment = await this.prisma.behavioralSegment.findUnique({
        where: { id: segmentId }
      });

      if (!segment) {
        throw new Error('Segment not found');
      }

      // Get all leads who meet the segment criteria
      const qualifyingLeads = await this.evaluateSegmentCriteria(segment.criteria as any);
      
      // Update segment lead count
      await this.prisma.behavioralSegment.update({
        where: { id: segmentId },
        data: {
          leadCount: qualifyingLeads.length,
          lastCalculated: new Date(),
        }
      });

      logger.debug('Segment membership calculated', { 
        segmentId, 
        memberCount: qualifyingLeads.length 
      });
    } catch (error) {
      logger.error('Failed to calculate segment membership', { error, segmentId });
      throw error;
    }
  }

  /**
   * Evaluate segment criteria against behavior events
   */
  private async evaluateSegmentCriteria(criteria: any): Promise<string[]> {
    // This is a simplified implementation
    // In production, this would be much more sophisticated
    
    const eventFilters = criteria.eventFilters || [];
    const leadIds = new Set<string>();

    for (const filter of eventFilters) {
      const events = await this.prisma.behaviorEvent.findMany({
        where: {
          eventType: filter.eventType,
          ...(filter.source && { source: filter.source }),
        },
        select: { leadId: true },
        take: 1000,
      });

      events.forEach(event => {
        if (event.leadId) {
          leadIds.add(event.leadId);
        }
      });
    }

    return Array.from(leadIds);
  }

  // ========================================
  // PERSONALIZATION ENGINE
  // ========================================

  /**
   * Create a personalization rule
   */
  async createPersonalizationRule(request: CreatePersonalizationRuleRequest): Promise<PersonalizationRule> {
    try {
      const rule: PersonalizationRule = {
        id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: request.name,
        description: request.description,
        type: request.type,
        status: 'active',
        priority: request.priority,
        targetSegments: request.targetSegments,
        conditions: request.conditions,
        actions: request.actions,
        startDate: request.startDate,
        endDate: request.endDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        tags: request.tags || [],
      };

      // Store in database
      await this.prisma.personalizationRule.create({
        data: {
          id: rule.id,
          name: rule.name,
          description: rule.description,
          type: rule.type,
          status: rule.status,
          priority: rule.priority,
          targetSegments: rule.targetSegments,
          conditions: rule.conditions as any,
          actions: rule.actions as any,
          startDate: rule.startDate,
          endDate: rule.endDate,
          isActive: rule.isActive,
          tags: rule.tags,
        }
      });

      logger.info('Personalization rule created', { 
        ruleId: rule.id, 
        name: rule.name,
        type: rule.type
      });

      return rule;
    } catch (error) {
      logger.error('Failed to create personalization rule', { error });
      throw error;
    }
  }

  /**
   * Get active personalization rules for segments
   */
  async getActivePersonalizationRules(segmentIds: string[]): Promise<PersonalizationRule[]> {
    try {
      const rules = await this.prisma.personalizationRule.findMany({
        where: {
          status: 'active',
          isActive: true,
          OR: [
            { targetSegments: { hasSome: segmentIds } },
            { targetSegments: { equals: [] } } // Global rules
          ],
          OR: [
            { startDate: null },
            { startDate: { lte: new Date() } }
          ],
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } }
          ]
        },
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        take: 20,
      });

      return rules.map(rule => ({
        id: rule.id,
        name: rule.name,
        description: rule.description,
        type: rule.type,
        status: rule.status,
        priority: rule.priority,
        targetSegments: rule.targetSegments,
        conditions: rule.conditions as any,
        actions: rule.actions as any,
        startDate: rule.startDate,
        endDate: rule.endDate,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
        isActive: rule.isActive,
        tags: rule.tags,
      }));
    } catch (error) {
      logger.error('Failed to get active personalization rules', { error });
      throw error;
    }
  }

  /**
   * Get personalized content/actions for a lead
   */
  async getPersonalizedContent(leadId: string, sessionId: string): Promise<{
    content: Record<string, unknown>;
    actions: any[];
    triggeredRules: PersonalizationRule[];
  }> {
    try {
      // Get behavior analytics and segments
      const analyticsData = await this.getBehaviorAnalytics({ leadId });
      const { segments, activeRules } = analyticsData;

      // Evaluate rules against current context
      const triggeredRules = this.evaluatePersonalizationRules(
        activeRules,
        segments.map(s => s.id),
        analyticsData.analytics
      );

      // Generate personalized content
      const content = this.generatePersonalizedContent(triggeredRules);
      const actions = this.extractActions(triggeredRules);

      return {
        content,
        actions,
        triggeredRules,
      };
    } catch (error) {
      logger.error('Failed to get personalized content', { error, leadId });
      throw error;
    }
  }

  /**
   * Evaluate personalization rules against current context
   */
  private evaluatePersonalizationRules(
    rules: PersonalizationRule[],
    segmentIds: string[],
    analytics: BehaviorAnalytics
  ): PersonalizationRule[] {
    return rules.filter(rule => {
      // Check if rule targets user's segments
      const segmentMatch = rule.targetSegments.length === 0 || // Global rule
        rule.targetSegments.some(segmentId => segmentIds.includes(segmentId));

      if (!segmentMatch) return false;

      // Check if conditions are met
      return this.evaluateConditions(rule.conditions, analytics);
    }).sort((a, b) => b.priority - a.priority);
  }

  /**
   * Evaluate conditions against analytics data
   */
  private evaluateConditions(conditions: any[], analytics: BehaviorAnalytics): boolean {
    // Simplified condition evaluation
    // In production, this would be more sophisticated
    
    if (conditions.length === 0) return true;

    const results = conditions.map(condition => {
      switch (condition.field) {
        case 'engagementScore':
          return this.compareValue(analytics.engagementScore, condition.operator, condition.value);
        case 'intentScore':
          return this.compareValue(analytics.intentScore, condition.operator, condition.value);
        case 'conversionProbability':
          return this.compareValue(analytics.conversionProbability, condition.operator, condition.value);
        default:
          return true;
      }
    });

    return results.every(result => result);
  }

  /**
   * Compare values based on operator
   */
  private compareValue(actual: unknown, operator: string, expected: unknown): boolean {
    switch (operator) {
      case 'equals': return actual === expected;
      case 'not_equals': return actual !== expected;
      case 'greater_than': return Number(actual) > Number(expected);
      case 'less_than': return Number(actual) < Number(expected);
      case 'contains': return String(actual).includes(String(expected));
      default: return true;
    }
  }

  /**
   * Generate personalized content from triggered rules
   */
  private generatePersonalizedContent(rules: PersonalizationRule[]): Record<string, unknown> {
    const content: Record<string, unknown> = {};

    rules.forEach(rule => {
      rule.actions.forEach(action => {
        if (action.type === 'content') {
          content[action.template] = {
            ...action.variables,
            source: rule.name,
          };
        }
      });
    });

    return content;
  }

  /**
   * Extract actions from triggered rules
   */
  private extractActions(rules: PersonalizationRule[]): any[] {
    const actions: any[] = [];

    rules.forEach(rule => {
      rule.actions.forEach(action => {
        actions.push({
          ...action,
          ruleId: rule.id,
          ruleName: rule.name,
        });
      });
    });

    return actions;
  }

  // ========================================
  // A/B TESTING
  // ========================================

  /**
   * Create a behavior experiment
   */
  async createExperiment(request: CreateExperimentRequest): Promise<BehaviorExperiment> {
    try {
      const experiment: BehaviorExperiment = {
        id: `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: request.name,
        description: request.description,
        type: request.type,
        status: 'draft',
        hypothesis: request.hypothesis,
        successMetrics: request.successMetrics,
        targetSegments: request.targetSegments,
        trafficAllocation: request.trafficAllocation,
        variants: request.variants.map((variant, index) => ({
          ...variant,
          id: `variant_${Date.now()}_${index}`,
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: request.metadata,
      };

      // Store in database
      await this.prisma.behaviorExperiment.create({
        data: {
          id: experiment.id,
          name: experiment.name,
          description: experiment.description,
          type: experiment.type,
          status: experiment.status,
          hypothesis: experiment.hypothesis,
          successMetrics: experiment.successMetrics,
          targetSegments: experiment.targetSegments,
          trafficAllocation: experiment.trafficAllocation as any,
          variants: experiment.variants as any,
          metadata: experiment.metadata as any,
        }
      });

      logger.info('Behavior experiment created', { 
        experimentId: experiment.id, 
        name: experiment.name 
      });

      return experiment;
    } catch (error) {
      logger.error('Failed to create behavior experiment', { error });
      throw error;
    }
  }

  /**
   * Get experiment variants for a user
   */
  async getExperimentVariants(experimentId: string, userId: string): Promise<string> {
    try {
      const experiment = await this.prisma.behaviorExperiment.findUnique({
        where: { id: experimentId }
      });

      if (!experiment || experiment.status !== 'running') {
        return 'control';
      }

      // Simple hash-based assignment
      const hash = this.hashString(userId + experimentId);
      const percentage = (hash % 100) + 1;

      let cumulativePercentage = 0;
      const variants = experiment.trafficAllocation as any;

      for (const variant of variants.variants) {
        cumulativePercentage += variant.percentage;
        if (percentage <= cumulativePercentage) {
          return variant.variantId;
        }
      }

      return 'control';
    } catch (error) {
      logger.error('Failed to get experiment variants', { error, experimentId });
      return 'control';
    }
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  // ========================================
  // BEHAVIORAL TRIGGERS
  // ========================================

  /**
   * Create a behavioral trigger
   */
  async createTrigger(request: CreateTriggerRequest): Promise<BehavioralTrigger> {
    try {
      const trigger: BehavioralTrigger = {
        id: `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: request.name,
        description: request.description,
        event: request.event,
        status: 'active',
        conditions: request.conditions,
        actions: request.actions,
        targetSegments: request.targetSegments,
        cooldown: request.cooldown,
        priority: request.priority,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastTriggered: undefined,
        triggerCount: 0,
      };

      // Store in database
      await this.prisma.behavioralTrigger.create({
        data: {
          id: trigger.id,
          name: trigger.name,
          description: trigger.description,
          event: trigger.event,
          status: trigger.status,
          conditions: trigger.conditions as any,
          actions: trigger.actions as any,
          targetSegments: trigger.targetSegments,
          cooldown: trigger.cooldown,
          priority: trigger.priority,
          triggerCount: trigger.triggerCount,
        }
      });

      logger.info('Behavioral trigger created', { 
        triggerId: trigger.id, 
        name: trigger.name,
        event: trigger.event
      });

      return trigger;
    } catch (error) {
      logger.error('Failed to create behavioral trigger', { error });
      throw error;
    }
  }

  /**
   * Evaluate triggers when a behavior event occurs
   */
  private async evaluateTriggers(event: BehaviorEvent): Promise<void> {
    try {
      const triggers = await this.prisma.behavioralTrigger.findMany({
        where: {
          status: 'active',
          event: this.mapEventToTrigger(event.eventType),
        }
      });

      for (const trigger of triggers) {
        await this.executeTriggerIfConditionsMet(trigger, event);
      }
    } catch (error) {
      logger.error('Failed to evaluate triggers', { error });
    }
  }

  /**
   * Map behavior event type to trigger event
   */
  private mapEventToTrigger(eventType: BehaviorEventType): string {
    const mapping: Record<BehaviorEventType, string> = {
      'page_view': 'high_engagement',
      'form_start': 'high_engagement',
      'form_submit': 'high_engagement',
      'form_abandon': 'low_engagement',
      'email_open': 'email_engagement',
      'email_click': 'email_engagement',
      'quote_request': 'intent',
      'application_start': 'high_engagement',
      'application_complete': 'high_engagement',
      // ... add more mappings
    };

    return mapping[eventType] || 'high_engagement';
  }

  /**
   * Execute trigger if conditions are met
   */
  private async executeTriggerIfConditionsMet(trigger: any, event: BehaviorEvent): Promise<void> {
    try {
      // Check cooldown period
      if (trigger.lastTriggered) {
        const timeSinceLastTrigger = Date.now() - new Date(trigger.lastTriggered).getTime();
        if (timeSinceLastTrigger < trigger.cooldown * 60 * 1000) {
          return; // Still in cooldown
        }
      }

      // Check if event matches trigger conditions
      if (!this.evaluateTriggerConditions(trigger.conditions, event)) {
        return;
      }

      // Execute trigger actions
      await this.executeTriggerActions(trigger, event);

      // Update trigger stats
      await this.prisma.behavioralTrigger.update({
        where: { id: trigger.id },
        data: {
          lastTriggered: new Date(),
          triggerCount: { increment: 1 },
        }
      });

      logger.debug('Trigger executed', { triggerId: trigger.id, eventType: event.eventType });
    } catch (error) {
      logger.error('Failed to execute trigger', { error, triggerId: trigger.id });
    }
  }

  /**
   * Evaluate trigger conditions
   */
  private evaluateTriggerConditions(conditions: any[], event: BehaviorEvent): boolean {
    // Simplified condition evaluation
    return true; // In production, this would check actual conditions
  }

  /**
   * Execute trigger actions
   */
  private async executeTriggerActions(trigger: any, event: BehaviorEvent): Promise<void> {
    try {
      const execution: TriggerExecution = {
        id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        triggerId: trigger.id,
        leadId: event.leadId || 'unknown',
        executedAt: new Date(),
        actions: [],
        context: {
          eventType: event.eventType,
          sessionId: event.sessionId,
        },
      };

      // Execute each action
      for (const action of trigger.actions) {
        try {
          await this.executeAction(action, event);
          execution.actions.push({
            actionId: action.id,
            status: 'success' as const,
            result: { message: 'Action executed successfully' },
          });
        } catch (error) {
          execution.actions.push({
            actionId: action.id,
            status: 'failed' as const,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      // Store execution record
      await this.prisma.triggerExecution.create({
        data: {
          id: execution.id,
          triggerId: execution.triggerId,
          leadId: execution.leadId,
          executedAt: execution.executedAt,
          actions: execution.actions as any,
          context: execution.context as any,
        }
      });
    } catch (error) {
      logger.error('Failed to execute trigger actions', { error, triggerId: trigger.id });
    }
  }

  /**
   * Execute individual action
   */
  private async executeAction(action: any, event: BehaviorEvent): Promise<void> {
    switch (action.action) {
      case 'send_email':
        // Implement email sending
        logger.info('Send email action', { to: event.leadId, template: action.parameters.template });
        break;
      case 'send_sms':
        // Implement SMS sending
        logger.info('Send SMS action', { to: event.leadId, message: action.parameters.message });
        break;
      case 'assign_agent':
        // Implement agent assignment
        logger.info('Assign agent action', { leadId: event.leadId, agentId: action.parameters.agentId });
        break;
      case 'create_task':
        // Implement task creation
        logger.info('Create task action', { leadId: event.leadId, task: action.parameters.task });
        break;
      default:
        logger.warn('Unknown action type', { actionType: action.action });
    }
  }

  // ========================================
  // ANALYTICS & INSIGHTS
  // ========================================

  /**
   * Calculate behavior analytics for a lead/session
   */
  private async calculateBehaviorAnalytics(
    identifier: string, 
    events: BehaviorEvent[]
  ): Promise<BehaviorAnalytics> {
    const totalEvents = events.length;
    const uniqueEventTypes = new Set(events.map(e => e.eventType)).size;
    const totalTimeSpent = this.calculateTotalTimeSpent(events);
    const averageSessionDuration = totalTimeSpent / Math.max(1, new Set(events.map(e => e.sessionId)).size);
    
    // Calculate scores based on event types and patterns
    const engagementScore = this.calculateEngagementScore(events);
    const interestScore = this.calculateInterestScore(events);
    const intentScore = this.calculateIntentScore(events);
    const conversionProbability = this.calculateConversionProbability(events);

    // Get segments for this lead
    const segments = await this.getRelevantSegments(identifier);

    // Determine behavior pattern
    const behaviorPattern = this.determineBehaviorPattern(events);

    return {
      leadId: identifier,
      sessionId: events[0]?.sessionId || '',
      totalEvents,
      uniqueEventTypes,
      totalTimeSpent,
      averageSessionDuration,
      engagementScore,
      interestScore,
      intentScore,
      conversionProbability,
      segments: segments.map(s => s.id),
      recentEvents: events.slice(0, 10),
      behaviorPattern,
      lastActivity: events[0]?.timestamp || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Generate behavior insights
   */
  private async generateBehaviorInsights(
    identifier: string, 
    events: BehaviorEvent[]
  ): Promise<BehaviorInsights> {
    const insights = [];

    // Pattern insights
    if (events.length > 10) {
      insights.push({
        id: `insight_${Date.now()}_1`,
        type: 'pattern' as const,
        title: 'High Engagement Pattern Detected',
        description: 'User shows consistent engagement across multiple touchpoints',
        impact: 'medium' as const,
        confidence: 0.85,
        recommendation: 'Consider advanced personalization based on engagement history',
        data: { eventCount: events.length, uniqueSessions: new Set(events.map(e => e.sessionId)).size },
        createdAt: new Date(),
      });
    }

    // Anomaly detection
    const recentEvents = events.slice(0, 5);
    if (recentEvents.some(e => e.eventType === 'form_abandon')) {
      insights.push({
        id: `insight_${Date.now()}_2`,
        type: 'risk' as const,
        title: 'Form Abandonment Detected',
        description: 'User started but did not complete form submission',
        impact: 'high' as const,
        confidence: 0.9,
        recommendation: 'Trigger recovery campaign with simplified form or assistance',
        data: { abandonmentEvents: recentEvents.filter(e => e.eventType === 'form_abandon').length },
        createdAt: Date.now(),
      } as any);
    }

    return {
      leadId: identifier,
      insights,
      generatedAt: new Date(),
    };
  }

  /**
   * Get relevant segments for a lead
   */
  private async getRelevantSegments(leadId: string): Promise<BehavioralSegment[]> {
    const segments = await this.prisma.behavioralSegment.findMany({
      where: {
        status: 'active',
      },
      take: 10,
    });

    return segments.map(segment => ({
      id: segment.id,
      name: segment.name,
      description: segment.description,
      type: segment.type as SegmentType,
      status: segment.status as SegmentStatus,
      criteria: segment.criteria as any,
      leadCount: segment.leadCount,
      createdAt: segment.createdAt,
      updatedAt: segment.updatedAt,
      isPublic: segment.isPublic,
      tags: segment.tags,
    }));
  }

  /**
   * Update behavior analytics after new event
   */
  private async updateBehaviorAnalytics(identifier: string, event: BehaviorEvent): Promise<void> {
    try {
      // In production, this would update the analytics record in the database
      // For now, we'll just cache the event
      this.cache.set(`analytics_${identifier}`, {
        data: { lastEvent: event, timestamp: Date.now() },
        timestamp: Date.now()
      });
    } catch (error) {
      logger.error('Failed to update behavior analytics', { error });
    }
  }

  /**
   * Calculate total time spent from events
   */
  private calculateTotalTimeSpent(events: BehaviorEvent[]): number {
    if (events.length < 2) return 0;

    const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    let totalTime = 0;

    for (let i = 1; i < sortedEvents.length; i++) {
      const timeDiff = sortedEvents[i].timestamp.getTime() - sortedEvents[i - 1].timestamp.getTime();
      if (timeDiff < 30 * 60 * 1000) { // Only count if within 30 minutes (session timeout)
        totalTime += timeDiff;
      }
    }

    return totalTime;
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(events: BehaviorEvent[]): number {
    const weights: Record<BehaviorEventType, number> = {
      'page_view': 1,
      'form_start': 3,
      'form_submit': 5,
      'email_open': 2,
      'email_click': 4,
      'quote_request': 8,
      'application_start': 10,
      'application_complete': 15,
      // ... add more weights
    };

    const totalScore = events.reduce((sum, event) => {
      return sum + (weights[event.eventType] || 1);
    }, 0);

    return Math.min(100, totalScore);
  }

  /**
   * Calculate interest score (0-100)
   */
  private calculateInterestScore(events: BehaviorEvent[]): number {
    const interestEvents = events.filter(e => 
      ['form_start', 'quote_request', 'application_start', 'video_play'].includes(e.eventType)
    ).length;

    return Math.min(100, interestEvents * 10);
  }

  /**
   * Calculate intent score (0-100)
   */
  private calculateIntentScore(events: BehaviorEvent[]): number {
    const intentEvents = events.filter(e => 
      ['quote_request', 'application_start', 'application_complete'].includes(e.eventType)
    ).length;

    return Math.min(100, intentEvents * 20);
  }

  /**
   * Calculate conversion probability (0-100)
   */
  private calculateConversionProbability(events: BehaviorEvent[]): number {
    const recentEvents = events.filter(e => {
      const eventAge = Date.now() - e.timestamp.getTime();
      return eventAge < 7 * 24 * 60 * 60 * 1000; // Within last 7 days
    });

    let probability = 0;

    // Base probability from event types
    const conversionEvents = recentEvents.filter(e => 
      ['application_start', 'application_complete', 'form_submit'].includes(e.eventType)
    ).length;

    probability += conversionEvents * 25;

    // Adjust for recency
    const latestEvent = recentEvents[0];
    if (latestEvent) {
      const hoursSinceLastEvent = (Date.now() - latestEvent.timestamp.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastEvent < 24) probability += 20;
      else if (hoursSinceLastEvent < 168) probability += 10; // Within a week
    }

    return Math.min(100, probability);
  }

  /**
   * Determine behavior pattern
   */
  private determineBehaviorPattern(events: BehaviorEvent[]): string {
    const eventTypes = events.map(e => e.eventType);
    
    if (eventTypes.includes('application_complete')) return 'high_intent';
    if (eventTypes.includes('quote_request')) return 'qualified_interest';
    if (eventTypes.includes('form_abandon')) return 'exploring';
    if (eventTypes.includes('page_view')) return 'browsing';
    
    return 'unknown';
  }

  /**
   * Clear analytics cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.info('Behavior analytics cache cleared');
  }
}