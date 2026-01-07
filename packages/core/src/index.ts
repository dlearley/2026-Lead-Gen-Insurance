export { logger } from './logger.js';
export { BaseError, ValidationError, NotFoundError } from './errors.js';
export { MetricsCollector, LeadMetrics, AIMetrics } from './monitoring/metrics.js';
export { TracingService, initializeTracing } from './monitoring/tracing.js';
export type { TracingConfig } from './monitoring/tracing.js';
export { initializeSLOs, updateSLOMetrics, getErrorBudgetStatus, getAllSLODefinitions, getSLODefinition, calculateTimeToExhaustion, resetErrorBudgets, isErrorBudgetDepleted, getErrorBudgetConsumptionRate, SLO_DEFINITIONS } from './monitoring/slos.js';

export * from './cache/index.js';
export * from './middleware/index.js';
export * from './database/index.js';
export * from './routes/index.js';

// Security exports
export * from './security/index.js';

// Claims Intelligence & Fraud Detection Services - Phase 27.4
export { FraudDetectionService } from './services/fraud-detection.service.js';
export { ClaimsOutcomePredictionService } from './services/claims-outcome-prediction.service.js';
export { AnomalyDetectionService } from './services/anomaly-detection.service.js';
export { SettlementOptimizationService } from './services/settlement-optimization.service.js';
export { ClaimsAutomationService } from './services/claims-automation.service.js';
export { FraudNetworkAnalysisService } from './services/fraud-network-analysis.service.js';
export { ClaimsAnalyticsService } from './services/claims-analytics.service.js';
export { InvestigationRecommendationService } from './services/investigation-recommendation.service.js';
