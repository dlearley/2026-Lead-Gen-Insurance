import { AdvancedCacheManager, HierarchicalCacheKeyStrategy } from './advanced-cache-manager.js';
import { MetricsCollector } from '../monitoring/metrics.js';

describe('AdvancedCacheManager', () => {
  let cacheManager: AdvancedCacheManager;
  let redisMock: any;
  let metricsMock: any;

  beforeEach(() => {
    redisMock = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      mget: jest.fn(),
      pipeline: jest.fn(),
      scan: jest.fn(),
      ttl: jest.fn(),
      expire: jest.fn(),
      exists: jest.fn(),
      incrby: jest.fn(),
      decrby: jest.fn(),
      dbsize: jest.fn(),
      info: jest.fn(),
      ping: jest.fn(),
      quit: jest.fn(),
      on: jest.fn(),
      status: 'ready'
    };

    metricsMock = {
      increment: jest.fn(),
      gauge: jest.fn(),
      getGaugeValue: jest.fn()
    };

    cacheManager = new AdvancedCacheManager(redisMock, {
      metrics: metricsMock as any
    });
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(cacheManager).toBeDefined();
      expect(cacheManager['localCacheEnabled']).toBe(true);
      expect(cacheManager['maxMemoryLimit']).toBe(100);
      expect(cacheManager['evictionPolicy']).toBe('LRU');
    });

    it('should accept custom configuration', () => {
      const customCacheManager = new AdvancedCacheManager(redisMock, {
        maxMemoryLimit: 200,
        evictionPolicy: 'FIFO',
        localCacheEnabled: false
      });

      expect(customCacheManager['maxMemoryLimit']).toBe(200);
      expect(customCacheManager['evictionPolicy']).toBe('FIFO');
      expect(customCacheManager['localCacheEnabled']).toBe(false);
    });
  });

  describe('Cache Key Strategy', () => {
    it('should generate hierarchical cache keys', () => {
      const keyStrategy = new HierarchicalCacheKeyStrategy();
      const key = keyStrategy.generateKey('user', '123', 'v1', 'tenant1');
      
      expect(key).toBe('tenant1:user:123:v1');
    });

    it('should parse hierarchical cache keys', () => {
      const keyStrategy = new HierarchicalCacheKeyStrategy();
      const parsed = keyStrategy.parseKey('tenant1:user:123:v1');
      
      expect(parsed).toEqual({
        tenantId: 'tenant1',
        entity: 'user',
        id: '123',
        version: 'v1'
      });
    });
  });

  describe('Cache Operations', () => {
    it('should set and get cache with hierarchical keys', async () => {
      const testData = { id: '123', name: 'Test User' };
      redisMock.setex.mockResolvedValue('OK');
      redisMock.get.mockResolvedValue(JSON.stringify({
        value: testData,
        expiresAt: Date.now() + 300000,
        createdAt: Date.now(),
        accessedAt: Date.now(),
        version: 'v1',
        tenantId: 'default'
      }));

      await cacheManager.set('user', '123', testData);
      const result = await cacheManager.get('user', '123');

      expect(result).toEqual(testData);
      expect(redisMock.setex).toHaveBeenCalled();
      expect(redisMock.get).toHaveBeenCalled();
    });

    it('should handle cache miss', async () => {
      redisMock.get.mockResolvedValue(null);

      const result = await cacheManager.get('user', 'nonexistent');

      expect(result).toBeNull();
      expect(redisMock.get).toHaveBeenCalled();
    });

    it('should handle cache errors gracefully', async () => {
      redisMock.get.mockRejectedValue(new Error('Redis error'));

      const result = await cacheManager.get('user', '123');

      expect(result).toBeNull();
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache by pattern', async () => {
      redisMock.scan.mockResolvedValue(['0', ['tenant1:user:123:v1', 'tenant1:user:456:v1']]);
      redisMock.del.mockResolvedValue(2);

      await cacheManager.invalidateByPattern('tenant1:user:*');

      expect(redisMock.scan).toHaveBeenCalledWith('0', 'MATCH', 'tenant1:user:*', 'COUNT', '100');
      expect(redisMock.del).toHaveBeenCalledWith('tenant1:user:123:v1', 'tenant1:user:456:v1');
    });

    it('should invalidate cache on change', async () => {
      redisMock.scan.mockResolvedValue(['0', ['tenant1:user:123:v1']]);
      redisMock.del.mockResolvedValue(1);

      await cacheManager.invalidateOnChange('user', '123', 'tenant1');

      expect(redisMock.scan).toHaveBeenCalled();
      expect(redisMock.del).toHaveBeenCalled();
    });

    it('should invalidate cache by tag', async () => {
      redisMock.scan.mockResolvedValue(['0', ['tenant1:user:123:v1']]);
      redisMock.get.mockResolvedValue(JSON.stringify({
        value: { id: '123' },
        expiresAt: Date.now() + 300000,
        createdAt: Date.now(),
        accessedAt: Date.now(),
        tags: ['premium'],
        version: 'v1',
        tenantId: 'tenant1'
      }));
      redisMock.del.mockResolvedValue(1);

      await cacheManager.invalidateByTag('premium');

      expect(redisMock.scan).toHaveBeenCalled();
      expect(redisMock.del).toHaveBeenCalled();
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with multiple entries', async () => {
      const pipelineMock = {
        setex: jest.fn(),
        exec: jest.fn().mockResolvedValue([])
      };
      redisMock.pipeline.mockReturnValue(pipelineMock);

      await cacheManager.warmCache([
        { entity: 'user', id: '123', value: { id: '123' } },
        { entity: 'user', id: '456', value: { id: '456' } }
      ]);

      expect(redisMock.pipeline).toHaveBeenCalled();
      expect(pipelineMock.setex).toHaveBeenCalledTimes(2);
      expect(pipelineMock.exec).toHaveBeenCalled();
    });

    it('should handle cache warming errors', async () => {
      redisMock.pipeline.mockImplementation(() => {
        throw new Error('Pipeline error');
      });

      await cacheManager.warmCache([
        { entity: 'user', id: '123', value: { id: '123' } }
      ]);

      // Should not throw, just log error
    });
  });

  describe('Cache Statistics', () => {
    it('should calculate hit rate correctly', () => {
      cacheManager['hitCount'] = 80;
      cacheManager['missCount'] = 20;

      const stats = cacheManager.getStats();
      expect(stats.hitRate).toBe(80);
    });

    it('should check hit rate target', () => {
      cacheManager['hitCount'] = 85;
      cacheManager['missCount'] = 15;

      const meetsTarget = cacheManager.isHitRateTargetMet(80);
      expect(meetsTarget).toBe(true);
    });

    it('should detect high miss rate', () => {
      cacheManager['hitCount'] = 60;
      cacheManager['missCount'] = 40;

      const hasAlert = cacheManager.checkMissRateAlert(20);
      expect(hasAlert).toBe(true);
    });
  });

  describe('Cache Health Check', () => {
    it('should perform health check', async () => {
      redisMock.ping.mockResolvedValue('PONG');
      redisMock.dbsize.mockResolvedValue(100);

      const health = await cacheManager.healthCheck();

      expect(health.healthy).toBe(true);
      expect(health.redisConnected).toBe(true);
    });

    it('should detect unhealthy state', async () => {
      redisMock.ping.mockRejectedValue(new Error('Redis down'));

      const health = await cacheManager.healthCheck();

      expect(health.healthy).toBe(false);
      expect(health.redisConnected).toBe(false);
    });
  });

  describe('Cache Configuration', () => {
    it('should get default TTL configuration', () => {
      const ttlConfig = cacheManager.getTTLConfig();
      
      expect(ttlConfig.user).toBe(3600);
      expect(ttlConfig.lead).toBe(1800);
      expect(ttlConfig.policy).toBe(7200);
    });

    it('should update TTL configuration', () => {
      cacheManager.updateTTLConfig({ user: 7200, lead: 3600 });
      const ttlConfig = cacheManager.getTTLConfig();
      
      expect(ttlConfig.user).toBe(7200);
      expect(ttlConfig.lead).toBe(3600);
    });
  });

  describe('Cache Decorators', () => {
    it('should create cacheable decorator', () => {
      const decorator = AdvancedCacheManager.AdvancedCacheable({
        entity: 'user',
        ttl: 3600
      });
      
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });

    it('should create cache invalidate decorator', () => {
      const decorator = AdvancedCacheManager.AdvancedCacheInvalidate({
        entity: 'user',
        pattern: 'user:*'
      });
      
      expect(decorator).toBeDefined();
      expect(typeof decorator).toBe('function');
    });
  });
});