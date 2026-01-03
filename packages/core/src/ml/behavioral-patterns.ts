import { TracingService } from '../index.js';
import { logger } from '../logger.js';

export interface BehavioralProfile {
  leadId: string;
  buyerJourneyStage: 'awareness' | 'consideration' | 'decision' | 'action';
  stageProbability: Record<string, number>;
  keySignals: string[];
  intentStrength: number;
  churnRisk: number;
  expansionOpportunity: number;
  crossSellPropensity: number;
  upSellPropensity: number;
  lastActivity: Date;
  activityPattern: ActivityPattern;
  engagementTrend: EngagementTrend;
  recommendNextActions: string[];
}

export interface ActivityPattern {
  sessionCount: number;
  averageSessionDuration: number;
  pagesVisited: string[];
  formInteractions: number;
  priceCheckInteractions: number;
  comparisonActivities: number;
  helpsSought: number;
  contactAttempts: number;
}

export interface EngagementTrend {
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  trendStrength: number;
  recentActivityScore: number;
  historicalActivityScore: number;
  lastEngagement: Date;
  daysSinceLastActivity: number;
}

export interface ChurnPredictionResult {
  leadId: string;
  churnProbability: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: string[];
  recommendedActions: string[];
  estimatedLifetimeValueAtRisk: number;
}

export interface ExpansionOpportunity {
  leadId: string;
  opportunityType: 'cross_sell' | 'up_sell' | 'renewal' | 'upgrade';
  probability: number;
  estimatedValue: number;
  recommendedProducts: string[];
  timing: 'immediate' | 'short_term' | 'medium_term';
  keyIndicators: string[];
}

export class BehavioralPatternDetector {
  private patternHistory: Map<string, BehavioralProfile[]> = new Map();
  private engagementThresholds = {
    high: 0.8,
    medium: 0.5
  };

  async analyzeLeadBehavior(leadId: string, activities: any[]): Promise<BehavioralProfile> {
    return TracingService.trace('behavioral.analyze', async (span) => {
      const activityPattern = this.analyzeActivityPattern(activities);
      const engagementTrend = this.analyzeEngagementTrend(leadId, activities);
      const buyerJourneyStage = this.detectBuyerJourneyStage(activityPattern, engagementTrend);
      const intentStrength = this.calculateIntentStrength(activityPattern, engagementTrend);
      const churnRisk = this.assessChurnRisk(activityPattern, engagementTrend);
      const expansionOpportunity = this.identifyExpansionOpportunity(activityPattern);

      const profile: BehavioralProfile = {
        leadId,
        buyerJourneyStage: buyerJourneyStage.stage,
        stageProbability: buyerJourneyStage.probabilities,
        keySignals: buyerJourneyStage.signals,
        intentStrength,
        churnRisk,
        expansionOpportunity,
        crossSellPropensity: this.calculateCrossSellPropensity(activityPattern),
        upSellPropensity: this.calculateUpSellPropensity(activityPattern),
        lastActivity: activities[activities.length - 1]?.timestamp || new Date(),
        activityPattern,
        engagementTrend,
        recommendNextActions: this.generateNextActions(buyerJourneyStage.stage, expansionOpportunity)
      };

      this.storeProfile(leadId, profile);

      span.setAttributes({
        'behavioral.lead_id': leadId,
        'behavioral.journey_stage': buyerJourneyStage.stage,
        'behavioral.intent_strength': intentStrength,
        'behavioral.churn_risk': churnRisk,
        'behavioral.signal_count': buyerJourneyStage.signals.length
      });

      logger.info('Behavioral profile analyzed', {
        leadId,
        stage: buyerJourneyStage.stage,
        intentStrength,
        churnRisk
      });

      return profile;
    });
  }

  private analyzeActivityPattern(activities: any[]): ActivityPattern {
    const sessions = this.identifySessions(activities);
    
    return {
      sessionCount: sessions.length,
      averageSessionDuration: this.calculateAverageSessionDuration(sessions),
      pagesVisited: this.extractUniquePages(activities),
      formInteractions: this.countInteractions(activities, 'form'),
      priceCheckInteractions: this.countInteractions(activities, 'price_check'),
      comparisonActivities: this.countInteractions(activities, 'comparison'),
      helpsSought: this.countInteractions(activities, 'help'),
      contactAttempts: this.countInteractions(activities, 'contact')
    };
  }

  private identifySessions(activities: any[]): any[][] {
    const sessions: any[][] = [];
    let currentSession: any[] = [];
    let lastTimestamp = activities[0]?.timestamp || new Date();
    
    for (const activity of activities) {
      const timeDiff = new Date(activity.timestamp).getTime() - new Date(lastTimestamp).getTime();
      
      // New session if gap > 30 minutes
      if (timeDiff > 30 * 60 * 1000 && currentSession.length > 0) {
        sessions.push(currentSession);
        currentSession = [];
      }
      
      currentSession.push(activity);
      lastTimestamp = activity.timestamp;
    }
    
    if (currentSession.length > 0) {
      sessions.push(currentSession);
    }
    
    return sessions;
  }

  private calculateAverageSessionDuration(sessions: any[][]): number {
    if (sessions.length === 0) return 0;
    
    const totalDuration = sessions.reduce((sum, session) => {
      if (session.length < 2) return sum;
      const start = new Date(session[0].timestamp).getTime();
      const end = new Date(session[session.length - 1].timestamp).getTime();
      return sum + (end - start);
    }, 0);
    
    return totalDuration / sessions.length / 1000; // Convert to seconds
  }

  private extractUniquePages(activities: any[]): string[] {
    const pages = new Set<string>();
    
    for (const activity of activities) {
      if (activity.page) pages.add(activity.page);
      if (activity.type === 'page_view') {
        const url = new URL(activity.url || activity.location);
        pages.add(url.pathname);
      }
    }
    
    return Array.from(pages);
  }

  private countInteractions(activities: any[], type: string): number {
    return activities.filter(activity => activity.type === type || 
                            activity.name?.includes(type) || 
                            activity.action?.includes(type)).length;
  }

  private analyzeEngagementTrend(leadId: string, activities: any[]): EngagementTrend {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const recentActivities = activities.filter(a => a.timestamp >= sevenDaysAgo);
    const historicalActivities = activities.filter(a => a.timestamp >= thirtyDaysAgo && a.timestamp < sevenDaysAgo);
    
    const recentScore = this.calculateEngagementScore(recentActivities);
    const historicalScore = this.calculateEngagementScore(historicalActivities);
    const trendStrength = Math.abs(recentScore - historicalScore);
    const trendDirection = recentScore > historicalScore ? 'increasing' : 
                          recentScore < historicalScore ? 'decreasing' : 'stable';
    
    const lastActivity = activities.length > 0 ? activities[activities.length - 1].timestamp : now;
    const daysSinceLastActivity = (now.getTime() - new Date(lastActivity).getTime()) / (24 * 60 * 60 * 1000);
    
    return {
      trendDirection,
      trendStrength,
      recentActivityScore: recentScore,
      historicalActivityScore: historicalScore,
      lastEngagement: new Date(lastActivity),
      daysSinceLastActivity
    };
  }

  private calculateEngagementScore(activities: any[]): number {
    if (activities.length === 0) return 0;
    
    const weights = {
      page_view: 1,
      form_interaction: 3,
      price_check: 4,
      comparison: 3,
      help: 2,
      contact: 5
    };
    
    return activities.reduce((score, activity) => {
      return score + (weights[activity.type] || 1);
    }, 0) / 100; // Normalize to 0-1
  }

  private detectBuyerJourneyStage(
    activityPattern: ActivityPattern,
    engagementTrend: EngagementTrend
  ): { stage: BehavioralProfile['buyerJourneyStage'], probabilities: Record<string, number>, signals: string[] } {
    const signals: string[] = [];
    const probabilities = {
      awareness: 0.0,
      consideration: 0.0,
      decision: 0.0,
      action: 0.0
    };

    // Calculate stage probabilities based on behavioral signals
    
    // Awareness stage: High page views, low form interaction
    const awarenessScore = activityPattern.sessionCount * 0.3 + 
                          activityPattern.pagesVisited.length * 0.4 +
                          (activityPattern.formInteractions === 0 ? 0.3 : 0);
    probabilities.awareness = Math.min(1, awarenessScore / 10);

    // Consideration stage: Mix of exploration and interaction
    const considerationScore = activityPattern.formInteractions * 0.3 +
                              activityPattern.helpSought * 0.2 +
                              (activityPattern.comparisonActivities > 0 ? 0.2 : 0) +
                              engagementTrend.recentActivityScore * 0.3;
    probabilities.consideration = Math.min(1, considerationScore);

    // Decision stage: High interaction, pricing focus
    const decisionScore = activityPattern.priceCheckInteractions * 0.4 +
                         (activityPattern.formInteractions > activityPattern.sessionCount ? 0.3 : 0) +
                         Math.pow(engagementTrend.recentActivityScore, 1.5) * 0.3;
    probabilities.decision = Math.min(1, decisionScore);

    // Action stage: Contact attempts
    const actionScore = activityPattern.contactAttempts * 0.7 +
                       (activityPattern.formInteractions > 2 ? 0.3 : 0);
    probabilities.action = Math.min(1, actionScore / 3);

    // Normalize probabilities
    const total = Object.values(probabilities).reduce((sum, p) => sum + p, 0);
    if (total > 0) {
      Object.keys(probabilities).forEach(key => {
        probabilities[key as keyof typeof probabilities] /= total;
      });
    }

    // Determine current stage
    let stage: BehavioralProfile['buyerJourneyStage'] = 'awareness';
    let maxProbability = 0;
    
    Object.entries(probabilities).forEach(([stageName, probability]) => {
      if (probability > maxProbability) {
        maxProbability = probability;
        stage = stageName as BehavioralProfile['buyerJourneyStage'];
      }
    });

    // Collect signals
    if (activityPattern.contactAttempts > 0) signals.push('Direct contact attempt');
    if (activityPattern.priceCheckInteractions > 2) signals.push('Multiple pricing checks');
    if (activityPattern.comparisonActivities > 0) signals.push('Comparison shopping');
    if (activityPattern.helpSought > 0) signals.push('Requested assistance');
    if (engagementTrend.trendDirection === 'increasing') signals.push('Increasing engagement');
    if (activityPattern.formInteractions > activityPattern.pagesVisited.length * 0.5) signals.push('High interaction rate');

    return { stage, probabilities, signals };
  }

  private calculateIntentStrength(pattern: ActivityPattern, trend: EngagementTrend): number {
    const recency = Math.exp(-trend.daysSinceLastActivity / 30); // Exponential decay
    const engagement = trend.recentActivityScore;
    const interactionIntensity = Math.min(1, pattern.formInteractions / 10);
    const priceFocus = Math.min(1, pattern.priceCheckInteractions / 5);
    
    return (recency * 0.25 + engagement * 0.3 + interactionIntensity * 0.25 + priceFocus * 0.2);
  }

  private assessChurnRisk(pattern: ActivityPattern, trend: EngagementTrend): number {
    if (trend.daysSinceLastActivity > 90) return 0.9; // Very high risk after 90 days
    
    const recencyFactor = Math.min(1, trend.daysSinceLastActivity / 60);
    const engagementDrop = trend.trendDirection === 'decreasing' ? 
                          trend.trendStrength * 0.5 : 0;
    const inactivityFactor = pattern.sessionCount === 0 ? 0.3 : 0;
    
    return Math.min(1, recencyFactor + engagementDrop + inactivityFactor);
  }

  private identifyExpansionOpportunity(pattern: ActivityPattern): number {
    const highEngagement = pattern.sessionCount > 5 ? 0.2 : 0;
    const formDepth = pattern.formInteractions > 3 ? 0.2 : 0;
    const comparisonBehavior = pattern.comparisonActivities > 0 ? 0.3 : 0;
    const priceAware = pattern.priceCheckInteractions > 1 ? 0.3 : 0;
    
    return Math.min(1, highEngagement + formDepth + comparisonBehavior + priceAware);
  }

  private calculateCrossSellPropensity(pattern: ActivityPattern): number {
    const helpSeeking = Math.min(0.4, pattern.helpSought / 10);
    const comparison = Math.min(0.3, pattern.comparisonActivities / 5);
    const broadExploration = Math.min(0.3, pattern.pagesVisited.length / 20);
    
    return helpSeeking + comparison + broadExploration;
  }

  private calculateUpSellPropensity(pattern: ActivityPattern): number {
    const priceSensitivity = Math.min(0.5, pattern.priceCheckInteractions / 8);
    const detailedEngagement = Math.min(0.5, pattern.formInteractions / 10);
    
    return priceSensitivity + detailedEngagement;
  }

  private generateNextActions(stage: BehavioralProfile['buyerJourneyStage'], expansionScore: number): string[] {
    const actions: string[] = [];
    
    switch (stage) {
      case 'awareness':
        actions.push('Send educational content', 'Highlight different insurance types');
        break;
      case 'consideration':
        actions.push('Provide comparison tools', 'Schedule consultation call');
        break;
      case 'decision':
        actions.push('Offer personalized quote', 'Share customer testimonials');
        break;
      case 'action':
        actions.push('Follow up immediately', 'Provide application assistance');
        break;
    }
    
    if (expansionScore > 0.7) {
      actions.push('Suggest additional coverage options');
    }
    
    return actions.slice(0, 3); // Limit to 3 actions
  }

  private storeProfile(leadId: string, profile: BehavioralProfile): void {
    const history = this.patternHistory.get(leadId) || [];
    history.push(profile);
    
    // Keep only last 10 profiles for memory management
    if (history.length > 10) {
      history.shift();
    }
    
    this.patternHistory.set(leadId, history);
  }

  async predictChurn(leadId: string, activities: any[]): Promise<ChurnPredictionResult> {
    const profile = await this.analyzeLeadBehavior(leadId, activities);
    
    const riskLevel = profile.churnRisk > 0.8 ? 'critical' :
                     profile.churnRisk > 0.6 ? 'high' :
                     profile.churnRisk > 0.3 ? 'medium' : 'low';
    
    const riskFactors: string[] = [];
    if (profile.engagementTrend.daysSinceLastActivity > 60) 
      riskFactors.push('Extended period of inactivity');
    if (profile.activityPattern.formInteractions === 0) 
      riskFactors.push('No form interactions recorded');
    if (profile.engagementTrend.trendDirection === 'decreasing')
      riskFactors.push('Declining engagement trend');
    
    const recommendedActions: string[] = [];
    if (profile.churnRisk > 0.6) {
      recommendedActions.push( 
        'Send re-engagement campaign',
        'Offer special consultation session',
        'Provide market updates'
      );
    } else {
      recommendedActions.push('Monitor activity', 'Send regular updates');
    }
    
    const estimatedValue = this.getLeadValue(leadId);
    
    return {
      leadId,
      churnProbability: profile.churnRisk,
      riskLevel,
      riskFactors,
      recommendedActions,
      estimatedLifetimeValueAtRisk: estimatedValue * profile.churnRisk
    };
  }

  private getLeadValue(leadId: string): number {
    // This would query actual lead value from database
    // For now, use a reasonable default
    return 5000; // Typical insurance lead value
  }

  async identifyExpansionOpportunities(leadId: string, activities: any[]): Promise<ExpansionOpportunity[]> {
    const opportunities: ExpansionOpportunity[] = [];
    const profile = await this.analyzeLeadBehavior(leadId, activities);
    
    if (profile.crossSellPropensity > 0.6) {
      opportunities.push({
        leadId,
        opportunityType: 'cross_sell',
        probability: profile.crossSellPropensity,
        estimatedValue: 2000,
        recommendedProducts: this.getCrossSellProducts(profile),
        timing: this.getOptimalTiming(profile),
        keyIndicators: ['Multiple product page views', 'Comparison behavior']
      });
    }
    
    if (profile.upSellPropensity > 0.6) {
      opportunities.push({
        leadId,
        opportunityType: 'up_sell',
        probability: profile.upSellPropensity,
        estimatedValue: 1500,
        recommendedProducts: this.getUpSellProducts(profile),
        timing: this.getOptimalTiming(profile),
        keyIndicators: ['Price sensitivity', 'Detailed engagement']
      });
    }
    
    return opportunities;
  }

  private getCrossSellProducts(profile: BehavioralProfile): string[] {
    // Based on current engagement patterns
    if (profile.activityPattern.pagesVisited.includes('/auto-insurance')) {
      return ['Home Insurance', 'Life Insurance'];
    } else if (profile.activityPattern.pagesVisited.includes('/home-insurance')) {
      return ['Auto Insurance', 'Umbrella Policy'];
    }
    return ['Bundle Packages', 'Liability Coverage'];
  }

  private getUpSellProducts(profile: BehavioralProfile): string[] {
    return ['Premium Coverage', 'Higher Limits', 'Additional Riders'];
  }

  private getOptimalTiming(profile: BehavioralProfile): 'immediate' | 'short_term' | 'medium_term' {
    if (profile.engagementTrend.daysSinceLastActivity < 3) return 'immediate';
    if (profile.engagementTrend.daysSinceLastActivity < 14) return 'short_term';
    return 'medium_term';
  }
}