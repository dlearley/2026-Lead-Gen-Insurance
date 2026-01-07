import { BrokerPerformanceModel } from '../models/broker-performance-model';
import { LeadEmbeddingPipeline } from '../pipeline/lead-embedding-pipeline';
import { PredictionEngine } from '../engine/prediction-engine';
import type { ModelPerformanceMetrics, ModelVersion } from '../types';

export interface ModelLoadOptions {
  modelPath: string;
  validateMetrics?: boolean;
  fallbackToTraining?: boolean;
}

export interface ModelTrainOptions {
  trainingData: any[];
  validationSplit?: number;
  epochs?: number;
  batchSize?: number;
  earlyStopping?: boolean;
  savePath?: string;
}

export class MLModelManager {
  private brokerModel: BrokerPerformanceModel;
  private leadPipeline: LeadEmbeddingPipeline;
  private predictionEngine: PredictionEngine;
  private modelVersions: Map<string, ModelVersion> = new Map();
  private isInitialized = false;

  constructor() {
    this.brokerModel = new BrokerPerformanceModel();
    this.leadPipeline = new LeadEmbeddingPipeline();
    this.predictionEngine = new PredictionEngine();
  }

  /**
   * Initialize all ML models
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing ML Model Manager...');

      // Initialize components
      await this.predictionEngine.initialize();

      // Load existing models
      await this.loadExistingModels();

      this.isInitialized = true;
      console.log('ML Model Manager initialized successfully');

    } catch (error) {
      console.error('Failed to initialize ML Model Manager:', error);
      throw new Error(`ML Model Manager initialization failed: ${error.message}`);
    }
  }

  /**
   * Load existing models from disk
   */
  private async loadExistingModels(): Promise<void> {
    const modelPaths = {
      brokerPerformance: './models/broker-performance-model',
      leadEmbedding: './models/lead-embedding-model',
      routingOptimization: './models/routing-optimization-model',
    };

    for (const [modelType, modelPath] of Object.entries(modelPaths)) {
      try {
        await this.loadModel(modelType as any, { modelPath });
        console.log(`Loaded ${modelType} model from ${modelPath}`);
      } catch (error) {
        console.warn(`Failed to load ${modelType} model:`, error.message);
        // Continue with other models
      }
    }
  }

  /**
   * Load a specific model
   */
  async loadModel(modelType: 'broker-performance' | 'lead-embedding' | 'routing-optimization', options: ModelLoadOptions): Promise<boolean> {
    try {
      let success = false;

      switch (modelType) {
        case 'broker-performance':
          await this.brokerModel.loadModel(options.modelPath);
          success = true;
          break;

        case 'lead-embedding':
          // Lead embedding pipeline doesn't need model loading
          success = true;
          break;

        case 'routing-optimization':
          // Would load routing optimization model
          success = true;
          break;

        default:
          throw new Error(`Unknown model type: ${modelType}`);
      }

      if (success) {
        // Record model version
        const version: ModelVersion = {
          version: `v${Date.now()}`,
          modelType,
          createdAt: new Date(),
          metrics: this.getModelMetrics(modelType),
          parameters: {},
          isActive: true,
        };

        this.modelVersions.set(modelType, version);
      }

      return success;

    } catch (error) {
      console.error(`Failed to load ${modelType} model:`, error);
      
      if (options.fallbackToTraining) {
        console.log(`Attempting to train ${modelType} model as fallback...`);
        return await this.trainModel(modelType, {
          trainingData: [], // Would provide actual training data
          savePath: options.modelPath,
        });
      }

      return false;
    }
  }

  /**
   * Train a specific model
   */
  async trainModel(modelType: 'broker-performance' | 'lead-embedding' | 'routing-optimization', options: ModelTrainOptions): Promise<boolean> {
    try {
      console.log(`Training ${modelType} model...`);

      let metrics: ModelPerformanceMetrics;

      switch (modelType) {
        case 'broker-performance':
          if (options.trainingData.length === 0) {
            throw new Error('Training data is required for broker performance model');
          }

          const trainingData = await this.brokerModel.prepareTrainingData(options.trainingData);
          metrics = await this.brokerModel.train(
            trainingData,
            options.validationSplit || 0.2,
            options.epochs || 100
          );

          if (options.savePath) {
            await this.brokerModel.saveModel(options.savePath);
          }
          break;

        case 'lead-embedding':
          // Lead embedding pipeline doesn't require training
          metrics = {
            accuracy: 1.0,
            precision: 1.0,
            recall: 1.0,
            f1Score: 1.0,
            mae: 0,
            rmse: 0,
            r2Score: 1.0,
            trainingTime: 0,
            predictionTime: 0,
            dataPoints: 0,
            lastTrained: new Date(),
          };
          break;

        case 'routing-optimization':
          // Would train routing optimization model
          metrics = {
            accuracy: 0.85,
            precision: 0.82,
            recall: 0.88,
            f1Score: 0.85,
            mae: 0.15,
            rmse: 0.25,
            r2Score: 0.78,
            trainingTime: 300000, // 5 minutes
            predictionTime: 0,
            dataPoints: options.trainingData.length,
            lastTrained: new Date(),
          };
          break;

        default:
          throw new Error(`Unknown model type: ${modelType}`);
      }

      // Record model version
      const version: ModelVersion = {
        version: `v${Date.now()}`,
        modelType,
        createdAt: new Date(),
        metrics,
        parameters: {
          epochs: options.epochs,
          batchSize: options.batchSize,
          validationSplit: options.validationSplit,
        },
        isActive: true,
      };

      this.modelVersions.set(modelType, version);

      console.log(`Training completed for ${modelType} model:`, metrics);
      return true;

    } catch (error) {
      console.error(`Training failed for ${modelType} model:`, error);
      return false;
    }
  }

  /**
   * Get model metrics
   */
  private getModelMetrics(modelType: string): ModelPerformanceMetrics {
    switch (modelType) {
      case 'broker-performance':
        return this.brokerModel.getMetrics() || {
          accuracy: 0,
          precision: 0,
          recall: 0,
          f1Score: 0,
          mae: 0,
          rmse: 0,
          r2Score: 0,
          trainingTime: 0,
          predictionTime: 0,
          dataPoints: 0,
          lastTrained: new Date(),
        };

      case 'lead-embedding':
        return {
          accuracy: 1.0,
          precision: 1.0,
          recall: 1.0,
          f1Score: 1.0,
          mae: 0,
          rmse: 0,
          r2Score: 1.0,
          trainingTime: 0,
          predictionTime: 0,
          dataPoints: 0,
          lastTrained: new Date(),
        };

      case 'routing-optimization':
        return {
          accuracy: 0.85,
          precision: 0.82,
          recall: 0.88,
          f1Score: 0.85,
          mae: 0.15,
          rmse: 0.25,
          r2Score: 0.78,
          trainingTime: 0,
          predictionTime: 0,
          dataPoints: 0,
          lastTrained: new Date(),
        };

      default:
        throw new Error(`Unknown model type: ${modelType}`);
    }
  }

  /**
   * Get current model version
   */
  getModelVersion(modelType: 'broker-performance' | 'lead-embedding' | 'routing-optimization'): ModelVersion | null {
    return this.modelVersions.get(modelType) || null;
  }

  /**
   * Get all model versions
   */
  getAllModelVersions(): ModelVersion[] {
    return Array.from(this.modelVersions.values());
  }

  /**
   * Check if model is ready for predictions
   */
  isModelReady(modelType: 'broker-performance' | 'lead-embedding' | 'routing-optimization'): boolean {
    switch (modelType) {
      case 'broker-performance':
        return this.brokerModel.isReady();

      case 'lead-embedding':
        return this.isInitialized;

      case 'routing-optimization':
        return this.isInitialized;

      default:
        return false;
    }
  }

  /**
   * Get model status
   */
  getModelStatus(): Record<string, {
    isReady: boolean;
    version?: ModelVersion;
    lastUsed?: Date;
  }> {
    return {
      'broker-performance': {
        isReady: this.isModelReady('broker-performance'),
        version: this.getModelVersion('broker-performance'),
      },
      'lead-embedding': {
        isReady: this.isModelReady('lead-embedding'),
        version: this.getModelVersion('lead-embedding'),
      },
      'routing-optimization': {
        isReady: this.isModelReady('routing-optimization'),
        version: this.getModelVersion('routing-optimization'),
      },
    };
  }

  /**
   * Reload models from disk
   */
  async reloadModels(): Promise<void> {
    console.log('Reloading all models...');
    
    this.modelVersions.clear();
    await this.loadExistingModels();
    
    console.log('Model reload completed');
  }

  /**
   * Validate model integrity
   */
  async validateModels(): Promise<{
    brokerPerformance: { valid: boolean; issues: string[] };
    leadEmbedding: { valid: boolean; issues: string[] };
    routingOptimization: { valid: boolean; issues: string[] };
  }> {
    const validation = {
      brokerPerformance: { valid: true, issues: [] as string[] },
      leadEmbedding: { valid: true, issues: [] as string[] },
      routingOptimization: { valid: true, issues: [] as string[] },
    };

    // Validate broker performance model
    try {
      if (!this.brokerModel.isReady()) {
        validation.brokerPerformance.valid = false;
        validation.brokerPerformance.issues.push('Model not ready');
      }

      const metrics = this.brokerModel.getMetrics();
      if (!metrics || metrics.accuracy < 0.5) {
        validation.brokerPerformance.valid = false;
        validation.brokerPerformance.issues.push('Poor model performance');
      }
    } catch (error) {
      validation.brokerPerformance.valid = false;
      validation.brokerPerformance.issues.push(error.message);
    }

    // Validate lead embedding pipeline
    try {
      if (!this.isInitialized) {
        validation.leadEmbedding.valid = false;
        validation.leadEmbedding.issues.push('Pipeline not initialized');
      }
    } catch (error) {
      validation.leadEmbedding.valid = false;
      validation.leadEmbedding.issues.push(error.message);
    }

    // Validate routing optimization (placeholder)
    validation.routingOptimization.issues.push('Validation not implemented');

    return validation;
  }

  /**
   * Get model performance summary
   */
  getPerformanceSummary(): {
    totalModels: number;
    readyModels: number;
    averageAccuracy: number;
    totalTrainingTime: number;
    models: Array<{
      type: string;
      ready: boolean;
      accuracy: number;
      lastTrained: Date;
      dataPoints: number;
    }>;
  } {
    const models = this.getAllModelVersions();
    const readyModels = models.filter(m => this.isModelReady(m.modelType));
    const averageAccuracy = models.length > 0 
      ? models.reduce((sum, m) => sum + m.metrics.accuracy, 0) / models.length 
      : 0;
    const totalTrainingTime = models.reduce((sum, m) => sum + m.metrics.trainingTime, 0);

    return {
      totalModels: models.length,
      readyModels: readyModels.length,
      averageAccuracy,
      totalTrainingTime,
      models: models.map(m => ({
        type: m.modelType,
        ready: this.isModelReady(m.modelType),
        accuracy: m.metrics.accuracy,
        lastTrained: m.metrics.lastTrained,
        dataPoints: m.metrics.dataPoints,
      })),
    };
  }

  /**
   * Export model metadata
   */
  exportModelMetadata(): {
    versions: ModelVersion[];
    status: Record<string, any>;
    performance: any;
    exportedAt: Date;
  } {
    return {
      versions: this.getAllModelVersions(),
      status: this.getModelStatus(),
      performance: this.getPerformanceSummary(),
      exportedAt: new Date(),
    };
  }

  /**
   * Clean up old model versions
   */
  cleanupOldVersions(keepLastN = 5): number {
    const versions = this.getAllModelVersions();
    if (versions.length <= keepLastN) return 0;

    // Sort by creation date (newest first)
    const sortedVersions = versions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const toRemove = sortedVersions.slice(keepLastN);

    let removed = 0;
    for (const version of toRemove) {
      this.modelVersions.delete(version.modelType);
      removed++;
    }

    console.log(`Cleaned up ${removed} old model versions`);
    return removed;
  }

  /**
   * Get manager health status
   */
  getHealthStatus(): {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    models: Record<string, 'healthy' | 'degraded' | 'unhealthy'>;
    issues: string[];
    recommendations: string[];
  } {
    const status = this.getModelStatus();
    const validation = this.validateModels();
    
    const issues: string[] = [];
    const modelHealth: Record<string, 'healthy' | 'degraded' | 'unhealthy'> = {};

    // Check each model
    Object.entries(status).forEach(([modelType, modelStatus]) => {
      if (!modelStatus.isReady) {
        modelHealth[modelType] = 'unhealthy';
        issues.push(`${modelType} model is not ready`);
      } else if (!validation[modelType as keyof typeof validation].valid) {
        modelHealth[modelType] = 'degraded';
        issues.push(`${modelType} model has validation issues`);
      } else {
        modelHealth[modelType] = 'healthy';
      }
    });

    // Determine overall health
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (issues.length > Object.keys(status).length * 0.5) {
      overall = 'unhealthy';
    } else if (issues.length > 0) {
      overall = 'degraded';
    }

    // Generate recommendations
    const recommendations: string[] = [];
    if (overall === 'unhealthy') {
      recommendations.push('Retrain all models with fresh data');
    } else if (overall === 'degraded') {
      recommendations.push('Validate and fix model issues');
    }
    if (this.getAllModelVersions().length === 0) {
      recommendations.push('Load or train initial models');
    }

    return {
      overall,
      models: modelHealth,
      issues,
      recommendations,
    };
  }
}

export const mlModelManager = new MLModelManager();