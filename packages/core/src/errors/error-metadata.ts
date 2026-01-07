export interface ErrorContext {
  id: string;
  errorCode: string;
  message: string;
  httpStatusCode: number;
  severity: ErrorSeverity;
  timestamp: string;
  metadata: Record<string, unknown>;
  retryable: boolean;
  suggestedAction?: string;
}

export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface ErrorContextData {
  service?: string;
  operation?: string;
  affectedResource?: string;
  affectedUserId?: string;
  affectedLeadId?: string;
  requestId?: string;
  traceId?: string;
  spanId?: string;
}