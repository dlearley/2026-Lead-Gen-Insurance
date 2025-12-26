import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, SpanStatusCode, Span } from '@opentelemetry/api';

export interface TracingConfig {
  serviceName: string;
  serviceVersion?: string;
  jaegerEndpoint?: string;
  environment?: string;
}

export class TracingService {
  private sdk: NodeSDK | null = null;
  private serviceName: string;

  constructor(config: TracingConfig) {
    this.serviceName = config.serviceName;

    // Configure Jaeger exporter
    const jaegerExporter = new JaegerExporter({
      endpoint: config.jaegerEndpoint || process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    });

    // Initialize OpenTelemetry SDK
    this.sdk = new NodeSDK({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: config.serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: config.serviceVersion || '1.0.0',
        environment: config.environment || process.env.NODE_ENV || 'development',
      }),
      traceExporter: jaegerExporter,
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false, // Disable fs instrumentation to reduce noise
          },
        }),
      ],
    });
  }

  /**
   * Start the tracing SDK
   */
  start(): void {
    if (this.sdk) {
      this.sdk.start();
      console.log(`OpenTelemetry tracing initialized for ${this.serviceName}`);
    }
  }

  /**
   * Shutdown the tracing SDK gracefully
   */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      try {
        await this.sdk.shutdown();
        console.log('OpenTelemetry tracing shut down successfully');
      } catch (error) {
        console.error('Error shutting down OpenTelemetry:', error);
      }
    }
  }

  /**
   * Get the tracer for the service
   */
  getTracer() {
    return trace.getTracer(this.serviceName);
  }

  /**
   * Create a span and execute a function within it
   */
  async withSpan<T>(
    name: string,
    fn: (span: Span) => Promise<T>,
    attributes?: Record<string, string | number | boolean>
  ): Promise<T> {
    const tracer = this.getTracer();
    return await tracer.startActiveSpan(name, async (span) => {
      try {
        if (attributes) {
          span.setAttributes(attributes);
        }
        const result = await fn(span);
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
}

/**
 * Initialize tracing for a service
 */
export function initializeTracing(config: TracingConfig): TracingService {
  const tracingService = new TracingService(config);
  tracingService.start();

  // Handle process termination
  process.on('SIGTERM', async () => {
    await tracingService.shutdown();
  });

  process.on('SIGINT', async () => {
    await tracingService.shutdown();
  });

  return tracingService;
}
