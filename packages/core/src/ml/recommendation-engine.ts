import { TracingService } from '../index.js';
import { logger } from '../logger.js';

export interface LeadProfile {
  leadId: string;
  demographics: Record<string, any>;
  behavior: Record<string, any>;
  preferences: Record<string, any>;
  insuranceNeeds: string[];
  engagementHistory: EngagementEvent[];
  conversionPatterns: ConversionPattern[];
}

export interface EngagementEvent {
  timestamp: Date;
  type: string;
  action: string;
  duration?: number;
  success?: boolean;
}

export interface ConversionPattern {
  patternId: string;
  frequency: number;
  successRate: number;
  avgTimeToConvert: number;
}

export interface LeadRecommendation {
  leadId: string;
  recommendationId: string;
  recommendationType: string;
  confidence: number;
  priority: number;
  reason: string;
  estimatedValue: number;
  actionItems: ActionItem[];
  timing: 'immediate' | 'short_term' | 'medium_term' | 'long_term';
}

export interface ActionItem {
  action: string;
  channel: string;
  content: string;
  timing: string;
  expectedOutcome: string;
}

export interface NextBestAction {
  leadId: string;
  action: string;
  channel: string;
  priority: number;
  expectedImpact: string;
  successProbability: number;
  resourcesRequired: string[];
  estimatedCompletionTime: number;
}

export interface WorkflowRecommendation {
  workflowId: string;
  workflowName: string;
  description: string;
  steps: WorkflowStep[];
  estimatedDuration: number;
  successRate: number;
  recommendedFor: string[];
  customizationOptions: string[];
}

export interface WorkflowStep {
  stepId: string;
  action: string;
  actor: string;
  dependencies: string[];
  estimatedTime: number;
  requiredData: string[];
}

export interface FeatureRecommendation {
  featureId: string;
  featureName: string;
  benefits: string[];
  adoptionRate: number;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedTimeToValue: number;
  prerequisiteFeatures: string[];
  similarCustomers: string[];
}

export interface ContentRecommendation {
  contentId: string;
  type: string;
  title: string;
  description: string;
  estimatedReadTime: number;
  difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
  prerequisites: string[];
  completionRate: number;
  customerSatisfaction: number;
}

export class RecommendationEngine {
  private leadProfiles: Map<string, LeadProfile> = new Map();
  private workflowTemplates: Map<string, WorkflowRecommendation> = new Map();
  private featureLibrary: Map<string, FeatureRecommendation> = new Map();
  private contentLibrary: Map<string, ContentRecommendation> = new Map();

  constructor() {
    this.initializeDefaultTemplates();
  }

  private initializeDefaultTemplates(): void {
    // Initialize workflow templates
    this.workflowTemplates.set('high_value_lead', {
      workflowId: 'high_value_lead',
      workflowName: 'High-Value Lead Nurture',
      description: 'Optimized workflow for high-value insurance leads',
      steps: [
        {
          stepId: 'initial_contact',
          action: 'Send personalized welcome email',
          actor: 'system',
          dependencies: [],
          estimatedTime: 5,
          requiredData: ['lead_email', 'lead_name']
        },
        {
          stepId: 'qualification_call',
          action: 'Schedule qualification call within 2 hours',
          actor: 'sales_agent',
          dependencies: ['initial_contact'],
          estimatedTime: 30,
          requiredData: ['lead_phone', 'agent_availability']
        },
        {
          stepId: 'needs_assessment',
          action: 'Conduct comprehensive needs assessment',
          actor: 'sales_agent',
          dependencies: ['qualification_call'],
          estimatedTime: 45,
          requiredData: ['assessment_form', 'product_catalog']
        },
        {
          stepId: 'custom_proposal',
          action: 'Generate and send custom insurance proposal',
          actor: 'system',
          dependencies: ['needs_assessment'],
          estimatedTime: 60,
          requiredData: ['proposal_template', 'pricing_engine']
        }
      ],
      estimatedDuration: 360,
      successRate: 0.65,
      recommendedFor: ['high_score_leads', 'enterprise_leads'],
      customizationOptions: ['email_templates', 'call_scripts', 'proposal_format']
    });

    // Initialize feature recommendations
    this.featureLibrary.set('advanced_analytics', {
      featureId: 'advanced_analytics',
      featureName: 'Advanced Analytics Dashboard',
      benefits: [
        'Real-time performance monitoring',
        'Predictive lead scoring',
        'ROI tracking',
        'Custom report builder'
      ],
      adoptionRate: 0.78,
      complexity: 'moderate',
      estimatedTimeToValue: 14,
      prerequisiteFeatures: ['basic_reporting', 'data_export'],
      similarCustomers: ['Enterprise A', 'Company B', 'Organization C']
    });

    // Initialize content recommendations
    this.contentLibrary.set('lead_scoring_guide', {
      contentId: 'lead_scoring_guide',
      type: 'training',
      title: 'Mastering Lead Scoring: Best Practices Guide',
      description: 'Comprehensive guide to implementing and optimizing lead scoring',
      estimatedReadTime: 25,
      difficultyLevel: 'intermediate',
      prerequisites: ['basic_crm_knowledge'],
      completionRate: 0.82,
      customerSatisfaction: 4.6
    });
  }

  async generateLeadRecommendations(profile: LeadProfile): Promise<LeadRecommendation[]> {
    return TracingService.trace('recommendations.lead', async (span) => {
      const recommendations: LeadRecommendation[] = [];
      
      // Analyze lead profile and generate personalized recommendations
      const score = this.calculateLeadScore(profile);
      const behaviorPattern = this.analyzeBehaviorPattern(profile);
      const engagementLevel = this.calculateEngagementLevel(profile);
      
      // Generate lead-specific recommendations
      if (score > 80 && engagementLevel > 0.7) {
        recommendations.push({
          leadId: profile.leadId,
          recommendationId: `priority_followup_${Date.now()}`,
          recommendationType: 'PRIORITY_FOLLOWUP',
          confidence: 0.9,
          priority: 10,
          reason: 'High-scoring lead with strong engagement',
          estimatedValue: this.estimateLeadValue(profile),
          actionItems: this.generatePriorityActions(profile),
          timing: 'immediate'
        });
      }

      if (behaviorPattern.showsComparisonShopping) {
        recommendations.push({
          leadId: profile.leadId,
          recommendationId: `competitive_offer_${Date.now()}`,
          recommendationType: 'COMPETITIVE_OFFER',
          confidence: 0.85,
          priority: 8,
          reason: 'Lead is comparing multiple options',
          estimatedValue: this.estimateLeadValue(profile) * 1.2,
          actionItems: this.generateCompetitiveActions(profile),
          timing: 'short_term'
        });
      }

      if (engagementLevel < 0.3) {
        recommendations.push({
          leadId: profile.leadId,
          recommendationId: `reengagement_${Date.now()}`,
          recommendationType: 'REENGAGEMENT',
          confidence: 0.75,
          priority: 5,
          reason: 'Lead engagement has decreased',
          estimatedValue: this.estimateLeadValue(profile) * 0.7,
          actionItems: this.generateReengagementActions(profile),
          timing: 'short_term'
        });
      }

      // Cross-sell recommendations
      if (profile.insuranceNeeds.length === 1 && score > 60) {
        recommendations.push({
          leadId: profile.leadId,
          recommendationId: `cross_sell_${Date.now()}`,
          recommendationType: 'CROSS_SELL',
          confidence: 0.8,
          priority: 6,
          reason: 'Opportunity to expand coverage types',
          estimatedValue: this.estimateCrossSellValue(profile),
          actionItems: this.generateCrossSellActions(profile),
          timing: 'medium_term'
        });
      }

      // Sort by priority and limit to top 5 recommendations
      recommendations.sort((a, b) => b.priority - a.priority);
      const topRecommendations = recommendations.slice(0, 5);

      span.setAttributes({
        'recommendations.lead_id': profile.leadId,
        'recommendations.count': topRecommendations.length,
        'recommendations.confidence_avg': topRecommendations.reduce((sum, r) => sum + r.confidence, 0) / topRecommendations.length
      });

      logger.info('Lead recommendations generated', {
        leadId: profile.leadId,
        recommendationCount: topRecommendations.length,
        avgConfidence: topRecommendations.reduce((sum, r) => sum + r.confidence, 0) / topRecommendations.length
      });

      return topRecommendations;
    });
  }

  async getNextBestAction(profile: LeadProfile): Promise<NextBestAction> {
    return TracingService.trace('recommendations.next_action', async (span) => {
      const leadScore = this.calculateLeadScore(profile);
      const engagement = this.calculateEngagementLevel(profile);
      const daysSinceLastActivity = this.getDaysSinceLastActivity(profile);
      
      let action: NextBestAction;

      // Determine optimal next action based on lead state
      if (leadScore > 90 && engagement > 0.8) {
        action = {
          leadId: profile.leadId,
          action: 'Schedule immediate sales call',
          channel: 'phone',
          priority: 10,
          expectedImpact: 'High probability of conversion within 48 hours',
          successProbability: 0.75,
          resourcesRequired: ['sales_agent', 'call_script', 'product_info'],
          estimatedCompletionTime: 30
        };
      } else if (engagement < 0.3 || daysSinceLastActivity > 30) {
        action = {
          leadId: profile.leadId,
          action: 'Send personalized re-engagement email',
          channel: 'email',
          priority: 6,
          expectedImpact: 'Reactivate dormant lead',
          successProbability: 0.4,
          resourcesRequired: ['email_template', 'personalization_data'],
          estimatedCompletionTime: 5
        };
      } else if (profile.behavior.pricingPageViews > 2) {
        action = {
          leadId: profile.leadId,
          action: 'Send competitive pricing comparison',
          channel: 'email',
          priority: 8,
          expectedImpact: 'Address price concerns and demonstrate value',
          successProbability: 0.6,
          resourcesRequired: ['pricing_comparison_tool', 'competitive_analysis'],
          estimatedCompletionTime: 15
        };
      } else {
        action = {
          leadId: profile.leadId,
          action: 'Share educational content based on interests',
          channel: 'email',
          priority: 5,
          expectedImpact: 'Build trust and move lead through funnel',
          successProbability: 0.5,
          resourcesRequired: ['content_library', 'personalization_engine'],
          estimatedCompletionTime: 10
        };
      }

      span.setAttributes({
        'recommendations.action': action.action,
        'recommendations.priority': action.priority,
        'recommendations.success_probability': action.successProbability
      });

      logger.info('Next best action determined', {
        leadId: profile.leadId,
        action: action.action,
        priority: action.priority,
        successProbability: action.successProbability
      });

      return action;
    });
  }

  async recommendWorkflow(profile: LeadProfile): Promise<WorkflowRecommendation | null> {
    return TracingService.trace('recommendations.workflow', async (span) => {
      const score = this.calculateLeadScore(profile);
      const engagement = this.calculateEngagementLevel(profile);
      
      let recommendedWorkflow: WorkflowRecommendation | null = null;

      // Select appropriate workflow based on lead characteristics
      if (score > 85 && this.isEnterpriseLead(profile)) {
        recommendedWorkflow = this.workflowTemplates.get('high_value_lead') || null;
      } else if (score > 70 && engagement > 0.6) {
        recommendedWorkflow = this.workflowTemplates.get('high_value_lead') || null;
      } else if (score > 50) {
        recommendedWorkflow = this.workflowTemplates.get('standard_nurture') || this.workflowTemplates.get('high_value_lead') || null;
      }

      if (recommendedWorkflow) {
        span.setAttributes({
          'recommendations.workflow_id': recommendedWorkflow.workflowId,
          'recommendations.success_rate': recommendedWorkflow.successRate
        });

        logger.info('Workflow recommendation generated', {
          leadId: profile.leadId,
          workflow: recommendedWorkflow.workflowName,
          successRate: recommendedWorkflow.successRate
        });
      }

      return recommendedWorkflow;
    });
  }

  async recommendFeatures(customerProfile: any): Promise<FeatureRecommendation[]> {
    return TracingService.trace('recommendations.features', async (span) => {
      const recommendations: FeatureRecommendation[] = [];
      
      for (const [featureId, feature] of this.featureLibrary) {
        const relevanceScore = this.calculateFeatureRelevance(feature, customerProfile);
        
        if (relevanceScore > 0.6) {
          recommendations.push({
            ...feature,
            relevanceScore
          });
        }
      }

      // Sort by relevance and limit top recommendations
      recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
      const topFeatures = recommendations.slice(0, 5);

      span.setAttributes({
        'recommendations.feature_count': topFeatures.length,
        'recommendations.avg_relevance': topFeatures.reduce((sum, f) => sum + f.relevanceScore, 0) / topFeatures.length
      });

      logger.info('Feature recommendations generated', {
        customerId: customerProfile.customerId,
        featureCount: topFeatures.length,
        topFeature: topFeatures[0]?.featureName
      });

      return topFeatures;
    });
  }

  async recommendContent(customerProfile: any, context: string): Promise<ContentRecommendation[]> {
    return TracingService.trace('recommendations.content', async (span) => {
      const recommendations: ContentRecommendation[] = [];
      
      for (const [contentId, content] of this.contentLibrary) {
        const relevance = this.calculateContentRelevance(content, customerProfile, context);
        
        if (relevance > 0.5) {
          const personalizedContent = this.personalizeContent(content, customerProfile);
          recommendations.push(personalizedContent);
        }
      }

      // Sort by relevance and customer satisfaction
      recommendations.sort((a, b) => 
        (b.relevanceScore * b.customerSatisfaction) - (a.relevanceScore * a.customerSatisfaction)
      );
      
      const topContent = recommendations.slice(0, 3);

      span.setAttributes({
        'recommendations.content_count': topContent.length,
        'recommendations.context': context
      });

      logger.info('Content recommendations generated', {
        customerId: customerProfile.customerId,
        contentCount: topContent.length,
        context
      });

      return topContent;
    });
  }

  private calculateLeadScore(profile: LeadProfile): number {
    let score = 50; // Base score
    
    // Demographics score
    if (profile.demographics.age && profile.demographics.age >= 25 && profile.demographics.age <= 65) {
      score += 10;
    }
    
    if (profile.demographics.income && profile.demographics.income > 50000) {
      score += 15;
    }
    
    // Behavioral score
    const activityCount = profile.engagementHistory.length;
    score += Math.min(20, activityCount * 2);
    
    // Engagement score
    const recentActivities = profile.engagementHistory.filter(e => 
      e.timestamp > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );
    score += recentActivities.length * 3;
    
    return Math.min(100, Math.max(0, score));
  }

  private calculateEngagementLevel(profile: LeadProfile): number {
    if (profile.engagementHistory.length === 0) return 0;
    
    const recentDays = 30;
    const cutoffDate = new Date(Date.now() - recentDays * 24 * 60 * 60 * 1000);
    const recentActivities = profile.engagementHistory.filter(e => e.timestamp > cutoffDate);
    
    const activityScore = recentActivities.length / 10; // Normalize to 0-1
    const successScore = recentActivities.filter(e => e.success).length / Math.max(1, recentActivities.length);
    
    return Math.min(1, (activityScore + successScore) / 2);
  }

  private analyzeBehaviorPattern(profile: LeadProfile): any {
    return {
      showsComparisonShopping: profile.behavior.comparisonPageVisits > 0,
      priceSensitive: profile.behavior.pricingPageViews > 2,
      needsInformation: profile.behavior.helpPageViews > 1,
      readyToPurchase: this.calculatePurchaseReadiness(profile)
    };
  }

  private calculatePurchaseReadiness(profile: LeadProfile): number {
    const weights = {
      quoteRequests: 0.4,
      pricingViews: 0.3,
      contactAttempts: 0.2,
      demoRequests: 0.1
    };
    
    let score = 0;
    score += (profile.behavior.quoteRequests || 0) * weights.quoteRequests;
    score += (profile.behavior.pricingPageViews || 0) * 0.1 * weights.pricingViews;
    score += (profile.behavior.contactAttempts || 0) * weights.contactAttempts;
    score += (profile.behavior.demoRequests || 0) * weights.demoRequests;
    
    return Math.min(1, score);
  }

  private isEnterpriseLead(profile: LeadProfile): boolean {
    return profile.demographics.companySize > 100 || 
           profile.demographics.annualRevenue > 10000000;
  }

  private estimateLeadValue(profile: LeadProfile): number {
    const baseValue = 5000; // Base insurance lead value
    const scoreMultiplier = this.calculateLeadScore(profile) / 100;
    const enterpriseBonus = this.isEnterpriseLead(profile) ? 1.5 : 1.0;
    
    return baseValue * scoreMultiplier * enterpriseBonus;
  }

  private estimateCrossSellValue(profile: LeadProfile): number {
    const baseValue = this.estimateLeadValue(profile);
    return baseValue * 0.3; // Cross-sell typically worth 30% of initial sale
  }

  private generatePriorityActions(profile: LeadProfile): ActionItem[] {
    return [
      {
        action: 'Immediate personalized outreach',
        channel: 'phone',
        content: 'High-priority lead with strong engagement profile',
        timing: 'within 1 hour',
        expectedOutcome: 'Schedule qualified meeting'
      },
      {
        action: 'Send customized proposal',
        channel: 'email',
        content: 'Tailored insurance options based on profile and behavior',
        timing: 'within 4 hours',
        expectedOutcome: 'Move to decision stage'
      }
    ];
  }

  private generateCompetitiveActions(profile: LeadProfile): ActionItem[] {
    return [
      {
        action: 'Send competitive comparison',
        channel: 'email',
        content: 'Side-by-side comparison highlighting unique value',
        timing: 'within 2 hours',
        expectedOutcome: 'Address comparison concerns'
      },
      {
        action: 'Special offer consultation',
        channel: 'phone',
        content: 'Exclusive pricing or terms for qualified leads',
        timing: 'within 24 hours',
        expectedOutcome: 'Convert comparison shopper'
      }
    ];
  }

  private generateReengagementActions(profile: LeadProfile): ActionItem[] {
    return [
      {
        action: 'Send re-engagement campaign',
        channel: 'email',
        content: 'New products, features, or compelling content',
        timing: 'within 48 hours',  };  // ... (truncated for brevity)
    // Continuing the ActionItem generation functions...
        expectedOutcome: 'Reactivate dormant lead'
      },
      {
        action: 'Survey for feedback',
        channel: 'email',
        content: 'Request input on experience and needs',
        timing: 'within 1 week',
        expectedOutcome: 'Identify barriers to engagement'
      }
    ];
  }

  private generateCrossSellActions(profile: LeadProfile): ActionItem[] {
    const currentInsurance = profile.insuranceNeeds[0];
    const crossSellOptions = this.getCrossSellOptions(currentInsurance);
    
    return [
      {
        action: 'Introduce complementary products',
        channel: 'email',
        content: `Bundle opportunities for ${crossSellOptions.join(', ')}`,
        timing: 'within 1 week',
        expectedOutcome: 'Expand coverage portfolio'
      }
    ];
  }

  private getCrossSellOptions(currentInsurance: string): string[] {
    const crossSellMap: Record<string, string[]> = {
      'auto': ['home', 'umbrella'],
      'home': ['auto', 'life'],
      'life': ['disability', 'long_term_care'],
      'health': ['dental', 'vision']
    };
    
    return crossSellMap[currentInsurance] || ['bundle_packages'];
  }

  private calculateFeatureRelevance(feature: FeatureRecommendation, customerProfile: any): number {
    const useCaseMatch = this.calculateUseCaseMatch(feature, customerProfile);
    const complexitySuitability = this.calculateComplexitySuitability(feature, customerProfile);
    const adoptionConfidence = feature.adoptionRate;
    
    return (useCaseMatch * 0.4 + complexitySuitability * 0.3 + adoptionConfidence * 0.3);
  }

  private calculateUseCaseMatch(feature: FeatureRecommendation, customerProfile: any): number {
    // Simple matching based on customer size and industry
    if (customerProfile.employeeCount > 50 && feature.benefits.some(b => b.includes('enterprise'))) {
      return 0.9;
    }
    return 0.5;
  }

  private calculateComplexitySuitability(feature: FeatureRecommendation, customerProfile: any): number {
    const complexityMap = {
      'simple': 0.1,
      'moderate': 0.05,
      'complex': 0.02
    };
    
    const timeLimit = customerProfile.availableHours || 40;
    const estimatedTime = feature.estimatedTimeToValue * complexityMap[feature.complexity];
    
    return estimatedTime < timeLimit ? 0.8 : 0.3;
  }

  private calculateContentRelevance(
    content: ContentRecommendation, 
    customerProfile: any, 
    context: string
  ): number {
    const profileMatch = this.calculateProfileMatch(content, customerProfile);
    const contextMatch = this.calculateContextMatch(content, context);
    const successScore = content.completionRate * content.customerSatisfaction / 5; // Normalize satisfaction to 0-1
    
    return (profileMatch * 0.3 + contextMatch * 0.3 + successScore * 0.4);
  }

  private calculateProfileMatch(content: ContentRecommendation, customerProfile: any): number {
    if (customerProfile.experienceLevel === content.difficultyLevel) {
      return 0.8;
    }
    return 0.4;
  }

  private calculateContextMatch(content: ContentRecommendation, context: string): number {
    // Simple keyword matching
    const contextTokens = context.toLowerCase().split(' ');
    const titleTokens = content.title.toLowerCase().split(' ');
    
    const overlap = contextTokens.filter(token => 
      titleTokens.some(titleToken => titleToken.includes(token) || token.includes(titleToken))
    ).length;
    
    return Math.min(1, overlap / 3);
  }

  private personalizeContent(content: ContentRecommendation, customerProfile: any): ContentRecommendation {
    // Add personalization based on customer profile
    return {
      ...content,
      personalization: {
        basedOn: customerProfile.industry || 'general',
        tailoredSections: content.type === 'training' ? ['examples', 'use_cases'] : []
      },
      relevanceScore: this.calculateContentRelevance(content, customerProfile, '')
    };
  }

  private getDaysSinceLastActivity(profile: LeadProfile): number {
    if (profile.engagementHistory.length === 0) return 999;
    
    const lastActivity = profile.engagementHistory[profile.engagementHistory.length - 1].timestamp;
    const daysDiff = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
    
    return Math.floor(daysDiff);
  }

  addWorkflowTemplate(template: WorkflowRecommendation): void {
    this.workflowTemplates.set(template.workflowId, template);
    logger.info('Workflow template added', { workflowId: template.workflowId });
  }

  addFeature(feature: FeatureRecommendation): void {
    this.featureLibrary.set(feature.featureId, feature);
    logger.info('Feature added to library', { featureId: feature.featureId });
  }

  addContent(content: ContentRecommendation): void {
    this.contentLibrary.set(content.contentId, content);
    logger.info('Content added to library', { contentId: content.contentId });
  }

  updateLeadProfile(profile: LeadProfile): void {
    this.leadProfiles.set(profile.leadId, profile);
    logger.info('Lead profile updated', { leadId: profile.leadId });
  }
}