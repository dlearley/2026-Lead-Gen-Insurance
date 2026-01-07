import { 
  EcosystemRevenue, 
  CreateEcosystemRevenueDto, 
  UpdateEcosystemRevenueDto, 
  RevenueFilterParams,
  RevenueType,
  RevenueStatus
} from '@insurance-lead-gen/types';
import { prisma } from '../prisma/client.js';

export class EcosystemRevenueRepository {
  /**
   * Create a new revenue entry
   */
  static async create(data: CreateEcosystemRevenueDto): Promise<EcosystemRevenue> {
    return await (prisma.ecosystemRevenue.create({
      data: {
        type: data.type,
        amount: data.amount,
        currency: data.currency || 'USD',
        sourceId: data.sourceId,
        sourceType: data.sourceType,
        brokerId: data.brokerId,
        carrierId: data.carrierId,
        metadata: data.metadata || {},
      }
    }) as any);
  }

  /**
   * Find a revenue entry by ID
   */
  static async findById(id: string): Promise<EcosystemRevenue | null> {
    return await (prisma.ecosystemRevenue.findUnique({
      where: { id }
    }) as any);
  }

  /**
   * Update a revenue entry
   */
  static async update(id: string, data: UpdateEcosystemRevenueDto): Promise<EcosystemRevenue> {
    return await (prisma.ecosystemRevenue.update({
      where: { id },
      data: {
        status: data.status,
        metadata: data.metadata,
        processedAt: data.processedAt,
      }
    }) as any);
  }

  /**
   * Find revenue entries with filters
   */
  static async findAll(params: RevenueFilterParams): Promise<{ data: EcosystemRevenue[], total: number }> {
    const where: any = {};

    if (params.type) where.type = params.type;
    if (params.status) where.status = params.status;
    if (params.brokerId) where.brokerId = params.brokerId;
    if (params.carrierId) where.carrierId = params.carrierId;
    
    if (params.startDate || params.endDate) {
      where.createdAt = {};
      if (params.startDate) where.createdAt.gte = params.startDate;
      if (params.endDate) where.createdAt.lte = params.endDate;
    }

    const [data, total] = await Promise.all([
      prisma.ecosystemRevenue.findMany({
        where,
        take: params.limit || 50,
        skip: params.offset || 0,
        orderBy: { createdAt: 'desc' }
      }),
      prisma.ecosystemRevenue.count({ where })
    ]);

    return { data: data as any[], total };
  }

  /**
   * Get revenue metrics
   */
  static async getMetrics(startDate: Date, endDate: Date): Promise<any> {
    const revenues = await prisma.ecosystemRevenue.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        },
        status: 'COMPLETED'
      }
    });

    const totalRevenue = revenues.reduce((sum, r) => sum + r.amount, 0);
    
    const revenueByType: Record<string, number> = {};
    for (const type of Object.values(RevenueType)) {
      revenueByType[type] = revenues
        .filter(r => r.type === type)
        .reduce((sum, r) => sum + r.amount, 0);
    }

    const revenueByStatus: Record<string, number> = {};
    const allRevenues = await prisma.ecosystemRevenue.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    for (const status of Object.values(RevenueStatus)) {
      revenueByStatus[status] = allRevenues
        .filter(r => r.status === status)
        .reduce((sum, r) => sum + r.amount, 0);
    }

    return {
      totalRevenue,
      revenueByType,
      revenueByStatus,
      count: revenues.length
    };
  }
}
