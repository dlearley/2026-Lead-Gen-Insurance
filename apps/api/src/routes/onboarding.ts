import { Router } from 'express';
import type { Request, Response } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import { onboardingTracker } from '../telemetry/onboarding-tracker.js';
import { ONBOARDING_STEPS } from '@insurance-lead-gen/types';
import type { OnboardingFeedbackSubmission, OnboardingStep } from '@insurance-lead-gen/types';

const router = Router();

const stepSchema = z.enum([
  ONBOARDING_STEPS.SignedUp,
  ONBOARDING_STEPS.ConfiguredAgent,
  ONBOARDING_STEPS.FirstLead,
  ONBOARDING_STEPS.FirstConversion,
]);

const feedbackSchema = z.object({
  customerId: z.string().min(1),
  npsScore: z.number().int().min(0).max(10),
  satisfactionScore: z.number().int().min(1).max(5),
  painPoints: z.array(z.string().min(1)).optional(),
  featureRequests: z.string().max(5000).optional(),
  comments: z.string().max(5000).optional(),
  source: z.enum(['onboarding', 'post_onboarding']).optional(),
});

router.get('/sessions/:customerId', authMiddleware, (req: Request, res: Response) => {
  const { customerId } = req.params;
  const session = onboardingTracker.getSession(customerId);

  if (!session) {
    res.status(404).json({ error: 'Onboarding session not found' });
    return;
  }

  res.json(session);
});

router.get('/admin/sessions', authMiddleware, (req: Request, res: Response) => {
  res.json({
    data: onboardingTracker.listSessions(),
    total: onboardingTracker.listSessions().length,
  });
});

router.post('/sessions/:customerId/steps/:step/complete', authMiddleware, (req: Request, res: Response) => {
  const { customerId, step } = req.params;
  const parsed = stepSchema.safeParse(step);

  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid onboarding step' });
    return;
  }

  const session = onboardingTracker.completeStep(customerId, parsed.data as OnboardingStep);
  res.json(session);
});

router.get('/admin/feedback', authMiddleware, (req: Request, res: Response) => {
  const feedback = onboardingTracker.listFeedback();

  const total = feedback.length;
  const promoters = feedback.filter((f) => f.npsCategory === 'promoter').length;
  const detractors = feedback.filter((f) => f.npsCategory === 'detractor').length;

  const nps = total === 0 ? 0 : (promoters / total) * 100 - (detractors / total) * 100;

  res.json({
    data: feedback,
    total,
    summary: {
      nps,
      promoters,
      detractors,
      passives: feedback.filter((f) => f.npsCategory === 'passive').length,
      followUpsRequired: feedback.filter((f) => f.followUpRequired).length,
    },
  });
});

router.post('/feedback', authMiddleware, (req: Request, res: Response) => {
  const parsed = feedbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation error', details: parsed.error.errors });
    return;
  }

  const submission: OnboardingFeedbackSubmission = parsed.data;
  const response = onboardingTracker.submitFeedback(submission);

  res.status(201).json(response);
});

export default router;
