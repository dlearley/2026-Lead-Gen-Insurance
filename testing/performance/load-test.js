/**
 * Performance Testing Scripts (k6)
 * Load testing scenarios for the API
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Trend('response_time');
const leadCreateTime = new Trend('lead_create_time');

// Test configuration
export const options = {
  scenarios: {
    // Baseline load test
    baseline: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 10 }, // Ramp up
        { duration: '5m', target: 10 }, // Stay at baseline
        { duration: '2m', target: 0 }, // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    // Peak load test (2x normal)
    peak_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 }, // Ramp up to peak
        { duration: '5m', target: 20 }, // Stay at peak
        { duration: '2m', target: 0 }, // Ramp down
      ],
      gracefulRampDown: '30s',
      dependsOn: 'baseline',
    },
    // Stress test (to breaking point)
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '3m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '3m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
    // Spike test
    spike: {
      executor: 'stepping-vus',
      startVUs: 10,
      stages: [
        { duration: '1m', target: 10 },
        { duration: '30s', target: 100 }, // Sudden spike
        { duration: '1m', target: 100 },
        { duration: '30s', target: 10 }, // Drop back
        { duration: '2m', target: 10 },
      ],
    },
    // Endurance test (long duration)
    endurance: {
      executor: 'constant-vus',
      vus: 10,
      duration: '8h', // 8 hours
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'], // 95% under 500ms, 99% under 1s
    http_req_failed: ['rate<0.01'], // Less than 1% errors
    errors: ['rate<0.05'], // Less than 5% errors
    response_time: ['avg<300', 'p(95)<500'], // Average under 300ms
    lead_create_time: ['avg<1000', 'p(95)<2000'], // Lead creation under 1s avg
  },
};

// Base URL from environment
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

// Default request headers
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`,
};

export function setup() {
  // Create test data or authenticate
  return { authToken: API_TOKEN };
}

export default function (data) {
  // Run common test scenarios
  testHealthEndpoint();
  testLeadCRUD();
  testAgentEndpoints();
  testSearchAndFilter();
}

// Test health endpoint
function testHealthEndpoint() {
  const res = http.get(`${BASE_URL}/health`, { headers });

  check(res, {
    'health check returns 200': (r) => r.status === 200,
    'health check is fast': (r) => r.timings.duration < 100,
  }) || errorRate.add(1);

  responseTime.add(res.timings.duration);
}

// Test Lead CRUD operations
function testLeadCRUD() {
  // CREATE
  const startTime = Date.now();
  const createRes = http.post(
    `${BASE_URL}/api/v1/leads`,
    JSON.stringify({
      source: 'performance_test',
      email: `test_${Date.now()}@example.com`,
      phone: '+1-555-123-4567',
      firstName: 'Performance',
      lastName: 'Test',
      insuranceType: 'AUTO',
    }),
    { headers }
  );
  leadCreateTime.add(Date.now() - startTime);

  const createCheck =
    check(createRes, {
      'lead create returns 201': (r) => r.status === 201,
      'lead create response has ID': (r) => r.json('id') !== undefined,
    }) || errorRate.add(1);

  if (!createCheck) return;

  const leadId = createRes.json('id');

  // READ
  const readRes = http.get(`${BASE_URL}/api/v1/leads/${leadId}`, { headers });
  check(readRes, {
    'lead read returns 200': (r) => r.status === 200,
    'lead read returns correct ID': (r) => r.json('id') === leadId,
  }) || errorRate.add(1);

  // UPDATE
  const updateRes = http.put(
    `${BASE_URL}/api/v1/leads/${leadId}`,
    JSON.stringify({ qualityScore: 85 }),
    { headers }
  );
  check(updateRes, {
    'lead update returns 200': (r) => r.status === 200,
    'lead update applied': (r) => r.json('qualityScore') === 85,
  }) || errorRate.add(1);

  // DELETE
  const deleteRes = http.delete(`${BASE_URL}/api/v1/leads/${leadId}`, { headers });
  check(deleteRes, {
    'lead delete returns 204': (r) => r.status === 204,
  }) || errorRate.add(1);

  sleep(1);
}

// Test agent endpoints
function testAgentEndpoints() {
  const res = http.get(`${BASE_URL}/api/v1/agents`, { headers });

  check(res, {
    'agents list returns 200': (r) => r.status === 200,
    'agents list is array': (r) => Array.isArray(r.json('data')),
  }) || errorRate.add(1);

  sleep(0.5);
}

// Test search and filtering
function testSearchAndFilter() {
  const params = {
    headers,
    searchParams: {
      status: 'received',
      insuranceType: 'AUTO',
      page: '1',
      limit: '20',
    },
  };

  const res = http.get(`${BASE_URL}/api/v1/leads`, params);

  check(res, {
    'filtered search returns 200': (r) => r.status === 200,
    'filtered search returns pagination': (r) => r.json('pagination') !== undefined,
  }) || errorRate.add(1);

  sleep(0.5);
}

export function teardown(data) {
  // Cleanup test data
  console.log('Performance test completed');
}

// Summary function for custom reporting
export function handleSummary(data) {
  return {
    'stdout': `
      Performance Test Summary
      =======================
      Total Requests: ${data.metrics.http_reqs.values.count}
      Failed Requests: ${data.metrics.http_req_failed.values.rate * 100}%
      Average Response Time: ${data.metrics.http_req_duration.values.avg}ms
      95th Percentile: ${data.metrics.http_req_duration.values['p(95)']}ms
      99th Percentile: ${data.metrics.http_req_duration.values['p(99)']}ms
      
      Errors: ${data.metrics.errors.values.rate * 100}%
      Lead Create Time (avg): ${data.metrics.lead_create_time.values.avg}ms
    `,
    'performance-report.json': JSON.stringify(data, null, 2),
  };
}
