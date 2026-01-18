import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
export const errorRate = new Rate('errors');
export const leadCreationTime = new Trend('lead_creation_time');
export const claimProcessingTime = new Trend('claim_processing_time');

export const options = {
  stages: [
    { duration: '2m', target: 10 }, // Ramp up to 10 users
    { duration: '5m', target: 10 }, // Stay at 10 users
    { duration: '2m', target: 20 }, // Ramp up to 20 users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '2m', target: 0 }, // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.05'], // Error rate should be less than 5%
    errors: ['rate<0.1'], // Custom error rate should be less than 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-auth-token';

export function setup() {
  // Setup data for tests
  const authPayload = JSON.stringify({
    email: 'test@example.com',
    password: 'password123'
  });

  const authResponse = http.post(`${BASE_URL}/auth/login`, authPayload, {
    headers: { 'Content-Type': 'application/json' },
  });

  let token = AUTH_TOKEN;
  if (authResponse.status === 200) {
    const authData = JSON.parse(authResponse.body);
    token = authData.token;
  }

  return { token };
}

export default function (data: any) {
  const { token } = data;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Test 1: Lead Management
  testLeadCreation(headers);
  
  // Test 2: Claims Management
  testClaimsManagement(headers);
  
  // Test 3: Analytics and Reporting
  testAnalytics(headers);
  
  // Test 4: Policy Management
  testPolicyManagement(headers);

  sleep(1);
}

function testLeadCreation(headers: any) {
  const startTime = Date.now();
  
  // Create lead
  const leadPayload = JSON.stringify({
    firstName: 'LoadTest',
    lastName: 'User',
    email: `loadtest-${Date.now()}@example.com`,
    phone: '+1234567890',
    insuranceType: 'auto',
    source: 'load_test',
    priority: 'medium',
  });

  const createResponse = http.post(`${BASE_URL}/leads`, leadPayload, { headers });
  
  const creationTime = Date.now() - startTime;
  leadCreationTime.add(creationTime);
  
  const success = check(createResponse, {
    'lead creation status is 201': (r) => r.status === 201,
    'lead creation response time < 200ms': () => creationTime < 200,
  });
  
  errorRate.add(!success);
  
  if (success && createResponse.status === 201) {
    const leadData = JSON.parse(createResponse.body);
    const leadId = leadData.data.id;
    
    // Test lead retrieval
    const getResponse = http.get(`${BASE_URL}/leads/${leadId}`, { headers });
    check(getResponse, {
      'lead retrieval status is 200': (r) => r.status === 200,
    });
    
    // Test lead update
    const updatePayload = JSON.stringify({
      status: 'contacted',
      notes: 'Load test update',
    });
    
    const updateResponse = http.patch(`${BASE_URL}/leads/${leadId}`, updatePayload, { headers });
    check(updateResponse, {
      'lead update status is 200': (r) => r.status === 200,
    });
  }
}

function testClaimsManagement(headers: any) {
  // First, we need a policy to create a claim against
  // For simplicity, we'll use a hardcoded policy ID in load testing
  const policyId = 'test-policy-123';
  
  const startTime = Date.now();
  
  // Create claim
  const claimPayload = JSON.stringify({
    policyId,
    insuranceType: 'auto',
    claimType: 'auto_accident',
    incidentDate: '2024-01-15T14:30:00Z',
    incidentDescription: 'Load test claim',
    claimedAmount: 5000,
    incidentLocation: 'Test Location',
  });

  const createResponse = http.post(`${BASE_URL}/claims`, claimPayload, { headers });
  
  const processingTime = Date.now() - startTime;
  claimProcessingTime.add(processingTime);
  
  const success = check(createResponse, {
    'claim creation status is 201': (r) => r.status === 201,
    'claim creation response time < 300ms': () => processingTime < 300,
  });
  
  errorRate.add(!success);
  
  if (success && createResponse.status === 201) {
    const claimData = JSON.parse(createResponse.body);
    const claimId = claimData.data.id;
    
    // Test claim retrieval
    const getResponse = http.get(`${BASE_URL}/claims/${claimId}`, { headers });
    check(getResponse, {
      'claim retrieval status is 200': (r) => r.status === 200,
    });
    
    // Test claim status update
    const statusUpdatePayload = JSON.stringify({
      status: 'review',
      notes: 'Load test status update',
    });
    
    const updateResponse = http.patch(`${BASE_URL}/claims/${claimId}`, statusUpdatePayload, { headers });
    check(updateResponse, {
      'claim status update status is 200': (r) => r.status === 200,
    });
  }
}

function testAnalytics(headers: any) {
  // Test analytics endpoints
  const analyticsEndpoints = [
    '/leads/statistics',
    '/claims/statistics',
    '/analytics/dashboard',
    '/analytics/performance',
  ];
  
  analyticsEndpoints.forEach(endpoint => {
    const response = http.get(`${BASE_URL}${endpoint}`, { headers });
    check(response, {
      [`${endpoint} status is 200`]: (r) => r.status === 200,
      [`${endpoint} response time < 500ms`]: (r) => r.timings.duration < 500,
    });
  });
}

function testPolicyManagement(headers: any) {
  // Test policy endpoints
  const policyEndpoints = [
    { method: 'GET', path: '/policies', payload: null },
    { method: 'GET', path: '/policies/test-policy-123', payload: null },
  ];
  
  policyEndpoints.forEach(({ method, path, payload }) => {
    let response;
    
    if (method === 'GET') {
      response = http.get(`${BASE_URL}${path}`, { headers });
    } else if (payload) {
      response = http.request(method, `${BASE_URL}${path}`, payload, { headers });
    }
    
    if (response) {
      check(response, {
        [`${method} ${path} status is 200`]: (r) => r.status === 200,
        [`${method} ${path} response time < 300ms`]: (r) => r.timings.duration < 300,
      });
    }
  });
}

export function teardown(data: any) {
  // Cleanup after tests
  console.log('Load test completed');
}