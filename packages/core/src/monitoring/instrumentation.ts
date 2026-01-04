import { trace, Span, SpanStatusCode } from '@opentelemetry/api';

/**
 * Manual instrumentation helper for database queries
 */
export async function instrumentDatabaseQuery<T>(
  dbName: string,
  operation: string,
  query: string,
  fn: () => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer('database-instrumentation');
  return tracer.startActiveSpan(`DB ${dbName}: ${operation}`, async (span: Span) => {
    span.setAttributes({
      'db.system': dbName,
      'db.operation': operation,
      'db.statement': query,
    });
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Manual instrumentation helper for external HTTP calls
 */
export async function instrumentExternalCall<T>(
  service: string,
  method: string,
  url: string,
  fn: () => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer('external-call-instrumentation');
  return tracer.startActiveSpan(`HTTP ${method} ${service}`, async (span: Span) => {
    span.setAttributes({
      'http.method': method,
      'http.url': url,
      'peer.service': service,
    });
    try {
      const result = await fn();
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}
