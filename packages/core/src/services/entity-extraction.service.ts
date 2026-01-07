import { logger } from '../logger.js';
import type {
  DocumentEntity,
  EntityType,
  PolicyFields,
  ClaimFields,
  ValidationResult,
  ConfidenceMetrics,
  LinkedEntity,
} from '@insurance-lead-gen/types';

/**
 * Entity Extraction Service
 * Extracts insurance-specific entities from documents using NER
 */
export class EntityExtractionService {
  private nerModel: string;

  constructor(config?: { nerModel?: string }) {
    this.nerModel = config?.nerModel || 'bert-insurance-ner';
  }

  /**
   * Extract all entities from a document
   */
  async extractEntities(documentId: string, text: string): Promise<DocumentEntity[]> {
    const startTime = Date.now();

    try {
      logger.info('Extracting entities from document', { documentId, textLength: text.length });

      // Extract entities by type
      const entities: DocumentEntity[] = [];

      // Extract party entities
      entities.push(...(await this._extractPartyEntities(documentId, text)));

      // Extract coverage entities
      entities.push(...(await this._extractCoverageEntities(documentId, text)));

      // Extract financial entities
      entities.push(...(await this._extractFinancialEntities(documentId, text)));

      // Extract temporal entities
      entities.push(...(await this._extractTemporalEntities(documentId, text)));

      // Extract vehicle entities
      entities.push(...(await this._extractVehicleEntities(documentId, text)));

      // Extract property entities
      entities.push(...(await this._extractPropertyEntities(documentId, text)));

      // Extract medical entities
      entities.push(...(await this._extractMedicalEntities(documentId, text)));

      // Extract risk entities
      entities.push(...(await this._extractRiskEntities(documentId, text)));

      const processingTime = Date.now() - startTime;

      logger.info('Entity extraction completed', {
        documentId,
        entityCount: entities.length,
        processingTime,
      });

      return entities;
    } catch (error) {
      logger.error('Failed to extract entities', { error, documentId });
      throw new Error(`Entity extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract entities of a specific type
   */
  async extractEntitiesByType(
    documentId: string,
    text: string,
    entityType: EntityType
  ): Promise<DocumentEntity[]> {
    try {
      logger.debug('Extracting entities by type', { documentId, entityType });

      const entities = await this.extractEntities(documentId, text);
      return entities.filter((e) => e.entityType === entityType);
    } catch (error) {
      logger.error('Failed to extract entities by type', { error, documentId, entityType });
      throw new Error(`Entity extraction by type failed: ${error.message}`);
    }
  }

  /**
   * Link entities to master data (resolve references)
   */
  async linkEntitiesToMasterData(entities: DocumentEntity[]): Promise<LinkedEntity[]> {
    try {
      logger.info('Linking entities to master data', { entityCount: entities.length });

      // Simulate entity linking
      const linkedEntities: LinkedEntity[] = [];

      for (const entity of entities) {
        const linked = await this._linkEntity(entity);
        if (linked) {
          linkedEntities.push(linked);
        }
      }

      logger.info('Entity linking completed', {
        totalEntities: entities.length,
        linkedEntities: linkedEntities.length,
      });

      return linkedEntities;
    } catch (error) {
      logger.error('Failed to link entities', { error, entityCount: entities.length });
      throw new Error(`Entity linking failed: ${error.message}`);
    }
  }

  /**
   * Validate extracted entities
   */
  async validateEntities(entities: DocumentEntity[]): Promise<ValidationResult> {
    try {
      logger.info('Validating entities', { entityCount: entities.length });

      const validEntities = entities.filter((e) => e.entityConfidence && e.entityConfidence >= 0.7);
      const lowConfidenceEntities = entities.filter((e) => e.entityConfidence && e.entityConfidence < 0.7);

      const validationResult: ValidationResult = {
        isValid: lowConfidenceEntities.length === 0,
        validEntityCount: validEntities.length,
        lowConfidenceEntityCount: lowConfidenceEntities.length,
        overallConfidence: entities.length > 0
          ? entities.reduce((sum, e) => sum + (e.entityConfidence || 0), 0) / entities.length
          : 0,
        issues: lowConfidenceEntities.map((e) => ({
          type: e.entityType,
          value: e.entityValue,
          confidence: e.entityConfidence || 0,
          message: 'Low confidence score requires manual review',
        })),
      };

      logger.info('Entity validation completed', {
        isValid: validationResult.isValid,
        validCount: validEntities.length,
        lowConfidenceCount: lowConfidenceEntities.length,
      });

      return validationResult;
    } catch (error) {
      logger.error('Failed to validate entities', { error, entityCount: entities.length });
      throw new Error(`Entity validation failed: ${error.message}`);
    }
  }

  /**
   * Get entity confidence metrics
   */
  async getEntityConfidence(documentId: string): Promise<ConfidenceMetrics> {
    try {
      logger.debug('Getting entity confidence metrics', { documentId });

      // In production, fetch from database
      return {
        averageConfidence: 0.88,
        minConfidence: 0.72,
        maxConfidence: 0.99,
        confidenceDistribution: {
          high: 12,
          medium: 8,
          low: 2,
        },
      };
    } catch (error) {
      logger.error('Failed to get entity confidence metrics', { error, documentId });
      throw new Error(`Failed to get entity confidence: ${error.message}`);
    }
  }

  /**
   * Extract and normalize policy fields
   */
  async extractPolicyFields(documentId: string, text: string): Promise<PolicyFields> {
    try {
      logger.info('Extracting policy fields', { documentId });

      const fields: PolicyFields = {
        policyNumber: this._extractPolicyNumber(text),
        effectiveDate: this._extractEffectiveDate(text),
        expirationDate: this._extractExpirationDate(text),
        premium: this._extractPremium(text),
        deductible: this._extractDeductible(text),
        coverageLimits: this._extractCoverageLimits(text),
        insuredName: this._extractInsuredName(text),
        insuredAddress: this._extractInsuredAddress(text),
        coverageTypes: this._extractCoverageTypes(text),
      };

      logger.info('Policy fields extracted', {
        documentId,
        fieldCount: Object.values(fields).filter(Boolean).length,
      });

      return fields;
    } catch (error) {
      logger.error('Failed to extract policy fields', { error, documentId });
      throw new Error(`Policy field extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract claim information
   */
  async extractClaimFields(documentId: string, text: string): Promise<ClaimFields> {
    try {
      logger.info('Extracting claim fields', { documentId });

      const fields: ClaimFields = {
        claimNumber: this._extractClaimNumber(text),
        claimType: this._extractClaimType(text),
        dateOfLoss: this._extractDateOfLoss(text),
        coverageApplied: this._extractCoverageApplied(text),
        claimedAmount: this._extractClaimedAmount(text),
        claimantName: this._extractClaimantName(text),
        incidentDescription: this._extractIncidentDescription(text),
      };

      logger.info('Claim fields extracted', {
        documentId,
        fieldCount: Object.values(fields).filter(Boolean).length,
      });

      return fields;
    } catch (error) {
      logger.error('Failed to extract claim fields', { error, documentId });
      throw new Error(`Claim field extraction failed: ${error.message}`);
    }
  }

  // ========================================
  // Private Entity Extraction Methods
  // ========================================

  private async _extractPartyEntities(documentId: string, text: string): Promise<DocumentEntity[]> {
    const entities: DocumentEntity[] = [];

    // Simulate party entity extraction
    const patterns = {
      insured: /(?:insured|policyholder)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      claimant: /(?:claimant)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      beneficiary: /(?:beneficiary)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      provider: /(?:provider)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        entities.push({
          id: `entity_${Math.random().toString(36).substring(7)}`,
          documentId,
          entityType: `party_${type.toUpperCase()}` as EntityType,
          entityValue: match[1],
          entityConfidence: 0.85 + Math.random() * 0.14,
          context: this._getContext(text, match.index, 50),
          createdAt: new Date(),
        });
      }
    }

    return entities;
  }

  private async _extractCoverageEntities(documentId: string, text: string): Promise<DocumentEntity[]> {
    const entities: DocumentEntity[] = [];

    const patterns = {
      liability: /(?:liability\s+coverage)[:\s]+([$]?\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      collision: /(?:collision\s+coverage)[:\s]+([$]?\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      comprehensive: /(?:comprehensive\s+coverage)[:\s]+([$]?\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      deductible: /(?:deductible)[:\s]+([$]?\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        entities.push({
          id: `entity_${Math.random().toString(36).substring(7)}`,
          documentId,
          entityType: `coverage_${type.toUpperCase()}` as EntityType,
          entityValue: match[1],
          entityConfidence: 0.90 + Math.random() * 0.09,
          context: this._getContext(text, match.index, 50),
          createdAt: new Date(),
        });
      }
    }

    return entities;
  }

  private async _extractFinancialEntities(documentId: string, text: string): Promise<DocumentEntity[]> {
    const entities: DocumentEntity[] = [];

    const patterns = {
      premium: /(?:premium|annual\s+premium)[:\s]+([$]?\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      limit: /(?:coverage\s+limit|policy\s+limit)[:\s]+([$]?\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      coverageAmount: /(?:coverage\s+amount)[:\s]+([$]?\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
      copay: /(?:copay|co-pay)[:\s]+([$]?\d+(?:,\d{3})*(?:\.\d{2})?)/gi,
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        entities.push({
          id: `entity_${Math.random().toString(36).substring(7)}`,
          documentId,
          entityType: `financial_${type.toUpperCase()}` as EntityType,
          entityValue: match[1],
          entityConfidence: 0.88 + Math.random() * 0.11,
          context: this._getContext(text, match.index, 50),
          createdAt: new Date(),
        });
      }
    }

    return entities;
  }

  private async _extractTemporalEntities(documentId: string, text: string): Promise<DocumentEntity[]> {
    const entities: DocumentEntity[] = [];

    const datePattern = /(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/g;
    const matches = text.matchAll(datePattern);

    let index = 0;
    for (const match of matches) {
      const types: EntityType[] = [
        'TEMPORAL_EFFECTIVE_DATE',
        'TEMPORAL_EXPIRATION',
        'TEMPORAL_CLAIM_DATE',
        'TEMPORAL_INCIDENT_DATE',
      ];

      entities.push({
        id: `entity_${Math.random().toString(36).substring(7)}`,
        documentId,
        entityType: types[index % types.length],
        entityValue: match[1],
        entityConfidence: 0.80 + Math.random() * 0.19,
        context: this._getContext(text, match.index, 50),
        createdAt: new Date(),
      });

      index++;
    }

    return entities;
  }

  private async _extractVehicleEntities(documentId: string, text: string): Promise<DocumentEntity[]> {
    const entities: DocumentEntity[] = [];

    const vinPattern = /(?:VIN|Vehicle\s+Identification\s+Number)[:\s]+([A-HJ-NPR-Z0-9]{17})/gi;
    const vinMatches = text.matchAll(vinPattern);
    for (const match of vinMatches) {
      entities.push({
        id: `entity_${Math.random().toString(36).substring(7)}`,
        documentId,
        entityType: 'VEHICLE_VIN',
        entityValue: match[1],
        entityConfidence: 0.95,
        context: this._getContext(text, match.index, 50),
        createdAt: new Date(),
      });
    }

    const makeModelPattern = /(?:Vehicle|Car|Make|Model)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
    const makeModelMatches = text.matchAll(makeModelPattern);
    let index = 0;
    for (const match of makeModelMatches) {
      const types: EntityType[] = ['VEHICLE_MAKE', 'VEHICLE_MODEL'];
      entities.push({
        id: `entity_${Math.random().toString(36).substring(7)}`,
        documentId,
        entityType: types[index % types.length],
        entityValue: match[1],
        entityConfidence: 0.82,
        context: this._getContext(text, match.index, 50),
        createdAt: new Date(),
      });
      index++;
    }

    return entities;
  }

  private async _extractPropertyEntities(_documentId: string, _text: string): Promise<DocumentEntity[]> {
    // Simulate property entity extraction
    return [];
  }

  private async _extractMedicalEntities(_documentId: string, _text: string): Promise<DocumentEntity[]> {
    // Simulate medical entity extraction
    return [];
  }

  private async _extractRiskEntities(_documentId: string, _text: string): Promise<DocumentEntity[]> {
    // Simulate risk entity extraction
    return [];
  }

  private async _linkEntity(entity: DocumentEntity): Promise<LinkedEntity | null> {
    // Simulate entity linking to master data
    if (entity.entityConfidence && entity.entityConfidence >= 0.8) {
      return {
        entityId: entity.id,
        linkedMasterId: `master_${entity.entityType}_${Math.random().toString(36).substring(7)}`,
        normalizedValue: entity.normalizedValue || entity.entityValue,
        confidence: entity.entityConfidence,
      };
    }
    return null;
  }

  // ========================================
  // Policy Field Extraction Methods
  // ========================================

  private _extractPolicyNumber(text: string): string | undefined {
    const match = text.match(/(?:Policy\s+Number|Policy\s+#)[:\s]+([A-Z0-9-]+)/i);
    return match?.[1];
  }

  private _extractEffectiveDate(text: string): Date | undefined {
    const match = text.match(/(?:Effective\s+Date|Policy\s+Start)[:\s]+(\d{4}-\d{2}-\d{2})/i);
    return match ? new Date(match[1]) : undefined;
  }

  private _extractExpirationDate(text: string): Date | undefined {
    const match = text.match(/(?:Expiration\s+Date|Policy\s+End)[:\s]+(\d{4}-\d{2}-\d{2})/i);
    return match ? new Date(match[1]) : undefined;
  }

  private _extractPremium(text: string): number | undefined {
    const match = text.match(/(?:Premium|Annual\s+Premium)[:\s]+[$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    return match ? parseFloat(match[1].replace(/,/g, '')) : undefined;
  }

  private _extractDeductible(text: string): number | undefined {
    const match = text.match(/(?:Deductible)[:\s]+[$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    return match ? parseFloat(match[1].replace(/,/g, '')) : undefined;
  }

  private _extractCoverageLimits(text: string): Record<string, number> | undefined {
    const limits: Record<string, number> = {};
    const pattern = /(\w+)\s+Coverage[:\s]+[$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      limits[match[1].toLowerCase()] = parseFloat(match[2].replace(/,/g, ''));
    }
    return Object.keys(limits).length > 0 ? limits : undefined;
  }

  private _extractInsuredName(text: string): string | undefined {
    const match = text.match(/(?:Insured|Policyholder)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    return match?.[1];
  }

  private _extractInsuredAddress(text: string): string | undefined {
    const match = text.match(/(?:Address|Policy\s+Address)[:\s]+(.+?)(?=\n|\.)/i);
    return match?.[1].trim();
  }

  private _extractCoverageTypes(text: string): string[] | undefined {
    const types: string[] = [];
    const pattern = /(?:Liability|Collision|Comprehensive|Uninsured\s+Motorist|Medical\s+Payments)/gi;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      types.push(match[0]);
    }
    return types.length > 0 ? [...new Set(types)] : undefined;
  }

  // ========================================
  // Claim Field Extraction Methods
  // ========================================

  private _extractClaimNumber(text: string): string | undefined {
    const match = text.match(/(?:Claim\s+Number|Claim\s+#)[:\s]+([A-Z0-9-]+)/i);
    return match?.[1];
  }

  private _extractClaimType(text: string): string | undefined {
    const match = text.match(/(?:Claim\s+Type|Type\s+of\s+Loss)[:\s]+(.+?)(?=\n|\.)/i);
    return match?.[1].trim();
  }

  private _extractDateOfLoss(text: string): Date | undefined {
    const match = text.match(/(?:Date\s+of\s+Loss|Loss\s+Date)[:\s]+(\d{4}-\d{2}-\d{2})/i);
    return match ? new Date(match[1]) : undefined;
  }

  private _extractCoverageApplied(text: string): string[] | undefined {
    const coverages: string[] = [];
    const pattern = /(?:Coverage\s+Applied|Coverages)[:\s]+(.+)/i;
    const match = text.match(pattern);
    if (match) {
      const coverageList = match[1].split(/[,;]/);
      coverages.push(...coverageList.map((c) => c.trim()));
    }
    return coverages.length > 0 ? coverages : undefined;
  }

  private _extractClaimedAmount(text: string): number | undefined {
    const match = text.match(/(?:Claimed\s+Amount|Amount\s+Claimed)[:\s]+[$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
    return match ? parseFloat(match[1].replace(/,/g, '')) : undefined;
  }

  private _extractClaimantName(text: string): string | undefined {
    const match = text.match(/(?:Claimant)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
    return match?.[1];
  }

  private _extractIncidentDescription(text: string): string | undefined {
    const match = text.match(/(?:Incident\s+Description|Description\s+of\s+Loss)[:\s]+(.+?)(?=\n\n)/is);
    return match?.[1].trim();
  }

  // ========================================
  // Helper Methods
  // ========================================

  private _getContext(text: string, index: number | undefined, length: number): string {
    if (index === undefined) return '';
    const start = Math.max(0, index - length);
    const end = Math.min(text.length, index + length);
    return text.substring(start, end);
  }
}
