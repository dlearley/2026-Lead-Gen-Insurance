import { PrismaClient } from '@prisma/client';
import { createLogger } from '@neru/core/logger';
import { Trace, SpanAttribute } from '@neru/core/monitoring/tracing-decorators';
import {
  PIIPdetectionResult,
  RedactionMethod,
  PIIDetectionRule,
  PIIFieldSeverity,
} from '@neru/types';
import { DocumentStorageService } from './document-storage.service.js';

const logger = createLogger('PIIDetectionService');

export class PIIDetectionService {
  private readonly prisma: PrismaClient;
  private readonly storageService: DocumentStorageService;

  constructor() {
    this.prisma = new PrismaClient();
    this.storageService = new DocumentStorageService();
  }

  @Trace({ operationName: 'pii-detection.scanForPII' })
  async scanForPII(documentId: string): Promise<PIIPdetectionResult> {
    const startTime = Date.now();
    
    try {
      // Get document
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      // Get PII detection rules
      const rules = await this.prisma.pIIDetectionRule.findMany();

      // Get document content
      let content: string;
      try {
        const buffer = await this.storageService.downloadDocument(documentId);
        content = this.extractTextFromBuffer(buffer, document.mimeType);
      } catch (error) {
        logger.warn('Failed to download document for PII scanning', {
          documentId,
          error: error instanceof Error ? error.message : error,
        });
        // If we can't download, just scan filename
        content = document.filename + ' ' + (document.description || '');
      }

      // Detect PII in content
      const detectionResult = await this.detectPIIFields(content, rules);

      // Update document with PII detection results
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          piiDetected: detectionResult.hasPII,
          piiFields: detectionResult.detectedFields.map(field => field.fieldName),
          requiresRedaction: detectionResult.detectedFields.some(
            field => field.severity === 'Critical' || field.severity === 'High'
          ),
        },
      });

      logger.info('PII scan completed', {
        documentId,
        hasPII: detectionResult.hasPII,
        detectedFieldsCount: detectionResult.detectedFields.length,
        duration: Date.now() - startTime,
      });

      return detectionResult;
    } catch (error) {
      logger.error('Failed to scan for PII', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'pii-detection.detectPIIFields' })
  async detectPIIFields(
    @SpanAttribute() content: string, 
    rules?: PIIDetectionRule[]
  ): Promise<PIIPdetectionResult> {
    try {
      const detectionRules = rules || await this.prisma.pIIDetectionRule.findMany();
      const detectedFields: PIIPdetectionResult['detectedFields'] = [];

      for (const rule of detectionRules) {
        try {
          const regex = new RegExp(rule.pattern, 'gi');
          let match;
          const positions: number[] = [];

          while ((match = regex.exec(content)) !== null) {
            positions.push(match.index);
          }

          if (positions.length > 0) {
            detectedFields.push({
              fieldName: rule.fieldName,
              pattern: rule.pattern,
              severity: rule.severity as PIIFieldSeverity,
              positions,
              redactedValue: rule.redactionFormat || this.applyDefaultRedaction(match?.[0] || '', rule.redactionMethod as RedactionMethod),
            });
          }
        } catch (error) {
          logger.warn('Invalid regex pattern in PII rule', {
            ruleId: rule.id,
            pattern: rule.pattern,
          });
        }
      }

      const hasPII = detectedFields.length > 0;
      
      // Calculate severity summary
      const summary = {
        critical: detectedFields.filter(field => field.severity === 'Critical').length,
        high: detectedFields.filter(field => field.severity === 'High').length,
        medium: detectedFields.filter(field => field.severity === 'Medium').length,
      };

      return {
        hasPII,
        detectedFields,
        summary,
      };
    } catch (error) {
      logger.error('Failed to detect PII fields', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'pii-detection.flagForRedaction' })
  async flagForRedaction(documentId: string, fields?: string[]): Promise<void> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error(`Document not found: ${documentId}`);
      }

      let fieldsToRedact: string[];
      
      if (fields && fields.length > 0) {
        // Use specified fields
        fieldsToRedact = fields;
      } else {
        // Scan for PII to determine fields
        const scanResult = await this.scanForPII(documentId);
        fieldsToRedact = scanResult.detectedFields
          .filter(field => field.severity === 'Critical' || field.severity === 'High')
          .map(field => field.fieldName);
      }

      // Update document
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          requiresRedaction: true,
          piiFields: fieldsToRedact,
        },
      });

      logger.info('Document flagged for redaction', {
        documentId,
        fieldsToRedact,
      });
    } catch (error) {
      logger.error('Failed to flag document for redaction', {
        documentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'pii-detection.getPIIDetectionRules' })
  async getPIIDetectionRules(): Promise<PIIDetectionRule[]> {
    try {
      const rules = await this.prisma.pIIDetectionRule.findMany({
        orderBy: {
          fieldName: 'asc',
        },
      });

      return rules;
    } catch (error) {
      logger.error('Failed to get PII detection rules', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'pii-detection.createPIIDetectionRule' })
  async createPIIDetectionRule(rule: {
    fieldName: string;
    pattern: string;
    dataType: string;
    severity: PIIFieldSeverity;
    redactionMethod: RedactionMethod;
    redactionFormat?: string;
  }): Promise<PIIDetectionRule> {
    try {
      // Validate regex pattern
      try {
        new RegExp(rule.pattern);
      } catch (error) {
        throw new Error('Invalid regex pattern: ' + rule.pattern);
      }

      const newRule = await this.prisma.pIIDetectionRule.create({
        data: rule,
      });

      logger.info('PII detection rule created', {
        ruleId: newRule.id,
        fieldName: newRule.fieldName,
      });

      return newRule;
    } catch (error) {
      logger.error('Failed to create PII detection rule', {
        rule,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'pii-detection.updatePIIDetectionRule' })
  async updatePIIDetectionRule(
    ruleId: string,
    updates: Partial<{
      fieldName: string;
      pattern: string;
      dataType: string;
      severity: PIIFieldSeverity;
      redactionMethod: RedactionMethod;
      redactionFormat: string;
    }>
  ): Promise<PIIDetectionRule> {
    try {
      // Validate regex pattern if provided
      if (updates.pattern) {
        try {
          new RegExp(updates.pattern);
        } catch (error) {
          throw new Error('Invalid regex pattern: ' + updates.pattern);
        }
      }

      const updatedRule = await this.prisma.pIIDetectionRule.update({
        where: { id: ruleId },
        data: updates,
      });

      logger.info('PII detection rule updated', {
        ruleId,
        updates: Object.keys(updates),
      });

      return updatedRule;
    } catch (error) {
      logger.error('Failed to update PII detection rule', {
        ruleId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'pii-detection.deletePIIDetectionRule' })
  async deletePIIDetectionRule(ruleId: string): Promise<void> {
    try {
      await this.prisma.pIIDetectionRule.delete({
        where: { id: ruleId },
      });

      logger.info('PII detection rule deleted', { ruleId });
    } catch (error) {
      logger.error('Failed to delete PII detection rule', {
        ruleId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  @Trace({ operationName: 'pii-detection.generatePIIReport' })
  async generatePIIReport(dateRange: { start: Date; end: Date }): Promise<any> {
    try {
      const documents = await this.prisma.document.findMany({
        where: {
          uploadedDate: {
            gte: dateRange.start,
            lte: dateRange.end,
          },
        },
        include: {
          piiFields: true,
        },
      });

      const totalDocuments = documents.length;
      const documentsWithPII = documents.filter(doc => doc.piiDetected).length;

      // Count PII field occurrences
      const fieldCounts = {};
      documents.forEach(doc => {
        doc.piiFields.forEach(field => {
          fieldCounts[field] = (fieldCounts[field] || 0) + 1;
        });
      });

      const topPIIFields = Object.entries(fieldCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([fieldName, count]) => ({ fieldName, count }));

      // Severity counts
      const severityCounts = {
        critical: 0,
        high: 0,
        medium: 0,
      };

      documents.forEach(doc => {
        if (doc.piiDetected) {
          // In production, query actual PII detection results
          severityCounts.critical++;
        }
      });

      const documentsWithRedaction = documents.filter(doc => doc.redacted).length;

      return {
        period: dateRange,
        totalDocumentsScanned: totalDocuments,
        documentsWithPII,
        piiFieldCounts: severityCounts,
        topPIIFields,
        documentsWithRedaction,
        complianceIssues: [], // In production, analyze compliance issues
      };
    } catch (error) {
      logger.error('Failed to generate PII report', {
        dateRange,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  private extractTextFromBuffer(buffer: Buffer, mimeType: string): string {
    try {
      // For now, convert to string and extract first part for scanning
      // In production, use proper document parsing libraries
      if (mimeType.startsWith('text/')) {
        return buffer.toString('utf-8');
      }

      // For PDFs and other binary formats, try to extract text
      // In production, use libraries like pdf-parse, mammoth, etc.
      return buffer.toString('ascii');
    } catch (error) {
      logger.warn('Failed to extract text from buffer', {
        mimeType,
        error: error instanceof Error ? error.message : error,
      });
      return '';
    }
  }

  private applyDefaultRedaction(value: string, method: RedactionMethod): string {
    switch (method) {
      case 'Mask':
        if (value.length <= 4) return 'XXXX';
        return value.substring(0, 2) + 'X'.repeat(value.length - 4) + value.substring(value.length - 2);
      case 'Hash':
        // Simple hash (in production, use proper hashing)
        return 'HASHED';
      case 'Remove':
        return '';
      case 'Encrypt':
        return 'ENCRYPTED';
      default:
        return 'REDACTED';
    }
  }

  // Seed default PII detection rules
  @Trace({ operationName: 'pii-detection.seedDefaultRules' })
  async seedDefaultRules(): Promise<void> {
    try {
      const defaultRules = [
        {
          fieldName: 'SSN',
          pattern: '\\b\\d{3}-?\\d{2}-?\\d{4}\\b',
          dataType: 'Number',
          severity: 'Critical' as PIIFieldSeverity,
          redactionMethod: 'Mask' as RedactionMethod,
          redactionFormat: 'XXX-XX-1234',
        },
        {
          fieldName: 'CreditCard',
          pattern: '\\b(?:\\d{4}[-\\s]?){3}\\d{4}|\\b\\d{16}\\b',
          dataType: 'Number',
          severity: 'Critical' as PIIFieldSeverity,
          redactionMethod: 'Mask' as RedactionMethod,
          redactionFormat: 'XXXX-XXXX-XXXX-1234',
        },
        {
          fieldName: 'Email',
          pattern: '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b',
          dataType: 'Email',
          severity: 'High' as PIIFieldSeverity,
          redactionMethod: 'Mask' as RedactionMethod,
          redactionFormat: 'u***@example.com',
        },
        {
          fieldName: 'Phone',
          pattern: '\\b(?:\\+?1[-.\\s]?)?\\(?([0-9]{3})\\)?[-.\\s]?([0-9]{3})[-.\\s]?([0-9]{4})\\b',
          dataType: 'Phone',
          severity: 'High' as PIIFieldSeverity,
          redactionMethod: 'Mask' as RedactionMethod,
          redactionFormat: '(XXX) XXX-1234',
        },
        {
          fieldName: 'BankAccount',
          pattern: '\\b\\d{8,17}\\b',
          dataType: 'Number',
          severity: 'Critical' as PIIFieldSeverity,
          redactionMethod: 'Mask' as RedactionMethod,
          redactionFormat: 'XXX-XX-12345678',
        },
        {
          fieldName: 'DriversLicense',
          pattern: '\\b[A-Z]{1,2}\\d{6,9}\\b',
          dataType: 'Number',
          severity: 'High' as PIIFieldSeverity,
          redactionMethod: 'Mask' as RedactionMethod,
        },
      ];

      for (const rule of defaultRules) {
        try {
          await this.prisma.pIIDetectionRule.create({
            data: rule,
          });
        } catch (error) {
          // Skip if already exists
          logger.debug('Rule already exists', { fieldName: rule.fieldName });
        }
      }

      logger.info('Default PII detection rules seeded');
    } catch (error) {
      logger.error('Failed to seed default PII rules', {
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  async disconnect() {
    await this.storageService.disconnect();
    await this.prisma.$disconnect();
  }
}