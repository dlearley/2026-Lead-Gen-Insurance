import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type {
  Competency,
  AgentCompetency,
  CompetencyGap,
  CreateCompetencyDto,
  CompetencyLevel,
} from '@insurance-lead-gen/types';

const prisma = new PrismaClient();

// Competency level ordering for gap analysis
const LEVEL_ORDER: Record<CompetencyLevel, number> = {
  NOVICE: 1,
  BEGINNER: 2,
  INTERMEDIATE: 3,
  ADVANCED: 4,
  EXPERT: 5,
};

export class CompetencyService {
  // ========================================
  // Competency Management
  // ========================================

  async getCompetencies(filters: { category?: string; level?: string } = {}): Promise<Competency[]> {
    try {
      const { category, level } = filters;

      const competencies = await prisma.competency.findMany({
        where: {
          category,
          level: level as any,
        },
        orderBy: [{ category: 'asc' }, { level: 'asc' }],
      });

      return competencies;
    } catch (error) {
      logger.error('Failed to get competencies', { error, filters });
      throw error;
    }
  }

  async getCompetencyById(id: string): Promise<Competency | null> {
    try {
      const competency = await prisma.competency.findUnique({
        where: { id },
      });

      return competency;
    } catch (error) {
      logger.error('Failed to get competency by id', { error, id });
      throw error;
    }
  }

  async createCompetency(dto: CreateCompetencyDto): Promise<Competency> {
    try {
      const competency = await prisma.competency.create({
        data: {
          name: dto.name,
          description: dto.description,
          category: dto.category,
          level: dto.level,
          skills: dto.skills,
        },
      });

      logger.info('Competency created', { competencyId: competency.id, name: dto.name });
      return competency;
    } catch (error) {
      logger.error('Failed to create competency', { error, dto });
      throw error;
    }
  }

  async updateCompetency(id: string, updates: Partial<CreateCompetencyDto>): Promise<Competency> {
    try {
      const competency = await prisma.competency.update({
        where: { id },
        data: { ...updates, updatedAt: new Date() },
      });

      logger.info('Competency updated', { competencyId: id });
      return competency;
    } catch (error) {
      logger.error('Failed to update competency', { error, id, updates });
      throw error;
    }
  }

  async deleteCompetency(id: string): Promise<void> {
    try {
      await prisma.competency.delete({ where: { id } });
      logger.info('Competency deleted', { competencyId: id });
    } catch (error) {
      logger.error('Failed to delete competency', { error, id });
      throw error;
    }
  }

  // ========================================
  // Agent Competency Management
  // ========================================

  async getAgentCompetencies(agentId: string): Promise<AgentCompetency[]> {
    try {
      const competencies = await prisma.agentCompetency.findMany({
        where: { agentId },
        include: { competency: true },
        orderBy: { assessedAt: 'desc' },
      });

      return competencies;
    } catch (error) {
      logger.error('Failed to get agent competencies', { error, agentId });
      throw error;
    }
  }

  async setAgentCompetency(
    agentId: string,
    competencyId: string,
    level: CompetencyLevel,
    options?: {
      evidence?: string[];
      assessmentMethod?: string;
    },
  ): Promise<AgentCompetency> {
    try {
      const competency = await prisma.agentCompetency.upsert({
        where: {
          agentId_competencyId: { agentId, competencyId },
        },
        create: {
          agentId,
          competencyId,
          level,
          evidence: options?.evidence || [],
          assessmentMethod: options?.assessmentMethod,
          assessedAt: new Date(),
        },
        update: {
          level,
          evidence: options?.evidence,
          assessmentMethod: options?.assessmentMethod,
          assessedAt: new Date(),
        },
      });

      logger.info('Agent competency set', { agentId, competencyId, level });
      return competency;
    } catch (error) {
      logger.error('Failed to set agent competency', { error, agentId, competencyId, level });
      throw error;
    }
  }

  async assessAgentCompetency(
    agentId: string,
    competencyId: string,
    evidence: string[],
    assessmentMethod: string,
  ): Promise<AgentCompetency> {
    try {
      // In a real implementation, this would use AI to analyze evidence
      // and determine the competency level. For now, we'll use a simple heuristic.

      const competency = await prisma.competency.findUnique({
        where: { id: competencyId },
      });

      if (!competency) {
        throw new Error('Competency not found');
      }

      // Simple assessment based on evidence count
      let assessedLevel: CompetencyLevel = 'NOVICE';
      if (evidence.length >= 5) assessedLevel = 'EXPERT';
      else if (evidence.length >= 4) assessedLevel = 'ADVANCED';
      else if (evidence.length >= 3) assessedLevel = 'INTERMEDIATE';
      else if (evidence.length >= 2) assessedLevel = 'BEGINNER';

      const agentCompetency = await this.setAgentCompetency(agentId, competencyId, assessedLevel, {
        evidence,
        assessmentMethod,
      });

      logger.info('Agent competency assessed', {
        agentId,
        competencyId,
        level: assessedLevel,
      });

      return agentCompetency;
    } catch (error) {
      logger.error('Failed to assess agent competency', { error, agentId, competencyId });
      throw error;
    }
  }

  async removeAgentCompetency(agentId: string, competencyId: string): Promise<void> {
    try {
      await prisma.agentCompetency.delete({
        where: { agentId_competencyId: { agentId, competencyId } },
      });

      logger.info('Agent competency removed', { agentId, competencyId });
    } catch (error) {
      logger.error('Failed to remove agent competency', { error, agentId, competencyId });
      throw error;
    }
  }

  // ========================================
  // Competency Gap Analysis
  // ========================================

  async analyzeAgentGaps(agentId: string, requiredCompetencies: string[]): Promise<CompetencyGap[]> {
    try {
      const gaps: CompetencyGap[] = [];

      for (const competencyId of requiredCompetencies) {
        const competency = await prisma.competency.findUnique({
          where: { id: competencyId },
        });

        if (!competency) {
          continue;
        }

        const agentCompetency = await prisma.agentCompetency.findUnique({
          where: { agentId_competencyId: { agentId, competencyId } },
        });

        const currentLevel = agentCompetency?.level || 'NOVICE';
        const requiredLevel = competency.level;

        if (LEVEL_ORDER[currentLevel] < LEVEL_ORDER[requiredLevel]) {
          // Find courses that can help bridge the gap
          const recommendedCourses = await this.findCoursesForCompetency(competencyId, currentLevel);

          gaps.push({
            competencyId,
            competencyName: competency.name,
            currentLevel,
            requiredLevel,
            gapLevel: this.calculateGapLevel(currentLevel, requiredLevel),
            recommendedCourses,
          });
        }
      }

      return gaps;
    } catch (error) {
      logger.error('Failed to analyze agent gaps', { error, agentId });
      throw error;
    }
  }

  async getAgentSkillMatrix(agentId: string): Promise<Record<string, CompetencyLevel>> {
    try {
      const agentCompetencies = await this.getAgentCompetencies(agentId);
      const matrix: Record<string, CompetencyLevel> = {};

      for (const ac of agentCompetencies) {
        matrix[ac.competencyId] = ac.level;
      }

      return matrix;
    } catch (error) {
      logger.error('Failed to get agent skill matrix', { error, agentId });
      throw error;
    }
  }

  // ========================================
  // Helpers
  // ========================================

  private calculateGapLevel(currentLevel: CompetencyLevel, requiredLevel: CompetencyLevel): CompetencyLevel {
    const diff = LEVEL_ORDER[requiredLevel] - LEVEL_ORDER[currentLevel];
    if (diff === 1) return 'BEGINNER';
    if (diff === 2) return 'INTERMEDIATE';
    if (diff === 3) return 'ADVANCED';
    return 'EXPERT';
  }

  private async findCoursesForCompetency(competencyId: string, currentLevel: CompetencyLevel): Promise<string[]> {
    try {
      // In a real implementation, this would use tags or metadata to match courses
      // to competencies. For now, we'll return an empty array.
      // This would be enhanced to:
      // 1. Tag courses with competency IDs or skill names
      // 2. Search for courses that cover the required skills
      // 3. Filter by level (intermediate or higher)
      // 4. Return only published courses

      return [];
    } catch (error) {
      logger.error('Failed to find courses for competency', { error, competencyId });
      return [];
    }
  }
}

export const competencyService = new CompetencyService();
