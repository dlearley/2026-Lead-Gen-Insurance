import { group, sleep } from 'k6';
import { leadGenerationUser, brokerUser, adminUser, apiIntegrationUser } from './user-profiles.js';

export let options = {
  stages: [
    { duration: '1m', target: 50 },    // ramp-up
    { duration: '8m', target: 50 },    // stay at peak
    { duration: '1m', target: 0 },     // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(99)<500'],  // 99% of requests < 500ms
    http_req_failed: ['rate<0.001'],   // error rate < 0.1%
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
