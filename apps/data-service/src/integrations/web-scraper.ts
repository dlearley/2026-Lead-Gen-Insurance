/**
 * Web Scraper Integration
 * Scrapes competitor websites for pricing, features, and content changes
 */

import axios from 'axios';
import * as cheerio from 'cheerio';

export interface ScrapingConfig {
  url: string;
  selectors: {
    pricing?: string;
    features?: string;
    plans?: string;
    content?: string;
    announcements?: string;
  };
  headers?: Record<string, string>;
  timeout?: number;
}

export interface ScrapingResult {
  url: string;
  success: boolean;
  timestamp: Date;
  content?: string;
  extracted?: {
    pricing?: any;
    features?: string[];
    plans?: any[];
    announcements?: string[];
    contentChanges?: {
      added: string[];
      removed: string[];
      modified: string[];
    };
  };
  error?: string;
  statusCode?: number;
}

export interface ChangeDetection {
  hasChanges: boolean;
  added: string[];
  removed: string[];
  modified: string[];
  similarityScore?: number;
}

export class WebScraper {
  private cache: Map<string, { content: string; timestamp: Date }>;

  constructor() {
    this.cache = new Map();
  }

  async scrape(config: ScrapingConfig): Promise<ScrapingResult> {
    const timestamp = new Date();

    try {
      const response = await axios.get(config.url, {
        headers: config.headers || this.getDefaultHeaders(),
        timeout: config.timeout || 30000,
      });

      if (response.status !== 200) {
        return {
          url: config.url,
          success: false,
          timestamp,
          error: `HTTP ${response.status}`,
          statusCode: response.status,
        };
      }

      const $ = cheerio.load(response.data);
      const content = this.cleanContent($.text());

      // Detect changes if cached
      const previousContent = this.cache.get(config.url);
      const contentChanges = previousContent
        ? this.detectChanges(previousContent.content, content)
        : { hasChanges: false, added: [], removed: [] };

      // Update cache
      this.cache.set(config.url, { content, timestamp });

      // Extract specific elements
      const extracted = this.extractData($, config.selectors);

      return {
        url: config.url,
        success: true,
        timestamp,
        content,
        extracted: {
          ...extracted,
          contentChanges: contentChanges.hasChanges ? contentChanges : undefined,
        },
        statusCode: response.status,
      };
    } catch (error) {
      return {
        url: config.url,
        success: false,
        timestamp,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async scrapeMultiple(configs: ScrapingConfig[]): Promise<ScrapingResult[]> {
    const results = await Promise.all(
      configs.map((config) => this.scrape(config))
    );
    return results;
  }

  async scrapePricing(url: string): Promise<any> {
    const config: ScrapingConfig = {
      url,
      selectors: {
        pricing: '.pricing, .plans, .pricing-table, .price-card',
        plans: '.plan, .tier, .package',
      },
    };

    const result = await this.scrape(config);
    return result.extracted?.pricing || result.extracted?.plans;
  }

  async scrapeFeatures(url: string): Promise<string[]> {
    const config: ScrapingConfig = {
      url,
      selectors: {
        features: '.features, .feature-list, .capabilities, .what-we-offer',
      },
    };

    const result = await this.scrape(config);
    return result.extracted?.features || [];
  }

  async scrapeAnnouncements(url: string): Promise<string[]> {
    const config: ScrapingConfig = {
      url,
      selectors: {
        announcements: '.news, .announcements, .blog, .press-releases',
      },
    };

    const result = await this.scrape(config);
    return result.extracted?.announcements || [];
  }

  async detectContentChanges(url: string): Promise<ChangeDetection> {
    const cached = this.cache.get(url);
    if (!cached) {
      return { hasChanges: false, added: [], removed: [] };
    }

    const currentResult = await this.scrape({ url, selectors: {} });
    if (!currentResult.success || !currentResult.content) {
      return { hasChanges: false, added: [], removed: [] };
    }

    return this.detectChanges(cached.content, currentResult.content);
  }

  private extractData($: cheerio.CheerioAPI, selectors: any): any {
    const extracted: any = {};

    if (selectors.pricing) {
      extracted.pricing = this.extractPricingData($, selectors.pricing);
    }

    if (selectors.features) {
      extracted.features = this.extractFeatures($, selectors.features);
    }

    if (selectors.plans) {
      extracted.plans = this.extractPlans($, selectors.plans);
    }

    if (selectors.announcements) {
      extracted.announcements = this.extractAnnouncements($, selectors.announcements);
    }

    return extracted;
  }

  private extractPricingData($: cheerio.CheerioAPI, selector: string): any {
    const pricingData: any[] = [];

    $(selector).each((_, element) => {
      const $el = $(element);
      const priceText = $el.find('.price, .amount, .cost').first().text().trim();
      const planName = $el.find('.plan-name, .title, .name').first().text().trim();
      const features: string[] = [];

      $el.find('.feature, .benefit, li').each((_, feature) => {
        const text = $(feature).text().trim();
        if (text && text.length > 10) {
          features.push(text);
        }
      });

      // Parse price
      const priceMatch = priceText.match(/\$?(\d+(?:\.\d{2})?)/);
      const price = priceMatch ? parseFloat(priceMatch[1]) : null;

      if (planName || price) {
        pricingData.push({
          planName,
          price,
          features,
          rawText: $el.text().trim(),
        });
      }
    });

    return pricingData;
  }

  private extractFeatures($: cheerio.CheerioAPI, selector: string): string[] {
    const features: Set<string> = new Set();

    $(selector).find('.feature, .capability, li').each((_, element) => {
      const text = $(element).text().trim();
      if (text && text.length > 10 && text.length < 200) {
        features.add(text);
      }
    });

    return Array.from(features);
  }

  private extractPlans($: cheerio.CheerioAPI, selector: string): any[] {
    const plans: any[] = [];

    $(selector).each((_, element) => {
      const $el = $(element);
      const planName = $el.find('.name, .title, h3, h4').first().text().trim();
      const price = $el.find('.price, .amount').first().text().trim();
      const description = $el.find('.description, .summary').first().text().trim();

      if (planName) {
        plans.push({ planName, price, description });
      }
    });

    return plans;
  }

  private extractAnnouncements($: cheerio.CheerioAPI, selector: string): string[] {
    const announcements: string[] = [];

    $(selector).find('.announcement, .news-item, article, .post').each((_, element) => {
      const $el = $(element);
      const title = $el.find('.title, h2, h3, .headline').first().text().trim();
      const date = $el.find('.date, .published, time').first().text().trim();
      const summary = $el.find('.summary, .excerpt, p').first().text().trim();

      if (title) {
        announcements.push(`${title}${date ? ` (${date})` : ''}${summary ? `: ${summary.substring(0, 100)}` : ''}`);
      }
    });

    return announcements;
  }

  private detectChanges(previous: string, current: string): ChangeDetection {
    const prevLines = new Set(previous.split('\n').map((l) => l.trim()).filter((l) => l.length > 20));
    const currLines = new Set(current.split('\n').map((l) => l.trim()).filter((l) => l.length > 20));

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    currLines.forEach((line) => {
      if (!prevLines.has(line)) {
        added.push(line);
      }
    });

    prevLines.forEach((line) => {
      if (!currLines.has(line)) {
        removed.push(line);
      }
    });

    // Detect modifications (similar but not identical)
    added.forEach((newLine) => {
      removed.forEach((oldLine) => {
        const similarity = this.calculateSimilarity(newLine, oldLine);
        if (similarity > 0.7 && similarity < 0.95) {
          modified.push(`${oldLine} -> ${newLine}`);
        }
      });
    });

    return {
      hasChanges: added.length > 0 || removed.length > 0,
      added,
      removed,
      modified,
    };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  private getDefaultHeaders(): Record<string, string> {
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      Connection: 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
    };
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }
}
