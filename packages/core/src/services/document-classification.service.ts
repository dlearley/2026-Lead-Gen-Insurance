import { logger } from '../logger.js';
import type {
  ProcessedDocument,
  DocumentClassification,
  DocumentText,
  QualityAssessment,
  ClassificationHistory,
} from '@insurance-lead-gen/types';

/**
 * Document Classification Service
 * Handles document classification, OCR text extraction, and quality assessment
 */
export class DocumentClassificationService {
  private ocrEngine: string;
  private classificationModel: string;

  constructor(config?: { ocrEngine?: string; classificationModel?: string }) {
    this.ocrEngine = config?.ocrEngine || 'tesseract';
    this.classificationModel = config?.classificationModel || 'bert-insurance-classifier';
  }

  /**
   * Classify document type using ML model
   */
  async classifyDocument(documentPath: string): Promise<DocumentClassification> {
    const startTime = Date.now();

    try {
      logger.info('Classifying document', { documentPath });

      // Simulate ML classification (in production, use actual ML model)
      const classification = await this._runClassificationModel(documentPath);

      const processingTime = Date.now() - startTime;

      logger.info('Document classified successfully', {
        documentPath,
        documentType: classification.documentType,
        confidence: classification.confidence,
        processingTime,
      });

      return {
        documentId: this._generateDocumentId(documentPath),
        ...classification,
        processingTime,
      };
    } catch (error) {
      logger.error('Failed to classify document', { error, documentPath });
      throw new Error(`Document classification failed: ${error.message}`);
    }
  }

  /**
   * Extract text from document using OCR
   */
  async extractTextFromDocument(documentPath: string): Promise<DocumentText> {
    const startTime = Date.now();

    try {
      logger.info('Extracting text from document', { documentPath });

      // Simulate OCR extraction (in production, use Tesseract, AWS Textract, or Google Vision)
      const result = await this._runOCREngine(documentPath);

      const processingTime = Date.now() - startTime;

      logger.info('Text extracted successfully', {
        documentPath,
        pageCount: result.pageCount,
        ocrConfidence: result.ocrConfidence,
        processingTime,
      });

      return {
        documentId: this._generateDocumentId(documentPath),
        ...result,
        processingTime,
      };
    } catch (error) {
      logger.error('Failed to extract text from document', { error, documentPath });
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Get classification confidence for a document
   */
  async getClassificationConfidence(documentId: string): Promise<number> {
    try {
      logger.debug('Getting classification confidence', { documentId });

      // In production, fetch from database
      // For now, return a default value
      return 0.95;
    } catch (error) {
      logger.error('Failed to get classification confidence', { error, documentId });
      throw new Error(`Failed to get classification confidence: ${error.message}`);
    }
  }

  /**
   * Validate document quality
   */
  async validateDocumentQuality(documentId: string): Promise<QualityAssessment> {
    try {
      logger.info('Validating document quality', { documentId });

      // Simulate quality validation
      const readabilityScore = await this._assessReadability(documentId);
      const completenessScore = await this._assessCompleteness(documentId);
      const validationScore = await this._assessValidation(documentId);

      const overallScore = (readabilityScore + completenessScore + validationScore) / 3;

      let recommendation: 'accept' | 'review' | 'reject';
      if (overallScore >= 0.8) {
        recommendation = 'accept';
      } else if (overallScore >= 0.6) {
        recommendation = 'review';
      } else {
        recommendation = 'reject';
      }

      const issues = await this._identifyIssues(documentId);

      logger.info('Document quality validated', {
        documentId,
        overallScore,
        recommendation,
        issueCount: issues.length,
      });

      return {
        documentId,
        overallScore,
        readabilityScore,
        completenessScore,
        validationScore,
        recommendation,
        issues,
      };
    } catch (error) {
      logger.error('Failed to validate document quality', { error, documentId });
      throw new Error(`Document quality validation failed: ${error.message}`);
    }
  }

  /**
   * Get classification history for a document
   */
  async getClassificationHistory(documentId: string): Promise<ClassificationHistory[]> {
    try {
      logger.debug('Getting classification history', { documentId });

      // In production, fetch from database
      return [];
    } catch (error) {
      logger.error('Failed to get classification history', { error, documentId });
      throw new Error(`Failed to get classification history: ${error.message}`);
    }
  }

  /**
   * Batch classify multiple documents
   */
  async batchClassifyDocuments(documentPaths: string[]): Promise<DocumentClassification[]> {
    const startTime = Date.now();

    try {
      logger.info('Batch classifying documents', { count: documentPaths.length });

      const classifications = await Promise.all(
        documentPaths.map((path) => this.classifyDocument(path))
      );

      const processingTime = Date.now() - startTime;

      logger.info('Batch classification completed', {
        count: documentPaths.length,
        processingTime,
      });

      return classifications;
    } catch (error) {
      logger.error('Batch classification failed', { error, count: documentPaths.length });
      throw new Error(`Batch classification failed: ${error.message}`);
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private async _runClassificationModel(
    documentPath: string
  ): Promise<Pick<DocumentClassification, 'documentType' | 'documentClass' | 'confidence'>> {
    // Simulate ML model inference
    // In production, this would call a trained BERT-based model

    const fileName = documentPath.toLowerCase();

    let documentType: DocumentClassification['documentType'] = 'other';
    let documentClass: DocumentClassification['documentClass'] = 'supporting_document';

    if (fileName.includes('policy') || fileName.includes('insurance')) {
      if (fileName.includes('auto')) {
        documentType = 'policy_auto';
      } else if (fileName.includes('home')) {
        documentType = 'policy_home';
      } else if (fileName.includes('life')) {
        documentType = 'policy_life';
      } else if (fileName.includes('health')) {
        documentType = 'policy_health';
      } else if (fileName.includes('commercial')) {
        documentType = 'policy_commercial';
      }
      documentClass = 'insurance_policy';
    } else if (fileName.includes('claim')) {
      documentType = 'claim_form';
      documentClass = 'claim_documentation';
    } else if (fileName.includes('medical')) {
      documentType = 'medical_record';
      documentClass = 'medical_records';
    } else if (fileName.includes('estimate')) {
      documentType = 'repair_estimate';
      documentClass = 'estimate';
    } else if (fileName.includes('police')) {
      documentType = 'police_report';
      documentClass = 'legal_document';
    }

    return {
      documentType,
      documentClass,
      confidence: 0.95 + Math.random() * 0.04, // 0.95-0.99 confidence
    };
  }

  private async _runOCREngine(documentPath: string): Promise<
    Pick<DocumentText, 'text' | 'pageCount' | 'ocrConfidence'>
  > {
    // Simulate OCR processing
    // In production, this would use Tesseract, AWS Textract, or Google Vision API

    const pageCount = Math.floor(Math.random() * 10) + 1;
    const ocrConfidence = 0.92 + Math.random() * 0.07; // 0.92-0.99 confidence

    // Simulate extracted text
    const text = `Sample extracted text from document at ${documentPath}. `.repeat(pageCount * 5);

    return {
      text,
      pageCount,
      ocrConfidence,
    };
  }

  private async _assessReadability(documentId: string): Promise<number> {
    // Simulate readability assessment
    return 0.85 + Math.random() * 0.14; // 0.85-0.99
  }

  private async _assessCompleteness(documentId: string): Promise<number> {
    // Simulate completeness assessment
    return 0.80 + Math.random() * 0.19; // 0.80-0.99
  }

  private async _assessValidation(documentId: string): Promise<number> {
    // Simulate validation assessment
    return 0.90 + Math.random() * 0.09; // 0.90-0.99
  }

  private async _identifyIssues(documentId: string): Promise<QualityAssessment['issues']> {
    // Simulate issue identification
    const issues: QualityAssessment['issues'] = [];

    if (Math.random() < 0.2) {
      issues.push({
        type: 'readability',
        severity: 'low',
        description: 'Some text areas are slightly blurred',
      });
    }

    if (Math.random() < 0.1) {
      issues.push({
        type: 'completeness',
        severity: 'medium',
        description: 'One field appears to be incomplete',
        actionRequired: 'Manual review recommended',
      });
    }

    return issues;
  }

  private _generateDocumentId(documentPath: string): string {
    // Generate a stable document ID from the path
    return `doc_${Buffer.from(documentPath).toString('base64').substring(0, 16)}`;
  }
}
