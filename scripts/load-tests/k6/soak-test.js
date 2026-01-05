import { group, sleep } from 'k6';
import { leadGenerationUser, brokerUser, adminUser, apiIntegrationUser } from './user-profiles.js';

export let options = {
  stages: [
    { duration: '5m', target: 200 },   // ramp-up
    { duration: '3h45m', target: 200 }, // long sustain
    { duration: '10m', target: 0 },    // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(99)<700'],  // 99% of requests < 700ms
    http_req_failed: ['rate<0.002'],   // error rate < 0.2%
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
