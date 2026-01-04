import { trace, SpanStatusCode, Span } from '@opentelemetry/api';

/**
 * Decorator to trace a method
 * @param name Optional name for the span, defaults to method name
 */
export function Trace(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const tracer = trace.getTracer('default');
      const spanName = name || `${target.constructor.name}.${propertyKey}`;

      return tracer.startActiveSpan(spanName, async (span: Span) => {
        try {
          const result = await originalMethod.apply(this, args);
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
    };

    return descriptor;
  };
}

/**
 * Decorator to add an attribute to the current span
 */
export function SpanAttribute(key: string) {
  return function (
    target: any,
    propertyKey: string,
    parameterIndex: number
  ) {
    const originalMethod = target[propertyKey];
    // This is more complex to implement purely with decorators on parameters
    // Usually handled by reflecting on arguments inside the @Trace decorator
  };
}

/**
 * Decorator to record a span event
 */
export function SpanEvent(name: string) {
  // Similar to SpanAttribute
}
