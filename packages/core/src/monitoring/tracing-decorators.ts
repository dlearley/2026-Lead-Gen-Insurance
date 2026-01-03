/**
 * Tracing Decorators
 * 
 * Decorators for automatic instrumentation with OpenTelemetry:
 * - @Trace: Wrap a function or method with a span
 * - @SpanAttribute: Mark method parameters as span attributes
 * - @SpanEvent: Add events to the span
 * - @InstrumentClass: Instrument all methods of a class
 */

import 'reflect-metadata';
import { trace, Span, SpanStatusCode, Attributes } from '@opentelemetry/api';

/**
 * Metadata key for storing span name
 */
const SPAN_NAME_KEY = Symbol('span_name');

/**
 * Metadata key for storing span attributes
 */
const SPAN_ATTRIBUTES_KEY = Symbol('span_attributes');

/**
 * Metadata key for storing span events
 */
const SPAN_EVENTS_KEY = Symbol('span_events');

/**
 * Trace decorator options
 */
export interface TraceOptions {
  name?: string;
  attributes?: Record<string, any>;
}

/**
 * Decorator to wrap a function or method with a span
 * 
 * @example
 * ```typescript
 * @Trace()
 * async processLead(leadId: string) {
 *   // This method will be wrapped with a span
 * }
 * 
 * @Trace({ name: 'custom.operation' })
 * async customMethod() {
 *   // Custom span name
 * }
 * ```
 */
export function Trace(options: TraceOptions = {}) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const spanName = options.name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const tracer = trace.getTracer(target.constructor.name);
      
      return await tracer.startActiveSpan(spanName, async (span) => {
        try {
          // Add attributes from decorator
          if (options.attributes) {
            span.setAttributes(options.attributes as Attributes);
          }

          // Add attributes from parameters marked with @SpanAttribute
          const paramAttributes = Reflect.getOwnMetadata(SPAN_ATTRIBUTES_KEY, target, propertyKey) || {};
          Object.entries(paramAttributes).forEach(([index, attributeKey]: [string, any]) => {
            const value = args[parseInt(index)];
            if (value !== undefined) {
              span.setAttribute(attributeKey, typeof value === 'object' ? JSON.stringify(value) : value);
            }
          });

          // Execute original method
          const result = await originalMethod.apply(this, args);

          // Add success status
          span.setStatus({ code: SpanStatusCode.OK });

          // Add events from @SpanEvent decorator
          const events = Reflect.getOwnMetadata(SPAN_EVENTS_KEY, target, propertyKey) || [];
          events.forEach((event: any) => {
            span.addEvent(event.name, event.attributes);
          });

          return result;
        } catch (error) {
          // Record error
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
 * Decorator to mark a method parameter as a span attribute
 * 
 * @example
 * ```typescript
 * @Trace()
 * async processLead(
 *   @SpanAttribute('lead.id') leadId: string,
 *   @SpanAttribute('lead.type') type: string
 * ) {
 *   // leadId will be logged as 'lead.id'
 *   // type will be logged as 'lead.type'
 * }
 * ```
 */
export function SpanAttribute(attributeKey: string) {
  return function (target: any, propertyKey: string, parameterIndex: number) {
    const existingAttributes = Reflect.getOwnMetadata(SPAN_ATTRIBUTES_KEY, target, propertyKey) || {};
    existingAttributes[parameterIndex] = attributeKey;
    Reflect.defineMetadata(SPAN_ATTRIBUTES_KEY, existingAttributes, target, propertyKey);
  };
}

/**
 * Decorator to add an event to the span
 * 
 * @example
 * ```typescript
 * @Trace()
 * @SpanEvent('processing.started', { stage: 'initialization' })
 * async processLead(leadId: string) {
 *   // Event will be added when method starts
 * }
 * ```
 */
export function SpanEvent(name: string, attributes?: Record<string, any>) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const existingEvents = Reflect.getOwnMetadata(SPAN_EVENTS_KEY, target, propertyKey) || [];
    existingEvents.push({ name, attributes });
    Reflect.defineMetadata(SPAN_EVENTS_KEY, existingEvents, target, propertyKey);
  };
}

/**
 * Decorator to instrument all methods of a class
 * 
 * @example
 * ```typescript
 * @InstrumentClass()
 * class LeadService {
 *   @Trace({ name: 'lead.create' })
 *   async createLead(data: LeadData) { }
 * 
 *   @Trace({ name: 'lead.update' })
 *   async updateLead(id: string, data: Partial<LeadData>) { }
 * }
 * 
 * // All methods with @Trace will be instrumented
 * ```
 */
export function InstrumentClass() {
  return function <T extends { new (...args: any[]): {} }>(constructor: T) {
    const className = constructor.name;

    // Get all property descriptors
    const descriptors = Object.getOwnPropertyDescriptors(constructor.prototype);

    // Wrap all methods with @Trace decorator
    Object.entries(descriptors).forEach(([propertyKey, descriptor]) => {
      if (typeof descriptor.value === 'function' && propertyKey !== 'constructor') {
        // Check if method already has @Trace decorator
        const hasTrace = Reflect.hasOwnMetadata(SPAN_NAME_KEY, constructor.prototype, propertyKey);
        
        if (!hasTrace) {
          const originalMethod = descriptor.value;
          descriptor.value = async function (...args: any[]) {
            const tracer = trace.getTracer(className);
            
            return await tracer.startActiveSpan(`${className}.${propertyKey}`, async (span) => {
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
        }
      }
    });

    return constructor;
  };
}

/**
 * Helper function to manually create a span
 * 
 * @example
 * ```typescript
 * withSpan('manual.operation', { key: 'value' }, async (span) => {
 *   // Do work
 *   span.addEvent('event.name', { key: 'value' });
 * });
 * ```
 */
export function withSpan<T>(
  name: string,
  attributes: Record<string, any>,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const tracer = trace.getTracer('manual');
  
  return tracer.startActiveSpan(name, async (span) => {
    try {
      if (attributes) {
        span.setAttributes(attributes as Attributes);
      }
      return await fn(span);
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
 * Helper to add an event to the current active span
 * 
 * @example
 * ```typescript
 * addSpanEvent('lead.created', { leadId: '123' });
 * ```
 */
export function addSpanEvent(name: string, attributes?: Record<string, any>): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes as Attributes);
  }
}

/**
 * Helper to set an attribute on the current active span
 * 
 * @example
 * ```typescript
 * setSpanAttribute('lead.id', '123');
 * setSpanAttribute('lead.score', 85);
 * ```
 */
export function setSpanAttribute(key: string, value: any): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttribute(key, typeof value === 'object' ? JSON.stringify(value) : value);
  }
}

/**
 * Helper to record an exception on the current active span
 * 
 * @example
 * ```typescript
 * try {
 *   // ... code that might throw
 * } catch (error) {
 *   recordException(error);
 *   throw error;
 * }
 * ```
 */
export function recordException(error: Error): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}
