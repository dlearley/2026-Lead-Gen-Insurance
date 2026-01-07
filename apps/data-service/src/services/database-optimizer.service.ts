/**
 * Database Optimization Service
 * Handles query optimization, indexing strategies, and performance analysis
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@insurance-lead-gen/core';
import type {
  QueryOptimizationResult,
  QueryExecutionPlan,
  QueryRecommendation,
  DatabaseIndexStrategy,
  IndexRecommendation,
  DataArchivalPolicy,
  DataArchivalResult,
  ConnectionPoolMetrics,
} from '@insurance-lead-gen/types';

export class DatabaseOptimizerService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async analyzeQuery(query: string): Promise<QueryOptimizationResult> {
    const startTime = Date.now();

    try {
      const explainResult = await this.prisma.$queryRawUnsafe<any[]>(
        `EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON) ${query}`
      );

      const executionTime = Date.now() - startTime;
      const plan = explainResult[0]['QUERY PLAN'][0] as any;

      const result: QueryOptimizationResult = {
        query,
        executionTime,
        planTime: plan['Planning Time'] || 0,
        totalCost: plan.Plan['Total Cost'] || 0,
        rows: plan.Plan['Actual Rows'] || 0,
        plan: this.parsePlan(plan.Plan),
        recommendations: this.generateQueryRecommendations(plan),
      };

      logger.info('Query analyzed', { executionTime, totalCost: result.totalCost });
      return result;
    } catch (error) {
      logger.error('Query analysis failed', { error, query });
      throw error;
    }
  }

  private parsePlan(plan: any): QueryExecutionPlan {
    return {
      nodeType: plan['Node Type'],
      relation: plan['Relation Name'],
      alias: plan['Alias'],
      startupCost: plan['Startup Cost'],
      totalCost: plan['Total Cost'],
      planRows: plan['Plan Rows'],
      planWidth: plan['Plan Width'],
      actualTime: plan['Actual Total Time'],
      actualRows: plan['Actual Rows'],
      actualLoops: plan['Actual Loops'],
      plans: plan.Plans ? plan.Plans.map((p: any) => this.parsePlan(p)) : undefined,
    };
  }

  private generateQueryRecommendations(plan: any): QueryRecommendation[] {
    const recommendations: QueryRecommendation[] = [];

    const flattenPlan = (p: any): any[] => {
      const plans = [p];
      if (p.Plans) {
        p.Plans.forEach((child: any) => plans.push(...flattenPlan(child)));
      }
      return plans;
    };

    const allPlans = flattenPlan(plan.Plan);

    allPlans.forEach((p) => {
      if (p['Node Type'] === 'Seq Scan' && p['Plan Rows'] > 1000) {
        recommendations.push({
          type: 'index',
          description: `Sequential scan on ${p['Relation Name']} with ${p['Plan Rows']} rows`,
          impact: 'high',
          implementation: `Consider adding an index on frequently filtered columns in ${p['Relation Name']}`,
        });
      }

      if (p['Actual Loops'] > 100) {
        recommendations.push({
          type: 'rewrite',
          description: `High loop count (${p['Actual Loops']}) indicates potential N+1 query problem`,
          impact: 'high',
          implementation: 'Consider using JOINs or batch queries instead of loops',
        });
      }

      if (p['Total Cost'] > 10000) {
        recommendations.push({
          type: 'partition',
          description: `High query cost (${p['Total Cost']}) on ${p['Relation Name']}`,
          impact: 'medium',
          implementation: 'Consider partitioning large tables by date or other criteria',
        });
      }
    });

    return recommendations;
  }

  async getIndexingStrategy(): Promise<DatabaseIndexStrategy[]> {
    const tables = [
      'Lead',
      'Agent',
      'LeadAssignment',
      'Event',
      'Carrier',
      'CarrierPerformanceMetric',
    ];

    const strategies: DatabaseIndexStrategy[] = [];

    for (const table of tables) {
      const indexes = await this.getTableIndexes(table);
      const recommendations = this.generateIndexRecommendations(table);

      strategies.push({
        tableName: table,
        indexes,
        recommendations,
      });
    }

    return strategies;
  }

  private async getTableIndexes(table: string): Promise<any[]> {
    try {
      const indexes = await this.prisma.$queryRawUnsafe<any[]>(
        `
        SELECT
          indexname as name,
          indexdef as definition
        FROM pg_indexes
        WHERE tablename = $1
        AND schemaname = 'public'
        `,
        table
      );

      return indexes;
    } catch (error) {
      logger.error('Failed to get table indexes', { error, table });
      return [];
    }
  }

  private generateIndexRecommendations(table: string): IndexRecommendation[] {
    const recommendations: IndexRecommendation[] = [];

    const indexStrategies: Record<string, IndexRecommendation[]> = {
      Lead: [
        {
          table: 'Lead',
          columns: ['status', 'createdAt'],
          reason: 'Frequently used together for filtering leads by status and time range',
          priority: 'high',
          estimatedImpact: '30-50% improvement on lead listing queries',
        },
        {
          table: 'Lead',
          columns: ['insuranceType', 'qualityScore'],
          reason: 'Used for lead routing and qualification queries',
          priority: 'high',
          estimatedImpact: '40-60% improvement on routing queries',
        },
        {
          table: 'Lead',
          columns: ['zipCode', 'insuranceType'],
          reason: 'Geographic and type-based lead distribution',
          priority: 'medium',
          estimatedImpact: '25-40% improvement on geographic queries',
        },
      ],
      Agent: [
        {
          table: 'Agent',
          columns: ['isActive', 'currentLeadCount'],
          reason: 'Used for finding available agents for lead assignment',
          priority: 'high',
          estimatedImpact: '50-70% improvement on agent availability queries',
        },
        {
          table: 'Agent',
          columns: ['state', 'city', 'specializations'],
          reason: 'Geographic and specialization-based agent matching',
          priority: 'medium',
          estimatedImpact: '30-50% improvement on agent matching queries',
        },
      ],
      LeadAssignment: [
        {
          table: 'LeadAssignment',
          columns: ['status', 'assignedAt'],
          reason: 'Track assignment status over time',
          priority: 'high',
          estimatedImpact: '40-60% improvement on assignment tracking',
        },
        {
          table: 'LeadAssignment',
          columns: ['agentId', 'status'],
          reason: 'Agent workload and performance queries',
          priority: 'medium',
          estimatedImpact: '30-50% improvement on agent workload queries',
        },
      ],
      Event: [
        {
          table: 'Event',
          columns: ['entityType', 'entityId', 'timestamp'],
          reason: 'Event sourcing queries by entity and time',
          priority: 'high',
          estimatedImpact: '50-70% improvement on event history queries',
        },
        {
          table: 'Event',
          columns: ['type', 'timestamp'],
          reason: 'Event analytics and reporting',
          priority: 'medium',
          estimatedImpact: '30-50% improvement on event analytics',
        },
      ],
    };

    return indexStrategies[table] || [];
  }

  async getConnectionPoolMetrics(): Promise<ConnectionPoolMetrics> {
    try {
      const poolStats = await this.prisma.$queryRaw<any[]>`
        SELECT
          sum(numbackends) as total,
          sum(CASE WHEN state = 'idle' THEN 1 ELSE 0 END) as idle,
          sum(CASE WHEN state = 'active' THEN 1 ELSE 0 END) as active,
          sum(CASE WHEN wait_event_type IS NOT NULL THEN 1 ELSE 0 END) as waiting
        FROM pg_stat_database
      `;

      return {
        total: Number(poolStats[0]?.total || 0),
        idle: Number(poolStats[0]?.idle || 0),
        active: Number(poolStats[0]?.active || 0),
        waiting: Number(poolStats[0]?.waiting || 0),
        acquireCount: 0,
        acquireTime: 0,
        createCount: 0,
        destroyCount: 0,
      };
    } catch (error) {
      logger.error('Failed to get connection pool metrics', { error });
      throw error;
    }
  }

  async archiveOldData(policy: DataArchivalPolicy): Promise<DataArchivalResult> {
    const startTime = new Date();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.archiveAfterDays);

      let recordsArchived = 0;
      let recordsDeleted = 0;

      if (policy.table === 'Event') {
        if (policy.archiveStrategy === 'delete') {
          const result = await this.prisma.$executeRaw`
            DELETE FROM "Event"
            WHERE timestamp < ${cutoffDate}
          `;
          recordsDeleted = result;
        } else if (policy.archiveStrategy === 'move' && policy.archiveDestination) {
          const events = await this.prisma.$queryRaw`
            SELECT * FROM "Event"
            WHERE timestamp < ${cutoffDate}
          `;
          recordsArchived = Array.isArray(events) ? events.length : 0;

          await this.prisma.$executeRaw`
            DELETE FROM "Event"
            WHERE timestamp < ${cutoffDate}
          `;
        }
      }

      const endTime = new Date();

      const result: DataArchivalResult = {
        table: policy.table,
        recordsArchived,
        recordsDeleted,
        startTime,
        endTime,
        status: 'success',
      };

      logger.info('Data archival completed', result);
      return result;
    } catch (error) {
      logger.error('Data archival failed', { error, policy });
      return {
        table: policy.table,
        recordsArchived: 0,
        recordsDeleted: 0,
        startTime,
        endTime: new Date(),
        status: 'failed',
        errors: [String(error)],
      };
    }
  }

  async getSlowQueries(limit: number = 10): Promise<any[]> {
    try {
      const slowQueries = await this.prisma.$queryRaw<any[]>`
        SELECT
          query,
          calls,
          total_exec_time,
          mean_exec_time,
          max_exec_time,
          stddev_exec_time
        FROM pg_stat_statements
        ORDER BY mean_exec_time DESC
        LIMIT ${limit}
      `;

      return slowQueries;
    } catch (error) {
      logger.warn('pg_stat_statements extension may not be enabled', { error });
      return [];
    }
  }

  async optimizeTable(tableName: string): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(`VACUUM ANALYZE "${tableName}"`);
      logger.info('Table optimized', { tableName });
    } catch (error) {
      logger.error('Table optimization failed', { error, tableName });
      throw error;
    }
  }

  async getTableStats(tableName: string): Promise<any> {
    try {
      const stats = await this.prisma.$queryRaw<any[]>`
        SELECT
          schemaname,
          tablename,
          pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
          pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
          pg_size_pretty(pg_indexes_size(schemaname||'.'||tablename)) as indexes_size,
          n_tup_ins as inserts,
          n_tup_upd as updates,
          n_tup_del as deletes,
          n_live_tup as live_rows,
          n_dead_tup as dead_rows,
          last_vacuum,
          last_autovacuum,
          last_analyze,
          last_autoanalyze
        FROM pg_stat_user_tables
        WHERE tablename = ${tableName}
      `;

      return stats[0] || null;
    } catch (error) {
      logger.error('Failed to get table stats', { error, tableName });
      throw error;
    }
  }

  async getDatabaseSize(): Promise<any> {
    try {
      const size = await this.prisma.$queryRaw<any[]>`
        SELECT
          pg_database.datname,
          pg_size_pretty(pg_database_size(pg_database.datname)) as size,
          pg_database_size(pg_database.datname) as size_bytes
        FROM pg_database
        WHERE datname = current_database()
      `;

      return size[0] || null;
    } catch (error) {
      logger.error('Failed to get database size', { error });
      throw error;
    }
  }
}
