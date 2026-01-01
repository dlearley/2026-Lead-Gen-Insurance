import { logger } from '@insurance-lead-gen/core';
import { prisma } from '../db';
import { Redis } from '../redis';
import neo4j from 'neo4j-driver';
import type { FeatureSet, FeatureMetadata, FeatureValue, FeatureEngineeringConfig } from '@insurance-lead-gen/types';

interface FeatureCache {
  get(key: string): Promise<FeatureValue | null>;
  set(key: string, value: FeatureValue, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

interface FeatureEngineeringFunctions {
  [key: string]: (params: any) => Promise<number | string | boolean>;
}

export class FeatureStore {
  private redis: Redis;
  private neo4jDriver: neo4j.Driver;
  private cache: FeatureCache;
  private featureEngineering: FeatureEngineeringFunctions;

  constructor(redis: Redis, neo4jDriver: neo4j.Driver) {
    this.redis = redis;
    this.neo4jDriver = neo4jDriver;
    this.cache = this.createCache();
    this.featureEngineering = this.initializeFeatureEngineering();
    logger.info('FeatureStore initialized');
  }

  private createCache(): FeatureCache {
    return {
      get: async (key: string) => {
        const value = await this.redis.get(`feature:${key}`);
        return value ? JSON.parse(value) : null;
      },
      set: async (key: string, value: FeatureValue, ttl: number = 3600) => {
        await this.redis.setex(`feature:${key}`, ttl, JSON.stringify(value));
      },
      delete: async (key: string) => {
        await this.redis.del([`feature:${key}`]);
      },
      clear: async () => {
        const keys = await this.redis.keys('feature:*');
        if (keys.length > 0) {
          await this.redis.del(keys);
        }
      }
    };
  }

  private initializeFeatureEngineering(): FeatureEngineeringFunctions {
    return {
      // Lead quality features
      calculateLeadQuality: async (params: { leadId: string }): Promise<number> => {
        const lead = await prisma.lead.findUnique({
          where: { id: params.leadId },
          select: { qualityScore: true, status: true, createdAt: true }
        });
        return lead?.qualityScore || 0;
      },

      // Engagement features
      calculateEngagementScore: async (params: { leadId: string }): Promise<number> => {
        const engagement = await prisma.customerEngagement.findUnique({
          where: { leadId: params.leadId },
          select: { engagementScore: true, emailOpenRate: true, clickThroughRate: true }
        });
        return engagement?.engagementScore || 0;
      },

      // Temporal features
      calculateLeadAgeDays: async (params: { leadId: string }): Promise<number> => {
        const lead = await prisma.lead.findUnique({
          where: { id: params.leadId },
          select: { createdAt: true }
        });
        if (!lead?.createdAt) return 0;
        return Math.floor((Date.now() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      },

      // Activity features
      calculateActivityCount: async (params: { leadId: string, days: number }): Promise<number> => {
        const dateFrom = new Date(Date.now() - params.days * 24 * 60 * 60 * 1000);
        const count = await prisma.activityLog.count({
          where: {
            leadId: params.leadId,
            createdAt: { gte: dateFrom }
          }
        });
        return count;
      },

      // Email engagement features
      calculateEmailEngagement: async (params: { leadId: string }): Promise<number> => {
        const emails = await prisma.email.findMany({
          where: { leadId: params.leadId },
          select: { openedAt: true, clickedAt: true }
        });
        if (emails.length === 0) return 0;
        const engagedEmails = emails.filter(e => e.openedAt || e.clickedAt).length;
        return engagedEmails / emails.length;
      },

      // Insurance type features
      getInsuranceType: async (params: { leadId: string }): Promise<string> => {
        const lead = await prisma.lead.findUnique({
          where: { id: params.leadId },
          select: { insuranceType: true }
        });
        return lead?.insuranceType || 'auto';
      },

      // Source features
      getLeadSource: async (params: { leadId: string }): Promise<string> => {
        const lead = await prisma.lead.findUnique({
          where: { id: params.leadId },
          select: { source: true }
        });
        return lead?.source || 'unknown';
      },

      // Status features
      getLeadStatus: async (params: { leadId: string }): Promise<string> => {
        const lead = await prisma.lead.findUnique({
          where: { id: params.leadId },
          select: { status: true }
        });
        return lead?.status || 'received';
      }
    };
  }

  /**
   * Get features for a specific entity (lead, agent, etc.)
   */
  async getFeatures(
    entityId: string,
    featureNames: string[],
    entityType: string = 'lead'
  ): Promise<Record<string, FeatureValue>> {
    const features: Record<string, FeatureValue> = {};
    
    for (const featureName of featureNames) {
      const cacheKey = `${entityType}:${entityId}:${featureName}`;
      
      // Try cache first
      const cached = await this.cache.get(cacheKey);
      if (cached !== null) {
        features[featureName] = cached;
        continue;
      }

      // Compute feature if not cached
      try {
        const value = await this.computeFeature(featureName, entityId, entityType);
        features[featureName] = value;
        
        // Cache the result (1 hour TTL)
        await this.cache.set(cacheKey, value, 3600);
      } catch (error) {
        logger.error(`Failed to compute feature ${featureName} for ${entityType} ${entityId}`, { error });
        features[featureName] = null;
      }
    }
    
    return features;
  }

  /**
   * Compute a specific feature value
   */
  private async computeFeature(featureName: string, entityId: string, entityType: string): Promise<FeatureValue> {
    if (entityType === 'lead') {
      // Use feature engineering functions for lead features
      const func = this.featureEngineering[featureName];
      if (func) {
        return await func({ leadId: entityId });
      }
    }

    // Default to database lookup for unknown features
    const metadata = await this.getFeatureMetadata(featureName);
    if (metadata?.defaultValue !== undefined) {
      return metadata.defaultValue;
    }

    return null;
  }

  /**
   * Get metadata for a feature
   */
  async getFeatureMetadata(featureName: string): Promise<FeatureMetadata | null> {
    const feature = await prisma.featureMetadata.findUnique({ where: { name: featureName } });
    return feature as FeatureMetadata | null;
  }

  /**
   * Register a new feature with metadata
   */
  async registerFeature(metadata: FeatureMetadata): Promise<void> {
    await prisma.featureMetadata.create({ data: metadata });
    logger.info('Feature registered', { featureName: metadata.name });
  }

  /**
   * Get feature values for multiple entities (batch)
   */
  async getFeaturesBatch(
    entityIds: string[],
    featureNames: string[],
    entityType: string = 'lead'
  ): Promise<Record<string, Record<string, FeatureValue>>> {
    const results: Record<string, Record<string, FeatureValue>> = {};
    
    for (const entityId of entityIds) {
      results[entityId] = await this.getFeatures(entityId, featureNames, entityType);
    }
    
    return results;
  }

  /**
   * Store computed features for later use
   */
  async storeFeatures(
    entityId: string,
    featureSet: FeatureSet,
    entityType: string = 'lead'
  ): Promise<void> {
    const batch = Object.entries(featureSet).map(([featureName, value]) => ({
      entityId,
      entityType,
      featureName,
      value,
      timestamp: new Date()
    }));

    // Store feature values in time series table
    await prisma.featureValue.createMany({ data: batch });
    
    // Update cache
    for (const [featureName, value] of Object.entries(featureSet)) {
      const cacheKey = `${entityType}:${entityId}:${featureName}`;
      await this.cache.set(cacheKey, value, 3600);
    }

    logger.info('Features stored', { entityId, entityType, count: Object.keys(featureSet).length });
  }

  /**
   * Get historical feature values
   */
  async getFeatureHistory(
    entityId: string,
    featureName: string,
    entityType: string = 'lead',
    fromDate?: Date,
    toDate?: Date
  ): Promise<FeatureValue[]> {
    const where: any = {
      entityId,
      entityType,
      featureName
    };

    if (fromDate || toDate) {
      where.timestamp = {};
      if (fromDate) where.timestamp.gte = fromDate;
      if (toDate) where.timestamp.lte = toDate;
    }

    const records = await prisma.featureValue.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 1000
    });

    return records.map(r => r.value);
  }

  /**
   * Perform feature engineering to create new features
   */
  async engineerFeatures(config: FeatureEngineeringConfig): Promise<FeatureSet> {
    const features: FeatureSet = {};
    
    // Lead features
    if (config.entityType === 'lead' && config.leadIds) {
      for (const leadId of config.leadIds) {
        const lead = await prisma.lead.findUnique({ where: { id: leadId } });
        if (!lead) continue;

        // Engagement-based features
        features[`lead_${leadId}_engagement_trend`] = await this.computeFeature('calculateEngagementScore', leadId, 'lead');
        features[`lead_${leadId}_activity_7d`] = await this.computeFeature('calculateActivityCount', leadId, 'lead', { days: 7 });
        features[`lead_${leadId}_activity_30d`] = await this.computeFeature('calculateActivityCount', leadId, 'lead', { days: 30 });
        features[`lead_${leadId}_email_engagement`] = await this.computeFeature('calculateEmailEngagement', leadId, 'lead');
        
        // Temporal features
        features[`lead_${leadId}_age_days`] = await this.computeFeature('calculateLeadAgeDays', leadId, 'lead');
        
        // Demographic features
        features[`lead_${leadId}_quality_score`] = lead.qualityScore || 0;
        features[`lead_${leadId}_insurance_type`] = lead.insuranceType || 'auto';
        features[`lead_${leadId}_source`] = lead.source;
        features[`lead_${leadId}_status`] = lead.status;
        
        // Interaction-based features
        const interactionCount = await prisma.activityLog.count({ where: { leadId } });
        features[`lead_${leadId}_total_interactions`] = interactionCount;
        
        // Categorical encoding for ML models
        features[`lead_${leadId}_type_auto`] = lead.insuranceType === 'auto' ? 1 : 0;
        features[`lead_${leadId}_type_home`] = lead.insuranceType === 'home' ? 1 : 0;
        features[`lead_${leadId}_type_life`] = lead.insuranceType === 'life' ? 1 : 0;
        features[`lead_${leadId}_type_health`] = lead.insuranceType === 'health' ? 1 : 0;
        features[`lead_${leadId}_type_commercial`] = lead.insuranceType === 'commercial' ? 1 : 0;
      }
    }

    logger.info('Feature engineering completed', { 
      entityType: config.entityType, 
      entityCount: config.leadIds?.length || 0,
      featureCount: Object.keys(features).length 
    });

    return features;
  }

  /**
   * Get features from Neo4j graph database for graph-based features
   */
  async getGraphFeatures(entityId: string, entityType: string = 'lead'): Promise<FeatureSet> {
    const session = this.neo4jDriver.session();
    const features: FeatureSet = {};

    try {
      if (entityType === 'lead') {
        // Get centrality metrics
        const centralityResult = await session.run(`
          MATCH (l:Lead {id: $id})
          OPTIONAL MATCH (l)-[r]-(n)
          RETURN 
            count(n) as node_count,
            count(DISTINCT type(r)) as relationship_types,
            avg(r.weight) as avg_relationship_strength
        `, { id: entityId });

        if (centralityResult.records.length > 0) {
          const record = centralityResult.records[0];
          features.graph_centrality_node_count = record.get('node_count') || 0;
          features.graph_relationship_types = record.get('relationship_types') || 0;
          features.graph_avg_relationship_strength = record.get('avg_relationship_strength') || 0;
        }

        // Get community features
        const communityResult = await session.run(`
          MATCH (l:Lead {id: $id})
          RETURN l.community as community, l.community_score as community_score
        `, { id: entityId });

        if (communityResult.records.length > 0) {
          const record = communityResult.records[0];
          features.graph_community = record.get('community') || 'unknown';
          features.graph_community_score = record.get('community_score') || 0;
        }

        // Get agent assignment features
        const agentResult = await session.run(`
          MATCH (l:Lead {id: $id})-[:ASSIGNED_TO]->(a:Agent)
          OPTIONAL MATCH (a)-[:ASSIGNED_TO]->(other:Lead)
          RETURN 
            a.id as agent_id,
            count(DISTINCT other) as agent_lead_count,
            avg(other.qualityScore) as agent_avg_quality
        `, { id: entityId });

        if (agentResult.records.length > 0) {
          const record = agentResult.records[0];
          features.graph_assigned_agent = record.get('agent_id') || 'unassigned';
          features.graph_agent_lead_count = record.get('agent_lead_count') || 0;
          features.graph_agent_avg_quality = record.get('agent_avg_quality') || 0;
        }
      }

      logger.info('Graph features extracted', { entityId, entityType, featureCount: Object.keys(features).length });
      return features;
    } finally {
      await session.close();
    }
  }

  /**
   * Clear cached features for an entity
   */
  async clearCache(entityId: string, entityType: string = 'lead'): Promise<void> {
    const pattern = `${entityType}:${entityId}:*`;
    const keys = await this.redis.keys(`feature:${pattern}`);
    if (keys.length > 0) {
      await this.redis.del(keys);
    }
    logger.info('Feature cache cleared', { entityId, entityType });
  }
}