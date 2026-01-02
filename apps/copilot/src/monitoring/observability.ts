import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Meter, Span, SpanStatusCode, context, trace } from '@opentelemetry/api';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { WinstonInstrumentation } from '@opentelemetry/instrumentation-winston';
import * as winston from 'winston';

export class MonitoringService {
  private sdk: NodeSDK;
  private meter: Meter;
  private logger: winston.Logger;
  private metricsBuffer: Map<string, any> = new Map();

  constructor() {
    // Initialize logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
        winston.format.errors({ stack: true })
      ),
      defaultMeta: { service: 'copilot-service' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
    });

    // Initialize OpenTelemetry
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'copilot-service',
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '1.0.0',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
    });

    // Configure OTLP exporters
    const traceExporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'http://localhost:4317',
    });

    const metricExporter = new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4317',
    });

    // Prometheus exporter for pulling metrics
    const prometheusExporter = new PrometheusExporter(
      {
        port: parseInt(process.env.PROMETHEUS_PORT || '9092'),
        endpoint: '/metrics',
      },
      () => {
        this.logger.info('Prometheus server started');
      }
    );

    this.sdk = new NodeSDK({
      resource,
      spanProcessor: new BatchSpanProcessor(traceExporter),
      metricReader: new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 30000, // Export every 30 seconds
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-http': {
            ignoreIncomingPaths: ['/metrics', '/health'],
          },
        }),
        new WinstonInstrumentation(),
      ],
    });

    // Get meter for custom metrics
    this.meter = this.sdk.getMeter('copilot-meter');

    // Register custom metrics
    this.registerCustomMetrics();
  }

  initialize(): void {
    try {
      this.sdk.start();
      this.logger.info('OpenTelemetry SDK started');
    } catch (error) {
      this.logger.error('Failed to start OpenTelemetry SDK', { error });
    }
  }

  startSpan(name: string, attributes?: Record<string, any>): Span {
    const tracer = trace.getTracer('copilot-service');
    return tracer.startSpan(name, {
      attributes: {
        'service.name': 'copilot',
        ...attributes,
      },
    });
  }

  recordEvent(name: string, attributes?: Record<string, any>): void {
    const span = this.startSpan(`event.${name}`, attributes);
    span.addEvent(name, attributes);
    span.end();

    this.logger.info(`Event: ${name}`, attributes);
  }

  recordMetric(name: string, value: number, attributes?: Record<string, any>): void {
    const metricName = `copilot.${name}`;
    
    // Track in local buffer for quick access
    this.metricsBuffer.set(metricName, {
      value,
      attributes,
      timestamp: Date.now(),
    });

    // Create or update metric instrument
    try {
      // Use appropriate metric type based on name
      if (name.includes('duration') || name.includes('time')) {
        const histogram = this.meter.createHistogram(metricName, {
          description: `Histogram for ${name}`,
          unit: 'ms',
        });
        histogram.record(value, attributes);
      } else if (name.includes('count') || name.includes('total')) {
        const counter = this.meter.createCounter(metricName, {
          description: `Counter for ${name}`,
          unit: '1',
        });
        counter.add(value, attributes);
      } else {
        const gauge = this.meter.createGauge(metricName, {
          description: `Gauge for ${name}`,
          unit: '1',
        });
        gauge.record(value, attributes);
      }
    } catch (error) {
      this.logger.warn('Failed to record metric', { error, name, value });
    }
  }

  getMetrics(): string {
    let metrics = '';
    
    this.metricsBuffer.forEach((data, name) => {
      const labels = data.attributes 
        ? Object.entries(data.attributes).map(([k, v]) => `${k}="${v}"`).join(',')
        : '';
      const labelStr = labels ? `{${labels}}` : '';
      
      metrics += `${name}${labelStr} ${data.value} ${data.timestamp}\n`;
    });

    return metrics;
  }

  createLoggerConfig(serviceName: string): winston.LoggerOptions {
    return {
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: serviceName },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
      ],
    };
  }

  shutdown(): Promise<void> {
    this.logger.info('Shutting down monitoring service');
    return this.sdk.shutdown();
  }

  // Custom metric registration
  private registerCustomMetrics(): void {
    // Conversation metrics
    const conversationsTotal = this.meter.createCounter('copilot conversations total', {
      description: 'Total number of conversations',
    });

    const conversationDuration = this.meter.createHistogram('copilot conversation duration', {
      description: 'Duration of conversations',
      unit: 'ms',
    });

    // Message metrics
    const messagesProcessed = this.meter.createCounter('copilot messages processed total', {
      description: 'Total messages processed',
    });

    // Recommendation metrics
    const recommendationsGenerated = this.meter.createCounter('copilot recommendations generated total', {
      description: 'Total recommendations generated',
    });

    const recommendationAccuracy = this.meter.createGauge('copilot recommendation accuracy', {
      description: 'Recommendation accuracy rate',
    });

    // AI model metrics
    const aiModelLatency = this.meter.createHistogram('copilot ai model latency', {
      description: 'AI model response latency',
      unit: 'ms',
    });

    const aiModelErrors = this.meter.createCounter('copilot ai model errors total', {
      description: 'Total AI model errors',
    });

    // WebSocket metrics
    const websocketConnections = this.meter.createUpDownCounter('copilot websocket connections', {
      description: 'Active WebSocket connections',
    });

    // Cache metrics
    const cacheHitRate = this.meter.createGauge('copilot cache hit rate', {
      description: 'Knowledge base cache hit rate',
    });

    // Store metric instruments for later use
    (this as any).metrics = {
      conversationsTotal,
      conversationDuration,
      messagesProcessed,
      recommendationsGenerated,
      recommendationAccuracy,
      aiModelLatency,
      aiModelErrors,
      websocketConnections,
      cacheHitRate,
    };
  }
}

// Global monitoring instance
export const monitoring = new MonitoringService();

// Convenience exports
export { Span, SpanStatusCode, context, trace } from '@opentelemetry/api';