/**
 * Load Testing Scenarios
 * Artillery.io compatible load test scenarios
 */

import type { LoadTestScenario } from '@insurance-lead-gen/types';

export const loadTestScenarios: LoadTestScenario[] = [
  {
    name: 'baseline-performance',
    description: 'Baseline performance test with steady load',
    duration: 300,
    rampUp: 60,
    stages: [
      {
        name: 'warm-up',
        duration: 60,
        target: 10,
        arrivalRate: 5,
      },
      {
        name: 'steady-state',
        duration: 180,
        target: 50,
        arrivalRate: 25,
      },
      {
        name: 'cool-down',
        duration: 60,
        target: 10,
        arrivalRate: 5,
      },
    ],
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/analytics/overview',
        weight: 30,
      },
      {
        method: 'GET',
        path: '/api/v1/analytics/leads',
        weight: 25,
      },
      {
        method: 'GET',
        path: '/api/v1/analytics/agents',
        weight: 20,
      },
      {
        method: 'POST',
        path: '/api/v1/leads',
        weight: 15,
        body: {
          source: 'load-test',
          email: 'test@example.com',
          phone: '+1234567890',
          insuranceType: 'AUTO',
        },
      },
      {
        method: 'GET',
        path: '/api/health',
        weight: 10,
      },
    ],
  },
  {
    name: 'stress-test',
    description: 'Stress test with gradually increasing load',
    duration: 600,
    rampUp: 120,
    stages: [
      {
        name: 'stage-1',
        duration: 120,
        target: 50,
        arrivalRate: 25,
      },
      {
        name: 'stage-2',
        duration: 120,
        target: 100,
        arrivalRate: 50,
      },
      {
        name: 'stage-3',
        duration: 120,
        target: 200,
        arrivalRate: 100,
      },
      {
        name: 'stage-4',
        duration: 120,
        target: 400,
        arrivalRate: 200,
      },
      {
        name: 'recovery',
        duration: 120,
        target: 50,
        arrivalRate: 25,
      },
    ],
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/analytics/overview',
        weight: 40,
      },
      {
        method: 'GET',
        path: '/api/v1/analytics/leads',
        weight: 30,
      },
      {
        method: 'POST',
        path: '/api/v1/leads',
        weight: 20,
        body: {
          source: 'stress-test',
          email: 'stress@example.com',
          insuranceType: 'AUTO',
        },
      },
      {
        method: 'GET',
        path: '/api/health',
        weight: 10,
      },
    ],
  },
  {
    name: 'spike-test',
    description: 'Spike test with sudden traffic increases',
    duration: 300,
    rampUp: 10,
    stages: [
      {
        name: 'baseline',
        duration: 60,
        target: 20,
        arrivalRate: 10,
      },
      {
        name: 'spike-1',
        duration: 30,
        target: 500,
        arrivalRate: 250,
      },
      {
        name: 'recovery-1',
        duration: 60,
        target: 20,
        arrivalRate: 10,
      },
      {
        name: 'spike-2',
        duration: 30,
        target: 500,
        arrivalRate: 250,
      },
      {
        name: 'recovery-2',
        duration: 120,
        target: 20,
        arrivalRate: 10,
      },
    ],
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/analytics/overview',
        weight: 50,
      },
      {
        method: 'GET',
        path: '/api/v1/analytics/leads',
        weight: 30,
      },
      {
        method: 'GET',
        path: '/api/health',
        weight: 20,
      },
    ],
  },
  {
    name: 'endurance-test',
    description: 'Endurance test with sustained moderate load',
    duration: 3600,
    rampUp: 300,
    stages: [
      {
        name: 'ramp-up',
        duration: 300,
        target: 100,
        arrivalRate: 50,
      },
      {
        name: 'sustained',
        duration: 3000,
        target: 100,
        arrivalRate: 50,
      },
      {
        name: 'ramp-down',
        duration: 300,
        target: 10,
        arrivalRate: 5,
      },
    ],
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/analytics/overview',
        weight: 25,
      },
      {
        method: 'GET',
        path: '/api/v1/analytics/leads',
        weight: 25,
      },
      {
        method: 'GET',
        path: '/api/v1/analytics/agents',
        weight: 20,
      },
      {
        method: 'POST',
        path: '/api/v1/leads',
        weight: 15,
        body: {
          source: 'endurance-test',
          email: 'endurance@example.com',
        },
      },
      {
        method: 'GET',
        path: '/api/health',
        weight: 15,
      },
    ],
  },
  {
    name: 'api-focused',
    description: 'Test focused on API performance endpoints',
    duration: 300,
    rampUp: 60,
    stages: [
      {
        name: 'steady',
        duration: 300,
        target: 100,
        arrivalRate: 50,
      },
    ],
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/performance/cache/metrics',
        weight: 20,
      },
      {
        method: 'GET',
        path: '/api/v1/performance/database/connection-pool',
        weight: 20,
      },
      {
        method: 'GET',
        path: '/api/v1/performance/jobs/metrics',
        weight: 20,
      },
      {
        method: 'GET',
        path: '/api/v1/performance/capacity/dashboard',
        weight: 20,
      },
      {
        method: 'GET',
        path: '/api/v1/analytics/overview',
        weight: 20,
      },
    ],
  },
];

export function generateArtilleryConfig(scenario: LoadTestScenario, targetUrl: string): any {
  return {
    config: {
      target: targetUrl,
      phases: scenario.stages.map((stage) => ({
        duration: stage.duration,
        arrivalRate: stage.arrivalRate,
        name: stage.name,
      })),
      defaults: {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    },
    scenarios: [
      {
        name: scenario.name,
        flow: scenario.endpoints.map((endpoint) => {
          const request: any = {
            [endpoint.method.toLowerCase()]: {
              url: endpoint.path,
            },
          };

          if (endpoint.body) {
            request[endpoint.method.toLowerCase()].json = endpoint.body;
          }

          if (endpoint.headers) {
            request[endpoint.method.toLowerCase()].headers = endpoint.headers;
          }

          return request;
        }),
      },
    ],
  };
}
