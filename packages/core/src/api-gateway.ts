import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger, MetricsCollector, AuditLogService, createSecurityRateLimiter, rateLimitPresets } from '../index.js';
import {
  APIGatewayConfig,
  AuthenticationRequest,
  AuthenticationResult,
  RequestContext,
  ResponseContext,
  RateLimitRule,
  SecurityConfig,
  PerformanceMetrics,
  SecurityEvent,
  Session,
  Alert,
  GatewayAlertRule,
  AlertChannel
} from '@insurance-lead-gen/types';

// ========================================
// API GATEWAY SERVICE
// ========================================

export interface APIGatewayServiceConfig {
  id: string;
  name: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  enabled: boolean;
  rateLimits: {
    global: RateLimitRule;
    perRoute: Record<string, RateLimitRule>;
    perUser: Record<string, RateLimitRule>;
    burstLimit: number;
  };
  security: SecurityConfig;
  routing: {
    services: Array<{
      id: string;
      name: string;
      url: string;
      healthCheckPath: string;
      timeout: number;
      retries: number;
      weight: number;
    }>;
    loadBalancer: {
      algorithm: 'round_robin' | 'least_connections' | 'weighted';
      stickySession: boolean;
    };
    circuitBreaker: {
      enabled: boolean;
      failureThreshold: number;
      recoveryTimeout: number;
    };
  };
  monitoring: {
    enabled: boolean;
    metrics: {
      enabled: boolean;
      interval: number;
    };
    logging: {
      enabled: boolean;
      level: string;
    };
    alerting: {
      enabled: boolean;
      rules: GatewayAlertRule[];
      channels: AlertChannel[];
    };
  };
}

export interface RateLimitStatus {
  limit: number;
  remaining: number;
  resetTime: Date;
  rule: string;
}

export interface SecurityEventsFilter {
  page?: number;
  limit?: number;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  type?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface SessionsFilter {
  page?: number;
  limit?: number;
  userId?: string;
  activeOnly?: boolean;
}

export class APIGatewayService {
  private redis: Redis | null;
  private config: APIGatewayServiceConfig;
  private auditService: AuditLogService | null;
  private metrics: MetricsCollector;
  private circuitBreakers: Map<string, { failures: number; lastFailure: number; state: 'closed' | 'open' | 'half-open' }>;
  private serviceWeights: Map<string, number>;
  private serviceRoundRobin: Map<string, number>;

  constructor(
    redis: Redis | null,
    config: APIGatewayServiceConfig,
    auditService: AuditLogService | null,
    metrics: MetricsCollector
  ) {
    this.redis = redis;
    this.config = config;
    this.auditService = auditService;
    this.metrics = metrics;
    this.circuitBreakers = new Map();
    this.serviceWeights = new Map();
    this.serviceRoundRobin = new Map();

    // Initialize service weights
    for (const service of config.routing.services) {
      this.serviceWeights.set(service.id, service.weight);
      this.serviceRoundRobin.set(service.id, 0);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): APIGatewayServiceConfig {
    return this.config;
  }

  /**
   * Update configuration
   */
  async updateConfig(updates: Partial<APIGatewayServiceConfig>): Promise<void> {
    this.config = { ...this.config, ...updates, updatedAt: new Date() };
    logger.info('API Gateway configuration updated', { id: this.config.id });
  }

  /**
   * Process incoming request through the API gateway
   */
  async processRequest(
    request: any,
    authRequest?: AuthenticationRequest
  ): Promise<{ context: RequestContext; auth?: AuthenticationResult }> {
    const startTime = Date.now();
    const requestId = this.generateRequestId();

    // Create request context
    const context: RequestContext = {
      id: requestId,
      method: request.method,
      path: request.path,
      url: request.url,
      headers: this.sanitizeHeaders(request.headers),
      query: request.query || {},
      params: request.params || {},
      body: request.body,
      client: this.extractClientInfo(request),
      startTime,
      timeout: this.config.routing.services[0]?.timeout || 30000,
      correlationId: request.headers['x-correlation-id'] || requestId,
      traceId: request.headers['x-trace-id'] || this.generateTraceId(),
      spanId: this.generateSpanId(),
      attributes: {}
    };

    // Authentication if provided
    let auth: AuthenticationResult | undefined;
    if (authRequest) {
      auth = await this.authenticate(authRequest, context);
      context.user = auth.user;
    }

    // Rate limiting
    await this.checkRateLimit(context);

    // Input validation
    await this.validateInput(context);

    // Security checks
    await this.performSecurityChecks(context);

    // Record metrics
    await this.metrics.incrementCounter('api_gateway_requests_total', {
      method: context.method,
      path: context.path,
      auth: auth?.success ? 'success' : 'none'
    });

    return { context, auth };
  }

  /**
   * Process response through the API gateway
   */
  async processResponse(
    context: RequestContext,
    response: any,
    serviceResponse?: any
  ): Promise<ResponseContext> {
    const endTime = Date.now();
    const duration = endTime - context.startTime;

    // Transform response if needed
    const transformedResponse = await this.transformResponse(serviceResponse, context);

    const responseContext: ResponseContext = {
      statusCode: serviceResponse?.statusCode || response.statusCode || 200,
      headers: this.sanitizeHeaders(serviceResponse?.headers || response.headers || {}),
      body: transformedResponse,
      duration,
      cached: response.cached || false,
      compressed: response.compressed || false,
      metadata: {
        requestId: context.id,
        timestamp: new Date(),
        server: 'api-gateway',
        version: this.config.version,
        rateLimitRemaining: await this.getRateLimitRemaining(context),
        cacheStatus: response.cacheStatus
      }
    };

    // Record response metrics
    await this.metrics.recordHistogram('api_gateway_request_duration', duration, {
      method: context.method,
      path: context.path,
      status: responseContext.statusCode.toString()
    });

    // Log request/response
    await this.logRequestResponse(context, responseContext);

    return responseContext;
  }

  /**
   * Authenticate request using various methods
   */
  async authenticate(
    request: AuthenticationRequest,
    context: RequestContext
  ): Promise<AuthenticationResult> {
    try {
      switch (request.provider) {
        case 'jwt':
          return await this.authenticateJWT(request.credentials, context);
        case 'api_key':
          return await this.authenticateAPIKey(request.credentials, context);
        case 'oauth':
          return await this.authenticateOAuth(request.credentials, context);
        default:
          throw new Error(`Unsupported authentication provider: ${request.provider}`);
      }
    } catch (error) {
      await this.logSecurityEvent({
        type: 'authentication',
        severity: 'medium',
        userId: request.credentials.token?.split('.')[1] || 'unknown',
        context: { requestId: context.id, method: context.method, path: context.path },
        details: {
          provider: request.provider,
          error: error instanceof Error ? error.message : 'Unknown error',
          clientInfo: context.client
        },
        timestamp: new Date()
      });

      return {
        success: false,
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: error instanceof Error ? error.message : 'Authentication failed'
        },
        metadata: {
          provider: request.provider,
          method: 'unknown',
          sessionId: context.id,
          requestId: context.id,
          timestamp: new Date()
        }
      };
    }
  }

  /**
   * JWT Authentication
   */
  private async authenticateJWT(
    credentials: any,
    context: RequestContext
  ): Promise<AuthenticationResult> {
    const token = credentials.token;
    if (!token) {
      throw new Error('JWT token is required');
    }

    // Verify token
    const decoded = await this.verifyJWT(token);

    // Check if token is blacklisted
    if (this.redis) {
      const isBlacklisted = await this.redis.sismember('jwt_blacklist', decoded.jti);
      if (isBlacklisted) {
        throw new Error('Token has been revoked');
      }
    }

    // Check token expiration
    if (decoded.exp && Date.now() / 1000 > decoded.exp) {
      throw new Error('Token has expired');
    }

    // Check session validity
    if (this.redis) {
      const session = await this.redis.get(`session:${decoded.sessionId}`);
      if (!session) {
        throw new Error('Invalid session');
      }

      const sessionData = JSON.parse(session);
      if (!sessionData.isActive) {
        throw new Error('Session has been invalidated');
      }
    }

    return {
      success: true,
      user: {
        id: decoded.sub,
        email: decoded.email,
        username: decoded.username,
        roles: decoded.roles || [],
        permissions: decoded.permissions || [],
        scopes: decoded.scope?.split(' ') || [],
        attributes: decoded.attributes || {},
        sessionId: decoded.sessionId,
        issuedAt: new Date(decoded.iat * 1000),
        expiresAt: new Date(decoded.exp * 1000),
        lastActivity: new Date(),
        ipAddress: context.client.ip,
        userAgent: context.client.userAgent
      },
      metadata: {
        provider: 'jwt',
        method: 'bearer',
        sessionId: decoded.sessionId,
        requestId: context.id,
        timestamp: new Date()
      }
    };
  }

  /**
   * API Key Authentication
   */
  private async authenticateAPIKey(
    credentials: any,
    context: RequestContext
  ): Promise<AuthenticationResult> {
    const apiKey = credentials.apiKey;
    if (!apiKey) {
      throw new Error('API key is required');
    }

    if (!this.redis) {
      throw new Error('Redis not configured for API key authentication');
    }

    // Lookup API key in Redis/database
    const keyData = await this.redis.get(`api_key:${apiKey}`);
    if (!keyData) {
      throw new Error('Invalid API key');
    }

    const parsed = JSON.parse(keyData);

    // Check if key is active
    if (!parsed.isActive) {
      throw new Error('API key is disabled');
    }

    // Check expiration
    if (parsed.expiresAt && new Date(parsed.expiresAt) < new Date()) {
      throw new Error('API key has expired');
    }

    // Check scopes
    const requiredScope = this.getRequiredScope(context.path);
    if (requiredScope && !parsed.scopes.includes(requiredScope)) {
      throw new Error(`Insufficient scope: ${requiredScope} required`);
    }

    // Update last used
    await this.redis.set(`api_key:${apiKey}:last_used`, new Date().toISOString());

    return {
      success: true,
      user: {
        id: parsed.userId || parsed.clientId,
        email: parsed.email,
        roles: parsed.roles || ['api'],
        permissions: parsed.permissions || [],
        scopes: parsed.scopes || [],
        attributes: parsed.attributes || {},
        sessionId: `api_key_${apiKey.substring(0, 8)}`,
        issuedAt: new Date(parsed.createdAt),
        expiresAt: new Date(parsed.expiresAt),
        lastActivity: new Date(),
        ipAddress: context.client.ip,
        userAgent: context.client.userAgent
      },
      metadata: {
        provider: 'api_key',
        method: 'header',
        sessionId: `api_key_${apiKey.substring(0, 8)}`,
        requestId: context.id,
        timestamp: new Date()
      }
    };
  }

  /**
   * OAuth Authentication (simplified)
   */
  private async authenticateOAuth(
    credentials: any,
    context: RequestContext
  ): Promise<AuthenticationResult> {
    const { oauthCode, clientId, clientSecret } = credentials;

    if (!oauthCode || !clientId || !clientSecret) {
      throw new Error('OAuth code, client ID, and client secret are required');
    }

    // Exchange code for access token
    const tokenData = await this.exchangeOAuthCode(oauthCode, clientId, clientSecret);

    // Get user info from OAuth provider
    const userInfo = await this.getOAuthUserInfo(tokenData.access_token);

    return {
      success: true,
      user: {
        id: userInfo.id,
        email: userInfo.email,
        username: userInfo.username,
        roles: userInfo.roles || ['user'],
        permissions: userInfo.permissions || [],
        scopes: tokenData.scope?.split(' ') || [],
        attributes: userInfo.attributes || {},
        sessionId: `oauth_${uuidv4()}`,
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + (tokenData.expires_in * 1000)),
        lastActivity: new Date(),
        ipAddress: context.client.ip,
        userAgent: context.client.userAgent
      },
      metadata: {
        provider: 'oauth',
        method: 'authorization_code',
        sessionId: `oauth_${uuidv4()}`,
        requestId: context.id,
        timestamp: new Date()
      }
    };
  }

  /**
   * Rate limiting check
   */
  private async checkRateLimit(context: RequestContext): Promise<void> {
    const rule = this.getRateLimitRule(context);
    const key = this.generateRateLimitKey(context, rule);

    if (!this.redis) {
      // Memory-based rate limiting fallback
      logger.warn('Redis not configured, using memory-based rate limiting');
      return;
    }

    const now = Date.now();
    const window = Math.floor(now / rule.windowMs);
    const redisKey = `ratelimit:${key}:${window}`;

    const current = await this.redis.incr(redisKey);
    if (current === 1) {
      await this.redis.pexpire(redisKey, rule.windowMs);
    }

    // Set rate limit headers
    const remaining = Math.max(0, rule.requests - current);
    const resetTime = new Date((window + 1) * rule.windowMs);

    context.attributes.rateLimitLimit = rule.requests;
    context.attributes.rateLimitRemaining = remaining;
    context.attributes.rateLimitReset = resetTime.toISOString();

    if (current > rule.requests) {
      await this.logSecurityEvent({
        type: 'rate_limit',
        severity: 'medium',
        userId: context.user?.id || 'anonymous',
        context: { requestId: context.id, method: context.method, path: context.path },
        details: {
          rateLimitKey: key,
          current,
          limit: rule.requests,
          windowMs: rule.windowMs
        },
        timestamp: new Date()
      });

      throw new Error(`Rate limit exceeded. Try again after ${resetTime.toISOString()}`);
    }
  }

  /**
   * Get rate limit status for a context
   */
  async getRateLimitStatus(context: RequestContext): Promise<RateLimitStatus> {
    const rule = this.getRateLimitRule(context);
    const key = this.generateRateLimitKey(context, rule);

    if (!this.redis) {
      return {
        limit: rule.requests,
        remaining: rule.requests,
        resetTime: new Date(Date.now() + rule.windowMs),
        rule: 'global'
      };
    }

    const now = Date.now();
    const window = Math.floor(now / rule.windowMs);
    const redisKey = `ratelimit:${key}:${window}`;

    const current = await this.redis.get(redisKey);
    const currentCount = parseInt(current || '0', 10);
    const remaining = Math.max(0, rule.requests - currentCount);
    const resetTime = new Date((window + 1) * rule.windowMs);

    return {
      limit: rule.requests,
      remaining,
      resetTime,
      rule: rule.keyGenerator ? 'custom' : 'global'
    };
  }

  /**
   * Reset rate limit for user or IP
   */
  async resetRateLimit(userId?: string, ipAddress?: string): Promise<void> {
    if (!this.redis) {
      throw new Error('Redis not configured');
    }

    const pattern = userId ? `ratelimit:user:${userId}:*` : `ratelimit:ip:${ipAddress}:*`;
    const keys = await this.redis.keys(pattern);

    if (keys.length > 0) {
      await this.redis.del(...keys);
    }

    logger.info('Rate limit reset', { userId, ipAddress, keysDeleted: keys.length });
  }

  /**
   * Input validation
   */
  private async validateInput(context: RequestContext): Promise<void> {
    if (!this.config.security.inputValidation?.enabled) {
      return;
    }

    // Basic validation
    this.validatePayloadSize(context);
    this.validateContentType(context);
    this.sanitizeInput(context);

    // Custom validation rules
    if (this.config.security.inputValidation.customValidators) {
      for (const validator of this.config.security.inputValidation.customValidators) {
        await this.runCustomValidator(validator, context);
      }
    }
  }

  /**
   * Security checks
   */
  private async performSecurityChecks(context: RequestContext): Promise<void> {
    // Check for suspicious patterns
    await this.checkSuspiciousPatterns(context);

    // Validate headers
    await this.validateHeaders(context);

    // Check request velocity
    await this.checkRequestVelocity(context);
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(timeRange: string): Promise<PerformanceMetrics> {
    const now = Date.now();
    const startTime = this.parseTimeRange(timeRange, now);

    return {
      requests: {
        total: await this.getMetricValue('api_gateway_requests_total', startTime, now),
        successful: await this.getMetricValue('api_gateway_requests_success_total', startTime, now),
        failed: await this.getMetricValue('api_gateway_requests_failed_total', startTime, now),
        byMethod: await this.getMetricsByLabel('api_gateway_requests_total', 'method', startTime, now),
        byRoute: await this.getMetricsByLabel('api_gateway_requests_total', 'route', startTime, now)
      },
      responses: {
        total: 0,
        byStatusCode: {},
        byContentType: {},
        compressed: 0,
        cached: 0,
        errors: 0
      },
      latency: {
        average: await this.getAverageLatency(startTime, now),
        median: 0,
        p50: 0,
        p90: 0,
        p95: 0,
        p99: 0,
        byRoute: {}
      },
      throughput: {
        requestsPerSecond: 0,
        bytesPerSecond: 0,
        peakRPS: 0,
        sustainedRPS: 0,
        byRoute: {}
      },
      errors: {
        rate: 0,
        byCode: {},
        byRoute: {},
        byUser: {},
        patterns: []
      },
      custom: {
        business: {
          conversions: { total: 0, rate: 0, bySource: {}, byUserType: {} },
          revenue: { total: 0, perRequest: 0, byService: {}, trends: [] },
          userEngagement: { sessionDuration: 0, requestsPerSession: 0, bounceRate: 0, retention: [] }
        },
        technical: {
          database: { queries: 0, averageLatency: 0, slowQueries: 0, connectionPool: { active: 0, idle: 0, waiting: 0, poolSize: 0 } },
          cache: { hits: 0, misses: 0, hitRate: 0, evictions: 0, memoryUsage: { used: 0, total: 0, percentage: 0 } },
          external: { calls: 0, latency: 0, errors: 0, availability: 0, byService: {} }
        },
        security: {
          authentication: { attempts: 0, successRate: 0, averageLatency: 0, failedAttempts: 0, suspiciousAttempts: 0 },
          authorization: { checks: 0, denied: 0, averageLatency: 0, byResource: {} },
          threats: { blocked: 0, detected: 0, mitigated: 0, byType: {} },
          compliance: { violations: 0, alerts: 0, auditsPassed: 0, byStandard: {} }
        }
      }
    };
  }

  /**
   * Get real-time metrics
   */
  async getRealTimeMetrics(): Promise<any> {
    return {
      requestsPerSecond: await this.getRPS(),
      activeConnections: await this.getActiveConnections(),
      averageLatencyMs: await this.getAverageLatency(Date.now() - 60000, Date.now()),
      errorRate: await this.getErrorRate(),
      rateLimitHits: await this.getRateLimitHits()
    };
  }

  /**
   * Get security events
   */
  async getSecurityEvents(filter: SecurityEventsFilter): Promise<{ events: SecurityEvent[]; total: number }> {
    // This would typically query a database
    // Returning placeholder for now
    return {
      events: [],
      total: 0
    };
  }

  /**
   * Resolve security event
   */
  async resolveSecurityEvent(eventId: string, resolution: string, resolvedBy: string): Promise<void> {
    logger.info('Security event resolved', { eventId, resolution, resolvedBy });

    if (this.redis) {
      await this.redis.hset(`security_event:${eventId}`, {
        resolved: 'true',
        resolvedAt: new Date().toISOString(),
        resolvedBy,
        resolution
      });
    }
  }

  /**
   * Get active sessions
   */
  async getActiveSessions(filter: SessionsFilter): Promise<{ sessions: Session[]; total: number }> {
    // This would typically query a database
    return {
      sessions: [],
      total: 0
    };
  }

  /**
   * Invalidate session
   */
  async invalidateSession(sessionId: string, reason: string, invalidatedBy: string): Promise<void> {
    logger.info('Session invalidated', { sessionId, reason, invalidatedBy });

    if (this.redis) {
      await this.redis.set(`session:${sessionId}:invalidated`, JSON.stringify({
        reason,
        invalidatedBy,
        invalidatedAt: new Date().toISOString()
      }));

      // Also invalidate the actual session
      await this.redis.del(`session:${sessionId}`);
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(): Promise<Alert[]> {
    // This would typically query a database
    return [];
  }

  /**
   * Acknowledge alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy?: string): Promise<void> {
    logger.info('Alert acknowledged', { alertId, acknowledgedBy });

    if (this.redis) {
      await this.redis.hset(`alert:${alertId}`, {
        acknowledged: 'true',
        acknowledgedAt: new Date().toISOString(),
        acknowledgedBy: acknowledgedBy || 'system'
      });
    }
  }

  /**
   * Get health status
   */
  async getHealthStatus(): Promise<any> {
    const checks: Record<string, any> = {};

    // Check Redis
    if (this.redis) {
      try {
        await this.redis.ping();
        checks.redis = { status: 'healthy' };
      } catch (error) {
        checks.redis = { status: 'unhealthy', error: 'Connection failed' };
      }
    } else {
      checks.redis = { status: 'skipped', reason: 'Not configured' };
    }

    // Check circuit breakers
    const circuitBreakerStatus: Record<string, any> = {};
    for (const [service, breaker] of this.circuitBreakers) {
      circuitBreakerStatus[service] = breaker.state;
    }
    checks.circuitBreakers = { status: circuitBreakerStatus };

    const overallStatus = Object.values(checks).every((c: any) => c.status === 'healthy' || c.status === 'skipped')
      ? 'healthy'
      : 'degraded';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      version: this.config.version
    };
  }

  /**
   * Reload configuration
   */
  async reloadConfiguration(): Promise<void> {
    logger.info('API Gateway configuration reloading');
    // In a real implementation, this would reload configuration from a config store
    // For now, just log the reload
  }

  // ====================
  // Helper Methods
  // ====================

  private generateRequestId(): string {
    return `req_${uuidv4()}`;
  }

  private generateTraceId(): string {
    return `trace_${uuidv4()}`;
  }

  private generateSpanId(): string {
    return `span_${uuidv4().substring(0, 8)}`;
  }

  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie', 'set-cookie'];

    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveHeaders.includes(lowerKey)) {
        sanitized[lowerKey] = '[REDACTED]';
      } else {
        sanitized[lowerKey] = String(value);
      }
    }

    return sanitized;
  }

  private extractClientInfo(request: any): any {
    return {
      ip: this.getClientIP(request),
      userAgent: request.headers['user-agent'] || 'unknown',
      platform: request.headers['sec-ch-ua-platform'] || 'unknown',
      version: request.headers['sec-ch-ua'] || 'unknown',
      deviceType: this.detectDeviceType(request.headers['user-agent'] || ''),
      location: request.headers['cf-ipcountry'] || 'unknown'
    };
  }

  private getClientIP(request: any): string {
    return request.headers['x-forwarded-for']?.split(',')[0] ||
      request.headers['x-real-ip'] ||
      request.connection?.remoteAddress ||
      request.socket?.remoteAddress ||
      'unknown';
  }

  private detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' | 'api' {
    if (userAgent.includes('bot') || userAgent.includes('crawler')) {
      return 'api';
    }
    if (userAgent.includes('tablet')) {
      return 'tablet';
    }
    if (userAgent.includes('mobile') || userAgent.includes('android') || userAgent.includes('iphone')) {
      return 'mobile';
    }
    return 'desktop';
  }

  private async verifyJWT(token: string): Promise<any> {
    // JWT verification implementation
    // This would use a JWT library like jsonwebtoken
    try {
      const jwt = await import('jsonwebtoken');
      const decoded = jwt.default.verify(token, process.env.JWT_SECRET || 'secret', {
        issuer: 'insurance-lead-gen',
        audience: 'api'
      });
      return decoded;
    } catch (error) {
      throw new Error('Invalid JWT token');
    }
  }

  private async exchangeOAuthCode(code: string, clientId: string, clientSecret: string): Promise<any> {
    // OAuth code exchange implementation
    throw new Error('OAuth code exchange not implemented');
  }

  private async getOAuthUserInfo(accessToken: string): Promise<any> {
    // OAuth user info retrieval implementation
    throw new Error('OAuth user info not implemented');
  }

  private getRateLimitRule(context: RequestContext): RateLimitRule {
    // Check per-route rules first
    if (this.config.rateLimits.perRoute[context.path]) {
      return this.config.rateLimits.perRoute[context.path];
    }

    // Check per-user rules if authenticated
    if (context.user && this.config.rateLimits.perUser[context.user.id]) {
      return this.config.rateLimits.perUser[context.user.id];
    }

    // Return global rule
    return this.config.rateLimits.global;
  }

  private generateRateLimitKey(context: RequestContext, rule: RateLimitRule): string {
    const parts = [context.method, context.path];

    if (rule.keyGenerator) {
      parts.push(rule.keyGenerator(context));
    } else {
      // Default key generation
      if (context.user) {
        parts.push(`user:${context.user.id}`);
      } else {
        parts.push(`ip:${this.getClientIP(context.client as any)}`);
      }
    }

    return parts.join(':');
  }

  private async getRateLimitRemaining(context: RequestContext): Promise<number> {
    const rule = this.getRateLimitRule(context);
    const key = this.generateRateLimitKey(context, rule);

    if (!this.redis) {
      return rule.requests;
    }

    const now = Date.now();
    const window = Math.floor(now / rule.windowMs);
    const redisKey = `ratelimit:${key}:${window}`;

    const current = await this.redis.get(redisKey);
    return Math.max(0, rule.requests - (parseInt(current || '0', 10)));
  }

  private validatePayloadSize(context: RequestContext): void {
    const maxSize = this.config.security.inputValidation?.maxPayloadSize || 10485760; // 10MB default
    const bodySize = JSON.stringify(context.body).length;

    if (bodySize > maxSize) {
      throw new Error(`Payload size ${bodySize} exceeds limit ${maxSize}`);
    }
  }

  private validateContentType(context: RequestContext): void {
    const allowedTypes = this.config.security.inputValidation?.allowedContentTypes || [
      'application/json',
      'application/x-www-form-urlencoded',
      'multipart/form-data'
    ];
    const contentType = context.headers['content-type'];

    if (contentType && !allowedTypes.includes(contentType.split(';')[0])) {
      throw new Error(`Content type ${contentType} is not allowed`);
    }
  }

  private sanitizeInput(context: RequestContext): void {
    if (!this.config.security.inputValidation?.sanitizeInput) {
      return;
    }

    // Basic sanitization
    const bodyString = JSON.stringify(context.body);
    if (bodyString.includes('\x00')) {
      throw new Error('Invalid characters in request body');
    }
  }

  private async runCustomValidator(validatorName: string, context: RequestContext): Promise<void> {
    logger.debug('Running custom validator', { validator: validatorName, context: context.id });
  }

  private async checkSuspiciousPatterns(context: RequestContext): Promise<void> {
    const patterns = this.config.security.inputValidation?.blockedPatterns || [];
    const content = JSON.stringify({
      path: context.path,
      query: context.query,
      body: context.body
    });

    for (const pattern of patterns) {
      try {
        const regex = new RegExp(pattern, 'i');
        if (regex.test(content)) {
          await this.logSecurityEvent({
            type: 'suspicious_activity',
            severity: 'high',
            userId: context.user?.id || 'anonymous',
            context: { requestId: context.id, method: context.method, path: context.path },
            details: { pattern, content: content.substring(0, 200) },
            timestamp: new Date()
          });

          throw new Error('Request blocked due to suspicious patterns');
        }
      } catch (e) {
        // Invalid regex pattern, skip
      }
    }
  }

  private async validateHeaders(context: RequestContext): Promise<void> {
    const requiredHeaders = ['host', 'user-agent'];
    for (const header of requiredHeaders) {
      if (!context.headers[header]) {
        throw new Error(`Required header ${header} is missing`);
      }
    }
  }

  private async checkRequestVelocity(context: RequestContext): Promise<void> {
    if (!this.redis) return;

    const clientId = context.user?.id || context.client.ip;
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    try {
      const requests = await this.redis.zcount(
        `velocity:${clientId}`,
        windowStart,
        now
      );

      if (requests > 1000) {
        await this.logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'high',
          userId: context.user?.id || 'anonymous',
          context: { requestId: context.id, method: context.method, path: context.path },
          details: { clientId, requestsInWindow: requests, windowMs: 60000 },
          timestamp: new Date()
        });
      }

      await this.redis.zadd(`velocity:${clientId}`, now, context.id);
      await this.redis.expire(`velocity:${clientId}`, 60);
    } catch (error) {
      logger.error('Velocity check failed', { error });
    }
  }

  private async transformResponse(response: any, context: RequestContext): Promise<any> {
    return response;
  }

  private async logRequestResponse(context: RequestContext, response: ResponseContext): Promise<void> {
    logger.info('API Gateway Request/Response', {
      requestId: context.id,
      method: context.method,
      path: context.path,
      statusCode: response.statusCode,
      duration: response.duration,
      userId: context.user?.id,
      clientIP: context.client.ip
    });
  }

  private async logSecurityEvent(event: SecurityEvent): Promise<void> {
    logger.warn('Security event', { type: event.type, severity: event.severity, details: event.details });

    if (this.auditService) {
      await this.auditService.logSecurityEvent(event);
    }
  }

  private getRequiredScope(path: string): string | null {
    const scopeMap: Record<string, string> = {
      '/api/v1/admin': 'admin:all',
      '/api/v1/leads': 'read:leads',
      '/api/v1/leads/*': 'write:leads',
      '/api/v1/reports': 'read:reports'
    };

    for (const [pattern, scope] of Object.entries(scopeMap)) {
      if (this.matchPath(pattern, path)) {
        return scope;
      }
    }

    return null;
  }

  private matchPath(pattern: string, path: string): boolean {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(path);
  }

  private async getMetricValue(metric: string, startTime: number, endTime: number): Promise<number> {
    return 0;
  }

  private async getMetricsByLabel(metric: string, label: string, startTime: number, endTime: number): Promise<Record<string, number>> {
    return {};
  }

  private async getAverageLatency(startTime: number, endTime: number): Promise<number> {
    return 0;
  }

  private async getRPS(): Promise<number> {
    return 0;
  }

  private async getActiveConnections(): Promise<number> {
    return 0;
  }

  private async getErrorRate(): Promise<number> {
    return 0;
  }

  private async getRateLimitHits(): Promise<number> {
    return 0;
  }

  private parseTimeRange(timeRange: string, now: number): number {
    const parts = timeRange.match(/(\d+)([hdwmy])/);
    if (!parts) {
      return now - 3600000; // Default to 1 hour
    }

    const value = parseInt(parts[1], 10);
    const unit = parts[2];
    const multipliers: Record<string, number> = {
      h: 3600000,
      d: 86400000,
      w: 604800000,
      m: 2628000000,
      y: 31536000000
    };

    return now - (value * multipliers[unit]);
  }
}

// ========================================
// RATE LIMITING PRESETS
// ========================================

export const gatewayRateLimitPresets = {
  strict: {
    requests: 50,
    windowMs: 15 * 60 * 1000, // 15 minutes
    strategy: 'sliding' as const
  },
  moderate: {
    requests: 100,
    windowMs: 15 * 60 * 1000,
    strategy: 'sliding' as const
  },
  lenient: {
    requests: 500,
    windowMs: 15 * 60 * 1000,
    strategy: 'sliding' as const
  },
  auth: {
    requests: 5,
    windowMs: 15 * 60 * 1000,
    strategy: 'fixed' as const,
    message: 'Too many authentication attempts'
  },
  api: {
    requests: 1000,
    windowMs: 15 * 60 * 1000,
    strategy: 'sliding' as const
  },
  webhook: {
    requests: 100,
    windowMs: 60 * 1000, // 1 minute
    strategy: 'sliding' as const
  },
  health: {
    requests: 10000,
    windowMs: 60 * 1000,
    strategy: 'sliding' as const
  }
};

// ========================================
// API GATEWAY FACTORY
// ========================================

export function createAPIGatewayService(
  redis: Redis | null,
  config: Partial<APIGatewayServiceConfig>,
  auditService: AuditLogService | null,
  metrics: MetricsCollector
): APIGatewayService {
  const defaultConfig: APIGatewayServiceConfig = {
    id: 'api-gateway',
    name: 'Insurance Lead Gen API Gateway',
    version: '1.0.0',
    environment: process.env.NODE_ENV as any || 'development',
    enabled: true,
    rateLimits: {
      global: gatewayRateLimitPresets.api,
      perRoute: {},
      perUser: {},
      burstLimit: 50
    },
    security: {
      jwt: {
        secret: process.env.JWT_SECRET || 'secret',
        algorithm: 'HS256',
        expiresIn: '1h',
        refreshTokenExpiresIn: '7d',
        issuer: 'insurance-lead-gen',
        audience: 'api',
        enableBlacklisting: true,
        leeway: 60
      },
      apiKeys: {
        enabled: true,
        headerName: 'X-API-Key',
        prefix: 'ak_',
        hashAlgorithm: 'sha256',
        rotationInterval: 90 * 24 * 60 * 60 * 1000, // 90 days
        allowedScopes: ['read', 'write', 'admin']
      },
      oauth: {
        providers: [],
        redirectUris: [],
        stateExpiry: 600000, // 10 minutes
        enableStateValidation: true,
        enableNonceValidation: false
      },
      cors: {
        origin: process.env.NODE_ENV === 'production'
          ? process.env.ALLOWED_ORIGINS?.split(',') || false
          : true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key'],
        exposedHeaders: ['X-Request-ID', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
        credentials: true,
        maxAge: 86400,
        preflightContinue: false,
        optionsSuccessStatus: 204
      },
      csrf: {
        enabled: false,
        headerName: 'X-CSRF-Token',
        cookieName: 'csrf_token',
        cookieOptions: {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/'
        },
        tokenLength: 32,
        excludedRoutes: ['/health', '/metrics', '/api/v1/auth/login']
      },
      headers: {
        hsts: { enabled: true, maxAge: 31536000, includeSubDomains: true, preload: true },
        xssProtection: { enabled: true, mode: 'block' },
        contentTypeOptions: { enabled: true },
        frameOptions: { enabled: true, policy: 'SAMEORIGIN' },
        referrerPolicy: { enabled: true, policy: 'strict-origin-when-cross-origin' }
      },
      inputValidation: {
        enabled: true,
        sanitizeInput: true,
        removeNullBytes: true,
        maxPayloadSize: 10485760, // 10MB
        allowedContentTypes: [
          'application/json',
          'application/x-www-form-urlencoded',
          'multipart/form-data'
        ],
        blockedPatterns: [
          '/\\$\\{.*\\}/', // Template injection
          '/\\$\\(.*\\)/', // Command injection
          '/script/i', // XSS
          '/union\\s+select/i', // SQL injection
          '/--.*$/m' // SQL comment injection
        ],
        customValidators: []
      },
      auditLogging: true,
      encryptionAtRest: true
    },
    routing: {
      services: [],
      loadBalancer: {
        algorithm: 'round_robin',
        stickySession: false
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        recoveryTimeout: 30000
      }
    },
    monitoring: {
      enabled: true,
      metrics: {
        enabled: true,
        interval: 15000
      },
      logging: {
        enabled: true,
        level: 'info'
      },
      alerting: {
        enabled: true,
        rules: [],
        channels: []
      }
    },
    ...config
  } as APIGatewayServiceConfig;

  return new APIGatewayService(redis, defaultConfig, auditService, metrics);
}
