import neo4j from 'neo4j-driver';
import { logger } from '@insurance-lead-gen/core';

export class Neo4jDriver {
  private driver: neo4j.Driver;
  private config: {
    uri: string;
    username: string;
    password: string;
  };

  constructor(config: { uri: string; username: string; password: string }) {
    this.config = config;
  }

  async connect() {
    try {
      this.driver = neo4j.driver(
        this.config.uri,
        neo4j.auth.basic(this.config.username, this.config.password)
      );
      
      // Test the connection
      await this.driver.verifyConnectivity();
      logger.info('Neo4j connection verified');
    } catch (error) {
      logger.error('Failed to connect to Neo4j', { error: error.message });
      throw error;
    }
  }

  async close() {
    try {
      await this.driver.close();
      logger.info('Neo4j connection closed');
    } catch (error) {
      logger.error('Error closing Neo4j connection', { error: error.message });
      throw error;
    }
  }

  async executeQuery(query: string, params: Record<string, any> = {}) {
    const session = this.driver.session();
    try {
      const result = await session.run(query, params);
      return result.records.map(record => record.toObject());
    } finally {
      await session.close();
    }
  }

  async createLeadNode(leadId: string, leadData: any) {
    const query = `
      CREATE (l:Lead {
        id: $id,
        qualityScore: $qualityScore,
        insuranceType: $insuranceType,
        createdAt: datetime($createdAt)
      })
      RETURN l
    `;
    
    const params = {
      id: leadId,
      qualityScore: leadData.qualityScore || 0,
      insuranceType: leadData.insuranceType || 'unknown',
      createdAt: new Date().toISOString(),
    };
    
    return this.executeQuery(query, params);
  }

  async createAgentNode(agentId: string, agentData: any) {
    const query = `
      CREATE (a:Agent {
        id: $id,
        name: $name,
        specialization: $specialization,
        rating: $rating,
        location: $location
      })
      RETURN a
    `;
    
    const params = {
      id: agentId,
      name: `${agentData.firstName} ${agentData.lastName}`,
      specialization: agentData.specializations?.join(', ') || '',
      rating: agentData.rating || 0,
      location: `${agentData.location?.city}, ${agentData.location?.state}`,
    };
    
    return this.executeQuery(query, params);
  }

  async createAssignmentRelationship(leadId: string, agentId: string) {
    const query = `
      MATCH (l:Lead {id: $leadId}), (a:Agent {id: $agentId})
      CREATE (l)-[r:ASSIGNED_TO {
        assignedAt: datetime($assignedAt),
        status: $status
      }]->(a)
      RETURN r
    `;
    
    const params = {
      leadId,
      agentId,
      assignedAt: new Date().toISOString(),
      status: 'pending',
    };
    
    return this.executeQuery(query, params);
  }
}