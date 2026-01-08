import { PrismaClient } from '@prisma/client';
import { 
  Territory, 
  TerritoryAssignment, 
  TerritoryStatus, 
  TerritoryType,
  AssignmentRole
} from '@insurance/types';

export class TerritoryRepository {
  constructor(private prisma: PrismaClient) {}

  async createTerritory(data: any): Promise<Territory> {
    return this.prisma.territory.create({
      data: {
        ...data,
        status: data.status || 'ACTIVE',
        type: data.type || 'GEOGRAPHIC'
      }
    }) as unknown as Territory;
  }

  async updateTerritory(id: string, data: any): Promise<Territory> {
    return this.prisma.territory.update({
      where: { id },
      data
    }) as unknown as Territory;
  }

  async deleteTerritory(id: string): Promise<void> {
    await this.prisma.territory.delete({
      where: { id }
    });
  }

  async getTerritory(id: string): Promise<Territory | null> {
    return this.prisma.territory.findUnique({
      where: { id },
      include: {
        assignments: {
          include: {
            agent: true
          }
        },
        children: true,
        parent: true
      }
    }) as unknown as Territory | null;
  }

  async getTerritories(filter: any = {}): Promise<{ territories: Territory[]; total: number }> {
    const { skip, take, status, type, parentTerritoryId } = filter;
    
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (parentTerritoryId) where.parentTerritoryId = parentTerritoryId;

    const [territories, total] = await Promise.all([
      this.prisma.territory.findMany({
        where,
        skip,
        take,
        include: {
          _count: {
            select: { assignments: true }
          }
        },
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.territory.count({ where })
    ]);

    return { 
      territories: territories as unknown as Territory[], 
      total 
    };
  }

  async assignAgentToTerritory(data: any): Promise<TerritoryAssignment> {
    return this.prisma.territoryAssignment.create({
      data: {
        territoryId: data.territoryId,
        agentId: data.agentId,
        role: data.role || 'PRIMARY',
        priority: data.priority || 0,
        effectiveFrom: data.effectiveFrom || new Date(),
        effectiveTo: data.effectiveTo,
        isActive: data.isActive !== undefined ? data.isActive : true
      }
    }) as unknown as TerritoryAssignment;
  }

  async updateAssignment(id: string, data: any): Promise<TerritoryAssignment> {
    return this.prisma.territoryAssignment.update({
      where: { id },
      data
    }) as unknown as TerritoryAssignment;
  }

  async removeAssignment(id: string): Promise<void> {
    await this.prisma.territoryAssignment.delete({
      where: { id }
    });
  }

  async getAssignments(filter: any = {}): Promise<TerritoryAssignment[]> {
    const { territoryId, agentId, isActive } = filter;
    
    const where: any = {};
    if (territoryId) where.territoryId = territoryId;
    if (agentId) where.agentId = agentId;
    if (isActive !== undefined) where.isActive = isActive;

    return this.prisma.territoryAssignment.findMany({
      where,
      include: {
        territory: true,
        agent: true
      }
    }) as unknown as TerritoryAssignment[];
  }

  async findTerritoriesForLead(leadCriteria: { state?: string; zipCode?: string; city?: string }): Promise<Territory[]> {
    // This is a simplified version. In a real app, you'd use spatial queries or complex JSON filtering.
    // For this implementation, we'll fetch territories and filter them in memory or use Prisma's Json filter.
    
    return this.prisma.territory.findMany({
      where: {
        status: 'ACTIVE',
        OR: [
          {
            criteria: {
              path: ['states'],
              array_contains: leadCriteria.state
            }
          },
          {
            criteria: {
              path: ['zipCodes'],
              array_contains: leadCriteria.zipCode
            }
          }
        ]
      }
    }) as unknown as Territory[];
  }
}
