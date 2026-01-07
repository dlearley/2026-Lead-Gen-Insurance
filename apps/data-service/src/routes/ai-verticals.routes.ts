import { Router } from 'express';
import { z, ZodError } from 'zod';
import { 
  PredictConversionRequest, 
  PredictChurnRequest, 
  PredictLifetimeValueRequest,
  ProcessDocumentRequest,
  AnalyzeImageRequest,
  ProcessVoiceRequest,
  ChatbotMessageRequest,
  GetAIAnalyticsRequest,
  RunComplianceCheckRequest
} from '@insuraince/types';
import { PredictiveModelsService } from '../services/predictive-models.service.js';
import { DocumentProcessingService } from '../services/document-processing.service.js';
import { ChatbotService } from '../services/chatbot.service.js';
import { validateRequest } from '../middleware/validation.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Initialize services
const predictiveModelsService = new PredictiveModelsService();
const documentProcessingService = new DocumentProcessingService();
const chatbotService = new ChatbotService();

// Validation schemas
const predictConversionSchema = z.object({
  leadId: z.string().uuid(),
  insuranceType: z.enum(['auto', 'home', 'life', 'health', 'commercial']),
  leadData: z.record(z.unknown()),
  verticalData: z.record(z.unknown()).optional()
});

const predictChurnSchema = z.object({
  clientId: z.string().uuid(),
  policyIds: z.array(z.string().uuid()),
  historicalData: z.record(z.unknown())
});

const predictLifetimeValueSchema = z.object({
  clientId: z.string().uuid(),
  currentPolicies: z.array(z.object({
    type: z.enum(['auto', 'home', 'life', 'health', 'commercial']),
    premium: z.number().positive(),
    renewalDate: z.string().datetime()
  })),
  demographicData: z.record(z.unknown())
});

const processDocumentSchema = z.object({
  documentId: z.string().uuid(),
  fileUri: z.string().url(),
  documentType: z.enum(['LICENSE', 'REGISTRATION', 'POLICY', 'CLAIM_FORM', 'MEDICAL_RECORD', 'INSPECTION_REPORT', 'PHOTO', 'OTHER']),
  insuranceType: z.enum(['auto', 'home', 'life', 'health', 'commercial']),
  extractionConfig: z.record(z.unknown())
});

const analyzeImageSchema = z.object({
  imageId: z.string().uuid(),
  imageUri: z.string().url(),
  analysisType: z.string(),
  insuranceType: z.enum(['auto', 'home', 'life', 'health', 'commercial']),
  context: z.record(z.unknown()).optional()
});

const processVoiceSchema = z.object({
  audioId: z.string().uuid(),
  audioUri: z.string().url(),
  settings: z.object({
    language: z.string().default('en-US'),
    enableDiarization: z.boolean().default(false),
    enableSentiment: z.boolean().default(true),
    duration: z.number().positive().optional()
  })
});

const chatbotMessageSchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().min(1),
  leadId: z.string().uuid().optional(),
  context: z.record(z.unknown())
});

const complianceCheckSchema = z.object({
  insuranceType: z.enum(['auto', 'home', 'life', 'health', 'commercial']),
  jurisdiction: z.string(),
  data: z.record(z.unknown())
});

// Routes
router.post('/predict-conversion', validateRequest(predictConversionSchema), async (req, res) => {
  try {
    logger.info('Conversion prediction requested');
    const result = await predictiveModelsService.predictConversion(req.body as PredictConversionRequest);
    res.json(result);
  } catch (error) {
    logger.error('Error in conversion prediction route', { error });
    res.status(500).json({
      success: false,
      prediction: {},
      error: 'Internal server error'
    });
  }
});

router.post('/predict-churn', validateRequest(predictChurnSchema), async (req, res) => {
  try {
    logger.info('Churn prediction requested');
    const result = await predictiveModelsService.predictChurn(req.body as PredictChurnRequest);
    res.json(result);
  } catch (error) {
    logger.error('Error in churn prediction route', { error });
    res.status(500).json({
      success: false,
      prediction: {},
      error: 'Internal server error'
    });
  }
});

router.post('/predict-lifetime-value', validateRequest(predictLifetimeValueSchema), async (req, res) => {
  try {
    logger.info('Lifetime value prediction requested');
    const result = await predictiveModelsService.predictLifetimeValue(req.body as PredictLifetimeValueRequest);
    res.json(result);
  } catch (error) {
    logger.error('Error in lifetime value prediction route', { error });
    res.status(500).json({
      success: false,
      prediction: {},
      error: 'Internal server error'
    });
  }
});

router.post('/process-document', validateRequest(processDocumentSchema), async (req, res) => {
  try {
    logger.info('Document processing requested');
    const result = await documentProcessingService.processDocument(req.body as ProcessDocumentRequest);
    res.json(result);
  } catch (error) {
    logger.error('Error in document processing route', { error });
    res.status(500).json({
      success: false,
      result: {},
      error: 'Internal server error'
    });
  }
});

router.post('/analyze-image', validateRequest(analyzeImageSchema), async (req, res) => {
  try {
    logger.info('Image analysis requested');
    const result = await documentProcessingService.analyzeImage(req.body as AnalyzeImageRequest);
    res.json(result);
  } catch (error) {
    logger.error('Error in image analysis route', { error });
    res.status(500).json({
      success: false,
      result: {},
      error: 'Internal server error'
    });
  }
});

router.post('/process-voice', validateRequest(processVoiceSchema), async (req, res) => {
  try {
    logger.info('Voice processing requested');
    const result = await documentProcessingService.processVoice(req.body as ProcessVoiceRequest);
    res.json(result);
  } catch (error) {
    logger.error('Error in voice processing route', { error });
    res.status(500).json({
      success: false,
      result: {},
      error: 'Internal server error'
    });
  }
});

router.post('/chatbot-message', validateRequest(chatbotMessageSchema), async (req, res) => {
  try {
    logger.info('Chatbot message requested');
    const result = await chatbotService.processMessage(req.body as ChatbotMessageRequest);
    res.json(result);
  } catch (error) {
    logger.error('Error in chatbot route', { error });
    res.status(500).json({
      success: false,
      reply: '',
      confidence: 0,
      actions: [],
      shouldEscalate: true,
      error: 'Internal server error'
    });
  }
});

router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;
    logger.info('Getting conversation', { conversationId });
    
    const conversation = await chatbotService.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
    
    res.json({
      success: true,
      conversation
    });
  } catch (error) {
    logger.error('Error getting conversation', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.post('/conversation/:conversationId/end', async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { escalationReason } = req.body;
    
    logger.info('Ending conversation', { conversationId, escalationReason });
    await chatbotService.endConversation(conversationId, escalationReason);
    
    res.json({
      success: true,
      message: 'Conversation ended successfully'
    });
  } catch (error) {
    logger.error('Error ending conversation', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

router.get('/chatbot-analytics', async (req, res) => {
  try {
    const { start, end } = req.query;
    
    const timeframe = {
      start: start ? new Date(start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end as string) : new Date()
    };
    
    logger.info('Getting chatbot analytics', { timeframe });
    const analytics = await chatbotService.getAnalytics(timeframe);
    
    res.json({
      success: true,
      analytics
    });
  } catch (error) {
    logger.error('Error getting chatbot analytics', { error });
    res.status(500).json({
      success: false,
      analytics: null,
      error: 'Internal server error'
    });
  }
});

router.post('/compliance-check', validateRequest(complianceCheckSchema), async (req, res) => {
  try {
    logger.info('Compliance check requested');
    // TODO: Implement compliance service
    res.json({
      success: true,
      result: {
        checkId: 'comp_' + Date.now(),
        insuranceType: req.body.insuranceType,
        regulationType: 'state_regulations',
        isCompliant: true,
        violations: [],
        warnings: [],
        recommendations: ['Continue current compliance practices'],
        riskLevel: 'low',
        checkedAt: new Date()
      }
    });
  } catch (error) {
    logger.error('Error in compliance check route', { error });
    res.status(500).json({
      success: false,
      result: {},
      error: 'Internal server error'
    });
  }
});

export default router;
