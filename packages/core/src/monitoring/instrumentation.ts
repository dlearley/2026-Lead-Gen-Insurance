/**
 * Manual Instrumentation Helpers
 * 
 * Helper functions for manual instrumentation of:
 * - Database queries
 * - AI/ML operations
 * - Queue operations
 * - External API calls
 */

import { trace, Span, Context, SpanContext } from '@opentelemetry/api';
import { getSpanContext } from '@opentelemetry/api';

/**
 * Database query instrumentation
 */
export class DatabaseInstrumentation {
  /**
   * Instrument a database query
   */
  static async instrumentQuery<T>(
    operation: string,
    table: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const tracer = trace.getTracer('database');
    
    return await tracer.startActiveSpan('database.query', async (span) => {
      try {
        span.setAttribute('db.operation', operation);
        span.setAttribute('db.table', table);
        span.setAttribute('db.system', 'postgresql');

        const startTime = Date.now();
        const result = await queryFn();
        const duration = Date.now() - startTime;

        span.setAttribute('db.duration_ms', duration);
        span.setAttribute('db.row_count', Array.isArray(result) ? result.length : 1);

        // Track slow queries
        if (duration > 100) {
          span.setAttribute('db.slow_query', true);
          span.addEvent('slow_query', { duration_ms: duration });
        }

        span.setStatus({ code: 0 });
        return result;
      } catch (error) {
        span.setStatus({
          code: 2,
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
   * Instrument database connection
   */
  static async instrumentConnection<T>(
    operation: 'connect' | 'disconnect',
    connectionFn: () => Promise<T>
  ): Promise<T> {
    const tracer = trace.getTracer('database');
    
    return await tracer.startActiveSpan(`database.${operation}`, async (span) => {
      try {
        span.setAttribute('db.operation', operation);
        span.setAttribute('db.system', 'postgresql');

        const result = await connectionFn();

        span.setStatus({ code: 0 });
        return result;
      } catch (error) {
        span.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

/**
 * AI/ML instrumentation
 */
export class AIInstrumentation {
  /**
   * Instrument an AI model call
   */
  static async instrumentModelCall<T>(
    model: string,
    operation: string,
    params: Record<string, any>,
    callFn: () => Promise<T>
  ): Promise<T> {
    const tracer = trace.getTracer('ai');
    
    return await tracer.startActiveSpan('ai.model_call', async (span) => {
      try {
        span.setAttribute('ai.model', model);
        span.setAttribute('ai.operation', operation);
        span.setAttribute('ai.provider', 'openai');
        span.setAttribute('ai.params', JSON.stringify(params));

        const startTime = Date.now();
        const result = await callFn();
        const duration = Date.now() - startTime;

        span.setAttribute('ai.latency_ms', duration);

        // Extract and record token usage if available
        if (result && typeof result === 'object' && 'usage' in result) {
          const usage = (result as any).usage;
          if (usage) {
            span.setAttribute('ai.tokens.prompt', usage.prompt_tokens || 0);
            span.setAttribute('ai.tokens.completion', usage.completion_tokens || 0);
            span.setAttribute('ai.tokens.total', usage.total_tokens || 0);
          }
        }

        span.setStatus({ code: 0 });
        return result;
      } catch (error) {
        span.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.setAttribute('ai.error_type', error instanceof Error ? error.name : 'Unknown');
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }

  /**
   * Record AI model accuracy
   */
  static recordAccuracy(model: string, operation: string, accuracy: number): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttribute('ai.model', model);
      span.setAttribute('ai.operation', operation);
      span.setAttribute('ai.accuracy', accuracy);
    }
  }

  /**
   * Instrument embedding generation
   */
  static async instrumentEmbedding<T>(
    model: string,
    texts: string[],
    callFn: () => Promise<T>
  ): Promise<T> {
    const tracer = trace.getTracer('ai');
    
    return await tracer.startActiveSpan('ai.embedding', async (span) => {
      try {
        span.setAttribute('ai.model', model);
        span.setAttribute('ai.operation', 'embedding');
        span.setAttribute('ai.text_count', texts.length);
        span.setAttribute('ai.total_chars', texts.reduce((sum, t) => sum + t.length, 0));

        const startTime = Date.now();
        const result = await callFn();
        const duration = Date.now() - startTime;

        span.setAttribute('ai.latency_ms', duration);
        span.setStatus({ code: 0 });
        return result;
      } catch (error) {
        span.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

/**
 * Queue instrumentation
 */
export class QueueInstrumentation {
  /**
   * Instrument a job processing
   */
  static async instrumentJob<T>(
    queueName: string,
    jobType: string,
    jobId: string,
    processFn: () => Promise<T>
  ): Promise<T> {
    const tracer = trace.getTracer('queue');
    
    return await tracer.startActiveSpan('queue.job_process', async (span) => {
      try {
        span.setAttribute('queue.name', queueName);
        span.setAttribute('queue.job_type', jobType);
        span.setAttribute('queue.job_id', jobId);

        const startTime = Date.now();
        const result = await processFn();
        const duration = Date.now() - startTime;

        span.setAttribute('queue.duration_ms', duration);
        span.setStatus({ code: 0 });
        return result;
      } catch (error) {
        span.setStatus({
          code: 2,
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
   * Instrument a job enqueue
   */
  static async instrumentEnqueue<T>(
    queueName: string,
    jobType: string,
    enqueueFn: () => Promise<T>
  ): Promise<T> {
    const tracer = trace.getTracer('queue');
    
    return await tracer.startActiveSpan('queue.job_enqueue', async (span) => {
      try {
        span.setAttribute('queue.name', queueName);
        span.setAttribute('queue.job_type', jobType);

        const result = await enqueueFn();
        span.setStatus({ code: 0 });
        return result;
      } catch (error) {
        span.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

/**
 * HTTP client instrumentation
 */
export class HTTPInstrumentation {
  /**
   * Instrument an HTTP request
   */
  static async instrumentRequest<T>(
    method: string,
    url: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const tracer = trace.getTracer('http');
    
    return await tracer.startActiveSpan('http.request', async (span) => {
      try {
        span.setAttribute('http.method', method);
        span.setAttribute('http.url', this.sanitizeUrl(url));

        const startTime = Date.now();
        const result = await requestFn();
        const duration = Date.now() - startTime;

        span.setAttribute('http.duration_ms', duration);
        span.setStatus({ code: 0 });
        return result;
      } catch (error) {
        span.setStatus({
          code: 2,
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
   * Sanitize URL to remove sensitive information
   */
  private static sanitizeUrl(url: string): string {
    return url.replace(/(api_key|token|password|secret)=([^&]*)/gi, '$1=***');
  }
}

/**
 * External API instrumentation
 */
export class ExternalAPIInstrumentation {
  /**
   * Instrument an external API call
   */
  static async instrumentAPICall<T>(
    apiName: string,
    endpoint: string,
    callFn: () => Promise<T>
  ): Promise<T> {
    const tracer = trace.getTracer('external_api');
    
    return await tracer.startActiveSpan('external_api.call', async (span) => {
      try {
        span.setAttribute('api.name', apiName);
        span.setAttribute('api.endpoint', endpoint);

        const startTime = Date.now();
        const result = await callFn();
        const duration = Date.now() - startTime;

        span.setAttribute('api.latency_ms', duration);
        span.setStatus({ code: 0 });
        return result;
      } catch (error) {
        span.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.setAttribute('api.error_type', error instanceof Error ? error.name : 'Unknown');
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

/**
 * Business process instrumentation
 */
export class BusinessProcessInstrumentation {
  /**
   * Instrument a lead processing workflow
   */
  static async instrumentLeadProcess<T>(
    leadId: string,
    stage: string,
    processFn: () => Promise<T>
  ): Promise<T> {
    const tracer = trace.getTracer('business_process');
    
    return await tracer.startActiveSpan('lead.process', async (span) => {
      try {
        span.setAttribute('lead.id', leadId);
        span.setAttribute('lead.stage', stage);

        const startTime = Date.now();
        const result = await processFn();
        const duration = Date.now() - startTime;

        span.setAttribute('lead.duration_ms', duration);
        span.setStatus({ code: 0 });
        return result;
      } catch (error) {
        span.setStatus({
          code: 2,
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
   * Instrument a broker operation
   */
  static async instrumentBrokerOperation<T>(
    brokerId: string,
    operation: string,
    operationFn: () => Promise<T>
  ): Promise<T> {
    const tracer = trace.getTracer('business_process');
    
    return await tracer.startActiveSpan('broker.operation', async (span) => {
      try {
        span.setAttribute('broker.id', brokerId);
        span.setAttribute('broker.operation', operation);

        const startTime = Date.now();
        const result = await operationFn();
        const duration = Date.now() - startTime;

        span.setAttribute('broker.duration_ms', duration);
        span.setStatus({ code: 0 });
        return result;
      } catch (error) {
        span.setStatus({
          code: 2,
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        span.recordException(error as Error);
        throw error;
      } finally {
        span.end();
      }
    });
  }
}

/**
 * Get current trace context for propagation
 */
export function getCurrentTraceContext(): SpanContext | undefined {
  const span = trace.getActiveSpan();
  return span?.spanContext();
}

/**
 * Propagate trace context to downstream services
 */
export function propagateTraceContext(): Record<string, string> {
  const spanContext = getCurrentTraceContext();
  if (!spanContext) {
    return {};
  }

  return {
    'traceparent': `00-${spanContext.traceId}-${spanContext.spanId}-${spanContext.traceFlags.toString(16).padStart(2, '0')}`,
  };
}
