/**
 * Feature Registry
 *
 * Central registry for managing feature definitions, versions, and metadata.
 * Provides lifecycle management for features in the feature store.
 */

import type {
  FeatureMetadata,
  FeatureVersion,
  FeatureDefinition,
  FeatureLineage,
  FeatureValidationResult,
} from '@insurance-lead-gen/types';

import type { FeatureStore } from './feature-store.js';
import type { FeatureValidators } from './feature-validators.js';

/**
 * Registry Configuration
 */
export interface RegistryConfig {
  autoVersion: boolean;
  versionPrefix: string;
  enableLineage: boolean;
  enableValidation: boolean;
}

/**
 * Feature Registry Class
 */
export class FeatureRegistry {
  private config: RegistryConfig;
  private featureStore: FeatureStore;
  private validators: FeatureValidators;
  private definitions: Map<string, FeatureDefinition>;
  private lineages: Map<string, FeatureLineage>;
  private currentVersions: Map<string, string>;

  constructor(
    featureStore: FeatureStore,
    validators: FeatureValidators,
    config?: Partial<RegistryConfig>
  ) {
    this.featureStore = featureStore;
    this.validators = validators;
    this.config = {
      autoVersion: true,
      versionPrefix: 'v',
      enableLineage: true,
      enableValidation: true,
      ...config,
    };

    this.definitions = new Map();
    this.lineages = new Map();
    this.currentVersions = new Map();
  }

  /**
   * Register a new feature
   */
  async registerFeature(metadata: FeatureMetadata): Promise<void> {
    // Check if feature already exists
    const existing = this.definitions.get(metadata.name);
    if (existing) {
      throw new Error(`Feature already exists: ${metadata.name}`);
    }

    // Validate metadata
    if (this.config.enableValidation) {
      const validation = this.validators.validateFeatureMetadata(metadata);
      if (!validation.valid) {
        throw new Error(`Invalid feature metadata: ${validation.errors.join(', ')}`);
      }
    }

    // Create definition
    const definition: FeatureDefinition = {
      type: metadata.dataType,
      default: null,
      nullable: true,
      validation: [],
      transformation: undefined,
      dependencies: metadata.dependencies,
    };

    this.definitions.set(metadata.name, definition);

    // Create version
    const version = this.createFeatureVersion(metadata, true);
    this.featureStore.trackVersion(version);
    this.currentVersions.set(metadata.name, version.version);

    // Register with feature store
    this.featureStore.registerFeature(metadata);

    // Create lineage if enabled
    if (this.config.enableLineage) {
      this.createFeatureLineage(metadata);
    }

    console.log(`Registered feature: ${metadata.name} (${metadata.version})`);
  }

  /**
   * Update an existing feature
   */
  async updateFeature(
    featureName: string,
    updates: Partial<FeatureMetadata>
  ): Promise<FeatureVersion> {
    // Get current version
    const currentVersion = this.featureStore.getLatestFeatureVersion(featureName);
    if (!currentVersion) {
      throw new Error(`Feature not found: ${featureName}`);
    }

    // Deactivate current version
    currentVersion.isActive = false;
    currentVersion.deprecatedAt = new Date();
    currentVersion.deprecationReason = 'Updated to new version';

    // Create new version
    const newVersionNumber = this.incrementVersion(currentVersion.version);
    const metadata = this.featureStore.getFeatureMetadata(featureName);
    if (!metadata) {
      throw new Error(`Feature metadata not found: ${featureName}`);
    }

    const updatedMetadata: FeatureMetadata = {
      ...metadata,
      ...updates,
      name: featureName,
      version: newVersionNumber,
      updatedAt: new Date(),
    };

    const newVersion = this.createFeatureVersion(updatedMetadata, true);
    this.featureStore.trackVersion(newVersion);
    this.currentVersions.set(featureName, newVersionNumber);

    // Update feature store metadata
    this.featureStore.registerFeature(updatedMetadata);

    // Update lineage
    if (this.config.enableLineage) {
      this.updateFeatureLineage(featureName, updatedMetadata);
    }

    console.log(`Updated feature: ${featureName} (${currentVersion.version} -> ${newVersionNumber})`);

    return newVersion;
  }

  /**
   * Deprecate a feature
   */
  async deprecateFeature(
    featureName: string,
    reason: string,
    replacementFeature?: string
  ): Promise<void> {
    const version = this.featureStore.getLatestFeatureVersion(featureName);
    if (!version) {
      throw new Error(`Feature not found: ${featureName}`);
    }

    version.isActive = false;
    version.deprecatedAt = new Date();
    version.deprecationReason = reason;
    version.replacedByVersion = replacementFeature;

    console.log(`Deprecated feature: ${featureName} (${version.version})`);
  }

  /**
   * Delete a feature
   */
  async deleteFeature(featureName: string): Promise<void> {
    const version = this.featureStore.getLatestFeatureVersion(featureName);
    if (!version) {
      throw new Error(`Feature not found: ${featureName}`);
    }

    // Check if feature is in use
    if (version.isActive) {
      throw new Error(`Cannot delete active feature: ${featureName}. Deprecate it first.`);
    }

    // Remove from registry
    this.definitions.delete(featureName);
    this.lineages.delete(featureName);
    this.currentVersions.delete(featureName);

    console.log(`Deleted feature: ${featureName}`);
  }

  /**
   * Get feature definition
   */
  getFeatureDefinition(featureName: string): FeatureDefinition | undefined {
    return this.definitions.get(featureName);
  }

  /**
   * Get feature lineage
   */
  getFeatureLineage(featureName: string): FeatureLineage | undefined {
    return this.lineages.get(featureName);
  }

  /**
   * Get current version of a feature
   */
  getCurrentVersion(featureName: string): string | undefined {
    return this.currentVersions.get(featureName);
  }

  /**
   * List all registered features
   */
  listFeatures(): FeatureMetadata[] {
    const features: FeatureMetadata[] = [];

    for (const [featureName, version] of this.currentVersions.entries()) {
      const metadata = this.featureStore.getFeatureMetadata(featureName);
      if (metadata && metadata.version === version) {
        features.push(metadata);
      }
    }

    return features;
  }

  /**
   * List features by status
   */
  listFeaturesByStatus(active: boolean): FeatureMetadata[] {
    const features: FeatureMetadata[] = [];

    for (const [featureName, currentVersion] of this.currentVersions.entries()) {
      const versions = this.featureStore.getFeatureVersions(featureName);
      const latest = versions.find((v) => v.version === currentVersion);

      if (latest && latest.isActive === active) {
        const metadata = this.featureStore.getFeatureMetadata(featureName);
        if (metadata) {
          features.push(metadata);
        }
      }
    }

    return features;
  }

  /**
   * Get feature dependencies
   */
  getDependencies(featureName: string): FeatureMetadata[] {
    const metadata = this.featureStore.getFeatureMetadata(featureName);
    if (!metadata || !metadata.dependencies) {
      return [];
    }

    const dependencies: FeatureMetadata[] = [];

    for (const depName of metadata.dependencies) {
      const depMetadata = this.featureStore.getFeatureMetadata(depName);
      if (depMetadata) {
        dependencies.push(depMetadata);
      }
    }

    return dependencies;
  }

  /**
   * Get features that depend on this feature
   */
  getDependents(featureName: string): FeatureMetadata[] {
    const dependents: FeatureMetadata[] = [];

    for (const [name, metadata] of this.currentVersions.entries()) {
      const featureMetadata = this.featureStore.getFeatureMetadata(name);
      if (featureMetadata && featureMetadata.dependencies.includes(featureName)) {
        dependents.push(featureMetadata);
      }
    }

    return dependents;
  }

  /**
   * Validate a feature before registration
   */
  validateFeature(metadata: FeatureMetadata): FeatureValidationResult {
    const validation = this.validators.validateFeatureMetadata(metadata);

    if (!validation.valid) {
      return {
        featureName: metadata.name,
        isValid: false,
        errors: validation.errors,
        warnings: [],
        info: [],
        validatedAt: new Date(),
      };
    }

    // Check dependencies exist
    const dependencyErrors: string[] = [];
    for (const depName of metadata.dependencies) {
      if (!this.definitions.has(depName) && !this.featureStore.getFeatureMetadata(depName)) {
        dependencyErrors.push(`Dependency not found: ${depName}`);
      }
    }

    if (dependencyErrors.length > 0) {
      return {
        featureName: metadata.name,
        isValid: false,
        errors: dependencyErrors,
        warnings: [],
        info: [],
        validatedAt: new Date(),
      };
    }

    return {
      featureName: metadata.name,
      isValid: true,
      errors: [],
      warnings: [],
      info: [`Feature ${metadata.name} is valid`],
      validatedAt: new Date(),
    };
  }

  /**
   * Create feature version
   */
  private createFeatureVersion(metadata: FeatureMetadata, isActive: boolean): FeatureVersion {
    return {
      featureName: metadata.name,
      version: metadata.version,
      description: metadata.description,
      definition: {
        type: metadata.dataType,
        default: null,
        nullable: true,
        validation: [],
        transformation: undefined,
        dependencies: metadata.dependencies,
      },
      createdBy: 'system',
      createdAt: metadata.createdAt,
      isActive,
      deprecatedAt: undefined,
      deprecationReason: undefined,
      replacedByVersion: undefined,
    };
  }

  /**
   * Increment version number
   */
  private incrementVersion(currentVersion: string): string {
    const match = currentVersion.match(/v?(\d+)\.(\d+)\.(\d+)/);
    if (match) {
      const major = parseInt(match[1], 10);
      const minor = parseInt(match[2], 10);
      const patch = parseInt(match[3], 10);

      return `${this.config.versionPrefix}${major}.${minor}.${patch + 1}`;
    }

    return `${this.config.versionPrefix}1.0.0`;
  }

  /**
   * Create feature lineage
   */
  private createFeatureLineage(metadata: FeatureMetadata): void {
    const lineage: FeatureLineage = {
      featureName: metadata.name,
      version: metadata.version,
      upstreamFeatures: metadata.dependencies,
      downstreamFeatures: [],
      sourceData: [
        {
          type: 'database',
          name: metadata.source,
          lastUpdated: new Date(),
        },
      ],
      transformations: [],
      createdBy: 'system',
      createdAt: new Date(),
      modifiedBy: 'system',
      modifiedAt: new Date(),
    };

    this.lineages.set(metadata.name, lineage);
  }

  /**
   * Update feature lineage
   */
  private updateFeatureLineage(featureName: string, metadata: FeatureMetadata): void {
    const lineage = this.lineages.get(featureName);
    if (!lineage) {
      this.createFeatureLineage(metadata);
      return;
    }

    lineage.version = metadata.version;
    lineage.upstreamFeatures = metadata.dependencies;
    lineage.modifiedAt = new Date();
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalFeatures: number;
    activeFeatures: number;
    deprecatedFeatures: number;
    totalVersions: number;
    featuresWithLineage: number;
    averageDependencies: number;
  } {
    const features = this.listFeatures();
    const activeFeatures = features.filter((f) => {
      const version = this.featureStore.getLatestFeatureVersions?.(f.name);
      return version?.isActive !== false;
    }).length;

    let totalVersions = 0;
    let totalDependencies = 0;

    for (const featureName of this.currentVersions.keys()) {
      const versions = this.featureStore.getFeatureVersions(featureName);
      totalVersions += versions.length;

      const metadata = this.featureStore.getFeatureMetadata(featureName);
      if (metadata) {
        totalDependencies += metadata.dependencies.length;
      }
    }

    return {
      totalFeatures: features.length,
      activeFeatures: features.filter((f) => {
        const version = this.featureStore.getFeatureVersions(f.name);
        return version[version.length - 1]?.isActive !== false;
      }).length,
      deprecatedFeatures: features.filter((f) => {
        const version = this.featureStore.getFeatureVersions(f.name);
        return version[version.length - 1]?.isActive === false;
      }).length,
      totalVersions,
      featuresWithLineage: this.lineages.size,
      averageDependencies: features.length > 0 ? totalDependencies / features.length : 0,
    };
  }

  /**
   * Import features from a configuration
   */
  async importFeatures(features: FeatureMetadata[]): Promise<{
    imported: number;
    failed: number;
    errors: string[];
  }> {
    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const feature of features) {
      try {
        await this.registerFeature(feature);
        imported++;
      } catch (error) {
        failed++;
        errors.push(`${feature.name}: ${error}`);
      }
    }

    return { imported, failed, errors };
  }

  /**
   * Export features to configuration
   */
  exportFeatures(): FeatureMetadata[] {
    return this.listFeatures();
  }
}
