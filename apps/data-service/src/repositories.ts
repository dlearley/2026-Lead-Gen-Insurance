import { Prisma, Lead, LeadStatus, InsuranceType } from '@prisma/client';

// Lead repository interface
export interface LeadRepository {
  create(data: Prisma.LeadCreateInput): Promise<Lead>;
  findById(id: string): Promise<Lead | null>;
  findMany(params: {
    skip?: number;
    take?: number;
    where?: {
      status?: LeadStatus;
      source?: string;
      insuranceType?: InsuranceType;
      qualityScore?: { gte?: number; lte?: number };
      createdAt?: { gte?: Date; lte?: Date };
    };
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<Lead[]>;
  update(id: string, data: Prisma.LeadUpdateInput): Promise<Lead>;
  delete(id: string): Promise<void>;
  count(where?: Prisma.LeadWhereInput): Promise<number>;
}

// In-memory lead repository for development/testing
export class InMemoryLeadRepository implements LeadRepository {
  private leads = new Map<string, Lead>();

  async create(data: Prisma.LeadCreateInput): Promise<Lead> {
    const now = new Date();
    const id = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const lead: Lead = {
      id,
      source: data.source as string,
      email: data.email as string | null,
      phone: data.phone as string | null,
      firstName: data.firstName as string | null,
      lastName: data.lastName as string | null,
      street: (data.address as any)?.street || null,
      city: (data.address as any)?.city || null,
      state: (data.address as any)?.state || null,
      zipCode: (data.address as any)?.zipCode || null,
      country: (data.address as any)?.country || 'US',
      insuranceType: data.insuranceType as InsuranceType | null,
      qualityScore: null,
      status: 'RECEIVED' as LeadStatus,
      metadata: data.metadata as Record<string, unknown> | null,
      createdAt: now,
      updatedAt: now,
    };

    this.leads.set(id, lead);
    return lead;
  }

  async findById(id: string): Promise<Lead | null> {
    return this.leads.get(id) || null;
  }

  async findMany(params: {
    skip?: number;
    take?: number;
    where?: {
      status?: LeadStatus;
      source?: string;
      insuranceType?: InsuranceType;
      qualityScore?: { gte?: number; lte?: number };
      createdAt?: { gte?: Date; lte?: Date };
    };
    orderBy?: Record<string, 'asc' | 'desc'>;
  }): Promise<Lead[]> {
    let leads = Array.from(this.leads.values());

    // Apply filters
    if (params.where) {
      const { status, source, insuranceType, qualityScore, createdAt } = params.where;
      
      if (status) {
        leads = leads.filter(l => l.status === status);
      }
      if (source) {
        leads = leads.filter(l => l.source === source);
      }
      if (insuranceType) {
        leads = leads.filter(l => l.insuranceType === insuranceType);
      }
      if (qualityScore) {
        if (qualityScore.gte !== undefined) {
          leads = leads.filter(l => (l.qualityScore || 0) >= qualityScore.gte!);
        }
        if (qualityScore.lte !== undefined) {
          leads = leads.filter(l => (l.qualityScore || 0) <= qualityScore.lte!);
        }
      }
      if (createdAt) {
        if (createdAt.gte) {
          leads = leads.filter(l => l.createdAt >= createdAt.gte!);
        }
        if (createdAt.lte) {
          leads = leads.filter(l => l.createdAt <= createdAt.lte!);
        }
      }
    }

    // Sort
    const orderBy = params.orderBy || { createdAt: 'desc' };
    const sortField = Object.keys(orderBy)[0] as keyof Lead;
    const sortDirection = orderBy[sortField];
    leads.sort((a, b) => {
      const aVal = a[sortField] as any;
      const bVal = b[sortField] as any;
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    // Pagination
    const skip = params.skip || 0;
    const take = params.take || 20;
    return leads.slice(skip, skip + take);
  }

  async update(id: string, data: Prisma.LeadUpdateInput): Promise<Lead> {
    const lead = this.leads.get(id);
    if (!lead) {
      throw new Error(`Lead with id ${id} not found`);
    }

    const updatedLead: Lead = {
      ...lead,
      ...data,
      id: lead.id,
      createdAt: lead.createdAt,
      updatedAt: new Date(),
    };

    this.leads.set(id, updatedLead);
    return updatedLead;
  }

  async delete(id: string): Promise<void> {
    if (!this.leads.has(id)) {
      throw new Error(`Lead with id ${id} not found`);
    }
    this.leads.delete(id);
  }

  async count(where?: Prisma.LeadWhereInput): Promise<number> {
    let leads = Array.from(this.leads.values());
    
    if (where) {
      if (where.status) {
        leads = leads.filter(l => l.status === where.status);
      }
      if (where.source) {
        leads = leads.filter(l => l.source === where.source);
      }
      if (where.insuranceType) {
        leads = leads.filter(l => l.insuranceType === where.insuranceType);
      }
    }
    
    return leads.length;
  }
}

// Export a singleton instance for development
export const leadRepository = new InMemoryLeadRepository();
