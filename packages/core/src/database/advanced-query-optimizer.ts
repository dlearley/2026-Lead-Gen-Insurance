import { logger } from '../logger.js';
import { MetricsCollector } from '../monitoring/metrics.js';
import { QueryOptimizer } from './query-optimizer.js';

/**
 * Database index configuration
 */
export interface DatabaseIndex {
  table: string;
  columns: string[];
  type?: 'btree' | 'hash' | 'gin' | 'gist' | 'spgist' | 'brin';
  unique?: boolean;
  where?: string; // For partial indexes
  include?: string[]; // Included columns
  concurrent?: boolean;
}

/**
 * Query optimization recommendation
 */
export interface QueryOptimizationRecommendation {
  query: string;
  recommendations: Array<{
    type: 'missing_index' | 'full_table_scan' | 'inefficient_join' | 'select_star' | 'n_plus_1' | 'large_result_set';
    description: string;
    severity: 'high' | 'medium' | 'low';
    suggestion: string;
    affectedTables?: string[];
    affectedColumns?: string[];
  }>;
  executionPlan?: any;
  queryDuration?: number;
}

/**
 * Query execution statistics
 */
export interface QueryExecutionStats {
  query: string;
  executionCount: number;
  totalDuration: number;
  avgDuration: number;
  maxDuration: number;
  minDuration: number;
  p50Duration: number;
  p95Duration: number;
  p99Duration: number;
  lastExecution: Date;
  fullTableScans: number;
  indexUsage: number;
  rowsReturned: number;
  rowsExamined: number;
}

/**
 * Table statistics for optimization
 */
export interface TableStats {
  tableName: string;
  rowCount: number;
  sizeMB: number;
  indexCount: number;
  lastAnalyzed: Date;
  readOperations: number;
  writeOperations: number;
  deadTuples: number;
  autovacuumEnabled: boolean;
}

/**
 * Index statistics
 */
export interface IndexStats {
  indexName: string;
  tableName: string;
  columns: string[];
  sizeMB: number;
  usageCount: number;
  lastUsed: Date;
  scanCount: number;
  effectiveness: number; // 0-1 scale
}

/**
 * Advanced Query Optimizer with comprehensive database optimization features
 */
export class AdvancedQueryOptimizer extends QueryOptimizer {
  private metrics: MetricsCollector;
  private slowQueryThreshold: number;
  private largeResultThreshold: number;
  private fullTableScanThreshold: number;
  private indexRecommendations: DatabaseIndex[];
  private queryStatsMap: Map<string, QueryExecutionStats>;
  private tableStatsMap: Map<string, TableStats>;
  private indexStatsMap: Map<string, IndexStats>;
  private optimizationRecommendations: QueryOptimizationRecommendation[];

  constructor(options: {
    slowQueryThreshold?: number;
    largeResultThreshold?: number;
    fullTableScanThreshold?: number;
    metrics?: MetricsCollector;
  } = {}) {
    super(options.slowQueryThreshold || 1000);
    this.metrics = options.metrics || new MetricsCollector();
    this.slowQueryThreshold = options.slowQueryThreshold || 1000; // 1 second
    this.largeResultThreshold = options.largeResultThreshold || 1000; // 1000 rows
    this.fullTableScanThreshold = options.fullTableScanThreshold || 10000; // 10000 rows
    this.indexRecommendations = [];
    this.queryStatsMap = new Map();
    this.tableStatsMap = new Map();
    this.indexStatsMap = new Map();
    this.optimizationRecommendations = [];
    
    this.setupMetrics();
  }

  private setupMetrics(): void {
    // Register metrics
    this.metrics.gauge('query_optimizer.slow_queries', 0);
    this.metrics.gauge('query_optimizer.full_table_scans', 0);
    this.metrics.gauge('query_optimizer.n_plus_1_queries', 0);
    this.metrics.gauge('query_optimizer.select_star_queries', 0);
    this.metrics.gauge('query_optimizer.inefficient_joins', 0);
    this.metrics.gauge('query_optimizer.large_result_sets', 0);
    this.metrics.gauge('query_optimizer.missing_indexes', 0);
  }

  /**
   * Enhanced query tracking with execution plan analysis
   */
  trackQueryWithPlan(query: string, duration: number, executionPlan: any, params?: any): void {
    super.trackQuery(query, duration, params);
    
    // Analyze execution plan for optimization opportunities
    this.analyzeExecutionPlan(query, executionPlan, duration);
    
    // Update query statistics
    this.updateQueryStats(query, duration, executionPlan);
    
    // Check for slow queries
    if (duration > this.slowQueryThreshold) {
      this.metrics.increment('query_optimizer.slow_queries');
      logger.warn('Slow query detected with execution plan', {
        query,
        duration,
        threshold: this.slowQueryThreshold,
        executionPlan
      });
    }
  }

  /**
   * Analyze execution plan for optimization opportunities
   */
  private analyzeExecutionPlan(query: string, executionPlan: any, duration: number): void {
    const recommendations: QueryOptimizationRecommendation['recommendations'] = [];
    
    // Check for full table scans (Seq Scan in PostgreSQL)
    if (this.hasFullTableScan(executionPlan)) {
      this.metrics.increment('query_optimizer.full_table_scans');
      recommendations.push({
        type: 'full_table_scan',
        description: 'Query performs full table scan',
        severity: 'high',
        suggestion: 'Add appropriate indexes on filtered columns',
        affectedTables: this.extractTablesFromPlan(executionPlan)
      });
    }

    // Check for SELECT * queries
    if (this.isSelectStarQuery(query)) {
      this.metrics.increment('query_optimizer.select_star_queries');
      recommendations.push({
        type: 'select_star',
        description: 'Query uses SELECT *',
        severity: 'medium',
        suggestion: 'Specify only needed columns to reduce data transfer',
        affectedTables: this.extractTablesFromQuery(query)
      });
    }

    // Check for N+1 query patterns
    if (this.isNPlusOneQuery(query, executionPlan)) {
      this.metrics.increment('query_optimizer.n_plus_1_queries');
      recommendations.push({
        type: 'n_plus_1',
        description: 'Potential N+1 query pattern detected',
        severity: 'high',
        suggestion: 'Use JOIN or batch loading instead of multiple single queries',
        affectedTables: this.extractTablesFromQuery(query)
      });
    }

    // Check for inefficient joins
    if (this.hasInefficientJoins(executionPlan)) {
      this.metrics.increment('query_optimizer.inefficient_joins');
      recommendations.push({
        type: 'inefficient_join',
        description: 'Inefficient join operation detected',
        severity: 'high',
        suggestion: 'Optimize join conditions or add appropriate indexes',
        affectedTables: this.extractTablesFromPlan(executionPlan)
      });
    }

    // Check for large result sets
    if (executionPlan && executionPlan.rows && executionPlan.rows > this.largeResultThreshold) {
      this.metrics.increment('query_optimizer.large_result_sets');
      recommendations.push({
        type: 'large_result_set',
        description: `Query returns large result set (${executionPlan.rows} rows)`,
        severity: 'medium',
        suggestion: 'Implement pagination or limit result size',
        affectedTables: this.extractTablesFromQuery(query)
      });
    }

    // Check for missing indexes
    const missingIndexes = this.detectMissingIndexes(query, executionPlan);
    if (missingIndexes.length > 0) {
      this.metrics.increment('query_optimizer.missing_indexes', missingIndexes.length);
      missingIndexes.forEach(index => {
        recommendations.push({
          type: 'missing_index',
          description: `Missing index on ${index.columns.join(', ')}`,
          severity: 'high',
          suggestion: `Create index on ${index.columns.join(', ')} for table ${index.table}`,
          affectedTables: [index.table],
          affectedColumns: index.columns
        });
      });
    }

    if (recommendations.length > 0) {
      this.optimizationRecommendations.push({
        query,
        recommendations,
        executionPlan,
        queryDuration: duration
      });
      
      logger.info('Query optimization recommendations generated', {
        query,
        recommendationCount: recommendations.length,
        duration
      });
    }
  }

  /**
   * Update query statistics
   */
  private updateQueryStats(query: string, duration: number, executionPlan: any): void {
    const normalizedQuery = this.normalizeQuery(query);
    const existingStats = this.queryStatsMap.get(normalizedQuery) || this.createDefaultQueryStats(query);
    
    // Update execution statistics
    existingStats.executionCount++;
    existingStats.totalDuration += duration;
    existingStats.avgDuration = existingStats.totalDuration / existingStats.executionCount;
    existingStats.maxDuration = Math.max(existingStats.maxDuration, duration);
    existingStats.minDuration = Math.min(existingStats.minDuration, duration);
    existingStats.lastExecution = new Date();
    
    // Update percentiles (simplified - in production use proper percentile calculation)
    if (duration <= existingStats.p50Duration * 1.5) {
      existingStats.p50Duration = (existingStats.p50Duration + duration) / 2;
    }
    if (duration <= existingStats.p95Duration * 1.5) {
      existingStats.p95Duration = (existingStats.p95Duration + duration) / 2;
    }
    if (duration <= existingStats.p99Duration * 1.5) {
      existingStats.p99Duration = (existingStats.p99Duration + duration) / 2;
    }
    
    // Update execution plan metrics
    if (executionPlan) {
      if (this.hasFullTableScan(executionPlan)) {
        existingStats.fullTableScans++;
      }
      if (this.usesIndexes(executionPlan)) {
        existingStats.indexUsage++;
      }
      if (executionPlan.rows) {
        existingStats.rowsReturned += executionPlan.rows;
        existingStats.rowsExamined += executionPlan.rows || 0;
      }
    }
    
    this.queryStatsMap.set(normalizedQuery, existingStats);
  }

  private createDefaultQueryStats(query: string): QueryExecutionStats {
    return {
      query,
      executionCount: 0,
      totalDuration: 0,
      avgDuration: 0,
      maxDuration: 0,
      minDuration: Number.MAX_VALUE,
      p50Duration: 0,
      p95Duration: 0,
      p99Duration: 0,
      lastExecution: new Date(),
      fullTableScans: 0,
      indexUsage: 0,
      rowsReturned: 0,
      rowsExamined: 0
    };
  }

  /**
   * Generate index recommendations based on query patterns
   */
  generateIndexRecommendations(): DatabaseIndex[] {
    const recommendations: DatabaseIndex[] = [];
    const seenIndexes = new Set<string>();
    
    // Analyze optimization recommendations
    this.optimizationRecommendations.forEach(optimization => {
      optimization.recommendations.forEach(rec => {
        if (rec.type === 'missing_index' && rec.affectedTables && rec.affectedColumns) {
          const indexKey = `${rec.affectedTables[0]}:${rec.affectedColumns.join(',')}`;
          
          if (!seenIndexes.has(indexKey)) {
            seenIndexes.add(indexKey);
            
            recommendations.push({
              table: rec.affectedTables[0],
              columns: rec.affectedColumns,
              type: 'btree', // Default to btree
              unique: false
            });
          }
        }
      });
    });
    
    // Add common index recommendations
    this.addCommonIndexRecommendations(recommendations, seenIndexes);
    
    return recommendations;
  }

  private addCommonIndexRecommendations(recommendations: DatabaseIndex[], seenIndexes: Set<string>): void {
    // Add indexes on foreign keys
    const commonForeignKeys = [
      { table: 'leads', columns: ['user_id', 'campaign_id', 'source_id'] },
      { table: 'policies', columns: ['user_id', 'lead_id', 'carrier_id'] },
      { table: 'activities', columns: ['lead_id', 'user_id'] },
      { table: 'integrations', columns: ['lead_id', 'carrier_id'] }
    ];
    
    commonForeignKeys.forEach(fk => {
      const indexKey = `${fk.table}:${fk.columns.join(',')}`;
      if (!seenIndexes.has(indexKey)) {
        recommendations.push({
          table: fk.table,
          columns: fk.columns,
          type: 'btree',
          unique: false
        });
        seenIndexes.add(indexKey);
      }
    });
    
    // Add indexes on frequently filtered columns
    const commonFilterColumns = [
      { table: 'leads', columns: ['status', 'created_at', 'insurance_type', 'state'] },
      { table: 'policies', columns: ['status', 'created_at', 'expiration_date', 'policy_type'] },
      { table: 'users', columns: ['role', 'status', 'created_at'] },
      { table: 'activities', columns: ['activity_type', 'created_at', 'lead_id'] }
    ];
    
    commonFilterColumns.forEach(filter => {
      const indexKey = `${filter.table}:${filter.columns.join(',')}`;
      if (!seenIndexes.has(indexKey)) {
        recommendations.push({
          table: filter.table,
          columns: filter.columns,
          type: 'btree',
          unique: false
        });
        seenIndexes.add(indexKey);
      }
    });
    
    // Add composite indexes for common query patterns
    const compositeIndexes = [
      { table: 'leads', columns: ['status', 'created_at'] },
      { table: 'leads', columns: ['insurance_type', 'state'] },
      { table: 'policies', columns: ['status', 'expiration_date'] },
      { table: 'activities', columns: ['lead_id', 'created_at'] }
    ];
    
    compositeIndexes.forEach(comp => {
      const indexKey = `${comp.table}:${comp.columns.join(',')}`;
      if (!seenIndexes.has(indexKey)) {
        recommendations.push({
          table: comp.table,
          columns: comp.columns,
          type: 'btree',
          unique: false
        });
        seenIndexes.add(indexKey);
      }
    });
  }

  /**
   * Generate SQL for creating recommended indexes
   */
  generateIndexCreationSQL(): string[] {
    const sqlStatements: string[] = [];
    const existingIndexes = new Set<string>();
    
    // Get existing indexes from stats (simplified - in production query database catalog)
    this.indexStatsMap.forEach(index => {
      existingIndexes.add(`${index.tableName}:${index.columns.join(',')}`);
    });
    
    this.indexRecommendations.forEach(index => {
      const indexKey = `${index.table}:${index.columns.join(',')}`;
      
      if (!existingIndexes.has(indexKey)) {
        const uniqueClause = index.unique ? 'UNIQUE' : '';
        const columns = index.columns.join(', ');
        const includeClause = index.include ? ` INCLUDE (${index.include.join(', ')})` : '';
        const whereClause = index.where ? ` WHERE ${index.where}` : '';
        const concurrentClause = index.concurrent ? ' CONCURRENTLY' : '';
        
        const sql = `CREATE ${uniqueClause} INDEX${concurrentClause} idx_${index.table}_${index.columns.join('_')}
                    ON ${index.table} (${columns})${includeClause}${whereClause};`;
        
        sqlStatements.push(sql);
      }
    });
    
    return sqlStatements;
  }

  /**
   * Analyze table for optimization opportunities
   */
  async analyzeTable(tableName: string, stats: TableStats): Promise<TableStats> {
    // Update table statistics
    this.tableStatsMap.set(tableName, stats);
    
    // Check for optimization opportunities
    const opportunities: string[] = [];
    
    if (stats.rowCount > 1000000 && !stats.autovacuumEnabled) {
      opportunities.push('Enable autovacuum for large table');
    }
    
    if (stats.deadTuples > stats.rowCount * 0.1) {
      opportunities.push('High dead tuple ratio - consider manual vacuum');
    }
    
    if (stats.sizeMB > 1000) {
      opportunities.push('Large table - consider partitioning');
    }
    
    if (opportunities.length > 0) {
      logger.info('Table optimization opportunities', {
        table: tableName,
        opportunities,
        stats
      });
    }
    
    return stats;
  }

  /**
   * Analyze index effectiveness
   */
  async analyzeIndex(indexName: string, stats: IndexStats): Promise<IndexStats> {
    // Update index statistics
    this.indexStatsMap.set(indexName, stats);
    
    // Calculate effectiveness (usage vs size)
    const effectiveness = stats.usageCount > 0
      ? Math.min(1, stats.usageCount / (stats.sizeMB * 10))
      : 0;
    
    stats.effectiveness = effectiveness;
    
    if (effectiveness < 0.1 && stats.sizeMB > 10) {
      logger.warn('Ineffective index detected', {
        index: indexName,
        effectiveness,
        sizeMB: stats.sizeMB,
        usageCount: stats.usageCount
      });
    }
    
    return stats;
  }

  /**
   * Get query optimization recommendations
   */
  getQueryOptimizationRecommendations(limit: number = 10): QueryOptimizationRecommendation[] {
    return this.optimizationRecommendations
      .sort((a, b) => {
        // Sort by severity and duration
        const aSeverity = this.getMaxSeverityScore(a.recommendations);
        const bSeverity = this.getMaxSeverityScore(b.recommendations);
        
        if (aSeverity !== bSeverity) {
          return bSeverity - aSeverity;
        }
        
        return (b.queryDuration || 0) - (a.queryDuration || 0);
      })
      .slice(0, limit);
  }

  private getMaxSeverityScore(recommendations: QueryOptimizationRecommendation['recommendations']): number {
    let maxScore = 0;
    
    recommendations.forEach(rec => {
      switch (rec.severity) {
        case 'high': maxScore = Math.max(maxScore, 3); break;
        case 'medium': maxScore = Math.max(maxScore, 2); break;
        case 'low': maxScore = Math.max(maxScore, 1); break;
      }
    });
    
    return maxScore;
  }

  /**
   * Get query execution statistics
   */
  getQueryStats(limit: number = 10): QueryExecutionStats[] {
    return Array.from(this.queryStatsMap.values())
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, limit);
  }

  /**
   * Get table statistics
   */
  getTableStats(): TableStats[] {
    return Array.from(this.tableStatsMap.values());
  }

  /**
   * Get index statistics
   */
  getIndexStats(): IndexStats[] {
    return Array.from(this.indexStatsMap.values());
  }

  /**
   * Check if query meets performance targets
   */
  checkPerformanceTargets(targets: {
    p50?: number;
    p95?: number;
    p99?: number;
    maxDuration?: number;
  }): { meetsTargets: boolean; violations: string[] } {
    const violations: string[] = [];
    
    this.queryStatsMap.forEach(stats => {
      if (targets.p50 && stats.p50Duration > targets.p50) {
        violations.push(`Query P50 exceeds target: ${stats.p50Duration.toFixed(2)}ms > ${targets.p50}ms (${stats.query})`);
      }
      
      if (targets.p95 && stats.p95Duration > targets.p95) {
        violations.push(`Query P95 exceeds target: ${stats.p95Duration.toFixed(2)}ms > ${targets.p95}ms (${stats.query})`);
      }
      
      if (targets.p99 && stats.p99Duration > targets.p99) {
        violations.push(`Query P99 exceeds target: ${stats.p99Duration.toFixed(2)}ms > ${targets.p99}ms (${stats.query})`);
      }
      
      if (targets.maxDuration && stats.maxDuration > targets.maxDuration) {
        violations.push(`Query max duration exceeds target: ${stats.maxDuration.toFixed(2)}ms > ${targets.maxDuration}ms (${stats.query})`);
      }
    });
    
    return {
      meetsTargets: violations.length === 0,
      violations
    };
  }

  /**
   * Generate comprehensive optimization report
   */
  generateOptimizationReport(): {
    slowQueries: number;
    fullTableScans: number;
    nPlusOneQueries: number;
    selectStarQueries: number;
    inefficientJoins: number;
    largeResultSets: number;
    missingIndexes: number;
    indexRecommendations: DatabaseIndex[];
    queryStats: QueryExecutionStats[];
    tableStats: TableStats[];
    indexStats: IndexStats[];
    topOptimizationOpportunities: QueryOptimizationRecommendation[];
  } {
    return {
      slowQueries: this.metrics.getGaugeValue('query_optimizer.slow_queries'),
      fullTableScans: this.metrics.getGaugeValue('query_optimizer.full_table_scans'),
      nPlusOneQueries: this.metrics.getGaugeValue('query_optimizer.n_plus_1_queries'),
      selectStarQueries: this.metrics.getGaugeValue('query_optimizer.select_star_queries'),
      inefficientJoins: this.metrics.getGaugeValue('query_optimizer.inefficient_joins'),
      largeResultSets: this.metrics.getGaugeValue('query_optimizer.large_result_sets'),
      missingIndexes: this.metrics.getGaugeValue('query_optimizer.missing_indexes'),
      indexRecommendations: this.generateIndexRecommendations(),
      queryStats: this.getQueryStats(20),
      tableStats: this.getTableStats(),
      indexStats: this.getIndexStats(),
      topOptimizationOpportunities: this.getQueryOptimizationRecommendations(10)
    };
  }

  /**
   * Clear all optimization data
   */
  clearOptimizationData(): void {
    this.optimizationRecommendations = [];
    this.queryStatsMap.clear();
    this.tableStatsMap.clear();
    this.indexStatsMap.clear();
    this.indexRecommendations = [];
    
    // Reset metrics
    this.metrics.gauge('query_optimizer.slow_queries', 0);
    this.metrics.gauge('query_optimizer.full_table_scans', 0);
    this.metrics.gauge('query_optimizer.n_plus_1_queries', 0);
    this.metrics.gauge('query_optimizer.select_star_queries', 0);
    this.metrics.gauge('query_optimizer.inefficient_joins', 0);
    this.metrics.gauge('query_optimizer.large_result_sets', 0);
    this.metrics.gauge('query_optimizer.missing_indexes', 0);
  }

  /**
   * Execution plan analysis helpers
   */

  private hasFullTableScan(executionPlan: any): boolean {
    if (!executionPlan) return false;
    
    // Check for Seq Scan in PostgreSQL execution plans
    const planString = JSON.stringify(executionPlan);
    return planString.includes('"Node Type": "Seq Scan"') ||
           planString.includes('"Seq Scan"') ||
           planString.includes('sequential scan');
  }

  private isSelectStarQuery(query: string): boolean {
    const normalizedQuery = query.toUpperCase().trim();
    return normalizedQuery.includes('SELECT *') ||
           normalizedQuery.includes('SELECT\s+\*');
  }

  private isNPlusOneQuery(query: string, executionPlan: any): boolean {
    // Simple heuristic - multiple similar queries in short time
    // In production, use more sophisticated detection
    const normalizedQuery = this.normalizeQuery(query);
    const existingStats = this.queryStatsMap.get(normalizedQuery);
    
    if (existingStats && existingStats.executionCount > 10) {
      // Check if it's a single record query
      const isSingleRecord = query.includes('WHERE id =') ||
                            query.includes('WHERE "id" =') ||
                            query.includes('WHERE `id` =');
      
      return isSingleRecord;
    }
    
    return false;
  }

  private hasInefficientJoins(executionPlan: any): boolean {
    if (!executionPlan) return false;
    
    const planString = JSON.stringify(executionPlan);
    
    // Check for nested loops with large datasets
    return planString.includes('"Join Type": "Nested Loop"') &&
           planString.includes('"Rows":') &&
           this.extractRowCount(planString) > this.fullTableScanThreshold;
  }

  private extractRowCount(planString: string): number {
    const match = planString.match(/"Rows":\s*(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  private detectMissingIndexes(query: string, executionPlan: any): DatabaseIndex[] {
    const missingIndexes: DatabaseIndex[] = [];
    
    if (!executionPlan) return missingIndexes;
    
    // Extract tables from query
    const tables = this.extractTablesFromQuery(query);
    
    // Check for filter conditions that could benefit from indexes
    const filterConditions = this.extractFilterConditions(query);
    
    filterConditions.forEach(condition => {
      if (condition.table && condition.column) {
        // Check if this column is already indexed
        const isIndexed = this.isColumnIndexed(condition.table, condition.column);
        
        if (!isIndexed) {
          missingIndexes.push({
            table: condition.table,
            columns: [condition.column],
            type: 'btree'
          });
        }
      }
    });
    
    return missingIndexes;
  }

  private isColumnIndexed(table: string, column: string): boolean {
    // Check existing indexes
    for (const index of this.indexRecommendations) {
      if (index.table === table && index.columns.includes(column)) {
        return true;
      }
    }
    
    // Check index stats
    for (const index of this.indexStatsMap.values()) {
      if (index.tableName === table && index.columns.includes(column)) {
        return true;
      }
    }
    
    return false;
  }

  private extractTablesFromQuery(query: string): string[] {
    const tables: string[] = [];
    const fromMatch = query.match(/FROM\s+([\w\s,]+)/i);
    const joinMatch = query.match(/JOIN\s+([\w\s]+)/gi);
    
    if (fromMatch) {
      tables.push(...fromMatch[1].split(',').map(t => t.trim()));
    }
    
    if (joinMatch) {
      joinMatch.forEach(match => {
        const table = match.replace(/JOIN\s+/i, '').trim();
        tables.push(table);
      });
    }
    
    return tables.filter(t => t && !t.includes(' '));
  }

  private extractTablesFromPlan(executionPlan: any): string[] {
    if (!executionPlan) return [];
    
    const tables: string[] = [];
    const planString = JSON.stringify(executionPlan);
    
    // Extract table names from execution plan
    const tableMatches = planString.match(/"Relation Name":\s*"([^"]+)"/g);
    
    if (tableMatches) {
      tableMatches.forEach(match => {
        const table = match.match(/"([^"]+)"/)?.[1];
        if (table) tables.push(table);
      });
    }
    
    return tables;
  }

  private extractFilterConditions(query: string): Array<{ table?: string; column?: string }> {
    const conditions: Array<{ table?: string; column?: string }> = [];
    
    // Simple regex to extract WHERE conditions
    const whereMatch = query.match(/WHERE\s+(.+?)(?:GROUP BY|ORDER BY|LIMIT|$)/i);
    
    if (whereMatch) {
      const whereClause = whereMatch[1];
      
      // Extract column conditions
      const columnMatches = whereClause.match(/(\w+)\.(\w+)\s*=/g);
      
      if (columnMatches) {
        columnMatches.forEach(match => {
          const parts = match.split('.');
          if (parts.length >= 2) {
            conditions.push({
              table: parts[0],
              column: parts[1].split('=')[0].trim()
            });
          }
        });
      }
    }
    
    return conditions;
  }

  private usesIndexes(executionPlan: any): boolean {
    if (!executionPlan) return false;
    
    const planString = JSON.stringify(executionPlan);
    
    // Check for index scans
    return planString.includes('"Index Scan"') ||
           planString.includes('"Node Type": "Index Scan"') ||
           planString.includes('index scan');
  }

  /**
   * Query optimization decorators
   */

  /**
   * Decorator to track query performance
   */
  QueryPerformanceTracker() {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const startTime = Date.now();
        
        try {
          const result = await originalMethod.apply(this, args);
          const duration = Date.now() - startTime;
          
          // Extract query from method arguments or return value
          const query = this.extractQueryFromMethod(args, result);
          
          if (query) {
            this.trackQuery(query, duration);
          }
          
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          const query = this.extractQueryFromMethod(args, null);
          
          if (query) {
            this.trackQuery(query, duration);
          }
          
          throw error;
        }
      };
      
      return descriptor;
    };
  }

  private extractQueryFromMethod(args: any[], result: any): string | null {
    // Try to extract query from arguments
    for (const arg of args) {
      if (typeof arg === 'string' && arg.trim().toUpperCase().startsWith('SELECT')) {
        return arg;
      }
    }
    
    // Try to extract from result
    if (result && typeof result === 'object' && result.query) {
      return result.query;
    }
    
    return null;
  }

  /**
   * Decorator to optimize queries with execution plan analysis
   */
  QueryOptimizerWithPlan() {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const startTime = Date.now();
        
        try {
          const result = await originalMethod.apply(this, args);
          const duration = Date.now() - startTime;
          
          // Extract query and execution plan
          const { query, executionPlan } = this.extractQueryAndPlanFromMethod(args, result);
          
          if (query && executionPlan) {
            this.trackQueryWithPlan(query, duration, executionPlan);
          } else if (query) {
            this.trackQuery(query, duration);
          }
          
          return result;
        } catch (error) {
          const duration = Date.now() - startTime;
          const { query, executionPlan } = this.extractQueryAndPlanFromMethod(args, null);
          
          if (query && executionPlan) {
            this.trackQueryWithPlan(query, duration, executionPlan);
          } else if (query) {
            this.trackQuery(query, duration);
          }
          
          throw error;
        }
      };
      
      return descriptor;
    };
  }

  private extractQueryAndPlanFromMethod(args: any[], result: any): { query?: string; executionPlan?: any } {
    // Try to extract from arguments
    for (const arg of args) {
      if (typeof arg === 'string' && arg.trim().toUpperCase().startsWith('SELECT')) {
        return { query: arg };
      }
    }
    
    // Try to extract from result
    if (result && typeof result === 'object') {
      if (result.query) {
        return {
          query: result.query,
          executionPlan: result.executionPlan
        };
      }
    }
    
    return {};
  }
}

/**
 * Factory function to create AdvancedQueryOptimizer
 */
export function createAdvancedQueryOptimizer(options?: {
  slowQueryThreshold?: number;
  largeResultThreshold?: number;
  fullTableScanThreshold?: number;
  metrics?: MetricsCollector;
}): AdvancedQueryOptimizer {
  return new AdvancedQueryOptimizer(options);
}

/**
 * Query optimization utilities
 */
export class QueryOptimizationUtils {
  /**
   * Rewrite query to avoid SELECT *
   */
  static rewriteSelectStarQuery(query: string, allowedColumns: string[]): string {
    return query.replace(/SELECT\s+\*/gi, `SELECT ${allowedColumns.join(', ')}`);
  }

  /**
   * Add LIMIT clause to query
   */
  static addLimitToQuery(query: string, limit: number): string {
    if (query.toUpperCase().includes('LIMIT')) {
      return query; // Already has LIMIT
    }
    
    return `${query} LIMIT ${limit}`;
  }

  /**
   * Add pagination to query
   */
  static addPaginationToQuery(query: string, page: number, pageSize: number): string {
    const offset = (page - 1) * pageSize;
    
    if (query.toUpperCase().includes('LIMIT') || query.toUpperCase().includes('OFFSET')) {
      return query; // Already has pagination
    }
    
    return `${query} LIMIT ${pageSize} OFFSET ${offset}`;
  }

  /**
   * Generate covering index recommendation
   */
  static generateCoveringIndex(query: string): DatabaseIndex | null {
    // Extract SELECT columns and WHERE conditions
    const selectColumns = this.extractSelectColumns(query);
    const whereColumns = this.extractWhereColumns(query);
    const tables = this.extractTablesFromQuery(query);
    
    if (tables.length === 0 || selectColumns.length === 0) {
      return null;
    }
    
    // Combine columns for covering index
    const indexColumns = [...whereColumns, ...selectColumns];
    
    return {
      table: tables[0],
      columns: indexColumns,
      type: 'btree',
      include: selectColumns // Include columns for covering index
    };
  }

  private static extractSelectColumns(query: string): string[] {
    const selectMatch = query.match(/SELECT\s+(.+?)\s+FROM/i);
    if (!selectMatch) return [];
    
    return selectMatch[1].split(',').map(col => col.trim());
  }

  private static extractWhereColumns(query: string): string[] {
    const whereMatch = query.match(/WHERE\s+(.+?)(?:GROUP BY|ORDER BY|LIMIT|$)/i);
    if (!whereMatch) return [];
    
    const columns: string[] = [];
    const whereClause = whereMatch[1];
    
    // Extract column names from conditions
    const columnMatches = whereClause.match(/(\w+)\.(\w+)/g);
    
    if (columnMatches) {
      columnMatches.forEach(match => {
        const parts = match.split('.');
        if (parts.length >= 2) {
          columns.push(parts[1]);
        }
      });
    }
    
    return columns;
  }

  private static extractTablesFromQuery(query: string): string[] {
    const tables: string[] = [];
    const fromMatch = query.match(/FROM\s+([\w\s,]+)/i);
    
    if (fromMatch) {
      tables.push(...fromMatch[1].split(',').map(t => t.trim()));
    }
    
    return tables.filter(t => t && !t.includes(' '));
  }

  /**
   * Batch query execution
   */
  static batchQueries(queries: string[], batchSize: number = 10): string[][] {
    const batches: string[][] = [];
    
    for (let i = 0; i < queries.length; i += batchSize) {
      batches.push(queries.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Generate query for index analysis
   */
  static generateIndexAnalysisQuery(table: string): string {
    return `
      SELECT
        indexname AS index_name,
        indexdef AS index_definition,
        pg_size_pretty(pg_relation_size(indexrelid)) AS size,
        idx_scan AS scans,
        idx_tup_read AS tuples_read,
        idx_tup_fetch AS tuples_fetched
      FROM pg_indexes
      JOIN pg_stat_user_indexes ON indexname = indexrelname
      WHERE tablename = '${table}'
      ORDER BY idx_scan DESC;
    `;
  }

  /**
   * Generate query for table analysis
   */
  static generateTableAnalysisQuery(table: string): string {
    return `
      SELECT
        relname AS table_name,
        n_live_tup AS live_rows,
        n_dead_tup AS dead_rows,
        last_autovacuum,
        last_autoanalyze,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
        pg_size_pretty(pg_relation_size(relid)) AS data_size,
        pg_size_pretty(pg_indexes_size(relid)) AS indexes_size
      FROM pg_stat_user_tables
      WHERE relname = '${table}';
    `;
  }
}