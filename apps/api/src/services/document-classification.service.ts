import { PrismaClient } from '@prisma/client';
import { createLogger } from '@neru/core/logger';
import { Trace } from '@neru/core/monitoring/tracing-decorators';
import {
  DocumentClassification,
  DocumentClassificationRule,
  ClassificationResult,
  DocumentType,
  DocumentCategory,
  DocumentSensitivity,
} from '@neru/types';
import mime from 'mime-types';

const logger = createLogger('DocumentClassificationService');

export class DocumentClassificationService {
  private readonly prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  @Trace({ operationName: 'document-classification.classifyDocument' })
  async classifyDocument(
    fileName: string,
    mimeType?: string,
    contentPreview?: string
  ): Promise<ClassificationResult> {
    try {
      const startTime = Date.now();
      
      // Get active classification rules
      const rules = await this.prisma.documentClassificationRule.findMany({
        where: {
          status: 'Active',
        },
      });

      // Apply rules to classify document
      let bestMatch: { rule: DocumentClassificationRule; confidence: number } | null = null;
      let highestConfidence = 0;

      for (const rule of rules) {
        const confidence = this.calculateConfidence(fileName, mimeType, contentPreview, rule);
        
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          bestMatch = { rule, confidence };
        }
      }

      let classification: DocumentClassification;
      let ruleApplied: string | undefined;

      if (bestMatch && highestConfidence > 0.5) {
        // Apply rule-based classification
        classification = {
          documentType: (bestMatch.rule.documentType as DocumentType) || 'Other',
          category: bestMatch.rule.category as DocumentCategory,
          sensitivity: this.mapSensitivity(bestMatch.rule.sensitivity),
          piiDetected: this.shouldDetectPII(bestMatch.rule),
          requiresRedaction: bestMatch.rule.requiresRedaction,
          confidence: highestConfidence,
        };
        ruleApplied = bestMatch.rule.name;
      } else {
        // Use default classification based on file extension and MIME type
        classification = this.getDefaultClassification(fileName, mimeType);
        ruleApplied = 'Default Classification';
      }

      logger.info('Document classified', {
        fileName,
        classification,
        ruleApplied,
        confidence: highestConfidence,
        duration: Date.now() - startTime,
      });

      return {
        success: true,
        documentId: '', // Will be set by caller
        classification,
        ruleApplied,
        confidence: classification.confidence,
      };
    } catch (error) {
      logger.error('Failed to classify document', {
        fileName,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-classification.updateDocumentClassification' })
  async updateDocumentClassification(
    documentId: string,
    classification: DocumentClassification
  ): Promise<ClassificationResult> {
    try {
      const document = await this.prisma.document.update({
        where: { id: documentId },
        data: {
          documentType: classification.documentType,
          category: classification.category,
          sensitivity: classification.sensitivity,
          requiresRedaction: classification.requiresRedaction,
          complianceRelevant: classification.sensitivity === 'Confidential' || 
                              classification.sensitivity === 'Secret' ||
                              classification.piiDetected,
        },
        include: {
          retentionPolicy: true,
        },
      });

      logger.info('Document classification updated', {
        documentId,
        classification,
      });

      return {
        success: true,
        documentId,
        classification: {
          documentType: document.documentType as DocumentType,
          category: document.category as DocumentCategory,
          sensitivity: document.sensitivity as DocumentSensitivity,
          piiDetected: document.piiDetected,
          requiresRedaction: document.requiresRedaction,
          confidence: classification.confidence,
        },
        confidence: classification.confidence,
      };
    } catch (error) {
      logger.error('Failed to update document classification', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-classification.applyClassificationRule' })
  async applyClassificationRule(documentId: string, ruleId: string): Promise<ClassificationResult> {
    try {
      const rule = await this.prisma.documentClassificationRule.findUnique({
        where: { id: ruleId },
      });

      if (!rule) {
        throw new Error(`Classification rule not found: ${ruleId}`);
      }

      const classification: DocumentClassification = {
        documentType: (rule.documentType as DocumentType) || 'Other',
        category: rule.category as DocumentCategory,
        sensitivity: this.mapSensitivity(rule.sensitivity),
        piiDetected: this.shouldDetectPII(rule),
        requiresRedaction: rule.requiresRedaction,
        confidence: 1.0, // 100% confidence when rule is explicitly applied
      };

      return this.updateDocumentClassification(documentId, classification);
    } catch (error) {
      logger.error('Failed to apply classification rule', {
        documentId,
        ruleId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-classification.getClassificationRules' })
  async getClassificationRules(): Promise<DocumentClassificationRule[]> {
    try {
      const rules = await this.prisma.documentClassificationRule.findMany({
        orderBy: {
          name: 'asc',
        },
      });

      return rules;
    } catch (error) {
      logger.error('Failed to get classification rules', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-classification.createClassificationRule' })
  async createClassificationRule(rule: {
    name: string;
    description?: string;
    pattern: string;
    documentType?: DocumentType;
    category: DocumentCategory;
    sensitivity: string; // 'P', 'I', 'C', 'S'
    requiresRedaction?: boolean;
    retentionCategory?: string;
    jurisdiction?: string[];
  }): Promise<DocumentClassificationRule> {
    try {
      // Validate regex pattern
      try {
        new RegExp(rule.pattern);
      } catch (error) {
        throw new Error('Invalid regex pattern: ' + rule.pattern);
      }

      const newRule = await this.prisma.documentClassificationRule.create({
        data: {
          name: rule.name,
          description: rule.description,
          pattern: rule.pattern,
          documentType: rule.documentType,
          category: rule.category,
          sensitivity: rule.sensitivity,
          requiresRedaction: rule.requiresRedaction || false,
          retentionCategory: rule.retentionCategory,
          jurisdiction: rule.jurisdiction || [],
        },
      });

      logger.info('Classification rule created', {
        ruleId: newRule.id,
        name: newRule.name,
      });

      return newRule;
    } catch (error) {
      logger.error('Failed to create classification rule', {
        rule,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-classification.updateClassificationRule' })
  async updateClassificationRule(
    ruleId: string,
    updates: Partial<{
      name: string;
      description: string;
      pattern: string;
      documentType: DocumentType;
      category: DocumentCategory;
      sensitivity: string;
      requiresRedaction: boolean;
      retentionCategory: string;
      jurisdiction: string[];
      status: string;
    }>
  ): Promise<DocumentClassificationRule> {
    try {
      // Validate regex pattern if provided
      if (updates.pattern) {
        try {
          new RegExp(updates.pattern);
        } catch (error) {
          throw new Error('Invalid regex pattern: ' + updates.pattern);
        }
      }

      const updatedRule = await this.prisma.documentClassificationRule.update({
        where: { id: ruleId },
        data: updates,
      });

      logger.info('Classification rule updated', {
        ruleId,
        updates: Object.keys(updates),
      });

      return updatedRule;
    } catch (error) {
      logger.error('Failed to update classification rule', {
        ruleId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'document-classification.deleteClassificationRule' })
  async deleteClassificationRule(ruleId: string): Promise<void> {
    try {
      await this.prisma.documentClassificationRule.update({
        where: { id: ruleId },
        data: {
          status: 'Inactive',
        },
      });

      logger.info('Classification rule deleted', { ruleId });
    } catch (error) {
      logger.error('Failed to delete classification rule', {
        ruleId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private calculateConfidence(
    fileName: string,
    mimeType: string | undefined,
    contentPreview: string | undefined,
    rule: DocumentClassificationRule
  ): number {
    let confidence = 0;
    let factors = 0;

    // Check filename pattern
    if (rule.pattern) {
      try {
        const regex = new RegExp(rule.pattern, 'i');
        if (regex.test(fileName)) {
          confidence += 0.6;
          factors++;
        }
      } catch (error) {
        logger.warn('Invalid regex pattern in rule', {
          ruleId: rule.id,
          pattern: rule.pattern,
        });
      }
    }

    // Check MIME type
    if (mimeType && rule.category === 'Financial' && this.isFinancialDocType(mimeType)) {
      confidence += 0.2;
      factors++;
    }
    if (mimeType && rule.category === 'Identity' && this.isIdentityDocType(mimeType)) {
      confidence += 0.2;
      factors++;
    }
    if (mimeType && rule.category === 'Legal' && this.isLegalDocType(mimeType)) {
      confidence += 0.2;
      factors++;
    }

    // Check content preview
    if (contentPreview) {
      if (rule.category === 'Financial' && this.hasFinancialKeywords(contentPreview)) {
        confidence += 0.2;
        factors++;
      }
      if (rule.category === 'Identity' && this.hasIdentityKeywords(contentPreview)) {
        confidence += 0.2;
        factors++;
      }
      if (rule.category === 'Medical' && this.hasMedicalKeywords(contentPreview)) {
        confidence += 0.2;
        factors++;
      }
    }

    // Normalize confidence by number of factors
    if (factors > 0) {
      confidence = confidence / factors;
    }

    return Math.min(confidence, 1.0); // Cap at 1.0
  }

  private getDefaultClassification(fileName: string, mimeType?: string): DocumentClassification {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    // Check financial documents
    if (extension === 'pdf' && this.hasFinancialKeywords(fileName)) {
      return {
        documentType: 'Other',
        category: 'Financial',
        sensitivity: 'Confidential',
        piiDetected: true,
        requiresRedaction: true,
        confidence: 0.7,
      };
    }

    // Check identity documents
    if (['jpg', 'jpeg', 'png', 'pdf'].includes(extension || '') && this.hasIdentityKeywords(fileName)) {
      return {
        documentType: 'ID',
        category: 'Identity',
        sensitivity: 'Secret',
        piiDetected: true,
        requiresRedaction: true,
        confidence: 0.8,
      };
    }

    // Check legal documents
    if (extension === 'pdf' && this.hasLegalKeywords(fileName)) {
      return {
        documentType: 'Disclosure',
        category: 'Legal',
        sensitivity: 'Confidential',
        piiDetected: false,
        requiresRedaction: false,
        confidence: 0.6,
      };
    }

    // Default classification
    return {
      documentType: 'Other',
      category: 'Operational',
      sensitivity: 'Internal',
      piiDetected: false,
      requiresRedaction: false,
      confidence: 0.5,
    };
  }

  private mapSensitivity(sensitivityCode: string): DocumentSensitivity {
    switch (sensitivityCode.toUpperCase()) {
      case 'P':
        return 'Public';
      case 'I':
        return 'Internal';
      case 'C':
        return 'Confidential';
      case 'S':
        return 'Secret';
      default:
        return 'Internal';
    }
  }

  private shouldDetectPII(rule: DocumentClassificationRule): boolean {
    // PII likely in financial, identity, and medical documents
    return rule.category === 'Financial' || 
           rule.category === 'Identity' || 
           rule.category === 'Medical';
  }

  private isFinancialDocType(mimeType: string): boolean {
    return mimeType === 'application/pdf' || mimeType === 'application/vnd.ms-excel';
  }

  private isIdentityDocType(mimeType: string): boolean {
    return mimeType.startsWith('image/') || mimeType === 'application/pdf';
  }

  private isLegalDocType(mimeType: string): boolean {
    return mimeType === 'application/pdf' || mimeType === 'application/msword';
  }

  private hasFinancialKeywords(text: string): boolean {
    const keywords = ['statement', 'invoice', 'receipt', 'payment', 'tax', 'financial', 'account'];
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private hasIdentityKeywords(text: string): boolean {
    const keywords = ['id', 'identification', 'license', 'passport', 'ssn', 'social'];
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private hasMedicalKeywords(text: string): boolean {
    const keywords = ['medical', 'health', 'treatment', 'diagnosis', 'prescription'];
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  private hasLegalKeywords(text: string): boolean {
    const keywords = ['contract', 'agreement', 'legal', 'court', 'attorney', 'disclosure'];
    return keywords.some(keyword => text.toLowerCase().includes(keyword));
  }

  async disconnect() {
    await this.prisma.$disconnect();
  }
}