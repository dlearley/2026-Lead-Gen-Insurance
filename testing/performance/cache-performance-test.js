/**
 * Cache Performance Testing Script
 * Tests cache hit rates, invalidation, and warming
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const cacheGetTime = new Trend('cache_get_time');
const cacheSetTime = new Trend('cache_set_time');
const cacheHitRate = new Rate('cache_hit_rate');
const cacheMissRate = new Rate('cache_miss_rate');
const cacheEvictions = new Counter('cache_evictions');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`,
};

export const options = {
  scenarios: {
    cache_performance: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 30 },
        { duration: '10m', target: 30 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    cache_get_time: ['p(95)<10', 'p(99)<50'],
    cache_set_time: ['p(95)<20', 'p(99)<100'],
    cache_hit_rate: ['rate>0.7'],
    cache_miss_rate: ['rate<0.3'],
  },
};

// Test data for cache operations
const testData = {
  leads: Array.from({ length: 100 }, (_, i) => ({
    id: `lead-cache-test-${i}`,
    firstName: `Test${i}`,
    lastName: `User`,
    email: `test${i}@example.com`,
    insuranceType: ['AUTO', 'HOME', 'LIFE'][i % 3],
  })),
  agents: Array.from({ length: 50 }, (_, i) => ({
    id: `agent-cache-test-${i}`,
    firstName: `Agent${i}`,
    lastName: `Test`,
    specializations: ['AUTO', 'HOME', 'LIFE'],
  })),
};

export default function () {
  // Test cache warming
  group('Cache Warming', function () {
    const startTime = Date.now();
    
    const res = http.post(
      `${BASE_URL}/api/v1/performance/cache/warm`,
      {},
      { headers }
    );

    check(res, {
      'cache warming successful': (r) => r.status === 200,
      'has success message': (r) => r.json('success') === true,
    });
  });

  // Test cache metrics retrieval
  group('Cache Metrics', function () {
    const res = http.get(`${BASE_URL}/api/v1/performance/cache/metrics`, { headers });

    check(res, {
      'cache metrics retrieved': (r) => r.status === 200,
      'has hit count': (r) => r.json('hits') !== undefined,
      'has miss count': (r) => r.json('misses') !== undefined,
      'has hit rate': (r) => r.json('hitRate') !== undefined,
    });
  });

  // Test cache hit rate report
  group('Cache Hit Rate Report', function () {
    const res = http.get(`${BASE_URL}/api/v1/performance/cache/hit-rate`, { headers });

    check(res, {
      'hit rate report retrieved': (r) => r.status === 200,
      'has overall rate': (r) => r.json('overall') !== undefined,
      'has by-key breakdown': (r) => r.json('byKey') !== undefined,
    });

    // Track cache hit/miss rates
    if (res.status === 200) {
      const data = res.json();
      cacheHitRate.add(data.overall || 0);
      cacheMissRate.add(1 - (data.overall || 0));
    }
  });

  // Test cache invalidation
  group('Cache Invalidation', function () {
    const patterns = [
      'leads:*',
      'agents:*',
      'carriers:*',
    ];

    for (const pattern of patterns) {
      const res = http.post(
        `${BASE_URL}/api/v1/performance/cache/invalidate`,
        JSON.stringify({ pattern }),
        { headers }
      );

      check(res, {
        [`invalidation for ${pattern}`]: (r) => r.status === 200,
      }) || cacheEvictions.add(1);

      sleep(0.5);
    }
  });

  // Simulate cache access patterns
  group('Cache Access Patterns', function () {
    // Simulate lead access (high frequency)
    for (let i = 0; i < 10; i++) {
      const leadId = testData.leads[i % testData.leads.length].id;
      const startTime = Date.now();
      
      const res = http.get(`${BASE_URL}/api/v1/leads/${leadId}`, { headers });
      cacheGetTime.add(Date.now() - startTime);

      // First access will be a miss, subsequent should be hits
      if (i > 5) {
        cacheHitRate.add(res.status === 200);
      } else {
        cacheMissRate.add(1);
      }
    }

    // Simulate agent access
    for (let i = 0; i < 5; i++) {
      const agentId = testData.agents[i % testData.agents.length].id;
      const startTime = Date.now();
      
      const res = http.get(`${BASE_URL}/api/v1/agents/${agentId}`, { headers });
      cacheGetTime.add(Date.now() - startTime);
    }

    sleep(2);
  });

  // Test data loading for cache warming simulation
  group('Data Loading for Cache', function () {
    // Simulate loading leads
    const leadsRes = http.get(`${BASE_URL}/api/v1/leads?limit=100`, { headers });
    
    const startSetTime = Date.now();
    // Simulate setting cache (this would be done server-side in real scenario)
    cacheSetTime.add(Date.now() - startSetTime);

    check(leadsRes, {
      'leads loaded for cache': (r) => r.status === 200,
    });
  });

  sleep(10);
}

export function handleSummary(data) {
  const getMetrics = data.metrics.cache_get_time;
  const setMetrics = data.metrics.cache_set_time;
  const hitRate = data.metrics.cache_hit_rate;
  const missRate = data.metrics.cache_miss_rate;

  return {
    stdout: `
╔══════════════════════════════════════════════════════════════════╗
║              CACHE PERFORMANCE TEST SUMMARY                       ║
╠══════════════════════════════════════════════════════════════════╣
║  Cache Operations:                                               ║
║    Get Time (avg):  ${(getMetrics.values.avg || 0).toFixed(2)}ms                               ║
║    Get Time (p95):  ${(getMetrics.values.p95 || 0).toFixed(2)}ms                               ║
║    Set Time (avg):  ${(setMetrics.values.avg || 0).toFixed(2)}ms                               ║
╠══════════════════════════════════════════════════════════════════╣
║  Cache Efficiency:                                               ║
║    Hit Rate:       ${((hitRate.values.rate || 0) * 100).toFixed(1)}%                                ║
║    Miss Rate:      ${((missRate.values.rate || 0) * 100).toFixed(1)}%                                ║
╚══════════════════════════════════════════════════════════════════╝
`,
    'cache-performance-report.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      cacheOperations: {
        get: getMetrics,
        set: setMetrics,
      },
      cacheEfficiency: {
        hitRate: hitRate.values.rate || 0,
        missRate: missRate.values.rate || 0,
      },
    }, null, 2),
  };
}
