import { AppError } from './app-error.js';
import type { ErrorContextData } from './error-metadata.js';

export class ExternalServiceError extends AppError {
  constructor(
    message = 'External service error occurred.',
    context?: ErrorContextData,
    metadata: Record<string, unknown> = {}
  ) {
    super(message, {
      errorCode: 'EXTERNAL_SERVICE_001',
      httpStatusCode: 502,
      severity: 'high',
      retryable: true,
      suggestedAction: 'Please retry the request. If the problem persists, contact support.',
      metadata: { ...metadata, ...context },
      userMessage: 'An error occurred with an external service. Please try again later.'
    });

    Object.setPrototypeOf(this, ExternalServiceError.prototype);
  }

  public static unavailable(serviceName: string, context?: ErrorContextData): ExternalServiceError {
    return new ExternalServiceError(
      `External service '${serviceName}' is unavailable`,
      context,
      {
        serviceName,
        reason: 'service_unavailable'
      }
    );
  }

  public static unexpectedResponse(serviceName: string, statusCode: number, context?: ErrorContextData): ExternalServiceError {
    return new ExternalServiceError(
      `Unexpected response from '${serviceName}' (status: ${statusCode})`,
      context,
      {
        serviceName,
        statusCode,
        reason: 'unexpected_response'
      }
    );
  }
}