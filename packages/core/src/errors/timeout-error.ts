import { AppError } from './app-error.js';
import type { ErrorContextData } from './error-metadata.js';

export class TimeoutError extends AppError {
  constructor(
    message = 'Request timed out.',
    public readonly timeout: number,
    context?: ErrorContextData,
    metadata: Record<string, unknown> = {}
  ) {
    super(message, {
      errorCode: 'TIMEOUT_001',
      httpStatusCode: 504,
      severity: 'medium',
      retryable: true,
      suggestedAction: 'The request took too long to complete. Please retry.',
      metadata: {
        timeout,
        ...metadata,
        ...context
      },
      userMessage: 'The request timed out. Please try again.'
    });

    Object.setPrototypeOf(this, TimeoutError.prototype);
  }

  public static operation(
    operation: string,
    timeout: number,
    context?: ErrorContextData
  ): TimeoutError {
    return new TimeoutError(
      `Operation '${operation}' timed out`,
      timeout,
      context,
      {
        operation,
        reason: 'operation_timeout'
      }
    );
  }

  public static connection(service: string, timeout: number, context?: ErrorContextData): TimeoutError {
    return new TimeoutError(
      `Connection to '${service}' timed out`,
      timeout,
      context,
      {
        service,
        reason: 'connection_timeout'
      }
    );
  }
}