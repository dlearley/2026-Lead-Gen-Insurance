# Phase 27.5: Natural Language Intelligence & Document Processing

## Overview

This document describes the implementation of the Natural Language Intelligence & Document Processing system, which combines document classification, entity extraction, sentiment analysis, intent detection, and automated transcription to intelligently process insurance documents, analyze customer interactions, generate automated notes, and extract key information for faster processing and improved customer experience.

## Architecture

### Core Components

1. **Document Classification Service** - ML-powered document type classification
2. **Entity Extraction Service** - Insurance-specific entity recognition
3. **Conversation Analysis Service** - Sentiment, intent, and emotion detection
4. **Automated Note Generation Service** - AI-powered note creation
5. **Policy Summarization Service** - Policy document summarization
6. **Document Validation Service** - Quality and completeness checking
7. **Semantic Document Search Service** - Vector-based semantic search
8. **Multi-Language Processing Service** - Multi-language support

### Database Schema

The following tables are added to support NLP and document processing:

- `ProcessedDocument` - Tracks documents processed through NLP pipeline
- `DocumentEntity` - Stores extracted entities from documents
- `DocumentValidation` - Validation results for documents
- `Conversation` - Phone calls, chats, emails, meetings
- `ConversationAnalysis` - NLP analysis results for conversations
- `AutomatedNote` - AI-generated notes from conversations/documents
- `PolicySummary` - Policy document summaries
- `DocumentEmbedding` - Embeddings for semantic search
- `NLPModel` - Model registry
- `DocumentAnalytics` - Processing analytics
- `ConversationAnalytics` - Conversation analytics

## Services

### 1. Document Classification Service

**Location**: `packages/core/src/services/document-classification.service.ts`

**Purpose**: Classify document types and extract text using OCR

**Key Methods**:

```typescript
// Classify document type
classifyDocument(documentPath: string): Promise<DocumentClassification>

// Extract text from document (OCR)
extractTextFromDocument(documentPath: string): Promise<DocumentText>

// Validate document quality
validateDocumentQuality(documentId: string): Promise<QualityAssessment>

// Batch classify documents
batchClassifyDocuments(documentPaths: string[]): Promise<DocumentClassification[]>
```

**Features**:
- BERT-based classification model (simulated)
- OCR text extraction (Tesseract, AWS Textract, Google Vision)
- Quality assessment (readability, completeness, validation)
- 95%+ target accuracy

**Supported Document Types**:
- Insurance policies (Auto, Home, Life, Health, Commercial)
- Claims documentation
- Medical records
- Repair estimates
- Proof of loss documents
- Inspection reports
- Police reports
- Financial statements

### 2. Entity Extraction Service

**Location**: `packages/core/src/services/entity-extraction.service.ts`

**Purpose**: Extract insurance-specific entities from documents

**Key Methods**:

```typescript
// Extract all entities from a document
extractEntities(documentId: string, text: string): Promise<DocumentEntity[]>

// Extract specific entity type
extractEntitiesByType(documentId: string, entityType: EntityType): Promise<DocumentEntity[]>

// Extract and normalize policy fields
extractPolicyFields(documentId: string, text: string): Promise<PolicyFields>

// Extract claim information
extractClaimFields(documentId: string, text: string): Promise<ClaimFields>

// Link entities to master data
linkEntitiesToMasterData(entities: DocumentEntity[]): Promise<LinkedEntity[]>

// Validate extracted entities
validateEntities(entities: DocumentEntity[]): Promise<ValidationResult>
```

**Entity Types**:

**Parties**:
- Insured, Claimant, Beneficiary, Provider, Witness

**Coverage**:
- Liability, Collision, Comprehensive, Uninsured Motorist, Deductible

**Financial**:
- Premium, Limit, Coverage Amount, Copay

**Temporal**:
- Effective Date, Expiration, Claim Date, Incident Date

**Vehicles**:
- VIN, Make, Model, Year, Usage, Mileage

**Properties**:
- Address, Square Footage, Type, Year Built, Condition

**Medical**:
- ICD Codes, CPT Codes, Diagnosis, Treatment, Provider

**Risk**:
- Age, Occupation, Lifestyle, Smoking Status, Health Conditions

**Target**: 90%+ F1 score on insurance entities

### 3. Conversation Analysis Service

**Location**: `packages/core/src/services/conversation-analysis.service.ts`

**Purpose**: Analyze customer interactions for sentiment, intent, and emotions

**Key Methods**:

```typescript
// Transcribe conversation (speech-to-text)
transcribeConversation(audioPath: string, options?: {
  language?: string;
  enableDiarization?: boolean;
}): Promise<Transcription>

// Analyze conversation comprehensively
analyzeConversation(conversationId: string, text: string): Promise<ConversationAnalysis>

// Detect customer intent
detectIntent(text: string): Promise<IntentDetection>

// Analyze sentiment
analyzeSentiment(text: string): Promise<SentimentAnalysis>

// Detect emotions
detectEmotions(text: string): Promise<EmotionDetection>

// Extract topics
extractTopics(text: string): Promise<Topic[]>

// Identify action items
identifyActionItems(text: string): Promise<ActionItem[]>

// Flag escalations
flagEscalations(conversationId: string, text: string): Promise<EscalationFlag[]>
```

**Intent Categories**:
- Quote Request
- Policy Inquiry
- Claims Submission
- Claims Status
- Billing/Payment Question
- Coverage Verification
- Complaint/Escalation
- Document Request
- Cancellation/Non-Renewal
- Product Upgrade

**Sentiment Types**:
- Positive: Satisfied, grateful, calm
- Neutral: Information-seeking, matter-of-fact
- Negative: Frustrated, angry, disappointed
- Very Negative: Escalation-worthy, threat level

**Emotions Detected**:
- Anger, Frustration, Confusion, Satisfaction, Gratitude, Concern, Disappointment, Relief

**Target Accuracy**: 85%+ for intent and sentiment

### 4. Automated Note Generation Service

**Location**: `packages/core/src/services/automated-note-generation.service.ts`

**Purpose**: Generate AI-powered notes from conversations and documents

**Key Methods**:

```typescript
// Generate automated note from conversation
generateNoteFromConversation(
  conversationId: string,
  conversationText: string,
  customerId: string,
  metadata?: { leadId?: string; claimId?: string }
): Promise<AutomatedNote>

// Generate note from document
generateNoteFromDocument(
  documentId: string,
  documentText: string,
  customerId: string,
  metadata?: { leadId?: string; claimId?: string }
): Promise<AutomatedNote>

// Summarize conversation
summarizeConversation(conversationText: string): Promise<string>

// Validate note quality
validateNoteQuality(noteId: string, noteContent: AutomatedNote): Promise<QualityScore>

// Get suggestions for improvement
getSuggestions(noteId: string, noteContent: AutomatedNote): Promise<Suggestion[]>
```

**Note Components**:
- Summary (2-3 sentences of key info)
- Customer sentiment and mood
- Issues/concerns raised
- Products/coverage discussed
- Next steps and follow-up items
- Action items for agent/admin
- Risk flags (escalation, complaint)

**Quality Metrics**:
- Completeness Score
- Clarity Score
- Actionability Score
- Overall Quality Score (0-100)

**Target**: 90%+ quality score

### 5. Policy Summarization Service

**Location**: `packages/core/src/services/policy-summarization.service.ts`

**Purpose**: Generate customer-friendly policy summaries

**Key Methods**:

```typescript
// Generate full policy summary
summarizePolicy(
  policyId: string,
  policyDocumentText: string,
  documentId?: string
): Promise<PolicySummary>

// Generate executive summary
generateExecutiveSummary(policyText: string): Promise<string>

// Extract coverage details
extractCoverageDetails(policyText: string, policyFields?: any): Promise<CoverageDetail[]>

// Identify key highlights
identifyKeyHighlights(policyText: string): Promise<string[]>

// Translate policy to plain English
plainEnglishTranslation(policyText: string): Promise<string>

// Extract exclusions and limitations
extractExclusions(policyText: string): Promise<Exclusion[]>

// Generate customer-friendly summary
generateCustomerSummary(
  policyId: string,
  policyText: string,
  policyFields?: any
): Promise<CustomerSummary>
```

**Summary Types**:
- **Executive Summary**: 1-2 paragraphs covering key coverages and limits
- **Coverage Summary**: Breakdown of each coverage with limits/deductibles
- **Highlights**: Top 10 key points customer should know
- **Plain English**: Rewrite complex policy language in simple terms
- **Exclusions**: Important exclusions and limitations
- **Customer Summary**: Customer-friendly summary with action items

**Target**: 90%+ information coverage

### 6. Document Validation Service

**Location**: `packages/core/src/services/document-validation.service.ts`

**Purpose**: Validate document quality, completeness, and consistency

**Key Methods**:

```typescript
// Validate document completeness
validateCompleteness(document: ProcessedDocument): Promise<CompletenessCheck>

// Check document readability
checkReadability(filePath: string): Promise<ReadabilityScore>

// Validate page count
validatePageCount(document: ProcessedDocument): Promise<PageCountValidation>

// Check for required signatures
checkSignatures(document: ProcessedDocument): Promise<SignatureValidation>

// Validate dates (expiration, effective dates)
validateDates(document: ProcessedDocument): Promise<DateValidation>

// Check for consistency issues
checkConsistency(document: ProcessedDocument): Promise<ConsistencyIssue[]>

// Overall document quality assessment
assessDocumentQuality(document: ProcessedDocument): Promise<QualityAssessment>
```

**Validation Types**:
- Page Count
- Readability
- Completeness
- Signature
- Date Validity
- Consistency

**Quality Scoring**:
- Document Confidence: 0-100 (OCR quality, readability)
- Completeness: % of required fields extracted
- Validation Issues: Count and severity
- Recommendation: Accept, Review, Reject

**Target**: Catch 95%+ of incomplete documents

### 7. Semantic Document Search Service

**Location**: `packages/core/src/services/semantic-document-search.service.ts`

**Purpose**: Provide semantic search across documents using embeddings

**Key Methods**:

```typescript
// Index document for semantic search (generate embeddings)
indexDocument(
  documentId: string,
  documentText: string,
  metadata?: { documentType?: string; documentClass?: string }
): Promise<void>

// Semantic search across documents
semanticSearch(
  query: string,
  filters?: SearchFilters,
  options?: { limit?: number; minScore?: number }
): Promise<SearchResult[]>

// Find similar documents
findSimilarDocuments(documentId: string, limit: number): Promise<SimilarDocument[]>

// Get document chunks by relevance
getRelevantChunks(documentId: string, query: string, limit: number): Promise<DocumentChunk[]>

// Cross-document entity resolution
resolveEntityAcrossDocuments(entity: {
  type: string;
  value: string;
}): Promise<EntityOccurrence[]>
```

**Features**:
- Vector embeddings (1536 dimensions)
- Cosine similarity search
- Document chunking for granular search
- Entity resolution across documents
- Filtering by document type, customer, lead, claim
- Relevance scoring

**Target**: <2 second search response time

### 8. Multi-Language Processing Service

**Location**: `packages/core/src/services/multi-language-processing.service.ts`

**Purpose**: Support multi-language document and conversation processing

**Key Methods**:

```typescript
// Detect document language
detectLanguage(text: string): Promise<LanguageDetection>

// Translate document to target language
translateDocument(
  documentId: string,
  text: string,
  targetLanguage: string
): Promise<{ originalLanguage: string; translatedText: string; confidence: number }>

// Analyze conversation in multiple languages
analyzeMultiLanguageConversation(
  conversationText: string,
  targetAnalysisLanguage: string = 'en'
): Promise<MultiLanguageAnalysis>

// Extract entities in multiple languages
extractEntitiesMultiLanguage(
  documentText: string,
  language: string
): Promise<MultiLanguageEntity[]>

// Get supported languages
getSupportedLanguages(): Promise<Language[]>

// Process document in original language
processInOriginalLanguage(documentId: string, text: string): Promise<ProcessingResult>
```

**Supported Languages** (Phase 1):
- English (en) - Primary language, full support
- Spanish (es) - Full support
- Mandarin Chinese (zh) - Full support
- Vietnamese (vi) - Partial support
- Korean (ko) - Partial support
- French (fr) - Not supported (future)
- German (de) - Not supported (future)
- Japanese (ja) - Not supported (future)

**Language Features**:
- Entity extraction
- Intent detection
- Sentiment analysis
- Summarization (full support only)

**Target**: 90%+ accuracy across supported languages

## Database Migrations

To apply the database schema changes, run:

```bash
# Generate migration
npx prisma migrate dev --name add_nlp_document_processing

# Apply migration to production
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate
```

## Usage Examples

### Document Processing Workflow

```typescript
import { DocumentClassificationService, EntityExtractionService, DocumentValidationService } from '@insurance-lead-gen/core';

// Initialize services
const classificationService = new DocumentClassificationService();
const entityService = new EntityExtractionService();
const validationService = new DocumentValidationService();

// Process a document
const documentPath = '/path/to/policy.pdf';

// Classify document
const classification = await classificationService.classifyDocument(documentPath);
console.log('Document type:', classification.documentType);
console.log('Confidence:', classification.confidence);

// Extract text
const text = await classificationService.extractTextFromDocument(documentPath);
console.log('Extracted text:', text.text);

// Extract entities
const entities = await entityService.extractEntities('doc-id', text.text);
console.log('Found', entities.length, 'entities');

// Validate document
const quality = await validationService.assessDocumentQuality({
  id: 'doc-id',
  filePath: documentPath,
  extractedText: text.text,
  pageCount: text.pageCount,
  // ... other fields
});
console.log('Quality score:', quality.overallScore);
console.log('Recommendation:', quality.recommendation);
```

### Conversation Analysis Workflow

```typescript
import { ConversationAnalysisService, AutomatedNoteGenerationService } from '@insurance-lead-gen/core';

// Initialize services
const conversationService = new ConversationAnalysisService();
const noteService = new AutomatedNoteGenerationService();

// Transcribe audio
const transcription = await conversationService.transcribeConversation(
  '/path/to/audio.wav',
  { language: 'en', enableDiarization: true }
);
console.log('Transcription:', transcription.text);

// Analyze conversation
const analysis = await conversationService.analyzeConversation(
  'conv-id',
  transcription.text
);
console.log('Primary intent:', analysis.primaryIntent);
console.log('Sentiment:', analysis.overallSentiment);
console.log('Escalation flag:', analysis.escalationFlag);

// Generate automated note
const note = await noteService.generateNoteFromConversation(
  'conv-id',
  transcription.text,
  'customer-id'
);
console.log('Note summary:', note.noteSummary);
console.log('Action items:', note.actionItems);
```

### Policy Summarization Workflow

```typescript
import { PolicySummarizationService } from '@insurance-lead-gen/core';

// Initialize service
const policyService = new PolicySummarizationService();

// Generate summary
const summary = await policyService.summarizePolicy(
  'policy-id',
  policyText
);
console.log('Executive summary:', summary.executiveSummary);
console.log('Coverage summary:', summary.coverageSummary);
console.log('Key highlights:', summary.keyHighlights);

// Generate customer-friendly summary
const customerSummary = await policyService.generateCustomerSummary(
  'policy-id',
  policyText
);
console.log('Customer summary generated');
```

### Semantic Search Workflow

```typescript
import { SemanticDocumentSearchService } from '@insurance-lead-gen/core';

// Initialize service
const searchService = new SemanticDocumentSearchService();

// Index document
await searchService.indexDocument('doc-id', documentText, {
  documentType: 'policy_auto',
  documentClass: 'insurance_policy'
});

// Semantic search
const results = await searchService.semanticSearch(
  'liability coverage limits',
  { documentType: 'policy_auto' },
  { limit: 10, minScore: 0.7 }
);
console.log('Found', results.length, 'results');
results.forEach(result => {
  console.log('Document:', result.documentId);
  console.log('Relevance:', result.relevanceScore);
  console.log('Snippet:', result.snippet);
});

// Find similar documents
const similar = await searchService.findSimilarDocuments('doc-id', 5);
console.log('Similar documents:', similar);
```

### Multi-Language Processing Workflow

```typescript
import { MultiLanguageProcessingService } from '@insurance-lead-gen/core';

// Initialize service
const multiLangService = new MultiLanguageProcessingService();

// Detect language
const language = await multiLangService.detectLanguage(text);
console.log('Detected language:', language.language);

// Translate document
const translation = await multiLangService.translateDocument(
  'doc-id',
  text,
  'en'
);
console.log('Translated text:', translation.translatedText);

// Analyze multi-language conversation
const analysis = await multiLangService.analyzeMultiLanguageConversation(
  spanishText,
  'en'
);
console.log('Original language:', analysis.originalLanguage);
console.log('Entities:', analysis.entities);
console.log('Intent:', analysis.intent);
```

## API Endpoints

### Document Processing Endpoints

```
POST   /api/v1/documents/upload                          # Upload document
POST   /api/v1/documents/:documentId/classify             # Classify document
POST   /api/v1/documents/:documentId/extract-entities    # Extract entities
GET    /api/v1/documents/:documentId/text                # Get extracted text
GET    /api/v1/documents/:documentId/entities            # Get entities
POST   /api/v1/documents/:documentId/validate            # Validate document
GET    /api/v1/documents/:documentId/quality            # Get quality score
POST   /api/v1/documents/batch-process                   # Batch process
```

### Conversation Analysis Endpoints

```
POST   /api/v1/conversations/:conversationId/transcribe   # Transcribe
POST   /api/v1/conversations/:conversationId/analyze     # Analyze
GET    /api/v1/conversations/:conversationId/intent      # Get intent
GET    /api/v1/conversations/:conversationId/sentiment   # Get sentiment
GET    /api/v1/conversations/:conversationId/emotions    # Get emotions
GET    /api/v1/conversations/:conversationId/topics      # Get topics
GET    /api/v1/conversations/:conversationId/actions     # Get action items
```

### Automated Notes Endpoints

```
POST   /api/v1/notes/generate/:conversationId            # Generate from conversation
POST   /api/v1/notes/generate/document/:documentId       # Generate from document
GET    /api/v1/notes/:noteId                             # Get note
POST   /api/v1/notes/:noteId/validate                    # Validate note
GET    /api/v1/notes/:noteId/suggestions                 # Get suggestions
```

### Policy Summarization Endpoints

```
POST   /api/v1/summaries/:policyId                       # Generate summary
GET    /api/v1/summaries/:policyId/executive            # Get executive summary
GET    /api/v1/summaries/:policyId/coverages            # Get coverage details
GET    /api/v1/summaries/:policyId/highlights           # Get highlights
GET    /api/v1/summaries/:policyId/exclusions           # Get exclusions
GET    /api/v1/summaries/:policyId/plain-english        # Get plain English
```

### Document Search Endpoints

```
POST   /api/v1/search/semantic                           # Semantic search
GET    /api/v1/documents/:documentId/similar             # Find similar
GET    /api/v1/search/entity/:entityId/occurrences       # Find entity references
POST   /api/v1/search/chunk-by-relevance                 # Get relevant chunks
```

### Analytics Endpoints

```
GET    /api/v1/documents/analytics/processing            # Document processing metrics
GET    /api/v1/conversations/analytics                   # Conversation metrics
GET    /api/v1/documents/analytics/quality               # Quality metrics
GET    /api/v1/nlp/model-performance                     # Model performance
```

## ML Model Integration

### Current Implementation

The current implementation uses simulated ML models for development and testing purposes. The services are designed to integrate with actual ML models in production.

### Production Integration

To integrate with real ML models:

1. **Document Classification**:
   - BERT-based fine-tuned model (HuggingFace)
   - Deploy as REST API or use HuggingFace Inference API

2. **Entity Extraction**:
   - spaCy with custom NER model
   - HuggingFace token classification model
   - Fine-tune on insurance data

3. **Intent Detection**:
   - Multi-label classification model
   - Use BERT or RoBERTa fine-tuned on conversation data

4. **Sentiment Analysis**:
   - Use pre-trained models (VADER, TextBlob, or HuggingFace)
   - Fine-tune for insurance domain

5. **Summarization**:
   - BART or T5 transformer models
   - Use OpenAI API or HuggingFace

6. **OCR**:
   - Tesseract (open source)
   - AWS Textract (production)
   - Google Vision API (production)

7. **Speech-to-Text**:
   - Google Speech-to-Text
   - AWS Transcribe
   - Deepgram

8. **Embeddings**:
   - OpenAI text-embedding-ada-002
   - HuggingFace sentence-transformers
   - Store in vector database (Qdrant, Pinecone)

## Performance Targets

| Metric | Target | Status |
|---------|--------|--------|
| Document Classification Accuracy | 95%+ | Simulated |
| Entity Extraction F1 Score | 90%+ | Simulated |
| OCR Quality Confidence | 98%+ | Simulated |
| Intent Detection Accuracy | 85%+ | Simulated |
| Sentiment Analysis Accuracy | 85%+ | Simulated |
| Processing Speed | <5 seconds/doc | Simulated |
| Transcription Accuracy | 95%+ | Simulated |
| Automated Notes Quality | 90%+ | Simulated |
| Policy Summarization Coverage | 90%+ | Simulated |
| Multi-Language Accuracy | 90%+ | Simulated |
| Semantic Search Response Time | <2 seconds | Simulated |
| Document Validation Accuracy | 95%+ | Simulated |

## Testing

### Unit Tests

```bash
# Run all NLP service tests
pnpm test -- packages/core/src/services/*.test.ts

# Run specific service tests
pnpm test -- document-classification.service.test.ts
```

### Integration Tests

```bash
# Run end-to-end document processing tests
pnpm test -- integration/document-processing.test.ts

# Run conversation analysis tests
pnpm test -- integration/conversation-analysis.test.ts
```

### ML Model Tests

```bash
# Run model accuracy tests
pnpm test -- ml-models/accuracy.test.ts

# Run bias and fairness tests
pnpm test -- ml-models/bias.test.ts
```

### Performance Tests

```bash
# Run load tests (1000+ documents/day)
pnpm test -- performance/load.test.ts

# Run latency tests
pnpm test -- performance/latency.test.ts
```

## Monitoring

The NLP and Document Processing services integrate with the observability stack from Phase 14.5.

### Metrics to Monitor

- Document processing throughput
- Classification accuracy
- Entity extraction F1 score
- Intent detection accuracy
- Sentiment analysis accuracy
- Processing latency
- OCR confidence
- Transcription accuracy
- Automated note quality
- Policy summarization coverage
- Semantic search latency
- Multi-language accuracy

### Dashboards

Create Grafana dashboards to monitor:
1. Document Processing Metrics
2. Conversation Analysis Metrics
3. NLP Model Performance
4. Quality Metrics

### Alerts

Configure alerts for:
- Processing failures > 5%
- Classification accuracy < 90%
- OCR confidence < 90%
- Escalation rate spike
- Processing latency > 10 seconds

## Security Considerations

1. **PII Protection**:
   - Identify and redact sensitive information
   - Encrypt stored documents
   - Implement access controls

2. **Data Privacy**:
   - Comply with GDPR, CCPA
   - Implement data retention policies
   - Provide data deletion capabilities

3. **Audio Transcription**:
   - Secure storage of audio files
   - Limited access to transcriptions
   - Delete audio after processing

4. **ML Model Security**:
   - Protect model endpoints
   - Validate model inputs
   - Monitor for adversarial attacks

## Future Enhancements

1. **Advanced ML Models**:
   - Implement fine-tuned BERT models
   - Add transformer-based summarization
   - Improve entity linking

2. **Real-Time Processing**:
   - Stream processing for conversations
   - Real-time sentiment monitoring
   - Live transcription

3. **Enhanced Search**:
   - Hybrid search (semantic + keyword)
   - Faceted search
   - Query suggestions

4. **More Languages**:
   - Add French, German, Japanese
   - Improve multi-language accuracy
   - Add language-specific models

5. **Advanced Features**:
   - Document comparison
   - Fraud detection
   - Risk scoring
   - Automated underwriting assistance

## Troubleshooting

### Common Issues

1. **Low OCR Confidence**:
   - Check image quality
   - Rescan document if possible
   - Use alternative OCR engine

2. **Poor Classification**:
   - Verify document type
   - Check model version
   - Consider manual review

3. **Sentiment Analysis Issues**:
   - Check for sarcasm
   - Verify language support
   - Review training data

4. **Slow Processing**:
   - Check resource utilization
   - Optimize document size
   - Consider batching

### Debug Mode

Enable debug logging:

```typescript
const service = new DocumentClassificationService({
  ocrEngine: 'tesseract',
  classificationModel: 'bert-insurance-classifier'
});

// Logs will be written at debug level
```

## Support

For issues, questions, or contributions:
- Create an issue in the repository
- Contact the development team
- Review documentation in `/docs`
