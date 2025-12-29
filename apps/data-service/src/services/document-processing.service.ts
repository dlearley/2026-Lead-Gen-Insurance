import { PrismaClient } from '@prisma/client';
import { 
  ProcessDocumentRequest,
  ProcessDocumentResponse,
  AnalyzeImageRequest,
  AnalyzeImageResponse,
  ProcessVoiceRequest,
  ProcessVoiceResponse,
  DocumentProcessingResult,
  ImageAnalysisResult,
  VoiceProcessingResult,
  EntityExtraction,
  DocumentClassification,
  DocumentValidation,
  DetectedObject,
  ImageClassification,
  DamageAssessment,
  ImageQualityAssessment,
  SpeakerDiarization,
  SentimentAnalysis,
  IntentRecognition,
  InsuranceType
} from '@insuraince/types';
import { logger } from '../../utils/logger.js';

const prisma = new PrismaClient();

export class DocumentProcessingService {
  /**
   * Process documents with OCR and AI analysis
   */
  async processDocument(request: ProcessDocumentRequest): Promise<ProcessDocumentResponse> {
    try {
      logger.info('Processing document', { 
        documentId: request.documentId, 
        type: request.documentType 
      });

      // Check if document already processed
      const existingResult = await prisma.documentProcessingResult.findUnique({
        where: { documentId: request.documentId }
      });

      if (existingResult && !request.extractionConfig.forceReprocess) {
        return {
          success: true,
          result: existingResult as unknown as DocumentProcessingResult
        };
      }

      // Process document based on type
      const result = await this.performDocumentProcessing(request);

      // Store result
      await prisma.documentProcessingResult.upsert({
        where: { documentId: request.documentId },
        create: result as any,
        update: result as any
      });

      return {
        success: true,
        result
      };

    } catch (error) {
      logger.error('Error processing document', { 
        error, 
        documentId: request.documentId 
      });
      return {
        success: false,
        result: {} as DocumentProcessingResult,
        error: 'Failed to process document'
      };
    }
  }

  /**
   * Analyze images for damage assessment, verification, etc.
   */
  async analyzeImage(request: AnalyzeImageRequest): Promise<AnalyzeImageResponse> {
    try {
      logger.info('Analyzing image', { 
        imageId: request.imageId, 
        type: request.analysisType 
      });

      // Check for existing analysis
      const existingResult = await prisma.imageAnalysisResult.findUnique({
        where: { imageId: request.imageId }
      });

      if (existingResult && !request.context?.forceReanalyze) {
        return {
          success: true,
          result: existingResult as unknown as ImageAnalysisResult
        };
      }

      // Perform image analysis
      const result = await this.performImageAnalysis(request);

      // Store result
      await prisma.imageAnalysisResult.upsert({
        where: { imageId: request.imageId },
        create: result as any,
        update: result as any
      });

      return {
        success: true,
        result
      };

    } catch (error) {
      logger.error('Error analyzing image', { 
        error, 
        imageId: request.imageId 
      });
      return {
        success: false,
        result: {} as ImageAnalysisResult,
        error: 'Failed to analyze image'
      };
    }
  }

  /**
   * Process voice/audio for transcription and analysis
   */
  async processVoice(request: ProcessVoiceRequest): Promise<ProcessVoiceResponse> {
    try {
      logger.info('Processing voice/audio', { 
        audioId: request.audioId,
        duration: request.settings.duration 
      });

      // Check for existing processing
      const existingResult = await prisma.voiceProcessingResult.findUnique({
        where: { audioId: request.audioId }
      });

      if (existingResult && !request.settings.forceReprocess) {
        return {
          success: true,
          result: existingResult as unknown as VoiceProcessingResult
        };
      }

      // Process voice/audio
      const result = await this.performVoiceProcessing(request);

      // Store result
      await prisma.voiceProcessingResult.upsert({
        where: { audioId: request.audioId },
        create: result as any,
        update: result as any
      });

      return {
        success: true,
        result
      };

    } catch (error) {
      logger.error('Error processing voice', { 
        error, 
        audioId: request.audioId 
      });
      return {
        success: false,
        result: {} as VoiceProcessingResult,
        error: 'Failed to process voice/audio'
      };
    }
  }

  private async performDocumentProcessing(request: ProcessDocumentRequest): Promise<DocumentProcessingResult> {
    // Simulate document processing with OCR and AI extraction
    // In real implementation, this would integrate with services like:
    // - Google Cloud Vision API, AWS Textract, Azure Form Recognizer

    const startTime = Date.now();
    
    // Mock extracted data based on document type
    const extractedFields = this.mockExtractDocumentData(request);
    
    // Generate confidence scores
    const confidenceScores: Record<string, number> = {};
    Object.keys(extractedFields).forEach(key => {
      confidenceScores[key] = 0.85 + Math.random() * 0.15; // 85-100% confidence
    });

    // Extract entities
    const entities = this.extractEntitiesFromDocument(extractedFields);

    // Classify document
    const classification: DocumentClassification = {
      primaryType: request.documentType,
      secondaryTypes: this.getSecondaryTypes(request.documentType),
      confidence: 0.92,
      reasoning: 'Document structure matches expected format'
    };

    // Validate extracted data
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
        enhancementApplied: ['auto-contrast', 'deskew']
      },
      processingTime,
      requiresReview: validation.completenessScore < 80,
      reviewerNotes: validation.completenessScore < 80 ? ['Low completeness score - verify critical fields'] : [],
      createdAt: new Date()
    };
  }

  private async performImageAnalysis(request: AnalyzeImageRequest): Promise<ImageAnalysisResult> {
    // Simulate image analysis using CV models
    // In real implementation, would integrate with vision APIs

    const detectedObjects = this.detectObjectsInImage(request.analysisType);
    
    const classification: ImageClassification = {
      primaryCategory: request.analysisType,
      secondaryCategories: this.getRelatedCategories(request.analysisType),
      confidence: 0.88,
      severity: this.inferSeverity(request.analysisType)
    };

    const damageAssessment = request.context?.assessDamage ? 
      this.assessDamageFromImage(request.analysisType) : undefined;

    return {
      imageId: request.imageId,
      analysisType: request.analysisType,
      insuranceType: request.insuranceType,
      detectedObjects,
      classification,
      damageAssessment,
      qualityAssessment: this.assessImageQuality(),
      confidence: 0.88,
      requiresExpertReview: damageAssessment ? damageAssessment.totalLossProbability > 0.3 : false,
      createdAt: new Date()
    };
  }

  private async performVoiceProcessing(request: ProcessVoiceRequest): Promise<VoiceProcessingResult> {
    // Simulate voice processing with transcription and analysis
    // In real implementation, would integrate with speech-to-text services

    const transcript = this.generateMockTranscript(request.settings.duration || 180);
    const duration = request.settings.duration || 180;

    return {
      audioId: request.audioId,
      transcript,
      confidence: 0.85,
      speakerDiarization: request.settings.enableDiarization ? 
        this.performSpeakerDiarization(transcript) : undefined,
      sentimentAnalysis: request.settings.enableSentiment ? 
        this.analyzeSentiment(transcript) : { overall: 'neutral', score: 0.0, aspects: [] },
      intentRecognition: this.recognizeIntent(transcript),
      callQuality: {
        score: 0.82,
        issues: ['background noise', 'occasional crosstalk']
      },
      keywords: this.extractKeywords(transcript),
      entities: this.extractVoiceEntities(transcript),
      actionItems: this.extractActionItems(transcript),
      duration,
      silencePercentage: 15,
      createdAt: new Date()
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
        restrictions: 'None'
      },
      REGISTRATION: {
        plateNumber: 'ABC123',
        vin: '1HGBH41JXMN109186',
        make: 'Toyota',
        model: 'Camry',
        year: 2022,
        expirationDate: '2024-12-31',
        registeredOwner: 'John Doe',
        address: '123 Main St, Anytown, ST 12345'
      },
      POLICY: {
        policyNumber: 'POL12345678',
        insuredName: 'John Doe',
        effectiveDate: '2024-01-01',
        expirationDate: '2024-12-31',
        coverageType: 'Full Coverage',
        premium: 1250.00,
        deductible: 500.00,
        limits: '$100,000/$300,000/$50,000'
      }
    };

    return mockData[request.documentType] || {};
  }

  private extractEntitiesFromDocument(fields: Record<string, unknown>): EntityExtraction[] {
    const entities: EntityExtraction[] = [];
    
    Object.entries(fields).forEach(([key, value]) => {
      if (typeof value === 'string') {
        // Detect entity types based on content patterns
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
            height: 20
          }
        });
      }
    });
    
    return entities;
  }

  private getSecondaryTypes(primaryType: string): string[] {
    const secondaryMap: Record<string, string[]> = {
      LICENSE: ['identification', 'proof_of_identity'],
      REGISTRATION: ['vehicle_document', 'proof_of_ownership'],
      POLICY: ['insurance_document', 'coverage_proof'],
      CLAIM_FORM: ['claim_document', 'incident_report'],
      MEDICAL_RECORD: ['health_document', 'medical_history']
    };
    
    return secondaryMap[primaryType] || [];
  }

  private validateExtractedData(fields: Record<string, unknown>, docType: string): DocumentValidation {
    const requiredFields: Record<string, string[]> = {
      LICENSE: ['licenseNumber', 'firstName', 'lastName', 'expirationDate'],
      REGISTRATION: ['plateNumber', 'vin', 'make', 'model', 'year'],
      POLICY: ['policyNumber', 'insuredName', 'effectiveDate', 'expirationDate']
    };
    
    const required = requiredFields[docType] || [];
    const missingFields = required.filter(field => !fields[field]);
    const completenessScore = ((required.length - missingFields.length) / required.length) * 100;
    
    const inconsistencies = missingFields.map(field => ({
      field,
      error: 'Required field missing',
      severity: 'high' as const
    }));
    
    return {
      isValid: completenessScore >= 80,
      completenessScore,
      missingFields,
      inconsistencies,
      suggestedCorrections: missingFields.reduce((acc, field) => {
        acc[field] = `Please provide ${field}`;
        return acc;
      }, {} as Record<string, unknown>)
    };
  }

  private detectObjectsInImage(analysisType: string): DetectedObject[] {
    const objectMap: Record<string, DetectedObject[]> = {
      vehicle_damage: [
        {
          objectType: 'vehicle',
          confidence: 0.92,
          location: { x: 10, y: 20, width: 80, height: 60 },
          attributes: { type: 'sedan', color: 'blue' }
        },
        {
          objectType: 'damage',
          confidence: 0.78,
          location: { x: 45, y: 40, width: 15, height: 10 },
          attributes: { type: 'dent', severity: 'moderate' }
        }
      ],
      property_damage: [
        {
          objectType: 'roof',
          confidence: 0.85,
          location: { x: 30, y: 10, width: 40, height: 20 },
          attributes: { damage: 'missing shingles', extent: 'localized' }
        }
      ],
      id_verification: [
        {
          objectType: 'document',
          confidence: 0.95,
          location: { x: 25, y: 30, width: 50, height: 40 },
          attributes: { type: 'drivers_license', orientation: 'front' }
        },
        {
          objectType: 'face',
          confidence: 0.88,
          location: { x: 35, y: 40, width: 15, height: 12 },
          attributes: { clarity: 'good', alignment: 'centered' }
        }
      ]
    };
    
    return objectMap[analysisType] || [];
  }

  private getRelatedCategories(analysisType: string): string[] {
    const categoryMap: Record<string, string[]> = {
      vehicle_damage: ['automotive', 'accident', 'collision'],
      property_damage: ['property', 'weather_damage', 'structural'],
      id_verification: ['identity', 'document', 'verification'],
      property_inspection: ['property', 'inspection', 'condition']
    };
    
    return categoryMap[analysisType] || [];
  }

  private inferSeverity(analysisType: string): 'minor' | 'moderate' | 'severe' | 'catastrophic' | undefined {
    if (analysisType.includes('damage')) {
      return Math.random() > 0.7 ? 'severe' : Math.random() > 0.4 ? 'moderate' : 'minor';
    }
    return undefined;
  }

  private assessDamageFromImage(analysisType: string): DamageAssessment {
    const isDamage = Math.random() > 0.3;
    
    return {
      damageDetected: isDamage,
      damageTypes: isDamage ? ['dent', 'scratch'] : [],
      severity: isDamage ? (Math.random() > 0.6 ? 'moderate' : 'minor') : 'minor',
      estimatedRepairCost: isDamage ? Math.floor(Math.random() * 3000) + 500 : 0,
      costRange: {
        min: 200,
        max: 3500
      },
      totalLossProbability: Math.random() * 0.2,
      factors: [
        {
          factor: 'Age of vehicle',
          impact: 'increases',
          severityContribution: 0.3
        },
        {
          factor: 'Extent of damage',
          impact: 'increases',
          severityContribution: 0.7
        }
      ]
    };
  }

  private assessImageQuality(): ImageQualityAssessment {
    return {
      overallQuality: 'good',
      qualityScore: 0.85,
      issues: ['slight motion blur', 'moderate lighting'],
      recommendations: ['Use flash in low light', 'Steady camera when shooting']
    };
  }

  private generateMockTranscript(duration: number): string {
    const segments = Math.floor(duration / 30);
    const conversations = [
      "Agent: Thank you for calling ABC Insurance. How can I help you today? ",
      "Customer: Hi, I'm calling to get a quote for auto insurance. ",
      "Agent: I'd be happy to help with that. Can I get your name and some basic information? ",
      "Customer: Sure, my name is John Smith and I live in Springfield. ",
      "Agent: Great, John. Let me gather some details about your vehicle and driving history."
    ];
    
    let transcript = "";
    for (let i = 0; i < Math.min(segments, conversations.length); i++) {
      transcript += conversations[i];
    }
    
    return transcript;
  }

  private performSpeakerDiarization(transcript: string): SpeakerDiarization[] {
    return [
      {
        speaker: 'agent',
        segments: [
          {
            startTime: 0,
            endTime: 45,
            text: 'Thank you for calling ABC Insurance...'
          }
        ],
        sentiment: {
          overall: 'positive',
          score: 0.6,
          aspects: [
            { aspect: 'professionalism', sentiment: 'positive', score: 0.8 }
          ]
        }
      }
    ];
  }

  private analyzeSentiment(transcript: string): SentimentAnalysis {
    return {
      overall: 'neutral',
      score: 0.1,
      aspects: [
        { aspect: 'tone', sentiment: 'neutral', score: 0.0 },
        { aspect: 'urgency', sentiment: 'positive', score: 0.3 }
      ]
    };
  }

  private recognizeIntent(transcript: string): IntentRecognition {
    return {
      primaryIntent: 'quote_request',
      confidence: 0.9,
      secondaryIntents: ['policy_inquiry', 'coverage_questions'],
      urgency: 'medium',
      actionsRequired: ['schedule_follow_up', 'send_quote']
    };
  }

  private extractKeywords(transcript: string): string[] {
    return ['insurance', 'quote', 'auto', 'coverage', 'price'];
  }

  private extractVoiceEntities(transcript: string): EntityExtraction[] {
    return [
      {
        entityType: 'person',
        value: 'John Smith',
        confidence: 0.95
      },
      {
        entityType: 'location',
        value: 'Springfield',
        confidence: 0.8
      }
    ];
  }

  private extractActionItems(transcript: string): string[] {
    return [
      'Send insurance quote to John Smith',
      'Follow up in 3 days if no response',
      'Verify driving record'
    ];
  }
}
