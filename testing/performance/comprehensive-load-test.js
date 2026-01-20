/**
 * Comprehensive Performance Testing Suite
 * k6 load testing scripts for the Insurance Lead Gen API
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter, Gauge } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const leadCreateTime = new Trend('lead_create_time');
const leadListTime = new Trend('lead_list_time');
const agentMatchTime = new Trend('agent_match_time');
const cacheHitRate = new Rate('cache_hit_rate');

// Test configuration
export const options = {
  scenarios: {
    // Baseline: Normal expected load
    baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '10m', target: 20 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    
    // Peak: 2x normal load
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 50 },
        { duration: '10m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
      dependsOn: 'baseline',
    },
    
    // Stress: Push to breaking point
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 100 },
        { duration: '10m', target: 100 },
        { duration: '5m', target: 200 },
        { duration: '10m', target: 200 },
        { duration: '5m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    
    // Spike: Sudden traffic spike
    spike: {
      executor: 'stepping-vus',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '30s', target: 500 }, // Sudden spike
        { duration: '3m', target: 500 },
        { duration: '30s', target: 10 },  // Drop back
        { duration: '2m', target: 10 },
      ],
    },
    
    // Endurance: Long duration test
    endurance: {
      executor: 'constant-vus',
      vus: 25,
      duration: '8h',
    },
  },
  thresholds: {
    // API response time thresholds
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    
    // Error thresholds
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.02'],
    
    // Custom metric thresholds
    response_time: ['avg<300', 'p(95)<500'],
    lead_create_time: ['avg<800', 'p(95)<1500'],
    lead_list_time: ['avg<200', 'p(95)<400'],
    agent_match_time: ['avg<500', 'p(95)<1000'],
    cache_hit_rate: ['rate>0.7'],
  },
};

// Environment configuration
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_TOKEN = __ENV.API_TOKEN || 'test-api-token';
const DATA_SERVICE_URL = __ENV.DATA_SERVICE_URL || 'http://localhost:4000';

// Authentication token storage
let authToken = '';

// Default headers
const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${authToken}`,
  'X-Request-ID': `${Date.now()}-${Math.random().toString(36).substring(7)}`,
});

// Setup function - runs once at the start
export function setup() {
  // Authenticate and get token
  const loginRes = http.post(`${BASE_URL}/api/brokers/login`, JSON.stringify({
    email: 'perf-test@example.com',
    password: 'test-password',
  }), { headers: { 'Content-Type': 'application/json' } });

  if (loginRes.status === 200) {
    authToken = loginRes.json('token');
  } else {
    // Use default token if login fails
    authToken = API_TOKEN;
  }

  return { authToken, baseUrl: BASE_URL, dataServiceUrl: DATA_SERVICE_URL };
}

// Main test function
export default function (data) {
  const scenarios = [
    { weight: 40, fn: testLeadGeneration },
    { weight: 30, fn: testLeadRetrieval },
    { weight: 15, fn: testAgentMatching },
    { weight: 10, fn: testAnalyticsEndpoints },
    { weight: 5, fn: testBulkOperations },
  ];

  // Run scenarios based on weights
  const rand = Math.random() * 100;
  let cumulative = 0;
  
  for (const scenario of scenarios) {
    cumulative += scenario.weight;
    if (rand <= cumulative) {
      scenario.fn(data);
      break;
    }
  }
}

/**
 * Test lead generation flow
 */
function testLeadGeneration(data) {
  const headers = getHeaders();

  group('Lead Creation', function () {
    const startTime = Date.now();
    
    const leadData = {
      firstName: `PerfTest_${randomString(8)}`,
      lastName: `User_${randomString(5)}`,
      email: `perf_${Date.now()}_${randomIntBetween(1, 9999)}@example.com`,
      phone: `+1-555-${randomIntBetween(1000, 9999)}`,
      insuranceType: ['AUTO', 'HOME', 'LIFE', 'HEALTH'][randomIntBetween(0, 3)],
      source: 'PERFORMANCE_TEST',
      zipCode: String(randomIntBetween(10000, 99999)),
      city: 'Test City',
      state: 'TS',
    };

    const createRes = http.post(
      `${data.baseUrl}/api/v1/leads`,
      JSON.stringify(leadData),
      { headers }
    );

    leadCreateTime.add(Date.now() - startTime);

    const success = check(createRes, {
      'lead created': (r) => r.status === 201,
      'lead has ID': (r) => r.json('id') !== undefined,
      'create response time < 800ms': (r) => r.timings.duration < 800,
    }) || errorRate.add(1);

    if (!success || createRes.status !== 201) return;

    const leadId = createRes.json('id');

    // Update lead
    const updateRes = http.put(
      `${data.baseUrl}/api/v1/leads/${leadId}`,
      JSON.stringify({ qualityScore: randomIntBetween(50, 100) }),
      { headers }
    );

    check(updateRes, {
      'lead updated': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(randomIntBetween(1, 3));
  });
}

/**
 * Test lead retrieval operations
 */
function testLeadRetrieval(data) {
  const headers = getHeaders();

  group('Lead Listing', function () {
    const startTime = Date.now();

    const listRes = http.get(`${data.baseUrl}/api/v1/leads?limit=20&skip=0`, { headers });

    leadListTime.add(Date.now() - startTime);

    check(listRes, {
      'leads list returned': (r) => r.status === 200,
      'has pagination': (r) => r.json('pagination') !== undefined,
      'response time < 300ms': (r) => r.timings.duration < 300,
    }) || errorRate.add(1);

    sleep(randomIntBetween(1, 2));
  });

  group('Lead Filtering', function () {
    const filterParams = new URLSearchParams({
      status: ['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED'][randomIntBetween(0, 3)],
      insuranceType: ['AUTO', 'HOME', 'LIFE', 'HEALTH'][randomIntBetween(0, 3)],
      page: String(randomIntBetween(1, 5)),
      limit: '10',
    });

    const filterRes = http.get(
      `${data.baseUrl}/api/v1/leads?${filterParams.toString()}`,
      { headers }
    );

    check(filterRes, {
      'filtered leads returned': (r) => r.status === 200,
      'has data': (r) => Array.isArray(r.json('data')),
    }) || errorRate.add(1);

    sleep(randomIntBetween(1, 2));
  });

  group('Lead Search', function () {
    const searchRes = http.get(
      `${data.baseUrl}/api/v1/leads/search?q=test&limit=10`,
      { headers }
    );

    check(searchRes, {
      'search returned': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(randomIntBetween(1, 2));
  });
}

/**
 * Test agent matching functionality
 */
function testAgentMatching(data) {
  const headers = getHeaders();

  group('Agent List', function () {
    const agentsRes = http.get(`${data.baseUrl}/api/v1/agents?limit=20`, { headers });

    check(agentsRes, {
      'agents list returned': (r) => r.status === 200,
      'has agents': (r) => Array.isArray(r.json('data')),
    }) || errorRate.add(1);

    sleep(randomIntBetween(1, 2));
  });

  group('Agent Matching', function () {
    const startTime = Date.now();

    const matchRes = http.post(
      `${data.baseUrl}/api/v1/leads/routing/match`,
      JSON.stringify({
        insuranceType: ['AUTO', 'HOME', 'LIFE', 'HEALTH'][randomIntBetween(0, 3)],
        zipCode: String(randomIntBetween(10000, 99999)),
        state: ['CA', 'NY', 'TX', 'FL'][randomIntBetween(0, 3)],
        priority: 'STANDARD',
      }),
      { headers }
    );

    agentMatchTime.add(Date.now() - startTime);

    check(matchRes, {
      'match results returned': (r) => r.status === 200,
      'has matches': (r) => Array.isArray(r.json('data')),
      'response time < 1000ms': (r) => r.timings.duration < 1000,
    }) || errorRate.add(1);

    sleep(randomIntBetween(2, 5));
  });
}

/**
 * Test analytics endpoints
 */
function testAnalyticsEndpoints(data) {
  const headers = getHeaders();

  group('Analytics Dashboard', function () {
    const dashboardRes = http.get(`${data.baseUrl}/api/v1/analytics/overview`, { headers });

    check(dashboardRes, {
      'dashboard returned': (r) => r.status === 200,
      'has metrics': (r) => r.json('metrics') !== undefined,
    }) || errorRate.add(1);

    sleep(randomIntBetween(2, 4));
  });

  group('Lead Analytics', function () {
    const analyticsRes = http.get(
      `${data.baseUrl}/api/v1/analytics/leads?period=week`,
      { headers }
    );

    check(analyticsRes, {
      'analytics returned': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(randomIntBetween(2, 4));
  });

  group('Performance Metrics', function () {
    const perfRes = http.get(`${data.baseUrl}/api/v1/analytics/performance`, { headers });

    check(perfRes, {
      'performance metrics returned': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(randomIntBetween(2, 4));
  });
}

/**
 * Test bulk operations
 */
function testBulkOperations(data) {
  const headers = getHeaders();

  group('Batch Lead Import', function () {
    const batchSize = randomIntBetween(5, 20);
    const leads = Array.from({ length: batchSize }, (_, i) => ({
      firstName: `Batch_${randomString(5)}`,
      lastName: `User_${i}`,
      email: `batch_${Date.now()}_${i}@example.com`,
      phone: `+1-555-${randomIntBetween(1000, 9999)}`,
      insuranceType: 'AUTO',
      source: 'BATCH_IMPORT',
    }));

    const batchRes = http.post(
      `${data.baseUrl}/api/v1/leads/batch`,
      JSON.stringify({ leads }),
      { headers }
    );

    check(batchRes, {
      'batch import successful': (r) => r.status === 200 || r.status === 201,
      'has results': (r) => r.json('results') !== undefined,
    }) || errorRate.add(1);

    sleep(randomIntBetween(3, 6));
  });

  group('Bulk Status Update', function () {
    const updateRes = http.put(
      `${data.baseUrl}/api/v1/leads/bulk/status`,
      JSON.stringify({
        leadIds: [`lead-${randomIntBetween(1, 100)}`, `lead-${randomIntBetween(101, 200)}`],
        status: 'ARCHIVED',
      }),
      { headers }
    );

    check(updateRes, {
      'bulk update successful': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(randomIntBetween(2, 4));
  });
}

// Teardown function - runs once at the end
export function teardown(data) {
  console.log('Performance test completed');
  console.log('Results available in the output');
}

// Summary handler for custom reporting
export function handleSummary(data) {
  const totalRequests = data.metrics.http_reqs.values.count;
  const failedRequests = data.metrics.http_req_failed.values.rate * 100;
  const avgResponseTime = data.metrics.http_req_duration.values.avg;
  const p95ResponseTime = data.metrics.http_reqs.values.p95 || data.metrics.http_req_duration.values['p(95)'] || 0;
  const p99ResponseTime = data.metrics.http_req_duration.values['p(99)'] || 0;
  const leadCreateAvg = data.metrics.lead_create_time.values.avg || 0;
  const leadListAvg = data.metrics.lead_list_time.values.avg || 0;
  const errorRateValue = data.metrics.errors.values.rate * 100 || 0;

  return {
    stdout: `
╔══════════════════════════════════════════════════════════════════╗
║              PERFORMANCE TEST SUMMARY                            ║
╠══════════════════════════════════════════════════════════════════╣
║  Total Requests:     ${totalRequests.toString().padEnd(10)}                              ║
║  Failed Requests:    ${failedRequests.toFixed(2)}%                                 ║
║  Error Rate:         ${errorRateValue.toFixed(2)}%                                 ║
╠══════════════════════════════════════════════════════════════════╣
║  Response Times (ms):                                              ║
║    Average:         ${avgResponseTime.toFixed(2)}                                    ║
║    P95:             ${p95ResponseTime.toFixed(2)}                                    ║
║    P99:             ${p99ResponseTime.toFixed(2)}                                    ║
╠══════════════════════════════════════════════════════════════════╣
║  Key Operations (ms):                                              ║
║    Lead Create:     ${leadCreateAvg.toFixed(2)}                                    ║
║    Lead List:       ${leadListAvg.toFixed(2)}                                    ║
╚══════════════════════════════════════════════════════════════════╝
`,
    'performance-report.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      summary: {
        totalRequests,
        failedRequestsPercent: failedRequests,
        errorRatePercent: errorRateValue,
        avgResponseTime,
        p95ResponseTime,
        p99ResponseTime,
      },
      customMetrics: {
        leadCreateTime: data.metrics.lead_create_time,
        leadListTime: data.metrics.lead_list_time,
        agentMatchTime: data.metrics.agent_match_time,
        cacheHitRate: data.metrics.cache_hit_rate,
      },
      thresholds: {
        http_req_duration: data.metrics.http_req_duration,
        http_req_failed: data.metrics.http_req_failed,
        errors: data.metrics.errors,
      },
    }, null, 2),
  };
}
