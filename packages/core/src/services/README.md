# NLP and Document Processing Services

This directory contains the Natural Language Intelligence and Document Processing services for the insurance lead generation platform.

## Services

### 1. Document Classification Service
- **Location**: `document-classification.service.ts`
- **Purpose**: Classify document types and extract text using OCR
- **Key Features**: BERT-based classification, OCR text extraction, quality assessment
- **Target Accuracy**: 95%+

### 2. Entity Extraction Service
- **Location**: `entity-extraction.service.ts`
- **Purpose**: Extract insurance-specific entities from documents
- **Key Features**: 15+ entity types, entity linking, confidence scoring
- **Target F1 Score**: 90%+

### 3. Conversation Analysis Service
- **Location**: `conversation-analysis.service.ts`
- **Purpose**: Analyze customer interactions for sentiment, intent, and emotions
- **Key Features**: Speech-to-text, intent detection, sentiment analysis, emotion detection
- **Target Accuracy**: 85%+

### 4. Automated Note Generation Service
- **Location**: `automated-note-generation.service.ts`
- **Purpose**: Generate AI-powered notes from conversations and documents
- **Key Features**: Summarization, action item extraction, quality scoring
- **Target Quality**: 90%+

### 5. Policy Summarization Service
- **Location**: `policy-summarization.service.ts`
- **Purpose**: Generate customer-friendly policy summaries
- **Key Features**: Executive summary, coverage breakdown, plain English translation
- **Target Coverage**: 90%+

### 6. Document Validation Service
- **Location**: `document-validation.service.ts`
- **Purpose**: Validate document quality, completeness, and consistency
- **Key Features**: Completeness check, readability assessment, validation rules
- **Target Accuracy**: 95%+

### 7. Semantic Document Search Service
- **Location**: `semantic-document-search.service.ts`
- **Purpose**: Provide semantic search across documents using embeddings
- **Key Features**: Vector embeddings, similarity search, entity resolution
- **Target Response Time**: <2 seconds

### 8. Multi-Language Processing Service
- **Location**: `multi-language-processing.service.ts`
- **Purpose**: Support multi-language document and conversation processing
- **Key Features**: Language detection, translation, multi-language NLP
- **Supported Languages**: English, Spanish, Chinese, Vietnamese, Korean

## Usage

```typescript
// Import services
import {
  DocumentClassificationService,
  EntityExtractionService,
  ConversationAnalysisService,
  AutomatedNoteGenerationService,
  PolicySummarizationService,
  DocumentValidationService,
  SemanticDocumentSearchService,
  MultiLanguageProcessingService
} from '@insurance-lead-gen/core';

// Initialize services
const classificationService = new DocumentClassificationService();
const entityService = new EntityExtractionService();
const conversationService = new ConversationAnalysisService();
const noteService = new AutomatedNoteGenerationService();
const policyService = new PolicySummarizationService();
const validationService = new DocumentValidationService();
const searchService = new SemanticDocumentSearchService();
const multiLangService = new MultiLanguageProcessingService();

// Use services
const classification = await classificationService.classifyDocument('/path/to/doc.pdf');
const entities = await entityService.extractEntities('doc-id', 'text');
const analysis = await conversationService.analyzeConversation('conv-id', 'text');
const note = await noteService.generateNoteFromConversation('conv-id', 'text', 'customer-id');
const summary = await policyService.summarizePolicy('policy-id', 'policy-text');
const quality = await validationService.assessDocumentQuality(document);
const results = await searchService.semanticSearch('query');
const language = await multiLangService.detectLanguage('text');
```

## Configuration

Services can be configured with optional parameters:

```typescript
// Document Classification Service
const classificationService = new DocumentClassificationService({
  ocrEngine: 'tesseract', // or 'aws-textract', 'google-vision'
  classificationModel: 'bert-insurance-classifier'
});

// Entity Extraction Service
const entityService = new EntityExtractionService({
  nerModel: 'bert-insurance-ner'
});

// Conversation Analysis Service
const conversationService = new ConversationAnalysisService({
  transcriptionService: 'google-speech-to-text', // or 'aws-transcribe', 'deepgram'
  intentModel: 'intent-classifier',
  sentimentModel: 'sentiment-analyzer',
  emotionModel: 'emotion-detector'
});

// Automated Note Generation Service
const noteService = new AutomatedNoteGenerationService({
  summarizationModel: 'bart-summarizer',
  conversationAnalysisService: customConversationService
});

// Policy Summarization Service
const policyService = new PolicySummarizationService({
  summarizationModel: 't5-policy-summarizer',
  entityExtractionService: customEntityService
});

// Semantic Document Search Service
const searchService = new SemanticDocumentSearchService({
  embeddingModel: 'openai-text-embedding-ada-002', // or 'huggingface-embeddings'
  vectorDimension: 1536
});

// Multi-Language Processing Service
const multiLangService = new MultiLanguageProcessingService({
  translationService: 'google-translate', // or 'aws-translate', 'deepl'
  languageDetectionModel: 'language-detector'
});
```

## Production Integration

### ML Models

To integrate with real ML models:

1. **Document Classification**:
   - Deploy BERT-based model (HuggingFace)
   - Use HuggingFace Inference API
   - Fine-tune on insurance documents

2. **Entity Extraction**:
   - Use spaCy with custom NER model
   - Use HuggingFace token classification
   - Fine-tune on insurance entity data

3. **Intent/Sentiment Analysis**:
   - Use HuggingFace models
   - Use OpenAI API
   - Fine-tune on conversation data

4. **Summarization**:
   - Use BART or T5 models
   - Use OpenAI API
   - Fine-tune for insurance domain

5. **OCR**:
   - Install Tesseract: `npm install tesseract.js`
   - Use AWS Textract or Google Vision API

6. **Speech-to-Text**:
   - Use Google Speech-to-Text API
   - Use AWS Transcribe
   - Use Deepgram

7. **Embeddings**:
   - Use OpenAI embeddings API
   - Use HuggingFace sentence-transformers
   - Store in vector database (Qdrant, Pinecone)

### Dependencies

Add these dependencies for production use:

```bash
# OCR
pnpm add tesseract.js

# OpenAI API
pnpm add openai

# HuggingFace
pnpm add @huggingface/inference

# Vector Database
pnpm add qdrant-js-client
# or
pnpm add @pinecone-database/pinecone

# Translation
pnpm add @google-cloud/translate
# or
pnpm add @aws-sdk/client-translate
```

## Testing

Each service includes comprehensive error handling and logging. Test using:

```typescript
// Test document classification
const classification = await classificationService.classifyDocument('test.pdf');
console.log('Document type:', classification.documentType);
console.log('Confidence:', classification.confidence);

// Test entity extraction
const entities = await entityService.extractEntities('doc-id', sampleText);
console.log('Entities:', entities);

// Test conversation analysis
const analysis = await conversationService.analyzeConversation('conv-id', sampleText);
console.log('Intent:', analysis.primaryIntent);
console.log('Sentiment:', analysis.overallSentiment);
```

## Documentation

For complete documentation, see:
- [Phase 27.5 Documentation](../../docs/PHASE_27.5.md)
- [API Documentation](../../docs/API.md)
- [Database Schema](../../prisma/schema.prisma)

## Notes

- Current implementation uses simulated ML models for development
- Services are designed to integrate with actual ML models in production
- All services include comprehensive logging for debugging and monitoring
- Error handling follows project standards using BaseError class
- Services are designed to be independent but can be composed for workflows
