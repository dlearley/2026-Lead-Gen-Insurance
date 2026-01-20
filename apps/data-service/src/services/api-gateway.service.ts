import { 
  APIGatewayConfig, 
  AuthenticationRequest, 
  AuthenticationResult,
  RequestContext,
  ResponseContext,
  RateLimitRule,
  SecurityConfig,
  PerformanceMetrics
} from '@insurance-lead-gen/types';
import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { logger, AuditLogService, MetricsCollector } from '@insurance-lead-gen/core';

export class APIGatewayService {
  private redis: Redis;
  private config: APIGatewayConfig;
  private auditService: AuditLogService;
  private metrics: MetricsCollector;

  constructor(
    redis: Redis,
    config: APIGatewayConfig,
    auditService: AuditLogService,
    metrics: MetricsCollector
  ) {
    this.redis = redis;
    this.config = config;
    this.auditService = auditService;
    this.metrics = metrics;
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
      await this.auditService.logSecurityEvent({
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

    // Verify token (implementation depends on your JWT library)
    // This is a placeholder for the actual JWT verification logic
    const decoded = await this.verifyJWT(token);
    
    // Check if token is blacklisted
    const isBlacklisted = await this.redis.sismember('jwt_blacklist', decoded.jti);
    if (isBlacklisted) {
      throw new Error('Token has been revoked');
    }

    // Check token expiration
    if (decoded.exp && Date.now() / 1000 > decoded.exp) {
      throw new Error('Token has expired');
    }

    // Check session validity
    const session = await this.redis.get(`session:${decoded.sessionId}`);
    if (!session) {
      throw new Error('Invalid session');
    }

    const sessionData = JSON.parse(session);
    if (!sessionData.isActive) {
      throw new Error('Session has been invalidated');
    }

    return {
      success: true,
      user: {
        id: decoded.sub,
        email: decoded.email,
        username: decoded.username,
        roles: decoded.roles,
        permissions: decoded.permissions,
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

    // Exchange code for access token (implementation depends on OAuth provider)
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
    const now = Date.now();
    const window = Math.floor(now / rule.windowMs);
    const redisKey = `ratelimit:${key}:${window}`;

    const current = await this.redis.incr(redisKey);
    if (current === 1) {
      await this.redis.pexpire(redisKey, rule.windowMs);
    }

    if (current > rule.requests) {
      await this.auditService.logSecurityEvent({
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

      throw new Error(`Rate limit exceeded. Try again later.`);
    }
  }

  /**
   * Input validation
   */
  private async validateInput(context: RequestContext): Promise<void> {
    if (!this.config.security.inputValidation.enabled) {
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
   * Generate performance metrics
   */
  async getPerformanceMetrics(timeRange: string): Promise<PerformanceMetrics> {
    // Implementation would aggregate metrics from Redis
    const now = Date.now();
    const startTime = this.parseTimeRange(timeRange, now);

    // This is a simplified implementation
    return {
      requests: {
        total: await this.getMetricValue('api_gateway_requests_total', startTime, now),
        successful: await this.getMetricValue('api_gateway_requests_success_total', startTime, now),
        failed: await this.getMetricValue('api_gateway_requests_failed_total', startTime, now),
        byMethod: await this.getMetricsByLabel('api_gateway_requests_total', 'method', startTime, now),
        byRoute: await this.getMetricsByLabel('api_gateway_requests_total', 'route', startTime, now)
      },
      responses: {
        total: 0, // Would be calculated
        byStatusCode: {},
        byContentType: {},
        compressed: 0,
        cached: 0,
        errors: 0
      },
      latency: {
        average: await this.getAverageLatency(startTime, now),
        median: 0, // Would calculate
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

  // Helper methods
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
    // For now, returning a placeholder
    throw new Error('JWT verification not implemented');
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
    // Return appropriate rate limit rule based on context
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
        parts.push(`ip:${context.client.ip}`);
      }
    }
    
    return parts.join(':');
  }

  private validatePayloadSize(context: RequestContext): void {
    const maxSize = this.config.security.inputValidation.maxPayloadSize;
    const bodySize = JSON.stringify(context.body).length;
    
    if (bodySize > maxSize) {
      throw new Error(`Payload size ${bodySize} exceeds limit ${maxSize}`);
    }
  }

  private validateContentType(context: RequestContext): void {
    const allowedTypes = this.config.security.inputValidation.allowedContentTypes;
    const contentType = context.headers['content-type'];
    
    if (contentType && !allowedTypes.includes(contentType)) {
      throw new Error(`Content type ${contentType} is not allowed`);
    }
  }

  private sanitizeInput(context: RequestContext): void {
    if (!this.config.security.inputValidation.sanitizeInput) {
      return;
    }

    // Basic sanitization - remove null bytes, etc.
    const bodyString = JSON.stringify(context.body);
    if (bodyString.includes('\x00')) {
      throw new Error('Invalid characters in request body');
    }
  }

  private async runCustomValidator(validatorName: string, context: RequestContext): Promise<void> {
    // Custom validator implementation
    logger.debug('Running custom validator', { validator: validatorName, context: context.id });
  }

  private async checkSuspiciousPatterns(context: RequestContext): Promise<void> {
    const patterns = this.config.security.inputValidation.blockedPatterns;
    const content = JSON.stringify({
      path: context.path,
      query: context.query,
      body: context.body
    });

    for (const pattern of patterns) {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(content)) {
        await this.auditService.logSecurityEvent({
          type: 'suspicious_activity',
          severity: 'high',
          userId: context.user?.id || 'anonymous',
          context: { requestId: context.id, method: context.method, path: context.path },
          details: { pattern, content: content.substring(0, 200) },
          timestamp: new Date()
        });
        
        throw new Error('Request blocked due to suspicious patterns');
      }
    }
  }

  private async validateHeaders(context: RequestContext): Promise<void> {
    // Validate required headers
    const requiredHeaders = ['host', 'user-agent'];
    for (const header of requiredHeaders) {
      if (!context.headers[header]) {
        throw new Error(`Required header ${header} is missing`);
      }
    }
  }

  private async checkRequestVelocity(context: RequestContext): Promise<void> {
    const clientId = context.client.ip;
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    const requests = await this.redis.zcount(
      `velocity:${clientId}`,
      windowStart,
      now
    );

    if (requests > 1000) { // 1000 requests per minute threshold
      await this.auditService.logSecurityEvent({
        type: 'suspicious_activity',
        severity: 'high',
        userId: context.user?.id || 'anonymous',
        context: { requestId: context.id, method: context.method, path: context.path },
        details: { clientId, requestsInWindow: requests, windowMs: 60000 },
        timestamp: new Date()
      });
    }

    await this.redis.zadd(`velocity:${clientId}`, now, context.id);
    await this.redis.expire(`velocity:${clientId}`, 60); // Keep for 1 minute
  }

  private async getRateLimitRemaining(context: RequestContext): Promise<number> {
    const rule = this.getRateLimitRule(context);
    const key = this.generateRateLimitKey(context, rule);
    const now = Date.now();
    const window = Math.floor(now / rule.windowMs);
    const redisKey = `ratelimit:${key}:${window}`;

    const current = await this.redis.get(redisKey);
    return Math.max(0, rule.requests - (parseInt(current || '0')));
  }

  private async transformResponse(response: any, context: RequestContext): Promise<any> {
    // Response transformation logic
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

  private getRequiredScope(path: string): string | null {
    // Map paths to required scopes
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
    // Implementation for getting metric values
    return 0;
  }

  private async getMetricsByLabel(metric: string, label: string, startTime: number, endTime: number): Promise<Record<string, number>> {
    // Implementation for getting metrics by label
    return {};
  }

  private async getAverageLatency(startTime: number, endTime: number): Promise<number> {
    // Implementation for calculating average latency
    return 0;
  }

  private parseTimeRange(timeRange: string, now: number): number {
    // Parse time range string to timestamp
    const parts = timeRange.match(/(\d+)([hdwmy])/);
    if (!parts) {
      return now - 3600000; // Default to 1 hour
    }

    const value = parseInt(parts[1]);
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