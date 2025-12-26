import neo4j from 'neo4j-driver';
import { logger } from '@insurance-lead-gen/core';

export class Neo4jDriver {
  private driver: neo4j.Driver | null = null;

  async connect(): Promise<void> {
    try {
      const uri = process.env.NEO4J_URI || 'bolt://localhost:7687';
      const auth = neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'password'
      );

      this.driver = neo4j.driver(uri, auth);
      await this.driver.verifyConnectivity();
      logger.info('Neo4j connection established');
    } catch (error) {
      logger.error('Failed to connect to Neo4j', { error });
      throw error;
    }
  }

  async initializeSchema(): Promise<void> {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const session = this.driver.session();
    
    try {
      // Create constraints for unique properties
      await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (l:Lead) REQUIRE l.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (a:Agent) REQUIRE a.id IS UNIQUE
      `);

      await session.run(`
        CREATE CONSTRAINT IF NOT EXISTS FOR (p:InsuranceProduct) REQUIRE p.type IS UNIQUE
      `);

      // Create indexes for performance
      await session.run(`
        CREATE INDEX IF NOT EXISTS FOR (l:Lead) ON (l.qualityScore)
      `);

      await session.run(`
        CREATE INDEX IF NOT EXISTS FOR (a:Agent) ON (a.specialization)
      `);

      await session.run(`
        CREATE INDEX IF NOT EXISTS FOR (a:Agent) ON (a.location)
      `);

      logger.info('Neo4j schema initialized');
    } catch (error) {
      logger.error('Failed to initialize Neo4j schema', { error });
      throw error;
    } finally {
      await session.close();
    }
  }

  async createLeadNode(leadId: string, leadData: any): Promise<void> {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const session = this.driver.session();
    
    try {
      await session.run(`
        CREATE (l:Lead {
          id: $id,
          qualityScore: $qualityScore,
          location: $location,
          type: $type
        })
      `, {
        id: leadId,
        qualityScore: leadData.qualityScore || 0,
        location: leadData.location || null,
        type: leadData.insuranceType || null
      });
      
      logger.info('Created lead node in Neo4j', { leadId });
    } catch (error) {
      logger.error('Failed to create lead node', { error, leadId });
      throw error;
    } finally {
      await session.close();
    }
  }

  async createAgentNode(agentId: string, agentData: any): Promise<void> {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const session = this.driver.session();
    
    try {
      await session.run(`
        CREATE (a:Agent {
          id: $id,
          name: $name,
          specialization: $specialization,
          rating: $rating,
          location: $location
        })
      `, {
        id: agentId,
        name: `${agentData.firstName} ${agentData.lastName}`,
        specialization: agentData.specializations || [],
        rating: agentData.rating || 0,
        location: agentData.location || null
      });
      
      logger.info('Created agent node in Neo4j', { agentId });
    } catch (error) {
      logger.error('Failed to create agent node', { error, agentId });
      throw error;
    } finally {
      await session.close();
    }
  }

  async createAssignmentRelationship(leadId: string, agentId: string): Promise<void> {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const session = this.driver.session();
    
    try {
      await session.run(`
        MATCH (l:Lead {id: $leadId})
        MATCH (a:Agent {id: $agentId})
        CREATE (l)-[r:ASSIGNED_TO]->(a)
        SET r.assignedAt = datetime()
      `, { leadId, agentId });
      
      logger.info('Created assignment relationship in Neo4j', { leadId, agentId });
    } catch (error) {
      logger.error('Failed to create assignment relationship', { error, leadId, agentId });
      throw error;
    } finally {
      await session.close();
    }
  }

  async findBestAgentsForLead(leadId: string, insuranceType: string, location: any): Promise<string[]> {
    if (!this.driver) {
      throw new Error('Neo4j driver not initialized');
    }

    const session = this.driver.session();
    
    try {
      // Extract state for broader matching
      const state = typeof location === 'string' ? null : location?.state;
      const city = typeof location === 'string' ? location : location?.city;

      const result = await session.run(`
        MATCH (a:Agent)
        WHERE (
          $insuranceType IN a.specialization OR 
          any(spec IN a.specialization WHERE toLower(spec) = toLower($insuranceType))
        )
        AND (
          a.location.state = $state OR 
          a.location.city = $city OR
          a.location = $city
        )
        RETURN a.id AS agentId
        ORDER BY a.rating DESC
        LIMIT 20
      `, { leadId, insuranceType, state, city });
      
      const agentIds = result.records.map(record => record.get('agentId'));
      logger.info('Found candidate agents for lead', { leadId, agentIdsCount: agentIds.length });
      return agentIds;
    } catch (error) {
      logger.error('Failed to find best agents', { error, leadId });
      throw error;
    } finally {
      await session.close();
    }
  }

  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
      logger.info('Neo4j connection closed');
    }
  }
}