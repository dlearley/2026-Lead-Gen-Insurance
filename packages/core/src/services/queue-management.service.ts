import { logger } from '../logger.js';
import type { PrismaClient } from '@prisma/client';
import type {
  QueueType,
  QueueMetrics,
  AssignmentQueue,
  SLAStatus,
} from '@insurance-lead-gen/types';

import { LeadPrioritizationService } from './lead-prioritization.service.js';
import { RoutingEngineService } from './routing-engine.service.js';

export class QueueManagementService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly leadPrioritization: LeadPrioritizationService,
    private readonly routingEngine: RoutingEngineService
  ) {}

  async enqueueLeadForAssignment(leadId: string, queueType: QueueType): Promise<void> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new Error(`Lead not found: ${leadId}`);
    }

    const leadScore = await this.leadPrioritization.calculateLeadScore(leadId);
    const tier = await this.leadPrioritization.assignLeadTier(leadScore);

    // Determine SLA based on tier
    const slaLimits: Record<string, number> = {
      hot: 2,
      active: 24,
      nurture: 168,
      waiting: 48,
      reassignment: 24,
    };

    const slaExpiry = new Date(Date.now() + slaLimits[queueType] * 60 * 60 * 1000);

    // Get current queue position
    const currentQueueCount = await this.prisma.assignmentQueue.count({
      where: { queueType },
    });

    await this.prisma.assignmentQueue.upsert({
      where: { leadId },
      create: {
        queueType,
        leadId,
        leadScore,
        timeInQueue: { days: 0, hours: 0, minutes: 0, seconds: 0 },
        assignmentAttempts: 0,
        estimatedWaitMinutes: Math.ceil(slaLimits[queueType] / 2),
        slaExpiry,
        queuePosition: currentQueueCount + 1,
      },
      update: {
        queueType,
        leadScore,
        estimatedWaitMinutes: Math.ceil(slaLimits[queueType] / 2),
        slaExpiry,
        updatedAt: new Date(),
      },
    });

    logger.info('Lead added to queue', {
      leadId,
      queueType,
      tier,
      position: currentQueueCount + 1,
    });
  }

  async processQueue(queueType: QueueType, maxAssignments = 10): Promise<number> {
    const queue = await this.prisma.assignmentQueue.findMany({
      where: { queueType },
      orderBy: { leadScore: 'desc' },
      take: maxAssignments,
      include: { lead: true },
    });

    let assignedCount = 0;

    for (const queueEntry of queue) {
      try {
        const result = await this.routingEngine.routeLead(queueEntry.leadId, 'greedy');

        if (result.success) {
          assignedCount++;

          // Update queue entry
          await this.prisma.assignmentQueue.update({
            where: { id: queueEntry.id },
            data: {
              assignmentAttempts: queueEntry.assignmentAttempts + 1,
              lastAttempted: new Date(),
            },
          });
        }
      } catch (error) {
        logger.error('Error processing queue entry', {
          error,
          leadId: queueEntry.leadId,
        });
      }
    }

    // Reorder queue after processing
    await this.reorderQueue(queueType);

    logger.info('Queue processed', {
      queueType,
      totalEntries: queue.length,
      assignedCount,
    });

    return assignedCount;
  }

  async moveLeadToQueue(leadId: string, newQueueType: QueueType, reason: string): Promise<void> {
    const queueEntry = await this.prisma.assignmentQueue.findUnique({
      where: { leadId },
    });

    if (!queueEntry) {
      throw new Error(`Lead not in queue: ${leadId}`);
    }

    const previousQueueType = queueEntry.queueType;

    await this.prisma.assignmentQueue.update({
      where: { leadId },
      data: {
        queueType: newQueueType,
        updatedAt: new Date(),
      },
    });

    // Create routing event
    await this.prisma.routingEvent.create({
      data: {
        leadId,
        eventType: 'queue_reordered',
        eventData: {
          previousQueue: previousQueueType,
          newQueue: newQueueType,
          reason,
          timestamp: new Date(),
        },
      },
    });

    // Reorder both queues
    await this.reorderQueue(previousQueueType);
    await this.reorderQueue(newQueueType);

    logger.info('Lead moved to queue', {
      leadId,
      fromQueue: previousQueueType,
      toQueue: newQueueType,
      reason,
    });
  }

  async getQueueMetrics(queueType: QueueType): Promise<QueueMetrics> {
    const queue = await this.prisma.assignmentQueue.findMany({
      where: { queueType },
      include: { lead: true },
    });

    if (queue.length === 0) {
      return {
        queueType,
        totalLeads: 0,
        avgWaitTime: 0,
        maxWaitTime: 0,
        slaComplianceRate: 100,
        assignmentRate: 0,
        abandonmentRate: 0,
        avgLeadScore: 0,
        leadsApproachingSLA: 0,
        slaBreachedCount: 0,
        updatedAt: new Date(),
      };
    }

    const now = Date.now();

    // Calculate wait times
    const waitTimes = queue.map(entry => {
      const createdAt = entry.lead.createdAt.getTime();
      return (now - createdAt) / (1000 * 60); // minutes
    });

    const avgWaitTime = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
    const maxWaitTime = Math.max(...waitTimes);

    // Calculate SLA compliance
    const slaCompliant = queue.filter(entry => {
      if (!entry.slaExpiry) return false;
      return entry.slaExpiry.getTime() > now;
    });

    const slaComplianceRate = (slaCompliant.length / queue.length) * 100;

    // Calculate leads approaching SLA (within 1 hour)
    const leadsApproachingSLA = queue.filter(entry => {
      if (!entry.slaExpiry) return false;
      const timeUntilSLA = entry.slaExpiry.getTime() - now;
      return timeUntilSLA > 0 && timeUntilSLA < 60 * 60 * 1000;
    }).length;

    // Calculate SLA breaches
    const slaBreached = queue.filter(entry => {
      if (!entry.slaExpiry) return false;
      return entry.slaExpiry.getTime() <= now;
    });

    const slaBreachedCount = slaBreached.length;

    // Calculate average lead score
    const avgLeadScore = queue.reduce((sum, entry) => sum + entry.leadScore, 0) / queue.length;

    // Calculate assignment rate (successful assignments in last hour)
    const oneHourAgo = new Date(now - 60 * 60 * 1000);
    const recentAssignments = await this.prisma.leadAssignment.count({
      where: {
        assignedAt: { gte: oneHourAgo },
      },
    });

    const assignmentRate = recentAssignments; // assignments per hour

    // Calculate abandonment rate (stale leads in queue > 24 hours)
    const abandonedLeads = queue.filter(entry => {
      const hoursInQueue = (now - entry.lead.createdAt.getTime()) / (1000 * 60 * 60);
      return hoursInQueue > 24 && entry.assignmentAttempts === 0;
    });

    const abandonmentRate = (abandonedLeads.length / queue.length) * 100;

    return {
      queueType,
      totalLeads: queue.length,
      avgWaitTime,
      maxWaitTime,
      slaComplianceRate,
      assignmentRate,
      abandonmentRate,
      avgLeadScore,
      leadsApproachingSLA,
      slaBreachedCount,
      updatedAt: new Date(),
    };
  }

  async reorderQueue(queueType: QueueType): Promise<void> {
    const queue = await this.prisma.assignmentQueue.findMany({
      where: { queueType },
      orderBy: { leadScore: 'desc' },
    });

    for (let i = 0; i < queue.length; i++) {
      await this.prisma.assignmentQueue.update({
        where: { id: queue[i].id },
        data: { queuePosition: i + 1 },
      });
    }

    logger.debug('Queue reordered', {
      queueType,
      totalEntries: queue.length,
    });
  }

  async getApproachingSLALeads(thresholdMinutes = 60): Promise<Array<{ leadId: string; slaExpiry: Date; timeRemaining: number }>> {
    const now = Date.now();
    const thresholdMs = thresholdMinutes * 60 * 1000;

    const approachingLeads = await this.prisma.assignmentQueue.findMany({
      where: {
        slaExpiry: {
          gt: new Date(now),
          lte: new Date(now + thresholdMs),
        },
      },
      include: { lead: true },
    });

    return approachingLeads.map(entry => ({
      leadId: entry.leadId,
      slaExpiry: entry.slaExpiry!,
      timeRemaining: Math.floor((entry.slaExpiry!.getTime() - now) / (1000 * 60)), // minutes
    }));
  }

  async escalateStaleLeads(staleThresholdHours = 24): Promise<number> {
    const now = Date.now();
    const staleThreshold = staleThresholdHours * 60 * 60 * 1000;

    const staleLeads = await this.prisma.assignmentQueue.findMany({
      where: {
        lead: {
          createdAt: {
            lte: new Date(now - staleThreshold),
          },
        },
        assignmentAttempts: {
          lt: 3,
        },
      },
      include: { lead: true },
    });

    let escalatedCount = 0;

    for (const queueEntry of staleLeads) {
      try {
        // Move to hot queue if not already there
        if (queueEntry.queueType !== 'hot') {
          await this.moveLeadToQueue(
            queueEntry.leadId,
            'hot',
            'Escalated due to stale lead'
          );

          // Create SLA warning event
          await this.prisma.routingEvent.create({
            data: {
              leadId: queueEntry.leadId,
              eventType: 'sla_warning',
              eventData: {
                message: `Lead is stale (${staleThresholdHours}+ hours in queue)`,
                timestamp: new Date(),
              },
            },
          });

          escalatedCount++;
        }
      } catch (error) {
        logger.error('Error escalating stale lead', {
          error,
          leadId: queueEntry.leadId,
        });
      }
    }

    logger.info('Stale leads escalated', {
      totalStale: staleLeads.length,
      escalated: escalatedCount,
    });

    return escalatedCount;
  }

  async getAllQueueMetrics(): Promise<Record<QueueType, QueueMetrics>> {
    const queueTypes: QueueType[] = ['hot', 'active', 'nurture', 'waiting', 'reassignment'];

    const metrics: Record<string, QueueMetrics> = {};

    for (const queueType of queueTypes) {
      metrics[queueType] = await this.getQueueMetrics(queueType);
    }

    return metrics as Record<QueueType, QueueMetrics>;
  }

  async getQueueDepth(queueType?: QueueType): Promise<number> {
    if (queueType) {
      return this.prisma.assignmentQueue.count({
        where: { queueType },
      });
    }

    return this.prisma.assignmentQueue.count();
  }

  async getLeadQueuePosition(leadId: string): Promise<number | null> {
    const queueEntry = await this.prisma.assignmentQueue.findUnique({
      where: { leadId },
    });

    if (!queueEntry) {
      return null;
    }

    return queueEntry.queuePosition;
  }

  async removeFromQueue(leadId: string): Promise<void> {
    const queueEntry = await this.prisma.assignmentQueue.findUnique({
      where: { leadId },
    });

    if (!queueEntry) {
      return;
    }

    const queueType = queueEntry.queueType;

    await this.prisma.assignmentQueue.delete({
      where: { leadId },
    });

    // Reorder queue
    await this.reorderQueue(queueType);

    logger.info('Lead removed from queue', {
      leadId,
      queueType,
    });
  }

  async getAgingReport(queueType: QueueType): Promise<Array<{
    leadId: string;
    hoursInQueue: number;
    score: number;
    slaStatus: string;
  }>> {
    const now = Date.now();

    const queue = await this.prisma.assignmentQueue.findMany({
      where: { queueType },
      include: { lead: true },
    });

    return queue.map(entry => {
      const hoursInQueue = (now - entry.lead.createdAt.getTime()) / (1000 * 60 * 60);
      let slaStatus = 'compliant';

      if (entry.slaExpiry && entry.slaExpiry.getTime() <= now) {
        slaStatus = 'breached';
      } else if (entry.slaExpiry && entry.slaExpiry.getTime() - now < 60 * 60 * 1000) {
        slaStatus = 'warning';
      }

      return {
        leadId: entry.leadId,
        hoursInQueue,
        score: entry.leadScore,
        slaStatus,
      };
    });
  }

  async autoProcessSLABreaches(): Promise<number> {
    const now = Date.now();

    const breachedLeads = await this.prisma.assignmentQueue.findMany({
      where: {
        slaExpiry: {
          lte: new Date(now),
        },
      },
      include: { lead: true },
    });

    let processedCount = 0;

    for (const queueEntry of breachedLeads) {
      try {
        // Create SLA breach event
        await this.prisma.routingEvent.create({
          data: {
            leadId: queueEntry.leadId,
            eventType: 'sla_breached',
            eventData: {
              message: `SLA breached for lead in ${queueEntry.queueType} queue`,
              queueType: queueEntry.queueType,
              timestamp: new Date(),
            },
          },
        });

        // Escalate to hot queue
        if (queueEntry.queueType !== 'hot') {
          await this.moveLeadToQueue(
            queueEntry.leadId,
            'hot',
            'SLA breached - auto-escalated to hot queue'
          );
        }

        processedCount++;
      } catch (error) {
        logger.error('Error processing SLA breach', {
          error,
          leadId: queueEntry.leadId,
        });
      }
    }

    logger.info('SLA breaches processed', {
      totalBreached: breachedLeads.length,
      processed: processedCount,
    });

    return processedCount;
  }
}
