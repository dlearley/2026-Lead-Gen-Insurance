// ========================================
// DOCUMENT PROCESSING TYPES
// ========================================

export type DocumentType =
  | 'policy_auto'
  | 'policy_home'
  | 'policy_life'
  | 'policy_health'
  | 'policy_commercial'
  | 'claim_form'
  | 'medical_record'
  | 'repair_estimate'
  | 'proof_of_loss'
  | 'inspection_report'
  | 'police_report'
  | 'financial_statement'
  | 'identity_document'
  | 'other';

export type DocumentClass =
  | 'insurance_policy'
  | 'claim_documentation'
  | 'medical_records'
  | 'estimate'
  | 'legal_document'
  | 'financial_document'
  | 'identity_verification'
  | 'supporting_document';

export type ProcessingStatus = 'pending' | 'processing' | 'processed' | 'failed' | 'manual_review';

export type EntityType =
  | 'party_insured'
  | 'party_claimant'
  | 'party_beneficiary'
  | 'party_provider'
  | 'party_witness'
  | 'coverage_liability'
  | 'coverage_collision'
  | 'coverage_comprehensive'
  | 'coverage_uninsured_motorist'
  | 'coverage_deductible'
  | 'financial_premium'
  | 'financial_limit'
  | 'financial_coverage_amount'
  | 'financial_copay'
  | 'temporal_effective_date'
  | 'temporal_expiration'
  | 'temporal_claim_date'
  | 'temporal_incident_date'
  | 'vehicle_vin'
  | 'vehicle_make'
  | 'vehicle_model'
  | 'vehicle_year'
  | 'vehicle_usage'
  | 'vehicle_mileage'
  | 'property_address'
  | 'property_square_footage'
  | 'property_type'
  | 'property_year_built'
  | 'property_condition'
  | 'medical_icd_code'
  | 'medical_cpt_code'
  | 'medical_diagnosis'
  | 'medical_treatment'
  | 'medical_provider'
  | 'risk_age'
  | 'risk_occupation'
  | 'risk_lifestyle'
  | 'risk_smoking_status'
  | 'risk_health_condition';

export type ValidationType =
  | 'page_count'
  | 'readability'
  | 'completeness'
  | 'signature'
  | 'date_validity'
  | 'consistency';

export type ValidationSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ProcessedDocument {
  id: string;
  originalDocumentId?: string;
  leadId?: string;
  claimId?: string;
  customerId?: string;
  documentType?: DocumentType;
  documentClass?: DocumentClass;
  classificationConfidence?: number;
  documentLanguage?: string;
  originalLanguage?: string;
  filePath?: string;
  extractedText?: string;
  pageCount?: number;
  ocrConfidence?: number;
  isReadable?: boolean;
  processingStatus: ProcessingStatus;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  entities?: DocumentEntity[];
  validations?: DocumentValidation[];
  embeddings?: DocumentEmbedding[];
  policySummaries?: PolicySummary[];
}

export interface CreateProcessedDocumentDto {
  originalDocumentId?: string;
  leadId?: string;
  claimId?: string;
  customerId?: string;
  filePath: string;
  documentLanguage?: string;
}

export interface DocumentClassification {
  documentId: string;
  documentType: DocumentType;
  documentClass: DocumentClass;
  confidence: number;
  processingTime: number;
}

export interface DocumentText {
  documentId: string;
  text: string;
  pageCount: number;
  ocrConfidence: number;
  processingTime: number;
}

export interface QualityAssessment {
  documentId: string;
  overallScore: number;
  readabilityScore: number;
  completenessScore: number;
  validationScore: number;
  recommendation: 'accept' | 'review' | 'reject';
  issues: ValidationIssue[];
}

export interface ClassificationHistory {
  id: string;
  documentId: string;
  classification: DocumentType;
  confidence: number;
  timestamp: Date;
  modelVersion: string;
}

export interface DocumentEntity {
  id: string;
  documentId: string;
  entityType: EntityType;
  entityValue: string;
  entityConfidence?: number;
  pageNumber?: number;
  startPosition?: number;
  endPosition?: number;
  context?: string;
  normalizedValue?: string;
  linkedEntityId?: string;
  createdAt: Date;
}

export interface DocumentValidation {
  id: string;
  documentId: string;
  validationType: ValidationType;
  isValid: boolean;
  issueDescription?: string;
  severity?: ValidationSeverity;
  actionRequired?: string;
  reviewerNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

export interface ValidationIssue {
  type: ValidationType;
  severity: ValidationSeverity;
  description: string;
  actionRequired?: string;
}

export interface CompletenessCheck {
  documentId: string;
  requiredFields: string[];
  presentFields: string[];
  missingFields: string[];
  completenessPercentage: number;
  isValid: boolean;
}

export interface ReadabilityScore {
  documentId: string;
  imageQualityScore: number;
  textClarityScore: number;
  overallScore: number;
  isReadable: boolean;
  issues: string[];
}

export interface PageCountValidation {
  documentId: string;
  expectedPageCount: number;
  actualPageCount: number;
  isValid: boolean;
  message: string;
}

export interface SignatureValidation {
  documentId: string;
  hasSignature: boolean;
  signatureLocation?: {
    pageNumber: number;
    x: number;
    y: number;
  };
  isValid: boolean;
  message: string;
}

export interface DateValidation {
  documentId: string;
  dates: {
    effectiveDate?: Date;
    expirationDate?: Date;
    claimDate?: Date;
    incidentDate?: Date;
  };
  isValid: boolean;
  issues: string[];
}

export interface ConsistencyIssue {
  documentId: string;
  issueType: string;
  description: string;
  severity: ValidationSeverity;
  conflictingFields: string[];
}

export interface PolicyFields {
  policyNumber?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  premium?: number;
  deductible?: number;
  coverageLimits?: Record<string, number>;
  insuredName?: string;
  insuredAddress?: string;
  coverageTypes?: string[];
}

export interface ClaimFields {
  claimNumber?: string;
  claimType?: string;
  dateOfLoss?: Date;
  coverageApplied?: string[];
  claimedAmount?: number;
  claimantName?: string;
  incidentDescription?: string;
}

// ========================================
// CONVERSATION ANALYSIS TYPES
// ========================================

export type ConversationType = 'phone' | 'chat' | 'email' | 'meeting';

export type ConversationChannel = 'inbound' | 'outbound' | 'internal';

export type IntentType =
  | 'quote_request'
  | 'policy_inquiry'
  | 'claims_submission'
  | 'claims_status'
  | 'billing_payment_question'
  | 'coverage_verification'
  | 'complaint_escalation'
  | 'document_request'
  | 'cancellation_non_renewal'
  | 'product_upgrade'
  | 'other';

export type SentimentType = 'positive' | 'neutral' | 'negative' | 'very_negative';

export interface Conversation {
  id: string;
  customerId?: string;
  agentId?: string;
  conversationType: ConversationType;
  conversationChannel: ConversationChannel;
  startedAt?: Date;
  endedAt?: Date;
  durationSeconds?: number;
  transcription?: string;
  transcriptionConfidence?: number;
  originalLanguage?: string;
  createdAt: Date;
  updatedAt: Date;
  analysis?: ConversationAnalysis;
  automatedNotes?: AutomatedNote[];
}

export interface CreateConversationDto {
  customerId?: string;
  agentId?: string;
  conversationType: ConversationType;
  conversationChannel: ConversationChannel;
  audioPath?: string;
  originalLanguage?: string;
}

export interface Transcription {
  conversationId: string;
  text: string;
  confidence: number;
  language: string;
  processingTime: number;
  speakerDiarization?: SpeakerSegment[];
}

export interface SpeakerSegment {
  speaker: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface ConversationAnalysis {
  id: string;
  conversationId: string;
  primaryIntent?: IntentType;
  secondaryIntents?: Array<{ intent: IntentType; confidence: number }>;
  overallSentiment?: SentimentType;
  sentimentScore?: number;
  emotionDetected?: Record<string, number>;
  customerSatisfactionScore?: number;
  topicsDiscussed?: string[];
  keyPhrases?: string[];
  issuesRaised?: string[];
  escalationFlag: boolean;
  escalationReason?: string;
  createdAt: Date;
}

export interface IntentDetection {
  primaryIntent: IntentType;
  confidence: number;
  secondaryIntents?: Array<{ intent: IntentType; confidence: number }>;
  processingTime: number;
}

export interface SentimentAnalysis {
  sentiment: SentimentType;
  score: number;
  confidence: number;
  emotions?: {
    anger?: number;
    frustration?: number;
    confusion?: number;
    satisfaction?: number;
    gratitude?: number;
    concern?: number;
  };
}

export interface EmotionDetection {
  primaryEmotion: string;
  emotions: Record<string, number>;
  confidence: number;
}

export interface Topic {
  name: string;
  confidence: number;
  keywords: string[];
}

export interface ActionItem {
  id: string;
  description: string;
  owner?: string;
  dueDate?: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'completed';
}

export interface EscalationFlag {
  conversationId: string;
  isEscalation: boolean;
  reason?: string;
  severity: ValidationSeverity;
  sentiment?: SentimentType;
  sentimentScore?: number;
}

// ========================================
// AUTOMATED NOTES TYPES
// ========================================

export type NoteCreatedBy = 'ai_system' | 'agent' | 'customer' | 'system';

export interface AutomatedNote {
  id: string;
  conversationId?: string;
  customerId: string;
  leadId?: string;
  claimId?: string;
  noteSummary: string;
  customerSentiment?: SentimentType;
  issuesIdentified?: Array<{ issue: string; priority: string }>;
  productsDiscussed?: Array<{ product: string; action: string }>;
  actionItems?: ActionItem[];
  followUpRequired: boolean;
  followUpType?: string;
  followUpDueDate?: Date;
  noteQualityScore?: number;
  createdBy: NoteCreatedBy;
  createdAt: Date;
  updatedAt: Date;
  conversation?: Conversation;
}

export interface QualityScore {
  noteId: string;
  overallScore: number;
  completenessScore: number;
  clarityScore: number;
  actionabilityScore: number;
  suggestions: string[];
}

export interface Suggestion {
  type: 'completeness' | 'clarity' | 'actionability' | 'formatting';
  description: string;
  priority: 'low' | 'medium' | 'high';
}

// ========================================
// POLICY SUMMARIZATION TYPES
// ========================================

export interface PolicySummary {
  id: string;
  policyId?: string;
  policyDocumentId?: string;
  executiveSummary?: string;
  coverageSummary?: CoverageDetail[];
  keyHighlights?: string[];
  plainEnglishSummary?: string;
  importantExclusions?: Exclusion[];
  customerActionItems?: string[];
  summaryQualityScore?: number;
  generatedAt?: Date;
  updatedAt: Date;
}

export interface CoverageDetail {
  coverageName: string;
  limit?: number;
  deductible?: number;
  summary: string;
  conditions?: string[];
}

export interface Highlight {
  point: string;
  category: string;
  importance: 'high' | 'medium' | 'low';
}

export interface Exclusion {
  description: string;
  category: string;
  impact: 'high' | 'medium' | 'low';
}

export interface CustomerSummary {
  policyId: string;
  executiveSummary: string;
  keyCoverages: Array<{ name: string; limit: string; deductible: string }>;
  importantExclusions: string[];
  nextSteps: string[];
  contactInformation: Record<string, string>;
}

// ========================================
// SEMANTIC SEARCH TYPES
// ========================================

export interface DocumentEmbedding {
  id: string;
  documentId: string;
  embeddingModel: string;
  embeddingVector?: number[];
  chunkIndex?: number;
  chunkText?: string;
  createdAt: Date;
}

export interface SearchFilters {
  documentType?: DocumentType;
  documentClass?: DocumentClass;
  customerId?: string;
  leadId?: string;
  claimId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  language?: string;
}

export interface SearchResult {
  documentId: string;
  documentType?: DocumentType;
  documentClass?: DocumentClass;
  chunkText: string;
  relevanceScore: number;
  snippet: string;
  metadata?: Record<string, unknown>;
}

export interface SimilarDocument {
  documentId: string;
  similarityScore: number;
  documentType?: DocumentType;
  sharedEntities: string[];
  matchedTopics: string[];
}

export interface DocumentChunk {
  chunkIndex: number;
  text: string;
  relevanceScore: number;
  entities?: DocumentEntity[];
}

export interface EntityOccurrence {
  entityId: string;
  entityValue: string;
  entityType: EntityType;
  occurrences: Array<{
    documentId: string;
    documentType?: DocumentType;
    pageNumber?: number;
    context?: string;
  }>;
}

// ========================================
// MULTI-LANGUAGE TYPES
// ========================================

export interface LanguageDetection {
  language: string;
  languageCode: string;
  confidence: number;
  isSupported: boolean;
}

export interface MultiLanguageAnalysis {
  originalLanguage: string;
  translatedText?: string;
  entities?: DocumentEntity[];
  intent?: IntentDetection;
  sentiment?: SentimentAnalysis;
  confidence: number;
}

export interface MultiLanguageEntity {
  entityValue: string;
  entityType: EntityType;
  language: string;
  confidence: number;
  translatedValue?: string;
}

export interface ProcessingResult {
  documentId: string;
  originalLanguage: string;
  processedLanguage: string;
  entities: DocumentEntity[];
  classification: DocumentClassification;
  validation: QualityAssessment;
  success: boolean;
}

export interface Language {
  code: string;
  name: string;
  isSupported: boolean;
  features: string[];
}

// ========================================
// NLP MODEL TYPES
// ========================================

export interface NLPModel {
  id: string;
  modelName: string;
  modelType: string;
  modelCategory: string;
  baseModel?: string;
  modelVersion: number;
  language?: string;
  trainingDate?: Date;
  performanceMetrics?: {
    accuracy?: number;
    f1?: number;
    precision?: number;
    recall?: number;
  };
  isActive: boolean;
  createdAt: Date;
}

export interface ModelPerformance {
  modelId: string;
  modelName: string;
  accuracy: number;
  f1: number;
  precision: number;
  recall: number;
  timestamp: Date;
}

// ========================================
// ANALYTICS TYPES
// ========================================

export interface DocumentAnalytics {
  id: string;
  periodDate: Date;
  documentType?: string;
  totalDocumentsProcessed: number;
  successfulExtractions: number;
  extractionRate?: number;
  averageOcrConfidence?: number;
  averageClassificationConfidence?: number;
  manualReviewsRequired: number;
  averageProcessingTimeSeconds?: number;
  updatedAt: Date;
}

export interface ConversationAnalytics {
  id: string;
  periodDate: Date;
  conversationChannel?: string;
  totalConversations: number;
  averageDurationSeconds?: number;
  transcriptionSuccessRate?: number;
  intentDetectionAccuracy?: number;
  sentimentAccuracy?: number;
  escalationRate?: number;
  averageSentimentScore?: number;
  automatedNotesGenerated: number;
  updatedAt: Date;
}

export interface NLPAnalytics {
  documentsProcessed: number;
  conversationsProcessed: number;
  averageProcessingTime: number;
  classificationAccuracy: number;
  entityExtractionF1: number;
  intentDetectionAccuracy: number;
  sentimentAccuracy: number;
  transcriptionAccuracy: number;
  manualReviewRate: number;
  automatedNoteQuality: number;
  periodStartDate: Date;
  periodEndDate: Date;
}
