import { logger, OnboardingMetrics } from '@insurance-lead-gen/core';
import type {
  Agent,
  Lead,
  Notification,
  OnboardingFeedbackResponse,
  OnboardingFeedbackSubmission,
  OnboardingRiskLevel,
  OnboardingSession,
  OnboardingStatus,
  OnboardingStep,
} from '@insurance-lead-gen/types';
import { ONBOARDING_STEPS } from '@insurance-lead-gen/types';
import { store, generateId } from '../storage/in-memory.js';

const STEP_ORDER: OnboardingStep[] = [
  ONBOARDING_STEPS.SignedUp,
  ONBOARDING_STEPS.ConfiguredAgent,
  ONBOARDING_STEPS.FirstLead,
  ONBOARDING_STEPS.FirstConversion,
];

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function toDays(ms: number): number {
  return ms / (1000 * 60 * 60 * 24);
}

function toHours(ms: number): number {
  return ms / (1000 * 60 * 60);
}

function sentimentFromText(text: string | undefined): number {
  if (!text) return 0;
  const t = text.toLowerCase();

  const positives = ['love', 'great', 'awesome', 'helpful', 'easy', 'fast', 'perfect', 'amazing'];
  const negatives = ['hate', 'bad', 'terrible', 'slow', 'confusing', 'broken', 'hard', 'frustrat', 'bug'];

  let score = 0;
  for (const p of positives) if (t.includes(p)) score += 1;
  for (const n of negatives) if (t.includes(n)) score -= 1;

  return clamp(score / 5, -1, 1);
}

function npsCategory(npsScore: number): OnboardingFeedbackResponse['npsCategory'] {
  if (npsScore <= 6) return 'detractor';
  if (npsScore <= 8) return 'passive';
  return 'promoter';
}

function sentimentBucket(score: number): 'negative' | 'neutral' | 'positive' {
  if (score <= -0.25) return 'negative';
  if (score >= 0.25) return 'positive';
  return 'neutral';
}

function isAgentConfigured(agent: Agent): boolean {
  return (
    agent.licenseNumber.trim().length > 0 &&
    agent.location.state.trim().length > 0 &&
    agent.specializations.length > 0
  );
}

function buildDefaultSteps(now: Date): OnboardingSession['steps'] {
  return {
    [ONBOARDING_STEPS.SignedUp]: {
      step: ONBOARDING_STEPS.SignedUp,
      startedAt: now,
      completedAt: now,
    },
    [ONBOARDING_STEPS.ConfiguredAgent]: {
      step: ONBOARDING_STEPS.ConfiguredAgent,
      startedAt: now,
    },
    [ONBOARDING_STEPS.FirstLead]: {
      step: ONBOARDING_STEPS.FirstLead,
      startedAt: now,
    },
    [ONBOARDING_STEPS.FirstConversion]: {
      step: ONBOARDING_STEPS.FirstConversion,
      startedAt: now,
    },
  };
}

function computeCompletionPercentage(session: OnboardingSession): number {
  const completedCount = STEP_ORDER.filter((s) => session.steps[s].completedAt).length;
  return Math.round((completedCount / STEP_ORDER.length) * 100);
}

function currentStepFromSteps(session: OnboardingSession): OnboardingStep {
  for (const step of STEP_ORDER) {
    if (!session.steps[step].completedAt) return step;
  }
  return ONBOARDING_STEPS.FirstConversion;
}

function computeRisk(session: OnboardingSession, now: Date): OnboardingSession['risk'] {
  if (session.completedAt) {
    return {
      status: 'completed',
      score: 0,
      level: 'LOW',
      reasons: [],
      churnProbability: 0.05,
    };
  }

  const ageHours = toHours(now.getTime() - session.startedAt.getTime());
  const pct = session.completionPercentage;

  const reasons: string[] = [];
  let score = 0;

  // 48h objective: if user is still < 50% after 48h => at risk
  if (ageHours >= 48 && pct < 50) {
    score += 0.35;
    reasons.push('Stuck early in onboarding (>48h, <50% complete)');
  }

  // Abandoned signup warning: no agent configuration within 24h
  if (ageHours >= 24 && !session.steps[ONBOARDING_STEPS.ConfiguredAgent].completedAt) {
    score += 0.25;
    reasons.push('Agent not configured within 24 hours');
  }

  // Slow activation: no leads after 72h
  if (ageHours >= 72 && session.engagement.leadCount === 0) {
    score += 0.35;
    reasons.push('No leads generated within 72 hours');
  }

  // Lead quality issues
  if (
    session.engagement.leadCount >= 3 &&
    session.engagement.averageLeadQuality !== undefined &&
    session.engagement.averageLeadQuality < 50
  ) {
    score += 0.15;
    reasons.push('Low lead quality (<50 average)');
  }

  // Conversion issues
  if (session.engagement.leadCount >= 5 && session.engagement.conversionCount === 0) {
    score += 0.15;
    reasons.push('No conversions after 5+ leads');
  }

  score = clamp(score, 0, 1);

  const churnProbability = clamp(0.15 + score * 0.85, 0, 1);

  const level: OnboardingRiskLevel =
    churnProbability >= 0.8
      ? 'CRITICAL'
      : churnProbability >= 0.6
        ? 'HIGH'
        : churnProbability >= 0.4
          ? 'MEDIUM'
          : 'LOW';

  const status: OnboardingStatus = level === 'HIGH' || level === 'CRITICAL' ? 'at_risk' : 'on_track';

  return {
    status,
    score,
    level,
    reasons,
    churnProbability,
  };
}

function recommendationsFromSession(session: OnboardingSession): string[] {
  const recs: string[] = [];

  for (const reason of session.risk.reasons) {
    if (reason.includes('configured')) {
      recs.push('Reach out with a 15-minute setup call to complete agent configuration.');
      recs.push('Provide a checklist: specialization, state coverage, capacity, and routing preferences.');
    }

    if (reason.includes('No leads generated')) {
      recs.push('Verify lead sources are connected and at least one campaign is active.');
      recs.push('Recommend enabling automated lead routing + follow-up templates.');
    }

    if (reason.includes('Low lead quality')) {
      recs.push('Review targeting filters and adjust insurance type / geography / qualification thresholds.');
    }

    if (reason.includes('No conversions')) {
      recs.push('Add a conversion playbook: call script, quote turnaround SLA, and follow-up cadence.');
    }

    if (reason.includes('Stuck early')) {
      recs.push('Escalate to onboarding specialist: customer is at risk of churn.');
    }
  }

  if (recs.length === 0) {
    recs.push('Keep progressing through the onboarding steps to reach first lead and first conversion.');
  }

  return [...new Set(recs)];
}

export class OnboardingTracker {
  private metrics: OnboardingMetrics | null = null;
  private service = 'api';
  private interval: NodeJS.Timeout | null = null;

  initialize(metrics: OnboardingMetrics, service: string): void {
    this.metrics = metrics;
    this.service = service;

    // Periodic recompute to power abandoned signup alerts even if no new events
    if (!this.interval) {
      this.interval = setInterval(() => {
        try {
          this.recomputeAggregates();
        } catch (error) {
          logger.warn('Failed to recompute onboarding aggregates', { error });
        }
      }, 60_000);
      this.interval.unref?.();
    }
  }

  ensureSession(customerId: string, now: Date = new Date()): OnboardingSession {
    const existing = store.onboardingSessions.get(customerId);
    if (existing) return existing;

    const session: OnboardingSession = {
      id: generateId(),
      customerId,
      startedAt: now,
      lastActivityAt: now,
      steps: buildDefaultSteps(now),
      completionPercentage: 25,
      currentStep: ONBOARDING_STEPS.ConfiguredAgent,
      milestones: {},
      engagement: {
        leadCount: 0,
        conversionCount: 0,
      },
      risk: {
        status: 'on_track',
        score: 0,
        level: 'LOW',
        reasons: [],
        churnProbability: 0.15,
      },
      recommendations: [],
      createdAt: now,
      updatedAt: now,
    };

    session.risk = computeRisk(session, now);
    session.recommendations = recommendationsFromSession(session);

    store.onboardingSessions.set(customerId, session);

    this.metrics?.recordSessionStarted(this.service);
    this.metrics?.recordStepCompleted(ONBOARDING_STEPS.SignedUp, this.service);

    this.recomputeAggregates();

    return session;
  }

  recordAgentSignup(agent: Agent): OnboardingSession {
    const now = new Date();
    const session = this.ensureSession(agent.id, now);

    if (isAgentConfigured(agent)) {
      this.completeStep(agent.id, ONBOARDING_STEPS.ConfiguredAgent, now);
    }

    this.createNotification({
      userId: '00000000-0000-0000-0000-000000000001',
      type: 'onboarding_milestone',
      title: 'New onboarding started',
      message: `Agent ${agent.firstName} ${agent.lastName} (${agent.email}) signed up.`,
      entityType: 'agent',
      entityId: agent.id,
      metadata: { milestone: 'signed_up' },
    });

    return session;
  }

  recordAgentUpdated(agent: Agent): void {
    const now = new Date();
    this.ensureSession(agent.id, now);

    if (isAgentConfigured(agent)) {
      this.completeStep(agent.id, ONBOARDING_STEPS.ConfiguredAgent, now);
    }
  }

  recordLeadAssigned(agentId: string, lead: Lead): void {
    const now = new Date();

    // Ensure session exists
    this.ensureSession(agentId, now);

    // If lead assigned, assume agent is configured or at least progress to that step
    this.completeStep(agentId, ONBOARDING_STEPS.ConfiguredAgent, now);

    const session = this.completeStep(agentId, ONBOARDING_STEPS.FirstLead, now);

    if (session.milestones.firstLeadAt && session.milestones.firstLeadAt.getTime() === now.getTime()) {
      const days = toDays(now.getTime() - session.startedAt.getTime());
      this.metrics?.recordTimeToFirstLead(this.service, days);

      this.createNotification({
        userId: '00000000-0000-0000-0000-000000000001',
        type: 'onboarding_milestone',
        title: 'First lead achieved',
        message: `Agent ${agentId} received their first lead.`,
        entityType: 'agent',
        entityId: agentId,
        metadata: { milestone: 'first_lead', leadId: lead.id },
      });
    }

    // Update lead quality tracking
    if (lead.qualityScore !== undefined) {
      const prevAvg = session.engagement.averageLeadQuality;
      const prevCount = session.engagement.leadCount;
      const newAvg =
        prevAvg === undefined
          ? lead.qualityScore
          : (prevAvg * (prevCount - 1) + lead.qualityScore) / prevCount;

      session.engagement.averageLeadQuality = newAvg;
      session.updatedAt = now;
      store.onboardingSessions.set(agentId, session);
      this.recomputeAggregates();
    }
  }

  recordConversion(agentId: string, leadId?: string): void {
    const now = new Date();
    this.ensureSession(agentId, now);
    this.completeStep(agentId, ONBOARDING_STEPS.ConfiguredAgent, now);
    this.completeStep(agentId, ONBOARDING_STEPS.FirstLead, now);

    const session = this.completeStep(agentId, ONBOARDING_STEPS.FirstConversion, now);

    if (session.milestones.firstConversionAt && session.milestones.firstConversionAt.getTime() === now.getTime()) {
      const hours = toHours(now.getTime() - session.startedAt.getTime());
      this.metrics?.recordTimeToCompletion(this.service, hours);

      this.createNotification({
        userId: '00000000-0000-0000-0000-000000000001',
        type: 'onboarding_completed',
        title: 'Onboarding completed',
        message: `Agent ${agentId} achieved first conversion.`,
        entityType: 'agent',
        entityId: agentId,
        metadata: { milestone: 'first_conversion', leadId },
      });
    }
  }

  completeStep(customerId: string, step: OnboardingStep, now: Date = new Date()): OnboardingSession {
    const session = this.ensureSession(customerId, now);
    const state = session.steps[step];

    if (state.completedAt) return session;

    // Ensure step is started
    if (!state.startedAt) state.startedAt = now;

    state.completedAt = now;

    this.metrics?.recordStepCompleted(step, this.service);
    this.metrics?.recordStepDuration(step, this.service, (now.getTime() - state.startedAt.getTime()) / 1000);

    // milestone timestamps
    if (step === ONBOARDING_STEPS.FirstLead && !session.milestones.firstLeadAt) {
      session.milestones.firstLeadAt = now;
      session.engagement.leadCount += 1;
    }

    if (step === ONBOARDING_STEPS.FirstConversion && !session.milestones.firstConversionAt) {
      session.milestones.firstConversionAt = now;
      session.engagement.conversionCount += 1;
    }

    // Next step start time
    const idx = STEP_ORDER.indexOf(step);
    const next = STEP_ORDER[idx + 1];
    if (next) {
      const nextState = session.steps[next];
      if (!nextState.startedAt || nextState.startedAt.getTime() < now.getTime()) {
        nextState.startedAt = now;
      }
    }

    session.lastActivityAt = now;
    session.currentStep = currentStepFromSteps(session);
    session.completionPercentage = computeCompletionPercentage(session);

    // Completion
    if (session.steps[ONBOARDING_STEPS.FirstConversion].completedAt && !session.completedAt) {
      session.completedAt = now;
    }

    session.updatedAt = now;
    session.risk = computeRisk(session, now);
    session.recommendations = recommendationsFromSession(session);

    store.onboardingSessions.set(customerId, session);

    this.recomputeAggregates();

    // At-risk notifications
    if (session.risk.status === 'at_risk') {
      this.createNotification({
        userId: '00000000-0000-0000-0000-000000000001',
        type: 'onboarding_at_risk',
        title: 'Onboarding at risk',
        message: `Customer ${customerId} is at risk: ${session.risk.reasons[0] ?? 'Unknown reason'}`,
        entityType: 'agent',
        entityId: customerId,
        metadata: { riskLevel: session.risk.level, reasons: session.risk.reasons },
      });
    }

    return session;
  }

  submitFeedback(submission: OnboardingFeedbackSubmission): OnboardingFeedbackResponse {
    const now = new Date();

    const category = npsCategory(submission.npsScore);
    const sentimentScore = clamp(
      sentimentFromText(submission.comments) + sentimentFromText(submission.featureRequests),
      -1,
      1,
    );

    const response: OnboardingFeedbackResponse = {
      id: generateId(),
      customerId: submission.customerId,
      submittedAt: now,
      npsScore: submission.npsScore,
      satisfactionScore: submission.satisfactionScore,
      npsCategory: category,
      painPoints: submission.painPoints,
      featureRequests: submission.featureRequests,
      comments: submission.comments,
      sentimentScore,
      followUpRequired: category === 'detractor' || submission.satisfactionScore <= 2 || sentimentScore <= -0.25,
    };

    store.onboardingFeedback.set(response.id, response);

    const sentiment = sentimentBucket(response.sentimentScore);
    this.metrics?.recordFeedbackSubmitted(this.service, response.npsCategory, sentiment);

    if (response.followUpRequired) {
      this.createNotification({
        userId: '00000000-0000-0000-0000-000000000001',
        type: 'system_alert',
        title: 'Negative onboarding feedback',
        message: `Follow-up required for customer ${response.customerId} (NPS ${response.npsScore}, satisfaction ${response.satisfactionScore}).`,
        entityType: 'onboarding_feedback',
        entityId: response.id,
        metadata: { npsCategory: response.npsCategory, sentiment: response.sentimentScore },
      });
    }

    this.recomputeAggregates();

    return response;
  }

  listSessions(): OnboardingSession[] {
    return Array.from(store.onboardingSessions.values()).sort(
      (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
    );
  }

  getSession(customerId: string): OnboardingSession | undefined {
    return store.onboardingSessions.get(customerId);
  }

  listFeedback(): OnboardingFeedbackResponse[] {
    return Array.from(store.onboardingFeedback.values()).sort(
      (a, b) => b.submittedAt.getTime() - a.submittedAt.getTime(),
    );
  }

  recomputeAggregates(now: Date = new Date()): void {
    if (!this.metrics) return;

    const sessions = Array.from(store.onboardingSessions.values());

    const statusCounts: Record<OnboardingStatus, number> = {
      on_track: 0,
      at_risk: 0,
      completed: 0,
    };

    const funnel: Record<OnboardingStep, number> = {
      [ONBOARDING_STEPS.SignedUp]: 0,
      [ONBOARDING_STEPS.ConfiguredAgent]: 0,
      [ONBOARDING_STEPS.FirstLead]: 0,
      [ONBOARDING_STEPS.FirstConversion]: 0,
    };

    const riskCounts: Record<OnboardingRiskLevel, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };

    let completionPctSum = 0;
    let completionPctCount = 0;
    let abandoned = 0;

    for (const session of sessions) {
      session.risk = computeRisk(session, now);
      session.recommendations = recommendationsFromSession(session);

      statusCounts[session.risk.status] += 1;

      const currentIdx = STEP_ORDER.indexOf(currentStepFromSteps(session));
      for (let i = 0; i < STEP_ORDER.length; i++) {
        const step = STEP_ORDER[i];
        if (i < currentIdx || session.steps[step].completedAt) {
          funnel[step] += 1;
        }
      }

      if (!session.completedAt) {
        completionPctSum += session.completionPercentage;
        completionPctCount += 1;
      }

      // abandoned: >24h without configured agent
      const ageHours = toHours(now.getTime() - session.startedAt.getTime());
      if (ageHours >= 24 && !session.steps[ONBOARDING_STEPS.ConfiguredAgent].completedAt) {
        abandoned += 1;
      }

      if (session.risk.status === 'at_risk') {
        riskCounts[session.risk.level] += 1;
      }

      store.onboardingSessions.set(session.customerId, session);
    }

    this.metrics.setSessionsByStatus(this.service, 'on_track', statusCounts.on_track);
    this.metrics.setSessionsByStatus(this.service, 'at_risk', statusCounts.at_risk);
    this.metrics.setSessionsByStatus(this.service, 'completed', statusCounts.completed);

    for (const step of STEP_ORDER) {
      this.metrics.setFunnelReached(this.service, step, funnel[step]);
    }

    this.metrics.setAbandonedSignups(this.service, abandoned);

    for (const level of Object.keys(riskCounts) as OnboardingRiskLevel[]) {
      this.metrics.setAtRiskByLevel(this.service, level, riskCounts[level]);
    }

    const avg = completionPctCount > 0 ? completionPctSum / completionPctCount : 0;
    this.metrics.setAverageCompletionPercentage(this.service, avg);

    // Feedback metrics
    const feedback = this.listFeedback();
    const totalFeedback = feedback.length;
    const totalPromoters = feedback.filter((f) => f.npsCategory === 'promoter').length;
    const totalDetractors = feedback.filter((f) => f.npsCategory === 'detractor').length;

    const nps =
      totalFeedback === 0
        ? 0
        : ((totalPromoters / totalFeedback) * 100 - (totalDetractors / totalFeedback) * 100);
    this.metrics.setNpsScore(this.service, nps);

    const completedSessions = sessions.filter((s) => s.completedAt).length;
    const responseRate = completedSessions === 0 ? 0 : totalFeedback / completedSessions;
    this.metrics.setFeedbackResponseRate(this.service, responseRate);
  }

  private createNotification(input: Omit<Notification, 'id' | 'isRead' | 'createdAt'>): void {
    const n: Notification = {
      id: generateId(),
      isRead: false,
      createdAt: new Date(),
      ...input,
    };

    store.notifications.set(n.id, n);
  }
}

export const onboardingTracker = new OnboardingTracker();
