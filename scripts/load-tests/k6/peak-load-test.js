import { group, sleep } from 'k6';
import { leadGenerationUser, brokerUser, adminUser, apiIntegrationUser } from './user-profiles.js';

export let options = {
  stages: [
    { duration: '5m', target: 500 },   // ramp-up
    { duration: '10m', target: 500 },  // stay at peak
    { duration: '5m', target: 0 },     // ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(99)<1000'], // 99% of requests < 1000ms
    http_req_failed: ['rate<0.005'],   // error rate < 0.5%
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
