import { logger } from '@insurance-lead-gen/core';
import type { PrismaClient } from '@prisma/client';
import { IntentDetectionService } from './intent-detection.service.js';
import { SignalCategory, SignalType } from '@insurance-lead-gen/types';

export class SignalProcessorService {
  private prisma: PrismaClient;
  private intentService: IntentDetectionService;

  constructor(prisma: PrismaClient, intentService: IntentDetectionService) {
    this.prisma = prisma;
    this.intentService = intentService;
  }

  /**
   * Process an incoming behavioral event and convert it to an intent signal
   */
  async processEvent(event: {
    leadId: string;
    type: string;
    data: any;
    timestamp?: Date;
  }): Promise<void> {
    try {
      const signals = this.mapEventToSignals(event);
      if (signals.length === 0) return;

      for (const signal of signals) {
        await (this.prisma as any).intentSignal.create({
          data: {
            leadId: event.leadId,
            category: signal.category,
            type: signal.type,
            score: signal.score,
            weight: signal.weight,
            description: signal.description,
            metadata: event.data,
            timestamp: event.timestamp || new Date()
          }
        });
      }

      // Recalculate intent score
      await this.intentService.calculateIntentScore(event.leadId);
    } catch (error) {
      logger.error('Failed to process event into signal', { error, event });
    }
  }

  private mapEventToSignals(event: any): Array<{
    category: SignalCategory;
    type: SignalType;
    score: number;
    weight: number;
    description: string;
  }> {
    const signals: any[] = [];

    switch (event.type) {
      case 'website_activity':
        this.processWebsiteActivity(event.data, signals);
        break;
      case 'email_engagement':
        this.processEmailEngagement(event.data, signals);
        break;
      case 'content_consumption':
        this.processContentConsumption(event.data, signals);
        break;
      case 'buying_signal':
        this.processBuyingSignal(event.data, signals);
        break;
      case 'engagement_velocity':
        this.processVelocitySignal(event.data, signals);
        break;
    }

    return signals;
  }

  private processWebsiteActivity(data: any, signals: any[]) {
    const { pageType, timeOnPage, scrollDepth, interactionType } = data;

    if (pageType === 'pricing') {
      signals.push({
        category: 'WEBSITE',
        type: 'PRICING_PAGE_VISIT',
        score: 70,
        weight: 1,
        description: 'Visited pricing page'
      });
    } else if (pageType === 'product') {
      signals.push({
        category: 'WEBSITE',
        type: 'PRODUCT_PAGE_VISIT',
        score: 50,
        weight: 1,
        description: `Visited product page: ${data.productId || 'unknown'}`
      });
    } else if (pageType === 'demo') {
      signals.push({
        category: 'WEBSITE',
        type: 'DEMO_REQUEST',
        score: 95,
        weight: 1,
        description: 'Visited demo request page'
      });
    }

    if (timeOnPage > 120) { // 2 minutes
      signals.push({
        category: 'VELOCITY',
        type: 'VELOCITY_SPIKE',
        score: 30,
        weight: 0.5,
        description: 'High time on page'
      });
    }
  }

  private processEmailEngagement(data: any, signals: any[]) {
    const { action, openCount, clickCount } = data;

    if (action === 'open') {
      signals.push({
        category: 'EMAIL',
        type: 'EMAIL_OPEN',
        score: 10 + (openCount > 1 ? 5 * openCount : 0),
        weight: 1,
        description: `Opened email${openCount > 1 ? ` ${openCount} times` : ''}`
      });
    } else if (action === 'click') {
      signals.push({
        category: 'EMAIL',
        type: 'EMAIL_CLICK',
        score: 40 + (clickCount > 1 ? 10 * clickCount : 0),
        weight: 1,
        description: 'Clicked link in email'
      });
    } else if (action === 'reply') {
      signals.push({
        category: 'EMAIL',
        type: 'EMAIL_REPLY',
        score: 80,
        weight: 1,
        description: 'Replied to an email'
      });
    }
  }

  private processContentConsumption(data: any, signals: any[]) {
    const { contentType, engagementLevel } = data;

    if (contentType === 'whitepaper') {
      signals.push({
        category: 'CONTENT',
        type: 'WHITEPAPER_DOWNLOAD',
        score: 60,
        weight: 1,
        description: 'Downloaded whitepaper'
      });
    } else if (contentType === 'case_study') {
      signals.push({
        category: 'CONTENT',
        type: 'CONTENT_ENGAGEMENT',
        score: 50,
        weight: 1,
        description: 'Read case study'
      });
    }
  }

  private processBuyingSignal(data: any, signals: any[]) {
    const { keyword, source } = data;
    
    signals.push({
      category: 'BUYING',
      type: 'BUYING_KEYWORD',
      score: 85,
      weight: 1,
      description: `Detected buying keyword: "${keyword}" via ${source}`
    });
  }

  private processVelocitySignal(data: any, signals: any[]) {
    const { increasePercentage } = data;
    
    if (increasePercentage > 50) {
      signals.push({
        category: 'VELOCITY',
        type: 'VELOCITY_SPIKE',
        score: increasePercentage > 100 ? 90 : 60,
        weight: 1,
        description: `Engagement velocity spike: ${increasePercentage}%`
      });
    }
  }
}
