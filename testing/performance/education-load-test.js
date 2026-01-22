/**
 * Education System Performance Testing Suite
 * k6 load testing scripts for the Broker Education API
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const errorRate = new Rate('errors');
const courseListTime = new Trend('course_list_time');
const enrollmentTime = new Trend('enrollment_time');
const progressUpdateTime = new Trend('progress_update_time');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up
    { duration: '3m', target: 10 }, // Stay at 10 users
    { duration: '1m', target: 0 },  // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_TOKEN = __ENV.API_TOKEN || 'test-api-token';

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${API_TOKEN}`,
});

export default function () {
  const data = { baseUrl: BASE_URL };
  
  group('Education Journey', function () {
    // 1. List Courses
    const startTimeList = Date.now();
    const listRes = http.get(`${data.baseUrl}/api/v1/broker-education/courses`, { headers: getHeaders() });
    courseListTime.add(Date.now() - startTimeList);
    
    check(listRes, {
      'courses listed': (r) => r.status === 200,
    }) || errorRate.add(1);

    const courses = listRes.json();
    if (!Array.isArray(courses) || courses.length === 0) {
      sleep(1);
      return;
    }

    const courseId = courses[0].id;
    sleep(randomIntBetween(1, 2));

    // 2. Get Course Details
    const detailRes = http.get(`${data.baseUrl}/api/v1/broker-education/courses/${courseId}`, { headers: getHeaders() });
    check(detailRes, {
      'course details returned': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(randomIntBetween(1, 2));

    // 3. Enroll in Course
    const agentId = `agent-${randomIntBetween(1, 100)}`;
    const startTimeEnroll = Date.now();
    const enrollRes = http.post(
      `${data.baseUrl}/api/v1/broker-education/enrollments`,
      JSON.stringify({ courseId, agentId }),
      { headers: getHeaders() }
    );
    enrollmentTime.add(Date.now() - startTimeEnroll);

    check(enrollRes, {
      'enrolled successfully': (r) => r.status === 201 || r.status === 200,
    }) || errorRate.add(1);

    if (enrollRes.status !== 201 && enrollRes.status !== 200) {
      sleep(1);
      return;
    }

    const enrollmentId = enrollRes.json('id');
    sleep(randomIntBetween(2, 4));

    // 4. Update Lesson Progress
    const startTimeProgress = Date.now();
    const progressRes = http.post(
      `${data.baseUrl}/api/v1/broker-education/lesson-progress/complete`,
      JSON.stringify({
        enrollmentId,
        lessonId: `lesson-${randomIntBetween(1, 10)}`,
        timeSpentMinutes: randomIntBetween(5, 20),
      }),
      { headers: getHeaders() }
    );
    progressUpdateTime.add(Date.now() - startTimeProgress);

    check(progressRes, {
      'progress updated': (r) => r.status === 200,
    }) || errorRate.add(1);

    sleep(randomIntBetween(1, 3));
  });
}
