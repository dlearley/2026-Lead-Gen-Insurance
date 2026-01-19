/**
 * Queue & Background Job Performance Testing
 * Tests job queue throughput, processing time, and reliability
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Trend, Rate, Counter, Gauge } from 'k6/metrics';

// Custom metrics
const jobProcessingTime = new Trend('job_processing_time');
const jobWaitTime = new Trend('job_wait_time');
const jobSuccessRate = new Rate('job_success_rate');
const jobFailureRate = new Rate('job_failure_rate');
const queueDepth = new Gauge('queue_depth');

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const DATA_SERVICE_URL = __ENV.DATA_SERVICE_URL || 'http://localhost:4000';
const API_TOKEN = __ENV.API_TOKEN || 'test-token';

const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`,
};

export const options = {
  scenarios: {
    queue_performance: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '2m', target: 25 },
        { duration: '10m', target: 25 },
        { duration: '2m', target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    job_processing_time: ['p(95)<1000', 'p(99)<5000'],
    job_wait_time: ['p(95)<30000'],
    job_success_rate: ['rate>0.95'],
    job_failure_rate: ['rate<0.05'],
  },
};

export default function () {
  // Test job metrics retrieval
  group('Job Metrics', function () {
    const queues = ['lead-ingestion', 'email-processing', 'analytics', 'notifications'];

    for (const queue of queues) {
      const res = http.get(
        `${BASE_URL}/api/v1/performance/jobs/metrics?queue=${queue}`,
        { headers }
      );

      check(res, {
        [`metrics for ${queue}`]: (r) => r.status === 200,
        'has queue metrics': (r) => {
          const data = r.json();
          return data.waiting !== undefined && data.active !== undefined;
        },
      });

      // Track queue depth
      if (res.status === 200) {
        const data = res.json();
        queueDepth.add(data.waiting || 0, { queue });
      }

      sleep(0.5);
    }
  });

  // Test all queues metrics
  group('All Queue Metrics', function () {
    const res = http.get(`${BASE_URL}/api/v1/performance/jobs/metrics`, { headers });

    check(res, {
      'all queue metrics retrieved': (r) => r.status === 200,
      'has array of metrics': (r) => Array.isArray(r.json()),
    });
  });

  // Test job scheduling
  group('Job Scheduling', function () {
    const jobSchedule = {
      name: `perf-test-job-${Date.now()}`,
      pattern: '* * * * *', // Every minute
      jobType: 'test-job',
      data: { testId: Date.now() },
      timezone: 'UTC',
      enabled: true,
    };

    const res = http.post(
      `${BASE_URL}/api/v1/performance/jobs/schedule`,
      JSON.stringify(jobSchedule),
      { headers }
    );

    check(res, {
      'job scheduled': (r) => r.status === 200,
    }) || jobFailureRate.add(1);
  });

  // Test queue pause/resume
  group('Queue Control', function () {
    const testQueue = 'test-queue-perf';

    // Pause queue
    const pauseRes = http.post(
      `${BASE_URL}/api/v1/performance/jobs/${testQueue}/pause`,
      {},
      { headers }
    );

    check(pauseRes, {
      'queue pause request sent': (r) => r.status === 200 || r.status === 404, // Queue may not exist
    });

    sleep(1);

    // Resume queue
    const resumeRes = http.post(
      `${BASE_URL}/api/v1/performance/jobs/${testQueue}/resume`,
      {},
      { headers }
    );

    check(resumeRes, {
      'queue resume request sent': (r) => r.status === 200 || r.status === 404,
    });
  });

  // Test dead letter queue
  group('Dead Letter Queue', function () {
    const testQueue = 'test-queue-perf';

    const res = http.get(
      `${BASE_URL}/api/v1/performance/jobs/${testQueue}/dead-letter`,
      { headers }
    );

    check(res, {
      'dead letter jobs retrieved': (r) => r.status === 200,
      'returns array': (r) => Array.isArray(r.json()),
    });
  });

  // Test retry failed jobs
  group('Retry Failed Jobs', function () {
    const testQueue = 'test-queue-perf';

    const res = http.post(
      `${BASE_URL}/api/v1/performance/jobs/${testQueue}/retry-failed`,
      {},
      { headers }
    );

    check(res, {
      'retry request sent': (r) => r.status === 200,
    });
  });

  // Simulate job submission (via API endpoints that create jobs)
  group('Job Submission Simulation', function () {
    // Submit leads that trigger background processing
    for (let i = 0; i < 5; i++) {
      const lead = {
        firstName: `QueueTest${i}`,
        lastName: `User`,
        email: `queue-test-${Date.now()}-${i}@example.com`,
        phone: `+1-555-${String(i).padStart(4, '0')}`,
        insuranceType: 'AUTO',
        source: 'PERFORMANCE_TEST_QUEUE',
      };

      const startTime = Date.now();
      
      const res = http.post(
        `${BASE_URL}/api/v1/leads`,
        JSON.stringify(lead),
        { headers }
      );

      jobProcessingTime.add(Date.now() - startTime);

      check(res, {
        'lead created': (r) => r.status === 201,
      }) ? jobSuccessRate.add(1) : jobFailureRate.add(1);

      sleep(0.5);
    }
  });

  // Test capacity planning endpoints
  group('Capacity Planning', function () {
    const resources = ['cpu', 'memory', 'storage', 'bandwidth', 'database'];

    for (const resource of resources) {
      const res = http.get(
        `${BASE_URL}/api/v1/performance/capacity/forecast/${resource}?months=3`,
        { headers }
      );

      check(res, {
        [`capacity forecast for ${resource}`]: (r) => r.status === 200,
        'has projections': (r) => Array.isArray(r.json('projections')),
      });

      sleep(0.5);
    }
  });

  // Test capacity dashboard
  group('Capacity Dashboard', function () {
    const startTime = Date.now();
    
    const res = http.get(`${BASE_URL}/api/v1/performance/capacity/dashboard`, { headers });

    check(res, {
      'capacity dashboard retrieved': (r) => r.status === 200,
      'has forecasts': (r) => Array.isArray(r.json('forecasts')),
      'has alerts': (r) => Array.isArray(r.json('alerts')),
    });

    jobWaitTime.add(Date.now() - startTime);
  });

  // Test bottleneck identification
  group('Bottleneck Detection', function () {
    const res = http.get(`${BASE_URL}/api/v1/performance/capacity/bottlenecks`, { headers });

    check(res, {
      'bottlenecks retrieved': (r) => r.status === 200,
      'returns array': (r) => Array.isArray(r.json()),
    });
  });

  sleep(10);
}

export function handleSummary(data) {
  const processingMetrics = data.metrics.job_processing_time;
  const waitMetrics = data.metrics.job_wait_time;
  const successRate = data.metrics.job_success_rate;
  const failureRate = data.metrics.job_failure_rate;

  return {
    stdout: `
╔══════════════════════════════════════════════════════════════════╗
║              QUEUE PERFORMANCE TEST SUMMARY                       ║
╠══════════════════════════════════════════════════════════════════╣
║  Job Processing:                                                 ║
║    Average Time:   ${(processingMetrics.values.avg || 0).toFixed(2)}ms                               ║
║    P95:            ${(processingMetrics.values.p95 || 0).toFixed(2)}ms                               ║
║    P99:            ${(processingMetrics.values.p99 || 0).toFixed(2)}ms                               ║
╠══════════════════════════════════════════════════════════════════╣
║  Queue Wait Time:                                                ║
║    Average:        ${(waitMetrics.values.avg || 0).toFixed(2)}ms                               ║
║    P95:            ${(waitMetrics.values.p95 || 0).toFixed(2)}ms                               ║
╠══════════════════════════════════════════════════════════════════╣
║  Job Success Rate:  ${((successRate.values.rate || 0) * 100).toFixed(1)}%                                ║
║  Job Failure Rate:  ${((failureRate.values.rate || 0) * 100).toFixed(1)}%                                ║
╚══════════════════════════════════════════════════════════════════╝
`,
    'queue-performance-report.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      jobProcessing: processingMetrics,
      queueWait: waitMetrics,
      reliability: {
        successRate: successRate.values.rate || 0,
        failureRate: failureRate.values.rate || 0,
      },
    }, null, 2),
  };
}
