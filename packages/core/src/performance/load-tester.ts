import { logger } from '../logger.js';
import { MetricsCollector } from '../monitoring/metrics.js';

/**
 * Load test configuration
 */
export interface LoadTestConfig {
  name: string;
  description?: string;
  duration: number; // seconds
  rampUp: number; // seconds
  virtualUsers: number;
  targetRPS?: number; // requests per second
  endpoints: Array<{
    path: string;
    method: string;
    weight?: number; // relative weight for distribution
    headers?: Record<string, string>;
    body?: any;
    queryParams?: Record<string, string>;
  }>;
  thinkTime?: {
    min: number; // ms
    max: number; // ms
  };
  assertions?: Array<{
    metric: 'responseTime' | 'errorRate' | 'throughput';
    operator: '<' | '>' | '<=' | '>=' | '==' | '!=';
    value: number;
    description: string;
  }>;
}

/**
 * Load test scenario
 */
export interface LoadTestScenario {
  id: string;
  name: string;
  description: string;
  type: 'baseline' | 'peak' | 'burst' | 'sustained' | 'stress' | 'endurance';
  config: LoadTestConfig;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Load test results
 */
export interface LoadTestResults {
  scenarioId: string;
  scenarioName: string;
  startTime: Date;
  endTime: Date;
  duration: number; // seconds
  virtualUsers: number;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  errorRate: number; // percentage
  throughput: number; // requests per second
  avgResponseTime: number; // ms
  p50ResponseTime: number; // ms
  p95ResponseTime: number; // ms
  p99ResponseTime: number; // ms
  maxResponseTime: number; // ms
  avgResponseSize: number; // bytes
  maxResponseSize: number; // bytes
  endpointStats: Array<{
    endpoint: string;
    method: string;
    requests: number;
    avgResponseTime: number;
    errorRate: number;
  }>;
  assertions: Array<{
    name: string;
    passed: boolean;
    actual: number;
    expected: number;
    operator: string;
    description: string;
  }>;
  systemMetrics: {
    cpuUsage: number; // percentage
    memoryUsage: number; // percentage
    diskIO: number; // MB/s
    networkIO: number; // MB/s
  };
  passed: boolean;
}

/**
 * Load test assertion result
 */
export interface LoadTestAssertionResult {
  name: string;
  passed: boolean;
  actual: number;
  expected: number;
  operator: string;
  description: string;
}

/**
 * Load test performance baseline
 */
export interface LoadTestBaseline {
  endpoint: string;
  method: string;
  baselineRPS: number;
  baselineResponseTime: number; // ms
  baselineErrorRate: number; // percentage
  baselineThroughput: number; // requests per second
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Load test performance regression
 */
export interface LoadTestRegression {
  endpoint: string;
  method: string;
  metric: 'responseTime' | 'errorRate' | 'throughput';
  baselineValue: number;
  currentValue: number;
  regressionPercentage: number;
  detectedAt: Date;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Load Tester for comprehensive performance testing
 */
export class LoadTester {
  private metrics: MetricsCollector;
  private scenarios: Map<string, LoadTestScenario>;
  private baselines: Map<string, LoadTestBaseline>;
  private results: Map<string, LoadTestResults>;
  private regressions: LoadTestRegression[];

  constructor(options: {
    metrics?: MetricsCollector;
  } = {}) {
    this.metrics = options.metrics || new MetricsCollector();
    this.scenarios = new Map();
    this.baselines = new Map();
    this.results = new Map();
    this.regressions = [];
    
    this.setupMetrics();
  }

  private setupMetrics(): void {
    // Load testing metrics
    this.metrics.gauge('load_test.total_scenarios', 0);
    this.metrics.gauge('load_test.total_baselines', 0);
    this.metrics.gauge('load_test.total_regressions', 0);
    this.metrics.gauge('load_test.current_virtual_users', 0);
    this.metrics.gauge('load_test.current_throughput', 0);
    this.metrics.gauge('load_test.current_error_rate', 0);
    this.metrics.gauge('load_test.current_response_time', 0);
  }

  /**
   * Create a new load test scenario
   */
  createScenario(config: LoadTestConfig): LoadTestScenario {
    const scenario: LoadTestScenario = {
      id: this.generateId(),
      name: config.name,
      description: config.description || '',
      type: this.determineScenarioType(config),
      config,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.scenarios.set(scenario.id, scenario);
    this.metrics.gauge('load_test.total_scenarios', this.scenarios.size);
    
    logger.info('Load test scenario created', { scenarioId: scenario.id, name: scenario.name });
    
    return scenario;
  }

  private determineScenarioType(config: LoadTestConfig): LoadTestScenario['type'] {
    if (config.duration > 3600) {
      return 'endurance';
    }
    
    if (config.virtualUsers > 1000 || (config.targetRPS && config.targetRPS > 100)) {
      return 'stress';
    }
    
    if (config.duration > 600) {
      return 'sustained';
    }
    
    if (config.rampUp && config.rampUp < 10) {
      return 'burst';
    }
    
    if (config.virtualUsers > 200) {
      return 'peak';
    }
    
    return 'baseline';
  }

  /**
   * Update load test scenario
   */
  updateScenario(id: string, updates: Partial<LoadTestConfig>): LoadTestScenario | null {
    const scenario = this.scenarios.get(id);
    
    if (!scenario) {
      logger.warn('Load test scenario not found', { scenarioId: id });
      return null;
    }
    
    scenario.config = { ...scenario.config, ...updates };
    scenario.type = this.determineScenarioType(scenario.config);
    scenario.updatedAt = new Date();
    
    this.scenarios.set(id, scenario);
    
    logger.info('Load test scenario updated', { scenarioId: id });
    
    return scenario;
  }

  /**
   * Get load test scenario
   */
  getScenario(id: string): LoadTestScenario | null {
    return this.scenarios.get(id) || null;
  }

  /**
   * List all load test scenarios
   */
  listScenarios(): LoadTestScenario[] {
    return Array.from(this.scenarios.values());
  }

  /**
   * Delete load test scenario
   */
  deleteScenario(id: string): boolean {
    const scenario = this.scenarios.get(id);
    
    if (!scenario) {
      return false;
    }
    
    this.scenarios.delete(id);
    this.metrics.gauge('load_test.total_scenarios', this.scenarios.size);
    
    logger.info('Load test scenario deleted', { scenarioId: id });
    
    return true;
  }

  /**
   * Execute load test scenario (simulated - in production integrate with k6/JMeter)
   */
  async executeScenario(id: string): Promise<LoadTestResults | null> {
    const scenario = this.scenarios.get(id);
    
    if (!scenario) {
      logger.warn('Load test scenario not found', { scenarioId: id });
      return null;
    }
    
    logger.info('Starting load test execution', {
      scenarioId: id,
      name: scenario.name,
      type: scenario.type
    });
    
    const startTime = new Date();
    
    // Simulate load test execution
    const results = await this.simulateLoadTestExecution(scenario);
    
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
    
    results.scenarioId = id;
    results.scenarioName = scenario.name;
    results.startTime = startTime;
    results.endTime = endTime;
    results.duration = duration;
    
    // Store results
    this.results.set(id, results);
    
    // Check for regressions
    this.detectRegressions(results);
    
    logger.info('Load test completed', {
      scenarioId: id,
      duration,
      passed: results.passed
    });
    
    return results;
  }

  private async simulateLoadTestExecution(scenario: LoadTestScenario): Promise<LoadTestResults> {
    const config = scenario.config;
    const totalRequests = config.virtualUsers * (config.duration / (config.thinkTime?.min || 1000)) * 1000;
    
    // Simulate request execution with realistic timing
    const successfulRequests = Math.floor(totalRequests * 0.95); // 95% success rate
    const failedRequests = totalRequests - successfulRequests;
    
    // Generate realistic response times (log-normal distribution)
    const responseTimes = this.generateResponseTimes(successfulRequests, config);
    
    // Calculate statistics
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    const sortedResponseTimes = [...responseTimes].sort((a, b) => a - b);
    
    const p50ResponseTime = sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.5)];
    const p95ResponseTime = sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.95)];
    const p99ResponseTime = sortedResponseTimes[Math.floor(sortedResponseTimes.length * 0.99)];
    const maxResponseTime = Math.max(...responseTimes);
    
    // Calculate throughput
    const throughput = totalRequests / config.duration;
    const errorRate = (failedRequests / totalRequests) * 100;
    
    // Generate endpoint statistics
    const endpointStats = this.generateEndpointStats(config.endpoints, totalRequests, responseTimes);
    
    // Run assertions
    const assertions = this.runAssertions(config.assertions || [], {
      responseTime: avgResponseTime,
      errorRate,
      throughput
    });
    
    // Check if test passed
    const passed = assertions.every(a => a.passed);
    
    // Simulate system metrics
    const systemMetrics = this.simulateSystemMetrics(config);
    
    return {
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      startTime: new Date(),
      endTime: new Date(),
      duration: config.duration,
      virtualUsers: config.virtualUsers,
      totalRequests,
      successfulRequests,
      failedRequests,
      errorRate,
      throughput,
      avgResponseTime,
      p50ResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      maxResponseTime,
      avgResponseSize: 5000, // Simulated average response size
      maxResponseSize: 50000, // Simulated max response size
      endpointStats,
      assertions,
      systemMetrics,
      passed
    };
  }

  private generateResponseTimes(count: number, config: LoadTestConfig): number[] {
    const responseTimes: number[] = [];
    
    // Base response time based on scenario type
    let baseResponseTime = 100; // ms
    
    switch (scenario.type) {
      case 'baseline':
        baseResponseTime = 50;
        break;
      case 'peak':
        baseResponseTime = 150;
        break;
      case 'burst':
        baseResponseTime = 200;
        break;
      case 'sustained':
        baseResponseTime = 120;
        break;
      case 'stress':
        baseResponseTime = 500;
        break;
      case 'endurance':
        baseResponseTime = 180;
        break;
    }
    
    // Add variability based on virtual users
    const userLoadFactor = 1 + (config.virtualUsers / 100);
    
    for (let i = 0; i < count; i++) {
      // Log-normal distribution for realistic response times
      const normal = this.gaussianRandom();
      const logNormal = Math.exp(normal * 0.5 - 0.125);
      
      const responseTime = baseResponseTime * userLoadFactor * logNormal;
      responseTimes.push(Math.max(10, Math.min(5000, responseTime))); // Clamp between 10ms and 5s
    }
    
    return responseTimes;
  }

  private gaussianRandom(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  private generateEndpointStats(
    endpoints: LoadTestConfig['endpoints'],
    totalRequests: number,
    responseTimes: number[]
  ): LoadTestResults['endpointStats'] {
    // Calculate weights if not provided
    const totalWeight = endpoints.reduce((sum, endpoint) => sum + (endpoint.weight || 1), 0);
    
    return endpoints.map(endpoint => {
      const weight = endpoint.weight || 1;
      const requestCount = Math.floor(totalRequests * (weight / totalWeight));
      
      // Sample response times for this endpoint
      const startIndex = Math.floor(Math.random() * (responseTimes.length - requestCount));
      const endpointResponseTimes = responseTimes.slice(startIndex, startIndex + requestCount);
      
      const avgResponseTime = endpointResponseTimes.reduce((sum, time) => sum + time, 0) / endpointResponseTimes.length;
      const errorCount = Math.floor(requestCount * 0.05); // 5% error rate
      
      return {
        endpoint: endpoint.path,
        method: endpoint.method,
        requests: requestCount,
        avgResponseTime,
        errorRate: (errorCount / requestCount) * 100
      };
    });
  }

  private runAssertions(
    assertions: LoadTestConfig['assertions'],
    metrics: {
      responseTime: number;
      errorRate: number;
      throughput: number;
    }
  ): LoadTestAssertionResult[] {
    return assertions.map(assertion => {
      let actual: number;
      
      switch (assertion.metric) {
        case 'responseTime':
          actual = metrics.responseTime;
          break;
        case 'errorRate':
          actual = metrics.errorRate;
          break;
        case 'throughput':
          actual = metrics.throughput;
          break;
        default:
          actual = 0;
      }
      
      let passed = false;
      
      switch (assertion.operator) {
        case '<':
          passed = actual < assertion.value;
          break;
        case '>':
          passed = actual > assertion.value;
          break;
        case '<=':
          passed = actual <= assertion.value;
          break;
        case '>=':
          passed = actual >= assertion.value;
          break;
        case '==':
          passed = actual === assertion.value;
          break;
        case '!=':
          passed = actual !== assertion.value;
          break;
      }
      
      return {
        name: assertion.description || `${assertion.metric} ${assertion.operator} ${assertion.value}`,
        passed,
        actual,
        expected: assertion.value,
        operator: assertion.operator,
        description: assertion.description || ''
      };
    });
  }

  private simulateSystemMetrics(config: LoadTestConfig): LoadTestResults['systemMetrics'] {
    // Simulate system metrics based on load
    const cpuUsage = Math.min(100, 10 + (config.virtualUsers / 10));
    const memoryUsage = Math.min(100, 20 + (config.virtualUsers / 20));
    const diskIO = Math.min(100, 5 + (config.virtualUsers / 50));
    const networkIO = Math.min(100, 10 + (config.virtualUsers / 30));
    
    return {
      cpuUsage,
      memoryUsage,
      diskIO,
      networkIO
    };
  }

  /**
   * Detect performance regressions
   */
  private detectRegressions(results: LoadTestResults): void {
    const scenario = this.scenarios.get(results.scenarioId);
    
    if (!scenario) return;
    
    results.endpointStats.forEach(endpointStat => {
      const baselineKey = `${endpointStat.method}:${endpointStat.endpoint}`;
      const baseline = this.baselines.get(baselineKey);
      
      if (baseline) {
        // Check for response time regression
        if (endpointStat.avgResponseTime > baseline.baselineResponseTime * 1.2) {
          const regressionPercentage = 
            ((endpointStat.avgResponseTime - baseline.baselineResponseTime) / baseline.baselineResponseTime) * 100;
          
          this.regressions.push({
            endpoint: endpointStat.endpoint,
            method: endpointStat.method,
            metric: 'responseTime',
            baselineValue: baseline.baselineResponseTime,
            currentValue: endpointStat.avgResponseTime,
            regressionPercentage,
            detectedAt: new Date(),
            severity: this.getRegressionSeverity(regressionPercentage)
          });
        }
        
        // Check for error rate regression
        if (endpointStat.errorRate > baseline.baselineErrorRate * 2) {
          const regressionPercentage = 
            ((endpointStat.errorRate - baseline.baselineErrorRate) / baseline.baselineErrorRate) * 100;
          
          this.regressions.push({
            endpoint: endpointStat.endpoint,
            method: endpointStat.method,
            metric: 'errorRate',
            baselineValue: baseline.baselineErrorRate,
            currentValue: endpointStat.errorRate,
            regressionPercentage,
            detectedAt: new Date(),
            severity: this.getRegressionSeverity(regressionPercentage)
          });
        }
      }
    });
    
    this.metrics.gauge('load_test.total_regressions', this.regressions.length);
    
    if (this.regressions.length > 0) {
      logger.warn('Performance regressions detected', {
        scenarioId: results.scenarioId,
        regressionCount: this.regressions.length
      });
    }
  }

  private getRegressionSeverity(regressionPercentage: number): LoadTestRegression['severity'] {
    if (regressionPercentage > 50) return 'critical';
    if (regressionPercentage > 25) return 'high';
    if (regressionPercentage > 10) return 'medium';
    return 'low';
  }

  /**
   * Create performance baseline
   */
  createBaseline(endpoint: string, method: string, stats: {
    responseTime: number;
    errorRate: number;
    throughput: number;
  }): LoadTestBaseline {
    const baselineKey = `${method}:${endpoint}`;
    
    const baseline: LoadTestBaseline = {
      endpoint,
      method,
      baselineRPS: stats.throughput,
      baselineResponseTime: stats.responseTime,
      baselineErrorRate: stats.errorRate,
      baselineThroughput: stats.throughput,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    this.baselines.set(baselineKey, baseline);
    this.metrics.gauge('load_test.total_baselines', this.baselines.size);
    
    logger.info('Performance baseline created', { endpoint, method });
    
    return baseline;
  }

  /**
   * Update performance baseline
   */
  updateBaseline(endpoint: string, method: string, stats: {
    responseTime?: number;
    errorRate?: number;
    throughput?: number;
  }): LoadTestBaseline | null {
    const baselineKey = `${method}:${endpoint}`;
    const baseline = this.baselines.get(baselineKey);
    
    if (!baseline) {
      return null;
    }
    
    baseline.baselineResponseTime = stats.responseTime || baseline.baselineResponseTime;
    baseline.baselineErrorRate = stats.errorRate || baseline.baselineErrorRate;
    baseline.baselineThroughput = stats.throughput || baseline.baselineThroughput;
    baseline.updatedAt = new Date();
    
    this.baselines.set(baselineKey, baseline);
    
    logger.info('Performance baseline updated', { endpoint, method });
    
    return baseline;
  }

  /**
   * Get performance baseline
   */
  getBaseline(endpoint: string, method: string): LoadTestBaseline | null {
    const baselineKey = `${method}:${endpoint}`;
    return this.baselines.get(baselineKey) || null;
  }

  /**
   * List all performance baselines
   */
  listBaselines(): LoadTestBaseline[] {
    return Array.from(this.baselines.values());
  }

  /**
   * Delete performance baseline
   */
  deleteBaseline(endpoint: string, method: string): boolean {
    const baselineKey = `${method}:${endpoint}`;
    const baseline = this.baselines.get(baselineKey);
    
    if (!baseline) {
      return false;
    }
    
    this.baselines.delete(baselineKey);
    this.metrics.gauge('load_test.total_baselines', this.baselines.size);
    
    logger.info('Performance baseline deleted', { endpoint, method });
    
    return true;
  }

  /**
   * Get load test results
   */
  getResults(id: string): LoadTestResults | null {
    return this.results.get(id) || null;
  }

  /**
   * List all load test results
   */
  listResults(): LoadTestResults[] {
    return Array.from(this.results.values());
  }

  /**
   * Get performance regressions
   */
  getRegressions(): LoadTestRegression[] {
    return [...this.regressions];
  }

  /**
   * Clear performance regressions
   */
  clearRegressions(): void {
    this.regressions = [];
    this.metrics.gauge('load_test.total_regressions', 0);
    logger.info('Performance regressions cleared');
  }

  /**
   * Generate load test report
   */
  generateLoadTestReport(): {
    totalScenarios: number;
    totalBaselines: number;
    totalRegressions: number;
    recentResults: LoadTestResults[];
    performanceTrends: {
      avgResponseTime: number;
      avgErrorRate: number;
      avgThroughput: number;
    };
    regressionSummary: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  } {
    const recentResults = this.listResults()
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, 5);
    
    // Calculate performance trends
    const performanceTrends = this.calculatePerformanceTrends();
    
    // Calculate regression summary
    const regressionSummary = this.calculateRegressionSummary();
    
    return {
      totalScenarios: this.scenarios.size,
      totalBaselines: this.baselines.size,
      totalRegressions: this.regressions.length,
      recentResults,
      performanceTrends,
      regressionSummary
    };
  }

  private calculatePerformanceTrends(): {
    avgResponseTime: number;
    avgErrorRate: number;
    avgThroughput: number;
  } {
    const results = this.listResults();
    
    if (results.length === 0) {
      return {
        avgResponseTime: 0,
        avgErrorRate: 0,
        avgThroughput: 0
      };
    }
    
    const avgResponseTime = results.reduce((sum, result) => sum + result.avgResponseTime, 0) / results.length;
    const avgErrorRate = results.reduce((sum, result) => sum + result.errorRate, 0) / results.length;
    const avgThroughput = results.reduce((sum, result) => sum + result.throughput, 0) / results.length;
    
    return {
      avgResponseTime,
      avgErrorRate,
      avgThroughput
    };
  }

  private calculateRegressionSummary(): {
    critical: number;
    high: number;
    medium: number;
    low: number;
  } {
    const summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    };
    
    this.regressions.forEach(regression => {
      switch (regression.severity) {
        case 'critical':
          summary.critical++;
          break;
        case 'high':
          summary.high++;
          break;
        case 'medium':
          summary.medium++;
          break;
        case 'low':
          summary.low++;
          break;
      }
    });
    
    return summary;
  }

  /**
   * Clear all load test data
   */
  clearAllData(): void {
    this.scenarios.clear();
    this.baselines.clear();
    this.results.clear();
    this.regressions = [];
    
    this.metrics.gauge('load_test.total_scenarios', 0);
    this.metrics.gauge('load_test.total_baselines', 0);
    this.metrics.gauge('load_test.total_regressions', 0);
    
    logger.info('All load test data cleared');
  }

  /**
   * Generate ID for scenarios
   */
  private generateId(): string {
    return `loadtest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Load test scenario templates
   */
  static getScenarioTemplates(): Array<{ name: string; description: string; config: Partial<LoadTestConfig> }> {
    return [
      {
        name: 'Baseline Load Test',
        description: 'Test normal operating conditions',
        config: {
          duration: 300, // 5 minutes
          rampUp: 60, // 1 minute ramp up
          virtualUsers: 50,
          endpoints: [
            { path: '/api/v1/leads', method: 'GET', weight: 3 },
            { path: '/api/v1/leads', method: 'POST', weight: 1 },
            { path: '/api/v1/policies', method: 'GET', weight: 2 }
          ]
        }
      },
      {
        name: 'Peak Load Test',
        description: 'Test peak traffic conditions (2-3x normal traffic)',
        config: {
          duration: 600, // 10 minutes
          rampUp: 120, // 2 minute ramp up
          virtualUsers: 200,
          endpoints: [
            { path: '/api/v1/leads', method: 'GET', weight: 4 },
            { path: '/api/v1/leads', method: 'POST', weight: 2 },
            { path: '/api/v1/policies', method: 'GET', weight: 3 },
            { path: '/api/v1/users', method: 'GET', weight: 1 }
          ]
        }
      },
      {
        name: 'Burst Load Test',
        description: 'Test sudden traffic spikes',
        config: {
          duration: 120, // 2 minutes
          rampUp: 5, // Very quick ramp up
          virtualUsers: 300,
          endpoints: [
            { path: '/api/v1/leads', method: 'GET', weight: 5 },
            { path: '/api/v1/leads/search', method: 'POST', weight: 3 }
          ]
        }
      },
      {
        name: 'Sustained Load Test',
        description: 'Test extended high traffic',
        config: {
          duration: 3600, // 1 hour
          rampUp: 300, // 5 minute ramp up
          virtualUsers: 150,
          endpoints: [
            { path: '/api/v1/leads', method: 'GET', weight: 3 },
            { path: '/api/v1/policies', method: 'GET', weight: 2 },
            { path: '/api/v1/activities', method: 'GET', weight: 1 }
          ]
        }
      },
      {
        name: 'Stress Test',
        description: 'Test to breaking point',
        config: {
          duration: 1800, // 30 minutes
          rampUp: 600, // 10 minute ramp up
          virtualUsers: 1000,
          endpoints: [
            { path: '/api/v1/leads', method: 'GET', weight: 4 },
            { path: '/api/v1/leads', method: 'POST', weight: 2 },
            { path: '/api/v1/policies', method: 'GET', weight: 3 },
            { path: '/api/v1/users', method: 'GET', weight: 1 },
            { path: '/api/v1/reports', method: 'POST', weight: 1 }
          ]
        }
      },
      {
        name: 'Endurance Test',
        description: 'Test long-duration load',
        config: {
          duration: 14400, // 4 hours
          rampUp: 600, // 10 minute ramp up
          virtualUsers: 100,
          endpoints: [
            { path: '/api/v1/leads', method: 'GET', weight: 3 },
            { path: '/api/v1/policies', method: 'GET', weight: 2 },
            { path: '/api/v1/activities', method: 'GET', weight: 1 }
          ]
        }
      }
    ];
  }

  /**
   * Load test assertion templates
   */
  static getAssertionTemplates(): Array<{ 
    name: string; 
    description: string; 
    assertion: Omit<LoadTestConfig['assertions'][0], 'description'>
  }> {
    return [
      {
        name: 'Response Time < 500ms',
        description: 'Average response time should be less than 500ms',
        assertion: {
          metric: 'responseTime',
          operator: '<',
          value: 500
        }
      },
      {
        name: 'Error Rate < 1%',
        description: 'Error rate should be less than 1%',
        assertion: {
          metric: 'errorRate',
          operator: '<',
          value: 1
        }
      },
      {
        name: 'Throughput > 100 RPS',
        description: 'Throughput should be greater than 100 requests per second',
        assertion: {
          metric: 'throughput',
          operator: '>',
          value: 100
        }
      },
      {
        name: 'P95 Response Time < 1000ms',
        description: '95th percentile response time should be less than 1000ms',
        assertion: {
          metric: 'responseTime',
          operator: '<',
          value: 1000
        }
      },
      {
        name: 'No Errors',
        description: 'No errors should occur during the test',
        assertion: {
          metric: 'errorRate',
          operator: '==',
          value: 0
        }
      }
    ];
  }
}

/**
 * Factory function to create LoadTester
 */
export function createLoadTester(options?: {
  metrics?: MetricsCollector;
}): LoadTester {
  return new LoadTester(options);
}

/**
 * Load test utilities
 */
export class LoadTestUtils {
  /**
   * Generate k6 script from load test configuration
   */
  static generateK6Script(config: LoadTestConfig): string {
    return `import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Gauge, Rate, Trend } from 'k6/metrics';

// Metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const throughput = new Counter('throughput');

// Configuration
export const options = {
  stages: [
    { duration: '${config.rampUp}s', target: ${config.virtualUsers} },
    { duration: '${config.duration}s', target: ${config.virtualUsers} },
    { duration: '30s', target: 0 }
  ],
  thresholds: {
    http_req_duration: ['p(95)<${config.assertions?.find(a => a.metric === 'responseTime')?.value || 1000}'],
    http_req_failrate: ['rate<${config.assertions?.find(a => a.metric === 'errorRate')?.value || 0.01}']
  }
};

// Endpoints
const endpoints = ${JSON.stringify(config.endpoints, null, 2)};

// Main test function
export default function () {
  const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
  
  const params = {
    headers: endpoint.headers || {},
  };
  
  let res;
  
  switch (endpoint.method.toUpperCase()) {
    case 'GET':
      res = http.get(\`\">${endpoint.path}\"` + this.buildQueryParams(endpoint.queryParams) + \`\", params);
      break;
    case 'POST':
      res = http.post(\`\">${endpoint.path}\"\", JSON.stringify(endpoint.body || {}), params);
      break;
    case 'PUT':
      res = http.put(\`\">${endpoint.path}\"\", JSON.stringify(endpoint.body || {}), params);
      break;
    case 'DELETE':
      res = http.del(\`\">${endpoint.path}\"\", null, params);
      break;
    default:
      res = http.get(\`\">${endpoint.path}\"\", params);
  }
  
  // Track metrics
  responseTime.add(res.timings.duration);
  throughput.add(1);
  errorRate.add(res.status >= 400);
  
  // Check response
  check(res, {
    'status is 2xx': (r) => r.status >= 200 && r.status < 300,
  });
  
  // Think time
  if (${config.thinkTime ? 'true' : 'false'}) {
    sleep(Math.random() * (${config.thinkTime?.max || 1000} - ${config.thinkTime?.min || 100}) + ${config.thinkTime?.min || 100}) / 1000;
  }
}

// Helper function to build query parameters
function buildQueryParams(params) {
  if (!params) return '';
  
  const queryString = Object.entries(params)
    .map(([key, value]) => \`\">${key}=\">${value}\"\`)
    .join('&');
  
  return queryString ? '?' + queryString : '';
}