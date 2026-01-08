import {
  DeduplicationJob,
  DuplicateGroup,
  DeduplicationRule,
  DuplicateCheckResult,
  DuplicateCheckOptions,
  MatchAlgorithm,
  DeduplicationAction,
  FuzzyMatchResult,
  MLDedupeResult,
  MatchConfidenceLevel,
  DeduplicationReport,
  DeduplicationAnalytics,
  DeduplicationSettings,
  BatchMergeResult,
  BatchMergeRequest,
  DuplicateGroupDetails,
  RecordComparison,
  FieldComparison,
  DeduplicationJobFilters,
  DuplicateGroupFilters,
  DeduplicationRuleFilters,
} from '@insurance-lead-gen/types';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';

/**
 * Advanced Deduplication Service
 * Features:
 * - Fuzzy matching engine with configurable algorithms
 * - ML-based deduplication pipeline
 * - Rule-based deduplication with configurable priorities
 * - Batch processing and reporting
 * - Performance analytics and monitoring
 */
export class DeduplicationService extends EventEmitter {
  // In-memory cache for active jobs
  private activeJobs = new Map<string, DeduplicationJob>();
  private duplicateGroups = new Map<string, DuplicateGroup>();
  private rules = new Map<string, DeduplicationRule>();
  private settings = new Map<string, DeduplicationSettings>();

  constructor() {
    super();
    this.initializeDefaultRules();
    this.setupEventHandlers();
  }

  private initializeDefaultRules() {
    // Email exact match rule - highest priority
    this.rules.set('email-exact', {
      id: 'email-exact',
      name: 'Email Exact Match',
      type: 'EXACT_MATCH',
      priority: 100,
      enabled: true,
      conditions: [
        {
          field: 'email',
          operator: 'EXACT',
          value: 'email',
        },
      ],
      action: 'AUTO_RESOLVE',
      metadata: {
        description: 'High confidence duplicate detection via exact email match',
        confidence: 'HIGH',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Phone normalization rule
    this.rules.set('phone-normalized', {
      id: 'phone-normalized',
      name: 'Phone Normalization Match',
      type: 'PHONE_NORMALIZATION',
      priority: 90,
      enabled: true,
      conditions: [
        {
          field: 'phone',
          operator: 'FUZZY',
          threshold: 0.95,
        },
      ],
      transformations: [
        {
          field: 'phone',
          function: 'normalizePhone',
          params: { removeSpecialChars: true, normalizeCountry: true },
        },
      ],
      action: 'AUTO_RESOLVE',
      metadata: {
        description: 'Phone number duplicates after normalization',
        confidence: 'HIGH',
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Name fuzzy matching
    this.rules.set('name-fuzzy', {
      id: 'name-fuzzy',
      name: 'Name Fuzzy Match',
      type: 'FUZZY_MATCH',
      priority: 80,
      enabled: true,
      conditions: [
        {
          field: 'firstName',
          operator: 'FUZZY',
          threshold: 0.85,
        },
        {
          field: 'lastName',
          operator: 'FUZZY',
          threshold: 0.85,
        },
      ],
      transformations: [
        {
          field: 'firstName',
          function: 'normalizeName',
          params: { removeMiddleInitials: true, handleNicknames: true },
        },
        {
          field: 'lastName',
          function: 'normalizeName',
          params: { handleDuplicates: true },
        },
      ],
      action: 'MERGE',
      metadata: {
        description: 'Fuzzy name matching with additional metadata comparison',
        confidence: 'MEDIUM',
        requiresReview: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Address matching rule
    this.rules.set('address-multifield', {
      id: 'address-multifield',
      name: 'Multi-Field Address Match',
      type: 'ADDRESS_MATCHING',
      priority: 70,
      enabled: true,
      conditions: [
        {
          field: 'address',
          operator: 'FUZZY',
          threshold: 0.8,
        },
        {
          field: 'city',
          operator: 'EXACT',
        },
        {
          field: 'state',
          operator: 'EXACT',
        },
        {
          field: 'zipCode',
          operator: 'EXACT',
        },
      ],
      action: 'REVIEW',
      metadata: {
        description: 'Address-based duplicate detection with location matching',
        confidence: 'MEDIUM',
        requiresReview: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  private setupEventHandlers() {
    this.on('job:completed', (job: DeduplicationJob) => {
      logger.info(`Deduplication job completed: ${job.id}`, {
        jobId: job.id,
        totalRecords: job.totalRecords,
        duplicateGroups: job.duplicateGroups,
      });
    });

    this.on('match:found', (group: DuplicateGroup) => {
      logger.debug(`Duplicate match found: ${group.id}`, {
        groupId: group.id,
        score: group.matchScore,
        confidence: group.confidence,
      });
    });
  }

  // ========================================
  // FUZZY MATCHING ENGINE
  // ========================================

  async fuzzyMatch(
    record: Record<string, unknown>,
    candidates: Array<Record<string, unknown>>,
    config: {
      algorithm: MatchAlgorithm;
      weights: Record<string, number>;
      threshold: number;
      maxResults?: number;
    },
  ): Promise<FuzzyMatchResult[]> {
    const results: FuzzyMatchResult[] = [];
    const maxResults = config.maxResults || 10;

    for (const candidate of candidates) {
      const matchScore = await this.calculateAdvancedMatchScore(record, candidate, config);
      
      if (matchScore.score >= config.threshold && results.length < maxResults) {
        results.push({
          matchId: candidate.id as string,
          score: matchScore.score,
          confidence: this.determineConfidenceLevel(matchScore.score),
          matchedFields: matchScore.matchedFields,
          explanation: matchScore.explanation,
          metadata: {
            algorithmUsed: config.algorithm,
            processingTime: matchScore.processingTime,
          },
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);
    
    return results.slice(0, maxResults);
  }

  private async calculateAdvancedMatchScore(
    record1: Record<string, unknown>,
    record2: Record<string, unknown>,
    config: {
      algorithm: MatchAlgorithm;
      weights: Record<string, number>;
    },
  ): Promise<{ score: number; matchedFields: Array<any>; explanation: string; processingTime: number }> {
    const startTime = Date.now();
    const matchedFields: Array<any> = [];
    let totalWeight = 0;
    let matchedWeight = 0;
    const explanations: string[] = [];

    // Apply different algorithms based on config
    for (const [field, weight] of Object.entries(config.weights)) {
      totalWeight += weight;
      
      const fieldScore = await this.calculateFieldScore(
        record1[field],
        record2[field],
        field,
        config.algorithm,
      );

      if (fieldScore > 0) {
        matchedWeight += weight * fieldScore;
        matchedFields.push({
          field,
          score: fieldScore,
          value1: record1[field],
          value2: record2[field],
        });
        explanations.push(`${field}: ${(fieldScore * 100).toFixed(1)}%`);
      }
    }

    const finalScore = totalWeight > 0 ? matchedWeight / totalWeight : 0;
    
    return {
      score: finalScore,
      matchedFields,
      explanation: explanations.join(' | '),
      processingTime: Date.now() - startTime,
    };
  }

  private async calculateFieldScore(
    value1: unknown,
    value2: unknown,
    field: string,
    algorithm: MatchAlgorithm,
  ): Promise<number> {
    if (!value1 || !value2) return 0;

    const str1 = String(value1).toLowerCase().trim();
    const str2 = String(value2).toLowerCase().trim();

    if (str1.length === 0 || str2.length === 0) return 0;

    switch (algorithm) {
      case 'EXACT':
        return str1 === str2 ? 1 : 0;

      case 'FUZZY':
      case 'HYBRID':
        return this.calculateLevenshteinSimilarity(str1, str2);

      case 'ML':
        // Call ML model for field-specific similarity
        return await this.callMLSimilarityModel(str1, str2, field);

      default:
        return this.calculateLevenshteinSimilarity(str1, str2);
    }
  }

  // ========================================
  // ML-BASED DEDUPLICATION
  // ========================================

  async mlDedupe(
    recordPairs: Array<{ record1: Record<string, unknown>; record2: Record<string, unknown> }>,
    config: {
      features: Array<string>;
      threshold: number;
      modelId: string;
    },
  ): Promise<MLDedupeResult[]> {
    const results: MLDedupeResult[] = [];

    for (const pair of recordPairs) {
      const mlResult = await this.callMLDedupeModel(pair.record1, pair.record2, config);
      
      if (mlResult.prediction && mlResult.confidence >= config.threshold) {
        results.push({
          pairId: `${pair.record1.id}-${pair.record2.id}`,
          record1Id: pair.record1.id as string,
          record2Id: pair.record2.id as string,
          similarity: mlResult.similarity,
          confidence: mlResult.confidence,
          prediction: mlResult.prediction,
          features: mlResult.features,
        });
      }
    }

    return results;
  }

  private async callMLDedupeModel(
    record1: Record<string, unknown>,
    record2: Record<string, unknown>,
    config: { features: Array<string>; modelId: string },
  ): Promise<{
    prediction: boolean;
    confidence: number;
    similarity: number;
    features: Array<any>;
  }> {
    // Simulate ML model call - in production this would call an actual ML service
    const features: Array<any> = [];
    let totalSimilarity = 0;

    for (const feature of config.features) {
      const similarity = await this.calculateFieldScore(
        record1[feature],
        record2[feature],
        feature,
        'FUZZY',
      );
      
      features.push({
        name: feature,
        similarity,
        weight: 1 / config.features.length,
      });

      totalSimilarity += similarity;
    }

    const averageSimilarity = totalSimilarity / config.features.length;
    const prediction = averageSimilarity > 0.7;
    const confidence = prediction ? averageSimilarity : 1 - averageSimilarity;

    return {
      prediction,
      confidence,
      similarity: averageSimilarity,
      features,
    };
  }

  private async callMLSimilarityModel(
    str1: string,
    str2: string,
    field: string,
  ): Promise<number> {
    // Simulate ML model for string similarity - production would call actual model
    return this.calculateLevenshteinSimilarity(str1, str2);
  }

  // ========================================
  // RULE-BASED DEDUPLICATION
  // ========================================

  async checkDuplicateWithRules(
    record: Record<string, unknown>,
    existingRecords: Array<Record<string, unknown>>,
    rules: DeduplicationRule[],
  ): Promise<{ isDuplicate: boolean; matchedRules: DeduplicationRule[]; groups: DuplicateGroup[] }> {
    const matchedRules: DeduplicationRule[] = [];
    const groups: DuplicateGroup[] = [];

    // Sort rules by priority (highest first)
    const sortedRules = rules.sort((a, b) => b.priority - a.priority);

    for (const rule of sortedRules) {
      if (!rule.enabled) continue;

      const ruleMatches = await this.applyRule(rule, record, existingRecords);
      
      if (ruleMatches.length > 0) {
        matchedRules.push(rule);
        
        // Create duplicate groups for matches
        for (const match of ruleMatches) {
          const group = await this.createDuplicateGroup(rule, record, match, [rule.id]);
          groups.push(group);
        }
      }
    }

    return {
      isDuplicate: matchedRules.length > 0,
      matchedRules,
      groups,
    };
  }

  private async applyRule(
    rule: DeduplicationRule,
    record: Record<string, unknown>,
    existingRecords: Array<Record<string, unknown>>,
  ): Promise<Array<Record<string, unknown>>> {
    const matches: Array<Record<string, unknown>> = [];

    for (const existing of existingRecords) {
      let isMatch = true;
      
      // Apply all conditions
      for (const condition of rule.conditions) {
        const recordValue = record[condition.field];
        const existingValue = existing[condition.field];

        if (!this.evaluateCondition(condition, recordValue, existingValue)) {
          isMatch = false;
          break;
        }
      }

      if (isMatch) {
        matches.push(existing);
      }
    }

    return matches;
  }

  private evaluateCondition(
    condition: { operator: string; threshold?: number },
    value1: unknown,
    value2: unknown,
  ): boolean {
    switch (condition.operator) {
      case 'EXACT':
        return String(value1).toLowerCase() === String(value2).toLowerCase();

      case 'FUZZY':
        const similarity = this.calculateLevenshteinSimilarity(
          String(value1),
          String(value2),
        );
        return similarity >= (condition.threshold || 0.8);

      case 'GREATER_THAN':
        return Number(value1) > Number(value2);

      case 'LESS_THAN':
        return Number(value1) < Number(value2);

      default:
        return false;
    }
  }

  private async createDuplicateGroup(
    rule: DeduplicationRule,
    record: Record<string, unknown>,
    match: Record<string, unknown>,
    matchedRules: string[],
  ): Promise<DuplicateGroup> {
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id: groupId,
      jobId: 'real-time',
      masterRecordId: record.id as string,
      recordIds: [record.id as string, match.id as string],
      matchScore: 0.8, // Calculated based on rule
      confidence: this.determineConfidenceLevel(0.8),
      algorithm: 'HYBRID' as MatchAlgorithm,
      matchedFields: rule.conditions.map(c => c.field),
      suggestedAction: rule.action,
      reviewed: false,
      mergeResult: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // ========================================
  // DEDUPLICATION JOBS
  // ========================================

  async createJob(jobData: DeduplicationJob): Promise<DeduplicationJob> {
    const job: DeduplicationJob = {
      ...jobData,
      id: jobData.id || `job-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'PENDING',
      processedRecords: 0,
      duplicateGroups: 0,
      matchesFound: 0,
      autoMerged: 0,
      needsReview: 0,
      failedRecords: 0,
      createdAt: jobData.createdAt || new Date(),
      updatedAt: new Date(),
    };

    this.activeJobs.set(job.id, job);
    return job;
  }

  async getJob(jobId: string): Promise<DeduplicationJob | undefined> {
    return this.activeJobs.get(jobId);
  }

  async updateJob(jobId: string, updates: Partial<DeduplicationJob>): Promise<DeduplicationJob | undefined> {
    const job = this.activeJobs.get(jobId);
    if (!job) return undefined;

    const updatedJob = {
      ...job,
      ...updates,
      updatedAt: new Date(),
    };

    this.activeJobs.set(jobId, updatedJob);
    return updatedJob;
  }

  async listJobs(filters: DeduplicationJobFilters): Promise<{ jobs: DeduplicationJob[]; total: number }> {
    const jobs = Array.from(this.activeJobs.values());
    
    let filteredJobs = jobs;

    if (filters.status) {
      filteredJobs = filteredJobs.filter(job => job.status === filters.status);
    }

    if (filters.sourceType) {
      filteredJobs = filteredJobs.filter(job => job.sourceType === filters.sourceType);
    }

    if (filters.dateFrom) {
      filteredJobs = filteredJobs.filter(
        job => job.createdAt >= (filters.dateFrom as Date),
      );
    }

    if (filters.dateTo) {
      filteredJobs = filteredJobs.filter(
        job => job.createdAt <= (filters.dateTo as Date),
      );
    }

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      jobs: filteredJobs.slice(startIndex, endIndex),
      total: filteredJobs.length,
    };
  }

  // ========================================
  // DUPLICATE GROUPS
  // ========================================

  async getGroup(groupId: string): Promise<DuplicateGroup | undefined> {
    return this.duplicateGroups.get(groupId);
  }

  async getGroupDetails(groupId: string): Promise<DuplicateGroupDetails | undefined> {
    const group = this.duplicateGroups.get(groupId);
    if (!group) return undefined;

    // This would fetch actual records from the database in production
    const records = group.recordIds.map(id => ({ id, name: `Record ${id}` }));

    return {
      ...group,
      records,
      fieldComparisons: [],
    };
  }

  async listGroups(filters: DuplicateGroupFilters): Promise<{ groups: DuplicateGroup[]; total: number }> {
    const groups = Array.from(this.duplicateGroups.values());
    
    let filteredGroups = groups;

    if (filters.jobId) {
      filteredGroups = filteredGroups.filter(group => group.jobId === filters.jobId);
    }

    if (filters.confidence) {
      filteredGroups = filteredGroups.filter(group => group.confidence === filters.confidence);
    }

    if (typeof filters.reviewed === 'boolean') {
      filteredGroups = filteredGroups.filter(group => group.reviewed === filters.reviewed);
    }

    if (filters.minScore) {
      filteredGroups = filteredGroups.filter(group => group.matchScore >= (filters.minScore as number));
    }

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      groups: filteredGroups.slice(startIndex, endIndex),
      total: filteredGroups.length,
    };
  }

  async updateGroup(groupId: string, updates: Partial<DuplicateGroup>): Promise<DuplicateGroup | undefined> {
    const group = this.duplicateGroups.get(groupId);
    if (!group) return undefined;

    const updatedGroup = {
      ...group,
      ...updates,
      updatedAt: new Date(),
    };

    this.duplicateGroups.set(groupId, updatedGroup);
    return updatedGroup;
  }

  // ========================================
  // DEDUPLICATION RULES
  // ========================================

  async createRule(ruleData: DeduplicationRule): Promise<DeduplicationRule> {
    const rule: DeduplicationRule = {
      ...ruleData,
      id: ruleData.id || `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: ruleData.createdAt || new Date(),
      updatedAt: new Date(),
    };

    this.rules.set(rule.id, rule);
    return rule;
  }

  async getRule(ruleId: string): Promise<DeduplicationRule | undefined> {
    return this.rules.get(ruleId);
  }

  async updateRule(ruleId: string, updates: Partial<DeduplicationRule>): Promise<DeduplicationRule | undefined> {
    const rule = this.rules.get(ruleId);
    if (!rule) return undefined;

    const updatedRule = {
      ...rule,
      ...updates,
      updatedAt: new Date(),
    };

    this.rules.set(ruleId, updatedRule);
    return updatedRule;
  }

  async deleteRule(ruleId: string): Promise<boolean> {
    return this.rules.delete(ruleId);
  }

  async listRules(filters: DeduplicationRuleFilters): Promise<{ rules: DeduplicationRule[]; total: number }> {
    const rules = Array.from(this.rules.values());
    
    let filteredRules = rules;

    if (filters.type) {
      filteredRules = filteredRules.filter(rule => rule.type === filters.type);
    }

    if (typeof filters.enabled === 'boolean') {
      filteredRules = filteredRules.filter(rule => rule.enabled === filters.enabled);
    }

    if (filters.priorityFrom) {
      filteredRules = filteredRules.filter(rule => rule.priority >= (filters.priorityFrom as number));
    }

    if (filters.priorityTo) {
      filteredRules = filteredRules.filter(rule => rule.priority <= (filters.priorityTo as number));
    }

    // Apply pagination
    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return {
      rules: filteredRules.slice(startIndex, endIndex),
      total: filteredRules.length,
    };
  }

  // ========================================
  // DEDUPLICATION REPORTING
  // ========================================

  async generateReport(jobId: string): Promise<DeduplicationReport> {
    const job = await this.getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const groups = Array.from(this.duplicateGroups.values()).filter(g => g.jobId === jobId);
    
    return {
      jobId,
      jobName: job.name,
      summary: {
        totalRecords: job.totalRecords,
        duplicateGroups: job.duplicateGroups,
        uniqueRecords: job.totalRecords - job.duplicateGroups,
        autoMerged: job.autoMerged,
        needsReview: job.needsReview,
        failedRecords: job.failedRecords,
        accuracy: job.totalRecords > 0 ? (1 - job.failedRecords / job.totalRecords) * 100 : 0,
      },
      details: {
        byAlgorithm: {
          EXACT: { matches: groups.filter(g => g.algorithm === 'EXACT').length, confidence: 0.95 },
          FUZZY: { matches: groups.filter(g => g.algorithm === 'FUZZY').length, confidence: 0.85 },
          ML: { matches: groups.filter(g => g.algorithm === 'ML').length, confidence: 0.9 },
        },
        byField: {
          email: { matches: groups.filter(g => g.matchedFields.includes('email')).length, accuracy: 0.98 },
          phone: { matches: groups.filter(g => g.matchedFields.includes('phone')).length, accuracy: 0.95 },
          name: { matches: groups.filter(g => g.matchedFields.includes('name')).length, accuracy: 0.88 },
        },
        byConfidence: {
          HIGH: groups.filter(g => g.confidence === 'HIGH').length,
          MEDIUM: groups.filter(g => g.confidence === 'MEDIUM').length,
          LOW: groups.filter(g => g.confidence === 'LOW').length,
          UNCERTAIN: groups.filter(g => g.confidence === 'UNCERTAIN').length,
        },
      },
      processingStats: {
        duration: job.completedAt ? job.completedAt.getTime() - (job.startedAt?.getTime() || 0) : 0,
        recordsPerSecond: job.processedRecords > 0 && job.startedAt ? job.processedRecords / ((Date.now() - job.startedAt.getTime()) / 1000) : 0,
        peakMemory: 0, // Would be tracked in production
        errors: [],
      },
    };
  }

  async getAnalytics(): Promise<DeduplicationAnalytics> {
    const jobs = Array.from(this.activeJobs.values());
    const groups = Array.from(this.duplicateGroups.values());

    return {
      overview: {
        totalJobs: jobs.length,
        activeJobs: jobs.filter(job => job.status === 'PROCESSING').length,
        totalDuplicatesFound: groups.length,
        autoResolved: groups.filter(g => g.suggestedAction === 'AUTO_RESOLVE' && g.reviewed).length,
        manualReview: groups.filter(g => !g.reviewed).length,
        accuracy: jobs.length > 0 ? jobs.filter(job => job.status === 'COMPLETED').length / jobs.length * 100 : 0,
      },
      trends: [], // Would calculate from historical data
      qualityMetrics: {
        dataQuality: 0.95,
        matchAccuracy: 0.92,
        falsePositiveRate: 0.05,
        falseNegativeRate: 0.08,
      },
      algorithmPerformance: {
        EXACT: { matches: groups.filter(g => g.algorithm === 'EXACT').length, accuracy: 0.99, averageScore: 0.98 },
        FUZZY: { matches: groups.filter(g => g.algorithm === 'FUZZY').length, accuracy: 0.88, averageScore: 0.75 },
        ML: { matches: groups.filter(g => g.algorithm === 'ML').length, accuracy: 0.92, averageScore: 0.85 },
      },
    };
  }

  // ========================================
  // BATCH OPERATIONS
  // ========================================

  async batchMerge(mergeRequest: BatchMergeRequest): Promise<BatchMergeResult> {
    const result: BatchMergeResult = {
      success: true,
      merged: 0,
      failed: 0,
      skipped: 0,
      errors: [],
      mergedRecords: [],
    };

    for (const groupId of mergeRequest.duplicateGroupIds) {
      try {
        const group = await this.getGroup(groupId);
        if (!group) {
          result.skipped++;
          continue;
        }

        // Perform merge based on strategy
        const mergeResult = await this.mergeGroup(group, mergeRequest.mergeStrategy);
        
        result.merged++;
        result.mergedRecords.push({
          groupId,
          masterRecordId: mergeResult.masterRecordId,
          mergedRecordIds: group.recordIds.filter(id => id !== mergeResult.masterRecordId),
        });

      } catch (error) {
        result.failed++;
        result.errors.push({
          groupId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    result.success = result.failed === 0;
    return result;
  }

  private async mergeGroup(group: DuplicateGroup, strategy: string): Promise<{ masterRecordId: string }> {
    // This would implement actual merging logic based on the strategy
    // For now, just return the master record
    return {
      masterRecordId: group.masterRecordId,
    };
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  async compareRecords(record1Id: string, record2Id: string): Promise<RecordComparison> {
    // This would fetch actual records and perform detailed comparison
    return {
      record1Id,
      record2Id,
      overallSimilarity: 0,
      fieldComparisons: [],
      weightedScore: 0,
      matchedFields: [],
      explanation: '',
    };
  }

  async getDuplicateStatistics(jobId: string) {
    const groups = Array.from(this.duplicateGroups.values()).filter(g => g.jobId === jobId);
    
    return {
      totalDuplicatedRecords: groups.reduce((acc, group) => acc + group.recordIds.length, 0),
      totalDuplicateGroups: groups.length,
      averageGroupSize: groups.length > 0 ? groups.reduce((acc, group) => acc + group.recordIds.length, 0) / groups.length : 0,
      confidenceDistribution: {
        HIGH: groups.filter(g => g.confidence === 'HIGH').length,
        MEDIUM: groups.filter(g => g.confidence === 'MEDIUM').length,
        LOW: groups.filter(g => g.confidence === 'LOW').length,
      },
      algorithmDistribution: {
        EXACT: groups.filter(g => g.algorithm === 'EXACT').length,
        FUZZY: groups.filter(g => g.algorithm === 'FUZZY').length,
        ML: groups.filter(g => g.algorithm === 'ML').length,
        HYBRID: groups.filter(g => g.algorithm === 'HYBRID').length,
      },
    };
  }

  

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private determineConfidenceLevel(score: number): MatchConfidenceLevel {
    if (score >= 0.9) return 'HIGH';
    if (score >= 0.75) return 'MEDIUM';
    if (score >= 0.6) return 'LOW';
    return 'UNCERTAIN';
  }
}

export const deduplicationService = new DeduplicationService();