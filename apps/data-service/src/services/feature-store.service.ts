/**
 * Feature Store Service
 *
 * Provides API endpoints for feature serving and management.
 * Integrates with the feature store to serve features for ML models.
 */

import { FeatureStore, FeatureCatalog, FeatureRegistry, FeatureValidators } from '@insurance-lead-gen/core';
import {
  FeatureRequest,
  FeatureResponse,
  FeatureBatchRequest,
  FeatureBatchResponse,
  FeatureMetadata,
  FeatureSet,
  FeatureVersion,
  FeatureValue,
} from '@insurance-lead-gen/types';

import { logger } from '@insurance-lead-gen/core';
import { createPredefinedFeatures } from '@insurance-lead-gen/core';
import { createPredefinedValidationRules } from '@insurance-lead-gen/core';
import type { ExtractedData } from '@insurance-lead-gen/data';
import type { FeatureEngineeringResult } from '@insurance-lead-gen/data';

/**
 * Feature Store Service Class
 */
export class FeatureStoreService {
  private featureStore: FeatureStore;
  private featureCatalog: FeatureCatalog;
  private featureRegistry: FeatureRegistry;
  private featureValidators: FeatureValidators;
  private initialized: boolean = false;

  constructor() {
    // Initialize feature store
    this.featureStore = new FeatureStore();

    // Initialize validators
    this.featureValidators = new FeatureValidators();
    this.featureValidators.addRulesFromMap(createPredefinedValidationRules());

    // Initialize catalog
    this.featureCatalog = new FeatureCatalog(this.featureStore);

    // Initialize registry
    this.featureRegistry = new FeatureRegistry(this.featureStore, this.featureValidators);
  }

  /**
   * Initialize the feature store service
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.info('Feature store service already initialized');
      return;
    }

    try {
      logger.info('Initializing feature store service...');

      // Register predefined features
      const predefinedFeatures = createPredefinedFeatures();
      const { imported, failed, errors } = await this.featureRegistry.importFeatures(predefinedFeatures);

      logger.info(`Registered ${imported} predefined features, ${failed} failed`);
      if (errors.length > 0) {
        logger.warn('Feature import errors:', errors);
      }

      // Initialize feature sets
      this.createDefaultFeatureSets();

      // Build catalog index
      await this.featureCatalog.rebuildIndex();

      this.initialized = true;
      logger.info('Feature store service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize feature store service:', error);
      throw error;
    }
  }

  /**
   * Get features for a single entity
   */
  async getFeatures(request: FeatureRequest): Promise<FeatureResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.featureStore.getFeatures(request);
  }

  /**
   * Get features for multiple entities (batch)
   */
  async getBatchFeatures(request: FeatureBatchRequest): Promise<FeatureBatchResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.featureStore.getBatchFeatures(request);
  }

  /**
   * Get features from a feature set
   */
  async getFeaturesFromSet(
    featureSetName: string,
    entityId: string,
    entityName: string
  ): Promise<FeatureResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.featureStore.getFeaturesFromSet(featureSetName, entityId, entityName);
  }

  /**
   * Get features at a specific point in time
   */
  async getFeaturesAtTime(
    entityId: string,
    entityName: string,
    timestamp: Date,
    featureNames?: string[]
  ): Promise<FeatureResponse> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.featureStore.getFeaturesAtTime(entityId, entityName, timestamp, featureNames);
  }

  /**
   * Write features to the feature store
   */
  async writeFeatures(
    entityName: string,
    entityId: string,
    features: Record<string, FeatureValue>,
    storeType: 'online' | 'offline' | 'both' = 'both'
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    await this.featureStore.writeFeatures(entityName, entityId, features, storeType);
  }

  /**
   * Write features from feature engineering results
   */
  async writeFeatureEngineeringResults(
    results: FeatureEngineeringResult[],
    storeType: 'online' | 'offline' | 'both' = 'both'
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    for (const result of results) {
      const features: Record<string, FeatureValue> = {};

      // Behavioral features
      for (const [key, value] of Object.entries(result.behavioral)) {
        features[`behavioral_${key}`] = { value, timestamp: result.computedAt, version: '1.0.0' };
      }

      // Demographic features
      for (const [key, value] of Object.entries(result.demographic)) {
        features[`demographic_${key}`] = { value, timestamp: result.computedAt, version: '1.0.0' };
      }

      // Temporal features
      for (const [key, value] of Object.entries(result.temporal)) {
        features[`temporal_${key}`] = { value, timestamp: result.computedAt, version: '1.0.0' };
      }

      // NLP features
      for (const [key, value] of Object.entries(result.nlp)) {
        features[`nlp_${key}`] = { value, timestamp: result.computedAt, version: '1.0.0' };
      }

      // Competitive features
      for (const [key, value] of Object.entries(result.competitive)) {
        features[`competitive_${key}`] = { value, timestamp: result.computedAt, version: '1.0.0' };
      }

      await this.featureStore.writeFeatures('lead', result.leadId, features, storeType);
    }

    logger.info(`Wrote ${results.length} feature sets to ${storeType} store`);
  }

  /**
   * Get feature metadata
   */
  async getFeatureMetadata(featureName: string): Promise<FeatureMetadata | undefined> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.featureStore.getFeatureMetadata(featureName);
  }

  /**
   * List all features
   */
  async listFeatures(filter?: {
    category?: string;
    storeType?: 'online' | 'offline' | 'both';
    quality?: string;
  }): Promise<FeatureMetadata[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.featureStore.listFeatures(filter);
  }

  /**
   * Search features
   */
  async searchFeatures(filter: {
    category?: any;
    dataType?: any;
    quality?: any;
    storeType?: any;
    tags?: string[];
    searchQuery?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    features: FeatureMetadata[];
    total: number;
    page: number;
    pageSize: number;
    searchTime: number;
  }> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.featureCatalog.searchFeatures(filter);
  }

  /**
   * List features by category
   */
  async listFeaturesByCategory(category: any): Promise<FeatureMetadata[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.featureCatalog.listFeaturesByCategory(category);
  }

  /**
   * Get feature categories
   */
  getCategories(): any[] {
    return this.featureCatalog.getCategories();
  }

  /**
   * Get feature tags
   */
  async getTags(): Promise<string[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.featureCatalog.getTags();
  }

  /**
   * Get features by tag
   */
  async getFeaturesByTag(tag: string): Promise<FeatureMetadata[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.featureCatalog.getFeaturesByTag(tag);
  }

  /**
   * Get feature sets
   */
  getFeatureSets(): FeatureSet[] {
    return this.featureStore.listFeatureSets();
  }

  /**
   * Get feature set
   */
  getFeatureSet(name: string): FeatureSet | undefined {
    return this.featureStore.getFeatureSet(name);
  }

  /**
   * Create feature set
   */
  createFeatureSet(featureSet: FeatureSet): void {
    this.featureStore.createFeatureSet(featureSet);
    logger.info(`Created feature set: ${featureSet.name}`);
  }

  /**
   * Get feature versions
   */
  getFeatureVersions(featureName: string): FeatureVersion[] {
    return this.featureStore.getFeatureVersions(featureName);
  }

  /**
   * Get latest feature version
   */
  getLatestFeatureVersion(featureName: string): FeatureVersion | undefined {
    return this.featureStore.getLatestFeatureVersion(featureName);
  }

  /**
   * Get feature quality report
   */
  getFeatureQualityReport(featureName: string): any {
    return this.featureStore.generateQualityReport(featureName);
  }

  /**
   * Detect feature drift
   */
  async detectFeatureDrift(featureName: string): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.featureStore.detectFeatureDrift(featureName);
  }

  /**
   * Get feature statistics
   */
  getFeatureStatistics(featureName: string): any {
    return this.featureStore.getFeatureStatistics(featureName);
  }

  /**
   * Get store statistics
   */
  getStoreStatistics(): {
    onlineEntities: number;
    offlineEntities: number;
    totalFeatures: number;
    featureSets: number;
    totalMetadata: number;
    memoryUsage: {
      onlineFeatures: number;
      offlineFeatures: number;
      metadata: number;
    };
  } {
    return this.featureStore.getStatistics();
  }

  /**
   * Get catalog statistics
   */
  getCatalogStatistics(): {
    totalFeatures: number;
    totalCategories: number;
    totalTags: number;
    lastIndexed: Date;
    indexSize: number;
  } {
    return this.featureCatalog.getStatistics();
  }

  /**
   * Get registry statistics
   */
  getRegistryStatistics(): {
    totalFeatures: number;
    activeFeatures: number;
    deprecatedFeatures: number;
    totalVersions: number;
    featuresWithLineage: number;
    averageDependencies: number;
  } {
    return this.featureRegistry.getStatistics();
  }

  /**
   * Clean up expired features
   */
  async cleanupExpiredFeatures(): Promise<number> {
    if (!this.initialized) {
      await this.initialize();
    }

    return this.featureStore.cleanupExpiredFeatures();
  }

  /**
   * Create default feature sets
   */
  private createDefaultFeatureSets(): void {
    // Lead scoring feature set
    this.featureStore.createFeatureSet({
      name: 'lead_scoring',
      description: 'Features used for lead scoring models',
      features: [
        'email_opens_count',
        'email_clicks_count',
        'page_views_count',
        'time_on_site_avg',
        'recency_score',
        'frequency_score',
        'monetary_score',
        'sentiment_score',
        'product_fit_score',
        'quality_score',
      ],
      version: '1.0.0',
      createdAt: new Date(),
      tags: ['ml', 'lead_scoring'],
    });

    // Behavioral feature set
    this.featureStore.createFeatureSet({
      name: 'behavioral',
      description: 'All behavioral engagement features',
      features: Array.from(this.featureStore.listFeatures({ category: 'behavioral' } || []).map((f) => f.name)),
      version: '1.0.0',
      createdAt: new Date(),
      tags: ['behavioral', 'engagement'],
    });

    // Demographic feature set
    this.featureStore.createFeatureSet({
      name: 'demographic',
      description: 'All demographic and firmographic features',
      features: Array.from(this.featureStore.listFeatures({ category: 'demographic' } || []).map((f) => f.name)),
      version: '1.0.0',
      createdAt: new Date(),
      tags: ['demographic', 'firmographic'],
    });

    // Temporal feature set
    this.featureStore.createFeatureSet({
      name: 'temporal',
      description: 'All temporal and time-based features',
      features: Array.from(this.featureStore.listFeatures({ category: 'temporal' } || []).map((f) => f.name)),
      version: '1.0.0',
      createdAt: new Date(),
      tags: ['temporal', 'time'],
    });

    // NLP feature set
    this.featureStore.createFeatureSet({
      name: 'nlp',
      description: 'All NLP and text features',
      features: Array.from(this.featureStore.listFeatures({ category: 'nlp' } || []).map((f) => f.name)),
      version: '1.0.0',
      createdAt: new Date(),
      tags: ['nlp', 'text'],
    });

    // Competitive feature set
    this.featureStore.createFeatureSet({
      name: 'competitive',
      description: 'All competitive and market features',
      features: Array.from(this.featureStore.listFeatures({ category: 'competitive' } || []).map((f) => f.name)),
      version: '1.0.0',
      createdAt: new Date(),
      tags: ['competitive', 'market'],
    });

    // All features feature set
    this.featureStore.createFeatureSet({
      name: 'all',
      description: 'All available features',
      features: Array.from(this.featureStore.listFeatures() || []).map((f) => f.name),
      version: '1.0.0',
      createdAt: new Date(),
      tags: ['all'],
    });

    logger.info('Created default feature sets');
  }

  /**
   * Clear all features (for testing)
   */
  clear(): void {
    this.featureStore.clear();
    this.initialized = false;
  }
}

// Extend FeatureValidators to support adding rules from map
declare module '@insurance-lead-gen/core' {
  interface FeatureValidators {
    addRulesFromMap?(rules: Map<string, any[]>): void;
  }
}

// Add the method to the prototype
FeatureValidators.prototype.addRulesFromMap = function (rules: Map<string, any[]>): void {
  for (const [featureName, featureRules] of rules.entries()) {
    for (const rule of featureRules) {
      this.addRule(featureName, rule);
    }
  }
};
