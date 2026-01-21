import { AppError } from './app-error.js';
import type { ErrorContextData } from './error-metadata.js';

export interface DatabaseErrorDetails {
  query?: string;
  table?: string;
  errorCode?: string;
  nativeError?: Error;
}

export class DatabaseError extends AppError {
  public readonly details: DatabaseErrorDetails;

  constructor(
    message: string,
    details: DatabaseErrorDetails = {},
    context?: ErrorContextData,
    metadata: Record<string, unknown> = {}
  ) {
    // Determine error code based on error type
    let errorCode = 'DATABASE_001';
    if (details.errorCode) {
      const nativeErrorCode = details.errorCode.toUpperCase();
      if (nativeErrorCode.includes('CONNECTION')) {
        errorCode = 'DATABASE_CONNECTION_001';
      } else if (nativeErrorCode.includes('TIMEOUT')) {
        errorCode = 'DATABASE_TIMEOUT_001';
      } else if (nativeErrorCode.includes('UNIQUE')) {
        errorCode = 'DATABASE_UNIQUE_001';
      } else if (nativeErrorCode.includes('FK')) {
        errorCode = 'DATABASE_FOREIGN_KEY_001';
      } else if (nativeErrorCode.includes('NULL')) {
        errorCode = 'DATABASE_NULL_001';
      }
    }

    const suggestion = getDatabaseErrorSuggestion(details.errorCode || '');

    super(message, {
      errorCode,
      httpStatusCode: 500,
      severity: 'high',
      retryable: isRetryableDatabaseError(details.errorCode || ''),
      suggestedAction: suggestion,
      metadata: {
        ...metadata,
        ...details,
        query: details.query ? sanitizeQuery(details.query) : undefined,
        ...context
      },
      userMessage: 'A database error occurred. Please try again later.'
    });

    this.details = details;
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }

  public static queryFailed(query: string, error: Error, context?: ErrorContextData): DatabaseError {
    return new DatabaseError(
      `Database query failed: ${error.message}`,
      {
        query,
        errorCode: getNativeErrorCode(error),
        nativeError: error
      },
      context
    );
  }

  public static connectionFailed(error: Error, context?: ErrorContextData): DatabaseError {
    return new DatabaseError(
      `Database connection failed: ${error.message}`,
      {
        errorCode: 'CONNECTION_ERROR',
        nativeError: error
      },
      context
    );
  }
}

/**
 * Determines if a database error is likely retryable
 */
function isRetryableDatabaseError(errorCode: string): boolean {
  const retryableCodes = [
    'CONNECTION',
    'TIMEOUT',
    'DEADLOCK',
    'TRANSACTION_ROLLBACK',
    'UNAVAILABLE',
    'TOO_MANY_CONNECTIONS',
    'LOCK_WAIT_TIMEOUT'
  ];

  const upperErrorCode = errorCode.toUpperCase();
  return retryableCodes.some(code => upperErrorCode.includes(code));
}

/**
 * Gets user-friendly suggestion for resolving database errors
 */
function getDatabaseErrorSuggestion(errorCode: string): string {
  if (errorCode.includes('CONNECTION')) {
    return 'Database connection failed. Please retry the request. If the problem persists, contact support.';
  }
  if (errorCode.includes('TIMEOUT')) {
    return 'Database query timed out. This might be temporary. Please retry. If the issue continues, consider optimizing the query or contact support.';
  }
  if (errorCode.includes('UNIQUE')) {
    return 'A record with the same unique identifier already exists. Please check your data or use a different identifier.';
  }
  if (errorCode.includes('FK')) {
    return 'Cannot perform this operation as related records are missing. Please verify all required related data exists.';
  }
  if (errorCode.includes('NULL')) {
    return 'Required fields are missing or null. Please provide all required information.';
  }
  return 'A database error occurred. Please try again. If the problem persists, contact support.';
}

/**
 * Sanitizes SQL queries to prevent exposure of sensitive data
 */
function sanitizeQuery(query: string): string {
  // Remove sensitive data from query strings
  return query
    .replace(/'[^']*'/g, '?')
    .replace(/\$\d+/g, '?')
    .replace(/:[a-zA-Z_][a-zA-Z0-9_]*/g, '?')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts native error code from error object
 */
function getNativeErrorCode(error: Error): string {
  const anyError = error as any;
  return anyError.code || anyError.errorCode || anyError.errno || 'UNKNOWN';
}