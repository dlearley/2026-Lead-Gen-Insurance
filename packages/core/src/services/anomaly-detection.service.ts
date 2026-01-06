// ========================================
// ANOMALY DETECTION SERVICE - Phase 27.4
// ========================================

import type {
  Anomaly,
  SizeAnomaly,
  TimingAnomaly,
  FrequencyAnomaly,
  NetworkAnomaly,
  DocumentAnomaly,
  AnomalyExplanation,
  ClaimData,
} from '@insurance-lead-gen/types';
import { logger } from '../logger.js';

/**
 * Anomaly Detection Service
 * Detect unusual patterns and anomalies in claims data
 */
export class AnomalyDetectionService {
  private static ISOLATION_FOREST_THRESHOLD = 0.5;
  private static LOF_THRESHOLD = 1.5;

  /**
   * Detect anomalies in real-time
   */
  static async detectAnomalies(claimId: string, claimData: ClaimData): Promise<Anomaly[]> {
    try {
      logger.info('Starting anomaly detection', { claimId });

      const anomalies: Anomaly[] = [];

      // Size anomaly
      const sizeAnomaly = await this.detectSizeAnomaly(claimData.claimedAmount, claimData.claimType);
      if (sizeAnomaly.severity !== 'Low') {
        anomalies.push({
          id: `anomaly-size-${claimId}`,
          anomalyType: 'size',
          anomalyScore: this.calculateAnomalyScore(sizeAnomaly),
          severity: sizeAnomaly.severity,
          description: `Claim amount is ${sizeAnomaly.deviation.toFixed(0)}% ${sizeAnomaly.deviation > 0 ? 'above' : 'below'} historical average`,
          detectedValue: claimData.claimedAmount,
          expectedValue: sizeAnomaly.historicalAverage,
          confidence: 0.85,
        });
      }

      // Timing anomaly
      if (claimData.previousClaims && claimData.previousClaims.length > 0) {
        const timingAnomaly = await this.detectTimingAnomaly(claimId, claimData.previousClaims);
        if (timingAnomaly.unusualPatterns.length > 0) {
          anomalies.push({
            id: `anomaly-timing-${claimId}`,
            anomalyType: 'timing',
            anomalyScore: this.calculateTimingAnomalyScore(timingAnomaly),
            severity: timingAnomaly.unusualPatterns.length > 2 ? 'High' : 'Medium',
            description: timingAnomaly.unusualPatterns.join(', '),
            detectedValue: timingAnomaly.daysSinceLastClaim,
            expectedValue: timingAnomaly.historicalAverage,
            confidence: 0.9,
          });
        }
      }

      // Frequency anomaly
      if (claimData.previousClaims && claimData.previousClaims.length > 0) {
        const frequencyAnomaly = await this.detectFrequencyAnomaly(claimData.customerId, claimData.previousClaims);
        if (frequencyAnomaly.severity !== 'Low') {
          anomalies.push({
            id: `anomaly-frequency-${claimId}`,
            anomalyType: 'frequency',
            anomalyScore: frequencyAnomaly.claimsInPeriod / 10, // Normalize
            severity: frequencyAnomaly.severity,
            description: `${frequencyAnomaly.claimsInPeriod} claims in ${frequencyAnomaly.period}`,
            detectedValue: frequencyAnomaly.claimsInPeriod,
            expectedValue: frequencyAnomaly.averageClaims,
            confidence: 0.95,
          });
        }
      }

      // Network anomaly
      const networkAnomalies = await this.detectNetworkAnomalies(claimId, claimData);
      anomalies.push(...networkAnomalies.map(na => ({
        id: `anomaly-network-${claimId}-${na.networkId}`,
        anomalyType: 'network',
        anomalyScore: na.fraudProbability * 100,
        severity: na.fraudProbability > 0.7 ? 'Critical' : 'High',
        description: `Claim connected to fraud network with ${na.memberCount} members`,
        detectedValue: na.connectedClaims,
        expectedValue: 0,
        confidence: na.fraudProbability,
      })));

      logger.info('Anomaly detection completed', {
        claimId,
        anomaliesDetected: anomalies.length,
        severityBreakdown: this.getSeverityBreakdown(anomalies),
      });

      return anomalies;
    } catch (error) {
      logger.error('Error detecting anomalies', { claimId, error });
      throw new Error(`Failed to detect anomalies: ${error.message}`);
    }
  }

  /**
   * Size anomaly detection
   */
  static async detectSizeAnomaly(claimAmount: number, claimType: string): Promise<SizeAnomaly> {
    try {
      // Get historical averages by claim type (simulated)
      const historicalAverages: Record<string, { average: number; stdDev: number; percentileData: number[] }> = {
        auto_accident: { average: 15000, stdDev: 8000, percentileData: [5000, 10000, 15000, 20000, 30000] },
        auto_theft: { average: 25000, stdDev: 10000, percentileData: [15000, 20000, 25000, 30000, 40000] },
        home_property_damage: { average: 8000, stdDev: 5000, percentileData: [2000, 5000, 8000, 12000, 20000] },
        home_fire: { average: 75000, stdDev: 50000, percentileData: [20000, 40000, 75000, 100000, 150000] },
        life_death: { average: 150000, stdDev: 100000, percentileData: [50000, 100000, 150000, 200000, 300000] },
        health_medical: { average: 12000, stdDev: 8000, percentileData: [3000, 7000, 12000, 18000, 28000] },
      };

      const baseline = historicalAverages[claimType] || { average: 10000, stdDev: 5000, percentileData: [3000, 7000, 10000, 15000, 25000] };

      const deviation = ((claimAmount - baseline.average) / baseline.average) * 100;

      // Calculate percentile
      let percentile = 50;
      if (claimAmount <= baseline.percentileData[0]) percentile = 10;
      else if (claimAmount <= baseline.percentileData[1]) percentile = 25;
      else if (claimAmount <= baseline.percentileData[2]) percentile = 50;
      else if (claimAmount <= baseline.percentileData[3]) percentile = 75;
      else percentile = 90;

      // Determine severity
      const absoluteDeviation = Math.abs(deviation);
      let severity: 'Critical' | 'High' | 'Medium' | 'Low' = 'Low';
      if (absoluteDeviation > 300) severity = 'Critical';
      else if (absoluteDeviation > 200) severity = 'High';
      else if (absoluteDeviation > 100) severity = 'Medium';

      return {
        claimAmount,
        historicalAverage: baseline.average,
        deviation,
        percentile,
        severity,
      };
    } catch (error) {
      logger.error('Error detecting size anomaly', { error });
      throw new Error(`Failed to detect size anomaly: ${error.message}`);
    }
  }

  /**
   * Timing anomaly detection
   */
  static async detectTimingAnomaly(claimId: string, previousClaims: any[]): Promise<TimingAnomaly> {
    try {
      if (previousClaims.length === 0) {
        return {
          daysSinceLastClaim: 0,
          historicalAverage: 0,
          daysSincePolicyStart: 0,
          timeOfDay: 'unknown',
          dayOfWeek: 'unknown',
          unusualPatterns: [],
        };
      }

      const latestClaim = previousClaims[0];
      const daysSinceLastClaim = (Date.now() - new Date(latestClaim.submittedDate).getTime()) / (1000 * 60 * 60 * 24);

      // Calculate historical average
      const claimIntervals = [];
      for (let i = 0; i < previousClaims.length - 1; i++) {
        const interval = (new Date(previousClaims[i].submittedDate).getTime() - new Date(previousClaims[i + 1].submittedDate).getTime()) / (1000 * 60 * 60 * 24);
        claimIntervals.push(interval);
      }

      const historicalAverage = claimIntervals.length > 0
        ? claimIntervals.reduce((sum, interval) => sum + interval, 0) / claimIntervals.length
        : 90; // Default 90 days

      const unusualPatterns: string[] = [];

      // Check for very short intervals
      if (daysSinceLastClaim < 7) {
        unusualPatterns.push(`Claim submitted only ${daysSinceLastClaim.toFixed(0)} days after previous claim`);
      }

      // Check if this is an outlier
      if (claimIntervals.length > 2) {
        const avgInterval = historicalAverage;
        const stdDev = Math.sqrt(claimIntervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / claimIntervals.length);
        const zScore = Math.abs((daysSinceLastClaim - avgInterval) / stdDev);

        if (zScore > 2) {
          unusualPatterns.push('Claim timing is statistical outlier (Z-score > 2)');
        }
      }

      // Time and day patterns
      const now = new Date();
      const timeOfDay = now.getHours() < 12 ? 'morning' : now.getHours() < 18 ? 'afternoon' : 'evening';
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][now.getDay()];

      return {
        daysSinceLastClaim,
        historicalAverage,
        daysSincePolicyStart: 0, // Would need policy start date
        timeOfDay,
        dayOfWeek,
        unusualPatterns,
      };
    } catch (error) {
      logger.error('Error detecting timing anomaly', { claimId, error });
      throw new Error(`Failed to detect timing anomaly: ${error.message}`);
    }
  }

  /**
   * Frequency anomaly detection
   */
  static async detectFrequencyAnomaly(customerId: string, previousClaims: any[]): Promise<FrequencyAnomaly> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);

      const claimsIn30Days = previousClaims.filter((c: any) => new Date(c.submittedDate) >= thirtyDaysAgo);
      const claimsIn90Days = previousClaims.filter((c: any) => new Date(c.submittedDate) >= ninetyDaysAgo);
      const claimsInYear = previousClaims.filter((c: any) => new Date(c.submittedDate) >= oneYearAgo);

      // Industry benchmarks (approximate)
      const averageClaims = 1.5; // Average claims per 90 days for high-risk claimants

      let claimsInPeriod = claimsIn90Days.length;
      let period = '90_days' as const;

      // Check 30-day frequency
      if (claimsIn30Days.length > 3) {
        claimsInPeriod = claimsIn30Days.length;
        period = '30_days';
      }

      // Check yearly frequency
      if (claimsInYear.length > 10) {
        claimsInPeriod = claimsInYear.length;
        period = '1_year';
      }

      // Determine severity
      let severity: 'Critical' | 'High' | 'Medium' | 'Low' = 'Low';
      if (claimsInPeriod > 10 || (period === '30_days' && claimsInPeriod > 5)) {
        severity = 'Critical';
      } else if (claimsInPeriod > 5 || (period === '30_days' && claimsInPeriod > 3)) {
        severity = 'High';
      } else if (claimsInPeriod > 3) {
        severity = 'Medium';
      }

      return {
        customerId,
        claimsInPeriod,
        averageClaims,
        period,
        severity,
      };
    } catch (error) {
      logger.error('Error detecting frequency anomaly', { customerId, error });
      throw new Error(`Failed to detect frequency anomaly: ${error.message}`);
    }
  }

  /**
   * Network anomaly detection
   */
  static async detectNetworkAnomalies(claimId: string, claimData: ClaimData): Promise<NetworkAnomaly[]> {
    try {
      const networkAnomalies: NetworkAnomaly[] = [];

      // In production, this would:
      // 1. Query graph database for connections
      // 2. Identify clusters of connected claimants
      // 3. Calculate network centrality measures
      // 4. Detect anomalous network patterns

      // For now, return empty array
      return networkAnomalies;
    } catch (error) {
      logger.error('Error detecting network anomalies', { claimId, error });
      throw new Error(`Failed to detect network anomalies: ${error.message}`);
    }
  }

  /**
   * Document anomaly detection (OCR, metadata)
   */
  static async detectDocumentAnomalies(documentId: string): Promise<DocumentAnomaly> {
    try {
      // In production, this would:
      // 1. Analyze document images
      // 2. Check OCR confidence
      // 3. Detect image tampering
      // 4. Validate metadata
      // 5. Check for unusual patterns

      return {
        documentId,
        documentType: 'unknown',
        issues: [],
        imageQuality: 'good',
        metadataIssues: [],
        ocrConfidence: 0.95,
        tamperingIndicators: [],
      };
    } catch (error) {
      logger.error('Error detecting document anomalies', { documentId, error });
      throw new Error(`Failed to detect document anomalies: ${error.message}`);
    }
  }

  /**
   * Get anomaly explanation
   */
  static async getAnomalyExplanation(anomalyId: string, anomaly: Anomaly): Promise<AnomalyExplanation> {
    try {
      const rootCauses: string[] = [];

      if (anomaly.anomalyType === 'size') {
        rootCauses.push('Claim amount deviates significantly from historical averages');
        rootCauses.push('May indicate fraud claim or genuine high-value loss');
      } else if (anomaly.anomalyType === 'timing') {
        rootCauses.push('Unusual timing between claims');
        rootCauses.push('May indicate organized fraud or accelerated claims');
      } else if (anomaly.anomalyType === 'frequency') {
        rootCauses.push('Excessive claim frequency');
        rootCauses.push('May indicate claims abuse or genuine high-risk behavior');
      } else if (anomaly.anomalyType === 'network') {
        rootCauses.push('Claim connected to suspicious network');
        rootCauses.push('May indicate fraud ring involvement');
      }

      const recommendedActions = anomaly.severity === 'Critical'
        ? [
            'Immediate investigation required',
            'Flag for special handling',
            'Escalate to fraud team',
          ]
        : anomaly.severity === 'High'
        ? [
            'Enhanced review recommended',
            'Verify supporting documentation',
            'Consider fraud assessment',
          ]
        : [
            'Standard review',
            'Monitor for additional anomalies',
          ];

      return {
        anomalyId,
        anomalyType: anomaly.anomalyType,
        description: anomaly.description,
        severity: anomaly.severity,
        detectedAt: new Date(),
        rootCauses,
        recommendedActions,
        similarCases: [],
      };
    } catch (error) {
      logger.error('Error getting anomaly explanation', { anomalyId, error });
      throw new Error(`Failed to get anomaly explanation: ${error.message}`);
    }
  }

  /**
   * Calculate anomaly score from size anomaly
   */
  private static calculateAnomalyScore(sizeAnomaly: SizeAnomaly): number {
    const absoluteDeviation = Math.abs(sizeAnomaly.deviation);
    return Math.min(absoluteDeviation / 3, 100);
  }

  /**
   * Calculate anomaly score from timing anomaly
   */
  private static calculateTimingAnomalyScore(timingAnomaly: TimingAnomaly): number {
    const score = timingAnomaly.unusualPatterns.length * 25;
    return Math.min(score, 100);
  }

  /**
   * Get severity breakdown of anomalies
   */
  private static getSeverityBreakdown(anomalies: Anomaly[]): Record<string, number> {
    return {
      Critical: anomalies.filter(a => a.severity === 'Critical').length,
      High: anomalies.filter(a => a.severity === 'High').length,
      Medium: anomalies.filter(a => a.severity === 'Medium').length,
      Low: anomalies.filter(a => a.severity === 'Low').length,
    };
  }
}
