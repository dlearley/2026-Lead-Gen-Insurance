import { group, sleep } from 'k6';
import { leadGenerationUser, brokerUser, adminUser, apiIntegrationUser } from './user-profiles.js';

export let options = {
  stages: [
    { duration: '5m', target: 500 },   // ramp to peak
    { duration: '5m', target: 1000 },  // push harder
    { duration: '5m', target: 1500 },  // push beyond expected limits
    { duration: '5m', target: 2000 },  // breaking point search
    { duration: '5m', target: 0 },     // recovery
  ],
  thresholds: {
    http_req_duration: ['p(99)<5000'], // allow higher latency under extreme stress
    http_req_failed: ['rate<0.05'],    // allow up to 5% errors at the limit
  },
};

export default function() {
  const rand = Math.random();

  if (rand < 0.4) {
    group('Lead Gen Flow', leadGenerationUser);
  } else if (rand < 0.7) {
    group('Broker Flow', brokerUser);
  } else if (rand < 0.9) {
    group('Admin Flow', adminUser);
  } else {
    group('API Flow', apiIntegrationUser);
  }
}
