/**
 * Winston Transport with OpenTelemetry Integration
 * 
 * Provides structured logging that includes trace context from OpenTelemetry.
 * Logs are sent to Loki via OpenTelemetry Log Processor.
 */

import winston from 'winston';
import { trace } from '@opentelemetry/api';

/**
 * Trace information extracted from OpenTelemetry context
 */
export interface TraceInfo {
  traceId?: string;
  spanId?: string;
  traceFlags?: string;
}

/**
 * Format that adds trace context to log entries
 */
class TraceContextFormat extends winston.Logform.Format {
  constructor() {
    super();
  }

  transform(info: any, opts: any) {
    // Extract trace context from OpenTelemetry
    const span = trace.getActiveSpan();
    const spanContext = span?.spanContext();

    if (spanContext) {
      info.traceId = spanContext.traceId;
      info.spanId = spanContext.spanId;
      info.traceFlags = `0${spanContext.traceFlags.toString(16)}`;
    }

    return info;
  }
}

/**
 * Format for JSON logs with trace context
 */
export const traceContextFormat = () => {
  return winston.format.combine(
    winston.format.timestamp({ format: 'isoDateTime' }),
    winston.format.errors({ stack: true }),
    new TraceContextFormat(),
    winston.format.json()
  );
};

/**
 * Format for console logs with trace context
 */
export const consoleFormat = () => {
  return winston.format.combine(
    winston.format.colorize({ all: true }),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf((info: any) => {
      const { timestamp, level, message, traceId, spanId, ...rest } = info;
      
      let logLine = `${timestamp} [${level}]: ${message}`;
      
      if (traceId) {
        logLine += ` (trace: ${traceId.substring(0, 8)}... span: ${spanId?.substring(0, 8)}...)`;
      }
      
      // Add additional context
      if (Object.keys(rest).length > 0) {
        logLine += ` ${JSON.stringify(rest)}`;
      }
      
      return logLine;
    })
  );
};

/**
 * Get trace context for structured logging
 */
export function getTraceContext(): TraceInfo {
  const span = trace.getActiveSpan();
  const spanContext = span?.spanContext();

  if (!spanContext) {
    return {};
  }

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: `0${spanContext.traceFlags.toString(16)}`,
  };
}

/**
 * Create a Winston logger with OpenTelemetry trace context
 */
export interface LoggerConfig {
  serviceName: string;
  environment?: string;
  level?: string;
  enableConsole?: boolean;
  enableFile?: boolean;
  enableStructured?: boolean;
}

export function createOtelLogger(config: LoggerConfig): winston.Logger {
  const transports: winston.transport[] = [];

  // Console transport (always enabled in development)
  if (config.enableConsole !== false || config.environment === 'development') {
    transports.push(
      new winston.transports.Console({
        format: consoleFormat(),
      })
    );
  }

  // File transport for production
  if (config.enableFile && config.environment === 'production') {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: traceContextFormat(),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      })
    );

    transports.push(
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: traceContextFormat(),
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
      })
    );
  }

  // Create logger with service context
  const logger = winston.createLogger({
    level: config.level || (config.environment === 'production' ? 'info' : 'debug'),
    defaultMeta: {
      service: config.serviceName,
      environment: config.environment || process.env.NODE_ENV || 'development',
    },
    transports,
  });

  return logger;
}

/**
 * Create a child logger with additional context
 */
export function createChildLogger(parentLogger: winston.Logger, context: Record<string, any>): winston.Logger {
  return parentLogger.child(context);
}

/**
 * Log an error with full context including stack trace and trace information
 */
export function logError(
  logger: winston.Logger,
  error: Error | unknown,
  message: string,
  context?: Record<string, any>
): void {
  const traceContext = getTraceContext();
  
  logger.error(message, {
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
    ...traceContext,
    ...context,
  });
}

/**
 * Log a warning with trace context
 */
export function logWarning(
  logger: winston.Logger,
  message: string,
  context?: Record<string, any>
): void {
  const traceContext = getTraceContext();
  
  logger.warn(message, {
    ...traceContext,
    ...context,
  });
}

/**
 * Log info with trace context
 */
export function logInfo(
  logger: winston.Logger,
  message: string,
  context?: Record<string, any>
): void {
  const traceContext = getTraceContext();
  
  logger.info(message, {
    ...traceContext,
    ...context,
  });
}

/**
 * Log debug with trace context
 */
export function logDebug(
  logger: winston.Logger,
  message: string,
  context?: Record<string, any>
): void {
  const traceContext = getTraceContext();
  
  logger.debug(message, {
    ...traceContext,
    ...context,
  });
}
