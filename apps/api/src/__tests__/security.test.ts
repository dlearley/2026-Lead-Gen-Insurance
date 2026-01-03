import request from 'supertest';
import { app } from '../app.js';
import { authService } from '@insurance-lead-gen/core';

describe('Security Hardening', () => {
  describe('Authentication', () => {
    it('should return 401 for unauthorized access to protected routes', async () => {
      const response = await request(app).get('/api/v1/leads');
      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Unauthorized');
    });

    it('should allow access with a valid token', async () => {
      const tokens = await authService.generateTokens({
        id: 'test-user-id',
        email: 'test@example.com',
        roles: ['admin'],
        permissions: ['admin:all'],
      });

      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${tokens.accessToken}`);

      expect(response.status).not.toBe(401);
    });
  });

  describe('CSRF Protection', () => {
    it('should return 403 for POST requests without CSRF token', async () => {
      const tokens = await authService.generateTokens({
        id: 'test-user-id',
        email: 'test@example.com',
        roles: ['admin'],
        permissions: ['admin:all'],
      });

      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .send({ source: 'test' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Invalid CSRF token');
    });
  });

  describe('Rate Limiting', () => {
    it('should include rate limit headers', async () => {
      const response = await request(app).get('/health');
      // Health check might be bypassed for rate limiting, let's try another route
      const response2 = await request(app).get('/api/auth/login');
      // Wait, /api/auth/login is not yet rate limited specifically in my implementation but covered by global /api
      
      expect(response2.headers).toHaveProperty('x-ratelimit-limit');
      expect(response2.headers).toHaveProperty('x-ratelimit-remaining');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app).get('/health');
      
      expect(response.headers).toHaveProperty('x-content-type-options', 'nosniff');
      expect(response.headers).toHaveProperty('x-frame-options', 'DENY');
      expect(response.headers).toHaveProperty('strict-transport-security');
      expect(response.headers).not.toHaveProperty('x-powered-by');
    });
  });
});
