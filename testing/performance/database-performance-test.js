/**
 * Database Performance Testing Script
 * Tests database query performance and optimization
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Custom metrics
const queryTime = new Trend('db_query_time');
const connectionAcquireTime = new Trend('db_connection_acquire');
const queryErrorRate = new Rate('db_query_errors');
const slowQueryCount = new Counter('slow_queries');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`,
};

export const options = {
  scenarios: {
    database_performance: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 20 },
        { duration: '10m', target: 20 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    db_query_time: ['p(95)<200', 'p(99)<500'],
    db_connection_acquire: ['p(95)<100'],
    db_query_errors: ['rate<0.01'],
    slow_queries: ['count<10'],
  },
};

export default function () {
  // Test database connection pool metrics
  group('Database Connection Pool', function () {
    const startTime = Date.now();
    
    const res = http.get(`${BASE_URL}/api/v1/performance/database/connection-pool`, { headers });
    connectionAcquireTime.add(Date.now() - startTime);

    check(res, {
      'connection pool metrics retrieved': (r) => r.status === 200,
      'has active connections': (r) => {
        const data = r.json();
        return data.active !== undefined && data.idle !== undefined;
      },
    }) || queryErrorRate.add(1);
  });

  // Test slow queries detection
  group('Slow Queries Detection', function () {
    const res = http.get(`${BASE_URL}/api/v1/performance/database/slow-queries?limit=20`, { headers });

    check(res, {
      'slow queries retrieved': (r) => r.status === 200,
    }) || queryErrorRate.add(1);

    // Count slow queries
    const queries = res.json();
    if (Array.isArray(queries)) {
      slowQueryCount.add(queries.length);
    }
  });

  // Test table statistics
  group('Table Statistics', function () {
    const tables = ['Lead', 'Agent', 'LeadAssignment', 'Event'];

    for (const table of tables) {
      const res = http.get(
        `${BASE_URL}/api/v1/performance/database/table-stats/${table}`,
        { headers }
      );

      check(res, {
        [`table stats for ${table}`]: (r) => r.status === 200,
      }) || queryErrorRate.add(1);

      sleep(0.5);
    }
  });

  // Test indexing strategy recommendations
  group('Indexing Strategy', function () {
    const startTime = Date.now();
    
    const res = http.get(`${BASE_URL}/api/v1/performance/database/indexing-strategy`, { headers });
    queryTime.add(Date.now() - startTime);

    check(res, {
      'indexing strategy retrieved': (r) => r.status === 200,
      'has recommendations': (r) => {
        const data = r.json();
        return Array.isArray(data) && data.length > 0;
      },
    }) || queryErrorRate.add(1);
  });

  // Test database size
  group('Database Size', function () {
    const res = http.get(`${BASE_URL}/api/v1/performance/database/size`, { headers });

    check(res, {
      'database size retrieved': (r) => r.status === 200,
      'has size info': (r) => r.json('size') !== undefined,
    }) || queryErrorRate.add(1);
  });

  // Test query analysis
  group('Query Analysis', function () {
    const testQueries = [
      'SELECT * FROM "Lead" WHERE status = $1',
      'SELECT * FROM "Agent" WHERE isActive = true',
      'SELECT * FROM "LeadAssignment" WHERE agentId = $1',
    ];

    for (const query of testQueries) {
      const startTime = Date.now();
      
      const res = http.post(
        `${BASE_URL}/api/v1/performance/database/analyze-query`,
        JSON.stringify({ query }),
        { headers }
      );
      
      queryTime.add(Date.now() - startTime);

      check(res, {
        'query analyzed': (r) => r.status === 200,
        'has execution plan': (r) => r.json('plan') !== undefined,
        'has recommendations': (r) => Array.isArray(r.json('recommendations')),
      }) || queryErrorRate.add(1);

      sleep(0.5);
    }
  });

  // Test table optimization
  group('Table Optimization', function () {
    const tables = ['Lead', 'Agent'];

    for (const table of tables) {
      const startTime = Date.now();
      
      const res = http.post(
        `${BASE_URL}/api/v1/performance/database/optimize-table/${table}`,
        {},
        { headers }
      );

      queryTime.add(Date.now() - startTime);

      check(res, {
        [`table ${table} optimized`]: (r) => r.status === 200,
      }) || queryErrorRate.add(1);

      sleep(1);
    }
  });

  sleep(5);
}

export function handleSummary(data) {
  const queryMetrics = data.metrics.db_query_time;
  const connectionMetrics = data.metrics.db_connection_acquire;
  const slowQueries = data.metrics.slow_queries;

  return {
    stdout: `
╔══════════════════════════════════════════════════════════════════╗
║              DATABASE PERFORMANCE TEST SUMMARY                    ║
╠══════════════════════════════════════════════════════════════════╣
║  Query Performance:                                              ║
║    Average:      ${(queryMetrics.values.avg || 0).toFixed(2)}ms                               ║
║    P95:          ${(queryMetrics.values.p95 || 0).toFixed(2)}ms                               ║
║    P99:          ${(queryMetrics.values.p99 || 0).toFixed(2)}ms                               ║
╠══════════════════════════════════════════════════════════════════╣
║  Connection Pool:                                                ║
║    Average:      ${(connectionMetrics.values.avg || 0).toFixed(2)}ms                               ║
║    P95:          ${(connectionMetrics.values.p95 || 0).toFixed(2)}ms                               ║
╠══════════════════════════════════════════════════════════════════╣
║  Slow Queries Detected: ${(slowQueries.values.rate || 0) * 100}%                              ║
╚══════════════════════════════════════════════════════════════════╝
`,
    'database-performance-report.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      queryPerformance: queryMetrics,
      connectionPool: connectionMetrics,
      slowQueries: slowQueries,
    }, null, 2),
  };
}
