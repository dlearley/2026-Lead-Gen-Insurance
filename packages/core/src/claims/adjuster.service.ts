import {
  Adjuster,
  CreateAdjusterDto,
  UpdateAdjusterDto,
  ClaimAssignment,
  AssignAdjusterDto,
  AdjusterAvailability,
  CreateAdjusterAvailabilityDto,
  AssignmentCriteria,
  AdjusterScore,
  RecommendAdjusterRequest,
  AdjusterStatus,
  AssignmentStatus,
  AssignmentPriority
} from '@insurance/types/claims';
import { BaseError } from '../errors.js';
import { logger } from '../logger.js';
import { MetricsCollector } from '../monitoring/metrics.js';

/**
 * Adjuster Service - Manages adjusters, assignments, and optimization algorithms
 */
export class AdjusterService {
  private metrics = new MetricsCollector('adjusters');

  /**
   * Create a new adjuster
   */
  async createAdjuster(data: CreateAdjusterDto): Promise<{ success: boolean; data?: Adjuster; error?: string }> {
    try {
      // Validate adjuster code uniqueness
      const existingAdjuster = await this.getAdjusterByCode(data.adjusterCode);
      if (existingAdjuster) {
        return {
          success: false,
          error: 'Adjuster code already exists'
        };
      }

      // Create adjuster
      const adjuster = await this.createAdjusterInDatabase({
        ...data,
        currentCaseload: 0,
        status: AdjusterStatus.ACTIVE
      });

      this.metrics.incrementCounter('adjusters_created', { 
        adjusterType: data.adjusterType || 'STAFF' 
      });

      logger.info('Adjuster created successfully', { 
        adjusterId: adjuster.id, 
        adjusterCode: data.adjusterCode 
      });

      return {
        success: true,
        data: adjuster,
        message: 'Adjuster created successfully'
      };
    } catch (error) {
      logger.error('Failed to create adjuster', { error, data });
      this.metrics.incrementCounter('adjuster_creation_errors');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create adjuster'
      };
    }
  }

  /**
   * Get adjuster by ID
   */
  async getAdjuster(id: string): Promise<{ success: boolean; data?: Adjuster; error?: string }> {
    try {
      const adjuster = await this.getAdjusterFromDatabase(id);
      
      if (!adjuster) {
        return {
          success: false,
          error: 'Adjuster not found'
        };
      }

      return {
        success: true,
        data: adjuster
      };
    } catch (error) {
      logger.error('Failed to retrieve adjuster', { error, adjusterId: id });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve adjuster'
      };
    }
  }

  /**
   * Update adjuster information
   */
  async updateAdjuster(id: string, data: UpdateAdjusterDto): Promise<{ success: boolean; data?: Adjuster; error?: string }> {
    try {
      const existingAdjuster = await this.getAdjusterFromDatabase(id);
      
      if (!existingAdjuster) {
        return {
          success: false,
          error: 'Adjuster not found'
        };
      }

      // Update adjuster
      const updatedAdjuster = await this.updateAdjusterInDatabase(id, data);

      logger.info('Adjuster updated successfully', { adjusterId: id, changes: data });

      return {
        success: true,
        data: updatedAdjuster,
        message: 'Adjuster updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update adjuster', { error, adjusterId: id, data });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update adjuster'
      };
    }
  }

  /**
   * Get all adjusters with filtering
   */
  async getAdjusters(filters?: {
    status?: AdjusterStatus;
    adjusterType?: string;
    carrierId?: string;
    expertiseAreas?: string[];
    available?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data?: Adjuster[]; error?: string }> {
    try {
      const adjusters = await this.searchAdjustersInDatabase(filters || {});
      
      return {
        success: true,
        data: adjusters
      };
    } catch (error) {
      logger.error('Failed to retrieve adjusters', { error, filters });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve adjusters'
      };
    }
  }

  /**
   * Assign claim to adjuster with optimization
   */
  async assignClaim(claimId: string, assignmentData: AssignAdjusterDto): Promise<{ success: boolean; data?: ClaimAssignment; error?: string }> {
    try {
      // Validate claim exists
      const claim = await this.getClaimFromDatabase(claimId);
      if (!claim) {
        return {
          success: false,
          error: 'Claim not found'
        };
      }

      // Validate adjuster exists and is available
      const adjuster = await this.getAdjusterFromDatabase(assignmentData.adjusterId);
      if (!adjuster) {
        return {
          success: false,
          error: 'Adjuster not found'
        };
      }

      if (adjuster.status !== AdjusterStatus.ACTIVE) {
        return {
          success: false,
          error: 'Adjuster is not active'
        };
      }

      // Check if adjuster is available (no conflicts)
      const isAvailable = await this.checkAdjusterAvailability(
        assignmentData.adjusterId,
        new Date() // Current assignment
      );

      if (!isAvailable) {
        return {
          success: false,
          error: 'Adjuster is not available for assignment'
        };
      }

      // Check caseload limits
      if (adjuster.maxCaseload && adjuster.currentCaseload >= adjuster.maxCaseload) {
        return {
          success: false,
          error: 'Adjuster has reached maximum caseload'
        };
      }

      // Create assignment
      const assignment = await this.createAssignmentInDatabase({
        claimId,
        adjusterId: assignmentData.adjusterId,
        assignmentReason: assignmentData.assignmentReason,
        priority: assignmentData.priority || AssignmentPriority.NORMAL,
        status: AssignmentStatus.ACTIVE
      });

      // Update adjuster caseload
      await this.updateAdjusterCaseload(assignmentData.adjusterId, 1);

      // Update claim status
      await this.updateClaimStatus(claimId, 'ASSIGNED');

      this.metrics.incrementCounter('claims_assigned', { 
        adjusterId: assignmentData.adjusterId,
        priority: assignmentData.priority || AssignmentPriority.NORMAL
      });

      logger.info('Claim assigned to adjuster', { 
        claimId, 
        adjusterId: assignmentData.adjusterId,
        assignmentId: assignment.id
      });

      return {
        success: true,
        data: assignment,
        message: 'Claim assigned successfully'
      };
    } catch (error) {
      logger.error('Failed to assign claim', { error, claimId, assignmentData });
      this.metrics.incrementCounter('assignment_errors');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to assign claim'
      };
    }
  }

  /**
   * Reassign claim to different adjuster
   */
  async reassignClaim(claimId: string, newAdjusterId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current assignment
      const currentAssignment = await this.getActiveAssignment(claimId);
      if (!currentAssignment) {
        return {
          success: false,
          error: 'No active assignment found for claim'
        };
      }

      // Remove current assignment
      await this.updateAssignmentStatus(currentAssignment.id, AssignmentStatus.REASSIGNED);

      // Create new assignment
      const newAssignmentResult = await this.assignClaim(claimId, {
        adjusterId: newAdjusterId,
        assignmentReason: reason || 'Reassigned',
        priority: currentAssignment.priority
      });

      if (!newAssignmentResult.success) {
        return newAssignmentResult;
      }

      // Update previous adjuster caseload
      await this.updateAdjusterCaseload(currentAssignment.adjusterId, -1);

      logger.info('Claim reassigned', { 
        claimId, 
        fromAdjuster: currentAssignment.adjusterId,
        toAdjuster: newAdjusterId,
        reason 
      });

      return {
        success: true,
        message: 'Claim reassigned successfully'
      };
    } catch (error) {
      logger.error('Failed to reassign claim', { error, claimId, newAdjusterId });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to reassign claim'
      };
    }
  }

  /**
   * Get adjuster's assigned claims
   */
  async getAdjusterClaims(adjusterId: string, filters?: {
    status?: AssignmentStatus;
    priority?: AssignmentPriority;
    page?: number;
    limit?: number;
  }): Promise<{ success: boolean; data?: ClaimAssignment[]; error?: string }> {
    try {
      const assignments = await this.getAssignmentsByAdjuster(adjusterId, filters || {});
      
      return {
        success: true,
        data: assignments
      };
    } catch (error) {
      logger.error('Failed to retrieve adjuster claims', { error, adjusterId });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve adjuster claims'
      };
    }
  }

  /**
   * Recommend best adjuster for a claim using scoring algorithm
   */
  async recommendAdjuster(request: RecommendAdjusterRequest): Promise<{ success: boolean; data?: AdjusterScore[]; error?: string }> {
    try {
      const adjusterScores: AdjusterScore[] = [];

      for (const adjusterId of request.adjusterIds) {
        const adjuster = await this.getAdjusterFromDatabase(adjusterId);
        if (!adjuster) continue;

        // Calculate scoring criteria
        const criteria = await this.calculateAssignmentCriteria(
          adjuster,
          request.claimId,
          request.complexity,
          request.location
        );

        const totalScore = this.calculateTotalScore(criteria);
        const recommendation = this.getRecommendation(totalScore);

        adjusterScores.push({
          adjusterId,
          totalScore,
          criteria,
          recommendation
        });
      }

      // Sort by score descending
      adjusterScores.sort((a, b) => b.totalScore - a.totalScore);

      logger.info('Adjuster recommendations generated', { 
        claimId: request.claimId,
        candidateCount: adjusterScores.length,
        topScore: adjusterScores[0]?.totalScore
      });

      return {
        success: true,
        data: adjusterScores
      };
    } catch (error) {
      logger.error('Failed to recommend adjuster', { error, request });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to recommend adjuster'
      };
    }
  }

  /**
   * Set adjuster availability
   */
  async setAvailability(data: CreateAdjusterAvailabilityDto): Promise<{ success: boolean; data?: AdjusterAvailability; error?: string }> {
    try {
      const adjuster = await this.getAdjusterFromDatabase(data.adjusterId);
      if (!adjuster) {
        return {
          success: false,
          error: 'Adjuster not found'
        };
      }

      const availability = await this.createAvailabilityInDatabase({
        ...data,
        availabilityStatus: data.availabilityStatus || 'AVAILABLE'
      });

      return {
        success: true,
        data: availability,
        message: 'Availability set successfully'
      };
    } catch (error) {
      logger.error('Failed to set adjuster availability', { error, data });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set availability'
      };
    }
  }

  /**
   * Get adjuster performance metrics
   */
  async getPerformanceMetrics(adjusterId: string, period?: { from: Date; to: Date }): Promise<{ 
    success: boolean; 
    data?: any; 
    error?: string 
  }> {
    try {
      const metrics = await this.calculateAdjusterMetrics(adjusterId, period);
      
      return {
        success: true,
        data: metrics
      };
    } catch (error) {
      logger.error('Failed to calculate adjuster metrics', { error, adjusterId });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate metrics'
      };
    }
  }

  /**
   * Calculate assignment criteria for an adjuster
   */
  private async calculateAssignmentCriteria(
    adjuster: Adjuster,
    claimId: string,
    complexity?: 'simple' | 'moderate' | 'complex',
    location?: { latitude: number; longitude: number }
  ): Promise<AssignmentCriteria> {
    // Expertise match
    const claim = await this.getClaimFromDatabase(claimId);
    const expertiseMatch = this.calculateExpertiseMatch(adjuster, claim);

    // Caseload utilization
    const caseloadUtilization = adjuster.maxCaseload 
      ? (adjuster.currentCaseload / adjuster.maxCaseload) * 100 
      : 0;

    // Availability
    const availability = await this.checkAdjusterAvailability(adjuster.id, new Date());

    // Geographic proximity (if location provided)
    let geographicProximity = 100; // Default full score
    if (location && claim?.lossLatitude && claim?.lossLongitude) {
      geographicProximity = this.calculateGeographicProximity(
        location,
        { latitude: claim.lossLatitude, longitude: claim.lossLongitude }
      );
    }

    // Historical performance
    const historicalPerformance = await this.getHistoricalPerformance(adjuster.id);

    return {
      expertiseMatch,
      caseloadUtilization,
      availability,
      geographicProximity,
      historicalPerformance,
      estimatedComplexity: complexity || 'moderate'
    };
  }

  /**
   * Calculate total score for adjuster
   */
  private calculateTotalScore(criteria: AssignmentCriteria): number {
    let score = 0;
    
    // Expertise match (30% weight)
    score += criteria.expertiseMatch * 0.30;
    
    // Caseload utilization - prefer balanced load (25% weight)
    const utilizationScore = Math.max(0, 100 - Math.abs(criteria.caseloadUtilization - 70));
    score += utilizationScore * 0.25;
    
    // Availability (20% weight)
    score += (criteria.availability ? 100 : 0) * 0.20;
    
    // Geographic proximity (15% weight)
    score += (criteria.geographicProximity || 100) * 0.15;
    
    // Historical performance (10% weight)
    score += criteria.historicalPerformance * 0.10;
    
    return Math.round(score);
  }

  /**
   * Get recommendation based on score
   */
  private getRecommendation(score: number): 'recommended' | 'acceptable' | 'not_recommended' {
    if (score >= 80) return 'recommended';
    if (score >= 60) return 'acceptable';
    return 'not_recommended';
  }

  /**
   * Calculate expertise match score
   */
  private calculateExpertiseMatch(adjuster: Adjuster, claim: any): number {
    if (!adjuster.expertiseAreas || !claim) return 50; // Default neutral score
    
    // Map claim types to expertise areas
    const expertiseMap: Record<string, string[]> = {
      'COLLISION': ['auto', 'vehicle'],
      'THEFT': ['auto', 'property'],
      'LIABILITY': ['liability', 'casualty'],
      'COMPREHENSIVE': ['auto', 'property'],
      'PROPERTY': ['property'],
      'CASUALTY': ['casualty', 'liability']
    };
    
    const claimExpertise = expertiseMap[claim.claimType] || [];
    const matchingAreas = adjuster.expertiseAreas.filter(area => 
      claimExpertise.some(expertise => area.toLowerCase().includes(expertise.toLowerCase()))
    );
    
    if (matchingAreas.length === 0) return 0;
    if (matchingAreas.length >= 2) return 100;
    return 70;
  }

  /**
   * Calculate geographic proximity score
   */
  private calculateGeographicProximity(
    adjusterLocation: { latitude: number; longitude: number },
    claimLocation: { latitude: number; longitude: number }
  ): number {
    const distance = this.calculateDistance(adjusterLocation, claimLocation);
    
    // Score decreases with distance
    if (distance <= 25) return 100; // Within 25 miles
    if (distance <= 50) return 80;  // Within 50 miles
    if (distance <= 100) return 60; // Within 100 miles
    if (distance <= 200) return 40; // Within 200 miles
    return 20; // Over 200 miles
  }

  /**
   * Calculate distance between two points (Haversine formula)
   */
  private calculateDistance(
    point1: { latitude: number; longitude: number },
    point2: { latitude: number; longitude: number }
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRadians(point2.latitude - point1.latitude);
    const dLon = this.toRadians(point2.longitude - point1.longitude);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(point1.latitude)) * 
      Math.cos(this.toRadians(point2.latitude)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Database abstraction methods
  private async createAdjusterInDatabase(data: any): Promise<Adjuster> {
    throw new Error('Database implementation required');
  }

  private async getAdjusterFromDatabase(id: string): Promise<Adjuster | null> {
    throw new Error('Database implementation required');
  }

  private async getAdjusterByCode(code: string): Promise<Adjuster | null> {
    throw new Error('Database implementation required');
  }

  private async updateAdjusterInDatabase(id: string, data: any): Promise<Adjuster> {
    throw new Error('Database implementation required');
  }

  private async searchAdjustersInDatabase(filters: any): Promise<Adjuster[]> {
    throw new Error('Database implementation required');
  }

  private async createAssignmentInDatabase(data: any): Promise<ClaimAssignment> {
    throw new Error('Database implementation required');
  }

  private async updateAssignmentStatus(assignmentId: string, status: AssignmentStatus): Promise<void> {
    throw new Error('Database implementation required');
  }

  private async getActiveAssignment(claimId: string): Promise<ClaimAssignment | null> {
    throw new Error('Database implementation required');
  }

  private async getAssignmentsByAdjuster(adjusterId: string, filters: any): Promise<ClaimAssignment[]> {
    throw new Error('Database implementation required');
  }

  private async createAvailabilityInDatabase(data: any): Promise<AdjusterAvailability> {
    throw new Error('Database implementation required');
  }

  private async updateAdjusterCaseload(adjusterId: string, delta: number): Promise<void> {
    throw new Error('Database implementation required');
  }

  private async updateClaimStatus(claimId: string, status: string): Promise<void> {
    throw new Error('Database implementation required');
  }

  private async getClaimFromDatabase(claimId: string): Promise<any> {
    throw new Error('Database implementation required');
  }

  private async checkAdjusterAvailability(adjusterId: string, date: Date): Promise<boolean> {
    throw new Error('Database implementation required');
  }

  private async getHistoricalPerformance(adjusterId: string): Promise<number> {
    throw new Error('Database implementation required');
  }

  private async calculateAdjusterMetrics(adjusterId: string, period?: { from: Date; to: Date }): Promise<any> {
    throw new Error('Database implementation required');
  }
}