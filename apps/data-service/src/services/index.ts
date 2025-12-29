// ========================================
// Service Exports for Data Service
// ========================================

export * from './margin-analysis-service.js';
export * from './competitive-analysis-service.js';
export * from './pricing-optimization-service.js';
export * from './marketplace.service.js';

// Export service instances for convenience
import { MarginAnalysisService } from './margin-analysis-service.js';
import { CompetitiveAnalysisService } from './competitive-analysis-service.js';
import { PricingOptimizationService } from './pricing-optimization-service.js';

export const marginAnalysisService = new MarginAnalysisService();
export const competitiveAnalysisService = new CompetitiveAnalysisService();
export const pricingOptimizationService = new PricingOptimizationService();