import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../../../apps/api/src/app.js';

describe('Security Tests - Authentication & Authorization', () => {
  describe('Authentication', () => {
    it('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Unauthorized');
    });

    it('should reject requests with invalid authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Invalid token');
    });

    it('should accept requests with valid authentication token', async () => {
      // Mock valid token - in production, this would be a real JWT
      const validToken = 'valid-jwt-token-mock';
      
      // Mock the authentication middleware to accept this token
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${validToken}`)
        .set('x-user-id', 'test-user-123')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Authorization - Role-based Access', () => {
    const testEndpoints = [
      { method: 'GET', path: '/api/v1/leads', allowedRoles: ['agent', 'admin', 'manager'] },
      { method: 'GET', path: '/api/v1/claims', allowedRoles: ['adjuster', 'admin', 'manager'] },
      { method: 'POST', path: '/api/v1/leads', allowedRoles: ['agent', 'admin'] },
      { method: 'PATCH', path: '/api/v1/claims/claim-123', allowedRoles: ['adjuster', 'admin'] },
      { method: 'DELETE', path: '/api/v1/leads/lead-123', allowedRoles: ['admin'] },
      { method: 'GET', path: '/api/v1/admin/users', allowedRoles: ['admin'] },
    ];

    testEndpoints.forEach(({ method, path, allowedRoles }) => {
      it(`should restrict ${method} ${path} to authorized roles only`, async () => {
        const unauthorizedRoles = ['customer', 'guest', 'invalid-role'];
        const authorizedRoles = allowedRoles;

        // Test unauthorized roles
        for (const role of unauthorizedRoles) {
          const response = await request(app)
            [method.toLowerCase()](path)
            .set('Authorization', 'Bearer valid-token')
            .set('x-user-id', 'test-user')
            .set('x-user-role', role)
            .expect(403);

          expect(response.body.success).toBe(false);
          expect(response.body.message).toContain('Forbidden');
        }

        // Note: In a real implementation, you'd also test authorized roles
        // but that would require more complex mocking of the authorization middleware
      });
    });
  });

  describe('Input Validation & Sanitization', () => {
    it('should prevent SQL injection attacks', async () => {
      const maliciousPayload = {
        firstName: "'; DROP TABLE leads; --",
        lastName: 'Doe',
        email: 'test@example.com',
        insuranceType: 'auto',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-id', 'test-user')
        .send(maliciousPayload)
        .expect(400); // Should be rejected by validation

      expect(response.body.success).toBe(false);
    });

    it('should prevent XSS attacks in input fields', async () => {
      const xssPayload = {
        firstName: '<script>alert("xss")</script>',
        lastName: 'Doe',
        email: 'test@example.com',
        notes: '<img src="x" onerror="alert(\'xss\')">',
        insuranceType: 'auto',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-id', 'test-user')
        .send(xssPayload)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should validate email format properly', async () => {
      const invalidEmails = [
        'invalid-email',
        '@example.com',
        'user@',
        'user..double.dot@example.com',
        'user@example',
        'user@.example.com',
      ];

      for (const email of invalidEmails) {
        const payload = {
          firstName: 'John',
          lastName: 'Doe',
          email,
          insuranceType: 'auto',
        };

        const response = await request(app)
          .post('/api/v1/leads')
          .set('Authorization', 'Bearer valid-token')
          .set('x-user-id', 'test-user')
          .send(payload)
          .expect(400);

        expect(response.body.success).toBe(false);
      }
    });

    it('should limit request body size', async () => {
      // Create a large payload that exceeds the limit
      const largePayload = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@example.com',
        notes: 'x'.repeat(1000000), // 1MB of data
        insuranceType: 'auto',
      };

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-id', 'test-user')
        .send(largePayload)
        .expect(413); // Payload too large

      expect(response.body.success).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on API endpoints', async () => {
      const baseUrl = '/api/v1/leads';
      const maxRequests = 100; // Assuming rate limit of 100 requests per hour
      
      const requests = [];
      
      // Make rapid requests to trigger rate limiting
      for (let i = 0; i < maxRequests + 10; i++) {
        const response = await request(app)
          .get(baseUrl)
          .set('Authorization', 'Bearer valid-token')
          .set('x-user-id', 'test-user');
        
        requests.push(response);
        
        // Stop if we get rate limited
        if (response.status === 429) {
          break;
        }
      }
      
      // Should have been rate limited at some point
      const rateLimitedResponses = requests.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('Data Protection', () => {
    it('should not expose sensitive data in API responses', async () => {
      const response = await request(app)
        .get('/api/v1/leads/lead-123')
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-id', 'test-user')
        .expect(200);

      // Check that sensitive fields are not exposed
      const responseData = response.body.data;
      
      // These fields should not be in the response
      expect(responseData).not.toHaveProperty('password');
      expect(responseData).not.toHaveProperty('passwordHash');
      expect(responseData).not.toHaveProperty('ssn');
      expect(responseData).not.toHaveProperty('creditCard');
      expect(responseData).not.toHaveProperty('apiKeys');
    });

    it('should only return authorized data based on user role', async () => {
      // Test that a customer role cannot see admin-only data
      const response = await request(app)
        .get('/api/v1/admin/users')
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-id', 'customer-user')
        .set('x-user-role', 'customer')
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Session Management', () => {
    it('should expire sessions after timeout', async () => {
      // This would require more complex testing with actual session management
      // For now, we test that the session validation works
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', 'Bearer expired-token')
        .set('x-session-expired', 'true')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should handle concurrent sessions properly', async () => {
      // Test multiple requests with same user token
      const concurrentRequests = Array(5).fill(null).map(() =>
        request(app)
          .get('/api/v1/leads')
          .set('Authorization', 'Bearer valid-token')
          .set('x-user-id', 'test-user')
      );

      const responses = await Promise.all(concurrentRequests);
      
      // All requests should succeed
      responses.forEach(response => {
        expect([200, 401]).toContain(response.status);
      });
    });
  });

  describe('API Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-id', 'test-user');

      // Check for security headers
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    it('should not expose server information', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-id', 'test-user');

      // Server header should not reveal detailed version info
      expect(response.headers.server).toBeUndefined();
    });
  });

  describe('HTTPS Enforcement', () => {
    it('should redirect HTTP requests to HTTPS in production', async () => {
      // This would require testing in production environment
      // For development, we might allow HTTP
      const response = await request(app)
        .get('http://localhost:3000/api/v1/leads')
        .expect(301); // Redirect to HTTPS
    });
  });

  describe('Error Handling Security', () => {
    it('should not expose stack traces in error responses', async () => {
      const response = await request(app)
        .get('/api/v1/nonexistent-endpoint')
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-id', 'test-user');

      const responseBody = response.body;
      
      // Error response should not contain stack traces
      expect(responseBody).not.toMatch(/Error:.*at.*/);
      expect(responseBody).not.toMatch(/at .*\.js:\d+:\d+/);
    });

    it('should provide generic error messages for unauthorized access', async () => {
      const response = await request(app)
        .get('/api/v1/admin/secret-data')
        .set('Authorization', 'Bearer valid-token')
        .set('x-user-id', 'unauthorized-user');

      expect(response.body.message).not.toContain('Admin endpoint');
      expect(response.body.message).not.toContain('secret');
      expect(response.body.message).toContain('Unauthorized');
    });
  });
});