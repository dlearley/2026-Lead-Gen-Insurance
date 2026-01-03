import { AppError } from './app-error.js';
import type { ErrorContextData } from './error-metadata.js';

export class AuthorizationError extends AppError {
  constructor(
    message = 'You do not have permission to perform this action.',
    context?: ErrorContextData,
    metadata: Record<string, unknown> = {}
  ) {
    super(message, {
      errorCode: 'AUTHZ_001',
      httpStatusCode: 403,
      severity: 'medium',
      retryable: false,
      suggestedAction: 'Please check your permissions or contact your administrator.',
      metadata: { ...metadata, ...context },
      userMessage: message
    });

    Object.setPrototypeOf(this, AuthorizationError.prototype);
  }

  public static insufficientPermissions(context?: ErrorContextData): AuthorizationError {
    return new AuthorizationError(
      'Insufficient permissions for this operation',
      context,
      { reason: 'insufficient_permissions' }
    );
  }

  public static roleNotAllowed(context?: ErrorContextData): AuthorizationError {
    return new AuthorizationError(
      'Your role does not have permission for this action',
      context,
      { reason: 'role_not_allowed' }
    );
  }
}