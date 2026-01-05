// Observability setup

import { NodeSDK } from '@opentelemetry/sdk-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { JaegerExporter } from '@opentelemetry/exporter-jaeger'
import { Resource } from '@opentelemetry/resources'
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions'
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus'
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics'

export async function setupObservability(): Promise<void> {
  console.log('🔍 Setting up observability')

  // Jaeger exporter for traces
  const jaegerExporter = new JaegerExporter({
    serviceName: 'communication-service',
    endpoint: process.env.JAEGER_ENDPOINT || 'http://jaeger:14268/api/traces',
  })

  // Prometheus exporter for metrics
  const prometheusExporter = new PrometheusExporter({
    port: 9464,
  })

  const metricReader = new PeriodicExportingMetricReader({
    exporter: prometheusExporter,
    exportIntervalMillis: 1000,
  })

  const sdk = new NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: 'communication-service',
      [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
    }),
    traceExporter: jaegerExporter,
    metricReader,
    instrumentations: [getNodeAutoInstrumentations()],
  })

  await sdk.start()

  console.log('🔍 Observability configured')

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    await sdk.shutdown()
    console.log('🔍 Observability shutdown complete')
  })
}