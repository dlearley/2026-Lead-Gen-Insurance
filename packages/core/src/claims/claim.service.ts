import { 
  Claim, 
  CreateClaimDto, 
  UpdateClaimDto, 
  ClaimStatus, 
  ClaimFilterParams, 
  ClaimsSearchResult,
  ClaimStatusHistory,
  ClaimStateTransition,
  ClaimLifecycleConfig,
  ClaimApiResponse,
  ClaimsListApiResponse
} from '@insurance/types/claims';
import { BaseError } from '../errors.js';
import { logger } from '../logger.js';
import { MetricsCollector } from '../monitoring/metrics.js';

/**
 * Claims Service - Core business logic for claims management
 */
export class ClaimService {
  private metrics = new MetricsCollector('claims');
  
  /**
   * Create a new claim with validation and initial state setup
   */
  async createClaim(data: CreateClaimDto): Promise<ClaimApiResponse> {
    try {
      this.metrics.incrementCounter('claims_created', { claimType: data.claimType });
      
      // Generate unique claim number
      const claimNumber = await this.generateClaimNumber(data.organizationId);
      
      // Create the claim
      const claim = await this.createClaimInDatabase({
        ...data,
        claimNumber,
        status: ClaimStatus.REPORTED,
        reportedDate: new Date(),
        paidAmount: 0,
        subrogationRecovery: 0,
        fraudIndicator: false,
        thirdPartyInvolved: data.thirdPartyInvolved || false
      });
      
      // Initialize claim metrics
      await this.initializeClaimMetrics(claim.id);
      
      // Run fraud detection
      await this.runFraudDetection(claim.id);
      
      // Auto-assign if configured
      if (this.config.autoAssignOnReported) {
        await this.autoAssignClaim(claim.id);
      }
      
      logger.info('Claim created successfully', { claimId: claim.id, claimNumber });
      
      return {
        success: true,
        data: claim,
        message: 'Claim created successfully'
      };
    } catch (error) {
      logger.error('Failed to create claim', { error, data });
      this.metrics.incrementCounter('claims_creation_errors');
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create claim'
      };
    }
  }

  /**
   * Get claims with filtering and pagination
   */
  async getClaims(filters: ClaimFilterParams): Promise<ClaimsListApiResponse> {
    try {
      const searchResult = await this.searchClaimsInDatabase(filters);
      
      this.metrics.recordHistogram('claims_search_duration', Date.now() - (filters as any).startTime);
      
      return {
        success: true,
        data: searchResult
      };
    } catch (error) {
      logger.error('Failed to retrieve claims', { error, filters });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve claims'
      };
    }
  }

  /**
   * Get a single claim by ID
   */
  async getClaimById(id: string): Promise<ClaimApiResponse> {
    try {
      const claim = await this.getClaimFromDatabase(id);
      
      if (!claim) {
        return {
          success: false,
          error: 'Claim not found'
        };
      }
      
      // Load related data
      const claimWithRelations = await this.loadClaimRelations(claim);
      
      return {
        success: true,
        data: claimWithRelations
      };
    } catch (error) {
      logger.error('Failed to retrieve claim', { error, claimId: id });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve claim'
      };
    }
  }

  /**
   * Update a claim
   */
  async updateClaim(id: string, data: UpdateClaimDto): Promise<ClaimApiResponse> {
    try {
      const existingClaim = await this.getClaimFromDatabase(id);
      
      if (!existingClaim) {
        return {
          success: false,
          error: 'Claim not found'
        };
      }
      
      // Calculate net claim cost if financial data updated
      if (data.paidAmount !== undefined || data.subrogationRecovery !== undefined || 
          data.claimedAmount !== undefined) {
        data.netClaimCost = this.calculateNetClaimCost(data, existingClaim);
      }
      
      const updatedClaim = await this.updateClaimInDatabase(id, data);
      
      // Update metrics if status changed
      if (data.status && data.status !== existingClaim.status) {
        await this.handleStatusChange(existingClaim, data.status);
      }
      
      logger.info('Claim updated successfully', { claimId: id, changes: data });
      
      return {
        success: true,
        data: updatedClaim,
        message: 'Claim updated successfully'
      };
    } catch (error) {
      logger.error('Failed to update claim', { error, claimId: id, data });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update claim'
      };
    }
  }

  /**
   * Change claim status with validation
   */
  async changeClaimStatus(
    id: string, 
    newStatus: ClaimStatus, 
    reason?: string, 
    userId?: string
  ): Promise<ClaimApiResponse> {
    try {
      const claim = await this.getClaimFromDatabase(id);
      
      if (!claim) {
        return {
          success: false,
          error: 'Claim not found'
        };
      }
      
      // Validate state transition
      const transition = this.validateStatusTransition(claim.status, newStatus);
      
      if (!transition.allowed) {
        return {
          success: false,
          error: `Invalid status transition from ${claim.status} to ${newStatus}: ${transition.reason}`
        };
      }
      
      // Update status
      const updatedClaim = await this.updateClaimInDatabase(id, { 
        status: newStatus,
        denyReason: newStatus === ClaimStatus.DENIED ? reason : undefined
      });
      
      // Create status history record
      await this.createStatusHistory({
        claimId: id,
        oldStatus: claim.status,
        newStatus,
        reason,
        changedBy: userId,
        source: 'USER'
      });
      
      // Handle post-status-change actions
      await this.handlePostStatusChange(updatedClaim, newStatus);
      
      logger.info('Claim status changed', { 
        claimId: id, 
        from: claim.status, 
        to: newStatus, 
        reason 
      });
      
      return {
        success: true,
        data: updatedClaim,
        message: `Claim status changed to ${newStatus}`
      };
    } catch (error) {
      logger.error('Failed to change claim status', { error, claimId: id, newStatus });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to change claim status'
      };
    }
  }

  /**
   * Get claim status history
   */
  async getClaimStatusHistory(claimId: string): Promise<ClaimStatusHistory[]> {
    return this.getStatusHistoryFromDatabase(claimId);
  }

  /**
   * Submit claim to carrier
   */
  async submitToCarrier(claimId: string): Promise<ClaimApiResponse> {
    try {
      const claim = await this.getClaimFromDatabase(claimId);
      
      if (!claim) {
        return {
          success: false,
          error: 'Claim not found'
        };
      }
      
      if (!claim.carrierId) {
        return {
          success: false,
          error: 'No carrier associated with this claim'
        };
      }
      
      // Submit to carrier integration service
      const submissionResult = await this.submitClaimToCarrier(claim);
      
      if (submissionResult.success) {
        await this.updateClaimInDatabase(claimId, {
          carrierClaimId: submissionResult.externalClaimId
        });
      }
      
      return submissionResult;
    } catch (error) {
      logger.error('Failed to submit claim to carrier', { error, claimId });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit to carrier'
      };
    }
  }

  /**
   * Validate state transition
   */
  private validateStatusTransition(from: ClaimStatus, to: ClaimStatus): ClaimStateTransition {
    const validTransitions: Record<ClaimStatus, ClaimStatus[]> = {
      [ClaimStatus.REPORTED]: [ClaimStatus.ASSIGNED, ClaimStatus.DENIED],
      [ClaimStatus.ASSIGNED]: [ClaimStatus.INVESTIGATING, ClaimStatus.DENIED],
      [ClaimStatus.INVESTIGATING]: [
        ClaimStatus.APPROVED, 
        ClaimStatus.DENIED, 
        ClaimStatus.INVESTIGATING // For requesting more info
      ],
      [ClaimStatus.APPROVED]: [ClaimStatus.SETTLED],
      [ClaimStatus.DENIED]: [ClaimStatus.APPEALED, ClaimStatus.CLOSED],
      [ClaimStatus.APPEALED]: [ClaimStatus.INVESTIGATING, ClaimStatus.DENIED, ClaimStatus.APPROVED],
      [ClaimStatus.SETTLED]: [ClaimStatus.CLOSED],
      [ClaimStatus.CLOSED]: [ClaimStatus.ARCHIVED],
      [ClaimStatus.ARCHIVED]: []
    };
    
    const allowed = validTransitions[from]?.includes(to) || false;
    
    return {
      from,
      to,
      allowed,
      reason: allowed ? undefined : `Cannot transition from ${from} to ${to}`,
      requiresUserAction: to === ClaimStatus.DENIED || to === ClaimStatus.APPEALED,
      triggers: this.getStatusChangeTriggers(from, to)
    };
  }

  /**
   * Get triggers for status change
   */
  private getStatusChangeTriggers(from: ClaimStatus, to: ClaimStatus): string[] {
    const triggers: Record<string, string[]> = {
      'REPORTED_ASSIGNED': ['auto_assignment', 'email_notification'],
      'INVESTIGATING_APPROVED': ['payment_processing', 'settlement_workflow'],
      'INVESTIGATING_DENIED': ['denial_letter', 'appeal_notification'],
      'APPROVED_SETTLED': ['settlement_calculation', 'payment_authorization'],
      'SETTLED_CLOSED': ['final_payment', 'claim_closure'],
      'DENIED_APPEALED': ['appeal_workflow', 'escalation']
    };
    
    return triggers[`${from}_${to}`] || [];
  }

  /**
   * Handle post-status-change actions
   */
  private async handlePostStatusChange(claim: Claim, newStatus: ClaimStatus): Promise<void> {
    switch (newStatus) {
      case ClaimStatus.ASSIGNED:
        await this.createAssignmentTasks(claim.id);
        break;
      case ClaimStatus.APPROVED:
        await this.initiatePaymentWorkflow(claim.id);
        break;
      case ClaimStatus.DENIED:
        await this.sendDenialNotification(claim.id);
        break;
      case ClaimStatus.CLOSED:
        await this.finalizeClaim(claim.id);
        break;
    }
  }

  /**
   * Generate unique claim number
   */
  private async generateClaimNumber(organizationId: string): Promise<string> {
    const prefix = 'CLM';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Calculate net claim cost
   */
  private calculateNetClaimCost(updateData: UpdateClaimDto, existingClaim: Claim): number {
    const paidAmount = updateData.paidAmount ?? existingClaim.paidAmount;
    const subrogationRecovery = updateData.subrogationRecovery ?? existingClaim.subrogationRecovery;
    return Math.max(0, paidAmount - subrogationRecovery);
  }

  /**
   * Run fraud detection on new claim
   */
  private async runFraudDetection(claimId: string): Promise<void> {
    // This would integrate with fraud detection service
    // For now, implement basic fraud checks
    try {
      const fraudScore = await this.calculateFraudScore(claimId);
      
      if (fraudScore > 0.7) {
        await this.updateClaimInDatabase(claimId, {
          fraudIndicator: true,
          fraudProbabilityScore: fraudScore,
          riskLevel: fraudScore > 0.9 ? 'CRITICAL' : 'HIGH'
        });
        
        logger.warn('Claim flagged for fraud review', { claimId, fraudScore });
      }
    } catch (error) {
      logger.error('Fraud detection failed', { error, claimId });
    }
  }

  /**
   * Calculate fraud score for a claim
   */
  private async calculateFraudScore(claimId: string): Promise<number> {
    // Basic fraud detection logic - would be more sophisticated in production
    const claim = await this.getClaimFromDatabase(claimId);
    if (!claim) return 0;
    
    let score = 0;
    
    // Check for suspicious timing (claim within 30 days of policy purchase)
    const policy = await this.getPolicyFromDatabase(claim.policyId);
    if (policy) {
      const daysSincePolicyStart = (Date.now() - policy.effectiveDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSincePolicyStart < 30) score += 0.3;
    }
    
    // Check for high claim amount vs estimated damage
    if (claim.claimedAmount && claim.estimatedDamageAmount) {
      const ratio = claim.claimedAmount / claim.estimatedDamageAmount;
      if (ratio > 2.0) score += 0.4;
    }
    
    // Check for multiple claims from same insured
    const insuredClaims = await this.getClaimsByInsured(claim.insuredId);
    if (insuredClaims.length > 3) score += 0.3;
    
    return Math.min(1.0, score);
  }

  // Database abstraction methods - these would be implemented with actual database calls
  private async createClaimInDatabase(data: any): Promise<Claim> {
    // Implementation would use Prisma or your ORM of choice
    throw new Error('Database implementation required');
  }

  private async getClaimFromDatabase(id: string): Promise<Claim | null> {
    // Implementation would use Prisma or your ORM of choice
    throw new Error('Database implementation required');
  }

  private async updateClaimInDatabase(id: string, data: any): Promise<Claim> {
    // Implementation would use Prisma or your ORM of choice
    throw new Error('Database implementation required');
  }

  private async searchClaimsInDatabase(filters: ClaimFilterParams): Promise<ClaimsSearchResult> {
    // Implementation would use Prisma or your ORM of choice
    throw new Error('Database implementation required');
  }

  private async loadClaimRelations(claim: Claim): Promise<Claim> {
    // Load all related data (policy, insured, carrier, etc.)
    // Implementation would use Prisma includes/eager loading
    throw new Error('Database implementation required');
  }

  private async createStatusHistory(data: any): Promise<ClaimStatusHistory> {
    // Implementation would create status history record
    throw new Error('Database implementation required');
  }

  private async getStatusHistoryFromDatabase(claimId: string): Promise<ClaimStatusHistory[]> {
    // Implementation would retrieve status history
    throw new Error('Database implementation required');
  }

  // Configuration and workflow methods
  private config: ClaimLifecycleConfig = {
    autoAssignOnReported: true,
    assignmentTimeoutHours: 24,
    investigationTimeoutDays: 30,
    settlementTimeoutDays: 60,
    closureTimeoutDays: 90,
    escalationRules: [
      {
        condition: 'investigation_timeout',
        action: 'escalate_to_supervisor',
        priority: 'HIGH'
      }
    ]
  };

  // Additional helper methods would be implemented here
  private async initializeClaimMetrics(claimId: string): Promise<void> {}
  private async autoAssignClaim(claimId: string): Promise<void> {}
  private async handleStatusChange(claim: Claim, newStatus: ClaimStatus): Promise<void> {}
  private async submitClaimToCarrier(claim: Claim): Promise<any> {}
  private async createAssignmentTasks(claimId: string): Promise<void> {}
  private async initiatePaymentWorkflow(claimId: string): Promise<void> {}
  private async sendDenialNotification(claimId: string): Promise<void> {}
  private async finalizeClaim(claimId: string): Promise<void> {}
  private async getPolicyFromDatabase(policyId: string): Promise<any> {}
  private async getClaimsByInsured(insuredId: string): Promise<Claim[]> {}
}