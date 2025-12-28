import type {
  Claim,
  ClaimType,
  ClaimStatus,
  ClaimPriority,
  ClaimSeverity,
  CreateClaimDto,
  UpdateClaimDto,
  ClaimFilterParams,
  ClaimStatistics,
} from '../claims.js';

describe('Claims Types', () => {
  it('should have valid Claim interface', () => {
    const claim: Partial<Claim> = {
      id: 'claim-123',
      claimNumber: 'CLM-2024-000001',
      leadId: 'lead-123',
      insuranceType: 'auto',
      claimType: 'auto_accident' as ClaimType,
      status: 'submitted' as ClaimStatus,
      priority: 'high' as ClaimPriority,
      severity: 'major' as ClaimSeverity,
      incidentDate: new Date(),
      incidentDescription: 'Test incident',
      claimedAmount: 5000,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    expect(claim).toBeDefined();
    expect(claim.claimNumber).toBe('CLM-2024-000001');
  });

  it('should have valid CreateClaimDto interface', () => {
    const dto: CreateClaimDto = {
      leadId: 'lead-123',
      insuranceType: 'auto',
      claimType: 'auto_accident',
      incidentDate: new Date(),
      incidentDescription: 'Test incident',
      claimedAmount: 5000,
    };

    expect(dto).toBeDefined();
    expect(dto.leadId).toBe('lead-123');
  });

  it('should have valid UpdateClaimDto interface', () => {
    const dto: UpdateClaimDto = {
      status: 'approved',
      approvedAmount: 4500,
    };

    expect(dto).toBeDefined();
    expect(dto.status).toBe('approved');
  });

  it('should have valid ClaimFilterParams interface', () => {
    const params: ClaimFilterParams = {
      status: ['submitted', 'under_review'],
      priority: 'high',
      page: 1,
      limit: 20,
    };

    expect(params).toBeDefined();
    expect(params.page).toBe(1);
  });

  it('should have valid ClaimStatistics interface', () => {
    const stats: ClaimStatistics = {
      totalClaims: 100,
      claimsByStatus: {},
      claimsByType: {},
      claimsByPriority: {},
      totalClaimedAmount: 500000,
      totalApprovedAmount: 450000,
      totalPaidAmount: 400000,
      averageClaimAmount: 5000,
      averageProcessingTime: 15,
      approvalRate: 90,
      denialRate: 10,
      averageFraudScore: 25,
    };

    expect(stats).toBeDefined();
    expect(stats.totalClaims).toBe(100);
  });
});
