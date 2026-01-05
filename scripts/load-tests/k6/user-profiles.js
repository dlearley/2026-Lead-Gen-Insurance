import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://api.local';

export function leadGenerationUser() {
  const payload = JSON.stringify({
    firstName: 'Test',
    lastName: 'User',
    email: `test-${Math.random()}@example.com`,
    phone: '555-0199',
    insuranceType: 'AUTO',
    zipCode: '90210'
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/api/v1/leads`, payload, params);
  check(res, { 'create lead success': (r) => r.status === 201 });

  sleep(Math.random() * 10 + 5);

  if (res.status === 201) {
    const leadId = JSON.parse(res.body).id;
    const getRes = http.get(`${BASE_URL}/api/v1/leads/${leadId}`);
    check(getRes, { 'get lead success': (r) => r.status === 200 });
  }

  sleep(Math.random() * 5 + 5);
}

export function brokerUser() {
  const query = 'status=NEW&limit=20';
  const res = http.get(`${BASE_URL}/api/v1/leads?${query}`);
  check(res, { 'search leads success': (r) => r.status === 200 });

  sleep(Math.random() * 20 + 10);

  const exportRes = http.get(`${BASE_URL}/api/v1/leads/export?format=csv`);
  check(exportRes, { 'export leads success': (r) => r.status === 200 });

  sleep(Math.random() * 15 + 10);
}

export function adminUser() {
  const statsRes = http.get(`${BASE_URL}/api/v1/analytics/overview`);
  check(statsRes, { 'get analytics success': (r) => r.status === 200 });

  sleep(Math.random() * 40 + 20);

  const configRes = http.get(`${BASE_URL}/api/v1/config`);
  check(configRes, { 'get config success': (r) => r.status === 200 });

  sleep(Math.random() * 30 + 20);
}

export function apiIntegrationUser() {
  const payload = JSON.stringify({
    leads: Array(10).fill({
      firstName: 'Batch',
      lastName: 'Lead',
      email: `batch-${Math.random()}@example.com`,
      insuranceType: 'HOME'
    })
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': 'test-api-key'
    },
  };

  const res = http.post(`${BASE_URL}/api/v1/leads/batch`, payload, params);
  check(res, { 'batch import success': (r) => r.status === 200 || r.status === 201 });

  sleep(Math.random() * 60 + 30);
}
