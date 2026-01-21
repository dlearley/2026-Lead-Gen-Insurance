/**
 * Competitive Intelligence Service
 * Core service for managing competitive intelligence data and analysis
 */
import { Competitor, CompetitorCreateInput, CompetitorUpdateInput, CompetitorActivity, CompetitorActivityCreateInput, WinLoss, WinLossCreateInput, WinLossAnalysis, PricingData, PricingDataCreateInput, MarketShare, MarketShareCreateInput, CompetitiveAlert, CompetitiveAlertCreateInput, CompetitiveAlertUpdateInput, CompetitiveInsight, CompetitiveInsightCreateInput, BattleCard, BattleCardCreateInput, ThreatScoreInput, OpportunityScoreInput, SWOTAnalysis, MarketPositioning, CompetitorTier, AlertSeverity, AlertType, InsightType, Priority, ImpactLevel } from '@insure/types';
export declare class CompetitiveIntelligenceService {
    private prisma;
    constructor(prisma: any);
    createCompetitor(input: CompetitorCreateInput): Promise<Competitor>;
    getCompetitor(id: string): Promise<Competitor | null>;
    listCompetitors(filters?: {
        tier?: CompetitorTier;
        isActive?: boolean;
        search?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        competitors: Competitor[];
        total: number;
    }>;
    updateCompetitor(id: string, input: CompetitorUpdateInput): Promise<Competitor>;
    deleteCompetitor(id: string): Promise<void>;
    calculateThreatScore(competitorId: string, input: ThreatScoreInput): Promise<number>;
    calculateOpportunityScore(competitorId: string, input: OpportunityScoreInput): Promise<number>;
    createActivity(input: CompetitorActivityCreateInput): Promise<CompetitorActivity>;
    listActivities(filters?: {
        competitorId?: string;
        activityType?: string;
        severity?: AlertSeverity;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        activities: CompetitorActivity[];
        total: number;
    }>;
    createWinLoss(input: WinLossCreateInput): Promise<WinLoss>;
    getWinLossAnalysis(startDate?: Date, endDate?: Date): Promise<WinLossAnalysis>;
    createPricingData(input: PricingDataCreateInput): Promise<PricingData>;
    getPricingHistory(competitorId: string, months?: number): Promise<PricingData[]>;
    comparePricing(competitorIds: string[]): Promise<Record<string, PricingData[]>>;
    createMarketShare(input: MarketShareCreateInput): Promise<MarketShare>;
    getMarketShareTrends(market: string, vertical?: string, months?: number): Promise<MarketShare[]>;
    createAlert(input: CompetitiveAlertCreateInput): Promise<CompetitiveAlert>;
    listAlerts(filters?: {
        competitorId?: string;
        alertType?: AlertType;
        severity?: AlertSeverity;
        status?: string;
        startDate?: Date;
        endDate?: Date;
        limit?: number;
        offset?: number;
    }): Promise<{
        alerts: CompetitiveAlert[];
        total: number;
    }>;
    updateAlert(id: string, input: CompetitiveAlertUpdateInput): Promise<CompetitiveAlert>;
    acknowledgeAlert(id: string, userId: string, actionTaken?: string): Promise<CompetitiveAlert>;
    createInsight(input: CompetitiveInsightCreateInput): Promise<CompetitiveInsight>;
    listInsights(filters?: {
        competitorId?: string;
        insightType?: InsightType;
        priority?: Priority;
        impact?: ImpactLevel;
        limit?: number;
        offset?: number;
    }): Promise<{
        insights: CompetitiveInsight[];
        total: number;
    }>;
    createBattleCard(input: BattleCardCreateInput): Promise<BattleCard>;
    getBattleCard(competitorId: string): Promise<BattleCard | null>;
    updateBattleCard(id: string, updates: Partial<BattleCardCreateInput>): Promise<BattleCard>;
    generateSWOTAnalysis(competitorId: string): Promise<SWOTAnalysis>;
    getMarketPositioning(competitorId: string): Promise<MarketPositioning>;
    private generateAlertFromActivity;
    private detectPricingChanges;
    private generateLossPatternInsight;
    getExecutiveDashboard(period?: string): Promise<any>;
    getSalesDashboard(): Promise<any>;
}
//# sourceMappingURL=competitive-intelligence.service.d.ts.map