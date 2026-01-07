// Attribution Types for Marketing ROI Tracking

import { z } from 'zod';

// Marketing Source Types
export type MarketingSourceType = 
  | 'ORGANIC_SEARCH'
  | 'PAID_SEARCH'
  | 'SOCIAL_MEDIA'
  | 'EMAIL'
  | 'REFERRAL'
  | 'DIRECT'
  | 'AFFILIATE'
  | 'CONTENT_MARKETING'
  | 'EVENT'
  | 'OTHER';

export type CampaignStatus = 
  | 'DRAFT'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type AttributionType = 
  | 'FIRST_TOUCH'
  | 'LAST_TOUCH'
  | 'MULTI_TOUCH'
  | 'LINEAR'
  | 'TIME_DECAY'
  | 'POSITION_BASED';

// Marketing Source DTOs
export const CreateMarketingSourceDto = z.object({
  name: z.string().min(1, 'Name is required'),
  type: z.nativeEnum({
    ORGANIC_SEARCH: 'ORGANIC_SEARCH',
    PAID_SEARCH: 'PAID_SEARCH',
    SOCIAL_MEDIA: 'SOCIAL_MEDIA',
    EMAIL: 'EMAIL',
    REFERRAL: 'REFERRAL',
    DIRECT: 'DIRECT',
    AFFILIATE: 'AFFILIATE',
    CONTENT_MARKETING: 'CONTENT_MARKETING',
    EVENT: 'EVENT',
    OTHER: 'OTHER'
  } as const),
  description: z.string().optional(),
  costPerLead: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const UpdateMarketingSourceDto = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  type: z.nativeEnum({
    ORGANIC_SEARCH: 'ORGANIC_SEARCH',
    PAID_SEARCH: 'PAID_SEARCH',
    SOCIAL_MEDIA: 'SOCIAL_MEDIA',
    EMAIL: 'EMAIL',
    REFERRAL: 'REFERRAL',
    DIRECT: 'DIRECT',
    AFFILIATE: 'AFFILIATE',
    CONTENT_MARKETING: 'CONTENT_MARKETING',
    EVENT: 'EVENT',
    OTHER: 'OTHER'
  } as const).optional(),
  description: z.string().optional(),
  costPerLead: z.number().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type MarketingSource = {
  id: string;
  name: string;
  type: MarketingSourceType;
  description: string | null;
  costPerLead: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

// Campaign DTOs
export const CreateCampaignDto = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  sourceId: z.string().min(1, 'Source ID is required'),
  startDate: z.date(),
  endDate: z.date().optional(),
  budget: z.number().min(0).optional(),
  status: z.nativeEnum({
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    ARCHIVED: 'ARCHIVED'
  } as const).optional(),
  objective: z.string().optional(),
  targetAudience: z.string().optional(),
});

export const UpdateCampaignDto = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  description: z.string().optional(),
  sourceId: z.string().min(1, 'Source ID is required').optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  budget: z.number().min(0).optional(),
  status: z.nativeEnum({
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    ARCHIVED: 'ARCHIVED'
  } as const).optional(),
  objective: z.string().optional(),
  targetAudience: z.string().optional(),
});

export type Campaign = {
  id: string;
  name: string;
  description: string | null;
  sourceId: string;
  startDate: Date;
  endDate: Date | null;
  budget: number;
  status: CampaignStatus;
  objective: string | null;
  targetAudience: string | null;
  createdAt: Date;
  updatedAt: Date;
  source?: MarketingSource;
};

// Attribution DTOs
export const CreateAttributionDto = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  sourceId: z.string().min(1, 'Source ID is required'),
  campaignId: z.string().min(1, 'Campaign ID is required').optional(),
  attributionType: z.nativeEnum({
    FIRST_TOUCH: 'FIRST_TOUCH',
    LAST_TOUCH: 'LAST_TOUCH',
    MULTI_TOUCH: 'MULTI_TOUCH',
    LINEAR: 'LINEAR',
    TIME_DECAY: 'TIME_DECAY',
    POSITION_BASED: 'POSITION_BASED'
  } as const).optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  referralSource: z.string().optional(),
  referringDomain: z.string().optional(),
  landingPage: z.string().optional(),
});

export const UpdateAttributionDto = z.object({
  sourceId: z.string().min(1, 'Source ID is required').optional(),
  campaignId: z.string().min(1, 'Campaign ID is required').optional(),
  attributionType: z.nativeEnum({
    FIRST_TOUCH: 'FIRST_TOUCH',
    LAST_TOUCH: 'LAST_TOUCH',
    MULTI_TOUCH: 'MULTI_TOUCH',
    LINEAR: 'LINEAR',
    TIME_DECAY: 'TIME_DECAY',
    POSITION_BASED: 'POSITION_BASED'
  } as const).optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  referralSource: z.string().optional(),
  referringDomain: z.string().optional(),
  landingPage: z.string().optional(),
});

export type Attribution = {
  id: string;
  leadId: string;
  sourceId: string;
  campaignId: string | null;
  attributionType: AttributionType;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  referralSource: string | null;
  referringDomain: string | null;
  landingPage: string | null;
  createdAt: Date;
  updatedAt: Date;
  lead?: any;
  source?: MarketingSource;
  campaign?: Campaign;
};

// Metrics DTOs
export type CampaignMetric = {
  id: string;
  campaignId: string;
  date: Date;
  leadsGenerated: number;
  leadsQualified: number;
  leadsConverted: number;
  conversionRate: number;
  costPerLead: number;
  costPerConversion: number;
  revenueGenerated: number;
  roi: number;
  clickThroughRate: number;
  engagementScore: number;
  campaign?: Campaign;
};

export type MarketingSourceMetric = {
  id: string;
  sourceId: string;
  date: Date;
  leadsGenerated: number;
  leadsQualified: number;
  leadsConverted: number;
  conversionRate: number;
  costPerLead: number;
  costPerConversion: number;
  revenueGenerated: number;
  roi: number;
  source?: MarketingSource;
};

// Analytics DTOs
export type AttributionAnalytics = {
  totalLeads: number;
  totalConversions: number;
  overallConversionRate: number;
  averageCostPerLead: number;
  averageCostPerConversion: number;
  totalRevenue: number;
  overallRoi: number;
  topSources: Array<{
    sourceId: string;
    sourceName: string;
    leads: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
    roi: number;
  }>;
  topCampaigns: Array<{
    campaignId: string;
    campaignName: string;
    leads: number;
    conversions: number;
    conversionRate: number;
    revenue: number;
    roi: number;
  }>;
};

export type RoiAnalysis = {
  campaignId: string;
  campaignName: string;
  totalSpend: number;
  totalRevenue: number;
  roi: number;
  roiPercentage: number;
  costPerLead: number;
  costPerConversion: number;
  conversionRate: number;
  leadsGenerated: number;
  conversions: number;
  attributionBreakdown: Array<{
    attributionType: AttributionType;
    leads: number;
    conversions: number;
    revenue: number;
  }>;
};

export type AttributionReport = {
  reportId: string;
  reportName: string;
  generatedAt: Date;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
  overallPerformance: {
    totalLeads: number;
    totalConversions: number;
    conversionRate: number;
    totalRevenue: number;
    totalCost: number;
    roi: number;
  };
  sourcePerformance: MarketingSourceMetric[];
  campaignPerformance: CampaignMetric[];
  recommendations: string[];
};