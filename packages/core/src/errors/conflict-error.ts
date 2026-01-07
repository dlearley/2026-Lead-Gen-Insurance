import { AppError } from './app-error.js';
import type { ErrorContextData } from './error-metadata.js';

export class ConflictError extends AppError {
  constructor(
    message = 'Resource conflict detected.',
    context?: ErrorContextData,
    metadata: Record<string, unknown> = {}
  ) {
    super(message, {
      errorCode: 'CONFLICT_001',
      httpStatusCode: 409,
      severity: 'medium',
      retryable: false,
      suggestedAction: 'Please check the resource state and try again.',
      metadata: { ...metadata, ...context },
      userMessage: message
    });

    Object.setPrototypeOf(this, ConflictError.prototype);
  }

  public static duplicateResource(resourceType: string, resourceId: string, context?: ErrorContextData): ConflictError {
    return new ConflictError(
      `${resourceType} with ID '${resourceId}' already exists`,
      context,
      {
        resourceType,
        resourceId,
        reason: 'duplicate_resource'
      }
    );
  }

  public static versionConflict(resourceType: string, resourceId: string, context?: ErrorContextData): ConflictError {
    return new ConflictError(
      `Version conflict for ${resourceType} with ID '${resourceId}'`,
      context,
      {
        resourceType,
        resourceId,
        reason: 'version_conflict'
      }
    );
  }
}