import { group, sleep } from 'k6';
import { leadGenerationUser, brokerUser, adminUser, apiIntegrationUser } from './user-profiles.js';

export let options = {
  stages: [
    { duration: '2m', target: 50 },    // baseline
    { duration: '2m', target: 1000 },  // sudden spike
    { duration: '5m', target: 1000 },  // sustain spike
    { duration: '2m', target: 50 },    // ramp down
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<2000'], // 99% of requests < 2000ms
    http_req_failed: ['rate<0.01'],    // error rate < 1%
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
