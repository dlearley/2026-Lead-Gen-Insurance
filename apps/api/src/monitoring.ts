import { register } from 'prom-client';
import { LeadMetrics, AIMetrics } from '@insurance-lead-gen/core';

export const leadMetrics = new LeadMetrics(register, 'api-service');
export const aiMetrics = new AIMetrics(register, 'api-service');
