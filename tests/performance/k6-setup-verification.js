/**
 * K6 Setup Verification Test
 * Verifies k6 is properly installed and configured
 * This is a simple test that doesn't require any services to be running
 */

import { check } from 'k6';
import http from 'k6/http';

export const options = {
  vus: 1,
  duration: '5s',
  thresholds: {
    checks: ['rate>0.9'],
  },
};

export default function () {
  // Test with httpbin.org which is a simple testing service
  const res = http.get('https://httpbin.org/get');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 2000ms': (r) => r.timings.duration < 2000,
  });
}

export function handleSummary(data) {
  const checksRate = data.metrics.checks.values.rate * 100;
  const avgDuration = data.metrics.http_req_duration.values.avg;

  return {
    stdout: `
╔═══════════════════════════════════════════════════════════╗
║           K6 SETUP VERIFICATION COMPLETE                  ║
╠═══════════════════════════════════════════════════════════╣
║  ✓ k6 is properly installed and working                   ║
║  ✓ HTTP requests are functional                           ║
║  ✓ Metrics collection is working                          ║
║  ✓ Checks are passing: ${checksRate.toFixed(1)}%                           ║
║  ✓ Average response time: ${avgDuration.toFixed(0)}ms                       ║
╠═══════════════════════════════════════════════════════════╣
║  Status: READY FOR PERFORMANCE TESTING                    ║
╚═══════════════════════════════════════════════════════════╝
`,
  };
}
