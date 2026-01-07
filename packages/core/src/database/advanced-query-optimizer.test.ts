import { AdvancedQueryOptimizer, QueryOptimizationUtils } from './advanced-query-optimizer.js';
import { MetricsCollector } from '../monitoring/metrics.js';

describe('AdvancedQueryOptimizer', () => {
  let queryOptimizer: AdvancedQueryOptimizer;
  let metricsMock: any;

  beforeEach(() => {
    metricsMock = {
      increment: jest.fn(),
      gauge: jest.fn(),
      getGaugeValue: jest.fn()
    };

    queryOptimizer = new AdvancedQueryOptimizer({
      metrics: metricsMock as any
    });
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(queryOptimizer).toBeDefined();
      expect(queryOptimizer['slowQueryThreshold']).toBe(1000);
      expect(queryOptimizer['largeResultThreshold']).toBe(1000);
    });

    it('should accept custom configuration', () => {
      const customOptimizer = new AdvancedQueryOptimizer({
        slowQueryThreshold: 500,
        largeResultThreshold: 500
      });

      expect(customOptimizer['slowQueryThreshold']).toBe(500);
      expect(customOptimizer['largeResultThreshold']).toBe(500);
    });
  });

  describe('Query Tracking', () => {
    it('should track query with execution plan', () => {
      const executionPlan = {
        "Node Type": "Seq Scan",
        "Relation Name": "leads",
        "Rows": 10000
      };

      queryOptimizer.trackQueryWithPlan(
        'SELECT * FROM leads WHERE status = $1',
        1500,
        executionPlan
      );

      expect(metricsMock.increment).toHaveBeenCalledWith('query_optimizer.slow_queries');
      expect(metricsMock.increment).toHaveBeenCalledWith('query_optimizer.full_table_scans');
    });

    it('should detect select star queries', () => {
      const executionPlan = {};

      queryOptimizer.trackQueryWithPlan(
        'SELECT * FROM users WHERE id = $1',
        500,
        executionPlan
      );

      expect(metricsMock.increment).toHaveBeenCalledWith('query_optimizer.select_star_queries');
    });

    it('should detect N+1 query patterns', () => {
      const executionPlan = {};

      // Simulate multiple calls to same query
      for (let i = 0; i < 15; i++) {
        queryOptimizer.trackQueryWithPlan(
          'SELECT * FROM leads WHERE id = $1',
          100,
          executionPlan
        );
      }

      expect(metricsMock.increment).toHaveBeenCalledWith('query_optimizer.n_plus_1_queries');
    });
  });

  describe('Index Recommendations', () => {
    it('should generate index recommendations', () => {
      // Add some query patterns
      queryOptimizer.trackQueryWithPlan(
        'SELECT * FROM leads WHERE status = $1',
        1500,
        { "Node Type": "Seq Scan", "Relation Name": "leads" }
      );

      queryOptimizer.trackQueryWithPlan(
        'SELECT * FROM policies WHERE user_id = $1',
        2000,
        { "Node Type": "Seq Scan", "Relation Name": "policies" }
      );

      const recommendations = queryOptimizer.generateIndexRecommendations();

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.table === 'leads')).toBe(true);
    });

    it('should generate SQL for index creation', () => {
      const recommendations = queryOptimizer.generateIndexRecommendations();
      const sql = queryOptimizer.generateIndexCreationSQL();

      expect(Array.isArray(sql)).toBe(true);
      expect(sql.length).toBeGreaterThan(0);
    });
  });

  describe('Query Statistics', () => {
    it('should track query statistics', () => {
      queryOptimizer.trackQuery('SELECT * FROM leads', 100);
      queryOptimizer.trackQuery('SELECT * FROM leads', 150);

      const stats = queryOptimizer.getQueryStats();
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].executionCount).toBe(2);
    });

    it('should check performance targets', () => {
      queryOptimizer.trackQuery('SELECT * FROM leads', 1200);

      const result = queryOptimizer.checkPerformanceTargets({
        p50: 500,
        p95: 1000,
        p99: 1500
      });

      expect(result.meetsTargets).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Optimization Report', () => {
    it('should generate comprehensive optimization report', () => {
      // Add some test data
      queryOptimizer.trackQueryWithPlan(
        'SELECT * FROM leads WHERE status = $1',
        1500,
        { "Node Type": "Seq Scan" }
      );

      const report = queryOptimizer.generateOptimizationReport();

      expect(report.slowQueries).toBeGreaterThan(0);
      expect(report.fullTableScans).toBeGreaterThan(0);
      expect(report.indexRecommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Query Optimization Utilities', () => {
    it('should rewrite SELECT * queries', () => {
      const query = 'SELECT * FROM users WHERE id = $1';
      const rewritten = QueryOptimizationUtils.rewriteSelectStarQuery(
        query,
        ['id', 'name', 'email']
      );

      expect(rewritten).toBe('SELECT id, name, email FROM users WHERE id = $1');
    });

    it('should add LIMIT to queries', () => {
      const query = 'SELECT * FROM leads';
      const limited = QueryOptimizationUtils.addLimitToQuery(query, 100);

      expect(limited).toBe('SELECT * FROM leads LIMIT 100');
    });

    it('should add pagination to queries', () => {
      const query = 'SELECT * FROM leads';
      const paginated = QueryOptimizationUtils.addPaginationToQuery(query, 2, 25);

      expect(paginated).toBe('SELECT * FROM leads LIMIT 25 OFFSET 25');
    });

    it('should generate covering index', () => {
      const query = 'SELECT id, name FROM users WHERE id = $1 AND status = $2';
      const index = QueryOptimizationUtils.generateCoveringIndex(query);

      expect(index).toBeDefined();
      expect(index?.table).toBe('users');
      expect(index?.columns).toContain('id');
      expect(index?.columns).toContain('status');
    });

    it('should batch queries', () => {
      const queries = Array.from({ length: 25 }, (_, i) => `SELECT * FROM leads WHERE id = ${i}`);
      const batches = QueryOptimizationUtils.batchQueries(queries, 10);

      expect(batches.length).toBe(3);
      expect(batches[0].length).toBe(10);
      expect(batches[1].length).toBe(10);
      expect(batches[2].length).toBe(5);
    });
  });

  describe('Query Decorators', () => {
    it('should create query performance tracker decorator', () => {
      const decorator = queryOptimizer.QueryPerformanceTracker();
      
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should create query optimizer decorator', () => {
      const decorator = queryOptimizer.QueryOptimizerWithPlan();
      
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });
  });
});