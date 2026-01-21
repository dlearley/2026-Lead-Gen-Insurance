// Types re-exports - all types are defined in individual files

export * from './auth.js';
export * from './api-gateway.js';
export * from './observability.js';
export * from './education.js';
export * from './onboarding.js';
export * from './customer-success.js';
export * from './reports.js';
export * from './validation.js';
export * from './scoring.js';
export * from './api-ecosystem.js';
export * from './integrations.js';
export * from './retention.js';
export * from './vip.js';
export * from './community.js';
export * from './copilot.js';
export * from './claims.js';
export * from './underwriting.js';
export * from './business-data-ingestion.js';
export * from './personalization.js';
export * from './territory.js';
export * from './deduplication.js';
export * from './timeline.js';
export * from './talk-track.js';
export * from './support.js';
export * from './ai-verticals.js';
export * from './performance.js';

// NLP types - selective export to avoid conflicts
export type {
  DocumentEmbedding,
  SimilarDocument,
  DocumentChunk,
  EntityOccurrence
} from './nlp.js';

// Document management types - selective export
export type {
  DocumentMetadata,
  DocumentStatus as DocMgmtDocumentStatus,
  SearchFilters,
  SearchResults
} from './document-management.js';

// Claims outcome types - selective export
export type {
  SettlementRecommendation,
  OptimalSettlement,
  NegotiationStrategy,
  LitigationCostEstimate,
  SubrogationPotential,
  Justification as ClaimJustification,
  ComparableCases
} from './claims-outcome.js';

// Fraud detection types - selective export
export type {
  ClaimData as FraudClaimData,
  FraudScore
} from './fraud-detection.js';
