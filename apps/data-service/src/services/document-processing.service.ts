import type {
  AnalyzeImageRequest,
  AnalyzeImageResponse,
  DamageAssessment,
  DetectedObject,
  DocumentClassification,
  DocumentProcessingResult,
  DocumentValidation,
  EntityExtraction,
  ImageAnalysisResult,
  ImageClassification,
  ImageQualityAssessment,
  IntentRecognition,
  ProcessDocumentRequest,
  ProcessDocumentResponse,
  ProcessVoiceRequest,
  ProcessVoiceResponse,
  SentimentAnalysis,
  SpeakerDiarization,
  VoiceProcessingResult,
} from '@insurance-lead-gen/types';
import { logger } from '@insurance-lead-gen/core';

type Stored<T> = {
  result: T;
  createdAtMs: number;
};

export class DocumentProcessingService {
  private static documents = new Map<string, Stored<DocumentProcessingResult>>();
  private static images = new Map<string, Stored<ImageAnalysisResult>>();
  private static voices = new Map<string, Stored<VoiceProcessingResult>>();

  async processDocument(request: ProcessDocumentRequest): Promise<ProcessDocumentResponse> {
    try {
      logger.info('Processing document', { documentId: request.documentId, type: request.documentType });

      const forceReprocess = Boolean((request.extractionConfig as any)?.forceReprocess);
      const existing = DocumentProcessingService.documents.get(request.documentId);
      if (existing && !forceReprocess) {
        return { success: true, result: existing.result };
      }

      const result = await this.performDocumentProcessing(request);
      DocumentProcessingService.documents.set(request.documentId, { result, createdAtMs: Date.now() });

      return { success: true, result };
    } catch (error) {
      logger.error('Error processing document', { error, documentId: request.documentId });
      return {
        success: false,
        result: {} as DocumentProcessingResult,
        error: 'Failed to process document',
      };
    }
  }

  async analyzeImage(request: AnalyzeImageRequest): Promise<AnalyzeImageResponse> {
    try {
      logger.info('Analyzing image', { imageId: request.imageId, type: request.analysisType });

      const forceReanalyze = Boolean((request.context as any)?.forceReanalyze);
      const existing = DocumentProcessingService.images.get(request.imageId);
      if (existing && !forceReanalyze) {
        return { success: true, result: existing.result };
      }

      const result = await this.performImageAnalysis(request);
      DocumentProcessingService.images.set(request.imageId, { result, createdAtMs: Date.now() });

      return { success: true, result };
    } catch (error) {
      logger.error('Error analyzing image', { error, imageId: request.imageId });
      return {
        success: false,
        result: {} as ImageAnalysisResult,
        error: 'Failed to analyze image',
      };
    }
  }

  async processVoice(request: ProcessVoiceRequest): Promise<ProcessVoiceResponse> {
    try {
      logger.info('Processing voice/audio', { audioId: request.audioId, duration: (request.settings as any)?.duration });

      const forceReprocess = Boolean((request.settings as any)?.forceReprocess);
      const existing = DocumentProcessingService.voices.get(request.audioId);
      if (existing && !forceReprocess) {
        return { success: true, result: existing.result };
      }

      const result = await this.performVoiceProcessing(request);
      DocumentProcessingService.voices.set(request.audioId, { result, createdAtMs: Date.now() });

      return { success: true, result };
    } catch (error) {
      logger.error('Error processing voice', { error, audioId: request.audioId });
      return {
        success: false,
        result: {} as VoiceProcessingResult,
        error: 'Failed to process voice/audio',
      };
    }
  }

  private async performDocumentProcessing(request: ProcessDocumentRequest): Promise<DocumentProcessingResult> {
    const startTime = Date.now();

    const extractedFields = this.mockExtractDocumentData(request);

    const confidenceScores: Record<string, number> = {};
    for (const key of Object.keys(extractedFields)) {
      confidenceScores[key] = 0.85 + Math.random() * 0.15;
    }

    const entities = this.extractEntitiesFromDocument(extractedFields);

    const classification: DocumentClassification = {
      primaryType: request.documentType,
      secondaryTypes: this.getSecondaryTypes(request.documentType),
      confidence: 0.92,
      reasoning: 'Document structure matches expected format',
    };

    const validation = this.validateExtractedData(extractedFields, request.documentType);

    const processingTime = Date.now() - startTime;

    return {
      documentId: request.documentId,
      documentType: request.documentType as any,
      insuranceType: request.insuranceType,
      extractedFields,
      confidenceScores,
      extractedText: JSON.stringify(extractedFields, null, 2),
      entities,
      classification,
      validationResult: validation,
      ocrQuality: {
        score: 0.89,
        issues: ['slight blur on bottom section'],
        enhancementApplied: ['auto-contrast', 'deskew'],
      },
      processingTime,
      requiresReview: validation.completenessScore < 80,
      reviewerNotes: validation.completenessScore < 80 ? ['Low completeness score - verify critical fields'] : [],
    };
  }

  private async performImageAnalysis(request: AnalyzeImageRequest): Promise<ImageAnalysisResult> {
    const detectedObjects = this.detectObjectsInImage(request.analysisType);

    const classification: ImageClassification = {
      primaryCategory: request.analysisType,
      secondaryCategories: this.getRelatedCategories(request.analysisType),
      confidence: 0.88,
      severity: this.inferSeverity(request.analysisType),
    };

    const assessDamage = Boolean((request.context as any)?.assessDamage);
    const damageAssessment = assessDamage ? this.assessDamageFromImage(request.analysisType) : undefined;

    return {
      imageId: request.imageId,
      analysisType: request.analysisType as any,
      insuranceType: request.insuranceType,
      detectedObjects,
      classification,
      damageAssessment,
      qualityAssessment: this.assessImageQuality(),
      confidence: 0.88,
      requiresExpertReview: damageAssessment ? damageAssessment.totalLossProbability > 0.3 : false,
    };
  }

  private async performVoiceProcessing(request: ProcessVoiceRequest): Promise<VoiceProcessingResult> {
    const duration = (request.settings as any)?.duration || 180;
    const transcript = this.generateMockTranscript(duration);

    const diarization = request.settings.enableDiarization ? this.performSpeakerDiarization(transcript) : undefined;
    const sentiment = request.settings.enableSentiment ? this.analyzeSentiment(transcript) : { overall: 'neutral', score: 0.0, aspects: [] };

    return {
      audioId: request.audioId,
      transcript,
      confidence: 0.85,
      speakerDiarization: diarization,
      sentimentAnalysis: sentiment,
      intentRecognition: this.recognizeIntent(transcript),
      callQuality: {
        score: 0.82,
        issues: ['background noise', 'occasional crosstalk'],
      },
      keywords: this.extractKeywords(transcript),
      entities: this.extractVoiceEntities(transcript),
      actionItems: this.extractActionItems(transcript),
      duration,
      silencePercentage: 15,
    };
  }

  private mockExtractDocumentData(request: ProcessDocumentRequest): Record<string, unknown> {
    const mockData: Record<string, Record<string, unknown>> = {
      LICENSE: {
        licenseNumber: 'D12345678',
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1985-03-15',
        expirationDate: '2025-03-15',
        address: '123 Main St, Anytown, ST 12345',
        licenseClass: 'C',
        restrictions: 'None',
      },
      REGISTRATION: {
        plateNumber: 'ABC123',
        vin: '1HGBH41JXMN109186',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        expirationDate: '2024-12-31',
        registeredOwner: 'John Doe',
        address: '123 Main St, Anytown, ST 12345',
      },
      POLICY: {
        policyNumber: 'POL12345678',
        insuredName: 'John Doe',
        effectiveDate: '2024-01-01',
        expirationDate: '2024-12-31',
        coverageType: 'Full Coverage',
        premium: 1250.0,
        deductible: 500.0,
        limits: '$100,000/$300,000/$50,000',
      },
    };

    return mockData[request.documentType] || {};
  }

  private extractEntitiesFromDocument(fields: Record<string, unknown>): EntityExtraction[] {
    const entities: EntityExtraction[] = [];

    for (const [key, value] of Object.entries(fields)) {
      if (typeof value !== 'string') continue;

      let entityType: EntityExtraction['entityType'] = 'other';

      if (key.toLowerCase().includes('date')) entityType = 'date';
      else if (key.toLowerCase().includes('name')) entityType = 'person';
      else if (key.toLowerCase().includes('address')) entityType = 'address';
      else if (key.toLowerCase().includes('amount') || key.toLowerCase().includes('premium')) entityType = 'amount';
      else if (key.toLowerCase().includes('vin') || key.toLowerCase().includes('plate')) entityType = 'vehicle';
      else if (key.toLowerCase().includes('policy')) entityType = 'policy_number';

      entities.push({
        entityType,
        value: value.toString(),
        confidence: 0.85 + Math.random() * 0.15,
        position: {
          page: 1,
          x: Math.random() * 100,
          y: Math.random() * 100,
          width: 80,
          height: 20,
        },
      });
    }

    return entities;
  }

  private getSecondaryTypes(primaryType: string): string[] {
    const secondaryMap: Record<string, string[]> = {
      LICENSE: ['identification', 'proof_of_identity'],
      REGISTRATION: ['vehicle_document', 'proof_of_ownership'],
      POLICY: ['insurance_document', 'coverage_proof'],
      CLAIM_FORM: ['claim_document', 'incident_report'],
      MEDICAL_RECORD: ['health_document', 'medical_history'],
    };

    return secondaryMap[primaryType] || [];
  }

  private validateExtractedData(fields: Record<string, unknown>, docType: string): DocumentValidation {
    const requiredFields: Record<string, string[]> = {
      LICENSE: ['licenseNumber', 'firstName', 'lastName', 'expirationDate'],
      REGISTRATION: ['plateNumber', 'vin', 'make', 'model', 'year'],
      POLICY: ['policyNumber', 'insuredName', 'effectiveDate', 'expirationDate'],
    };

    const required = requiredFields[docType] || [];
    const missingFields = required.filter((field) => !fields[field]);
    const completenessScore = required.length === 0 ? 100 : ((required.length - missingFields.length) / required.length) * 100;

    const inconsistencies = missingFields.map((field) => ({
      field,
      error: 'Required field missing',
      severity: 'high' as const,
    }));

    return {
      isValid: completenessScore >= 80,
      completenessScore,
      missingFields,
      inconsistencies,
      suggestedCorrections: missingFields.reduce((acc, field) => {
        acc[field] = `Please provide ${field}`;
        return acc;
      }, {} as Record<string, unknown>),
    };
  }

  private detectObjectsInImage(analysisType: string): DetectedObject[] {
    const objectMap: Record<string, DetectedObject[]> = {
      vehicle_damage: [
        {
          objectType: 'vehicle',
          confidence: 0.92,
          location: { x: 10, y: 20, width: 80, height: 60 },
          attributes: { type: 'sedan', color: 'blue' },
        },
        {
          objectType: 'damage',
          confidence: 0.78,
          location: { x: 45, y: 40, width: 15, height: 10 },
          attributes: { type: 'dent', severity: 'moderate' },
        },
      ],
      property_damage: [
        {
          objectType: 'roof',
          confidence: 0.85,
          location: { x: 30, y: 10, width: 40, height: 20 },
          attributes: { damage: 'missing shingles', extent: 'localized' },
        },
      ],
      id_verification: [
        {
          objectType: 'document',
          confidence: 0.95,
          location: { x: 25, y: 30, width: 50, height: 40 },
          attributes: { type: 'drivers_license', orientation: 'front' },
        },
        {
          objectType: 'face',
          confidence: 0.88,
          location: { x: 35, y: 40, width: 15, height: 12 },
          attributes: { clarity: 'good', alignment: 'centered' },
        },
      ],
    };

    return objectMap[analysisType] || [];
  }

  private getRelatedCategories(analysisType: string): string[] {
    const categoryMap: Record<string, string[]> = {
      vehicle_damage: ['automotive', 'accident', 'collision'],
      property_damage: ['property', 'weather_damage', 'structural'],
      id_verification: ['identity', 'document', 'verification'],
      property_inspection: ['property', 'inspection', 'condition'],
    };

    return categoryMap[analysisType] || [];
  }

  private inferSeverity(analysisType: string): ImageClassification['severity'] {
    if (analysisType.includes('damage')) {
      return Math.random() > 0.7 ? 'severe' : Math.random() > 0.4 ? 'moderate' : 'minor';
    }
    return undefined;
  }

  private assessDamageFromImage(_analysisType: string): DamageAssessment {
    const isDamage = Math.random() > 0.3;

    return {
      damageDetected: isDamage,
      damageTypes: isDamage ? ['dent', 'scratch'] : [],
      severity: isDamage ? (Math.random() > 0.6 ? 'moderate' : 'minor') : 'minor',
      estimatedRepairCost: isDamage ? Math.floor(Math.random() * 3000) + 500 : 0,
      costRange: {
        min: 200,
        max: 3500,
      },
      totalLossProbability: Math.random() * 0.2,
      factors: [
        {
          factor: 'Age of vehicle',
          impact: 'increases',
          severityContribution: 0.3,
        },
        {
          factor: 'Extent of damage',
          impact: 'increases',
          severityContribution: 0.7,
        },
      ],
    };
  }

  private assessImageQuality(): ImageQualityAssessment {
    return {
      overallQuality: 'good',
      qualityScore: 0.85,
      issues: ['slight motion blur', 'moderate lighting'],
      recommendations: ['Use flash in low light', 'Steady camera when shooting'],
    };
  }

  private generateMockTranscript(durationSeconds: number): string {
    if (durationSeconds < 60) {
      return 'Hi, I am looking for a quick insurance quote. Can you help?';
    }

    return [
      'Hi, I am calling about getting a quote for insurance.',
      'I have had my current provider for a few years but want to compare rates.',
      'I need coverage that starts soon and I have a couple questions about deductibles.',
    ].join(' ');
  }

  private performSpeakerDiarization(transcript: string): SpeakerDiarization[] {
    return [
      {
        speaker: 'agent',
        segments: [
          { startTime: 0, endTime: 10, text: 'Thanks for calling! I can help with that.' },
          { startTime: 35, endTime: 45, text: 'Let me confirm a few details.' },
        ],
        sentiment: this.analyzeSentiment(transcript),
      },
      {
        speaker: 'client',
        segments: [
          { startTime: 10, endTime: 35, text: 'I want to compare rates and start coverage soon.' },
        ],
        sentiment: this.analyzeSentiment(transcript),
      },
    ];
  }

  private analyzeSentiment(transcript: string): SentimentAnalysis {
    const lc = transcript.toLowerCase();
    const score = lc.includes('urgent') || lc.includes('soon') ? 0.2 : 0;
    return {
      overall: score > 0 ? 'positive' : 'neutral',
      score,
      aspects: [
        {
          aspect: 'urgency',
          sentiment: score > 0 ? 'positive' : 'neutral',
          score,
        },
      ],
    };
  }

  private recognizeIntent(transcript: string): IntentRecognition {
    const lc = transcript.toLowerCase();
    const primaryIntent = lc.includes('quote') ? 'get_quote' : 'general_inquiry';

    return {
      primaryIntent,
      confidence: 0.8,
      secondaryIntents: lc.includes('compare') ? ['compare_rates'] : [],
      urgency: lc.includes('soon') || lc.includes('urgent') ? 'high' : 'medium',
      actionsRequired: primaryIntent === 'get_quote' ? ['collect_details', 'prepare_quote'] : ['answer_questions'],
    };
  }

  private extractKeywords(transcript: string): string[] {
    const lc = transcript.toLowerCase();
    const candidates = ['quote', 'rate', 'deductible', 'coverage', 'policy'];
    return candidates.filter((k) => lc.includes(k));
  }

  private extractVoiceEntities(transcript: string): EntityExtraction[] {
    const entities: EntityExtraction[] = [];
    if (transcript.toLowerCase().includes('quote')) {
      entities.push({
        entityType: 'other',
        value: 'quote_request',
        confidence: 0.8,
      });
    }
    return entities;
  }

  private extractActionItems(transcript: string): string[] {
    const items: string[] = [];
    if (transcript.toLowerCase().includes('compare')) {
      items.push('Provide competitive rate comparison');
    }
    if (transcript.toLowerCase().includes('coverage')) {
      items.push('Review coverage options');
    }
    return items;
  }
}
