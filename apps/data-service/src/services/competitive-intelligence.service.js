/**
 * Competitive Intelligence Service
 * Core service for managing competitive intelligence data and analysis
 */
import { WinLossOutcome, AlertSeverity, AlertType, InsightType, Priority, ImpactLevel, } from '@insure/types';
export class CompetitiveIntelligenceService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    // ========================================
    // Competitor Management
    // ========================================
    async createCompetitor(input) {
        const competitor = await this.prisma.competitor.create({
            data: input,
        });
        return competitor;
    }
    async getCompetitor(id) {
        const competitor = await this.prisma.competitor.findUnique({
            where: { id },
            include: {
                activities: { take: 10, orderBy: { detectedAt: 'desc' } },
                pricingHistory: { take: 5, orderBy: { detectedAt: 'desc' } },
                winLosses: { take: 10, orderBy: { createdAt: 'desc' } },
                alerts: { take: 5, orderBy: { createdAt: 'desc' } },
            },
        });
        return competitor;
    }
    async listCompetitors(filters) {
        const where = {};
        if (filters?.tier) {
            where.tier = filters.tier;
        }
        if (filters?.isActive !== undefined) {
            where.isActive = filters.isActive;
        }
        if (filters?.search) {
            where.OR = [
                { name: { contains: filters.search, mode: 'insensitive' } },
                { description: { contains: filters.search, mode: 'insensitive' } },
            ];
        }
        const [competitors, total] = await Promise.all([
            this.prisma.competitor.findMany({
                where,
                orderBy: { threatScore: 'desc' },
                take: filters?.limit || 50,
                skip: filters?.offset || 0,
            }),
            this.prisma.competitor.count({ where }),
        ]);
        return { competitors: competitors, total };
    }
    async updateCompetitor(id, input) {
        const competitor = await this.prisma.competitor.update({
            where: { id },
            data: input,
        });
        return competitor;
    }
    async deleteCompetitor(id) {
        await this.prisma.competitor.delete({
            where: { id },
        });
    }
    async calculateThreatScore(competitorId, input) {
        // Threat score calculation (0-100)
        // Recent activity (30%)
        // Market movement (30%)
        // Win/loss trend (20%)
        // Funding/resources (20%)
        const score = input.recentActivity * 0.3 +
            input.marketMovement * 0.3 +
            input.winLossTrend * 0.2 +
            input.fundingResources * 0.2;
        await this.prisma.competitor.update({
            where: { id: competitorId },
            data: { threatScore: Math.round(score) },
        });
        return Math.round(score);
    }
    async calculateOpportunityScore(competitorId, input) {
        // Opportunity score calculation (0-100)
        // Competitor weakness (40%)
        // Market gap (30%)
        // Customer sentiment (30%)
        const score = input.competitorWeakness * 0.4 +
            input.marketGap * 0.3 +
            input.customerSentiment * 0.3;
        await this.prisma.competitor.update({
            where: { id: competitorId },
            data: { opportunityScore: Math.round(score) },
        });
        return Math.round(score);
    }
    // ========================================
    // Competitor Activity Tracking
    // ========================================
    async createActivity(input) {
        const activity = await this.prisma.competitorActivity.create({
            data: input,
        });
        // Auto-generate alert for high-severity activities
        if (input.severity === AlertSeverity.CRITICAL || input.severity === AlertSeverity.HIGH) {
            await this.generateAlertFromActivity(activity);
        }
        return activity;
    }
    async listActivities(filters) {
        const where = {};
        if (filters?.competitorId) {
            where.competitorId = filters.competitorId;
        }
        if (filters?.activityType) {
            where.activityType = filters.activityType;
        }
        if (filters?.severity) {
            where.severity = filters.severity;
        }
        if (filters?.startDate || filters?.endDate) {
            where.detectedAt = {};
            if (filters.startDate)
                where.detectedAt.gte = filters.startDate;
            if (filters.endDate)
                where.detectedAt.lte = filters.endDate;
        }
        const [activities, total] = await Promise.all([
            this.prisma.competitorActivity.findMany({
                where,
                orderBy: { detectedAt: 'desc' },
                take: filters?.limit || 50,
                skip: filters?.offset || 0,
                include: { competitor: true },
            }),
            this.prisma.competitorActivity.count({ where }),
        ]);
        return { activities: activities, total };
    }
    // ========================================
    // Win/Loss Analysis
    // ========================================
    async createWinLoss(input) {
        const winLoss = await this.prisma.winLoss.create({
            data: {
                ...input,
                buyingCriteria: input.buyingCriteria || [],
                competitorStrengths: input.competitorStrengths || [],
                competitorWeaknesses: input.competitorWeaknesses || [],
                ourStrengths: input.ourStrengths || [],
                ourWeaknesses: input.ourWeaknesses || [],
                actionItems: input.actionItems || [],
            },
        });
        // Trigger insight generation for pattern detection
        if (winLoss.outcome === WinLossOutcome.LOST) {
            await this.generateLossPatternInsight(winLoss);
        }
        return winLoss;
    }
    async getWinLossAnalysis(startDate, endDate) {
        const where = {};
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = startDate;
            if (endDate)
                where.createdAt.lte = endDate;
        }
        const winLosses = await this.prisma.winLoss.findMany({ where });
        const totalDeals = winLosses.length;
        const wins = winLosses.filter((w) => w.outcome === WinLossOutcome.WON);
        const losses = winLosses.filter((w) => w.outcome === WinLossOutcome.LOST);
        const ties = winLosses.filter((w) => w.outcome === WinLossOutcome.TIED);
        const noDecisions = winLosses.filter((w) => w.outcome === WinLossOutcome.NO_DECISION);
        const winRate = totalDeals > 0 ? (wins.length / totalDeals) * 100 : 0;
        // Analyze by competitor
        const competitorWinLoss = {};
        winLosses.forEach((w) => {
            if (!w.competitorId)
                return;
            if (!competitorWinLoss[w.competitorId]) {
                competitorWinLoss[w.competitorId] = { wins: 0, losses: 0, winRate: 0 };
            }
            if (w.outcome === WinLossOutcome.WON) {
                competitorWinLoss[w.competitorId].wins++;
            }
            else if (w.outcome === WinLossOutcome.LOST) {
                competitorWinLoss[w.competitorId].losses++;
            }
        });
        // Calculate win rates by competitor
        Object.keys(competitorWinLoss).forEach((competitorId) => {
            const data = competitorWinLoss[competitorId];
            const total = data.wins + data.losses;
            data.winRate = total > 0 ? (data.wins / total) * 100 : 0;
        });
        // Analyze by vertical
        const winRateByVertical = {};
        winLosses.forEach((w) => {
            if (!w.vertical)
                return;
            if (!winRateByVertical[w.vertical]) {
                winRateByVertical[w.vertical] = { total: 0, wins: 0, winRate: 0 };
            }
            winRateByVertical[w.vertical].total++;
            if (w.outcome === WinLossOutcome.WON) {
                winRateByVertical[w.vertical].wins++;
            }
        });
        Object.keys(winRateByVertical).forEach((vertical) => {
            const data = winRateByVertical[vertical];
            data.winRate = data.total > 0 ? (data.wins / data.total) * 100 : 0;
        });
        // Analyze win/loss reasons
        const winRateByReason = {};
        losses.forEach((w) => {
            const reasons = [w.primaryReason, w.secondaryReason].filter(Boolean);
            reasons.forEach((reason) => {
                if (!reason)
                    return;
                if (!winRateByReason[reason]) {
                    winRateByReason[reason] = { count: 0, percentage: 0 };
                }
                winRateByReason[reason].count++;
            });
        });
        const totalReasons = Object.values(winRateByReason).reduce((sum, r) => sum + r.count, 0);
        Object.keys(winRateByReason).forEach((reason) => {
            winRateByReason[reason].percentage = totalReasons > 0 ? (winRateByReason[reason].count / totalReasons) * 100 : 0;
        });
        // Calculate averages
        const dealAmounts = winLosses.map((w) => w.dealAmount).filter(Boolean);
        const averageDealSize = dealAmounts.length > 0
            ? dealAmounts.reduce((sum, val) => sum + val, 0) / dealAmounts.length
            : 0;
        const dealDurations = winLosses.map((w) => w.dealDurationDays).filter(Boolean);
        const averageDealDuration = dealDurations.length > 0
            ? dealDurations.reduce((sum, val) => sum + val, 0) / dealDurations.length
            : 0;
        return {
            totalDeals,
            wins: wins.length,
            losses: losses.length,
            ties: ties.length,
            winRate,
            competitorWinLoss,
            winRateByVertical,
            winRateByReason,
            averageDealSize,
            averageDealDuration,
        };
    }
    // ========================================
    // Pricing Intelligence
    // ========================================
    async createPricingData(input) {
        const pricingData = await this.prisma.pricingData.create({
            data: {
                ...input,
                features: input.features || [],
                limitations: input.limitations || [],
            },
        });
        // Update last pricing check timestamp
        await this.prisma.competitor.update({
            where: { id: input.competitorId },
            data: { lastPricingCheck: new Date() },
        });
        // Detect significant price changes
        await this.detectPricingChanges(input.competitorId);
        return pricingData;
    }
    async getPricingHistory(competitorId, months = 12) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        const pricingData = await this.prisma.pricingData.findMany({
            where: {
                competitorId,
                detectedAt: { gte: startDate },
            },
            orderBy: { detectedAt: 'desc' },
        });
        return pricingData;
    }
    async comparePricing(competitorIds) {
        const pricingData = await this.prisma.pricingData.findMany({
            where: {
                competitorId: { in: competitorIds },
            },
            orderBy: { detectedAt: 'desc' },
            take: competitorIds.length * 5, // Latest 5 per competitor
        });
        const comparison = {};
        competitorIds.forEach((id) => {
            comparison[id] = pricingData.filter((p) => p.competitorId === id).slice(0, 5);
        });
        return comparison;
    }
    // ========================================
    // Market Share Analysis
    // ========================================
    async createMarketShare(input) {
        const marketShare = await this.prisma.marketShare.create({
            data: input,
        });
        return marketShare;
    }
    async getMarketShareTrends(market, vertical, months = 12) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        const where = {
            market,
            periodStart: { gte: startDate },
        };
        if (vertical) {
            where.vertical = vertical;
        }
        const marketShareData = await this.prisma.marketShare.findMany({
            where,
            orderBy: { periodStart: 'asc' },
            include: { competitor: true },
        });
        return marketShareData;
    }
    // ========================================
    // Alert Management
    // ========================================
    async createAlert(input) {
        const alert = await this.prisma.competitiveAlert.create({
            data: {
                ...input,
                targetAudience: input.targetAudience || [],
            },
        });
        return alert;
    }
    async listAlerts(filters) {
        const where = {};
        if (filters?.competitorId) {
            where.competitorId = filters.competitorId;
        }
        if (filters?.alertType) {
            where.alertType = filters.alertType;
        }
        if (filters?.severity) {
            where.severity = filters.severity;
        }
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.startDate || filters?.endDate) {
            where.createdAt = {};
            if (filters.startDate)
                where.createdAt.gte = filters.startDate;
            if (filters.endDate)
                where.createdAt.lte = filters.endDate;
        }
        const [alerts, total] = await Promise.all([
            this.prisma.competitiveAlert.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: filters?.limit || 50,
                skip: filters?.offset || 0,
                include: { competitor: true },
            }),
            this.prisma.competitiveAlert.count({ where }),
        ]);
        return { alerts: alerts, total };
    }
    async updateAlert(id, input) {
        const updateData = { ...input };
        if (input.status && input.status !== 'ACTIVE') {
            if (input.status === 'ACKNOWLEDGED' || input.status === 'IN_PROGRESS') {
                updateData.acknowledgedAt = new Date();
            }
            else if (input.status === 'RESOLVED') {
                updateData.resolvedAt = new Date();
            }
        }
        const alert = await this.prisma.competitiveAlert.update({
            where: { id },
            data: updateData,
        });
        return alert;
    }
    async acknowledgeAlert(id, userId, actionTaken) {
        return this.updateAlert(id, {
            status: 'ACKNOWLEDGED',
            acknowledgedBy: userId,
            actionTaken,
        });
    }
    // ========================================
    // Insights Generation
    // ========================================
    async createInsight(input) {
        const insight = await this.prisma.competitiveInsight.create({
            data: {
                ...input,
                keyPoints: input.keyPoints || [],
                dataSources: input.dataSources || [],
                recommendations: input.recommendations || [],
                targetTeam: input.targetTeam || [],
                relatedInsights: input.relatedInsights || [],
            },
        });
        return insight;
    }
    async listInsights(filters) {
        const where = {};
        if (filters?.competitorId) {
            where.competitorId = filters.competitorId;
        }
        if (filters?.insightType) {
            where.insightType = filters.insightType;
        }
        if (filters?.priority) {
            where.priority = filters.priority;
        }
        if (filters?.impact) {
            where.impact = filters.impact;
        }
        const [insights, total] = await Promise.all([
            this.prisma.competitiveInsight.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: filters?.limit || 50,
                skip: filters?.offset || 0,
                include: { competitor: true },
            }),
            this.prisma.competitiveInsight.count({ where }),
        ]);
        return { insights: insights, total };
    }
    // ========================================
    // Battle Cards
    // ========================================
    async createBattleCard(input) {
        const battleCard = await this.prisma.battleCard.create({
            data: input,
        });
        return battleCard;
    }
    async getBattleCard(competitorId) {
        const battleCard = await this.prisma.battleCard.findFirst({
            where: { competitorId },
            orderBy: { lastUpdated: 'desc' },
        });
        return battleCard;
    }
    async updateBattleCard(id, updates) {
        const battleCard = await this.prisma.battleCard.update({
            where: { id },
            data: { ...updates, lastUpdated: new Date() },
        });
        return battleCard;
    }
    // ========================================
    // SWOT Analysis
    // ========================================
    async generateSWOTAnalysis(competitorId) {
        const competitor = await this.prisma.competitor.findUnique({
            where: { id: competitorId },
            include: {
                activities: { take: 20, orderBy: { detectedAt: 'desc' } },
                winLosses: { take: 20, orderBy: { createdAt: 'desc' } },
                pricingHistory: { take: 10, orderBy: { detectedAt: 'desc' } },
            },
        });
        if (!competitor) {
            throw new Error('Competitor not found');
        }
        // Analyze activities for strengths and weaknesses
        const strengths = [];
        const weaknesses = [];
        const opportunities = [];
        const threats = [];
        // Extract from activities
        competitor.activities.forEach((activity) => {
            if (activity.impact === 'POSITIVE') {
                strengths.push(`Recent positive ${activity.activityType}: ${activity.title}`);
            }
            else if (activity.impact === 'NEGATIVE') {
                weaknesses.push(`Recent negative ${activity.activityType}: ${activity.title}`);
            }
        });
        // Extract from win/loss data
        const wins = competitor.winLosses.filter((w) => w.outcome === WinLossOutcome.WON);
        const losses = competitor.winLosses.filter((w) => w.outcome === WinLossOutcome.LOST);
        wins.forEach((w) => {
            w.competitorStrengths.forEach((s) => {
                if (!strengths.includes(s))
                    strengths.push(s);
            });
        });
        losses.forEach((w) => {
            w.competitorWeaknesses.forEach((w2) => {
                if (!weaknesses.includes(w2))
                    weaknesses.push(w2);
            });
        });
        // Analyze market position for opportunities and threats
        if (competitor.marketShare && competitor.marketShare > 20) {
            threats.push('Strong market position - direct competition');
        }
        else if (competitor.marketShare && competitor.marketShare < 5) {
            opportunities.push('Weak market share - opportunity to gain market position');
        }
        if (competitor.fundingTotal && competitor.fundingTotal > 10000000) {
            threats.push('Well-funded competitor - resource advantage');
        }
        return {
            strengths,
            weaknesses,
            opportunities,
            threats,
        };
    }
    // ========================================
    // Market Positioning Analysis
    // ========================================
    async getMarketPositioning(competitorId) {
        const competitor = await this.prisma.competitor.findUnique({
            where: { id: competitorId },
            include: {
                pricingHistory: { take: 5, orderBy: { detectedAt: 'desc' } },
                activities: { take: 10, orderBy: { detectedAt: 'desc' } },
            },
        });
        if (!competitor) {
            throw new Error('Competitor not found');
        }
        // Determine price position based on pricing data
        let pricePosition = 'STANDARD';
        if (competitor.pricingHistory.length > 0) {
            const avgPrice = competitor.pricingHistory.reduce((sum, p) => sum + (p.monthlyPrice || 0), 0) /
                competitor.pricingHistory.length;
            if (avgPrice > 1000)
                pricePosition = 'PREMIUM';
            else if (avgPrice < 500)
                pricePosition = 'BUDGET';
        }
        // Determine feature position based on activities
        const featureLaunches = competitor.activities.filter((a) => a.activityType === 'FEATURE_LAUNCH');
        let featurePosition = 'COMPETITIVE';
        if (featureLaunches.length >= 5) {
            featurePosition = 'LEADER';
        }
        else if (featureLaunches.length <= 1) {
            featurePosition = 'FOLLOWER';
        }
        return {
            competitorId: competitor.id,
            competitorName: competitor.name,
            pricePosition,
            featurePosition,
            customerSegment: [], // Would be populated from customer data
            verticalStrength: [], // Would be populated from win/loss data
            marketShare: competitor.marketShare || 0,
            growthRate: 0, // Would be calculated from market share history
        };
    }
    // ========================================
    // Private Helper Methods
    // ========================================
    async generateAlertFromActivity(activity) {
        let alertType;
        let severity = activity.severity;
        switch (activity.activityType) {
            case 'FEATURE_LAUNCH':
                alertType = AlertType.NEW_FEATURE;
                break;
            case 'PRICING_CHANGE':
                alertType = AlertType.PRICING_DROP;
                break;
            case 'FUNDING_ANNOUNCEMENT':
                alertType = AlertType.MAJOR_FUNDING;
                break;
            case 'HIRING_EXPANSION':
                alertType = AlertType.AGGRESSIVE_EXPANSION;
                break;
            case 'MARKET_ENTRY':
                alertType = AlertType.NEW_VERTICAL_ENTRY;
                break;
            default:
                alertType = AlertType.THREAT_ASSESSMENT;
        }
        await this.createAlert({
            competitorId: activity.competitorId,
            activityId: activity.id,
            alertType,
            severity,
            title: `Competitive Activity: ${activity.title}`,
            description: activity.description,
            targetAudience: ['sales', 'product', 'executive'],
        });
    }
    async detectPricingChanges(competitorId) {
        const recentPricing = await this.prisma.pricingData.findMany({
            where: { competitorId },
            orderBy: { detectedAt: 'desc' },
            take: 2,
        });
        if (recentPricing.length < 2)
            return;
        const [current, previous] = recentPricing;
        const priceChange = (current.monthlyPrice || 0) - (previous.monthlyPrice || 0);
        const percentChange = (previous.monthlyPrice || 1) > 0
            ? (priceChange / (previous.monthlyPrice || 1)) * 100
            : 0;
        // Alert on significant price changes
        if (Math.abs(percentChange) >= 10) {
            await this.createAlert({
                competitorId,
                alertType: priceChange < 0 ? AlertType.PRICING_DROP : AlertType.PRICING_INCREASE,
                severity: Math.abs(percentChange) >= 20 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
                title: `Significant ${priceChange < 0 ? 'Price Drop' : 'Price Increase'}`,
                description: `${competitorId} has changed prices by ${percentChange.toFixed(1)}%`,
                recommendation: priceChange < 0
                    ? 'Consider competitive pricing response and prepare for price objections'
                    : 'Review competitive positioning and value proposition',
                targetAudience: ['sales', 'product', 'executive'],
            });
        }
    }
    async generateLossPatternInsight(winLoss) {
        // Check for patterns in recent losses
        const recentLosses = await this.prisma.winLoss.findMany({
            where: {
                outcome: WinLossOutcome.LOST,
                competitorId: winLoss.competitorId,
                createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, // Last 30 days
            },
        });
        if (recentLosses.length >= 3) {
            // Analyze common reasons
            const reasonCounts = {};
            recentLosses.forEach((w) => {
                [w.primaryReason, w.secondaryReason].filter(Boolean).forEach((reason) => {
                    reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
                });
            });
            const commonReasons = Object.entries(reasonCounts)
                .filter(([_, count]) => count >= 2)
                .map(([reason, _]) => reason);
            if (commonReasons.length > 0) {
                await this.createInsight({
                    competitorId: winLoss.competitorId,
                    insightType: InsightType.WIN_LOSS_PATTERN,
                    title: `Loss Pattern Detected vs ${winLoss.competitorId}`,
                    description: `Consistent loss patterns identified over the last 30 days`,
                    keyPoints: [
                        `${recentLosses.length} losses in the last 30 days`,
                        `Common reasons: ${commonReasons.join(', ')}`,
                    ],
                    dataSources: ['win_loss_data'],
                    impact: ImpactLevel.HIGH,
                    priority: Priority.HIGH,
                    recommendations: [
                        'Review competitive positioning',
                        'Address identified feature gaps',
                        'Consider pricing adjustments',
                        'Strengthen relationship-building activities',
                    ],
                    targetTeam: ['sales', 'product', 'executive'],
                });
            }
        }
    }
    // ========================================
    // Dashboard Data
    // ========================================
    async getExecutiveDashboard(period = '30d') {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const [totalCompetitors, activeCompetitors, recentActivities, topThreats, opportunities] = await Promise.all([
            this.prisma.competitor.count(),
            this.prisma.competitor.count({ where: { isActive: true } }),
            this.prisma.competitorActivity.findMany({
                where: { detectedAt: { gte: startDate } },
                orderBy: { detectedAt: 'desc' },
                take: 10,
                include: { competitor: true },
            }),
            this.prisma.competitiveAlert.findMany({
                where: { status: 'ACTIVE', severity: { in: [AlertSeverity.CRITICAL, AlertSeverity.HIGH] } },
                orderBy: { createdAt: 'desc' },
                take: 10,
                include: { competitor: true },
            }),
            this.prisma.competitiveInsight.findMany({
                where: { priority: Priority.IMMEDIATE, impact: ImpactLevel.HIGH },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { competitor: true },
            }),
        ]);
        const winLossAnalysis = await this.getWinLossAnalysis(startDate, new Date());
        return {
            totalCompetitors,
            activeCompetitors,
            marketShareSummary: {}, // Would be populated from market share data
            competitiveWinRate: winLossAnalysis.winRate,
            threatLevel: topThreats.length > 0 ? topThreats[0].severity : AlertSeverity.LOW,
            recentDevelopments: recentActivities,
            topThreats,
            opportunities,
            period,
        };
    }
    async getSalesDashboard() {
        const winLossAnalysis = await this.getWinLossAnalysis();
        return {
            currentCompetitiveDeals: 0, // Would be fetched from CRM
            winRateByCompetitor: winLossAnalysis.competitorWinLoss,
            competitorStrengths: {}, // Would be aggregated from battle cards
            competitorWeaknesses: {}, // Would be aggregated from battle cards
            recentWinLossReasons: Object.keys(winLossAnalysis.winRateByReason).map((r) => r),
            competitiveStrategyByVertical: {}, // Would be populated from strategy data
        };
    }
}
//# sourceMappingURL=competitive-intelligence.service.js.map