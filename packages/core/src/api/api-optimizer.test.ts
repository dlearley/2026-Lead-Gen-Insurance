import { APIResponseOptimizer, APIOptimizationUtils } from './api-optimizer.js';
import { AdvancedCacheManager } from '../cache/advanced-cache-manager.js';
import { MetricsCollector } from '../monitoring/metrics.js';

describe('APIResponseOptimizer', () => {
  let apiOptimizer: APIResponseOptimizer;
  let cacheManagerMock: any;
  let metricsMock: any;

  beforeEach(() => {
    cacheManagerMock = {
      get: jest.fn(),
      set: jest.fn(),
      getStats: jest.fn().mockReturnValue({
        hitCount: 80,
        missCount: 20,
        hitRate: 80
      })
    };

    metricsMock = {
      increment: jest.fn(),
      gauge: jest.fn(),
      getGaugeValue: jest.fn()
    };

    apiOptimizer = new APIResponseOptimizer({
      cacheManager: cacheManagerMock as any,
      metrics: metricsMock as any
    });
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(apiOptimizer).toBeDefined();
      expect(apiOptimizer['config'].compression?.enabled).toBe(true);
      expect(apiOptimizer['config'].caching?.enabled).toBe(true);
    });

    it('should accept custom configuration', () => {
      const customOptimizer = new APIResponseOptimizer({
        config: {
          compression: { enabled: false },
          caching: { enabled: false }
        }
      });

      expect(customOptimizer['config'].compression?.enabled).toBe(false);
      expect(customOptimizer['config'].caching?.enabled).toBe(false);
    });
  });

  describe('API Response Optimization', () => {
    it('should optimize API response', async () => {
      const testData = { id: '123', name: 'Test User', email: 'test@example.com', extra: 'data' };
      cacheManagerMock.get.mockResolvedValue(null);

      const result = await apiOptimizer.optimizeResponse(
        '/api/v1/users',
        'GET',
        testData,
        {
          fields: ['id', 'name', 'email']
        }
      );

      expect(result.originalSize).toBeGreaterThan(0);
      expect(result.optimizedSize).toBeGreaterThan(0);
      expect(result.fieldsFiltered).toBeGreaterThan(0);
    });

    it('should handle cache hit', async () => {
      const testData = { id: '123', name: 'Test User' };
      cacheManagerMock.get.mockResolvedValue(testData);

      const result = await apiOptimizer.optimizeResponse(
        '/api/v1/users',
        'GET',
        testData
      );

      expect(result.cached).toBe(true);
      expect(cacheManagerMock.get).toHaveBeenCalled();
    });

    it('should handle cache miss', async () => {
      const testData = { id: '123', name: 'Test User' };
      cacheManagerMock.get.mockResolvedValue(null);

      const result = await apiOptimizer.optimizeResponse(
        '/api/v1/users',
        'GET',
        testData
      );

      expect(result.cached).toBe(false);
      expect(cacheManagerMock.set).toHaveBeenCalled();
    });
  });

  describe('Field Selection', () => {
    it('should filter fields based on requested fields', () => {
      const testData = { id: '123', name: 'Test', email: 'test@example.com', extra: 'data' };
      const filtered = apiOptimizer['optimizeFieldSelection'](testData, ['id', 'name']);

      expect(filtered).toEqual({ id: '123', name: 'Test' });
    });

    it('should include default fields', () => {
      const testData = { id: '123', name: 'Test', extra: 'data' };
      const filtered = apiOptimizer['optimizeFieldSelection'](testData, ['name']);

      expect(filtered).toEqual({ id: '123', name: 'Test' });
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate cache key from request parameters', () => {
      const cacheKey = apiOptimizer['generateCacheKey'](
        '/api/v1/users',
        'GET',
        { 'accept': 'application/json' },
        { page: '1', size: '10' },
        null
      );

      expect(cacheKey).toContain('/api/v1/users');
      expect(cacheKey).toContain('GET');
      expect(cacheKey).toContain('page=1');
      expect(cacheKey).toContain('size=10');
    });

    it('should include body hash for POST requests', () => {
      const cacheKey = apiOptimizer['generateCacheKey'](
        '/api/v1/users',
        'POST',
        { 'content-type': 'application/json' },
        null,
        { name: 'Test' }
      );

      expect(cacheKey).toContain('body:');
    });
  });

  describe('Response Statistics', () => {
    it('should update response statistics', () => {
      apiOptimizer['updateResponseStats'](
        '/api/v1/users',
        'GET',
        150,
        1024,
        true
      );

      const stats = apiOptimizer.getResponseStats();
      expect(stats.length).toBeGreaterThan(0);
      expect(stats[0].endpoint).toBe('/api/v1/users');
    });

    it('should calculate performance metrics', () => {
      apiOptimizer['updateResponseStats']('/api/v1/users', 'GET', 100, 512, true);
      apiOptimizer['updateResponseStats']('/api/v1/users', 'GET', 150, 768, false);

      const stats = apiOptimizer.getResponseStats();
      expect(stats[0].avgResponseTime).toBe(125);
      expect(stats[0].cacheHitRate).toBe(50);
    });
  });

  describe('Performance Targets', () => {
    it('should set and check performance targets', () => {
      apiOptimizer.setPerformanceTargets('/api/v1/users', {
        p50: 200,
        p95: 500,
        maxResponseTime: 1000
      });

      const targets = apiOptimizer.getPerformanceTargets('/api/v1/users');
      expect(targets).toBeDefined();
      expect(targets?.p50).toBe(200);
    });

    it('should check if targets are met', () => {
      apiOptimizer['updateResponseStats']('/api/v1/users', 'GET', 100, 512, true);
      apiOptimizer['updateResponseStats']('/api/v1/users', 'GET', 150, 768, false);

      apiOptimizer.setPerformanceTargets('/api/v1/users', {
        p50: 200,
        p95: 500
      });

      const result = apiOptimizer.checkPerformanceTargets('/api/v1/users');
      expect(result.meetsTargets).toBe(true);
    });

    it('should detect target violations', () => {
      apiOptimizer['updateResponseStats']('/api/v1/users', 'GET', 600, 512, true);

      apiOptimizer.setPerformanceTargets('/api/v1/users', {
        p50: 200,
        p95: 500
      });

      const result = apiOptimizer.checkPerformanceTargets('/api/v1/users');
      expect(result.meetsTargets).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Cache Performance', () => {
    it('should get cache performance statistics', () => {
      const performance = apiOptimizer.getCachePerformance();
      
      expect(performance.hitRate).toBe(80);
      expect(performance.totalRequests).toBeGreaterThan(0);
    });

    it('should invalidate cache', async () => {
      cacheManagerMock.deletePattern = jest.fn().mockResolvedValue(undefined);
      
      const result = await apiOptimizer.invalidateCache('/api/v1/users*');
      
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('Optimization Report', () => {
    it('should generate optimization report', () => {
      apiOptimizer['updateResponseStats']('/api/v1/users', 'GET', 100, 512, true);
      
      const report = apiOptimizer.generateOptimizationReport();
      
      expect(report.totalEndpoints).toBeGreaterThan(0);
      expect(report.totalRequests).toBeGreaterThan(0);
      expect(report.avgResponseTime).toBeGreaterThan(0);
    });
  });

  describe('API Optimization Utilities', () => {
    it('should generate cache control headers', () => {
      const headers = APIOptimizationUtils.generateCacheControlHeaders({
        maxAge: 300,
        sMaxAge: 600,
        staleWhileRevalidate: 300
      });

      expect(headers).toContain('max-age=300');
      expect(headers).toContain('s-maxage=600');
      expect(headers).toContain('stale-while-revalidate=300');
    });

    it('should generate ETag', () => {
      const etag = APIOptimizationUtils.generateETag({ id: '123', name: 'Test' });
      
      expect(etag).toMatch(/^"\d+"$/);
    });

    it('should parse fields parameter', () => {
      const fields = APIOptimizationUtils.parseFieldsParameter('id,name,email');
      
      expect(fields).toEqual(['id', 'name', 'email']);
    });

    it('should generate pagination headers', () => {
      const headers = APIOptimizationUtils.generatePaginationHeaders({
        page: 1,
        pageSize: 25,
        totalItems: 1000,
        totalPages: 40
      });

      expect(headers['X-Pagination-Page']).toBe('1');
      expect(headers['X-Pagination-Total-Items']).toBe('1000');
    });

    it('should generate rate limit headers', () => {
      const headers = APIOptimizationUtils.generateRateLimitHeaders({
        limit: 100,
        remaining: 85,
        reset: 30
      });

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('85');
    });

    it('should generate streaming headers', () => {
      const headers = APIOptimizationUtils.generateStreamingHeaders({
        contentType: 'application/json',
        fileName: 'export.json',
        contentLength: 1024
      });

      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Content-Disposition']).toContain('export.json');
    });

    it('should generate CORS headers', () => {
      const headers = APIOptimizationUtils.generateCORSHeaders({
        allowedOrigins: ['https://example.com'],
        allowedMethods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization']
      });

      expect(headers['Access-Control-Allow-Origin']).toBe('https://example.com');
      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST');
    });

    it('should generate security headers', () => {
      const headers = APIOptimizationUtils.generateSecurityHeaders();

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['Strict-Transport-Security']).toContain('max-age=');
    });

    it('should generate performance headers', () => {
      const headers = APIOptimizationUtils.generatePerformanceHeaders({
        serverTiming: [{ name: 'db', duration: 100, description: 'Database' }],
        responseTime: 150
      });

      expect(headers['Server-Timing']).toContain('db');
      expect(headers['X-Response-Time']).toBe('150.00ms');
    });
  });

  describe('API Optimization Decorators', () => {
    it('should create optimize API response decorator', () => {
      const decorator = apiOptimizer.OptimizeAPIResponse();
      
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should create cache API response decorator', () => {
      const decorator = apiOptimizer.CacheAPIResponse({ ttl: 300 });
      
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should create compress API response decorator', () => {
      const decorator = apiOptimizer.CompressAPIResponse();
      
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });
  });
});