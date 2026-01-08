import { PrismaClient } from '@prisma/client';
import { TerritoryRepository } from '../repositories/territory.repository';
import {
  Territory,
  TerritoryAssignment,
  TerritoryStatus,
  TerritoryType,
  AssignmentRole,
  TerritoryCriteria,
  TerritoryValidationResult,
  TerritoryPerformance
} from '@insurance/types';

export class TerritoryService {
  constructor(
    private territoryRepository: TerritoryRepository,
    private prisma: PrismaClient
  ) {}

  // Territory Management
  async createTerritory(data: Partial<Territory>): Promise<Territory> {
    const validation = await this.validateTerritory(data as Territory);
    if (!validation.isValid) {
      throw new Error(`Invalid territory data: ${validation.errors.join(', ')}`);
    }

    return this.territoryRepository.createTerritory(data);
  }

  async updateTerritory(id: string, data: Partial<Territory>): Promise<Territory> {
    const existing = await this.territoryRepository.getTerritory(id);
    if (!existing) {
      throw new Error('Territory not found');
    }

    if (data.criteria || data.type) {
      const validation = await this.validateTerritory({ ...existing, ...data } as Territory);
      if (!validation.isValid) {
        throw new Error(`Invalid territory update: ${validation.errors.join(', ')}`);
      }
    }

    return this.territoryRepository.updateTerritory(id, data);
  }

  async getTerritory(id: string): Promise<Territory | null> {
    return this.territoryRepository.getTerritory(id);
  }

  async listTerritories(filter?: any): Promise<{ territories: Territory[]; total: number }> {
    return this.territoryRepository.getTerritories(filter);
  }

  async deleteTerritory(id: string): Promise<void> {
    const assignments = await this.territoryRepository.getAssignments({ territoryId: id });
    if (assignments.length > 0) {
      throw new Error('Cannot delete territory with active assignments. Remove assignments first.');
    }
    await this.territoryRepository.deleteTerritory(id);
  }

  // Agent Assignment
  async assignAgent(data: {
    territoryId: string;
    agentId: string;
    role?: AssignmentRole;
    priority?: number;
    effectiveFrom?: Date;
    effectiveTo?: Date;
  }): Promise<TerritoryAssignment> {
    // Verify territory and agent exist
    const [territory, agent] = await Promise.all([
      this.territoryRepository.getTerritory(data.territoryId),
      this.prisma.agent.findUnique({ where: { id: data.agentId } })
    ]);

    if (!territory) throw new Error('Territory not found');
    if (!agent) throw new Error('Agent not found');

    // Check for existing assignment
    const existing = await this.territoryRepository.getAssignments({
      territoryId: data.territoryId,
      agentId: data.agentId
    });

    if (existing.some(a => a.isActive && a.role === (data.role || 'PRIMARY'))) {
      throw new Error('Agent is already assigned to this territory with this role');
    }

    return this.territoryRepository.assignAgentToTerritory(data);
  }

  async updateAssignment(id: string, data: Partial<TerritoryAssignment>): Promise<TerritoryAssignment> {
    return this.territoryRepository.updateAssignment(id, data);
  }

  async removeAssignment(id: string): Promise<void> {
    await this.territoryRepository.removeAssignment(id);
  }

  // Territory Matching Logic
  async findBestTerritoryForLead(lead: { 
    state?: string; 
    zipCode?: string; 
    city?: string;
    country?: string;
  }): Promise<Territory | null> {
    const territories = await this.territoryRepository.findTerritoriesForLead(lead);
    
    if (territories.length === 0) return null;
    
    // If multiple matches, pick the most specific one (ZIP > County > State > Region)
    const typePriority: Record<TerritoryType, number> = {
      'zip_code': 5,
      'county': 4,
      'state': 3,
      'geographic': 2,
      'region': 1,
      'custom': 0
    };

    return territories.sort((a, b) => 
      (typePriority[b.type] || 0) - (typePriority[a.type] || 0)
    )[0];
  }

  async getAgentsForLead(lead: any): Promise<any[]> {
    const territory = await this.findBestTerritoryForLead(lead);
    if (!territory) return [];

    const assignments = await this.territoryRepository.getAssignments({
      territoryId: territory.id,
      isActive: true
    });

    return assignments
      .sort((a, b) => b.priority - a.priority)
      .map(a => ({
        ...a.agent,
        assignmentRole: a.role,
        territoryPriority: a.priority
      }));
  }

  // Validation
  async validateTerritory(territory: Territory): Promise<TerritoryValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!territory.name) errors.push('Territory name is required');
    if (!territory.type) errors.push('Territory type is required');
    if (!territory.criteria) errors.push('Territory criteria is required');

    // Check for overlaps (simplified check for state level)
    if (territory.type === 'state' && territory.criteria.states) {
      const existing = await this.territoryRepository.getTerritories({ type: 'state' });
      const overlaps = existing.territories.filter(t => 
        t.id !== territory.id && 
        t.criteria.states?.some(s => territory.criteria.states?.includes(s))
      );

      if (overlaps.length > 0) {
        warnings.push(`Territory overlaps with existing state territories: ${overlaps.map(o => o.name).join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      overlaps: []
    };
  }

  // Analytics
  async getTerritoryPerformance(territoryId: string, period: { start: Date; end: Date }): Promise<TerritoryPerformance> {
    // In a real implementation, this would aggregate data from LeadAssignment and Policy tables
    const leadsCount = await this.prisma.leadAssignment.count({
      where: {
        createdAt: { gte: period.start, lte: period.end },
        agent: {
          territoryAssignments: {
            some: { territoryId }
          }
        }
      }
    });

    const conversionsCount = await this.prisma.leadAssignment.count({
      where: {
        status: 'CONVERTED',
        updatedAt: { gte: period.start, lte: period.end },
        agent: {
          territoryAssignments: {
            some: { territoryId }
          }
        }
      }
    });

    const activeAgents = await this.prisma.territoryAssignment.count({
      where: {
        territoryId,
        isActive: true
      }
    });

    return {
      territoryId,
      period,
      metrics: {
        totalLeads: leadsCount,
        assignedLeads: leadsCount,
        convertedLeads: conversionsCount,
        conversionRate: leadsCount > 0 ? (conversionsCount / leadsCount) * 100 : 0,
        totalRevenue: 0, // Would need policy data
        avgTimeToConvert: 0,
        activeAgents
      }
    };
  }
}
