import { ApiResponse, ApiRequestOptions, IntegrationException } from '@insurance/types';
import logger from '../logger.js';

/**
 * Generic API Client for external integrations
 * Handles HTTP requests with retry logic, rate limiting, and error handling
 */
export class ApiClientService {
  private readonly defaultTimeout = 30000; // 30 seconds
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second
  private circuitBreakerService: any = null;

  /**
   * Set circuit breaker service instance
   */
  setCircuitBreakerService(service: any): void {
    this.circuitBreakerService = service;
  }

  /**
   * Execute an HTTP request to an external API
   */
  async request<T = unknown>(options: ApiRequestOptions, serviceId?: string): Promise<ApiResponse<T>> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    // Retry logic
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.executeRequest<T>(options);
        const duration = Date.now() - startTime;

        logger.info('API request successful', {
          method: options.method,
          url: this.sanitizeUrl(options.url),
          statusCode: response.statusCode,
          duration,
          attempt,
        });

        return {
          ...response,
          duration,
        };
      } catch (error) {
        lastError = error as Error;

        logger.warn('API request failed, retrying', {
          method: options.method,
          url: this.sanitizeUrl(options.url),
          attempt,
          maxRetries: this.maxRetries,
          error: lastError.message,
        });

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (this.isClientError(error) && !this.isRateLimitError(error)) {
          break;
        }

        // Wait before retrying (exponential backoff)
        if (attempt < this.maxRetries) {
          await this.sleep(this.retryDelay * Math.pow(2, attempt - 1));
        }
      }
    }

    // All retries failed
    const duration = Date.now() - startTime;
    logger.error('API request failed after all retries', {
      method: options.method,
      url: this.sanitizeUrl(options.url),
      duration,
      error: lastError?.message,
    });

    throw new IntegrationException(
      `API request failed: ${lastError?.message}`,
      'API_REQUEST_FAILED',
      { attempts: this.maxRetries, duration }
    );
  }

  /**
   * Execute a single HTTP request
   */
  private async executeRequest<T>(options: ApiRequestOptions, serviceId?: string): Promise<ApiResponse<T>> {
    const requestFn = async () => {
      return this.doExecuteRequest<T>(options);
    };

    // Use circuit breaker if serviceId is provided
    if (serviceId && this.circuitBreakerService) {
      return this.circuitBreakerService.executeWithCircuitBreaker(serviceId, requestFn);
    }

    return requestFn();
  }

  /**
   * Do the actual HTTP request
   */
  private async doExecuteRequest<T>(options: ApiRequestOptions): Promise<ApiResponse<T>> {
    const timeout = options.timeout || this.defaultTimeout;

    const url = this.buildUrl(options.url, options.query);

    const fetchOptions: RequestInit = {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal: AbortSignal.timeout(timeout),
    };

    if (options.body && ['POST', 'PUT', 'PATCH'].includes(options.method)) {
      fetchOptions.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }

    const response = await fetch(url, fetchOptions);

    let data: T | undefined;
    let error;

    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = (await response.json()) as T;
      } else {
        data = (await response.text()) as T;
      }
    } catch (parseError) {
      logger.warn('Failed to parse response body', { error: parseError });
    }

    if (!response.ok) {
      error = {
        code: this.getErrorCode(response.status),
        message: data && typeof data === 'object' && 'message' in data ? (data as { message: string }).message : response.statusText,
        details: data,
      };
    }

    return {
      success: response.ok,
      data,
      error,
      statusCode: response.status,
      headers: this.extractHeaders(response),
    };
  }

  /**
   * Build URL with query parameters
   */
  private buildUrl(url: string, query?: Record<string, string>): string {
    if (!query || Object.keys(query).length === 0) {
      return url;
    }

    const queryString = new URLSearchParams(query).toString();
    return `${url}${url.includes('?') ? '&' : '?'}${queryString}`;
  }

  /**
   * Extract headers from response
   */
  private extractHeaders(response: Response): Record<string, string> {
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });
    return headers;
  }

  /**
   * Check if error is a client error (4xx)
   */
  private isClientError(error: unknown): boolean {
    if (error instanceof IntegrationException) {
      return false;
    }

    // Check if it's a fetch response with status code
    const status = this.extractStatusCode(error);
    return status !== null && status >= 400 && status < 500;
  }

  /**
   * Check if error is a rate limit error (429)
   */
  private isRateLimitError(error: unknown): boolean {
    const status = this.extractStatusCode(error);
    return status === 429;
  }

  /**
   * Extract status code from error
   */
  private extractStatusCode(error: unknown): number | null {
    if (error instanceof IntegrationException && error.details) {
      const details = error.details as { statusCode?: number };
      return details.statusCode ?? null;
    }
    return null;
  }

  /**
   * Get error code from status code
   */
  private getErrorCode(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'BAD_REQUEST';
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 429:
        return 'RATE_LIMIT_EXCEEDED';
      case 500:
        return 'INTERNAL_SERVER_ERROR';
      case 502:
        return 'BAD_GATEWAY';
      case 503:
        return 'SERVICE_UNAVAILABLE';
      case 504:
        return 'GATEWAY_TIMEOUT';
      default:
        return 'UNKNOWN_ERROR';
    }
  }

  /**
   * Sanitize URL for logging (remove sensitive data)
   */
  private sanitizeUrl(url: string): string {
    return url.replace(/([?&](api_key|token|password|secret)=)[^&]*/g, '$1***');
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  async get<T>(url: string, options?: Omit<ApiRequestOptions, 'method' | 'url'>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'GET', url });
  }

  /**
   * POST request
   */
  async post<T>(url: string, body: Record<string, unknown> | string, options?: Omit<ApiRequestOptions, 'method' | 'url' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'POST', url, body });
  }

  /**
   * PUT request
   */
  async put<T>(url: string, body: Record<string, unknown> | string, options?: Omit<ApiRequestOptions, 'method' | 'url' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'PUT', url, body });
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, body: Record<string, unknown> | string, options?: Omit<ApiRequestOptions, 'method' | 'url' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'PATCH', url, body });
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, options?: Omit<ApiRequestOptions, 'method' | 'url'>): Promise<ApiResponse<T>> {
    return this.request<T>({ ...options, method: 'DELETE', url });
  }
}
