import { logger } from '../logger.js';
import { ConversationAnalysisService } from './conversation-analysis.service.js';
import type {
  AutomatedNote,
  ActionItem,
  QualityScore,
  Suggestion,
} from '@insurance-lead-gen/types';

interface ValidationResult {
  isValid: boolean;
  validEntityCount: number;
  lowConfidenceEntityCount: number;
  overallConfidence: number;
  issues: Array<{
    type: string;
    value: string;
    confidence: number;
    message: string;
  }>;
}

interface ConfidenceMetrics {
  averageConfidence: number;
  minConfidence: number;
  maxConfidence: number;
  confidenceDistribution: {
    high: number;
    medium: number;
    low: number;
  };
}

interface LinkedEntity {
  entityId: string;
  linkedMasterId: string;
  normalizedValue: string;
  confidence: number;
}

/**
 * Automated Note Generation Service
 * Generates AI-powered notes from conversations and documents
 */
export class AutomatedNoteGenerationService {
  private conversationAnalysisService: ConversationAnalysisService;
  private summarizationModel: string;

  constructor(config?: { summarizationModel?: string; conversationAnalysisService?: ConversationAnalysisService }) {
    this.summarizationModel = config?.summarizationModel || 'bart-summarizer';
    this.conversationAnalysisService =
      config?.conversationAnalysisService || new ConversationAnalysisService();
  }

  /**
   * Generate automated note from conversation
   */
  async generateNoteFromConversation(
    conversationId: string,
    conversationText: string,
    customerId: string,
    metadata?: { leadId?: string; claimId?: string }
  ): Promise<AutomatedNote> {
    const startTime = Date.now();

    try {
      logger.info('Generating automated note from conversation', {
        conversationId,
        customerId,
        textLength: conversationText.length,
      });

      // Analyze conversation first
      const analysis = await this.conversationAnalysisService.analyzeConversation(
        conversationId,
        conversationText
      );

      // Generate note components
      const noteSummary = await this.summarizeConversation(conversationText);
      const issuesIdentified = this._extractIssuesFromAnalysis(analysis);
      const productsDiscussed = this._extractProductsFromConversation(conversationText);
      const actionItems = await this.conversationAnalysisService.identifyActionItems(conversationText);
      const followUpInfo = this._determineFollowUp(analysis, actionItems);

      // Calculate note quality
      const noteQualityScore = await this._calculateNoteQuality({
        noteSummary,
        issuesIdentified,
        actionItems,
        analysis,
      });

      const processingTime = Date.now() - startTime;

      const automatedNote: AutomatedNote = {
        id: `note_${Math.random().toString(36).substring(7)}`,
        conversationId,
        customerId,
        leadId: metadata?.leadId,
        claimId: metadata?.claimId,
        noteSummary,
        customerSentiment: analysis.overallSentiment,
        issuesIdentified,
        productsDiscussed,
        actionItems,
        followUpRequired: followUpInfo.required,
        followUpType: followUpInfo.type,
        followUpDueDate: followUpInfo.dueDate,
        noteQualityScore,
        createdBy: 'ai_system',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('Automated note generated successfully', {
        conversationId,
        qualityScore: noteQualityScore,
        followUpRequired: followUpInfo.required,
        processingTime,
      });

      return automatedNote;
    } catch (error) {
      logger.error('Failed to generate automated note from conversation', {
        error,
        conversationId,
      });
      throw new Error(`Automated note generation failed: ${error.message}`);
    }
  }

  /**
   * Generate note from document
   */
  async generateNoteFromDocument(
    documentId: string,
    documentText: string,
    customerId: string,
    metadata?: { leadId?: string; claimId?: string }
  ): Promise<AutomatedNote> {
    const startTime = Date.now();

    try {
      logger.info('Generating automated note from document', {
        documentId,
        customerId,
        textLength: documentText.length,
      });

      // Generate note components from document
      const noteSummary = await this.summarizeDocument(documentText);
      const issuesIdentified = this._extractIssuesFromDocument(documentText);
      const actionItems = this._extractActionItemsFromDocument(documentText);

      // Determine if follow-up is needed
      const followUpInfo = this._determineDocumentFollowUp(issuesIdentified, actionItems);

      // Calculate note quality
      const noteQualityScore = await this._calculateDocumentNoteQuality({
        noteSummary,
        issuesIdentified,
        actionItems,
      });

      const processingTime = Date.now() - startTime;

      const automatedNote: AutomatedNote = {
        id: `note_${Math.random().toString(36).substring(7)}`,
        customerId,
        leadId: metadata?.leadId,
        claimId: metadata?.claimId,
        noteSummary,
        issuesIdentified,
        actionItems,
        followUpRequired: followUpInfo.required,
        followUpType: followUpInfo.type,
        followUpDueDate: followUpInfo.dueDate,
        noteQualityScore,
        createdBy: 'ai_system',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      logger.info('Automated note generated from document successfully', {
        documentId,
        qualityScore: noteQualityScore,
        followUpRequired: followUpInfo.required,
        processingTime,
      });

      return automatedNote;
    } catch (error) {
      logger.error('Failed to generate automated note from document', {
        error,
        documentId,
      });
      throw new Error(`Automated note generation from document failed: ${error.message}`);
    }
  }

  /**
   * Summarize conversation text
   */
  async summarizeConversation(conversationText: string): Promise<string> {
    try {
      logger.debug('Summarizing conversation', { textLength: conversationText.length });

      // Simulate summarization (in production, use BART/T5 transformer)
      const summary = await this._runSummarizationModel(conversationText, 'conversation');

      logger.debug('Conversation summarized', {
        originalLength: conversationText.length,
        summaryLength: summary.length,
      });

      return summary;
    } catch (error) {
      logger.error('Failed to summarize conversation', { error });
      throw new Error(`Conversation summarization failed: ${error.message}`);
    }
  }

  /**
   * Summarize document text
   */
  async summarizeDocument(documentText: string): Promise<string> {
    try {
      logger.debug('Summarizing document', { textLength: documentText.length });

      // Simulate document summarization
      const summary = await this._runSummarizationModel(documentText, 'document');

      logger.debug('Document summarized', {
        originalLength: documentText.length,
        summaryLength: summary.length,
      });

      return summary;
    } catch (error) {
      logger.error('Failed to summarize document', { error });
      throw new Error(`Document summarization failed: ${error.message}`);
    }
  }

  /**
   * Extract action items for note
   */
  async extractActionItems(conversationId: string, conversationText: string): Promise<ActionItem[]> {
    try {
      logger.debug('Extracting action items', { conversationId });

      return await this.conversationAnalysisService.identifyActionItems(conversationText);
    } catch (error) {
      logger.error('Failed to extract action items', { error, conversationId });
      throw new Error(`Action item extraction failed: ${error.message}`);
    }
  }

  /**
   * Quality check note
   */
  async validateNoteQuality(noteId: string, noteContent: AutomatedNote): Promise<QualityScore> {
    try {
      logger.info('Validating note quality', { noteId });

      const completenessScore = this._assessCompleteness(noteContent);
      const clarityScore = this._assessClarity(noteContent);
      const actionabilityScore = this._assessActionability(noteContent);

      const overallScore = (completenessScore + clarityScore + actionabilityScore) / 3;

      const suggestions = this._generateQualitySuggestions(noteContent, {
        completenessScore,
        clarityScore,
        actionabilityScore,
      });

      const qualityScore: QualityScore = {
        noteId,
        overallScore,
        completenessScore,
        clarityScore,
        actionabilityScore,
        suggestions,
      };

      logger.info('Note quality validated', {
        noteId,
        overallScore,
        suggestionCount: suggestions.length,
      });

      return qualityScore;
    } catch (error) {
      logger.error('Failed to validate note quality', { error, noteId });
      throw new Error(`Note quality validation failed: ${error.message}`);
    }
  }

  /**
   * Get suggestions for note improvement
   */
  async getSuggestions(noteId: string, noteContent: AutomatedNote): Promise<Suggestion[]> {
    try {
      logger.debug('Getting suggestions for note improvement', { noteId });

      const quality = await this.validateNoteQuality(noteId, noteContent);

      return quality.suggestions;
    } catch (error) {
      logger.error('Failed to get suggestions', { error, noteId });
      throw new Error(`Suggestion generation failed: ${error.message}`);
    }
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  private async _runSummarizationModel(
    text: string,
    type: 'conversation' | 'document'
  ): Promise<string> {
    // Simulate BART/T5 summarization model
    // In production, this would use actual transformer models

    const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0);

    if (type === 'conversation') {
      // Extract key points from conversation
      const keySentences = sentences.slice(0, 3);
      return `Customer interaction summary: ${keySentences.join('. ')}. Main topics discussed: coverage inquiry, policy questions. Customer sentiment was analyzed and recorded.`;
    } else {
      // Extract key points from document
      const keySentences = sentences.slice(0, 5);
      return `Document summary: ${keySentences.join('. ')}. Key information extracted and processed.`;
    }
  }

  private _extractIssuesFromAnalysis(analysis: any): Array<{ issue: string; priority: string }> {
    const issues: Array<{ issue: string; priority: string }> = [];

    if (analysis.issuesRaised) {
      analysis.issuesRaised.forEach((issue: string) => {
        let priority = 'medium';
        if (issue.toLowerCase().includes('angry') || issue.toLowerCase().includes('frustrat')) {
          priority = 'high';
        }
        issues.push({ issue, priority });
      });
    }

    if (analysis.escalationFlag) {
      issues.push({ issue: 'Escalation flagged - requires immediate attention', priority: 'high' });
    }

    return issues;
  }

  private _extractIssuesFromDocument(text: string): Array<{ issue: string; priority: string }> {
    const issues: Array<{ issue: string; priority: string }> = [];

    // Simulate issue extraction from document
    if (text.toLowerCase().includes('incomplete') || text.toLowerCase().includes('missing')) {
      issues.push({ issue: 'Document may be incomplete', priority: 'medium' });
    }

    if (text.toLowerCase().includes('expired') || text.toLowerCase().includes('invalid')) {
      issues.push({ issue: 'Document may have expired or invalid information', priority: 'high' });
    }

    return issues;
  }

  private _extractProductsFromConversation(text: string): Array<{ product: string; action: string }> {
    const products: Array<{ product: string; action: string }> = [];

    const productKeywords = {
      'auto insurance': 'quote requested',
      'home insurance': 'inquiry made',
      'life insurance': 'information requested',
      'health insurance': 'coverage discussed',
      'commercial insurance': 'details requested',
    };

    for (const [product, action] of Object.entries(productKeywords)) {
      if (text.toLowerCase().includes(product)) {
        products.push({ product, action });
      }
    }

    return products;
  }

  private _extractActionItemsFromDocument(text: string): ActionItem[] {
    const actionItems: ActionItem[] = [];

    // Simulate action item extraction from document
    const actionPatterns = [
      /(?:review|verify)\s+(.+?)(?:\.|$)/gi,
      /(?:follow up|follow-up)\s+(.+?)(?:\.|$)/gi,
      /(?:contact|call)\s+(.+?)(?:\.|$)/gi,
    ];

    actionPatterns.forEach((pattern) => {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        actionItems.push({
          id: `action_${Math.random().toString(36).substring(7)}`,
          description: match[0],
          priority: 'medium',
          status: 'open',
        });
      }
    });

    return actionItems.slice(0, 3);
  }

  private _determineFollowUp(
    analysis: any,
    actionItems: ActionItem[]
  ): { required: boolean; type?: string; dueDate?: Date } {
    let required = false;
    let type: string | undefined;
    let dueDate: Date | undefined;

    // Check for escalation
    if (analysis.escalationFlag) {
      required = true;
      type = 'call';
      dueDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
      return { required, type, dueDate };
    }

    // Check for issues
    if (analysis.issuesRaised && analysis.issuesRaised.length > 0) {
      required = true;
      type = 'email';
      dueDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
      return { required, type, dueDate };
    }

    // Check for action items
    if (actionItems.length > 0) {
      required = true;
      type = actionItems[0].priority === 'urgent' ? 'call' : 'email';
      dueDate =
        actionItems[0].priority === 'urgent'
          ? new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }

    return { required, type, dueDate };
  }

  private _determineDocumentFollowUp(
    issues: Array<{ issue: string; priority: string }>,
    actionItems: ActionItem[]
  ): { required: boolean; type?: string; dueDate?: Date } {
    let required = false;
    let type: string | undefined;
    let dueDate: Date | undefined;

    // Check for high priority issues
    const highPriorityIssues = issues.filter((i) => i.priority === 'high');
    if (highPriorityIssues.length > 0) {
      required = true;
      type = 'document_request';
      dueDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days
      return { required, type, dueDate };
    }

    // Check for any issues
    if (issues.length > 0) {
      required = true;
      type = 'email';
      dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days
      return { required, type, dueDate };
    }

    // Check for action items
    if (actionItems.length > 0) {
      required = true;
      type = 'email';
      dueDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000); // 5 days
    }

    return { required, type, dueDate };
  }

  private async _calculateNoteQuality(data: {
    noteSummary: string;
    issuesIdentified: Array<{ issue: string; priority: string }>;
    actionItems: ActionItem[];
    analysis: any;
  }): Promise<number> {
    let score = 0;

    // Summary quality (40%)
    const summaryLength = data.noteSummary.length;
    if (summaryLength > 50 && summaryLength < 500) {
      score += 0.4 * (summaryLength > 100 ? 0.9 : 0.7);
    }

    // Issues identified (20%)
    if (data.issuesIdentified.length > 0) {
      score += 0.2 * 0.8;
    }

    // Action items (20%)
    if (data.actionItems.length > 0) {
      score += 0.2 * (data.actionItems.length >= 2 ? 0.9 : 0.7);
    }

    // Sentiment analysis captured (20%)
    if (data.analysis.overallSentiment) {
      score += 0.2 * 0.9;
    }

    return Math.min(1, score);
  }

  private async _calculateDocumentNoteQuality(data: {
    noteSummary: string;
    issuesIdentified: Array<{ issue: string; priority: string }>;
    actionItems: ActionItem[];
  }): Promise<number> {
    let score = 0;

    // Summary quality (50%)
    const summaryLength = data.noteSummary.length;
    if (summaryLength > 30 && summaryLength < 300) {
      score += 0.5 * 0.85;
    }

    // Issues identified (25%)
    if (data.issuesIdentified.length > 0) {
      score += 0.25 * 0.8;
    }

    // Action items (25%)
    if (data.actionItems.length > 0) {
      score += 0.25 * 0.8;
    }

    return Math.min(1, score);
  }

  private _assessCompleteness(note: AutomatedNote): number {
    let score = 0;
    let maxScore = 0;

    // Summary present
    maxScore += 1;
    if (note.noteSummary && note.noteSummary.length > 20) {
      score += 1;
    }

    // Sentiment captured
    maxScore += 1;
    if (note.customerSentiment) {
      score += 1;
    }

    // Issues identified
    maxScore += 1;
    if (note.issuesIdentified && note.issuesIdentified.length > 0) {
      score += 1;
    }

    // Action items present
    maxScore += 1;
    if (note.actionItems && note.actionItems.length > 0) {
      score += 1;
    }

    // Follow-up info complete
    if (note.followUpRequired) {
      maxScore += 1;
      if (note.followUpType && note.followUpDueDate) {
        score += 1;
      }
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  private _assessClarity(note: AutomatedNote): number {
    let score = 0;
    let maxScore = 0;

    // Summary is clear and concise
    maxScore += 1;
    if (note.noteSummary && note.noteSummary.length < 500) {
      score += 1;
    }

    // Action items have clear descriptions
    maxScore += 1;
    if (
      note.actionItems &&
      note.actionItems.every((a) => a.description && a.description.length < 200)
    ) {
      score += 1;
    }

    // Issues have clear priorities
    maxScore += 1;
    if (
      note.issuesIdentified &&
      note.issuesIdentified.every((i) => i.issue && i.priority)
    ) {
      score += 1;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  private _assessActionability(note: AutomatedNote): number {
    let score = 0;
    let maxScore = 0;

    // Has action items
    maxScore += 1;
    if (note.actionItems && note.actionItems.length > 0) {
      score += 1;
    }

    // Action items have owners
    maxScore += 1;
    if (note.actionItems && note.actionItems.some((a) => a.owner)) {
      score += 1;
    }

    // Action items have due dates
    maxScore += 1;
    if (note.actionItems && note.actionItems.some((a) => a.dueDate)) {
      score += 1;
    }

    // Follow-up is well-defined
    maxScore += 1;
    if (note.followUpRequired && note.followUpType && note.followUpDueDate) {
      score += 1;
    }

    return maxScore > 0 ? score / maxScore : 0;
  }

  private _generateQualitySuggestions(
    note: AutomatedNote,
    scores: { completenessScore: number; clarityScore: number; actionabilityScore: number }
  ): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Completeness suggestions
    if (scores.completenessScore < 0.8) {
      if (!note.noteSummary || note.noteSummary.length < 20) {
        suggestions.push({
          type: 'completeness',
          description: 'Add a more detailed summary of the interaction',
          priority: 'high',
        });
      }
      if (!note.customerSentiment) {
        suggestions.push({
          type: 'completeness',
          description: 'Include customer sentiment analysis',
          priority: 'medium',
        });
      }
      if (!note.actionItems || note.actionItems.length === 0) {
        suggestions.push({
          type: 'completeness',
          description: 'Identify and add action items from the conversation',
          priority: 'medium',
        });
      }
    }

    // Clarity suggestions
    if (scores.clarityScore < 0.8) {
      if (note.noteSummary && note.noteSummary.length > 500) {
        suggestions.push({
          type: 'clarity',
          description: 'Shorten the summary to improve readability',
          priority: 'medium',
        });
      }
    }

    // Actionability suggestions
    if (scores.actionabilityScore < 0.8) {
      if (note.actionItems && !note.actionItems.some((a) => a.owner)) {
        suggestions.push({
          type: 'actionability',
          description: 'Assign owners to action items',
          priority: 'high',
        });
      }
      if (note.actionItems && !note.actionItems.some((a) => a.dueDate)) {
        suggestions.push({
          type: 'actionability',
          description: 'Add due dates to action items',
          priority: 'high',
        });
      }
      if (note.followUpRequired && (!note.followUpType || !note.followUpDueDate)) {
        suggestions.push({
          type: 'actionability',
          description: 'Specify follow-up type and due date',
          priority: 'high',
        });
      }
    }

    return suggestions;
  }
}
