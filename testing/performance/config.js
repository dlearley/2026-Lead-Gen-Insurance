/**
 * Performance Testing Configuration
 * Centralized configuration for all performance tests
 */

export const performanceConfig = {
  // Test scenarios
  scenarios: {
    baseline: {
      vus: 20,
      duration: '14m',
      targetRps: 100,
      description: 'Normal expected load',
    },
    peak: {
      vus: 50,
      duration: '15m',
      targetRps: 250,
      description: '2x normal load for peak hours',
    },
    stress: {
      vus: 200,
      duration: '25m',
      targetRps: 1000,
      description: 'Push system to breaking point',
    },
    spike: {
      vus: 500,
      duration: '8m',
      targetRps: 2500,
      description: 'Sudden traffic spike test',
    },
    endurance: {
      vus: 25,
      duration: '8h',
      targetRps: 125,
      description: 'Long duration stability test',
    },
  },

  // Performance thresholds
  thresholds: {
    api: {
      p95ResponseTime: 500, // ms
      p99ResponseTime: 1000, // ms
      maxResponseTime: 5000, // ms
      errorRate: 0.01, // 1%
    },
    database: {
      queryTimeP95: 200, // ms
      queryTimeP99: 500, // ms
      connectionPoolUtilization: 0.8, // 80%
    },
    cache: {
      hitRate: 0.8, // 80%
      avgGetTime: 5, // ms
      avgSetTime: 10, // ms
    },
    queues: {
      avgProcessingTime: 1000, // ms
      avgWaitTime: 30000, // ms
      throughputPerSecond: 100,
    },
  },

  // Test data generation
  testData: {
    leadCount: 1000,
    agentCount: 100,
    carrierCount: 50,
    batchSize: 100,
  },

  // Endpoints to test
  endpoints: {
    // Lead operations
    leads: {
      create: { method: 'POST', path: '/api/v1/leads', weight: 0.2 },
      list: { method: 'GET', path: '/api/v1/leads', weight: 0.3 },
      get: { method: 'GET', path: '/api/v1/leads/{id}', weight: 0.15 },
      update: { method: 'PUT', path: '/api/v1/leads/{id}', weight: 0.1 },
      delete: { method: 'DELETE', path: '/api/v1/leads/{id}', weight: 0.05 },
      search: { method: 'GET', path: '/api/v1/leads/search', weight: 0.1 },
      batch: { method: 'POST', path: '/api/v1/leads/batch', weight: 0.1 },
    },
    // Agent operations
    agents: {
      list: { method: 'GET', path: '/api/v1/agents', weight: 0.4 },
      get: { method: 'GET', path: '/api/v1/agents/{id}', weight: 0.3 },
      match: { method: 'POST', path: '/api/v1/leads/routing/match', weight: 0.3 },
    },
    // Analytics
    analytics: {
      overview: { method: 'GET', path: '/api/v1/analytics/overview', weight: 0.4 },
      leads: { method: 'GET', path: '/api/v1/analytics/leads', weight: 0.3 },
      performance: { method: 'GET', path: '/api/v1/analytics/performance', weight: 0.3 },
    },
  },

  // User profiles for testing
  userProfiles: {
    leadGen: {
      weight: 0.4,
      thinkTimeMin: 5,
      thinkTimeMax: 15,
      operations: ['leads.create', 'leads.get', 'leads.search'],
    },
    broker: {
      weight: 0.3,
      thinkTimeMin: 10,
      thinkTimeMax: 30,
      operations: ['leads.list', 'agents.list', 'agents.match'],
    },
    admin: {
      weight: 0.15,
      thinkTimeMin: 30,
      thinkTimeMax: 60,
      operations: ['analytics.overview', 'analytics.leads', 'analytics.performance'],
    },
    api: {
      weight: 0.15,
      thinkTimeMin: 1,
      thinkTimeMax: 5,
      operations: ['leads.batch'],
    },
  },

  // Environment-specific settings
  environments: {
    local: {
      baseUrl: 'http://localhost:3000',
      dataServiceUrl: 'http://localhost:4000',
      vuMultiplier: 0.5,
    },
    staging: {
      baseUrl: 'https://staging-api.insurance-lead-gen.com',
      dataServiceUrl: 'https://staging-data.insurance-lead-gen.com',
      vuMultiplier: 1.0,
    },
    production: {
      baseUrl: 'https://api.insurance-lead-gen.com',
      dataServiceUrl: 'https://data.insurance-lead-gen.com',
      vuMultiplier: 1.0,
    },
  },

  // Monitoring settings
  monitoring: {
    metricsEndpoint: '/api/v1/performance/metrics',
    alertsEndpoint: '/api/v1/performance/alerts',
    reportEndpoint: '/api/v1/performance/report',
    checkInterval: 60000, // 1 minute
  },

  // Report settings
  reporting: {
    formats: ['json', 'html', 'junit'],
    outputDir: './test-results/performance',
    trendRetention: 30, // days
  },
};

// Helper function to get environment-specific config
export function getPerformanceConfig(env: string = 'local') {
  const envSettings = performanceConfig.environments[env as keyof typeof performanceConfig.environments] || performanceConfig.environments.local;
  
  return {
    ...performanceConfig,
    environment: env,
    baseUrl: envSettings.baseUrl,
    dataServiceUrl: envSettings.dataServiceUrl,
    vus: Math.floor(performanceConfig.scenarios.baseline.vus * envSettings.vuMultiplier),
    targetRps: Math.floor(performanceConfig.scenarios.baseline.targetRps * envSettings.vuMultiplier),
  };
}

// Helper to calculate test duration based on scenario
export function getTestDuration(scenario: string): string {
  return performanceConfig.scenarios[scenario as keyof typeof performanceConfig.scenarios]?.duration || '10m';
}

// Helper to get threshold value
export function getThreshold(category: string, metric: string): number {
  return performanceConfig.thresholds[category as keyof typeof performanceConfig.thresholds]?.[metric as keyof any] || 1000;
}
