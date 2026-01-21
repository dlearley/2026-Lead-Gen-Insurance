import {
  ClaimsVolumeReport,
  ClaimsAgingReport,
  ClaimsCostAnalysis,
  ClaimsClosureRates,
  AdjusterPerformanceReport,
  FraudIndicatorsReport,
  SettlementAnalysis,
  ClaimsReportsExport,
  ClaimFilterParams,
  ClaimStatus,
  ClaimType,
  FraudIndicatorType
} from '@insurance-lead-gen/types';
import { BaseError } from '../errors.js';
import { logger } from '../logger.js';
import { MetricsCollector } from '../monitoring/metrics.js';

/**
 * Analytics Service - Generates claims analytics and reports
 */
export class AnalyticsService {
  private metrics = new MetricsCollector('claims_analytics');

  /**
   * Generate claims volume report
   */
  async getClaimsVolumeReport(
    period: { from: Date; to: Date },
    filters?: {
      carrierId?: string;
      adjusterId?: string;
      organizationId?: string;
    }
  ): Promise<{ success: boolean; data?: ClaimsVolumeReport; error?: string }> {
    try {
      // Get claims data for the period
      const claims = await this.getClaimsForPeriod(period, filters || {});
      
      // Calculate volume metrics
      const totalClaims = claims.length;
      
      // Group by type
      const claimsByType = this.groupClaimsByType(claims);
      
      // Group by status
      const claimsByStatus = this.groupClaimsByStatus(claims);
      
      // Group by carrier
      const claimsByCarrier = await this.groupClaimsByCarrier(claims);

      const report: ClaimsVolumeReport = {
        period: `${period.from.toISOString().split('T')[0]} to ${period.to.toISOString().split('T')[0]}`,
        totalClaims,
        claimsByType,
        claimsByStatus,
        claimsByCarrier
      };

      this.metrics.recordHistogram('claims_volume_report_duration', Date.now() - period.from.getTime());
      
      return {
        success: true,
        data: report
      };
    } catch (error) {
      logger.error('Failed to generate claims volume report', { error, period });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate volume report'
      };
    }
  }

  /**
   * Generate claims aging report
   */
  async getClaimsAgingReport(
    asOfDate: Date = new Date(),
    filters?: {
      carrierId?: string;
      status?: ClaimStatus[];
    }
  ): Promise<{ success: boolean; data?: ClaimsAgingReport; error?: string }> {
    try {
      const activeClaims = await this.getActiveClaims(filters || {});
      
      // Calculate days in current status for each claim
      const claimsByDaysInStatus = this.calculateDaysInStatus(activeClaims, asOfDate);
      
      // Calculate average days in status
      const averageDaysInStatus = this.calculateAverageDaysInStatus(activeClaims, asOfDate);

      const report: ClaimsAgingReport = {
        asOfDate,
        claimsByDaysInStatus,
        averageDaysInStatus
      };

      this.metrics.recordHistogram('claims_aging_report_duration', Date.now() - asOfDate.getTime());
      
      return {
        success: true,
        data: report
      };
    } catch (error) {
      logger.error('Failed to generate claims aging report', { error, asOfDate });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate aging report'
      };
    }
  }

  /**
   * Generate claims cost analysis
   */
  async getClaimsCostAnalysis(
    period: { from: Date; to: Date },
    filters?: {
      claimType?: ClaimType[];
      carrierId?: string;
    }
  ): Promise<{ success: boolean; data?: ClaimsCostAnalysis; error?: string }> {
    try {
      const claims = await this.getClaimsForPeriod(period, filters || {});
      
      // Calculate total financials
      const totalReserves = claims.reduce((sum, claim) => sum + (claim.reservedAmount || 0), 0);
      const totalPaid = claims.reduce((sum, claim) => sum + (claim.paidAmount || 0), 0);
      const totalRecovered = claims.reduce((sum, claim) => sum + (claim.subrogationRecovery || 0), 0);
      const netClaimCost = totalPaid - totalRecovered;
      const averageClaimAmount = claims.length > 0 ? totalPaid / claims.length : 0;

      // Calculate cost by type
      const costByType = this.calculateCostByType(claims);

      const report: ClaimsCostAnalysis = {
        period: `${period.from.toISOString().split('T')[0]} to ${period.to.toISOString().split('T')[0]}`,
        totalReserves,
        totalPaid,
        totalRecovered,
        netClaimCost,
        averageClaimAmount,
        costByType
      };

      return {
        success: true,
        data: report
      };
    } catch (error) {
      logger.error('Failed to generate claims cost analysis', { error, period });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate cost analysis'
      };
    }
  }

  /**
   * Generate claims closure rates report
   */
  async getClaimsClosureRates(
    period: { from: Date; to: Date },
    filters?: {
      carrierId?: string;
      claimType?: ClaimType[];
    }
  ): Promise<{ success: boolean; data?: ClaimsClosureRates; error?: string }> {
    try {
      const claims = await this.getClaimsForPeriod(period, filters || {});
      
      const totalClaims = claims.length;
      const closedClaims = claims.filter(claim => 
        claim.status === ClaimStatus.CLOSED || claim.status === ClaimStatus.ARCHIVED
      ).length;
      
      const closureRate = totalClaims > 0 ? (closedClaims / totalClaims) * 100 : 0;
      
      // Calculate average days to closure for closed claims
      const closedClaimsWithDates = claims.filter(claim => 
        (claim.status === ClaimStatus.CLOSED || claim.status === ClaimStatus.ARCHIVED) && 
        claim.lossDate
      );
      
      const averageDaysToClosure = closedClaimsWithDates.length > 0 
        ? closedClaimsWithDates.reduce((sum, claim) => {
            const closureDate = claim.updatedAt; // Assume updatedAt is closure date
            const daysToClosure = (closureDate.getTime() - claim.lossDate!.getTime()) / (1000 * 60 * 60 * 24);
            return sum + daysToClosure;
          }, 0) / closedClaimsWithDates.length
        : 0;

      // Calculate closure rates by type
      const closureRatesByType = this.calculateClosureRatesByType(claims);

      const report: ClaimsClosureRates = {
        period: `${period.from.toISOString().split('T')[0]} to ${period.to.toISOString().split('T')[0]}`,
        totalClaims,
        closedClaims,
        closureRate,
        averageDaysToClosure,
        closureRatesByType
      };

      return {
        success: true,
        data: report
      };
    } catch (error) {
      logger.error('Failed to generate claims closure rates', { error, period });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate closure rates'
      };
    }
  }

  /**
   * Generate adjuster performance report
   */
  async getAdjusterPerformanceReport(
    adjusterId: string,
    period: { from: Date; to: Date }
  ): Promise<{ success: boolean; data?: AdjusterPerformanceReport; error?: string }> {
    try {
      // Get adjuster info
      const adjuster = await this.getAdjusterFromDatabase(adjusterId);
      if (!adjuster) {
        return {
          success: false,
          error: 'Adjuster not found'
        };
      }

      // Get assigned claims for the period
      const assignedClaims = await this.getAssignedClaimsForPeriod(adjusterId, period);
      
      // Get closed claims for performance calculation
      const closedClaims = assignedClaims.filter(claim => 
        claim.status === ClaimStatus.CLOSED || claim.status === ClaimStatus.ARCHIVED
      );

      const assignedClaimsCount = assignedClaims.length;
      const closedClaimsCount = closedClaims.length;

      // Calculate average days to closure
      const averageDaysToClosure = closedClaims.length > 0
        ? closedClaims.reduce((sum, claim) => {
            const closureDate = claim.updatedAt;
            const daysToClosure = (closureDate.getTime() - claim.lossDate!.getTime()) / (1000 * 60 * 60 * 24);
            return sum + daysToClosure;
          }, 0) / closedClaims.length
        : 0;

      // Calculate average efficiency score
      const efficiencyScores = await this.getAdjusterEfficiencyScores(adjusterId, period);
      const averageEfficiencyScore = efficiencyScores.length > 0
        ? efficiencyScores.reduce((sum, score) => sum + score, 0) / efficiencyScores.length
        : 0;

      // Calculate caseload utilization
      const caseloadUtilization = adjuster.maxCaseload 
        ? (adjuster.currentCaseload / adjuster.maxCaseload) * 100 
        : 0;

      const report: AdjusterPerformanceReport = {
        adjusterId,
        adjusterName: `${adjuster.firstName} ${adjuster.lastName}`,
        period: `${period.from.toISOString().split('T')[0]} to ${period.to.toISOString().split('T')[0]}`,
        assignedClaims: assignedClaimsCount,
        closedClaims: closedClaimsCount,
        averageDaysToClosure,
        averageEfficiencyScore,
        caseloadUtilization
      };

      return {
        success: true,
        data: report
      };
    } catch (error) {
      logger.error('Failed to generate adjuster performance report', { error, adjusterId, period });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate performance report'
      };
    }
  }

  /**
   * Generate fraud indicators report
   */
  async getFraudIndicatorsReport(
    period: { from: Date; to: Date },
    filters?: {
      carrierId?: string;
      indicatorType?: FraudIndicatorType[];
    }
  ): Promise<{ success: boolean; data?: FraudIndicatorsReport; error?: string }> {
    try {
      // Get all claims in period
      const claims = await this.getClaimsForPeriod(period, filters || {});
      
      // Get fraud indicators for these claims
      const fraudIndicators = await this.getFraudIndicatorsForClaims(
        claims.map(c => c.id),
        period
      );

      const totalClaims = claims.length;
      const flaggedClaims = claims.filter(claim => claim.fraudIndicator).length;
      const fraudRate = totalClaims > 0 ? (flaggedClaims / totalClaims) * 100 : 0;

      // Group indicators by type
      const indicatorsByType = this.groupFraudIndicatorsByType(fraudIndicators);

      // Get top suspicious claims
      const topSuspiciousClaims = claims
        .filter(claim => claim.fraudIndicator && claim.fraudProbabilityScore)
        .sort((a, b) => (b.fraudProbabilityScore || 0) - (a.fraudProbabilityScore || 0))
        .slice(0, 10)
        .map(claim => ({
          claimId: claim.id,
          claimNumber: claim.claimNumber,
          indicators: fraudIndicators
            .filter(indicator => indicator.claimId === claim.id)
            .map(indicator => indicator.indicatorName),
          confidenceScore: claim.fraudProbabilityScore || 0
        }));

      const report: FraudIndicatorsReport = {
        period: `${period.from.toISOString().split('T')[0]} to ${period.to.toISOString().split('T')[0]}`,
        totalClaims,
        flaggedClaims,
        fraudRate,
        indicatorsByType,
        topSuspiciousClaims
      };

      return {
        success: true,
        data: report
      };
    } catch (error) {
      logger.error('Failed to generate fraud indicators report', { error, period });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate fraud report'
      };
    }
  }

  /**
   * Generate settlement analysis
   */
  async getSettlementAnalysis(
    period: { from: Date; to: Date },
    filters?: {
      carrierId?: string;
      settlementType?: string[];
    }
  ): Promise<{ success: boolean; data?: SettlementAnalysis; error?: string }> {
    try {
      // Get settled claims for the period
      const settledClaims = await this.getSettledClaims(period, filters || {});
      
      const totalSettlements = settledClaims.length;
      const totalSettlementAmount = settledClaims.reduce((sum, claim) => {
        const settlement = claim.settlements?.[0];
        return sum + (settlement?.settlementAmount || 0);
      }, 0);
      
      const averageSettlementAmount = totalSettlements > 0 
        ? totalSettlementAmount / totalSettlements 
        : 0;

      // Group by settlement type
      const settlementTypes = this.groupSettlementsByType(settledClaims);

      // Calculate average days to settlement
      const averageDaysToSettlement = settledClaims.length > 0
        ? settledClaims.reduce((sum, claim) => {
            const settlement = claim.settlements?.[0];
            if (!settlement?.settlementDate) return sum;
            
            const daysToSettlement = (
              settlement.settlementDate.getTime() - claim.lossDate.getTime()
            ) / (1000 * 60 * 60 * 24);
            
            return sum + daysToSettlement;
          }, 0) / settledClaims.length
        : 0;

      // Calculate settlement success rate (accepted vs proposed)
      const successfulSettlements = settledClaims.filter(claim => {
        const settlement = claim.settlements?.[0];
        return settlement?.settlementStatus === 'ACCEPTED' || settlement?.settlementStatus === 'EXECUTED';
      }).length;

      const settlementSuccessRate = totalSettlements > 0 
        ? (successfulSettlements / totalSettlements) * 100 
        : 0;

      const report: SettlementAnalysis = {
        period: `${period.from.toISOString().split('T')[0]} to ${period.to.toISOString().split('T')[0]}`,
        totalSettlements,
        totalSettlementAmount,
        averageSettlementAmount,
        settlementTypes,
        averageDaysToSettlement,
        settlementSuccessRate
      };

      return {
        success: true,
        data: report
      };
    } catch (error) {
      logger.error('Failed to generate settlement analysis', { error, period });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate settlement analysis'
      };
    }
  }

  /**
   * Export reports in various formats
   */
  async exportReport(exportRequest: ClaimsReportsExport): Promise<{ 
    success: boolean; 
    data?: { downloadUrl: string; fileName: string }; 
    error?: string 
  }> {
    try {
      // Generate report data based on type
      let reportData: any;
      
      switch (exportRequest.reportType) {
        case 'volume':
          const volumeResult = await this.getClaimsVolumeReport(
            { from: exportRequest.filters.reportedDateFrom!, to: exportRequest.filters.reportedDateTo! },
            { carrierId: exportRequest.filters.carrierId }
          );
          reportData = volumeResult.data;
          break;
        
        case 'aging':
          const agingResult = await this.getClaimsAgingReport(
            new Date(),
            { carrierId: exportRequest.filters.carrierId }
          );
          reportData = agingResult.data;
          break;
        
        case 'cost-analysis':
          const costResult = await this.getClaimsCostAnalysis(
            { from: exportRequest.filters.reportedDateFrom!, to: exportRequest.filters.reportedDateTo! },
            { carrierId: exportRequest.filters.carrierId }
          );
          reportData = costResult.data;
          break;
        
        default:
          return {
            success: false,
            error: `Unsupported report type: ${exportRequest.reportType}`
          };
      }

      // Generate file based on format
      const fileName = `${exportRequest.reportType}_report_${Date.now()}.${exportRequest.format}`;
      const downloadUrl = await this.generateReportFile(reportData, exportRequest.format, fileName);

      this.metrics.incrementCounter('reports_exported', { 
        format: exportRequest.format,
        reportType: exportRequest.reportType 
      });

      return {
        success: true,
        data: { downloadUrl, fileName }
      };
    } catch (error) {
      logger.error('Failed to export report', { error, exportRequest });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export report'
      };
    }
  }

  // Helper methods for calculations
  
  private groupClaimsByType(claims: any[]): Record<ClaimType, number> {
    const grouped: Record<string, number> = {};
    
    claims.forEach(claim => {
      const type = claim.claimType;
      grouped[type] = (grouped[type] || 0) + 1;
    });

    // Ensure all types are represented
    const allTypes: ClaimType[] = ['COLLISION', 'THEFT', 'LIABILITY', 'COMPREHENSIVE', 'PROPERTY', 'CASUALTY', 'OTHER'];
    const result: Record<ClaimType, number> = {} as any;
    
    allTypes.forEach(type => {
      result[type] = grouped[type] || 0;
    });

    return result;
  }

  private groupClaimsByStatus(claims: any[]): Record<ClaimStatus, number> {
    const grouped: Record<string, number> = {};
    
    claims.forEach(claim => {
      const status = claim.status;
      grouped[status] = (grouped[status] || 0) + 1;
    });

    // Ensure all statuses are represented
    const allStatuses: ClaimStatus[] = ['REPORTED', 'ASSIGNED', 'INVESTIGATING', 'APPROVED', 'DENIED', 'APPEALED', 'SETTLED', 'CLOSED', 'ARCHIVED'];
    const result: Record<ClaimStatus, number> = {} as any;
    
    allStatuses.forEach(status => {
      result[status] = grouped[status] || 0;
    });

    return result;
  }

  private async groupClaimsByCarrier(claims: any[]): Promise<Array<{ carrierId: string; carrierName: string; count: number }>> {
    const grouped: Record<string, { carrierName: string; count: number }> = {};
    
    for (const claim of claims) {
      if (!claim.carrierId) continue;
      
      if (!grouped[claim.carrierId]) {
        const carrier = await this.getCarrierFromDatabase(claim.carrierId);
        grouped[claim.carrierId] = {
          carrierName: carrier?.name || 'Unknown',
          count: 0
        };
      }
      
      grouped[claim.carrierId].count++;
    }

    return Object.entries(grouped).map(([carrierId, data]) => ({
      carrierId,
      carrierName: data.carrierName,
      count: data.count
    }));
  }

  private calculateDaysInStatus(claims: any[], asOfDate: Date): Array<{
    status: ClaimStatus;
    daysInStatus: string;
    count: number;
    percentage: number;
  }> {
    const statusGroups: Record<string, { claims: any[]; totalDays: number }> = {};

    claims.forEach(claim => {
      const status = claim.status;
      const daysInStatus = (asOfDate.getTime() - claim.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (!statusGroups[status]) {
        statusGroups[status] = { claims: [], totalDays: 0 };
      }
      
      statusGroups[status].claims.push(claim);
      statusGroups[status].totalDays += daysInStatus;
    });

    return Object.entries(statusGroups).map(([status, data]) => {
      const averageDays = data.claims.length > 0 ? data.totalDays / data.claims.length : 0;
      const percentage = claims.length > 0 ? (data.claims.length / claims.length) * 100 : 0;
      
      let daysCategory = '';
      if (averageDays <= 7) daysCategory = '0-7 days';
      else if (averageDays <= 30) daysCategory = '8-30 days';
      else if (averageDays <= 60) daysCategory = '31-60 days';
      else if (averageDays <= 90) daysCategory = '61-90 days';
      else daysCategory = '90+ days';

      return {
        status: status as ClaimStatus,
        daysInStatus: daysCategory,
        count: data.claims.length,
        percentage: Math.round(percentage * 100) / 100
      };
    });
  }

  private calculateAverageDaysInStatus(claims: any[], asOfDate: Date): Record<ClaimStatus, number> {
    const statusTotals: Record<string, { totalDays: number; count: number }> = {};

    claims.forEach(claim => {
      const status = claim.status;
      const daysInStatus = (asOfDate.getTime() - claim.updatedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (!statusTotals[status]) {
        statusTotals[status] = { totalDays: 0, count: 0 };
      }
      
      statusTotals[status].totalDays += daysInStatus;
      statusTotals[status].count++;
    });

    const result: Record<ClaimStatus, number> = {} as any;
    Object.entries(statusTotals).forEach(([status, data]) => {
      result[status as ClaimStatus] = data.count > 0 ? data.totalDays / data.count : 0;
    });

    return result;
  }

  private calculateCostByType(claims: any[]): Record<ClaimType, { reserves: number; paid: number; recovered: number; netCost: number }> {
    const costByType: Record<string, { reserves: number; paid: number; recovered: number; netCost: number }> = {};

    claims.forEach(claim => {
      const type = claim.claimType;
      
      if (!costByType[type]) {
        costByType[type] = { reserves: 0, paid: 0, recovered: 0, netCost: 0 };
      }

      costByType[type].reserves += claim.reservedAmount || 0;
      costByType[type].paid += claim.paidAmount || 0;
      costByType[type].recovered += claim.subrogationRecovery || 0;
      costByType[type].netCost += (claim.paidAmount || 0) - (claim.subrogationRecovery || 0);
    });

    // Ensure all types are represented
    const allTypes: ClaimType[] = ['COLLISION', 'THEFT', 'LIABILITY', 'COMPREHENSIVE', 'PROPERTY', 'CASUALTY', 'OTHER'];
    const result: Record<ClaimType, { reserves: number; paid: number; recovered: number; netCost: number }> = {} as any;
    
    allTypes.forEach(type => {
      result[type] = costByType[type] || { reserves: 0, paid: 0, recovered: 0, netCost: 0 };
    });

    return result;
  }

  private calculateClosureRatesByType(claims: any[]): Record<ClaimType, { closed: number; total: number; rate: number; avgDays: number }> {
    const claimsByType: Record<string, { closed: number; total: number; totalDays: number }> = {};

    claims.forEach(claim => {
      const type = claim.claimType;
      
      if (!claimsByType[type]) {
        claimsByType[type] = { closed: 0, total: 0, totalDays: 0 };
      }

      claimsByType[type].total++;
      
      if (claim.status === ClaimStatus.CLOSED || claim.status === ClaimStatus.ARCHIVED) {
        claimsByType[type].closed++;
        
        const daysToClosure = (claim.updatedAt.getTime() - claim.lossDate.getTime()) / (1000 * 60 * 60 * 24);
        claimsByType[type].totalDays += daysToClosure;
      }
    });

    // Ensure all types are represented
    const allTypes: ClaimType[] = ['COLLISION', 'THEFT', 'LIABILITY', 'COMPREHENSIVE', 'PROPERTY', 'CASUALTY', 'OTHER'];
    const result: Record<ClaimType, { closed: number; total: number; rate: number; avgDays: number }> = {} as any;
    
    allTypes.forEach(type => {
      const data = claimsByType[type] || { closed: 0, total: 0, totalDays: 0 };
      const rate = data.total > 0 ? (data.closed / data.total) * 100 : 0;
      const avgDays = data.closed > 0 ? data.totalDays / data.closed : 0;
      
      result[type] = {
        closed: data.closed,
        total: data.total,
        rate: Math.round(rate * 100) / 100,
        avgDays: Math.round(avgDays * 100) / 100
      };
    });

    return result;
  }

  private groupFraudIndicatorsByType(indicators: any[]): Record<FraudIndicatorType, number> {
    const grouped: Record<string, number> = {};
    
    indicators.forEach(indicator => {
      const type = indicator.indicatorType;
      grouped[type] = (grouped[type] || 0) + 1;
    });

    // Ensure all types are represented
    const allTypes: FraudIndicatorType[] = ['DUPLICATE_CLAIM', 'STAGED_LOSS', 'INFLATED_DAMAGE', 'SUSPICIOUS_TIMING', 'UNUSUAL_PATTERN', 'CLAIMANT_HISTORY'];
    const result: Record<FraudIndicatorType, number> = {} as any;
    
    allTypes.forEach(type => {
      result[type] = grouped[type] || 0;
    });

    return result;
  }

  private groupSettlementsByType(claims: any[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    claims.forEach(claim => {
      const settlement = claim.settlements?.[0];
      if (settlement) {
        const type = settlement.settlementType;
        grouped[type] = (grouped[type] || 0) + 1;
      }
    });

    return grouped;
  }

  private async generateReportFile(data: any, format: string, fileName: string): Promise<string> {
    // Implementation would generate actual file and return download URL
    // For now, return a mock URL
    return `/api/reports/download/${fileName}`;
  }

  // Database abstraction methods
  private async getClaimsForPeriod(period: any, filters: any): Promise<any[]> {
    throw new Error('Database implementation required');
  }

  private async getActiveClaims(filters: any): Promise<any[]> {
    throw new Error('Database implementation required');
  }

  private async getAdjusterFromDatabase(adjusterId: string): Promise<any> {
    throw new Error('Database implementation required');
  }

  private async getAssignedClaimsForPeriod(adjusterId: string, period: any): Promise<any[]> {
    throw new Error('Database implementation required');
  }

  private async getAdjusterEfficiencyScores(adjusterId: string, period: any): Promise<number[]> {
    throw new Error('Database implementation required');
  }

  private async getFraudIndicatorsForClaims(claimIds: string[], period: any): Promise<any[]> {
    throw new Error('Database implementation required');
  }

  private async getSettledClaims(period: any, filters: any): Promise<any[]> {
    throw new Error('Database implementation required');
  }

  private async getCarrierFromDatabase(carrierId: string): Promise<any> {
    throw new Error('Database implementation required');
  }
}