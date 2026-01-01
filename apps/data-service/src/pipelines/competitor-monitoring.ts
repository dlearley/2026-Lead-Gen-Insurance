/**
 * Competitor Monitoring Pipeline
 * Orchestrates data collection, analysis, and alert generation for competitive intelligence
 */

import { WebScraper, ScrapingConfig, ScrapingResult } from '../integrations/web-scraper';
import { NewsMonitor, NewsArticle, NewsMonitoringConfig, DEFAULT_NEWS_SOURCES } from '../integrations/news-api';
import { CompetitiveIntelligenceService } from '../services/competitive-intelligence.service';
import {
  Competitor,
  ActivityType,
  AlertSeverity,
  AlertType,
} from '@insure/types';

export interface MonitoringPipelineConfig {
  websiteScanIntervalHours: number;
  newsCheckIntervalHours: number;
  pricingCheckIntervalHours: number;
  batchCompetitorIds?: string[];
}

export interface MonitoringResult {
  competitorId: string;
  timestamp: Date;
  websiteResults?: ScrapingResult[];
  newsArticles?: NewsArticle[];
  activitiesCreated: number;
  alertsCreated: number;
  errors: string[];
}

export class CompetitorMonitoringPipeline {
  private ciService: CompetitiveIntelligenceService;
  private webScraper: WebScraper;
  private newsMonitor: NewsMonitor;
  private config: MonitoringPipelineConfig;

  constructor(
    ciService: CompetitiveIntelligenceService,
    config: MonitoringPipelineConfig = {
      websiteScanIntervalHours: 24,
      newsCheckIntervalHours: 12,
      pricingCheckIntervalHours: 24,
    }
  ) {
    this.ciService = ciService;
    this.webScraper = new WebScraper();
    this.newsMonitor = new NewsMonitor({
      competitorKeywords: [],
      sources: DEFAULT_NEWS_SOURCES,
      lookbackDays: 7,
      maxArticlesPerSource: 50,
    });
    this.config = config;
  }

  async runFullMonitoring(): Promise<MonitoringResult[]> {
    const competitors = await this.getCompetitorsToMonitor();
    const results: MonitoringResult[] = [];

    for (const competitor of competitors) {
      try {
        const result = await this.monitorCompetitor(competitor);
        results.push(result);
      } catch (error) {
        console.error(`Error monitoring competitor ${competitor.id}:`, error);
        results.push({
          competitorId: competitor.id,
          timestamp: new Date(),
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          activitiesCreated: 0,
          alertsCreated: 0,
        });
      }
    }

    return results;
  }

  async monitorCompetitor(competitor: Competitor): Promise<MonitoringResult> {
    const timestamp = new Date();
    const errors: string[] = [];
    let activitiesCreated = 0;
    let alertsCreated = 0;

    // Update news monitor with competitor keywords
    this.newsMonitor.updateConfig({
      competitorKeywords: [competitor.name, ...(competitor.metadata?.aliases || [])],
    });

    // 1. Monitor website
    let websiteResults: ScrapingResult[] = [];
    if (competitor.website) {
      try {
        websiteResults = await this.monitorWebsite(competitor);
        const websiteActivities = await this.createActivitiesFromScraping(competitor.id, websiteResults);
        activitiesCreated += websiteActivities.length;
      } catch (error) {
        errors.push(`Website monitoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 2. Monitor news
    let newsArticles: NewsArticle[] = [];
    try {
      newsArticles = await this.monitorNews(competitor);
      const newsActivities = await this.createActivitiesFromNews(competitor.id, newsArticles);
      activitiesCreated += newsActivities.length;
    } catch (error) {
      errors.push(`News monitoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // 3. Check pricing (if enabled)
    if (competitor.website && this.shouldCheckPricing(competitor)) {
      try {
        const pricingActivities = await this.monitorPricing(competitor);
        activitiesCreated += pricingActivities.length;
      } catch (error) {
        errors.push(`Pricing monitoring failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 4. Update monitoring timestamps
    try {
      await this.updateMonitoringTimestamps(competitor.id);
    } catch (error) {
      errors.push(`Failed to update timestamps: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return {
      competitorId: competitor.id,
      timestamp,
      websiteResults,
      newsArticles,
      activitiesCreated,
      alertsCreated,
      errors,
    };
  }

  async monitorWebsite(competitor: Competitor): Promise<ScrapingResult[]> {
    const results: ScrapingResult[] = [];

    if (!competitor.website) {
      return results;
    }

    // Main website scrape
    const mainConfig: ScrapingConfig = {
      url: competitor.website,
      selectors: {
        pricing: '.pricing, .plans, .pricing-table',
        features: '.features, .capabilities, .what-we-offer',
        announcements: '.news, .announcements, .blog, .press-releases',
        content: 'body',
      },
    };

    const mainResult = await this.webScraper.scrape(mainConfig);
    results.push(mainResult);

    // Check for changes
    if (mainResult.success && mainResult.extracted?.contentChanges?.hasChanges) {
      await this.createWebsiteChangeActivity(competitor.id, mainResult);
    }

    return results;
  }

  async monitorNews(competitor: Competitor): Promise<NewsArticle[]> {
    const articles = await this.newsMonitor.fetchLatestNews();

    // Filter articles mentioning this competitor
    const competitorArticles = articles.filter((article) => {
      const text = `${article.title} ${article.description || ''}`.toLowerCase();
      return text.includes(competitor.name.toLowerCase());
    });

    return competitorArticles;
  }

  async monitorPricing(competitor: Competitor): Promise<number> {
    let activitiesCreated = 0;

    if (!competitor.website) {
      return activitiesCreated;
    }

    const pricingData = await this.webScraper.scrapePricing(competitor.website);

    if (pricingData && Array.isArray(pricingData) && pricingData.length > 0) {
      // Get previous pricing data
      const previousPricing = await this.ciService.getPricingHistory(competitor.id, 3);

      // Detect price changes
      for (const current of pricingData) {
        const previous = previousPricing.find((p) => p.planName === current.planName);

        if (previous && previous.monthlyPrice !== current.price) {
          await this.createPricingChangeActivity(competitor.id, previous, current);
          activitiesCreated++;
        }

        // Create pricing data record
        await this.ciService.createPricingData({
          competitorId: competitor.id,
          productName: current.planName,
          planName: current.planName,
          monthlyPrice: current.price,
          features: current.features || [],
          billingFrequency: 'monthly',
          freeTierAvailable: current.price === 0,
        });
      }
    }

    return activitiesCreated;
  }

  async createActivitiesFromScraping(
    competitorId: string,
    results: ScrapingResult[]
  ): Promise<number> {
    let activitiesCreated = 0;

    for (const result of results) {
      if (!result.success || !result.extracted) {
        continue;
      }

      // Pricing changes
      if (result.extracted.pricing) {
        // Activities will be created by monitorPricing
      }

      // New features detected
      if (result.extracted.announcements && result.extracted.announcements.length > 0) {
        for (const announcement of result.extracted.announcements) {
          const isFeatureLaunch = this.isFeatureLaunch(announcement);
          if (isFeatureLaunch) {
            await this.ciService.createActivity({
              competitorId,
              activityType: ActivityType.FEATURE_LAUNCH,
              title: 'New Feature Detected',
              description: announcement,
              source: 'website',
              severity: AlertSeverity.MEDIUM,
              url: result.url,
            });
            activitiesCreated++;
          }
        }
      }

      // Website updates
      if (result.extracted.contentChanges?.hasChanges) {
        await this.ciService.createActivity({
          competitorId,
          activityType: ActivityType.WEBSITE_UPDATE,
          title: 'Website Content Updated',
          description: `Detected ${result.extracted.contentChanges.added.length} additions and ${result.extracted.contentChanges.removed.length} removals`,
          source: 'website',
          severity: AlertSeverity.LOW,
          url: result.url,
        });
        activitiesCreated++;
      }
    }

    return activitiesCreated;
  }

  async createActivitiesFromNews(competitorId: string, articles: NewsArticle[]): Promise<number> {
    let activitiesCreated = 0;

    for (const article of articles) {
      const activityType = this.classifyNewsArticle(article);
      const severity = this.determineNewsSeverity(article);

      await this.ciService.createActivity({
        competitorId,
        activityType,
        title: article.title,
        description: article.description,
        source: article.source,
        severity,
        url: article.url,
        metadata: {
          publishedAt: article.publishedAt,
          sentiment: article.sentiment,
          mentions: article.mentions,
          relevance: article.relevanceScore,
        },
      });

      activitiesCreated++;
    }

    return activitiesCreated;
  }

  private isFeatureLaunch(text: string): boolean {
    const keywords = [
      'new feature',
      'feature launch',
      'now available',
      'introducing',
      'announces new',
      'release',
      'update',
    ];

    const textLower = text.toLowerCase();
    return keywords.some((keyword) => textLower.includes(keyword));
  }

  private classifyNewsArticle(article: NewsArticle): ActivityType {
    const title = article.title.toLowerCase();
    const description = (article.description || '').toLowerCase();
    const text = `${title} ${description}`;

    if (text.includes('funding') || text.includes('investment') || text.includes('raise')) {
      return ActivityType.FUNDING_ANNOUNCEMENT;
    }

    if (text.includes('feature') || text.includes('launch') || text.includes('release')) {
      return ActivityType.FEATURE_LAUNCH;
    }

    if (text.includes('hiring') || text.includes('job') || text.includes('recruit')) {
      return ActivityType.HIRING_EXPANSION;
    }

    if (text.includes('partnership') || text.includes('partner with') || text.includes('integration')) {
      return ActivityType.PARTNERSHIP_ANNOUNCEMENT;
    }

    if (text.includes('acquire') || text.includes('acquisition') || text.includes('buy')) {
      return ActivityType.ACQUISITION;
    }

    if (text.includes('expand') || text.includes('enter') || text.includes('new market')) {
      return ActivityType.MARKET_ENTRY;
    }

    if (text.includes('ceo') || text.includes('executive') || text.includes('appointed')) {
      return ActivityType.EXECUTIVE_CHANGE;
    }

    return ActivityType.NEWS_MENTION;
  }

  private determineNewsSeverity(article: NewsArticle): AlertSeverity {
    // High relevance and positive/negative sentiment = higher severity
    if (article.relevanceScore > 0.8) {
      return AlertSeverity.HIGH;
    }

    if (article.relevanceScore > 0.5) {
      return AlertSeverity.MEDIUM;
    }

    return AlertSeverity.LOW;
  }

  private async createWebsiteChangeActivity(
    competitorId: string,
    result: ScrapingResult
  ): Promise<void> {
    if (!result.extracted?.contentChanges) {
      return;
    }

    const { added, removed, modified } = result.extracted.contentChanges;

    await this.ciService.createActivity({
      competitorId,
      activityType: ActivityType.WEBSITE_UPDATE,
      title: 'Significant Website Changes Detected',
      description: `Website content has changed significantly. ${added.length} additions, ${removed.length} removals`,
      source: 'website',
      severity: AlertSeverity.LOW,
      url: result.url,
      metadata: { added, removed, modified },
    });
  }

  private async createPricingChangeActivity(
    competitorId: string,
    previous: any,
    current: any
  ): Promise<void> {
    const priceChange = (current.price || 0) - (previous.monthlyPrice || 0);
    const percentChange = previous.monthlyPrice > 0
      ? (priceChange / previous.monthlyPrice) * 100
      : 0;

    await this.ciService.createActivity({
      competitorId,
      activityType: ActivityType.PRICING_CHANGE,
      title: `Pricing Change: ${current.planName}`,
      description: `Price changed by ${percentChange.toFixed(1)}% from $${previous.monthlyPrice} to $${current.price}`,
      source: 'website',
      severity: Math.abs(percentChange) >= 20 ? AlertSeverity.HIGH : AlertSeverity.MEDIUM,
      metadata: {
        planName: current.planName,
        previousPrice: previous.monthlyPrice,
        newPrice: current.price,
        percentChange,
      },
    });
  }

  private shouldCheckPricing(competitor: Competitor): boolean {
    if (!competitor.lastPricingCheck) {
      return true;
    }

    const hoursSinceLastCheck =
      (Date.now() - competitor.lastPricingCheck.getTime()) / (1000 * 60 * 60);
    return hoursSinceLastCheck >= this.config.pricingCheckIntervalHours;
  }

  private async updateMonitoringTimestamps(competitorId: string): Promise<void> {
    await this.ciService.updateCompetitor(competitorId, {
      lastWebsiteScan: new Date(),
      lastNewsScan: new Date(),
    });
  }

  private async getCompetitorsToMonitor(): Promise<Competitor[]> {
    const { competitors } = await this.ciService.listCompetitors({
      isActive: true,
    });

    // Filter by batch if specified
    if (this.config.batchCompetitorIds) {
      return competitors.filter((c) => this.config.batchCompetitorIds!.includes(c.id));
    }

    return competitors;
  }

  // ========================================
  // Batch Operations
  // ========================================

  async batchMonitorCompetitors(competitorIds: string[]): Promise<MonitoringResult[]> {
    this.config.batchCompetitorIds = competitorIds;
    const results = await this.runFullMonitoring();
    this.config.batchCompetitorIds = undefined;
    return results;
  }

  async getMonitoringSummary(): Promise<{
    totalCompetitors: number;
    lastRun: Date | null;
    avgActivities: number;
    avgErrors: number;
  }> {
    const { competitors } = await this.ciService.listCompetitors({ isActive: true });

    // Calculate stats from last monitoring runs
    // This would typically come from a monitoring log or metrics
    return {
      totalCompetitors: competitors.length,
      lastRun: null,
      avgActivities: 0,
      avgErrors: 0,
    };
  }

  updateConfig(config: Partial<MonitoringPipelineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  getConfig(): MonitoringPipelineConfig {
    return { ...this.config };
  }
}
