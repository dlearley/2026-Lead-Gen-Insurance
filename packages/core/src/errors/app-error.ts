import { v4 as uuidv4 } from 'uuid';
import { ErrorSeverity, ErrorContext } from './error-metadata.js';

export type ErrorCode = string;

export interface AppErrorOptions {
  errorCode?: ErrorCode;
  httpStatusCode?: number;
  severity?: ErrorSeverity;
  metadata?: Record<string, unknown>;
  cause?: Error;
  userMessage?: string;
  retryable?: boolean;
  suggestedAction?: string;
}

export class AppError extends Error {
  public readonly id: string;
  public readonly errorCode: ErrorCode;
  public readonly httpStatusCode: number;
  public readonly severity: ErrorSeverity;
  public readonly metadata: Record<string, unknown>;
  public readonly timestamp: string;
  public readonly userMessage?: string;
  public readonly retryable: boolean;
  public readonly suggestedAction?: string;

  constructor(
    message: string,
    {
      errorCode = 'APP_001',
      httpStatusCode = 500,
      severity = 'medium',
      metadata = {},
      cause,
      userMessage,
      retryable = false,
      suggestedAction
    }: AppErrorOptions = {}
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.id = uuidv4();
    this.errorCode = errorCode;
    this.httpStatusCode = httpStatusCode;
    this.severity = severity;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
    this.userMessage = userMessage;
    this.retryable = retryable;
    this.suggestedAction = suggestedAction;

    if (cause) {
      this.cause = cause;
    }

    Error.captureStackTrace(this, this.constructor);
  }

  public toJSON(): ErrorContext {
    return {
      id: this.id,
      errorCode: this.errorCode,
      message: this.userMessage || this.message,
      httpStatusCode: this.httpStatusCode,
      severity: this.severity,
      timestamp: this.timestamp,
      metadata: this.metadata,
      retryable: this.retryable,
      suggestedAction: this.suggestedAction
    };
  }

  public toLogData(): Record<string, unknown> {
    const stack = this.stack?.split('\n').map(line => line.trim());
    
    return {
      errorId: this.id,
      errorCode: this.errorCode,
      message: this.message,
      severity: this.severity,
      timestamp: this.timestamp,
      httpStatusCode: this.httpStatusCode,
      metadata: this.metadata,
      cause: this.cause?.message,
      stack: process.env.NODE_ENV === 'development' ? stack : undefined
    };
  }
}