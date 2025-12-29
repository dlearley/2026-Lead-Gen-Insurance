// Marketplace Ecosystem Revenue Types
import { z } from 'zod';

export enum RevenueType {
  PLATFORM_FEE = 'PLATFORM_FEE',
  SUBSCRIPTION = 'SUBSCRIPTION',
  SERVICE_FEE = 'SERVICE_FEE',
  REFERRAL_COMMISSION = 'REFERRAL_COMMISSION',
  MARKET_ACCESS_FEE = 'MARKET_ACCESS_FEE'
}

export enum RevenueStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

export interface EcosystemRevenue {
  id: string;
  type: RevenueType;
  amount: number;
  currency: string;
  status: RevenueStatus;
  sourceId: string; // ID of the entity that generated the revenue (e.g., leadId, brokerId)
  sourceType: string; // Type of the source entity
  brokerId?: string; // ID of the broker associated with this revenue
  carrierId?: string; // ID of the carrier associated with this revenue
  metadata?: Record<string, any>;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateEcosystemRevenueDto {
  type: RevenueType;
  amount: number;
  currency?: string;
  sourceId: string;
  sourceType: string;
  brokerId?: string;
  carrierId?: string;
  metadata?: Record<string, any>;
}

export interface UpdateEcosystemRevenueDto {
  status?: RevenueStatus;
  metadata?: Record<string, any>;
  processedAt?: Date;
}

export interface RevenueFilterParams {
  type?: RevenueType;
  status?: RevenueStatus;
  brokerId?: string;
  carrierId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface EcosystemRevenueMetrics {
  totalRevenue: number;
  revenueByType: Record<RevenueType, number>;
  revenueByStatus: Record<RevenueStatus, number>;
  topBrokersByRevenue: Array<{
    brokerId: string;
    brokerName: string;
    revenue: number;
  }>;
  revenueOverTime: Array<{
    date: string;
    amount: number;
  }>;
  growthRate: number;
}

export const EcosystemRevenueSchema = z.object({
  type: z.nativeEnum(RevenueType),
  amount: z.number().positive(),
  currency: z.string().default('USD'),
  sourceId: z.string(),
  sourceType: z.string(),
  brokerId: z.string().optional(),
  carrierId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
});
