import { LoadTester, LoadTestUtils } from './load-tester.js';
import { MetricsCollector } from '../monitoring/metrics.js';

describe('LoadTester', () => {
  let loadTester: LoadTester;
  let metricsMock: any;

  beforeEach(() => {
    metricsMock = {
      increment: jest.fn(),
      gauge: jest.fn(),
      getGaugeValue: jest.fn()
    };

    loadTester = new LoadTester({
      metrics: metricsMock as any
    });
  });

  describe('Initialization', () => {
    it('should initialize with empty scenarios', () => {
      expect(loadTester).toBeDefined();
      expect(loadTester['scenarios'].size).toBe(0);
      expect(loadTester['baselines'].size).toBe(0);
    });

    it('should setup metrics', () => {
      expect(metricsMock.gauge).toHaveBeenCalledWith('load_test.total_scenarios', 0);
      expect(metricsMock.gauge).toHaveBeenCalledWith('load_test.total_baselines', 0);
    });
  });

  describe('Scenario Management', () => {
    it('should create load test scenario', () => {
      const scenario = loadTester.createScenario({
        name: 'Peak Load Test',
        description: 'Test peak traffic',
        duration: 600,
        rampUp: 120,
        virtualUsers: 200,
        endpoints: [
          { path: '/api/v1/leads', method: 'GET', weight: 3 }
        ]
      });

      expect(scenario).toBeDefined();
      expect(scenario.id).toBeDefined();
      expect(scenario.name).toBe('Peak Load Test');
      expect(scenario.type).toBe('peak');
    });

    it('should determine scenario type correctly', () => {
      // Baseline scenario
      let scenario = loadTester.createScenario({
        name: 'Baseline',
        duration: 300,
        virtualUsers: 50,
        endpoints: []
      });
      expect(scenario.type).toBe('baseline');

      // Peak scenario
      scenario = loadTester.createScenario({
        name: 'Peak',
        duration: 600,
        virtualUsers: 200,
        endpoints: []
      });
      expect(scenario.type).toBe('peak');

      // Stress scenario
      scenario = loadTester.createScenario({
        name: 'Stress',
        duration: 1800,
        virtualUsers: 1000,
        endpoints: []
      });
      expect(scenario.type).toBe('stress');

      // Endurance scenario
      scenario = loadTester.createScenario({
        name: 'Endurance',
        duration: 14400,
        virtualUsers: 100,
        endpoints: []
      });
      expect(scenario.type).toBe('endurance');
    });

    it('should update load test scenario', () => {
      const scenario = loadTester.createScenario({
        name: 'Test',
        duration: 300,
        virtualUsers: 50,
        endpoints: []
      });

      const updated = loadTester.updateScenario(scenario.id, {
        virtualUsers: 100
      });

      expect(updated).toBeDefined();
      expect(updated?.config.virtualUsers).toBe(100);
    });

    it('should get load test scenario', () => {
      const scenario = loadTester.createScenario({
        name: 'Test',
        duration: 300,
        virtualUsers: 50,
        endpoints: []
      });

      const retrieved = loadTester.getScenario(scenario.id);
      expect(retrieved).toEqual(scenario);
    });

    it('should list all scenarios', () => {
      loadTester.createScenario({
        name: 'Test1',
        duration: 300,
        virtualUsers: 50,
        endpoints: []
      });

      loadTester.createScenario({
        name: 'Test2',
        duration: 600,
        virtualUsers: 100,
        endpoints: []
      });

      const scenarios = loadTester.listScenarios();
      expect(scenarios.length).toBe(2);
    });

    it('should delete load test scenario', () => {
      const scenario = loadTester.createScenario({
        name: 'Test',
        duration: 300,
        virtualUsers: 50,
        endpoints: []
      });

      const deleted = loadTester.deleteScenario(scenario.id);
      expect(deleted).toBe(true);
      expect(loadTester.getScenario(scenario.id)).toBeNull();
    });
  });

  describe('Load Test Execution', () => {
    it('should execute load test scenario', async () => {
      const scenario = loadTester.createScenario({
        name: 'Test Execution',
        duration: 60,
        rampUp: 10,
        virtualUsers: 50,
        endpoints: [
          { path: '/api/v1/leads', method: 'GET', weight: 1 }
        ],
        assertions: [
          { metric: 'responseTime', operator: '<', value: 1000, description: 'Response time < 1000ms' }
        ]
      });

      const results = await loadTester.executeScenario(scenario.id);

      expect(results).toBeDefined();
      expect(results?.scenarioId).toBe(scenario.id);
      expect(results?.duration).toBe(60);
      expect(results?.virtualUsers).toBe(50);
      expect(results?.totalRequests).toBeGreaterThan(0);
      expect(results?.assertions.length).toBeGreaterThan(0);
    });

    it('should handle scenario execution errors', async () => {
      const results = await loadTester.executeScenario('nonexistent-id');
      expect(results).toBeNull();
    });

    it('should simulate realistic response times', async () => {
      const scenario = loadTester.createScenario({
        name: 'Response Time Test',
        duration: 60,
        virtualUsers: 100,
        endpoints: [
          { path: '/api/v1/leads', method: 'GET', weight: 1 }
        ]
      });

      const results = await loadTester.executeScenario(scenario.id);

      expect(results?.avgResponseTime).toBeGreaterThan(0);
      expect(results?.p50ResponseTime).toBeGreaterThan(0);
      expect(results?.p95ResponseTime).toBeGreaterThan(0);
      expect(results?.maxResponseTime).toBeGreaterThan(0);
    });

    it('should generate endpoint statistics', async () => {
      const scenario = loadTester.createScenario({
        name: 'Endpoint Stats Test',
        duration: 60,
        virtualUsers: 100,
        endpoints: [
          { path: '/api/v1/leads', method: 'GET', weight: 3 },
          { path: '/api/v1/users', method: 'GET', weight: 1 }
        ]
      });

      const results = await loadTester.executeScenario(scenario.id);

      expect(results?.endpointStats.length).toBe(2);
      expect(results?.endpointStats[0].endpoint).toBe('/api/v1/leads');
      expect(results?.endpointStats[1].endpoint).toBe('/api/v1/users');
    });

    it('should run assertions', async () => {
      const scenario = loadTester.createScenario({
        name: 'Assertion Test',
        duration: 60,
        virtualUsers: 50,
        endpoints: [
          { path: '/api/v1/leads', method: 'GET', weight: 1 }
        ],
        assertions: [
          { metric: 'responseTime', operator: '<', value: 1000, description: 'Response time < 1000ms' },
          { metric: 'errorRate', operator: '<', value: 5, description: 'Error rate < 5%' }
        ]
      });

      const results = await loadTester.executeScenario(scenario.id);

      expect(results?.assertions.length).toBe(2);
      expect(results?.assertions[0].name).toContain('responseTime');
      expect(results?.assertions[1].name).toContain('errorRate');
    });
  });

  describe('Performance Baselines', () => {
    it('should create performance baseline', () => {
      const baseline = loadTester.createBaseline('/api/v1/leads', 'GET', {
        responseTime: 150,
        errorRate: 0.5,
        throughput: 100
      });

      expect(baseline).toBeDefined();
      expect(baseline.endpoint).toBe('/api/v1/leads');
      expect(baseline.method).toBe('GET');
      expect(baseline.baselineResponseTime).toBe(150);
    });

    it('should update performance baseline', () => {
      loadTester.createBaseline('/api/v1/leads', 'GET', {
        responseTime: 150,
        errorRate: 0.5,
        throughput: 100
      });

      const updated = loadTester.updateBaseline('/api/v1/leads', 'GET', {
        responseTime: 120
      });

      expect(updated).toBeDefined();
      expect(updated?.baselineResponseTime).toBe(120);
    });

    it('should get performance baseline', () => {
      loadTester.createBaseline('/api/v1/leads', 'GET', {
        responseTime: 150,
        errorRate: 0.5,
        throughput: 100
      });

      const baseline = loadTester.getBaseline('/api/v1/leads', 'GET');
      expect(baseline).toBeDefined();
    });

    it('should list all baselines', () => {
      loadTester.createBaseline('/api/v1/leads', 'GET', {
        responseTime: 150,
        errorRate: 0.5,
        throughput: 100
      });

      loadTester.createBaseline('/api/v1/users', 'GET', {
        responseTime: 100,
        errorRate: 0.2,
        throughput: 50
      });

      const baselines = loadTester.listBaselines();
      expect(baselines.length).toBe(2);
    });

    it('should delete performance baseline', () => {
      loadTester.createBaseline('/api/v1/leads', 'GET', {
        responseTime: 150,
        errorRate: 0.5,
        throughput: 100
      });

      const deleted = loadTester.deleteBaseline('/api/v1/leads', 'GET');
      expect(deleted).toBe(true);
    });
  });

  describe('Performance Regressions', () => {
    it('should detect performance regressions', async () => {
      // Create baseline
      loadTester.createBaseline('/api/v1/leads', 'GET', {
        responseTime: 150,
        errorRate: 0.5,
        throughput: 100
      });

      // Execute scenario that exceeds baseline
      const scenario = loadTester.createScenario({
        name: 'Regression Test',
        duration: 60,
        virtualUsers: 200,
        endpoints: [
          { path: '/api/v1/leads', method: 'GET', weight: 1 }
        ]
      });

      await loadTester.executeScenario(scenario.id);

      // Check for regressions
      const regressions = loadTester.getRegressions();
      expect(regressions.length).toBeGreaterThan(0);
    });

    it('should clear performance regressions', () => {
      loadTester['regressions'] = [
        {
          id: '1',
          endpoint: '/api/v1/leads',
          method: 'GET',
          metric: 'responseTime',
          baselineValue: 150,
          currentValue: 300,
          regressionPercentage: 100,
          detectedAt: new Date(),
          severity: 'high'
        }
      ];

      loadTester.clearRegressions();
      expect(loadTester.getRegressions().length).toBe(0);
    });
  });

  describe('Load Test Results', () => {
    it('should get load test results', async () => {
      const scenario = loadTester.createScenario({
        name: 'Results Test',
        duration: 60,
        virtualUsers: 50,
        endpoints: []
      });

      await loadTester.executeScenario(scenario.id);
      const results = loadTester.getResults(scenario.id);

      expect(results).toBeDefined();
      expect(results?.scenarioId).toBe(scenario.id);
    });

    it('should list all results', async () => {
      const scenario1 = loadTester.createScenario({
        name: 'Test1',
        duration: 60,
        virtualUsers: 50,
        endpoints: []
      });

      const scenario2 = loadTester.createScenario({
        name: 'Test2',
        duration: 60,
        virtualUsers: 100,
        endpoints: []
      });

      await loadTester.executeScenario(scenario1.id);
      await loadTester.executeScenario(scenario2.id);

      const results = loadTester.listResults();
      expect(results.length).toBe(2);
    });
  });

  describe('Load Test Reports', () => {
    it('should generate load test report', async () => {
      // Create some test data
      loadTester.createScenario({
        name: 'Test1',
        duration: 60,
        virtualUsers: 50,
        endpoints: []
      });

      loadTester.createBaseline('/api/v1/leads', 'GET', {
        responseTime: 150,
        errorRate: 0.5,
        throughput: 100
      });

      const report = loadTester.generateLoadTestReport();

      expect(report.totalScenarios).toBe(1);
      expect(report.totalBaselines).toBe(1);
      expect(report.recentResults.length).toBe(0);
    });

    it('should calculate performance trends', async () => {
      const scenario = loadTester.createScenario({
        name: 'Trends Test',
        duration: 60,
        virtualUsers: 50,
        endpoints: []
      });

      await loadTester.executeScenario(scenario.id);

      const report = loadTester.generateLoadTestReport();
      expect(report.performanceTrends).toBeDefined();
    });

    it('should calculate regression summary', () => {
      loadTester['regressions'] = [
        {
          id: '1',
          endpoint: '/api/v1/leads',
          method: 'GET',
          metric: 'responseTime',
          baselineValue: 150,
          currentValue: 300,
          regressionPercentage: 100,
          detectedAt: new Date(),
          severity: 'high'
        },
        {
          id: '2',
          endpoint: '/api/v1/users',
          method: 'GET',
          metric: 'errorRate',
          baselineValue: 0.5,
          currentValue: 5,
          regressionPercentage: 900,
          detectedAt: new Date(),
          severity: 'critical'
        }
      ];

      const report = loadTester.generateLoadTestReport();
      expect(report.regressionSummary.critical).toBe(1);
      expect(report.regressionSummary.high).toBe(1);
    });
  });

  describe('Data Management', () => {
    it('should clear all load test data', () => {
      loadTester.createScenario({
        name: 'Test',
        duration: 60,
        virtualUsers: 50,
        endpoints: []
      });

      loadTester.createBaseline('/api/v1/leads', 'GET', {
        responseTime: 150,
        errorRate: 0.5,
        throughput: 100
      });

      loadTester.clearAllData();

      expect(loadTester.listScenarios().length).toBe(0);
      expect(loadTester.listBaselines().length).toBe(0);
    });
  });

  describe('Load Test Utilities', () => {
    it('should generate k6 script', () => {
      const config = {
        name: 'Test Script',
        duration: 60,
        rampUp: 10,
        virtualUsers: 50,
        endpoints: [
          { path: '/api/v1/leads', method: 'GET', weight: 1 }
        ],
        assertions: [
          { metric: 'responseTime', operator: '<', value: 1000, description: 'Response time < 1000ms' }
        ]
      };

      const script = LoadTestUtils.generateK6Script(config);

      expect(script).toContain('import http from');
      expect(script).toContain('export const options');
      expect(script).toContain('/api/v1/leads');
      expect(script).toContain('http_req_duration');
    });

    it('should get scenario templates', () => {
      const templates = LoadTester.getScenarioTemplates();
      
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.name === 'Baseline Load Test')).toBe(true);
      expect(templates.some(t => t.name === 'Peak Load Test')).toBe(true);
    });

    it('should get assertion templates', () => {
      const templates = LoadTester.getAssertionTemplates();
      
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.name === 'Response Time < 500ms')).toBe(true);
      expect(templates.some(t => t.name === 'Error Rate < 1%')).toBe(true);
    });
  });
});