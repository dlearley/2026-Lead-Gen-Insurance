import neo4j, { Driver, Session } from 'neo4j-driver';
import { logger } from '@insurance-lead-gen/core';
import type { Agent, Lead } from '@insurance-lead-gen/types';

export class Neo4jService {
  private driver: Driver;
  private static instance: Neo4jService;

  private constructor() {
    const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
    const authStr = process.env.NEO4J_AUTH || 'neo4j/password';
    const [username, password] = authStr.split('/');

    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
    
    logger.info('Neo4j connection established', { uri });
  }

  static getInstance(): Neo4jService {
    if (!Neo4jService.instance) {
      Neo4jService.instance = new Neo4jService();
    }
    return Neo4jService.instance;
  }

  async createAgentNode(agent: Agent): Promise<void> {
    const session: Session = this.driver.session();
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `
          MERGE (a:Agent {id: $id})
          SET a += {
            firstName: $firstName,
            lastName: $lastName,
            email: $email,
            phone: $phone,
            licenseNumber: $licenseNumber,
            rating: $rating,
            isActive: $isActive,
            maxLeadCapacity: $maxLeadCapacity,
            currentLeadCount: $currentLeadCount,
            averageResponseTime: $averageResponseTime,
            conversionRate: $conversionRate,
            city: $city,
            state: $state,
            country: $country,
            updatedAt: datetime()
          }
          WITH a
          UNWIND $specializations as spec
          MERGE (p:InsuranceProduct {type: spec})
          MERGE (a)-[:SPECIALIZES_IN]->(p)
          RETURN a
          `,
          {
            id: agent.id,
            firstName: agent.firstName,
            lastName: agent.lastName,
            email: agent.email,
            phone: agent.phone,
            licenseNumber: agent.licenseNumber,
            rating: agent.rating,
            isActive: agent.isActive,
            maxLeadCapacity: agent.maxLeadCapacity,
            currentLeadCount: agent.currentLeadCount,
            averageResponseTime: agent.averageResponseTime,
            conversionRate: agent.conversionRate,
            city: agent.location.city,
            state: agent.location.state,
            country: agent.location.country,
            specializations: agent.specializations,
          }
        );
      });
      
      logger.info('Agent node created/updated in Neo4j', { agentId: agent.id });
    } catch (error) {
      logger.error('Failed to create agent node', { error, agentId: agent.id });
      throw error;
    } finally {
      await session.close();
    }
  }

  async createLeadNode(lead: Lead): Promise<void> {
    const session: Session = this.driver.session();
    try {
      const qualityScore = lead.qualityScore || 50;
      
      await session.executeWrite(async (tx) => {
        const leadResult = await tx.run(
          `
          CREATE (l:Lead {
            id: $id,
            source: $source,
            qualityScore: $qualityScore,
            status: $status,
            city: $city,
            state: $state,
            country: $country,
            insuranceType: $insuranceType,
            createdAt: datetime()
          })
          RETURN l
          `,
          {
            id: lead.id,
            source: lead.source,
            qualityScore: qualityScore,
            status: lead.status,
            city: lead.address?.city,
            state: lead.address?.state,
            country: lead.address?.country,
            insuranceType: lead.insuranceType,
          }
        );

        if (lead.insuranceType) {
          await tx.run(
            `
            MATCH (l:Lead {id: $leadId})
            MERGE (p:InsuranceProduct {type: $insuranceType})
            MERGE (l)-[:QUALIFIED_FOR]->(p)
            `,
            {
              leadId: lead.id,
              insuranceType: lead.insuranceType,
            }
          );
        }
      });
      
      logger.info('Lead node created in Neo4j', { leadId: lead.id });
    } catch (error) {
      logger.error('Failed to create lead node', { error, leadId: lead.id });
      throw error;
    } finally {
      await session.close();
    }
  }

  async assignLeadToAgent(leadId: string, agentId: string): Promise<void> {
    const session: Session = this.driver.session();
    try {
      await session.executeWrite(async (tx) => {
        await tx.run(
          `
          MATCH (l:Lead {id: $leadId})
          MATCH (a:Agent {id: $agentId})
          MERGE (l)-[:ASSIGNED_TO {
            assignedAt: datetime()
          }]->(a)
          SET a.currentLeadCount = a.currentLeadCount + 1
          RETURN l, a
          `,
          {
            leadId,
            agentId,
          }
        );
      });
      
      logger.info('Lead assigned to agent in Neo4j', { leadId, agentId });
    } catch (error) {
      logger.error('Failed to assign lead to agent', { error, leadId, agentId });
      throw error;
    } finally {
      await session.close();
    }
  }

  async findBestMatchingAgents(
    leadId: string,
    limit: number = 5
  ): Promise<Array<{ agent: Agent; score: number }>> {
    const session: Session = this.driver.session();
    try {
      const result = await session.executeRead(async (tx) => {
        return await tx.run(
          `
          MATCH (l:Lead {id: $leadId})
          MATCH (a:Agent)
          WHERE a.isActive = true AND a.currentLeadCount < a.maxLeadCapacity
          
          OPTIONAL MATCH (a)-[:SPECIALIZES_IN]->(p:InsuranceProduct)<-[:QUALIFIED_FOR]-(l)
          WITH a, l, CASE WHEN p IS NOT NULL THEN 30 ELSE 0 END as specializationScore
          
          WITH a, l, specializationScore,
               CASE 
                 WHEN a.city = l.city THEN 25
                 WHEN a.state = l.state THEN 15
                 ELSE 5
               END as locationScore,
               a.rating * 10 as ratingScore,
               a.conversionRate * 20 as performanceScore,
               (1 - (a.currentLeadCount.toFloat() / a.maxLeadCapacity.toFloat())) * 20 as capacityScore
          
          WITH a, specializationScore + locationScore + ratingScore + performanceScore + capacityScore as totalScore
          ORDER BY totalScore DESC
          LIMIT $limit
          RETURN a, totalScore
          `,
          {
            leadId,
            limit: neo4j.int(limit),
          }
        );
      });

      const matches = result.records.map((record) => {
        const agentNode = record.get('a');
        const score = record.get('totalScore');
        
        return {
          agent: {
            id: agentNode.properties.id,
            firstName: agentNode.properties.firstName,
            lastName: agentNode.properties.lastName,
            email: agentNode.properties.email,
            phone: agentNode.properties.phone,
            licenseNumber: agentNode.properties.licenseNumber,
            specializations: [], // Will be populated separately
            location: {
              city: agentNode.properties.city,
              state: agentNode.properties.state,
              country: agentNode.properties.country,
            },
            rating: agentNode.properties.rating,
            isActive: agentNode.properties.isActive,
            maxLeadCapacity: agentNode.properties.maxLeadCapacity.toNumber(),
            currentLeadCount: agentNode.properties.currentLeadCount.toNumber(),
            averageResponseTime: agentNode.properties.averageResponseTime,
            conversionRate: agentNode.properties.conversionRate,
            createdAt: agentNode.properties.createdAt,
            updatedAt: agentNode.properties.updatedAt,
          },
          score,
        };
      });

      logger.info('Found matching agents', { leadId, count: matches.length });
      return matches;
    } catch (error) {
      logger.error('Failed to find matching agents', { error, leadId });
      throw error;
    } finally {
      await session.close();
    }
  }

  async getAgentSpecialties(agentId: string): Promise<string[]> {
    const session: Session = this.driver.session();
    try {
      const result = await session.executeRead(async (tx) => {
        return await tx.run(
          `
          MATCH (a:Agent {id: $agentId})-[:SPECIALIZES_IN]->(p:InsuranceProduct)
          RETURN collect(p.type) as specialties
          `,
          { agentId }
        );
      });

      if (result.records.length > 0) {
        return result.records[0].get('specialties');
      }
      return [];
    } catch (error) {
      logger.error('Failed to get agent specialties', { error, agentId });
      throw error;
    } finally {
      await session.close();
    }
  }

  async getAgentPerformanceMetrics(agentId: string): Promise<{
    totalLeads: number;
    convertedLeads: number;
    averageResponseTime: number;
    acceptanceRate: number;
  }> {
    const session: Session = this.driver.session();
    try {
      const result = await session.executeRead(async (tx) => {
        return await tx.run(
          `
          MATCH (a:Agent {id: $agentId})
          OPTIONAL MATCH (a)<-[:ASSIGNED_TO]-(l:Lead)
          OPTIONAL MATCH (a)<-[:ASSIGNED_TO]-(convertedLead:Lead {status: 'converted'})
          RETURN 
            count(DISTINCT l) as totalLeads,
            count(DISTINCT convertedLead) as convertedLeads,
            a.averageResponseTime as avgResponseTime,
            a.conversionRate as conversionRate
          `,
          { agentId }
        );
      });

      if (result.records.length > 0) {
        const record = result.records[0];
        return {
          totalLeads: record.get('totalLeads').toNumber(),
          convertedLeads: record.get('convertedLeads').toNumber(),
          averageResponseTime: record.get('avgResponseTime'),
          acceptanceRate: record.get('conversionRate'),
        };
      }
      
      return {
        totalLeads: 0,
        convertedLeads: 0,
        averageResponseTime: 0,
        acceptanceRate: 0,
      };
    } catch (error) {
      logger.error('Failed to get agent performance metrics', { error, agentId });
      throw error;
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    await this.driver.close();
    logger.info('Neo4j connection closed');
  }
}