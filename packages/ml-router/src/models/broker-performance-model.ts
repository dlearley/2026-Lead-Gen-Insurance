import { Matrix } from 'ml-matrix';
import * as tf from '@tensorflow/tfjs-node';

export interface BrokerPredictionInput {
  brokerId: string;
  leadCharacteristics: {
    insuranceTypes: string[];
    urgency: string;
    geographicLocation: {
      state: string;
      city?: string;
    };
    estimatedValue: number;
    complexity: number;
    specialRequirements: string[];
  };
  context: {
    timeOfDay: number;
    dayOfWeek: number;
    season: string;
    marketConditions: Record<string, any>;
  };
}

export interface BrokerPredictionOutput {
  brokerId: string;
  expectedConversionRate: number;
  expectedProcessingTime: number;
  expectedRevenue: number;
  confidence: number;
  factors: {
    specialtyMatch: number;
    capacityMatch: number;
    performanceHistory: number;
    contextualFit: number;
  };
  alternatives: Array<{
    brokerId: string;
    score: number;
    reasoning: string;
  }>;
}

export interface ModelPerformanceMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  mae: number; // Mean Absolute Error
  rmse: number; // Root Mean Square Error
  r2Score: number; // R-squared
  trainingTime: number;
  predictionTime: number;
  dataPoints: number;
  lastTrained: Date;
}

export class BrokerPerformanceModel {
  private model: tf.LayersModel | null = null;
  private featureExtractor: tf.LayersModel | null = null;
  private scaler: { mean: number[]; std: number[] } | null = null;
  private isTrained = false;
  private metrics: ModelPerformanceMetrics | null = null;

  private readonly FEATURE_NAMES = [
    'insurance_type_auto', 'insurance_type_home', 'insurance_type_life',
    'insurance_type_health', 'insurance_type_commercial',
    'urgency_low', 'urgency_medium', 'urgency_high', 'urgency_critical',
    'lead_value', 'complexity', 'geographic_match',
    'broker_conversion_rate', 'broker_sla_compliance',
    'broker_avg_processing_time', 'broker_revenue_generated',
    'time_of_day', 'day_of_week', 'season_spring', 'season_summer',
    'season_fall', 'season_winter'
  ];

  constructor() {
    this.initializeModel();
  }

  private initializeModel(): void {
    // Create a neural network for broker performance prediction
    const input = tf.input({ shape: [this.FEATURE_NAMES.length] });
    
    // Feature extraction layers
    let x = tf.layers.dense({ units: 128, activation: 'relu' }).apply(input) as tf.SymbolicTensor;
    x = tf.layers.dropout({ rate: 0.2 }).apply(x) as tf.SymbolicTensor;
    x = tf.layers.dense({ units: 64, activation: 'relu' }).apply(x) as tf.SymbolicTensor;
    x = tf.layers.dropout({ rate: 0.2 }).apply(x) as tf.SymbolicTensor;
    
    // Shared features
    const shared = tf.layers.dense({ units: 32, activation: 'relu' }).apply(x) as tf.SymbolicTensor;
    
    // Output heads for different metrics
    const conversionRate = tf.layers.dense({ units: 1, activation: 'sigmoid', name: 'conversion_rate' })
      .apply(shared) as tf.SymbolicTensor;
    
    const processingTime = tf.layers.dense({ units: 1, activation: 'relu', name: 'processing_time' })
      .apply(shared) as tf.SymbolicTensor;
    
    const revenue = tf.layers.dense({ units: 1, activation: 'relu', name: 'revenue' })
      .apply(shared) as tf.SymbolicTensor;
    
    const confidence = tf.layers.dense({ units: 1, activation: 'sigmoid', name: 'confidence' })
      .apply(shared) as tf.SymbolicTensor;

    this.model = tf.model({
      inputs: input,
      outputs: [conversionRate, processingTime, revenue, confidence]
    });

    // Compile model
    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: {
        conversion_rate: 'binaryCrossentropy',
        processing_time: 'meanSquaredError',
        revenue: 'meanSquaredError',
        confidence: 'binaryCrossentropy'
      },
      metrics: {
        conversion_rate: ['accuracy'],
        processing_time: ['mae'],
        revenue: ['mae'],
        confidence: ['accuracy']
      }
    });

    console.log('Broker Performance Model initialized');
  }

  /**
   * Prepare training data from historical routing decisions
   */
  async prepareTrainingData(historicalData: any[]): Promise<{
    features: number[][];
    labels: {
      conversionRate: number[];
      processingTime: number[];
      revenue: number[];
      confidence: number[];
    };
  }> {
    const features: number[][] = [];
    const labels = {
      conversionRate: [] as number[],
      processingTime: [] as number[],
      revenue: [] as number[],
      confidence: [] as number[]
    };

    for (const record of historicalData) {
      try {
        const featureVector = this.extractFeatures(record);
        if (featureVector) {
          features.push(featureVector);
          
          // Extract labels from outcome data
          const outcome = record.performanceOutcome || {};
          labels.conversionRate.push(outcome.conversionRate || 0);
          labels.processingTime.push(outcome.processingTime || 0);
          labels.revenue.push(outcome.revenue || 0);
          labels.confidence.push(outcome.confidence || 0.5);
        }
      } catch (error) {
        console.warn('Failed to process training record:', error);
      }
    }

    return { features, labels };
  }

  /**
   * Extract features from a routing decision record
   */
  private extractFeatures(record: any): number[] | null {
    try {
      const lead = record.lead;
      const broker = record.broker;
      const outcome = record.performanceOutcome || {};

      if (!lead || !broker) return null;

      const features = new Array(this.FEATURE_NAMES.length).fill(0);

      // Insurance type features (one-hot encoded)
      const insuranceTypes = lead.insuranceTypes || [lead.insuranceType].filter(Boolean);
      insuranceTypes.forEach(type => {
        const index = this.FEATURE_NAMES.indexOf(`insurance_type_${type?.toLowerCase()}`);
        if (index !== -1) features[index] = 1;
      });

      // Urgency features (one-hot encoded)
      const urgency = lead.urgency || 'MEDIUM';
      const urgencyIndex = this.FEATURE_NAMES.indexOf(`urgency_${urgency.toLowerCase()}`);
      if (urgencyIndex !== -1) features[urgencyIndex] = 1;

      // Numeric features
      const leadValueIndex = this.FEATURE_NAMES.indexOf('lead_value');
      if (leadValueIndex !== -1) features[leadValueIndex] = (lead.estimatedValue || 10000) / 100000; // Normalize

      const complexityIndex = this.FEATURE_NAMES.indexOf('complexity');
      if (complexityIndex !== -1) features[complexityIndex] = (lead.complexity || 5) / 10;

      const geoMatchIndex = this.FEATURE_NAMES.indexOf('geographic_match');
      if (geoMatchIndex !== -1) features[geoMatchIndex] = lead.state === broker.state ? 1 : 0;

      // Broker performance features
      const brokerConversionIndex = this.FEATURE_NAMES.indexOf('broker_conversion_rate');
      if (brokerConversionIndex !== -1) features[brokerConversionIndex] = (broker.conversionRate || 0) / 100;

      const brokerSLAIndex = this.FEATURE_NAMES.indexOf('broker_sla_compliance');
      if (brokerSLAIndex !== -1) features[brokerSLAIndex] = (broker.slaComplianceRate || 0) / 100;

      const brokerProcessingIndex = this.FEATURE_NAMES.indexOf('broker_avg_processing_time');
      if (brokerProcessingIndex !== -1) features[brokerProcessingIndex] = (broker.avgProcessingTime || 240) / 1440; // Normalize to days

      const brokerRevenueIndex = this.FEATURE_NAMES.indexOf('broker_revenue_generated');
      if (brokerRevenueIndex !== -1) features[brokerRevenueIndex] = (broker.revenueGenerated || 0) / 100000; // Normalize

      // Context features
      const assignedAt = new Date(record.timestamp || record.createdAt || Date.now());
      const timeOfDayIndex = this.FEATURE_NAMES.indexOf('time_of_day');
      if (timeOfDayIndex !== -1) features[timeOfDayIndex] = assignedAt.getHours() / 24;

      const dayOfWeekIndex = this.FEATURE_NAMES.indexOf('day_of_week');
      if (dayOfWeekIndex !== -1) features[dayOfWeekIndex] = assignedAt.getDay() / 7;

      const season = this.getSeason(assignedAt);
      const seasonIndex = this.FEATURE_NAMES.indexOf(`season_${season.toLowerCase()}`);
      if (seasonIndex !== -1) features[seasonIndex] = 1;

      return features;

    } catch (error) {
      console.error('Failed to extract features:', error);
      return null;
    }
  }

  private getSeason(date: Date): string {
    const month = date.getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'fall';
    return 'winter';
  }

  /**
   * Train the model on historical data
   */
  async train(trainingData: {
    features: number[][];
    labels: {
      conversionRate: number[];
      processingTime: number[];
      revenue: number[];
      confidence: number[];
    };
  }, validationSplit = 0.2, epochs = 100): Promise<ModelPerformanceMetrics> {
    if (!this.model) {
      throw new Error('Model not initialized');
    }

    const startTime = Date.now();

    // Prepare data
    const featuresTensor = tf.tensor2d(trainingData.features);
    const labelsTensor = {
      conversion_rate: tf.tensor2d(trainingData.labels.conversionRate.map(v => [v])),
      processing_time: tf.tensor2d(trainingData.labels.processingTime.map(v => [v])),
      revenue: tf.tensor2d(trainingData.labels.revenue.map(v => [v])),
      confidence: tf.tensor2d(trainingData.labels.confidence.map(v => [v]))
    };

    // Normalize features
    const { normalizedFeatures, scaler } = this.normalizeFeatures(featuresTensor);
    this.scaler = scaler;

    // Train the model
    const history = await this.model.fit(normalizedFeatures, labelsTensor, {
      epochs,
      batchSize: 32,
      validationSplit,
      verbose: 1,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 10 === 0) {
            console.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}`);
          }
        }
      }
    });

    const trainingTime = Date.now() - startTime;

    // Calculate metrics
    const validationLoss = history.history.val_loss as number[];
    const finalValidationLoss = validationLoss[validationLoss.length - 1];

    // Evaluate model
    const evaluation = await this.model.evaluate(normalizedFeatures, labelsTensor) as tf.Tensor[];
    const [accuracy, mae, revenueMae, confidenceAcc] = await Promise.all(
      evaluation.map(t => t.data())
    );

    // Clean up tensors
    featuresTensor.dispose();
    Object.values(labelsTensor).forEach(tensor => tensor.dispose());
    normalizedFeatures.dispose();

    this.metrics = {
      accuracy: Array.from(accuracy)[0] || 0,
      precision: Array.from(confidenceAcc)[0] || 0,
      recall: Array.from(confidenceAcc)[0] || 0,
      f1Score: 2 * (Array.from(accuracy)[0] * Array.from(confidenceAcc)[0]) / (Array.from(accuracy)[0] + Array.from(confidenceAcc)[0]) || 0,
      mae: Array.from(mae)[0] || 0,
      rmse: Math.sqrt(finalValidationLoss),
      r2Score: 1 - (finalValidationLoss / 1), // Simplified R² calculation
      trainingTime,
      predictionTime: 0, // Will be measured during predictions
      dataPoints: trainingData.features.length,
      lastTrained: new Date()
    };

    this.isTrained = true;

    console.log('Model training completed:', this.metrics);
    return this.metrics;
  }

  /**
   * Normalize features using standard scaling
   */
  private normalizeFeatures(features: tf.Tensor2D): {
    normalizedFeatures: tf.Tensor2D;
    scaler: { mean: number[]; std: number[] };
  } {
    const featuresArray = features.arraySync() as number[][];
    const numFeatures = featuresArray[0].length;

    const mean = new Array(numFeatures).fill(0);
    const std = new Array(numFeatures).fill(0);

    // Calculate mean
    for (let j = 0; j < numFeatures; j++) {
      mean[j] = featuresArray.reduce((sum, row) => sum + row[j], 0) / featuresArray.length;
    }

    // Calculate standard deviation
    for (let j = 0; j < numFeatures; j++) {
      const variance = featuresArray.reduce((sum, row) => sum + Math.pow(row[j] - mean[j], 2), 0) / featuresArray.length;
      std[j] = Math.sqrt(variance) || 1; // Avoid division by zero
    }

    // Normalize
    const normalizedArray = featuresArray.map(row => 
      row.map((value, j) => (value - mean[j]) / std[j])
    );

    return {
      normalizedFeatures: tf.tensor2d(normalizedArray),
      scaler: { mean, std }
    };
  }

  /**
   * Make prediction for a broker on a specific lead
   */
  async predict(input: BrokerPredictionInput): Promise<BrokerPredictionOutput> {
    if (!this.isTrained || !this.model) {
      throw new Error('Model not trained');
    }

    const startTime = Date.now();

    // Extract features from input
    const featureVector = this.extractPredictionFeatures(input);
    
    // Normalize features
    const normalizedFeatures = this.normalizePredictionFeatures(featureVector);
    
    // Make prediction
    const predictions = this.model.predict(normalizedFeatures) as tf.Tensor[];
    const [conversionRateTensor, processingTimeTensor, revenueTensor, confidenceTensor] = predictions;
    
    const [conversionRate, processingTime, revenue, confidence] = await Promise.all([
      conversionRateTensor.data(),
      processingTimeTensor.data(),
      revenueTensor.data(),
      confidenceTensor.data()
    ]);

    // Clean up tensors
    normalizedFeatures.dispose();
    predictions.forEach(tensor => tensor.dispose());

    const predictionTime = Date.now() - startTime;

    // Update metrics
    if (this.metrics) {
      this.metrics.predictionTime = predictionTime;
    }

    return {
      brokerId: input.brokerId,
      expectedConversionRate: Array.from(conversionRate)[0] * 100, // Convert to percentage
      expectedProcessingTime: Array.from(processingTime)[0],
      expectedRevenue: Array.from(revenue)[0],
      confidence: Array.from(confidence)[0],
      factors: {
        specialtyMatch: this.calculateSpecialtyMatch(input),
        capacityMatch: this.calculateCapacityMatch(input),
        performanceHistory: this.getBrokerPerformanceFactor(input.brokerId),
        contextualFit: this.calculateContextualFit(input.context)
      },
      alternatives: [] // Would be populated by getting alternative brokers
    };
  }

  private extractPredictionFeatures(input: BrokerPredictionInput): number[] {
    const features = new Array(this.FEATURE_NAMES.length).fill(0);

    // Insurance type features
    input.leadCharacteristics.insuranceTypes.forEach(type => {
      const index = this.FEATURE_NAMES.indexOf(`insurance_type_${type.toLowerCase()}`);
      if (index !== -1) features[index] = 1;
    });

    // Urgency features
    const urgencyIndex = this.FEATURE_NAMES.indexOf(`urgency_${input.leadCharacteristics.urgency.toLowerCase()}`);
    if (urgencyIndex !== -1) features[urgencyIndex] = 1;

    // Numeric features
    const leadValueIndex = this.FEATURE_NAMES.indexOf('lead_value');
    if (leadValueIndex !== -1) features[leadValueIndex] = input.leadCharacteristics.estimatedValue / 100000;

    const complexityIndex = this.FEATURE_NAMES.indexOf('complexity');
    if (complexityIndex !== -1) features[complexityIndex] = input.leadCharacteristics.complexity / 10;

    // Context features
    const timeOfDayIndex = this.FEATURE_NAMES.indexOf('time_of_day');
    if (timeOfDayIndex !== -1) features[timeOfDayIndex] = input.context.timeOfDay / 24;

    const dayOfWeekIndex = this.FEATURE_NAMES.indexOf('day_of_week');
    if (dayOfWeekIndex !== -1) features[dayOfWeekIndex] = input.context.dayOfWeek / 7;

    const seasonIndex = this.FEATURE_NAMES.indexOf(`season_${input.context.season.toLowerCase()}`);
    if (seasonIndex !== -1) features[seasonIndex] = 1;

    // Geographic match (simplified)
    const geoMatchIndex = this.FEATURE_NAMES.indexOf('geographic_match');
    if (geoMatchIndex !== -1) features[geoMatchIndex] = 1; // Assume match for prediction

    return features;
  }

  private normalizePredictionFeatures(features: number[]): tf.Tensor2D {
    if (!this.scaler) {
      throw new Error('Scaler not available. Model must be trained first.');
    }

    const normalizedFeatures = features.map((value, index) => 
      (value - this.scaler!.mean[index]) / this.scaler!.std[index]
    );

    return tf.tensor2d([normalizedFeatures]);
  }

  private calculateSpecialtyMatch(input: BrokerPredictionInput): number {
    // Simple specialty matching logic
    const requiredTypes = input.leadCharacteristics.insuranceTypes;
    const matchedTypes = requiredTypes.filter(type => 
      // This would check against broker's actual specialties
      Math.random() > 0.3 // Placeholder
    );
    return matchedTypes.length / requiredTypes.length;
  }

  private calculateCapacityMatch(input: BrokerPredictionInput): number {
    // Simplified capacity matching
    return Math.random() * 0.5 + 0.5; // 0.5-1.0 range
  }

  private getBrokerPerformanceFactor(brokerId: string): number {
    // This would fetch actual broker performance data
    return Math.random() * 0.4 + 0.6; // 0.6-1.0 range
  }

  private calculateContextualFit(context: any): number {
    // Consider time of day, day of week, season
    let score = 0.5; // Base score

    // Time of day factor (business hours preferred)
    if (context.timeOfDay >= 9 && context.timeOfDay <= 17) {
      score += 0.2;
    }

    // Day of week factor (weekdays preferred)
    if (context.dayOfWeek >= 1 && context.dayOfWeek <= 5) {
      score += 0.1;
    }

    return Math.min(score, 1.0);
  }

  /**
   * Save model to disk
   */
  async saveModel(path: string): Promise<void> {
    if (!this.model) {
      throw new Error('No model to save');
    }

    await this.model.save(`file://${path}`);
    
    // Save scaler and metadata
    const metadata = {
      featureNames: this.FEATURE_NAMES,
      scaler: this.scaler,
      metrics: this.metrics,
      isTrained: this.isTrained
    };

    const fs = await import('fs/promises');
    await fs.writeFile(`${path}/metadata.json`, JSON.stringify(metadata, null, 2));

    console.log(`Model saved to ${path}`);
  }

  /**
   * Load model from disk
   */
  async loadModel(path: string): Promise<void> {
    this.model = await tf.loadLayersModel(`file://${path}/model.json`);

    // Load metadata
    const fs = await import('fs/promises');
    const metadataContent = await fs.readFile(`${path}/metadata.json`, 'utf-8');
    const metadata = JSON.parse(metadataContent);

    this.scaler = metadata.scaler;
    this.metrics = metadata.metrics;
    this.isTrained = metadata.isTrained;

    console.log(`Model loaded from ${path}`);
  }

  /**
   * Get model metrics
   */
  getMetrics(): ModelPerformanceMetrics | null {
    return this.metrics;
  }

  /**
   * Check if model is ready for predictions
   */
  isReady(): boolean {
    return this.isTrained && this.model !== null;
  }
}