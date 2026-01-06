/**
 * K6 Load Testing Script for Phase 26.7
 * Tests HTTP API performance under load
 * 
 * Run with: k6 run --vus 100 --duration 5m load-testing.k6.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const apiLatency = new Trend('api_latency');
const requestCount = new Counter('requests');

// Configuration
const API_BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = 'Bearer dev-token';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes
    { duration: '2m', target: 500 },  // Spike to 500 users
    { duration: '5m', target: 500 },  // Stay at 500 users
    { duration: '2m', target: 1000 }, // Spike to 1000 users
    { duration: '2m', target: 1000 }, // Stay at 1000 users
    { duration: '2m', target: 0 },    // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% of requests should be below 200ms
    http_req_failed: ['rate<0.01'],                // Error rate should be less than 1%
    errors: ['rate<0.05'],                         // Custom error rate < 5%
  },
};

export default function () {
  const params = {
    headers: {
      'Authorization': AUTH_TOKEN,
      'Content-Type': 'application/json',
    },
  };

  // Test 1: List leads
  {
    const res = http.get(`${API_BASE_URL}/api/v1/leads?skip=0&take=20`, params);
    const success = check(res, {
      'list leads status 200': (r) => r.status === 200,
      'list leads has data': (r) => r.json('data') !== undefined,
      'list leads latency < 100ms': (r) => r.timings.duration < 100,
    });
    errorRate.add(!success);
    apiLatency.add(res.timings.duration);
    requestCount.add(1);
  }

  sleep(1);

  // Test 2: Create lead
  {
    const leadData = {
      firstName: `LoadTest${Date.now()}`,
      lastName: 'User',
      email: `loadtest-${Date.now()}@example.com`,
      phone: '+1-555-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0'),
      insuranceType: 'AUTO',
      source: 'API',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
    };

    const res = http.post(`${API_BASE_URL}/api/v1/leads`, JSON.stringify(leadData), params);
    const success = check(res, {
      'create lead status 201': (r) => r.status === 201,
      'create lead has id': (r) => r.json('id') !== undefined,
      'create lead latency < 150ms': (r) => r.timings.duration < 150,
    });
    errorRate.add(!success);
    apiLatency.add(res.timings.duration);
    requestCount.add(1);
  }

  sleep(1);

  // Test 3: Get claims
  {
    const res = http.get(`${API_BASE_URL}/api/v1/claims?page=1&limit=20`, params);
    const success = check(res, {
      'list claims status 200': (r) => r.status === 200,
      'list claims latency < 100ms': (r) => r.timings.duration < 100,
    });
    errorRate.add(!success);
    apiLatency.add(res.timings.duration);
    requestCount.add(1);
  }

  sleep(1);

  // Test 4: Get carriers
  {
    const res = http.get(`${API_BASE_URL}/api/v1/carriers`, params);
    const success = check(res, {
      'list carriers status 200 or 502': (r) => r.status === 200 || r.status === 502, // May proxy to data-service
      'list carriers latency < 100ms': (r) => r.timings.duration < 100,
    });
    errorRate.add(!success);
    apiLatency.add(res.timings.duration);
    requestCount.add(1);
  }

  sleep(1);

  // Test 5: Get claim statistics
  {
    const res = http.get(`${API_BASE_URL}/api/v1/claims/statistics`, params);
    const success = check(res, {
      'claim stats status 200': (r) => r.status === 200,
      'claim stats has totalClaims': (r) => r.json('totalClaims') !== undefined,
      'claim stats latency < 200ms': (r) => r.timings.duration < 200,
    });
    errorRate.add(!success);
    apiLatency.add(res.timings.duration);
    requestCount.add(1);
  }

  sleep(2);
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = '\n';
  summary += `${indent}Load Test Summary\n`;
  summary += `${indent}================\n\n`;
  summary += `${indent}Total Requests: ${data.metrics.requests.values.count}\n`;
  summary += `${indent}Error Rate: ${(data.metrics.errors.values.rate * 100).toFixed(2)}%\n`;
  summary += `${indent}Request Duration (p95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}Request Duration (p99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n`;
  summary += `${indent}Throughput: ${(data.metrics.http_reqs.values.rate).toFixed(2)} req/s\n`;

  return summary;
}
