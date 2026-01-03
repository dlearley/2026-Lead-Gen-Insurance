import { AppError } from './app-error.js';
import type { ErrorContextData } from './error-metadata.js';

export class ServiceUnavailableError extends AppError {
  constructor(
    message = 'Service temporarily unavailable.',
    context?: ErrorContextData,
    metadata: Record<string, unknown> = {}
  ) {
    super(message, {
      errorCode: 'SERVICE_UNAVAILABLE_001',
      httpStatusCode: 503,
      severity: 'high',
      retryable: true,
      suggestedAction: 'The service is temporarily overloaded. Please retry after a short delay.',
      metadata: { ...metadata, ...context },
      userMessage: message
    });

    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }

  public static dueToOverload(context?: ErrorContextData): ServiceUnavailableError {
    return new ServiceUnavailableError(
      'Service is temporarily overloaded',
      context,
      { reason: 'overload' }
    );
  }

  public static maintenanceMode(context?: ErrorContextData): ServiceUnavailableError {
    return new ServiceUnavailableError(
      'Service is in maintenance mode',
      context,
      { reason: 'maintenance' }
    );
  }
}