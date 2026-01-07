import { logger } from '../logger.js';
import { EntityExtractionService } from './entity-extraction.service.js';
import type {
  PolicySummary,
  Highlight,
  Exclusion,
  CustomerSummary,
} from '@insurance-lead-gen/types';

interface CoverageDetail {
  coverageName: string;
  limit?: number;
  deductible?: number;
  summary: string;
  conditions?: string[];
}

/**
 * Policy Summarization Service
 * Generates AI-powered summaries of insurance policies
 */
export class PolicySummarizationService {
  private entityExtractionService: EntityExtractionService;
  private summarizationModel: string;

  constructor(config?: {
    summarizationModel?: string;
    entityExtractionService?: EntityExtractionService;
  }) {
    this.summarizationModel = config?.summarizationModel || 't5-policy-summarizer';
    this.entityExtractionService =
      config?.entityExtractionService || new EntityExtractionService();
  }

  /**
   * Generate full policy summary
   */
  async summarizePolicy(
    policyId: string,
    policyDocumentText: string,
    documentId?: string
  ): Promise<PolicySummary> {
    const startTime = Date.now();

    try {
      logger.info('Generating policy summary', { policyId, documentId });

      // Extract policy fields
      const policyFields = await this.entityExtractionService.extractPolicyFields(
        documentId || policyId,
        policyDocumentText
      );

      // Generate all summary components
      const executiveSummary = await this.generateExecutiveSummary(policyDocumentText);
      const coverageSummary = await this.extractCoverageDetails(
        policyDocumentText,
        policyFields
      );
      const keyHighlights = await this.identifyKeyHighlights(policyDocumentText);
      const plainEnglishSummary = await this.plainEnglishTranslation(policyDocumentText);
      const importantExclusions = await this.extractExclusions(policyDocumentText);
      const customerActionItems = this._generateCustomerActionItems(policyFields, coverageSummary);

      // Calculate quality score
      const summaryQualityScore = this._calculateSummaryQuality({
        executiveSummary,
        coverageSummary,
        keyHighlights,
        plainEnglishSummary,
        importantExclusions,
      });

      const processingTime = Date.now() - startTime;

      const policySummary: PolicySummary = {
        id: `summary_${policyId}`,
        policyId,
        policyDocumentId: documentId,
        executiveSummary,
        coverageSummary,
        keyHighlights,
        plainEnglishSummary,
        importantExclusions,
        customerActionItems,
        summaryQualityScore,
        generatedAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('Policy summary generated successfully', {
        policyId,
        qualityScore: summaryQualityScore,
        coverageCount: coverageSummary.length,
        highlightCount: keyHighlights.length,
        exclusionCount: importantExclusions.length,
        processingTime,
      });

      return policySummary;
    } catch (error) {
      logger.error('Failed to generate policy summary', { error, policyId });
      throw new Error(`Policy summarization failed: ${error.message}`);
    }
  }

  /**
   * Generate executive summary
   */
  async generateExecutiveSummary(policyText: string): Promise<string> {
    try {
      logger.debug('Generating executive summary', { textLength: policyText.length });

      // Simulate executive summary generation
      const summary = await this._runSummarizationModel(policyText, 'executive');

      logger.debug('Executive summary generated', {
        originalLength: policyText.length,
        summaryLength: summary.length,
      });

      return summary;
    } catch (error) {
      logger.error('Failed to generate executive summary', { error });
      throw new Error(`Executive summary generation failed: ${error.message}`);
    }
  }

  /**
   * Extract coverage details
   */
  async extractCoverageDetails(
    policyText: string,
    policyFields?: any
  ): Promise<CoverageDetail[]> {
    try {
      logger.debug('Extracting coverage details', { textLength: policyText.length });

      const coverageDetails: CoverageDetailDetail[] = [];

      // Extract coverage information from policy text
      const coveragePatterns = [
        { name: 'Liability Coverage', pattern: /(?:liability\s+coverage)/gi },
        { name: 'Collision Coverage', pattern: /(?:collision\s+coverage)/gi },
        { name: 'Comprehensive Coverage', pattern: /(?:comprehensive\s+coverage)/gi },
        { name: 'Uninsured Motorist', pattern: /(?:uninsured\s+motorist)/gi },
        { name: 'Medical Payments', pattern: /(?:medical\s+payments)/gi },
        { name: 'Personal Injury Protection', pattern: /(?:personal\s+injury\s+protection)/gi },
        { name: 'Property Damage', pattern: /(?:property\s+damage)/gi },
        { name: 'Bodily Injury', pattern: /(?:bodily\s+injury)/gi },
      ];

      for (const coverage of coveragePatterns) {
        const matches = policyText.matchAll(coverage.pattern);
        for (const match of matches) {
          const context = this._getContext(policyText, match.index, 200);

          // Extract limit and deductible
          const limitMatch = context.match(/(?:limit|coverage\s+amount)[:\s]+[$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/i);
          const deductibleMatch = context.match(/(?:deductible)[:\s]+[$]?(\d+(?:,\d{3})*(?:\.\d{2})?)/i);

          // Extract conditions
          const conditions: string[] = [];
          const conditionMatches = context.matchAll(/(?:condition|requirement)[:\s]+(.+?)(?:\.|$)/gi);
          for (const cMatch of conditionMatches) {
            conditions.push(cMatch[1].trim());
          }

          coverageDetails.push({
            coverageName: coverage.name,
            limit: limitMatch ? parseFloat(limitMatch[1].replace(/,/g, '')) : undefined,
            deductible: deductibleMatch ? parseFloat(deductibleMatch[1].replace(/,/g, '')) : undefined,
            summary: `Provides ${coverage.name.toLowerCase()} protection according to policy terms.`,
            conditions: conditions.length > 0 ? conditions : undefined,
          });
        }
      }

      logger.debug('Coverage details extracted', { count: coverageDetails.length });

      return coverageDetails;
    } catch (error) {
      logger.error('Failed to extract coverage details', { error });
      throw new Error(`Coverage detail extraction failed: ${error.message}`);
    }
  }

  /**
   * Identify key highlights
   */
  async identifyKeyHighlights(policyText: string): Promise<string[]> {
    try {
      logger.debug('Identifying key highlights', { textLength: policyText.length });

      const highlights: string[] = [];

      // Extract important statements
      const highlightPatterns = [
        { pattern: /(?:important|key|critical|note)[:\s]+(.+?)(?:\.|$)/gi, category: 'Important' },
        { pattern: /(?:coverage\s+limit|limit\s+of\s+liability)[:\s]+(.+?)(?:\.|$)/gi, category: 'Coverage' },
        { pattern: /(?:exclusion|not\s+covered)[:\s]+(.+?)(?:\.|$)/gi, category: 'Exclusion' },
        { pattern: /(?:deductible)[:\s]+(.+?)(?:\.|$)/gi, category: 'Deductible' },
        { pattern: /(?:effective\s+date|policy\s+period)[:\s]+(.+?)(?:\.|$)/gi, category: 'Policy Date' },
      ];

      for (const { pattern, category } of highlightPatterns) {
        const matches = policyText.matchAll(pattern);
        for (const match of matches) {
          const highlight: Highlight = `${category}: ${match[1].trim()}`;
          highlights.push(highlight);
        }
      }

      // Limit to top 10 highlights
      const topHighlights = highlights.slice(0, 10);

      logger.debug('Key highlights identified', { count: topHighlights.length });

      return topHighlights;
    } catch (error) {
      logger.error('Failed to identify key highlights', { error });
      throw new Error(`Key highlight identification failed: ${error.message}`);
    }
  }

  /**
   * Translate policy to plain English
   */
  async plainEnglishTranslation(policyText: string): Promise<string> {
    try {
      logger.debug('Translating policy to plain English', { textLength: policyText.length });

      // Simulate plain English translation
      const plainText = await this._runSimplificationModel(policyText);

      logger.debug('Plain English translation completed', {
        originalLength: policyText.length,
        simplifiedLength: plainText.length,
      });

      return plainText;
    } catch (error) {
      logger.error('Failed to translate policy to plain English', { error });
      throw new Error(`Plain English translation failed: ${error.message}`);
    }
  }

  /**
   * Extract exclusions and limitations
   */
  async extractExclusions(policyText: string): Promise<Exclusion[]> {
    try {
      logger.debug('Extracting exclusions', { textLength: policyText.length });

      const exclusions: Exclusion[] = [];

      // Find exclusion clauses
      const exclusionPatterns = [
        /(?:exclusion|not\s+covered|excluded\s+from\s+coverage)[:\s]+(.+?)(?:\.|$)/gi,
        /(?:this\s+policy\s+does\s+not\s+cover)[:\s]+(.+?)(?:\.|$)/gi,
      ];

      for (const pattern of exclusionPatterns) {
        const matches = policyText.matchAll(pattern);
        for (const match of matches) {
          // Determine impact level based on keywords
          const exclusionText = match[1].toLowerCase();
          let impact: Exclusion['impact'] = 'medium';

          if (
            exclusionText.includes('total') ||
            exclusionText.includes('complete') ||
            exclusionText.includes('never')
          ) {
            impact = 'high';
          } else if (exclusionText.includes('limited') || exclusionText.includes('restricted')) {
            impact = 'medium';
          } else {
            impact = 'low';
          }

          exclusions.push({
            description: match[1].trim(),
            category: this._categorizeExclusion(match[1]),
            impact,
          });
        }
      }

      logger.debug('Exclusions extracted', { count: exclusions.length });

      return exclusions;
    } catch (error) {
      logger.error('Failed to extract exclusions', { error });
      throw new Error(`Exclusion extraction failed: ${error.message}`);
    }
  }

  /**
   * Generate customer-friendly summary
   */
  async generateCustomerSummary(
    policyId: string,
    policyText: string,
    policyFields?: any
  ): Promise<CustomerSummary> {
    try {
      logger.info('Generating customer summary', { policyId });

      const executiveSummary = await this.generateExecutiveSummary(policyText);
      const coverageSummary = await this.extractCoverageDetails(policyText, policyFields);
      const importantExclusions = await this.extractExclusions(policyText);

      // Format key coverages
      const keyCoverages = coverageSummary.slice(0, 5).map((c) => ({
        name: c.coverageName,
        limit: c.limit ? `$${c.limit.toLocaleString()}` : 'Not specified',
        deductible: c.deductible ? `$${c.deductible.toLocaleString()}` : 'Not specified',
      }));

      // Format exclusions
      const exclusionList = importantExclusions
        .filter((e) => e.impact !== 'low')
        .map((e) => e.description)
        .slice(0, 5);

      // Generate next steps
      const nextSteps = [
        'Review your coverage limits and deductibles',
        'Keep this summary for your records',
        'Contact your agent with any questions',
      ];

      // Contact information
      const contactInformation = {
        'Customer Service': '1-800-555-0123',
        'Claims Hotline': '1-800-555-0199',
        'Website': 'www.insurance-example.com',
      };

      const customerSummary: CustomerSummary = {
        policyId,
        executiveSummary,
        keyCoverages,
        importantExclusions: exclusionList,
        nextSteps,
        contactInformation,
      };

      logger.info('Customer summary generated successfully', {
        policyId,
        coverageCount: keyCoverages.length,
        exclusionCount: exclusionList.length,
      });

      return customerSummary;
    } catch (error) {
      logger.error('Failed to generate customer summary', { error, policyId });
      throw new Error(`Customer summary generation failed: ${error.message}`);
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private async _runSummarizationModel(
    text: string,
    type: 'executive' | 'plain'
  ): Promise<string> {
    // Simulate BART/T5 summarization model
    // In production, this would use actual transformer models

    if (type === 'executive') {
      // Generate executive summary (2-3 paragraphs)
      return `This policy provides comprehensive insurance coverage tailored to your needs. The policy includes multiple coverage types with specified limits and deductibles designed to protect against various risks. Coverage begins on the effective date and continues through the expiration date, subject to policy terms and conditions.

Key features include liability protection, property coverage, and optional endorsements that can be added to customize your protection. Premium payments are due according to the selected billing schedule. Claims should be reported promptly following any covered loss.

Certain exclusions and limitations apply as outlined in the policy document. Review all terms carefully and contact your agent for clarification on any coverage questions or concerns.`;
    } else {
      // Generate plain English version
      return `This insurance policy protects you in several ways. It pays for damage or injuries you cause to others (liability coverage). It also pays for damage to your own property (property coverage). You choose how much protection you want by picking coverage limits.

You'll pay a set amount called a deductible before your insurance starts paying. For example, if you have a $500 deductible and $2,000 in damage, you pay $500 and insurance pays $1,500.

Some things aren't covered by this policy. These are called exclusions. Common exclusions include wear and tear, intentional damage, and certain types of property. Your policy lists all exclusions.

Your coverage starts on the effective date and ends on the expiration date. You must pay your premiums on time to keep your coverage active. If you don't pay, your policy could be cancelled.`;
    }
  }

  private async _runSimplificationModel(text: string): Promise<string> {
    // Simulate text simplification
    // In production, this would use specialized simplification models

    const sentences = text.split(/[.!?]/);
    const simplifiedSentences = sentences
      .filter((s) => s.trim().length > 0)
      .map((sentence) => {
        // Replace legal/technical terms with simpler language
        return sentence
          .replace(/(?:hereby|whereby|wherein)/gi, 'where')
          .replace(/(?:notwithstanding)/gi, 'despite')
          .replace(/(?:pursuant\s+to)/gi, 'according to')
          .replace(/(?:hereinafter)/gi, 'from now on')
          .replace(/(?:shall)/gi, 'will')
          .replace(/(?:hereunder)/gi, 'under this');
      });

    return simplifiedSentences.join('. ');
  }

  private _generateCustomerActionItems(
    policyFields: any,
    coverageSummary: CoverageDetail[]
  ): string[] {
    const actionItems: string[] = [];

    if (policyFields.effectiveDate) {
      actionItems.push(`Coverage effective: ${policyFields.effectiveDate.toLocaleDateString()}`);
    }

    if (policyFields.expirationDate) {
      actionItems.push(`Policy expires: ${policyFields.expirationDate.toLocaleDateString()}`);
    }

    if (policyFields.premium) {
      actionItems.push(`Premium payment: $${policyFields.premium.toFixed(2)} due per billing cycle`);
    }

    if (coverageSummary.length > 0) {
      actionItems.push(`Review ${coverageSummary.length} coverage types included in policy`);
    }

    actionItems.push('Keep copy of policy and this summary in safe location');
    actionItems.push('Contact agent to discuss coverage needs or changes');

    return actionItems;
  }

  private _calculateSummaryQuality(data: {
    executiveSummary: string;
    coverageSummary: CoverageDetail[];
    keyHighlights: string[];
    plainEnglishSummary: string;
    importantExclusions: Exclusion[];
  }): number {
    let score = 0;

    // Executive summary quality (25%)
    if (data.executiveSummary.length > 100 && data.executiveSummary.length < 1000) {
      score += 0.25 * 0.9;
    } else if (data.executiveSummary.length > 50) {
      score += 0.25 * 0.7;
    }

    // Coverage summary quality (25%)
    if (data.coverageSummary.length >= 3 && data.coverageSummary.length <= 10) {
      score += 0.25 * 0.9;
    } else if (data.coverageSummary.length > 0) {
      score += 0.25 * 0.7;
    }

    // Key highlights quality (15%)
    if (data.keyHighlights.length >= 5 && data.keyHighlights.length <= 15) {
      score += 0.15 * 0.9;
    } else if (data.keyHighlights.length > 0) {
      score += 0.15 * 0.7;
    }

    // Plain English summary quality (20%)
    if (data.plainEnglishSummary.length > 100) {
      score += 0.2 * 0.85;
    }

    // Exclusions quality (15%)
    if (data.importantExclusions.length > 0) {
      score += 0.15 * 0.8;
    }

    return Math.min(1, score);
  }

  private _categorizeExclusion(exclusionText: string): string {
    const lowerText = exclusionText.toLowerCase();

    if (lowerText.includes('vehicle') || lowerText.includes('car') || lowerText.includes('auto')) {
      return 'Vehicle';
    }
    if (
      lowerText.includes('property') ||
      lowerText.includes('home') ||
      lowerText.includes('building')
    ) {
      return 'Property';
    }
    if (lowerText.includes('medical') || lowerText.includes('health') || lowerText.includes('injury')) {
      return 'Medical';
    }
    if (lowerText.includes('natural') || lowerText.includes('flood') || lowerText.includes('earthquake')) {
      return 'Natural Disaster';
    }
    if (
      lowerText.includes('intentional') ||
      lowerText.includes('criminal') ||
      lowerText.includes('fraud')
    ) {
      return 'Intentional Acts';
    }

    return 'General';
  }

  private _getContext(text: string, index: number | undefined, length: number): string {
    if (index === undefined) return '';
    const start = Math.max(0, index - length);
    const end = Math.min(text.length, index + length);
    return text.substring(start, end);
  }
}
