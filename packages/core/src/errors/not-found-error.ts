import { AppError } from './app-error.js';
import type { ErrorContextData } from './error-metadata.js';

export class NotFoundError extends AppError {
  constructor(
    message = 'Requested resource not found.',
    context?: ErrorContextData,
    metadata: Record<string, unknown> = {}
  ) {
    super(message, {
      errorCode: 'NOT_FOUND_001',
      httpStatusCode: 404,
      severity: 'low',
      retryable: false,
      suggestedAction: 'Please verify the resource identifier and try again.',
      metadata: { ...metadata, ...context },
      userMessage: message
    });

    Object.setPrototypeOf(this, NotFoundError.prototype);
  }

  public static resource(
    resourceType: string,
    resourceId: string,
    context?: ErrorContextData
  ): NotFoundError {
    return new NotFoundError(
      `${resourceType} with ID '${resourceId}' not found`,
      context,
      {
        resourceType,
        resourceId,
        reason: 'resource_not_found'
      }
    );
  }

  public static endpoint(path: string, context?: ErrorContextData): NotFoundError {
    return new NotFoundError(
      `Endpoint '${path}' not found`,
      context,
      {
        reason: 'endpoint_not_found',
        path
      }
    );
  }
}