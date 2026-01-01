import { register } from 'prom-client';
import { LeadMetrics, AIMetrics } from '@insurance-lead-gen/core';

export const leadMetrics = new LeadMetrics(register, 'orchestrator');
export const aiMetrics = new AIMetrics(register, 'orchestrator');
