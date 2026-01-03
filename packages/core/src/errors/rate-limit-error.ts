import { AppError } from './app-error.js';
import type { ErrorContextData } from './error-metadata.js';

export class RateLimitError extends AppError {
  constructor(
    message = 'Rate limit exceeded.',
    public readonly retryAfter: number,
    context?: ErrorContextData,
    metadata: Record<string, unknown> = {}
  ) {
    super(message, {
      errorCode: 'RATE_LIMIT_001',
      httpStatusCode: 429,
      severity: 'low',
      retryable: true,
      suggestedAction: `Please wait ${retryAfter} seconds before retrying.`,
      metadata: {
        retryAfter,
        ...metadata,
        ...context
      },
      userMessage: `Rate limit exceeded. Please retry after ${retryAfter} seconds.`
    });

    Object.setPrototypeOf(this, RateLimitError.prototype);
  }

  public static fromHeaders(
    retryAfterHeader: string | null,
    limit: number,
    current: number,
    context?: ErrorContextData
  ): RateLimitError {
    const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 60;
    return new RateLimitError(
      `Rate limit exceeded (${current}/${limit} requests)`,
      retryAfter,
      context,
      {
        limit,
        current,
        reason: 'rate_limit_exceeded'
      }
    );
  }
}