/**
 * News & PR Monitoring Integration
 * Monitors news sources for competitor mentions and press releases
 */

import axios from 'axios';

export interface NewsArticle {
  id: string;
  source: string;
  sourceUrl: string;
  title: string;
  description?: string;
  url: string;
  publishedAt: Date;
  author?: string;
  category?: string;
  mentions: string[];
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  relevanceScore: number;
}

export interface NewsMonitoringConfig {
  competitorKeywords: string[];
  sources: NewsSource[];
  excludeKeywords?: string[];
  maxArticlesPerSource?: number;
  lookbackDays?: number;
}

export interface NewsSource {
  name: string;
  type: 'rss' | 'api' | 'web';
  url: string;
  apiKey?: string;
  enabled: boolean;
}

export interface NewsFilter {
  competitorId?: string;
  keyword?: string;
  sentiment?: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  startDate?: Date;
  endDate?: Date;
  minRelevance?: number;
  sources?: string[];
}

export class NewsMonitor {
  private config: NewsMonitoringConfig;
  private cache: Map<string, { articles: NewsArticle[]; timestamp: Date }>;

  constructor(config: NewsMonitoringConfig) {
    this.config = config;
    this.cache = new Map();
  }

  async fetchLatestNews(): Promise<NewsArticle[]> {
    const enabledSources = this.config.sources.filter((s) => s.enabled);
    const allArticles: NewsArticle[] = [];

    for (const source of enabledSources) {
      try {
        let articles: NewsArticle[] = [];

        switch (source.type) {
          case 'rss':
            articles = await this.fetchRSSFeed(source);
            break;
          case 'api':
            articles = await this.fetchFromAPI(source);
            break;
          case 'web':
            articles = await this.fetchFromWeb(source);
            break;
        }

        allArticles.push(...articles);
      } catch (error) {
        console.error(`Error fetching from ${source.name}:`, error);
      }
    }

    // Filter and rank articles
    const filteredArticles = this.filterAndRankArticles(allArticles);

    return filteredArticles;
  }

  async fetchRSSFeed(source: NewsSource): Promise<NewsArticle[]> {
    try {
      const response = await axios.get(source.url, { timeout: 30000 });
      const rssData = this.parseRSS(response.data);

      const articles: NewsArticle[] = rssData.items.map((item: any) => {
        const mentions = this.extractMentions(item.title + ' ' + (item.description || ''));
        const sentiment = this.analyzeSentiment(item.title + ' ' + (item.description || ''));
        const relevance = this.calculateRelevance(item.title + ' ' + (item.description || ''));

        return {
          id: this.generateId(source.name, item.link),
          source: source.name,
          sourceUrl: source.url,
          title: item.title,
          description: item.description,
          url: item.link,
          publishedAt: new Date(item.pubDate || item.published),
          author: item.author,
          category: item.category,
          mentions,
          sentiment,
          relevanceScore: relevance,
        };
      });

      return articles;
    } catch (error) {
      console.error('Error fetching RSS feed:', error);
      return [];
    }
  }

  async fetchFromAPI(source: NewsSource): Promise<NewsArticle[]> {
    if (!source.apiKey) {
      console.warn(`No API key for ${source.name}`);
      return [];
    }

    try {
      // Example implementation for NewsAPI
      if (source.name === 'NewsAPI') {
        return this.fetchFromNewsAPI(source);
      }

      // Add more API integrations as needed
      return [];
    } catch (error) {
      console.error(`Error fetching from API ${source.name}:`, error);
      return [];
    }
  }

  async fetchFromNewsAPI(source: NewsSource): Promise<NewsArticle[]> {
    const query = this.config.competitorKeywords.join(' OR ');
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - (this.config.lookbackDays || 7));

    const params = {
      q: query,
      from: lookbackDate.toISOString().split('T')[0],
      sortBy: 'publishedAt',
      apiKey: source.apiKey,
      pageSize: this.config.maxArticlesPerSource || 100,
    };

    const response = await axios.get(`${source.url}/v2/everything`, { params });

    if (response.data.status !== 'ok') {
      return [];
    }

    const articles: NewsArticle[] = response.data.articles.map((article: any) => {
      const mentions = this.extractMentions(article.title + ' ' + (article.description || ''));
      const sentiment = this.analyzeSentiment(article.title + ' ' + (article.description || ''));
      const relevance = this.calculateRelevance(article.title + ' ' + (article.description || ''));

      return {
        id: this.generateId('NewsAPI', article.url),
        source: 'NewsAPI',
        sourceUrl: source.url,
        title: article.title,
        description: article.description,
        url: article.url,
        publishedAt: new Date(article.publishedAt),
        author: article.author,
        mentions,
        sentiment,
        relevanceScore: relevance,
      };
    });

    return articles;
  }

  async fetchFromWeb(source: NewsSource): Promise<NewsArticle[]> {
    // Basic web scraping implementation
    // In production, you'd want to use a proper web scraping service
    try {
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        timeout: 30000,
      });

      // This would be customized based on the source structure
      return this.parseWebContent(response.data, source);
    } catch (error) {
      console.error(`Error fetching from web ${source.name}:`, error);
      return [];
    }
  }

  parseWebContent(html: string, source: NewsSource): NewsArticle[] {
    // Simplified implementation - in production, use cheerio or similar
    const articles: NewsArticle[] = [];

    // Extract headlines based on common patterns
    const titleRegex = /<h[1-3][^>]*>([^<]+)<\/h[1-3]>/gi;
    const linkRegex = /<a[^>]+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi;

    let match;
    while ((match = titleRegex.exec(html)) !== null) {
      const title = match[1].trim();
      const mentions = this.extractMentions(title);
      const sentiment = this.analyzeSentiment(title);
      const relevance = this.calculateRelevance(title);

      if (relevance > 0.5) {
        articles.push({
          id: this.generateId(source.name, title),
          source: source.name,
          sourceUrl: source.url,
          title,
          url: source.url,
          publishedAt: new Date(),
          mentions,
          sentiment,
          relevanceScore: relevance,
        });
      }
    }

    return articles;
  }

  filterAndRankArticles(articles: NewsArticle[]): NewsArticle[] {
    let filtered = articles;

    // Filter by relevance
    filtered = filtered.filter((a) => a.relevanceScore >= 0.3);

    // Filter by date
    const lookbackDate = new Date();
    lookbackDate.setDate(lookbackDate.getDate() - (this.config.lookbackDays || 7));
    filtered = filtered.filter((a) => a.publishedAt >= lookbackDate);

    // Filter out exclude keywords
    if (this.config.excludeKeywords) {
      filtered = filtered.filter((a) => {
        const text = `${a.title} ${a.description || ''}`.toLowerCase();
        return !this.config.excludeKeywords!.some((keyword) =>
          text.includes(keyword.toLowerCase())
        );
      });
    }

    // Sort by relevance and date
    filtered.sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      return b.publishedAt.getTime() - a.publishedAt.getTime();
    });

    return filtered;
  }

  filterArticles(articles: NewsArticle[], filter: NewsFilter): NewsArticle[] {
    let filtered = [...articles];

    if (filter.keyword) {
      const keywordLower = filter.keyword.toLowerCase();
      filtered = filtered.filter(
        (a) =>
          a.title.toLowerCase().includes(keywordLower) ||
          (a.description && a.description.toLowerCase().includes(keywordLower))
      );
    }

    if (filter.sentiment) {
      filtered = filtered.filter((a) => a.sentiment === filter.sentiment);
    }

    if (filter.startDate) {
      filtered = filtered.filter((a) => a.publishedAt >= filter.startDate!);
    }

    if (filter.endDate) {
      filtered = filtered.filter((a) => a.publishedAt <= filter.endDate!);
    }

    if (filter.minRelevance) {
      filtered = filtered.filter((a) => a.relevanceScore >= filter.minRelevance!);
    }

    if (filter.sources && filter.sources.length > 0) {
      filtered = filtered.filter((a) => filter.sources!.includes(a.source));
    }

    return filtered;
  }

  private extractMentions(text: string): string[] {
    const mentions: string[] = [];
    const textLower = text.toLowerCase();

    this.config.competitorKeywords.forEach((keyword) => {
      if (textLower.includes(keyword.toLowerCase())) {
        mentions.push(keyword);
      }
    });

    return mentions;
  }

  private analyzeSentiment(text: string): 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' {
    const textLower = text.toLowerCase();

    const positiveWords = [
      'growth',
      'success',
      'expand',
      'win',
      'award',
      'best',
      'lead',
      'innovative',
      'partnership',
      'investment',
      'funding',
      'launch',
      'new',
      'improve',
      'strong',
      'benefit',
    ];

    const negativeWords = [
      'layoff',
      'cut',
      'downsize',
      'loss',
      'fail',
      'struggle',
      'decline',
      'issue',
      'problem',
      'concern',
      'lawsuit',
      'legal',
      'investigation',
      'fraud',
      'security',
      'breach',
      'data',
    ];

    let positiveScore = 0;
    let negativeScore = 0;

    positiveWords.forEach((word) => {
      if (textLower.includes(word)) positiveScore++;
    });

    negativeWords.forEach((word) => {
      if (textLower.includes(word)) negativeScore++;
    });

    if (positiveScore > negativeScore) return 'POSITIVE';
    if (negativeScore > positiveScore) return 'NEGATIVE';
    return 'NEUTRAL';
  }

  private calculateRelevance(text: string): number {
    let relevance = 0;
    const textLower = text.toLowerCase();

    this.config.competitorKeywords.forEach((keyword) => {
      const keywordLower = keyword.toLowerCase();
      const regex = new RegExp(keywordLower, 'gi');
      const matches = textLower.match(regex);
      if (matches) {
        relevance += matches.length * 0.3;
      }
    });

    // Title mentions are more relevant
    const titleWords = text.split(' ').slice(0, 10);
    titleWords.forEach((word) => {
      if (this.config.competitorKeywords.some((k) =>
        word.toLowerCase().includes(k.toLowerCase())
      )) {
        relevance += 0.2;
      }
    });

    return Math.min(relevance, 1.0);
  }

  private parseRSS(xml: string): any {
    // Simplified RSS parsing
    // In production, use a proper RSS parser like 'rss-parser'
    const items: any[] = [];

    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    const titleRegex = /<title>([^<]*)<\/title>/i;
    const linkRegex = /<link>([^<]*)<\/link>/i;
    const descRegex = /<description>([^<]*)<\/description>/i;
    const pubDateRegex = /<pubDate>([^<]*)<\/pubDate>/i;
    const authorRegex = /<author>([^<]*)<\/author>/i;

    let itemMatch;
    while ((itemMatch = itemRegex.exec(xml)) !== null) {
      const itemContent = itemMatch[1];

      const titleMatch = titleRegex.exec(itemContent);
      const linkMatch = linkRegex.exec(itemContent);
      const descMatch = descRegex.exec(itemContent);
      const pubDateMatch = pubDateRegex.exec(itemContent);
      const authorMatch = authorRegex.exec(itemContent);

      items.push({
        title: titleMatch ? titleMatch[1] : '',
        link: linkMatch ? linkMatch[1] : '',
        description: descMatch ? descMatch[1] : '',
        pubDate: pubDateMatch ? pubDateMatch[1] : '',
        author: authorMatch ? authorMatch[1] : '',
      });

      // Reset regex lastIndex
      titleRegex.lastIndex = 0;
      linkRegex.lastIndex = 0;
      descRegex.lastIndex = 0;
      pubDateRegex.lastIndex = 0;
      authorRegex.lastIndex = 0;
    }

    return { items };
  }

  private generateId(source: string, identifier: string): string {
    return `${source}-${Buffer.from(identifier).toString('base64').substring(0, 16)}`;
  }

  updateConfig(config: Partial<NewsMonitoringConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Default news sources configuration
export const DEFAULT_NEWS_SOURCES: NewsSource[] = [
  {
    name: 'TechCrunch',
    type: 'rss',
    url: 'https://techcrunch.com/feed/',
    enabled: true,
  },
  {
    name: 'VentureBeat',
    type: 'rss',
    url: 'https://venturebeat.com/feed/',
    enabled: true,
  },
  {
    name: 'Wired',
    type: 'rss',
    url: 'https://www.wired.com/feed/rss',
    enabled: true,
  },
  {
    name: 'Business Insider',
    type: 'rss',
    url: 'https://www.businessinsider.com/rss',
    enabled: true,
  },
  {
    name: 'Reuters Technology',
    type: 'rss',
    url: 'https://www.reuters.com/rssFeed/technologyNews',
    enabled: true,
  },
];

// News API source (requires API key)
export const NEWS_API_SOURCE: NewsSource = {
  name: 'NewsAPI',
  type: 'api',
  url: 'https://newsapi.org',
  enabled: false, // Disabled by default - requires API key
  apiKey: process.env.NEWS_API_KEY,
};
