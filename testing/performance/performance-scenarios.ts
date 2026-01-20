// Performance test scenarios for insurance platform

export const performanceScenarios = {
  // Lead Management Performance Tests
  leadManagement: {
    'Create Lead': {
      weight: 25,
      executor: 'constant-vus',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'],
        http_req_failed: ['rate<0.01'],
      },
    },
    'Get Leads List': {
      weight: 40,
      executor: 'constant-vus',
      startVUs: 20,
      stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<300', 'p(99)<600'],
        http_req_failed: ['rate<0.005'],
      },
    },
    'Update Lead': {
      weight: 20,
      executor: 'constant-vus',
      startVUs: 15,
      stages: [
        { duration: '2m', target: 75 },
        { duration: '5m', target: 75 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<400', 'p(99)<800'],
        http_req_failed: ['rate<0.01'],
      },
    },
    'Search Leads': {
      weight: 15,
      executor: 'constant-vus',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<600', 'p(99)<1200'],
        http_req_failed: ['rate<0.01'],
      },
    },
  },

  // Claims Management Performance Tests
  claimsManagement: {
    'Create Claim': {
      weight: 20,
      executor: 'constant-vus',
      startVUs: 8,
      stages: [
        { duration: '2m', target: 40 },
        { duration: '5m', target: 40 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<800', 'p(99)<1500'],
        http_req_failed: ['rate<0.01'],
      },
    },
    'Get Claims List': {
      weight: 30,
      executor: 'constant-vus',
      startVUs: 15,
      stages: [
        { duration: '2m', target: 75 },
        { duration: '5m', target: 75 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<400', 'p(99)<800'],
        http_req_failed: ['rate<0.005'],
      },
    },
    'Update Claim Status': {
      weight: 25,
      executor: 'constant-vus',
      startVUs: 12,
      stages: [
        { duration: '2m', target: 60 },
        { duration: '5m', target: 60 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'],
        http_req_failed: ['rate<0.01'],
      },
    },
    'Upload Claim Documents': {
      weight: 15,
      executor: 'constant-vus',
      startVUs: 5,
      stages: [
        { duration: '2m', target: 25 },
        { duration: '5m', target: 25 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<2000', 'p(99)<5000'],
        http_req_failed: ['rate<0.02'],
      },
    },
    'Claim Analytics': {
      weight: 10,
      executor: 'constant-vus',
      startVUs: 6,
      stages: [
        { duration: '2m', target: 30 },
        { duration: '5m', target: 30 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<1000', 'p(99)<2000'],
        http_req_failed: ['rate<0.01'],
      },
    },
  },

  // Policy Management Performance Tests
  policyManagement: {
    'Get Policies List': {
      weight: 35,
      executor: 'constant-vus',
      startVUs: 15,
      stages: [
        { duration: '2m', target: 75 },
        { duration: '5m', target: 75 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<300', 'p(99)<600'],
        http_req_failed: ['rate<0.005'],
      },
    },
    'Get Policy Details': {
      weight: 30,
      executor: 'constant-vus',
      startVUs: 12,
      stages: [
        { duration: '2m', target: 60 },
        { duration: '5m', target: 60 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<400', 'p(99)<800'],
        http_req_failed: ['rate<0.005'],
      },
    },
    'Update Policy': {
      weight: 20,
      executor: 'constant-vus',
      startVUs: 8,
      stages: [
        { duration: '2m', target: 40 },
        { duration: '5m', target: 40 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<500', 'p(99)<1000'],
        http_req_failed: ['rate<0.01'],
      },
    },
    'Generate Policy Report': {
      weight: 15,
      executor: 'constant-vus',
      startVUs: 5,
      stages: [
        { duration: '2m', target: 25 },
        { duration: '5m', target: 25 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<1500', 'p(99)<3000'],
        http_req_failed: ['rate<0.02'],
      },
    },
  },

  // Analytics Performance Tests
  analytics: {
    'Dashboard Analytics': {
      weight: 25,
      executor: 'constant-vus',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<1000', 'p(99)<2000'],
        http_req_failed: ['rate<0.01'],
      },
    },
    'Lead Analytics': {
      weight: 20,
      executor: 'constant-vus',
      startVUs: 8,
      stages: [
        { duration: '2m', target: 40 },
        { duration: '5m', target: 40 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<800', 'p(99)<1600'],
        http_req_failed: ['rate<0.01'],
      },
    },
    'Claims Analytics': {
      weight: 20,
      executor: 'constant-vus',
      startVUs: 8,
      stages: [
        { duration: '2m', target: 40 },
        { duration: '5m', target: 40 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<800', 'p(99)<1600'],
        http_req_failed: ['rate<0.01'],
      },
    },
    'Performance Reports': {
      weight: 15,
      executor: 'constant-vus',
      startVUs: 5,
      stages: [
        { duration: '2m', target: 25 },
        { duration: '5m', target: 25 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<2000', 'p(99)<4000'],
        http_req_failed: ['rate<0.02'],
      },
    },
    'Custom Reports': {
      weight: 20,
      executor: 'constant-vus',
      startVUs: 6,
      stages: [
        { duration: '2m', target: 30 },
        { duration: '5m', target: 30 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<3000', 'p(99)<6000'],
        http_req_failed: ['rate<0.03'],
      },
    },
  },

  // Mixed Workflow Performance Tests
  mixedWorkflow: {
    'Lead to Policy Workflow': {
      weight: 30,
      executor: 'constant-vus',
      startVUs: 5,
      stages: [
        { duration: '2m', target: 25 },
        { duration: '5m', target: 25 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<2000', 'p(99)<4000'],
        http_req_failed: ['rate<0.02'],
      },
    },
    'Claim Processing Workflow': {
      weight: 25,
      executor: 'constant-vus',
      startVUs: 3,
      stages: [
        { duration: '2m', target: 15 },
        { duration: '5m', target: 15 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<3000', 'p(99)<6000'],
        http_req_failed: ['rate<0.02'],
      },
    },
    'Admin Dashboard Mix': {
      weight: 25,
      executor: 'constant-vus',
      startVUs: 10,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 50 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<800', 'p(99)<1600'],
        http_req_failed: ['rate<0.01'],
      },
    },
    'Search and Filter Mix': {
      weight: 20,
      executor: 'constant-vus',
      startVUs: 8,
      stages: [
        { duration: '2m', target: 40 },
        { duration: '5m', target: 40 },
        { duration: '2m', target: 0 },
      ],
      thresholds: {
        http_req_duration: ['p(95)<1000', 'p(99)<2000'],
        http_req_failed: ['rate<0.01'],
      },
    },
  },
};

// Database performance test scenarios
export const databaseScenarios = {
  'Database Read Performance': {
    weight: 40,
    executor: 'constant-vus',
    startVUs: 20,
    stages: [
      { duration: '3m', target: 100 },
      { duration: '5m', target: 100 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<200', 'p(99)<400'],
      http_req_failed: ['rate<0.005'],
    },
  },
  'Database Write Performance': {
    weight: 35,
    executor: 'constant-vus',
    startVUs: 10,
    stages: [
      { duration: '2m', target: 50 },
      { duration: '5m', target: 50 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<300', 'p(99)<600'],
      http_req_failed: ['rate<0.01'],
    },
  },
  'Complex Query Performance': {
    weight: 25,
    executor: 'constant-vus',
    startVUs: 5,
    stages: [
      { duration: '2m', target: 25 },
      { duration: '5m', target: 25 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<1000', 'p(99)<2000'],
      http_req_failed: ['rate<0.02'],
    },
  },
};

// File upload performance tests
export const fileUploadScenarios = {
  'Small Document Upload (PDF)': {
    weight: 30,
    executor: 'constant-vus',
    startVUs: 8,
    stages: [
      { duration: '2m', target: 40 },
      { duration: '5m', target: 40 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<2000', 'p(99)<4000'],
      http_req_failed: ['rate<0.02'],
    },
  },
  'Large Document Upload (Images)': {
    weight: 20,
    executor: 'constant-vus',
    startVUs: 3,
    stages: [
      { duration: '2m', target: 15 },
      { duration: '5m', target: 15 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<5000', 'p(99)<10000'],
      http_req_failed: ['rate<0.03'],
    },
  },
  'Batch Document Upload': {
    weight: 15,
    executor: 'constant-vus',
    startVUs: 2,
    stages: [
      { duration: '2m', target: 10 },
      { duration: '5m', target: 10 },
      { duration: '2m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<8000', 'p(99)<15000'],
      http_req_failed: ['rate<0.04'],
    },
  },
};

// Stress test scenarios
export const stressTestScenarios = {
  'System Breaking Point': {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '2m', target: 100 },
      { duration: '5m', target: 500 },
      { duration: '10m', target: 1000 },
      { duration: '5m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<10000'],
      http_req_failed: ['rate<0.10'],
    },
  },
  'Database Connection Pool': {
    executor: 'ramping-vus',
    startVUs: 1,
    stages: [
      { duration: '3m', target: 50 },
      { duration: '5m', target: 200 },
      { duration: '5m', target: 500 },
      { duration: '5m', target: 0 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<5000'],
      http_req_failed: ['rate<0.15'],
    },
  },
  'Memory Leak Detection': {
    executor: 'constant-vus',
    startVUs: 50,
    stages: [
      { duration: '30m', target: 50 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<2000'],
      http_req_failed: ['rate<0.05'],
    },
  },
};

// Spike test scenarios
export const spikeTestScenarios = {
  'Traffic Spike': {
    executor: 'spike',
    startVUs: 10,
    stages: [
      { duration: '1m', target: 10 }, // Normal load
      { duration: '30s', target: 200 }, // Spike to 200 users
      { duration: '2m', target: 200 }, // Stay at 200 users
      { duration: '30s', target: 10 }, // Drop back to normal
      { duration: '2m', target: 10 }, // Stay at normal
      { duration: '30s', target: 500 }, // Another spike
      { duration: '2m', target: 500 }, // Stay at spike
      { duration: '30s', target: 10 }, // Return to normal
      { duration: '2m', target: 10 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<5000'],
      http_req_failed: ['rate<0.10'],
    },
  },
  'Burst Traffic': {
    executor: 'spike',
    startVUs: 5,
    stages: [
      { duration: '1m', target: 5 },
      { duration: '10s', target: 100 }, // Quick burst
      { duration: '30s', target: 5 }, // Back to normal
      { duration: '10s', target: 100 }, // Another burst
      { duration: '30s', target: 5 },
      { duration: '10s', target: 100 }, // Final burst
      { duration: '1m', target: 5 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<3000'],
      http_req_failed: ['rate<0.15'],
    },
  },
};

// Endurance test scenarios
export const enduranceTestScenarios = {
  '24-Hour Endurance Test': {
    executor: 'constant-vus',
    startVUs: 50,
    stages: [
      { duration: '24h', target: 50 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<1000'],
      http_req_failed: ['rate<0.01'],
    },
  },
  'Memory Stability Test': {
    executor: 'constant-vus',
    startVUs: 25,
    stages: [
      { duration: '8h', target: 25 },
    ],
    thresholds: {
      http_req_duration: ['p(95)<800'],
      http_req_failed: ['rate<0.01'],
    },
  },
};