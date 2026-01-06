# NLP and Document Processing Types

This document describes the type definitions for Natural Language Intelligence and Document Processing.

## Type Categories

### Document Processing Types

- `DocumentType` - 14 supported document types (policies, claims, medical, estimates, etc.)
- `DocumentClass` - 8 document classes (insurance policy, claim documentation, etc.)
- `ProcessingStatus` - 5 status values (pending, processing, processed, failed, manual_review)

### Entity Types

- `EntityType` - 37 insurance-specific entity types:
  - Party entities: Insured, Claimant, Beneficiary, Provider, Witness
  - Coverage entities: Liability, Collision, Comprehensive, Uninsured Motorist, Deductible
  - Financial entities: Premium, Limit, Coverage Amount, Copay
  - Temporal entities: Effective Date, Expiration, Claim Date, Incident Date
  - Vehicle entities: VIN, Make, Model, Year, Usage, Mileage
  - Property entities: Address, Square Footage, Type, Year Built, Condition
  - Medical entities: ICD Codes, CPT Codes, Diagnosis, Treatment, Provider
  - Risk entities: Age, Occupation, Lifestyle, Smoking Status, Health Conditions

### Validation Types

- `ValidationType` - 6 validation types (page_count, readability, completeness, signature, date_validity, consistency)
- `ValidationSeverity` - 4 severity levels (critical, high, medium, low)

### Conversation Types

- `ConversationType` - 4 types (phone, chat, email, meeting)
- `ConversationChannel` - 3 channels (inbound, outbound, internal)

### Analysis Types

- `IntentType` - 10 intent categories (quote_request, policy_inquiry, claims_submission, etc.)
- `SentimentType` - 4 sentiment types (positive, neutral, negative, very_negative)

## Model Types

### Document Models

- `ProcessedDocument` - Main document model with classification, OCR, and validation
- `DocumentEntity` - Extracted entities with confidence scores and context
- `DocumentValidation` - Validation results with severity and action required

### Conversation Models

- `Conversation` - Conversation metadata and transcription
- `ConversationAnalysis` - Full analysis with intent, sentiment, emotions, topics

### Note Models

- `AutomatedNote` - AI-generated notes with summary, sentiment, action items
- `QualityScore` - Note quality metrics (completeness, clarity, actionability)
- `Suggestion` - Improvement suggestions with priority

### Policy Models

- `PolicySummary` - Full policy summary with executive summary, coverages, highlights
- `CoverageDetail` - Coverage breakdown with limits, deductibles, and conditions
- `Exclusion` - Policy exclusions with impact level
- `CustomerSummary` - Customer-friendly summary with action items

### Search Models

- `DocumentEmbedding` - Vector embeddings for semantic search
- `SearchResult` - Search results with relevance scores and snippets
- `SimilarDocument` - Similar documents with shared entities and topics
- `DocumentChunk` - Document chunks with relevance scores
- `EntityOccurrence` - Cross-document entity resolution

### Multi-Language Models

- `LanguageDetection` - Language detection with confidence
- `MultiLanguageAnalysis` - Multi-language analysis results
- `MultiLanguageEntity` - Multi-language entities with translation
- `ProcessingResult` - Processing results for multi-language documents

### Analytics Models

- `DocumentAnalytics` - Document processing metrics
- `ConversationAnalytics` - Conversation processing metrics
- `NLPAnalytics` - Overall NLP analytics

## Helper Types

- `CreateProcessedDocumentDto` - DTO for creating processed documents
- `CreateConversationDto` - DTO for creating conversations
- `SearchFilters` - Filters for semantic search
- `ModelPerformance` - ML model performance metrics

## Usage

```typescript
import type {
  ProcessedDocument,
  DocumentEntity,
  Conversation,
  ConversationAnalysis,
  AutomatedNote,
  PolicySummary,
  DocumentEmbedding,
  // ... and all other types
} from '@insurance-lead-gen/types';
```

## Type Safety

All types are fully typed for TypeScript, providing:
- Compile-time type checking
- IDE autocomplete support
- Type documentation
- Refactoring safety

## Future Enhancements

- Add more document types
- Extend entity types for additional insurance domains
- Add more intent categories
- Support additional languages
- Add more sentiment/emotion categories
- Enhanced analytics types
