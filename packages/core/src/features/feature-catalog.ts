/**
 * Feature Catalog
 *
 * Provides discovery and documentation for all features in the feature store.
 * Allows searching, filtering, and browsing features by category, tags, and metadata.
 */

import type {
  FeatureMetadata,
  FeatureSet,
  FeatureType,
  FeatureDataType,
  FeatureQualityLevel,
  FeatureStoreType,
  BehavioralFeatures,
  DemographicFeatures,
  TemporalFeatures,
  NLPFeatures,
  CompetitiveFeatures,
} from '@insurance-lead-gen/types';

import type { FeatureStore } from './feature-store.js';

/**
 * Feature Catalog Configuration
 */
export interface FeatureCatalogConfig {
  autoIndex: boolean;
  indexInterval: number; // In seconds
  searchEnabled: boolean;
}

/**
 * Search filter for feature catalog
 */
export interface FeatureSearchFilter {
  category?: FeatureType;
  dataType?: FeatureDataType;
  quality?: FeatureQualityLevel;
  storeType?: FeatureStoreType;
  tags?: string[];
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

/**
 * Feature search result
 */
export interface FeatureSearchResult {
  features: FeatureMetadata[];
  total: number;
  page: number;
  pageSize: number;
  searchTime: number;
}

/**
 * Feature Catalog Class
 */
export class FeatureCatalog {
  private config: FeatureCatalogConfig;
  private featureStore: FeatureStore;
  private index: Map<string, FeatureMetadata>;
  private categoryIndex: Map<FeatureType, Set<string>>;
  private tagIndex: Map<string, Set<string>>;
  private lastIndexed: Date;

  constructor(featureStore: FeatureStore, config?: Partial<FeatureCatalogConfig>) {
    this.featureStore = featureStore;
    this.config = {
      autoIndex: true,
      indexInterval: 300, // 5 minutes
      searchEnabled: true,
      ...config,
    };

    this.index = new Map();
    this.categoryIndex = new Map();
    this.tagIndex = new Map();
    this.lastIndexed = new Date();

    if (this.config.autoIndex) {
      this.startAutoIndexing();
    }
  }

  /**
   * Get feature by name
   */
  async getFeature(name: string): Promise<FeatureMetadata | undefined> {
    await this.ensureIndexed();
    return this.index.get(name);
  }

  /**
   * Search features with filters
   */
  async searchFeatures(filter: FeatureSearchFilter): Promise<FeatureSearchResult> {
    const startTime = Date.now();
    await this.ensureIndexed();

    let features = Array.from(this.index.values());

    // Filter by category
    if (filter.category) {
      const categoryFeatures = this.categoryIndex.get(filter.category);
      if (categoryFeatures) {
        features = features.filter((f) => categoryFeatures.has(f.name));
      }
    }

    // Filter by data type
    if (filter.dataType) {
      features = features.filter((f) => f.dataType === filter.dataType);
    }

    // Filter by quality
    if (filter.quality) {
      features = features.filter((f) => f.quality === filter.quality);
    }

    // Filter by store type
    if (filter.storeType) {
      features = features.filter(
        (f) => f.storeType === filter.storeType || f.storeType === 'both'
      );
    }

    // Filter by tags
    if (filter.tags && filter.tags.length > 0) {
      features = features.filter((f) =>
        filter.tags!.some((tag) => f.tags.includes(tag))
      );
    }

    // Search query
    if (filter.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      features = features.filter(
        (f) =>
          f.name.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query) ||
          f.category.toLowerCase().includes(query)
      );
    }

    const total = features.length;

    // Pagination
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;
    const page = Math.floor(offset / limit) + 1;

    features = features.slice(offset, offset + limit);

    return {
      features,
      total,
      page,
      pageSize: limit,
      searchTime: Date.now() - startTime,
    };
  }

  /**
   * List features by category
   */
  async listFeaturesByCategory(category: FeatureType): Promise<FeatureMetadata[]> {
    await this.ensureIndexed();

    const categoryFeatures = this.categoryIndex.get(category);
    if (!categoryFeatures) {
      return [];
    }

    return Array.from(categoryFeatures)
      .map((name) => this.index.get(name))
      .filter((f) => f !== undefined) as FeatureMetadata[];
  }

  /**
   * List all feature categories
   */
  getCategories(): FeatureType[] {
    return Array.from(this.categoryIndex.keys());
  }

  /**
   * Get feature tags
   */
  async getTags(): Promise<string[]> {
    await this.ensureIndexed();
    return Array.from(this.tagIndex.keys()).sort();
  }

  /**
   * Get features by tag
   */
  async getFeaturesByTag(tag: string): Promise<FeatureMetadata[]> {
    await this.ensureIndexed();

    const taggedFeatures = this.tagIndex.get(tag);
    if (!taggedFeatures) {
      return [];
    }

    return Array.from(taggedFeatures)
      .map((name) => this.index.get(name))
      .filter((f) => f !== undefined) as FeatureMetadata[];
  }

  /**
   * Get feature statistics by category
   */
  async getCategoryStatistics(): Promise<
    Map<FeatureType, { count: number; avgQuality: number }>
  > {
    await this.ensureIndexed();

    const stats = new Map<FeatureType, { count: number; sumQuality: number }>();

    for (const [category, features] of this.categoryIndex.entries()) {
      let count = 0;
      let sumQuality = 0;

      for (const featureName of features) {
        const feature = this.index.get(featureName);
        if (feature) {
          count++;
          const qualityScore = feature.quality === 'high' ? 100 : feature.quality === 'medium' ? 50 : 25;
          sumQuality += qualityScore;
        }
      }

      stats.set(category, {
        count,
        avgQuality: count > 0 ? sumQuality / count : 0,
      });
    }

    const result = new Map<FeatureType, { count: number; avgQuality: number }>();
    for (const [category, data] of stats.entries()) {
      result.set(category, {
        count: data.count,
        avgQuality: data.avgQuality,
      });
    }

    return result;
  }

  /**
   * Get related features (same category or tags)
   */
  async getRelatedFeatures(featureName: string, limit: number = 10): Promise<FeatureMetadata[]> {
    const feature = await this.getFeature(featureName);
    if (!feature) {
      return [];
    }

    await this.ensureIndexed();

    const scores = new Map<string, number>();

    // Score by same category
    if (this.categoryIndex.has(feature.category)) {
      for (const name of this.categoryIndex.get(feature.category)!) {
        if (name !== featureName) {
          scores.set(name, (scores.get(name) || 0) + 2);
        }
      }
    }

    // Score by same tags
    for (const tag of feature.tags) {
      if (this.tagIndex.has(tag)) {
        for (const name of this.tagIndex.get(tag)!) {
          if (name !== featureName) {
            scores.set(name, (scores.get(name) || 0) + 1);
          }
        }
      }
    }

    // Sort by score and return top N
    const sorted = Array.from(scores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit);

    return sorted
      .map(([name]) => this.index.get(name))
      .filter((f) => f !== undefined) as FeatureMetadata[];
  }

  /**
   * Get feature dependencies
   */
  async getFeatureDependencies(featureName: string): Promise<{
    upstream: FeatureMetadata[];
    downstream: FeatureMetadata[];
  }> {
    const feature = await this.getFeature(featureName);
    if (!feature) {
      return { upstream: [], downstream: [] };
    }

    await this.ensureIndexed();

    const upstream: FeatureMetadata[] = [];
    const downstream: FeatureMetadata[] = [];

    // Find upstream (features this one depends on)
    for (const depName of feature.dependencies) {
      const dep = this.index.get(depName);
      if (dep) {
        upstream.push(dep);
      }
    }

    // Find downstream (features that depend on this one)
    for (const [, f] of this.index.entries()) {
      if (f.dependencies.includes(featureName)) {
        downstream.push(f);
      }
    }

    return { upstream, downstream };
  }

  /**
   * Validate feature metadata
   */
  validateFeatureMetadata(metadata: FeatureMetadata): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!metadata.name || metadata.name.trim().length === 0) {
      errors.push('Feature name is required');
    }

    if (!metadata.description || metadata.description.trim().length === 0) {
      errors.push('Feature description is required');
    }

    if (!metadata.category) {
      errors.push('Feature category is required');
    }

    if (!metadata.dataType) {
      errors.push('Feature data type is required');
    }

    if (!metadata.storeType) {
      errors.push('Feature store type is required');
    }

    if (!metadata.quality) {
      errors.push('Feature quality level is required');
    }

    if (!metadata.version) {
      errors.push('Feature version is required');
    }

    if (!metadata.source) {
      errors.push('Feature source is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Index feature metadata
   */
  private async indexFeature(metadata: FeatureMetadata): Promise<void> {
    this.index.set(metadata.name, metadata);

    // Index by category
    if (!this.categoryIndex.has(metadata.category)) {
      this.categoryIndex.set(metadata.category, new Set());
    }
    this.categoryIndex.get(metadata.category)!.add(metadata.name);

    // Index by tags
    for (const tag of metadata.tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(metadata.name);
    }
  }

  /**
   * Rebuild index from feature store
   */
  async rebuildIndex(): Promise<void> {
    this.index.clear();
    this.categoryIndex.clear();
    this.tagIndex.clear();

    const features = this.featureStore.listFeatures();

    for (const feature of features) {
      await this.indexFeature(feature);
    }

    this.lastIndexed = new Date();
    console.log(`Feature catalog index rebuilt with ${this.index.size} features`);
  }

  /**
   * Ensure index is up to date
   */
  private async ensureIndexed(): Promise<void> {
    const now = new Date();
    const elapsed = (now.getTime() - this.lastIndexed.getTime()) / 1000;

    if (elapsed > this.config.indexInterval) {
      await this.rebuildIndex();
    }
  }

  /**
   * Start auto-indexing
   */
  private startAutoIndexing(): void {
    setInterval(() => {
      this.rebuildIndex();
    }, this.config.indexInterval * 1000);
  }

  /**
   * Get catalog statistics
   */
  getStatistics(): {
    totalFeatures: number;
    totalCategories: number;
    totalTags: number;
    lastIndexed: Date;
    indexSize: number;
  } {
    return {
      totalFeatures: this.index.size,
      totalCategories: this.categoryIndex.size,
      totalTags: this.tagIndex.size,
      lastIndexed: this.lastIndexed,
      indexSize: this.index.size,
    };
  }
}

/**
 * Predefined feature definitions for catalog
 */
export function createPredefinedFeatures(): FeatureMetadata[] {
  return [
    // Behavioral Features (30+ features)
    {
      name: 'email_opens_count',
      description: 'Total number of emails opened by the lead',
      category: 'behavioral',
      dataType: 'numeric',
      storeType: 'both',
      quality: 'high',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['email', 'engagement'],
      dependencies: [],
      source: 'email_events',
      ttl: 3600,
    },
    {
      name: 'email_clicks_count',
      description: 'Total number of email clicks by the lead',
      category: 'behavioral',
      dataType: 'numeric',
      storeType: 'both',
      quality: 'high',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['email', 'engagement'],
      dependencies: [],
      source: 'email_events',
      ttl: 3600,
    },
    {
      name: 'page_views_count',
      description: 'Total number of page views by the lead',
      category: 'behavioral',
      dataType: 'numeric',
      storeType: 'both',
      quality: 'high',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['web', 'engagement'],
      dependencies: [],
      source: 'web_analytics',
      ttl: 3600,
    },
    {
      name: 'time_on_site_avg',
      description: 'Average time spent on site per session (seconds)',
      category: 'behavioral',
      dataType: 'numeric',
      storeType: 'both',
      quality: 'medium',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['web', 'engagement'],
      dependencies: [],
      source: 'web_analytics',
      ttl: 3600,
    },
    {
      name: 'session_count',
      description: 'Total number of sessions',
      category: 'behavioral',
      dataType: 'numeric',
      storeType: 'both',
      quality: 'high',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['web', 'engagement'],
      dependencies: [],
      source: 'web_analytics',
      ttl: 3600,
    },
    // ... more behavioral features would be added here

    // Demographic Features (20+ features)
    {
      name: 'company_size',
      description: 'Number of employees in the company',
      category: 'demographic',
      dataType: 'numeric',
      storeType: 'both',
      quality: 'high',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['firmographic', 'company'],
      dependencies: [],
      source: 'enrichment_api',
    },
    {
      name: 'company_revenue',
      description: 'Annual company revenue',
      category: 'demographic',
      dataType: 'numeric',
      storeType: 'both',
      quality: 'medium',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['firmographic', 'company'],
      dependencies: [],
      source: 'enrichment_api',
    },
    {
      name: 'industry',
      description: 'Industry classification',
      category: 'demographic',
      dataType: 'categorical',
      storeType: 'both',
      quality: 'high',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['firmographic', 'industry'],
      dependencies: [],
      source: 'enrichment_api',
    },
    // ... more demographic features would be added here

    // Temporal Features (15+ features)
    {
      name: 'days_since_last_activity',
      description: 'Number of days since last activity',
      category: 'temporal',
      dataType: 'numeric',
      storeType: 'both',
      quality: 'high',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['temporal', 'recency'],
      dependencies: [],
      source: 'activity_log',
      ttl: 3600,
    },
    {
      name: 'recency_score',
      description: 'Recency score based on activity (0-100)',
      category: 'temporal',
      dataType: 'numeric',
      storeType: 'both',
      quality: 'high',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['temporal', 'recency', 'rfm'],
      dependencies: ['days_since_last_activity'],
      source: 'derived',
      ttl: 3600,
    },
    // ... more temporal features would be added here

    // NLP Features (20+ features)
    {
      name: 'sentiment_score',
      description: 'Sentiment score from text analysis (-1 to 1)',
      category: 'nlp',
      dataType: 'numeric',
      storeType: 'both',
      quality: 'medium',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['nlp', 'sentiment'],
      dependencies: [],
      source: 'nlp_pipeline',
    },
    {
      name: 'competitor_mentions_count',
      description: 'Number of competitor mentions in communications',
      category: 'nlp',
      dataType: 'numeric',
      storeType: 'both',
      quality: 'high',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['nlp', 'competitive'],
      dependencies: [],
      source: 'nlp_pipeline',
    },
    // ... more NLP features would be added here

    // Competitive Features (15+ features)
    {
      name: 'market_segment',
      description: 'Market segment classification',
      category: 'competitive',
      dataType: 'categorical',
      storeType: 'both',
      quality: 'high',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['competitive', 'segmentation'],
      dependencies: ['company_size', 'company_revenue', 'industry'],
      source: 'derived',
    },
    {
      name: 'product_fit_score',
      description: 'Product fit score (0-100)',
      category: 'competitive',
      dataType: 'numeric',
      storeType: 'both',
      quality: 'medium',
      version: '1.0.0',
      createdAt: new Date(),
      updatedAt: new Date(),
      tags: ['competitive', 'fit'],
      dependencies: ['industry', 'company_size'],
      source: 'ml_model',
    },
    // ... more competitive features would be added here
  ];
}
