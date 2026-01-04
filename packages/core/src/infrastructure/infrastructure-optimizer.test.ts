import { InfrastructureOptimizer, InfrastructureOptimizationUtils } from './infrastructure-optimizer.js';
import { MetricsCollector } from '../monitoring/metrics.js';

describe('InfrastructureOptimizer', () => {
  let infraOptimizer: InfrastructureOptimizer;
  let metricsMock: any;

  beforeEach(() => {
    metricsMock = {
      increment: jest.fn(),
      gauge: jest.fn(),
      getGaugeValue: jest.fn()
    };

    infraOptimizer = new InfrastructureOptimizer({
      metrics: metricsMock as any
    });
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(infraOptimizer).toBeDefined();
      expect(infraOptimizer['config'].autoScaling?.enabled).toBe(true);
      expect(infraOptimizer['config'].resourceAllocation?.cpu?.request).toBe(0.5);
    });

    it('should accept custom configuration', () => {
      const customOptimizer = new InfrastructureOptimizer({
        config: {
          autoScaling: {
            enabled: false,
            minReplicas: 1,
            maxReplicas: 5
          },
          resourceAllocation: {
            cpu: { request: 0.25, limit: 0.5 }
          }
        }
      });

      expect(customOptimizer['config'].autoScaling?.enabled).toBe(false);
      expect(customOptimizer['config'].autoScaling?.minReplicas).toBe(1);
    });
  });

  describe('Resource Analysis', () => {
    it('should analyze resources and generate recommendations', async () => {
      const currentMetrics = [
        {
          service: 'api',
          resourceType: 'cpu' as const,
          currentAllocation: 1.0,
          currentUtilization: 85
        },
        {
          service: 'api',
          resourceType: 'memory' as const,
          currentAllocation: 1024,
          currentUtilization: 75
        }
      ];

      const recommendations = await infraOptimizer.analyzeResources(currentMetrics);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.service === 'api')).toBe(true);
      expect(recommendations.some(r => r.resourceType === 'cpu')).toBe(true);
    });

    it('should generate resource recommendations for overutilized resources', async () => {
      const recommendations = await infraOptimizer.analyzeResources([
        {
          service: 'api',
          resourceType: 'cpu' as const,
          currentAllocation: 1.0,
          currentUtilization: 95
        }
      ]);

      expect(recommendations.length).toBe(1);
      expect(recommendations[0].recommendedAllocation).toBeGreaterThan(1.0);
      expect(recommendations[0].severity).toBe('high');
    });

    it('should generate resource recommendations for underutilized resources', async () => {
      const recommendations = await infraOptimizer.analyzeResources([
        {
          service: 'api',
          resourceType: 'cpu' as const,
          currentAllocation: 1.0,
          currentUtilization: 25
        }
      ]);

      expect(recommendations.length).toBe(1);
      expect(recommendations[0].recommendedAllocation).toBeLessThan(1.0);
      expect(recommendations[0].severity).toBe('low');
    });

    it('should not generate recommendations for optimally utilized resources', async () => {
      const recommendations = await infraOptimizer.analyzeResources([
        {
          service: 'api',
          resourceType: 'cpu' as const,
          currentAllocation: 1.0,
          currentUtilization: 50
        }
      ]);

      expect(recommendations.length).toBe(0);
    });
  });

  describe('Auto-Scaling Analysis', () => {
    it('should analyze auto-scaling requirements', async () => {
      const currentMetrics = [
        {
          service: 'api',
          currentReplicas: 3,
          cpuUtilization: 85,
          memoryUtilization: 75,
          throughput: 120,
          latency: 800
        }
      ];

      const recommendations = await infraOptimizer.analyzeAutoScaling(currentMetrics);

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations[0].service).toBe('api');
      expect(recommendations[0].recommendedReplicas).toBeGreaterThan(3);
    });

    it('should recommend scaling up based on CPU utilization', async () => {
      const recommendations = await infraOptimizer.analyzeAutoScaling([
        {
          service: 'api',
          currentReplicas: 2,
          cpuUtilization: 85,
          memoryUtilization: 50,
          throughput: 100,
          latency: 500
        }
      ]);

      expect(recommendations.length).toBe(1);
      expect(recommendations[0].recommendedReplicas).toBeGreaterThan(2);
      expect(recommendations[0].metric).toBe('cpu');
    });

    it('should recommend scaling up based on memory utilization', async () => {
      const recommendations = await infraOptimizer.analyzeAutoScaling([
        {
          service: 'api',
          currentReplicas: 2,
          cpuUtilization: 50,
          memoryUtilization: 85,
          throughput: 100,
          latency: 500
        }
      ]);

      expect(recommendations.length).toBe(1);
      expect(recommendations[0].recommendedReplicas).toBeGreaterThan(2);
      expect(recommendations[0].metric).toBe('memory');
    });

    it('should recommend scaling up based on latency', async () => {
      const recommendations = await infraOptimizer.analyzeAutoScaling([
        {
          service: 'api',
          currentReplicas: 2,
          cpuUtilization: 50,
          memoryUtilization: 50,
          throughput: 100,
          latency: 1500
        }
      ]);

      expect(recommendations.length).toBe(1);
      expect(recommendations[0].recommendedReplicas).toBeGreaterThan(2);
      expect(recommendations[0].metric).toBe('latency');
    });

    it('should recommend scaling down for underutilized services', async () => {
      const recommendations = await infraOptimizer.analyzeAutoScaling([
        {
          service: 'api',
          currentReplicas: 5,
          cpuUtilization: 20,
          memoryUtilization: 25,
          throughput: 20,
          latency: 100
        }
      ]);

      expect(recommendations.length).toBe(1);
      expect(recommendations[0].recommendedReplicas).toBeLessThan(5);
    });

    it('should not recommend scaling when within thresholds', async () => {
      const recommendations = await infraOptimizer.analyzeAutoScaling([
        {
          service: 'api',
          currentReplicas: 3,
          cpuUtilization: 50,
          memoryUtilization: 40,
          throughput: 80,
          latency: 200
        }
      ]);

      expect(recommendations.length).toBe(0);
    });
  });

  describe('Connection Pool Analysis', () => {
    it('should analyze connection pool performance', async () => {
      const currentMetrics = [
        {
          poolName: 'api-db-pool',
          currentMin: 5,
          currentMax: 50,
          currentUsage: 45,
          waitTime: 200,
          timeoutRate: 8
        }
      ];

      const optimizations = await infraOptimizer.analyzeConnectionPools(currentMetrics);

      expect(optimizations.length).toBeGreaterThan(0);
      expect(optimizations[0].poolName).toBe('api-db-pool');
      expect(optimizations[0].recommendedMax).toBeGreaterThan(50);
    });

    it('should recommend increasing max connections for high timeout rate', async () => {
      const optimizations = await infraOptimizer.analyzeConnectionPools([
        {
          poolName: 'api-db-pool',
          currentMin: 5,
          currentMax: 50,
          currentUsage: 48,
          waitTime: 100,
          timeoutRate: 10
        }
      ]);

      expect(optimizations.length).toBe(1);
      expect(optimizations[0].recommendedMax).toBeGreaterThan(50);
    });

    it('should recommend decreasing min connections for underutilized pool', async () => {
      const optimizations = await infraOptimizer.analyzeConnectionPools([
        {
          poolName: 'api-db-pool',
          currentMin: 20,
          currentMax: 50,
          currentUsage: 5,
          waitTime: 10,
          timeoutRate: 0
        }
      ]);

      expect(optimizations.length).toBe(1);
      expect(optimizations[0].recommendedMin).toBeLessThan(20);
    });

    it('should not recommend changes for optimally configured pool', async () => {
      const optimizations = await infraOptimizer.analyzeConnectionPools([
        {
          poolName: 'api-db-pool',
          currentMin: 10,
          currentMax: 50,
          currentUsage: 25,
          waitTime: 50,
          timeoutRate: 1
        }
      ]);

      expect(optimizations.length).toBe(0);
    });
  });

  describe('Cost Analysis', () => {
    it('should perform cost analysis', async () => {
      const currentResources = [
        {
          service: 'api',
          resourceType: 'cpu',
          currentAllocation: 1.0,
          hourlyCost: 0.10
        },
        {
          service: 'api',
          resourceType: 'memory',
          currentAllocation: 1024,
          hourlyCost: 0.05
        }
      ];

      const recommendations = [
        {
          service: 'api',
          resourceType: 'cpu' as const,
          currentAllocation: 1.0,
          recommendedAllocation: 0.8,
          utilization: 60,
          reason: 'CPU underutilized',
          severity: 'low'
        }
      ];

      const costAnalysis = await infraOptimizer.performCostAnalysis(currentResources, recommendations);

      expect(costAnalysis.length).toBe(1);
      expect(costAnalysis[0].savings).toBeGreaterThan(0);
      expect(costAnalysis[0].savingsPercentage).toBeGreaterThan(0);
    });

    it('should calculate cost savings correctly', async () => {
      const costAnalysis = await infraOptimizer.performCostAnalysis(
        [
          {
            service: 'api',
            resourceType: 'cpu',
            currentAllocation: 1.0,
            hourlyCost: 0.10
          }
        ],
        [
          {
            service: 'api',
            resourceType: 'cpu' as const,
            currentAllocation: 1.0,
            recommendedAllocation: 0.8,
            utilization: 60,
            reason: 'CPU underutilized',
            severity: 'low'
          }
        ]
      );

      expect(costAnalysis[0].currentCost).toBe(0.10);
      expect(costAnalysis[0].optimizedCost).toBe(0.08);
      expect(costAnalysis[0].savings).toBe(0.02);
      expect(costAnalysis[0].savingsPercentage).toBe(20);
    });
  });

  describe('Optimization Report', () => {
    it('should generate comprehensive optimization report', async () => {
      const report = await infraOptimizer.generateOptimizationReport({
        resources: [
          {
            service: 'api',
            resourceType: 'cpu' as const,
            currentAllocation: 1.0,
            currentUtilization: 85,
            hourlyCost: 0.10
          }
        ],
        scaling: [
          {
            service: 'api',
            currentReplicas: 3,
            cpuUtilization: 85,
            memoryUtilization: 75,
            throughput: 120,
            latency: 800
          }
        ],
        connectionPools: [
          {
            poolName: 'api-db-pool',
            currentMin: 5,
            currentMax: 50,
            currentUsage: 45,
            waitTime: 200,
            timeoutRate: 8
          }
        ]
      });

      expect(report.resourceRecommendations.length).toBeGreaterThan(0);
      expect(report.autoScalingRecommendations.length).toBeGreaterThan(0);
      expect(report.connectionPoolOptimizations.length).toBeGreaterThan(0);
      expect(report.costAnalysis.length).toBeGreaterThan(0);
      expect(report.totalSavings).toBeGreaterThan(0);
    });
  });

  describe('Health Checks', () => {
    it('should perform infrastructure health checks', async () => {
      const healthChecks = await infraOptimizer.performHealthCheck(['api', 'data-service']);

      expect(healthChecks.length).toBe(2);
      expect(healthChecks[0].service).toBe('api');
      expect(healthChecks[1].service).toBe('data-service');
    });

    it('should detect unhealthy services', async () => {
      // Add some high utilization metrics
      await infraOptimizer.analyzeResources([
        {
          service: 'api',
          resourceType: 'cpu' as const,
          currentAllocation: 1.0,
          currentUtilization: 95
        }
      ]);

      const healthChecks = await infraOptimizer.performHealthCheck(['api']);

      expect(healthChecks[0].healthy).toBe(false);
      expect(healthChecks[0].checks.some(c => c.status === 'critical')).toBe(true);
    });

    it('should detect healthy services', async () => {
      // Add some normal utilization metrics
      await infraOptimizer.analyzeResources([
        {
          service: 'api',
          resourceType: 'cpu' as const,
          currentAllocation: 1.0,
          currentUtilization: 40
        }
      ]);

      const healthChecks = await infraOptimizer.performHealthCheck(['api']);

      expect(healthChecks[0].healthy).toBe(true);
      expect(healthChecks[0].checks.every(c => c.status === 'healthy')).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', () => {
      infraOptimizer.updateConfig({
        autoScaling: {
          enabled: false,
          minReplicas: 1,
          maxReplicas: 5
        }
      });

      expect(infraOptimizer['config'].autoScaling?.enabled).toBe(false);
      expect(infraOptimizer['config'].autoScaling?.minReplicas).toBe(1);
    });

    it('should clear all data', () => {
      // Add some data
      infraOptimizer['resourceHistory'].set('api:cpu', [{
        timestamp: new Date(),
        utilization: 85
      }]);

      infraOptimizer.clearAllData();

      expect(infraOptimizer['resourceHistory'].size).toBe(0);
      expect(infraOptimizer['scalingHistory'].size).toBe(0);
      expect(infraOptimizer['connectionPoolHistory'].size).toBe(0);
    });
  });

  describe('Kubernetes Configuration Generation', () => {
    it('should generate Kubernetes deployment configuration', () => {
      const recommendations = [
        {
          service: 'api',
          resourceType: 'cpu' as const,
          currentAllocation: 1.0,
          recommendedAllocation: 1.5,
          utilization: 85,
          reason: 'CPU overutilized',
          severity: 'high'
        },
        {
          service: 'api',
          resourceType: 'memory' as const,
          currentAllocation: 1024,
          recommendedAllocation: 1536,
          utilization: 80,
          reason: 'Memory high utilization',
          severity: 'medium'
        }
      ];

      const k8sConfig = InfrastructureOptimizer.generateKubernetesResources('api', recommendations);

      expect(k8sConfig.apiVersion).toBe('apps/v1');
      expect(k8sConfig.kind).toBe('Deployment');
      expect(k8sConfig.metadata.name).toBe('api');
      expect(k8sConfig.spec.template.spec.containers[0].resources.requests.cpu).toBe('1.5');
      expect(k8sConfig.spec.template.spec.containers[0].resources.limits.cpu).toBe('2.25');
    });

    it('should generate Kubernetes HPA configuration', () => {
      const recommendations = [
        {
          service: 'api',
          currentReplicas: 3,
          recommendedReplicas: 5,
          reason: 'CPU utilization exceeds threshold',
          metric: 'cpu' as const,
          currentValue: 85,
          targetValue: 70
        }
      ];

      const hpaConfig = InfrastructureOptimizer.generateKubernetesHPA('api', recommendations);

      expect(hpaConfig.apiVersion).toBe('autoscaling/v2');
      expect(hpaConfig.kind).toBe('HorizontalPodAutoscaler');
      expect(hpaConfig.metadata.name).toBe('api-hpa');
      expect(hpaConfig.spec.minReplicas).toBe(3);
      expect(hpaConfig.spec.maxReplicas).toBe(5);
    });

    it('should generate Docker Compose resource configuration', () => {
      const recommendations = [
        {
          service: 'api',
          resourceType: 'cpu' as const,
          currentAllocation: 1.0,
          recommendedAllocation: 1.5,
          utilization: 85,
          reason: 'CPU overutilized',
          severity: 'high'
        },
        {
          service: 'api',
          resourceType: 'memory' as const,
          currentAllocation: 1024,
          recommendedAllocation: 1536,
          utilization: 80,
          reason: 'Memory high utilization',
          severity: 'medium'
        }
      ];

      const dockerConfig = InfrastructureOptimizer.generateDockerComposeResources('api', recommendations);

      expect(dockerConfig.deploy.resources.limits.cpus).toBe('1.5');
      expect(dockerConfig.deploy.resources.limits.memory).toBe('1536M');
    });

    it('should generate connection pool configuration', () => {
      const optimization = {
        poolName: 'api-db-pool',
        currentMin: 5,
        currentMax: 50,
        recommendedMin: 5,
        recommendedMax: 75,
        currentUsage: 45,
        waitTime: 200,
        timeoutRate: 8
      };

      const poolConfig = InfrastructureOptimizer.generateConnectionPoolConfig('api-db-pool', optimization);

      expect(poolConfig.poolName).toBe('api-db-pool');
      expect(poolConfig.minConnections).toBe(5);
      expect(poolConfig.maxConnections).toBe(75);
    });
  });

  describe('Infrastructure Optimization Decorators', () => {
    it('should create monitor resource usage decorator', () => {
      const decorator = infraOptimizer.MonitorResourceUsage();
      
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should create optimize resource allocation decorator', () => {
      const decorator = infraOptimizer.OptimizeResourceAllocation();
      
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });
  });
});

describe('InfrastructureOptimizationUtils', () => {
  describe('Resource Allocation', () => {
    it('should calculate optimal CPU allocation', () => {
      const optimal = InfrastructureOptimizationUtils.calculateOptimalAllocation(1.0, 95, 'cpu');
      expect(optimal).toBe(1.5);
    });

    it('should calculate optimal memory allocation', () => {
      const optimal = InfrastructureOptimizationUtils.calculateOptimalAllocation(1024, 95, 'memory');
      expect(optimal).toBe(1536);
    });

    it('should calculate optimal storage allocation', () => {
      const optimal = InfrastructureOptimizationUtils.calculateOptimalAllocation(100, 90, 'storage');
      expect(optimal).toBe(130);
    });

    it('should not change allocation for optimal utilization', () => {
      const optimal = InfrastructureOptimizationUtils.calculateOptimalAllocation(1.0, 50, 'cpu');
      expect(optimal).toBe(1.0);
    });
  });

  describe('Replica Calculation', () => {
    it('should calculate optimal replicas for scaling up', () => {
      const optimal = InfrastructureOptimizationUtils.calculateOptimalReplicas(3, 85, 80);
      expect(optimal).toBeGreaterThan(3);
    });

    it('should calculate optimal replicas for scaling down', () => {
      const optimal = InfrastructureOptimizationUtils.calculateOptimalReplicas(5, 20, 25);
      expect(optimal).toBeLessThan(5);
    });

    it('should not change replicas for optimal load', () => {
      const optimal = InfrastructureOptimizationUtils.calculateOptimalReplicas(3, 40, 35);
      expect(optimal).toBe(3);
    });
  });

  describe('Connection Pool Calculation', () => {
    it('should calculate optimal connection pool for high timeout rate', () => {
      const optimal = InfrastructureOptimizationUtils.calculateOptimalConnectionPool(
        5, 50, 48, 200, 10
      );
      expect(optimal.max).toBeGreaterThan(50);
    });

    it('should calculate optimal connection pool for underutilized pool', () => {
      const optimal = InfrastructureOptimizationUtils.calculateOptimalConnectionPool(
        20, 50, 5, 10, 0
      );
      expect(optimal.min).toBeLessThan(20);
    });

    it('should not change connection pool for optimal usage', () => {
      const optimal = InfrastructureOptimizationUtils.calculateOptimalConnectionPool(
        10, 50, 25, 50, 1
      );
      expect(optimal.min).toBe(10);
      expect(optimal.max).toBe(50);
    });
  });

  describe('Cost Savings Calculation', () => {
    it('should calculate cost savings', () => {
      const savings = InfrastructureOptimizationUtils.calculateCostSavings(0.10, 1.0, 0.8);
      expect(savings.savings).toBe(0.02);
      expect(savings.savingsPercentage).toBe(20);
    });

    it('should calculate zero savings when no optimization', () => {
      const savings = InfrastructureOptimizationUtils.calculateCostSavings(0.10, 1.0, 1.0);
      expect(savings.savings).toBe(0);
      expect(savings.savingsPercentage).toBe(0);
    });
  });

  describe('Report Generation', () => {
    it('should generate optimization report summary', () => {
      const recommendations = [
        {
          service: 'api',
          resourceType: 'cpu' as const,
          currentAllocation: 1.0,
          recommendedAllocation: 1.5,
          utilization: 85,
          reason: 'CPU overutilized',
          severity: 'high'
        }
      ];

      const summary = InfrastructureOptimizationUtils.generateReportSummary({
        resourceRecommendations: recommendations,
        autoScalingRecommendations: [],
        connectionPoolOptimizations: [],
        costAnalysis: [],
        totalSavings: 0,
        totalSavingsPercentage: 0,
        generatedAt: new Date()
      });

      expect(summary).toContain('Infrastructure Optimization Report Summary');
      expect(summary).toContain('api cpu: 1 -> 1.5');
    });

    it('should generate health report', () => {
      const healthChecks = [
        {
          service: 'api',
          healthy: true,
          checks: [
            {
              name: 'cpu_utilization',
              status: 'healthy' as const,
              message: 'CPU utilization normal: 40.0%'
            }
          ],
          timestamp: new Date()
        }
      ];

      const report = InfrastructureOptimizationUtils.generateHealthReport(healthChecks);

      expect(report).toContain('Infrastructure Health Report');
      expect(report).toContain('api: HEALTHY');
      expect(report).toContain('✓ cpu_utilization: CPU utilization normal: 40.0%');
    });

    it('should generate Kubernetes recommendations', () => {
      const recommendations = [
        {
          service: 'api',
          resourceType: 'cpu' as const,
          currentAllocation: 1.0,
          recommendedAllocation: 1.5,
          utilization: 85,
          reason: 'CPU overutilized',
          severity: 'high'
        }
      ];

      const k8sRecs = InfrastructureOptimizationUtils.generateKubernetesRecommendations('api', recommendations);

      expect(k8sRecs).toContain('Kubernetes Resource Recommendations for api');
      expect(k8sRecs).toContain('Request: 1.5');
      expect(k8sRecs).toContain('Limit: 2.25');
    });

    it('should generate cost report', () => {
      const costAnalysis = [
        {
          service: 'api',
          resourceType: 'cpu',
          currentCost: 0.10,
          optimizedCost: 0.08,
          savings: 0.02,
          savingsPercentage: 20,
          recommendations: ['CPU overutilized']
        }
      ];

      const report = InfrastructureOptimizationUtils.generateCostReport(costAnalysis);

      expect(report).toContain('Infrastructure Cost Optimization Report');
      expect(report).toContain('Current Cost: $0.10/hour');
      expect(report).toContain('Savings: $0.02/hour (20.0%)');
    });
  });
});