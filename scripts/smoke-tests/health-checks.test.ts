/**
 * Health Check Smoke Tests
 *
 * Verifies that all services and infrastructure components are healthy
 */

import axios from 'axios';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const TIMEOUT = parseInt(process.env.TEST_TIMEOUT || '30000', 10);

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: TIMEOUT,
});

const backendClient = axios.create({
  baseURL: BACKEND_URL,
  timeout: TIMEOUT,
});

describe('Health Check Smoke Tests', () => {
  describe('API Service Health', () => {
    it('should respond to health check endpoint', async () => {
      const response = await apiClient.get('/health');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'healthy');
    });

    it('should expose metrics endpoint', async () => {
      const response = await apiClient.get('/metrics');
      expect(response.status).toBe(200);
      expect(response.data).toContain('http_requests_total');
    });
  });

  describe('Backend Service Health', () => {
    it('should respond to health check endpoint', async () => {
      const response = await backendClient.get('/health');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status');
    });

    it('should expose API documentation', async () => {
      const response = await backendClient.get('/docs');
      expect(response.status).toBe(200);
      expect(response.data).toContain('openapi');
    });
  });

  describe('Database Connectivity', () => {
    it('should verify PostgreSQL connection through API', async () => {
      const response = await apiClient.get('/health/database');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('postgres', 'connected');
    });

    it('should verify database can execute queries', async () => {
      const response = await apiClient.get('/health/database/query');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('queryTime');
    });
  });

  describe('Cache Connectivity', () => {
    it('should verify Redis connection through API', async () => {
      const response = await apiClient.get('/health/cache');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('redis', 'connected');
    });

    it('should verify cache can store and retrieve data', async () => {
      const testKey = `smoke-test-${Date.now()}`;
      const testValue = 'smoke-test-value';

      // Set value
      await apiClient.post('/cache/set', { key: testKey, value: testValue });

      // Get value
      const response = await apiClient.get(`/cache/get/${testKey}`);
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('value', testValue);

      // Clean up
      await apiClient.delete(`/cache/${testKey}`);
    });
  });

  describe('Message Broker Connectivity', () => {
    it('should verify NATS connection through API', async () => {
      const response = await apiClient.get('/health/message-broker');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('nats', 'connected');
    });

    it('should verify message queue can publish and consume', async () => {
      const testSubject = 'smoke-test';
      const testMessage = { test: 'data', timestamp: Date.now() };

      // Publish message
      const publishResponse = await apiClient.post('/queue/publish', {
        subject: testSubject,
        message: testMessage,
      });
      expect(publishResponse.status).toBe(201);
      expect(publishResponse.data).toHaveProperty('streamSeq');
    });
  });

  describe('Vector Database Connectivity', () => {
    it('should verify Qdrant connection through API', async () => {
      const response = await apiClient.get('/health/vector-db');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('qdrant', 'connected');
    });
  });

  describe('Graph Database Connectivity', () => {
    it('should verify Neo4j connection through API', async () => {
      const response = await apiClient.get('/health/graph-db');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('neo4j', 'connected');
    });
  });

  describe('Third-Party Services', () => {
    it('should verify OpenAI API connectivity', async () => {
      const response = await apiClient.get('/health/openai');
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('status', 'operational');
    });
  });

  describe('Monitoring Stack', () => {
    it('should verify Prometheus is collecting metrics', async () => {
      const response = await axios.get('http://localhost:9090/-/healthy', {
        timeout: 5000,
      });
      expect(response.status).toBe(200);
    });

    it('should verify Grafana is accessible', async () => {
      const response = await axios.get('http://localhost:3003/api/health', {
        timeout: 5000,
      });
      expect(response.status).toBe(200);
    });

    it('should verify Loki is accessible', async () => {
      const response = await axios.get('http://localhost:3100/ready', {
        timeout: 5000,
      });
      expect(response.status).toBe(200);
    });
  });
});
