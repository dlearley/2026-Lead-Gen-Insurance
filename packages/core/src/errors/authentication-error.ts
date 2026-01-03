import { AppError } from './app-error.js';
import type { ErrorContextData } from './error-metadata.js';

export class AuthenticationError extends AppError {
  constructor(
    message = 'Authentication failed. Please check your credentials.',
    context?: ErrorContextData,
    metadata: Record<string, unknown> = {}
  ) {
    super(message, {
      errorCode: 'AUTH_001',
      httpStatusCode: 401,
      severity: 'medium',
      retryable: false,
      suggestedAction: 'Please verify your authentication token or credentials.',
      metadata: { ...metadata, ...context },
      userMessage: message
    });

    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }

  public static invalidToken(context?: ErrorContextData): AuthenticationError {
    return new AuthenticationError(
      'Invalid authentication token',
      context,
      { reason: 'invalid_token' }
    );
  }

  public static expiredToken(context?: ErrorContextData): AuthenticationError {
    return new AuthenticationError(
      'Authentication token has expired',
      context,
      { reason: 'expired_token' }
    );
  }

  public static missingToken(context?: ErrorContextData): AuthenticationError {
    return new AuthenticationError(
      'Missing authentication token',
      context,
      { reason: 'missing_token' }
    );
  }

  public static invalidCredentials(context?: ErrorContextData): AuthenticationError {
    return new AuthenticationError(
      'Invalid username or password',
      context,
      { reason: 'invalid_credentials' }
    );
  }
}