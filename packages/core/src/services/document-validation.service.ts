import { logger } from '../logger.js';
import type {
  ProcessedDocument,
  CompletenessCheck,
  ReadabilityScore,
  PageCountValidation,
  SignatureValidation,
  DateValidation,
  ConsistencyIssue,
  QualityAssessment,
  ValidationType,
  ValidationSeverity,
} from '@insurance-lead-gen/types';

/**
 * Document Validation Service
 * Validates document quality, completeness, and consistency
 */
export class DocumentValidationService {
  private validationRules: Map<ValidationType, any>;

  constructor() {
    this.validationRules = new Map();
    this._initializeValidationRules();
  }

  /**
   * Validate document completeness
   */
  async validateCompleteness(document: ProcessedDocument): Promise<CompletenessCheck> {
    try {
      logger.info('Validating document completeness', { documentId: document.id });

      const requiredFields = this._getRequiredFields(document);
      const presentFields = this._getPresentFields(document);
      const missingFields = requiredFields.filter((field) => !presentFields.includes(field));

      const completenessPercentage = requiredFields.length > 0
        ? (presentFields.length / requiredFields.length) * 100
        : 100;

      const isValid = missingFields.length === 0;

      logger.info('Document completeness validated', {
        documentId: document.id,
        requiredFields: requiredFields.length,
        presentFields: presentFields.length,
        missingFields: missingFields.length,
        completenessPercentage,
        isValid,
      });

      return {
        documentId: document.id,
        requiredFields,
        presentFields,
        missingFields,
        completenessPercentage,
        isValid,
      };
    } catch (error) {
      logger.error('Failed to validate document completeness', { error, documentId: document.id });
      throw new Error(`Document completeness validation failed: ${error.message}`);
    }
  }

  /**
   * Check document readability
   */
  async checkReadability(filePath: string): Promise<ReadabilityScore> {
    try {
      logger.info('Checking document readability', { filePath });

      // Simulate readability analysis
      const imageQualityScore = await this._assessImageQuality(filePath);
      const textClarityScore = await this._assessTextClarity(filePath);
      const overallScore = (imageQualityScore + textClarityScore) / 2;

      const isReadable = overallScore >= 0.6;

      const issues: string[] = [];

      if (imageQualityScore < 0.7) {
        issues.push('Low image quality detected');
      }
      if (textClarityScore < 0.7) {
        issues.push('Text clarity issues detected');
      }
      if (!isReadable) {
        issues.push('Document may not be suitable for OCR processing');
      }

      logger.info('Document readability checked', {
        filePath,
        overallScore,
        isReadable,
        issueCount: issues.length,
      });

      return {
        documentId: filePath,
        imageQualityScore,
        textClarityScore,
        overallScore,
        isReadable,
        issues,
      };
    } catch (error) {
      logger.error('Failed to check document readability', { error, filePath });
      throw new Error(`Document readability check failed: ${error.message}`);
    }
  }

  /**
   * Validate page count
   */
  async validatePageCount(document: ProcessedDocument): Promise<PageCountValidation> {
    try {
      logger.info('Validating page count', { documentId: document.id });

      const expectedPageCount = this._getExpectedPageCount(document);
      const actualPageCount = document.pageCount || 0;

      const isValid = actualPageCount === expectedPageCount;

      let message = `Page count validation ${isValid ? 'passed' : 'failed'}`;
      if (!isValid) {
        message = `Expected ${expectedPageCount} pages, found ${actualPageCount} pages`;
      }

      logger.info('Page count validated', {
        documentId: document.id,
        expectedPageCount,
        actualPageCount,
        isValid,
        message,
      });

      return {
        documentId: document.id,
        expectedPageCount,
        actualPageCount,
        isValid,
        message,
      };
    } catch (error) {
      logger.error('Failed to validate page count', { error, documentId: document.id });
      throw new Error(`Page count validation failed: ${error.message}`);
    }
  }

  /**
   * Check for required signatures
   */
  async checkSignatures(document: ProcessedDocument): Promise<SignatureValidation> {
    try {
      logger.info('Checking for signatures', { documentId: document.id });

      // Simulate signature detection
      const hasSignature = await this._detectSignature(document);

      const isValid = hasSignature;

      const signatureLocation = hasSignature
        ? {
            pageNumber: Math.floor(Math.random() * (document.pageCount || 1)) + 1,
            x: Math.floor(Math.random() * 500),
            y: Math.floor(Math.random() * 500),
          }
        : undefined;

      const message = hasSignature
        ? 'Signature detected on document'
        : 'No signature found on document';

      logger.info('Signature check completed', {
        documentId: document.id,
        hasSignature,
        isValid,
        message,
      });

      return {
        documentId: document.id,
        hasSignature,
        signatureLocation,
        isValid,
        message,
      };
    } catch (error) {
      logger.error('Failed to check signatures', { error, documentId: document.id });
      throw new Error(`Signature check failed: ${error.message}`);
    }
  }

  /**
   * Validate dates (expiration, effective dates)
   */
  async validateDates(document: ProcessedDocument): Promise<DateValidation> {
    try {
      logger.info('Validating document dates', { documentId: document.id });

      // Extract dates from document text
      const dates = this._extractDatesFromDocument(document);

      const isValid = this._validateDateConsistency(dates);

      const issues: string[] = [];

      if (dates.expirationDate && dates.expirationDate < new Date()) {
        issues.push('Document has expired');
      }

      if (dates.effectiveDate && dates.expirationDate && dates.effectiveDate > dates.expirationDate) {
        issues.push('Effective date is after expiration date');
      }

      if (dates.claimDate && dates.incidentDate && dates.claimDate < dates.incidentDate) {
        issues.push('Claim date is before incident date');
      }

      logger.info('Document dates validated', {
        documentId: document.id,
        isValid,
        issueCount: issues.length,
      });

      return {
        documentId: document.id,
        dates,
        isValid,
        issues,
      };
    } catch (error) {
      logger.error('Failed to validate dates', { error, documentId: document.id });
      throw new Error(`Date validation failed: ${error.message}`);
    }
  }

  /**
   * Check for consistency issues
   */
  async checkConsistency(document: ProcessedDocument): Promise<ConsistencyIssue[]> {
    try {
      logger.info('Checking document consistency', { documentId: document.id });

      const consistencyIssues: ConsistencyIssue[] = [];

      // Check for various consistency issues
      consistencyIssues.push(...(await this._checkFieldConsistency(document)));
      consistencyIssues.push(...(await this._checkNumericConsistency(document)));
      consistencyIssues.push(...(await this._checkDateConsistency(document)));

      logger.info('Document consistency checked', {
        documentId: document.id,
        issueCount: consistencyIssues.length,
      });

      return consistencyIssues;
    } catch (error) {
      logger.error('Failed to check document consistency', { error, documentId: document.id });
      throw new Error(`Document consistency check failed: ${error.message}`);
    }
  }

  /**
   * Overall document quality assessment
   */
  async assessDocumentQuality(document: ProcessedDocument): Promise<QualityAssessment> {
    try {
      logger.info('Assessing document quality', { documentId: document.id });

      // Run all validation checks
      const [readabilityScore, completenessCheck, pageCountValidation, dateValidation] =
        await Promise.all([
          document.filePath ? this.checkReadability(document.filePath) : null,
          this.validateCompleteness(document),
          this.validatePageCount(document),
          this.validateDates(document),
        ]);

      const readability = readabilityScore ? readabilityScore.overallScore : 0.8;
      const completeness = completenessCheck.completenessPercentage / 100;
      const validation =
        pageCountValidation.isValid && dateValidation.isValid ? 1 : 0.7;

      const overallScore = (readability + completeness + validation) / 3;

      let recommendation: 'accept' | 'review' | 'reject';
      if (overallScore >= 0.85) {
        recommendation = 'accept';
      } else if (overallScore >= 0.6) {
        recommendation = 'review';
      } else {
        recommendation = 'reject';
      }

      // Collect all issues
      const issues: QualityAssessment['issues'] = [];

      if (readabilityScore) {
        readabilityScore.issues.forEach((issue) => {
          issues.push({
            type: 'readability',
            severity: 'medium',
            description: issue,
          });
        });
      }

      if (!pageCountValidation.isValid) {
        issues.push({
          type: 'page_count',
          severity: 'medium',
          description: pageCountValidation.message,
        });
      }

      if (!dateValidation.isValid) {
        dateValidation.issues.forEach((issue) => {
          issues.push({
            type: 'date_validity',
            severity: 'high',
            description: issue,
          });
        });
      }

      const consistencyIssues = await this.checkConsistency(document);
      consistencyIssues.forEach((issue) => {
        issues.push({
          type: 'consistency',
          severity: issue.severity,
          description: issue.description,
          actionRequired: issue.issueType,
        });
      });

      logger.info('Document quality assessed', {
        documentId: document.id,
        overallScore,
        recommendation,
        issueCount: issues.length,
      });

      return {
        documentId: document.id,
        overallScore,
        readabilityScore: readability,
        completenessScore: completeness,
        validationScore: validation,
        recommendation,
        issues,
      };
    } catch (error) {
      logger.error('Failed to assess document quality', { error, documentId: document.id });
      throw new Error(`Document quality assessment failed: ${error.message}`);
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private _initializeValidationRules(): void {
    // Initialize validation rules for different document types
    this.validationRules.set('page_count', {
      policy: { min: 5, max: 50 },
      claim: { min: 2, max: 20 },
      estimate: { min: 1, max: 10 },
    });

    this.validationRules.set('readability', {
      minQualityScore: 0.6,
      minClarityScore: 0.6,
    });

    this.validationRules.set('completeness', {
      requiredFields: {
        policy: ['policy_number', 'effective_date', 'premium'],
        claim: ['claim_number', 'date_of_loss', 'claimant_name'],
        estimate: ['estimate_number', 'total_amount', 'date'],
      },
    });
  }

  private _getRequiredFields(document: ProcessedDocument): string[] {
    // Get required fields based on document type
    const rules = this.validationRules.get('completeness');

    if (!rules || !document.documentType) {
      return [];
    }

    const docType = document.documentType.toLowerCase().replace('policy_', '').replace('_form', '');

    return rules.requiredFields[docType as keyof typeof rules.requiredFields] || [];
  }

  private _getPresentFields(document: ProcessedDocument): string[] {
    const fields: string[] = [];

    // Check which required fields are present in extracted text
    if (document.extractedText) {
      const text = document.extractedText.toLowerCase();

      if (text.includes('policy number') || text.includes('policy #')) {
        fields.push('policy_number');
      }
      if (text.includes('effective date')) {
        fields.push('effective_date');
      }
      if (text.includes('premium') || text.includes('payment amount')) {
        fields.push('premium');
      }
      if (text.includes('claim number') || text.includes('claim #')) {
        fields.push('claim_number');
      }
      if (text.includes('date of loss') || text.includes('loss date')) {
        fields.push('date_of_loss');
      }
      if (text.includes('claimant')) {
        fields.push('claimant_name');
      }
      if (text.includes('estimate') && text.includes('total')) {
        fields.push('estimate_number');
        fields.push('total_amount');
      }
      if (text.match(/\d{4}-\d{2}-\d{2}|month\s+\d+,\s+\d{4}/)) {
        fields.push('date');
      }
    }

    return fields;
  }

  private _getExpectedPageCount(document: ProcessedDocument): number {
    // Determine expected page count based on document type
    const rules = this.validationRules.get('page_count');

    if (!rules || !document.documentType) {
      return 1;
    }

    const docType = document.documentType.toLowerCase().replace('policy_', '').replace('_form', '');

    const range = rules[docType as keyof typeof rules] || { min: 1, max: 10 };

    // Return mid-range as expected
    return Math.ceil((range.min + range.max) / 2);
  }

  private async _assessImageQuality(_filePath: string): Promise<number> {
    // Simulate image quality assessment
    // In production, use actual image analysis
    return 0.75 + Math.random() * 0.24;
  }

  private async _assessTextClarity(_filePath: string): Promise<number> {
    // Simulate text clarity assessment
    // In production, use OCR confidence and text analysis
    return 0.78 + Math.random() * 0.21;
  }

  private async _detectSignature(document: ProcessedDocument): Promise<boolean> {
    // Simulate signature detection
    // In production, use computer vision or ML models

    if (!document.extractedText) {
      return false;
    }

    // Look for signature-related keywords
    const signatureKeywords = [
      'signed',
      'signature',
      'authorized',
      'approved',
      'agreed',
      'witness',
    ];

    const text = document.extractedText.toLowerCase();

    // If signature keywords are present, assume signature exists
    return signatureKeywords.some((keyword) => text.includes(keyword));
  }

  private _extractDatesFromDocument(document: ProcessedDocument): DateValidation['dates'] {
    const dates: DateValidation['dates'] = {};

    if (document.extractedText) {
      const text = document.extractedText;

      // Extract effective date
      const effectiveMatch = text.match(
        /(?:effective\s+date|policy\s+start|start\s+date)[:\s]+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i
      );
      if (effectiveMatch) {
        dates.effectiveDate = new Date(effectiveMatch[1]);
      }

      // Extract expiration date
      const expirationMatch = text.match(
        /(?:expiration\s+date|policy\s+end|end\s+date)[:\s]+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i
      );
      if (expirationMatch) {
        dates.expirationDate = new Date(expirationMatch[1]);
      }

      // Extract claim date
      const claimMatch = text.match(
        /(?:claim\s+date|date\s+of\s+claim)[:\s]+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i
      );
      if (claimMatch) {
        dates.claimDate = new Date(claimMatch[1]);
      }

      // Extract incident date
      const incidentMatch = text.match(
        /(?:incident\s+date|date\s+of\s+loss|loss\s+date)[:\s]+(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/i
      );
      if (incidentMatch) {
        dates.incidentDate = new Date(incidentMatch[1]);
      }
    }

    return dates;
  }

  private _validateDateConsistency(dates: DateValidation['dates']): boolean {
    // Check if dates are logically consistent
    const issues: string[] = [];

    if (dates.effectiveDate && dates.expirationDate) {
      if (dates.effectiveDate > dates.expirationDate) {
        issues.push('Effective date after expiration date');
      }
    }

    if (dates.claimDate && dates.incidentDate) {
      if (dates.claimDate < dates.incidentDate) {
        issues.push('Claim date before incident date');
      }
    }

    if (dates.effectiveDate && dates.claimDate) {
      if (dates.claimDate < dates.effectiveDate) {
        issues.push('Claim date before policy effective date');
      }
    }

    return issues.length === 0;
  }

  private async _checkFieldConsistency(document: ProcessedDocument): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // Check for consistent naming conventions
    if (document.extractedText) {
      const text = document.extractedText;

      // Check for conflicting insurance types
      const autoCount = (text.match(/auto|car|vehicle/gi) || []).length;
      const homeCount = (text.match(/home|house|property/gi) || []).length;
      const lifeCount = (text.match(/life/gi) || []).length;
      const healthCount = (text.match(/health|medical/gi) || []).length;

      const typeCounts = [
        { type: 'auto', count: autoCount },
        { type: 'home', count: homeCount },
        { type: 'life', count: lifeCount },
        { type: 'health', count: healthCount },
      ];

      const topTypes = typeCounts.filter((t) => t.count > 0).sort((a, b) => b.count - a.count);

      if (topTypes.length > 1) {
        const conflictingFields = topTypes.map((t) => t.type);
        issues.push({
          documentId: document.id,
          issueType: 'Multiple insurance types detected',
          description: 'Document appears to reference multiple insurance types',
          severity: 'medium',
          conflictingFields,
        });
      }
    }

    return issues;
  }

  private async _checkNumericConsistency(document: ProcessedDocument): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // Check for numeric consistency
    if (document.extractedText) {
      const text = document.extractedText;

      // Check for suspicious amounts
      const amountPattern = /\$?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/g;
      const amounts = text.match(amountPattern) || [];

      // Check for very large amounts that might be errors
      amounts.forEach((amount) => {
        const numericAmount = parseFloat(amount.replace(/[$,]/g, ''));
        if (numericAmount > 10000000) {
          issues.push({
            documentId: document.id,
            issueType: 'Suspicious amount detected',
            description: `Amount ${amount} appears unusually large`,
            severity: 'low',
            conflictingFields: [amount],
          });
        }
      });
    }

    return issues;
  }

  private async _checkDateConsistency(document: ProcessedDocument): Promise<ConsistencyIssue[]> {
    const issues: ConsistencyIssue[] = [];

    // Check for date consistency
    const dateValidation = await this.validateDates(document);

    dateValidation.issues.forEach((issue) => {
      issues.push({
        documentId: document.id,
        issueType: 'Date consistency issue',
        description: issue,
        severity: 'medium',
        conflictingFields: [],
      });
    });

    return issues;
  }
}
