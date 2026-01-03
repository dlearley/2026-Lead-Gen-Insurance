import { AppError } from './app-error.js';
import type { ErrorContextData } from './error-metadata.js';

export interface ValidationErrorDetails {
  field: string;
  type: string;
  message: string;
  value?: unknown;
  path?: string[];
}

export class ValidationError extends AppError {
  constructor(
    message: string,
    public readonly fields: ValidationErrorDetails[],
    context?: ErrorContextData
  ) {
    super(message, {
      errorCode: 'VALIDATION_001',
      httpStatusCode: 400,
      severity: 'low',
      retryable: false,
      suggestedAction: 'Please check your input data and try again.',
      metadata: {
        affectedFields: fields.map(f => f.field),
        validationErrors: fields,
        ...context
      },
      userMessage: message
    });

    Object.setPrototypeOf(this, ValidationError.prototype);
  }

  public static fromZodError(zodError: any): ValidationError {
    const fields: ValidationErrorDetails[] = zodError.errors.map((error: any) => ({
      field: error.path.join('.'),
      type: error.code,
      message: error.message,
      path: error.path
    }));

    return new ValidationError(
      `Validation failed for ${fields.length} field(s)`,
      fields,
      {
        operation: 'validation',
        service: 'api'
      }
    );
  }

  public static forField(field: string, message: string, value?: unknown): ValidationError {
    return new ValidationError(
      `Validation failed for field '${field}': ${message}`,
      [{ field, type: 'custom', message, value }],
      {
        operation: 'field_validation',
        service: 'api'
      }
    );
  }
}