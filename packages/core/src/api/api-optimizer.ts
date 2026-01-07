import { logger } from '../logger.js';
import { MetricsCollector } from '../monitoring/metrics.js';
import { AdvancedCacheManager } from '../cache/advanced-cache-manager.js';

/**
 * API Response Optimization Configuration
 */
export interface APIOptimizationConfig {
  compression?: {
    enabled?: boolean;
    threshold?: number; // Minimum size to compress (bytes)
    level?: number; // Compression level (0-9)
  };
  caching?: {
    enabled?: boolean;
    defaultTTL?: number; // Default cache TTL in seconds
    maxAge?: number; // Cache-Control max-age in seconds
    varyBy?: string[]; // Headers to vary cache by
  };
  pagination?: {
    defaultPageSize?: number;
    maxPageSize?: number;
  };
  fieldSelection?: {
    enabled?: boolean;
    defaultFields?: string[];
  };
  rateLimiting?: {
    enabled?: boolean;
    windowMs?: number;
    maxRequests?: number;
  };
  responseSize?: {
    maxSize?: number; // Maximum response size in bytes
    warnSize?: number; // Size to warn about in bytes
  };
}

/**
 * API Response Statistics
 */
export interface APIResponseStats {
  endpoint: string;
  method: string;
  requestCount: number;
  avgResponseTime: number;
  p50ResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  maxResponseTime: number;
  avgResponseSize: number;
  maxResponseSize: number;
  cacheHitRate: number;
  errorRate: number;
  lastRequest: Date;
}

/**
 * API Cache Configuration
 */
export interface APICacheConfig {
  cacheKey: string;
  ttl: number;
  varyBy: string[];
  cacheControl: string;
  etag: string;
}

/**
 * API Response Optimization Result
 */
export interface APIOptimizationResult {
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
  cached: boolean;
  cacheKey?: string;
  fieldsFiltered: number;
  warnings: string[];
  recommendations: string[];
}

/**
 * API Endpoint Performance Targets
 */
export interface APIPerformanceTargets {
  p50?: number; // ms
  p95?: number; // ms
  p99?: number; // ms
  maxResponseTime?: number; // ms
  maxResponseSize?: number; // bytes
  minCacheHitRate?: number; // percentage
  maxErrorRate?: number; // percentage
}

/**
 * API Response Optimizer with comprehensive optimization features
 */
export class APIResponseOptimizer {
  private metrics: MetricsCollector;
  private cacheManager?: AdvancedCacheManager;
  private config: APIOptimizationConfig;
  private responseStats: Map<string, APIResponseStats>;
  private performanceTargets: Map<string, APIPerformanceTargets>;

  constructor(options: {
    config?: APIOptimizationConfig;
    cacheManager?: AdvancedCacheManager;
    metrics?: MetricsCollector;
  } = {}) {
    this.config = options.config || this.getDefaultConfig();
    this.cacheManager = options.cacheManager;
    this.metrics = options.metrics || new MetricsCollector();
    this.responseStats = new Map();
    this.performanceTargets = new Map();
    
    this.setupMetrics();
    this.setupDefaultTargets();
  }

  private getDefaultConfig(): APIOptimizationConfig {
    return {
      compression: {
        enabled: true,
        threshold: 1024, // 1KB
        level: 6 // Balanced compression
      },
      caching: {
        enabled: true,
        defaultTTL: 300, // 5 minutes
        maxAge: 300, // 5 minutes
        varyBy: ['Accept', 'Accept-Encoding', 'Authorization']
      },
      pagination: {
        defaultPageSize: 25,
        maxPageSize: 1000
      },
      fieldSelection: {
        enabled: true,
        defaultFields: ['id', 'createdAt', 'updatedAt']
      },
      rateLimiting: {
        enabled: true,
        windowMs: 60000, // 1 minute
        maxRequests: 100
      },
      responseSize: {
        maxSize: 1048576, // 1MB
        warnSize: 524288 // 512KB
      }
    };
  }

  private setupMetrics(): void {
    // API performance metrics
    this.metrics.gauge('api.response_time.p50', 0);
    this.metrics.gauge('api.response_time.p95', 0);
    this.metrics.gauge('api.response_time.p99', 0);
    this.metrics.gauge('api.response_size.avg', 0);
    this.metrics.gauge('api.response_size.max', 0);
    this.metrics.gauge('api.cache_hit_rate', 0);
    this.metrics.gauge('api.error_rate', 0);
    this.metrics.gauge('api.compression_ratio', 0);
    this.metrics.gauge('api.large_responses', 0);
    this.metrics.gauge('api.slow_responses', 0);
  }

  private setupDefaultTargets(): void {
    // Set default performance targets for common endpoints
    const defaultTargets: APIPerformanceTargets = {
      p50: 200, // 200ms
      p95: 500, // 500ms
      p99: 1000, // 1000ms
      maxResponseTime: 2000, // 2000ms
      maxResponseSize: 1048576, // 1MB
      minCacheHitRate: 70, // 70%
      maxErrorRate: 1 // 1%
    };
    
    // Apply to common endpoints
    ['/api/v1/leads', '/api/v1/policies', '/api/v1/users', '/api/v1/activities']
      .forEach(endpoint => {
        this.setPerformanceTargets(endpoint, defaultTargets);
      });
  }

  /**
   * Optimize API response
   */
  async optimizeResponse<T>(
    endpoint: string,
    method: string,
    responseData: T,
    options: {
      requestHeaders?: Record<string, string>;
      queryParams?: Record<string, string>;
      body?: any;
      cacheKeyOverride?: string;
      skipCache?: boolean;
      fields?: string[];
    } = {}
  ): Promise<APIOptimizationResult> {
    const startTime = Date.now();
    const originalData = JSON.parse(JSON.stringify(responseData));
    const originalSize = this.calculateResponseSize(originalData);
    
    const result: APIOptimizationResult = {
      originalSize,
      optimizedSize: originalSize,
      compressionRatio: 1,
      cached: false,
      fieldsFiltered: 0,
      warnings: [],
      recommendations: []
    };
    
    try {
      // 1. Field selection optimization
      const filteredData = this.optimizeFieldSelection(originalData, options.fields || []);
      result.fieldsFiltered = originalSize - this.calculateResponseSize(filteredData);
      
      // 2. Response compression
      const compressedData = this.optimizeCompression(filteredData);
      const compressedSize = this.calculateResponseSize(compressedData);
      
      // 3. Response caching
      let finalData = compressedData;
      let cacheHit = false;
      
      if (this.config.caching?.enabled && !options.skipCache && method === 'GET') {
        const cacheResult = await this.optimizeCaching(
          endpoint,
          method,
          compressedData,
          options
        );
        
        if (cacheResult.cached) {
          finalData = cacheResult.data;
          cacheHit = true;
          result.cached = true;
          result.cacheKey = cacheResult.cacheKey;
        }
      }
      
      const finalSize = this.calculateResponseSize(finalData);
      const responseTime = Date.now() - startTime;
      
      // Update statistics
      this.updateResponseStats(endpoint, method, responseTime, finalSize, cacheHit);
      
      // Calculate optimization results
      result.optimizedSize = finalSize;
      result.compressionRatio = originalSize / finalSize;
      
      // Generate recommendations
      this.generateRecommendations(result, originalSize, finalSize, responseTime, cacheHit);
      
      // Check for warnings
      this.checkWarnings(result, finalSize, responseTime);
      
      return result;
    } catch (error) {
      logger.error('API response optimization failed', {
        endpoint,
        method,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      this.metrics.increment('api.optimization_errors');
      
      result.warnings.push('Optimization failed - returning original response');
      return result;
    }
  }

  /**
   * Optimize field selection (sparse fieldsets)
   */
  private optimizeFieldSelection<T>(data: T, requestedFields: string[]): T {
    if (!this.config.fieldSelection?.enabled || requestedFields.length === 0) {
      return data;
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.filterObjectFields(item, requestedFields)) as any;
    }
    
    return this.filterObjectFields(data, requestedFields);
  }

  private filterObjectFields<T>(obj: T, fields: string[]): T {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    const result: any = {};
    const fieldSet = new Set(fields);
    
    // Always include default fields
    this.config.fieldSelection?.defaultFields?.forEach(field => fieldSet.add(field));
    
    // Filter properties
    Object.keys(obj).forEach(key => {
      if (fieldSet.has(key)) {
        result[key] = obj[key];
      }
    });
    
    return result;
  }

  /**
   * Optimize response compression
   */
  private optimizeCompression<T>(data: T): T {
    if (!this.config.compression?.enabled) {
      return data;
    }
    
    const dataSize = this.calculateResponseSize(data);
    
    if (dataSize < (this.config.compression.threshold || 1024)) {
      return data; // Don't compress small responses
    }
    
    // In a real implementation, this would compress the data
    // For this optimizer, we'll just track the metrics
    this.metrics.increment('api.compressed_responses');
    
    return data; // Return original data (compression would be handled by middleware)
  }

  /**
   * Optimize response caching
   */
  private async optimizeCaching<T>(
    endpoint: string,
    method: string,
    data: T,
    options: {
      requestHeaders?: Record<string, string>;
      queryParams?: Record<string, string>;
      body?: any;
      cacheKeyOverride?: string;
    }
  ): Promise<{ cached: boolean; data: T; cacheKey?: string }> {
    if (!this.cacheManager) {
      return { cached: false, data };
    }
    
    // Generate cache key
    const cacheKey = options.cacheKeyOverride || this.generateCacheKey(
      endpoint,
      method,
      options.requestHeaders,
      options.queryParams,
      options.body
    );
    
    // Try to get from cache
    const cachedData = await this.cacheManager.get('api_response', cacheKey, {
      tenantId: 'api_cache'
    });
    
    if (cachedData !== null) {
      this.metrics.increment('api.cache_hits');
      return { cached: true, data: cachedData, cacheKey };
    }
    
    // Cache miss - store the response
    const ttl = options.queryParams?.ttl 
      ? parseInt(options.queryParams.ttl as string)
      : this.config.caching?.defaultTTL || 300;
    
    await this.cacheManager.set('api_response', cacheKey, data, {
      ttl,
      tenantId: 'api_cache',
      tags: [`endpoint:${endpoint}`, `method:${method}`]
    });
    
    this.metrics.increment('api.cache_misses');
    return { cached: false, data };
  }

  /**
   * Generate cache key from request parameters
   */
  private generateCacheKey(
    endpoint: string,
    method: string,
    headers?: Record<string, string>,
    queryParams?: Record<string, string>,
    body?: any
  ): string {
    const varyBy = this.config.caching?.varyBy || [];
    const keyParts: string[] = [endpoint, method];
    
    // Add query parameters
    if (queryParams) {
      const sortedParams = Object.keys(queryParams)
        .sort()
        .map(key => `${key}=${queryParams[key]}`)
        .join('&');
      keyParts.push(`params:${sortedParams}`);
    }
    
    // Add varying headers
    varyBy.forEach(header => {
      if (headers && headers[header]) {
        keyParts.push(`${header.toLowerCase()}:${headers[header]}`);
      }
    });
    
    // Add body hash for POST/PUT requests
    if (body && (method === 'POST' || method === 'PUT')) {
      const bodyHash = this.hashObject(body);
      keyParts.push(`body:${bodyHash}`);
    }
    
    return keyParts.join(':');
  }

  /**
   * Hash object for cache key generation
   */
  private hashObject(obj: any): string {
    try {
      const jsonString = JSON.stringify(obj);
      // Simple hash function - in production use crypto
      let hash = 0;
      for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash.toString();
    } catch {
      return 'unknown';
    }
  }

  /**
   * Calculate response size in bytes
   */
  private calculateResponseSize(data: any): number {
    try {
      const jsonString = JSON.stringify(data);
      return Buffer.byteLength(jsonString, 'utf8');
    } catch {
      return 0;
    }
  }

  /**
   * Update response statistics
   */
  private updateResponseStats(
    endpoint: string,
    method: string,
    responseTime: number,
    responseSize: number,
    cacheHit: boolean
  ): void {
    const statsKey = `${method}:${endpoint}`;
    const existingStats = this.responseStats.get(statsKey) || this.createDefaultResponseStats(endpoint, method);
    
    // Update statistics
    existingStats.requestCount++;
    existingStats.avgResponseTime = 
      ((existingStats.avgResponseTime * (existingStats.requestCount - 1)) + responseTime) / existingStats.requestCount;
    
    // Update percentiles (simplified)
    existingStats.p50ResponseTime = this.updatePercentile(existingStats.p50ResponseTime, responseTime, 0.5);
    existingStats.p95ResponseTime = this.updatePercentile(existingStats.p95ResponseTime, responseTime, 0.95);
    existingStats.p99ResponseTime = this.updatePercentile(existingStats.p99ResponseTime, responseTime, 0.99);
    
    existingStats.maxResponseTime = Math.max(existingStats.maxResponseTime, responseTime);
    existingStats.avgResponseSize = 
      ((existingStats.avgResponseSize * (existingStats.requestCount - 1)) + responseSize) / existingStats.requestCount;
    existingStats.maxResponseSize = Math.max(existingStats.maxResponseSize, responseSize);
    
    // Update cache hit rate
    const cacheHits = cacheHit ? 1 : 0;
    existingStats.cacheHitRate = 
      ((existingStats.cacheHitRate * (existingStats.requestCount - 1)) + (cacheHit ? 100 : 0)) / existingStats.requestCount;
    
    existingStats.lastRequest = new Date();
    
    this.responseStats.set(statsKey, existingStats);
    
    // Update global metrics
    this.metrics.gauge('api.response_time.p50', existingStats.p50ResponseTime);
    this.metrics.gauge('api.response_time.p95', existingStats.p95ResponseTime);
    this.metrics.gauge('api.response_time.p99', existingStats.p99ResponseTime);
    this.metrics.gauge('api.response_size.avg', existingStats.avgResponseSize);
    this.metrics.gauge('api.response_size.max', existingStats.maxResponseSize);
    this.metrics.gauge('api.cache_hit_rate', existingStats.cacheHitRate);
    
    // Check for slow responses
    if (responseTime > 1000) {
      this.metrics.increment('api.slow_responses');
      logger.warn('Slow API response detected', {
        endpoint,
        method,
        responseTime,
        responseSize
      });
    }
    
    // Check for large responses
    if (responseSize > (this.config.responseSize?.warnSize || 524288)) {
      this.metrics.increment('api.large_responses');
      logger.warn('Large API response detected', {
        endpoint,
        method,
        responseTime,
        responseSize
      });
    }
  }

  private createDefaultResponseStats(endpoint: string, method: string): APIResponseStats {
    return {
      endpoint,
      method,
      requestCount: 0,
      avgResponseTime: 0,
      p50ResponseTime: 0,
      p95ResponseTime: 0,
      p99ResponseTime: 0,
      maxResponseTime: 0,
      avgResponseSize: 0,
      maxResponseSize: 0,
      cacheHitRate: 0,
      errorRate: 0,
      lastRequest: new Date()
    };
  }

  private updatePercentile(current: number, newValue: number, percentile: number): number {
    // Simplified percentile calculation
    // In production, use proper percentile tracking
    if (current === 0) return newValue;
    return current * (1 - percentile) + newValue * percentile;
  }

  /**
   * Generate optimization recommendations
   */
  private generateRecommendations(
    result: APIOptimizationResult,
    originalSize: number,
    optimizedSize: number,
    responseTime: number,
    cacheHit: boolean
  ): void {
    const compressionRatio = originalSize / optimizedSize;
    
    // Compression recommendations
    if (compressionRatio < 1.2 && originalSize > 1024) {
      result.recommendations.push('Enable compression for better size reduction');
    }
    
    // Caching recommendations
    if (!cacheHit && responseTime > 200) {
      result.recommendations.push('Consider caching this response for better performance');
    }
    
    // Response size recommendations
    if (optimizedSize > (this.config.responseSize?.maxSize || 1048576)) {
      result.recommendations.push('Response size exceeds maximum - consider pagination or field filtering');
    }
    
    // Performance recommendations
    if (responseTime > 1000) {
      result.recommendations.push('Response time exceeds 1 second - investigate performance bottlenecks');
    }
  }

  /**
   * Check for warnings
   */
  private checkWarnings(
    result: APIOptimizationResult,
    responseSize: number,
    responseTime: number
  ): void {
    // Large response warning
    if (responseSize > (this.config.responseSize?.warnSize || 524288)) {
      result.warnings.push(`Large response size: ${this.formatBytes(responseSize)}`);
    }
    
    // Slow response warning
    if (responseTime > 1000) {
      result.warnings.push(`Slow response time: ${responseTime}ms`);
    }
    
    // No compression warning
    if (this.config.compression?.enabled && responseSize > 1024) {
      const compressionRatio = result.originalSize / result.optimizedSize;
      if (compressionRatio < 1.1) {
        result.warnings.push('Compression not effective - check compression settings');
      }
    }
  }

  /**
   * Format bytes to human-readable format
   */
  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Set performance targets for specific endpoint
   */
  setPerformanceTargets(endpoint: string, targets: APIPerformanceTargets): void {
    this.performanceTargets.set(endpoint, targets);
    logger.info('Performance targets set for endpoint', { endpoint, targets });
  }

  /**
   * Get performance targets for endpoint
   */
  getPerformanceTargets(endpoint: string): APIPerformanceTargets | undefined {
    return this.performanceTargets.get(endpoint);
  }

  /**
   * Check if endpoint meets performance targets
   */
  checkPerformanceTargets(endpoint: string): { meetsTargets: boolean; violations: string[] } {
    const statsKey = `*:${endpoint}`; // Match any method for this endpoint
    const violations: string[] = [];
    
    this.responseStats.forEach((stats, key) => {
      if (key.endsWith(endpoint)) {
        const targets = this.performanceTargets.get(endpoint);
        
        if (targets) {
          if (targets.p50 && stats.p50ResponseTime > targets.p50) {
            violations.push(`P50 response time exceeds target: ${stats.p50ResponseTime.toFixed(2)}ms > ${targets.p50}ms`);
          }
          
          if (targets.p95 && stats.p95ResponseTime > targets.p95) {
            violations.push(`P95 response time exceeds target: ${stats.p95ResponseTime.toFixed(2)}ms > ${targets.p95}ms`);
          }
          
          if (targets.p99 && stats.p99ResponseTime > targets.p99) {
            violations.push(`P99 response time exceeds target: ${stats.p99ResponseTime.toFixed(2)}ms > ${targets.p99}ms`);
          }
          
          if (targets.maxResponseTime && stats.maxResponseTime > targets.maxResponseTime) {
            violations.push(`Max response time exceeds target: ${stats.maxResponseTime.toFixed(2)}ms > ${targets.maxResponseTime}ms`);
          }
          
          if (targets.maxResponseSize && stats.maxResponseSize > targets.maxResponseSize) {
            violations.push(`Max response size exceeds target: ${this.formatBytes(stats.maxResponseSize)} > ${this.formatBytes(targets.maxResponseSize)}`);
          }
          
          if (targets.minCacheHitRate && stats.cacheHitRate < targets.minCacheHitRate) {
            violations.push(`Cache hit rate below target: ${stats.cacheHitRate.toFixed(2)}% < ${targets.minCacheHitRate}%`);
          }
        }
      }
    });
    
    return {
      meetsTargets: violations.length === 0,
      violations
    };
  }

  /**
   * Get API response statistics
   */
  getResponseStats(limit: number = 10): APIResponseStats[] {
    return Array.from(this.responseStats.values())
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, limit);
  }

  /**
   * Get slowest endpoints
   */
  getSlowestEndpoints(limit: number = 5): APIResponseStats[] {
    return Array.from(this.responseStats.values())
      .sort((a, b) => b.p95ResponseTime - a.p95ResponseTime)
      .slice(0, limit);
  }

  /**
   * Get largest responses
   */
  getLargestResponses(limit: number = 5): APIResponseStats[] {
    return Array.from(this.responseStats.values())
      .sort((a, b) => b.avgResponseSize - a.avgResponseSize)
      .slice(0, limit);
  }

  /**
   * Get cache performance statistics
   */
  getCachePerformance(): {
    hitRate: number;
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    endpointsByHitRate: Array<{ endpoint: string; hitRate: number }>;
  } {
    let totalRequests = 0;
    let totalHits = 0;
    let totalMisses = 0;
    
    const endpointsByHitRate: Array<{ endpoint: string; hitRate: number }> = [];
    
    this.responseStats.forEach(stats => {
      totalRequests += stats.requestCount;
      totalHits += (stats.cacheHitRate / 100) * stats.requestCount;
      totalMisses += ((100 - stats.cacheHitRate) / 100) * stats.requestCount;
      
      endpointsByHitRate.push({
        endpoint: stats.endpoint,
        hitRate: stats.cacheHitRate
      });
    });
    
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests) * 100 : 0;
    
    return {
      hitRate,
      totalRequests,
      cacheHits: Math.round(totalHits),
      cacheMisses: Math.round(totalMisses),
      endpointsByHitRate: endpointsByHitRate
        .sort((a, b) => b.hitRate - a.hitRate)
        .slice(0, 10)
    };
  }

  /**
   * Generate API optimization report
   */
  generateOptimizationReport(): {
    totalEndpoints: number;
    totalRequests: number;
    avgResponseTime: number;
    p50ResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    avgResponseSize: number;
    maxResponseSize: number;
    cacheHitRate: number;
    slowEndpoints: APIResponseStats[];
    largeResponses: APIResponseStats[];
    performanceViolations: Array<{ endpoint: string; violations: string[] }>;
  } {
    let totalRequests = 0;
    let totalResponseTime = 0;
    let totalResponseSize = 0;
    let maxResponseSize = 0;
    
    const stats = Array.from(this.responseStats.values());
    
    stats.forEach(stat => {
      totalRequests += stat.requestCount;
      totalResponseTime += stat.avgResponseTime * stat.requestCount;
      totalResponseSize += stat.avgResponseSize * stat.requestCount;
      maxResponseSize = Math.max(maxResponseSize, stat.maxResponseSize);
    });
    
    const avgResponseTime = totalRequests > 0 ? totalResponseTime / totalRequests : 0;
    const avgResponseSize = totalRequests > 0 ? totalResponseSize / totalRequests : 0;
    
    // Get p50, p95, p99 from metrics
    const p50ResponseTime = this.metrics.getGaugeValue('api.response_time.p50');
    const p95ResponseTime = this.metrics.getGaugeValue('api.response_time.p95');
    const p99ResponseTime = this.metrics.getGaugeValue('api.response_time.p99');
    const cacheHitRate = this.metrics.getGaugeValue('api.cache_hit_rate');
    
    // Get performance violations
    const performanceViolations: Array<{ endpoint: string; violations: string[] }> = [];
    
    this.performanceTargets.forEach((targets, endpoint) => {
      const checkResult = this.checkPerformanceTargets(endpoint);
      if (!checkResult.meetsTargets) {
        performanceViolations.push({
          endpoint,
          violations: checkResult.violations
        });
      }
    });
    
    return {
      totalEndpoints: stats.length,
      totalRequests,
      avgResponseTime,
      p50ResponseTime,
      p95ResponseTime,
      p99ResponseTime,
      avgResponseSize,
      maxResponseSize,
      cacheHitRate,
      slowEndpoints: this.getSlowestEndpoints(5),
      largeResponses: this.getLargestResponses(5),
      performanceViolations
    };
  }

  /**
   * Clear all statistics
   */
  clearStatistics(): void {
    this.responseStats.clear();
    
    // Reset metrics
    this.metrics.gauge('api.response_time.p50', 0);
    this.metrics.gauge('api.response_time.p95', 0);
    this.metrics.gauge('api.response_time.p99', 0);
    this.metrics.gauge('api.response_size.avg', 0);
    this.metrics.gauge('api.response_size.max', 0);
    this.metrics.gauge('api.cache_hit_rate', 0);
    this.metrics.gauge('api.compression_ratio', 0);
    this.metrics.gauge('api.large_responses', 0);
    this.metrics.gauge('api.slow_responses', 0);
  }

  /**
   * Invalidate cache for specific endpoint or pattern
   */
  async invalidateCache(pattern: string | RegExp): Promise<number> {
    if (!this.cacheManager) {
      return 0;
    }
    
    let deletedCount = 0;
    
    if (typeof pattern === 'string') {
      const cachePattern = `api_cache:api_response:${pattern.replace(/\*/g, '.*')}`;
      await this.cacheManager.invalidateByPattern(cachePattern);
      deletedCount = 1; // Approximate
    } else {
      // For regex patterns, we'd need to scan all keys
      // This is simplified for demonstration
      const cachePattern = 'api_cache:api_response:*';
      await this.cacheManager.invalidateByPattern(cachePattern);
      deletedCount = 100; // Approximate
    }
    
    logger.info('API cache invalidated', { pattern, deletedCount });
    return deletedCount;
  }

  /**
   * Get cache configuration
   */
  getCacheConfig(): APIOptimizationConfig['caching'] {
    return this.config.caching || {};
  }

  /**
   * Update cache configuration
   */
  updateCacheConfig(config: Partial<APIOptimizationConfig['caching']>): void {
    this.config.caching = { ...this.config.caching, ...config };
    logger.info('API cache configuration updated', { config });
  }

  /**
   * Get compression configuration
   */
  getCompressionConfig(): APIOptimizationConfig['compression'] {
    return this.config.compression || {};
  }

  /**
   * Update compression configuration
   */
  updateCompressionConfig(config: Partial<APIOptimizationConfig['compression']>): void {
    this.config.compression = { ...this.config.compression, ...config };
    logger.info('API compression configuration updated', { config });
  }

  /**
   * API Optimization Decorators
   */

  /**
   * Decorator for optimizing API responses
   */
  OptimizeAPIResponse() {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const apiOptimizer: APIResponseOptimizer = this.apiOptimizer;
        if (!apiOptimizer) {
          throw new Error('APIResponseOptimizer not initialized on class');
        }
        
        // Extract request context from arguments
        const request = args.find(arg => arg && arg.headers && arg.method);
        const responseData = await originalMethod.apply(this, args);
        
        if (request) {
          const optimizationResult = await apiOptimizer.optimizeResponse(
            request.path,
            request.method,
            responseData,
            {
              requestHeaders: request.headers,
              queryParams: request.query,
              body: request.body
            }
          );
          
          logger.debug('API response optimized', {
            endpoint: request.path,
            method: request.method,
            originalSize: optimizationResult.originalSize,
            optimizedSize: optimizationResult.optimizedSize,
            compressionRatio: optimizationResult.compressionRatio,
            cached: optimizationResult.cached
          });
        }
        
        return responseData;
      };
      
      return descriptor;
    };
  }

  /**
   * Decorator for caching API responses
   */
  CacheAPIResponse(options: {
    ttl?: number;
    varyBy?: string[];
  } = {}) {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const apiOptimizer: APIResponseOptimizer = this.apiOptimizer;
        if (!apiOptimizer) {
          throw new Error('APIResponseOptimizer not initialized on class');
        }
        
        const request = args.find(arg => arg && arg.headers && arg.method);
        
        if (request && request.method === 'GET') {
          const cacheKey = apiOptimizer.generateCacheKey(
            request.path,
            request.method,
            request.headers,
            request.query,
            request.body
          );
          
          // Try to get from cache
          const cachedData = await apiOptimizer.cacheManager?.get('api_response', cacheKey, {
            tenantId: 'api_cache'
          });
          
          if (cachedData !== null) {
            logger.debug('API cache hit', { cacheKey });
            return cachedData;
          }
        }
        
        // Cache miss - execute original method
        const result = await originalMethod.apply(this, args);
        
        // Cache the result if it's a GET request
        if (request && request.method === 'GET') {
          const cacheKey = apiOptimizer.generateCacheKey(
            request.path,
            request.method,
            request.headers,
            request.query,
            request.body
          );
          
          await apiOptimizer.cacheManager?.set('api_response', cacheKey, result, {
            ttl: options.ttl,
            tenantId: 'api_cache',
            tags: [`endpoint:${request.path}`, `method:GET`]
          });
          
          logger.debug('API response cached', { cacheKey });
        }
        
        return result;
      };
      
      return descriptor;
    };
  }

  /**
   * Decorator for compressing API responses
   */
  CompressAPIResponse() {
    return function (
      target: any,
      propertyKey: string,
      descriptor: PropertyDescriptor
    ) {
      const originalMethod = descriptor.value;
      
      descriptor.value = async function (...args: any[]) {
        const result = await originalMethod.apply(this, args);
        
        // In a real implementation, this would set compression headers
        // For this decorator, we'll just track metrics
        const apiOptimizer: APIResponseOptimizer = this.apiOptimizer;
        if (apiOptimizer) {
          apiOptimizer.metrics.increment('api.compressed_responses');
        }
        
        return result;
      };
      
      return descriptor;
    };
  }
}

/**
 * Factory function to create APIResponseOptimizer
 */
export function createAPIResponseOptimizer(options?: {
  config?: APIOptimizationConfig;
  cacheManager?: AdvancedCacheManager;
  metrics?: MetricsCollector;
}): APIResponseOptimizer {
  return new APIResponseOptimizer(options);
}

/**
 * API Response Optimization Utilities
 */
export class APIOptimizationUtils {
  /**
   * Generate cache control headers
   */
  static generateCacheControlHeaders(options: {
    maxAge?: number;
    sMaxAge?: number;
    staleWhileRevalidate?: number;
    staleIfError?: number;
    mustRevalidate?: boolean;
    noCache?: boolean;
    noStore?: boolean;
    private?: boolean;
    public?: boolean;
  }): string {
    const parts: string[] = [];
    
    if (options.maxAge !== undefined) {
      parts.push(`max-age=${options.maxAge}`);
    }
    
    if (options.sMaxAge !== undefined) {
      parts.push(`s-maxage=${options.sMaxAge}`);
    }
    
    if (options.staleWhileRevalidate !== undefined) {
      parts.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
    }
    
    if (options.staleIfError !== undefined) {
      parts.push(`stale-if-error=${options.staleIfError}`);
    }
    
    if (options.mustRevalidate) {
      parts.push('must-revalidate');
    }
    
    if (options.noCache) {
      parts.push('no-cache');
    }
    
    if (options.noStore) {
      parts.push('no-store');
    }
    
    if (options.private) {
      parts.push('private');
    }
    
    if (options.public) {
      parts.push('public');
    }
    
    return parts.join(', ');
  }

  /**
   * Generate ETag header
   */
  static generateETag(data: any): string {
    try {
      const jsonString = JSON.stringify(data);
      // Simple hash - in production use crypto
      let hash = 0;
      for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return `"${hash.toString()}"`;
    } catch {
      return '"unknown"';
    }
  }

  /**
   * Parse fields parameter for sparse fieldsets
   */
  static parseFieldsParameter(fieldsParam: string | string[] | undefined): string[] {
    if (!fieldsParam) return [];
    
    if (typeof fieldsParam === 'string') {
      return fieldsParam.split(',').map(f => f.trim());
    }
    
    if (Array.isArray(fieldsParam)) {
      return fieldsParam.map(f => f.trim());
    }
    
    return [];
  }

  /**
   * Generate pagination headers
   */
  static generatePaginationHeaders(options: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  }): Record<string, string> {
    return {
      'X-Pagination-Page': options.page.toString(),
      'X-Pagination-Page-Size': options.pageSize.toString(),
      'X-Pagination-Total-Items': options.totalItems.toString(),
      'X-Pagination-Total-Pages': options.totalPages.toString(),
      'X-Pagination-Has-Next': (options.page < options.totalPages).toString(),
      'X-Pagination-Has-Prev': (options.page > 1).toString()
    };
  }

  /**
   * Generate rate limit headers
   */
  static generateRateLimitHeaders(options: {
    limit: number;
    remaining: number;
    reset: number; // seconds
  }): Record<string, string> {
    return {
      'X-RateLimit-Limit': options.limit.toString(),
      'X-RateLimit-Remaining': options.remaining.toString(),
      'X-RateLimit-Reset': options.reset.toString(),
      'Retry-After': options.reset.toString()
    };
  }

  /**
   * Generate streaming response headers
   */
  static generateStreamingHeaders(options: {
    contentType: string;
    fileName?: string;
    contentLength?: number;
  }): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': options.contentType,
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };
    
    if (options.fileName) {
      headers['Content-Disposition'] = `attachment; filename="${options.fileName}"`;
    }
    
    if (options.contentLength) {
      headers['Content-Length'] = options.contentLength.toString();
    }
    
    return headers;
  }

  /**
   * Generate CORS headers
   */
  static generateCORSHeaders(options: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    maxAge?: number;
    credentials?: boolean;
  }): Record<string, string> {
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': options.allowedOrigins.join(', '),
      'Access-Control-Allow-Methods': options.allowedMethods.join(', '),
      'Access-Control-Allow-Headers': options.allowedHeaders.join(', ')
    };
    
    if (options.maxAge) {
      headers['Access-Control-Max-Age'] = options.maxAge.toString();
    }
    
    if (options.credentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }
    
    return headers;
  }

  /**
   * Generate security headers
   */
  static generateSecurityHeaders(): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-src 'self';",
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()'
    };
  }

  /**
   * Generate performance headers
   */
  static generatePerformanceHeaders(options: {
    serverTiming?: Array<{ name: string; duration: number; description?: string }>;
    responseTime?: number;
  }): Record<string, string> {
    const headers: Record<string, string> = {};
    
    if (options.serverTiming) {
      const timingValues = options.serverTiming
        .map(t => {
          let value = `${t.name};dur=${t.duration.toFixed(2)}`;
          if (t.description) {
            value += `;desc="${t.description}"`;
          }
          return value;
        })
        .join(', ');
      
      headers['Server-Timing'] = timingValues;
    }
    
    if (options.responseTime) {
      headers['X-Response-Time'] = `${options.responseTime.toFixed(2)}ms`;
    }
    
    return headers;
  }
}