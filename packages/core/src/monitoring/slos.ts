import { Gauge, Counter, Histogram } from 'prom-client';
import { trace, SpanStatusCode, context } from '@opentelemetry/api';

// SLO Definitions
interface SLODefinition {
  name: string;
  description: string;
  target: number; // Percentage (e.g., 99.9 = 99.9%)
  window: string; // Time window (e.g., '28d', '7d', '1d')
  service: string;
  metricType: 'availability' | 'latency' | 'throughput' | 'correctness';
  threshold?: number; // For latency (ms), throughput (rps), etc.
}

// Error Budget Tracking
interface ErrorBudget {
  sloName: string;
  totalBudget: number; // Total error budget in minutes/hours
  consumedBudget: number; // Consumed error budget
  remainingBudget: number; // Remaining error budget
  burnRate: number; // Current burn rate
  lastUpdated: Date;
}

// SLO Metrics
const sloAvailabilityGauge = new Gauge({
  name: 'slo_availability_percentage',
  help: 'Current SLO availability percentage',
  labelNames: ['slo_name', 'service', 'window']
});

const sloErrorBudgetGauge = new Gauge({
  name: 'slo_error_budget_remaining',
  help: 'Remaining error budget in percentage',
  labelNames: ['slo_name', 'service']
});

const sloErrorBudgetBurnRateGauge = new Gauge({
  name: 'slo_error_budget_burn_rate',
  help: 'Current error budget burn rate',
  labelNames: ['slo_name', 'service']
});

const sloViolationsCounter = new Counter({
  name: 'slo_violations_total',
  help: 'Total SLO violations',
  labelNames: ['slo_name', 'service', 'severity']
});

const sloLatencyHistogram = new Histogram({
  name: 'slo_latency_seconds',
  help: 'SLO latency measurements',
  labelNames: ['slo_name', 'service', 'quantile'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30]
});

// Predefined SLOs for Insurance Lead Gen Platform
const SLO_DEFINITIONS: SLODefinition[] = [
  // API Service SLOs
  {
    name: 'api_availability',
    description: 'API Service Availability',
    target: 99.9,
    window: '28d',
    service: 'api-service',
    metricType: 'availability'
  },
  {
    name: 'api_latency_p95',
    description: 'API Service P95 Latency',
    target: 99.9,
    window: '7d',
    service: 'api-service',
    metricType: 'latency',
    threshold: 500 // 500ms
  },
  {
    name: 'api_latency_p99',
    description: 'API Service P99 Latency',
    target: 99.95,
    window: '7d',
    service: 'api-service',
    metricType: 'latency',
    threshold: 1000 // 1000ms
  },
  {
    name: 'api_error_rate',
    description: 'API Service Error Rate',
    target: 99.9,
    window: '28d',
    service: 'api-service',
    metricType: 'correctness'
  },
  {
    name: 'api_throughput',
    description: 'API Service Throughput',
    target: 99.9,
    window: '1d',
    service: 'api-service',
    metricType: 'throughput',
    threshold: 100 // 100 requests per second
  },

  // Data Service SLOs
  {
    name: 'data_service_availability',
    description: 'Data Service Availability',
    target: 99.95,
    window: '28d',
    service: 'data-service',
    metricType: 'availability'
  },
  {
    name: 'data_service_latency_p95',
    description: 'Data Service P95 Latency',
    target: 99.9,
    window: '7d',
    service: 'data-service',
    metricType: 'latency',
    threshold: 300 // 300ms
  },
  {
    name: 'data_service_error_rate',
    description: 'Data Service Error Rate',
    target: 99.95,
    window: '28d',
    service: 'data-service',
    metricType: 'correctness'
  },

  // Orchestrator Service SLOs
  {
    name: 'orchestrator_availability',
    description: 'Orchestrator Service Availability',
    target: 99.9,
    window: '28d',
    service: 'orchestrator',
    metricType: 'availability'
  },
  {
    name: 'orchestrator_latency_p95',
    description: 'Orchestrator Service P95 Latency',
    target: 99.9,
    window: '7d',
    service: 'orchestrator',
    metricType: 'latency',
    threshold: 800 // 800ms
  },
  {
    name: 'lead_processing_success_rate',
    description: 'Lead Processing Success Rate',
    target: 99.9,
    window: '28d',
    service: 'orchestrator',
    metricType: 'correctness'
  },

  // AI Service SLOs
  {
    name: 'ai_model_latency_p95',
    description: 'AI Model P95 Latency',
    target: 99.9,
    window: '7d',
    service: 'ai-service',
    metricType: 'latency',
    threshold: 2000 // 2000ms
  },
  {
    name: 'ai_model_success_rate',
    description: 'AI Model Success Rate',
    target: 99.5,
    window: '28d',
    service: 'ai-service',
    metricType: 'correctness'
  },

  // Database SLOs
  {
    name: 'database_availability',
    description: 'Database Availability',
    target: 99.99,
    window: '28d',
    service: 'postgres',
    metricType: 'availability'
  },
  {
    name: 'database_query_latency_p95',
    description: 'Database Query P95 Latency',
    target: 99.9,
    window: '7d',
    service: 'postgres',
    metricType: 'latency',
    threshold: 100 // 100ms
  }
];

// Error Budget Store
const errorBudgets: Record<string, ErrorBudget> = {};

// Initialize SLOs and Error Budgets
function initializeSLOs(): void {
  SLO_DEFINITIONS.forEach(slo => {
    // Initialize error budget tracking
    const budgetKey = `${slo.service}_${slo.name}`;
    errorBudgets[budgetKey] = {
      sloName: slo.name,
      totalBudget: calculateTotalErrorBudget(slo),
      consumedBudget: 0,
      remainingBudget: calculateTotalErrorBudget(slo),
      burnRate: 0,
      lastUpdated: new Date()
    };

    // Set initial SLO metrics
    sloAvailabilityGauge.set(100, { slo_name: slo.name, service: slo.service, window: slo.window });
    sloErrorBudgetGauge.set(100, { slo_name: slo.name, service: slo.service });
    sloErrorBudgetBurnRateGauge.set(0, { slo_name: slo.name, service: slo.service });
  });
}

// Calculate total error budget based on SLO target
function calculateTotalErrorBudget(slo: SLODefinition): number {
  const windowInDays = parseWindowToDays(slo.window);
  const availabilityTarget = slo.target / 100;
  const unavailabilityAllowed = 1 - availabilityTarget;
  
  // Calculate in minutes for easier tracking
  const totalMinutesInWindow = windowInDays * 24 * 60;
  return totalMinutesInWindow * unavailabilityAllowed;
}

// Parse window string to days
function parseWindowToDays(window: string): number {
  const match = window.match(/^(\d+)(\w)$/);
  if (!match) return 1;
  
  const value = parseInt(match[1]);
  const unit = match[2];
  
  switch (unit) {
    case 'd': return value;
    case 'w': return value * 7;
    case 'm': return value * 30; // Approximate
    default: return value;
  }
}

// Update SLO metrics based on actual performance
function updateSLOMetrics(sloName: string, service: string, successRate: number, latencyMs?: number): void {
  const tracer = trace.getTracer('slo-manager');
  
  return context.with(trace.setSpan(context.active(), tracer.startSpan('updateSLOMetrics')), () => {
    try {
      const slo = SLO_DEFINITIONS.find(s => s.name === sloName && s.service === service);
      if (!slo) {
        throw new Error(`SLO not found: ${sloName} for service ${service}`);
      }

      const budgetKey = `${service}_${sloName}`;
      const errorBudget = errorBudgets[budgetKey];
      
      if (!errorBudget) {
        throw new Error(`Error budget not found for SLO: ${sloName}`);
      }

      // Calculate availability percentage
      const availability = successRate * 100;
      sloAvailabilityGauge.set(availability, { slo_name: sloName, service, window: slo.window });

      // Update error budget based on current performance
      const targetAvailability = slo.target;
      const errorRate = 100 - availability;
      const allowedErrorRate = 100 - targetAvailability;
      
      // Calculate consumed budget (simplified calculation)
      const timeSinceLastUpdate = (new Date().getTime() - errorBudget.lastUpdated.getTime()) / (1000 * 60); // minutes
      const consumedInPeriod = (errorRate / 100) * timeSinceLastUpdate;
      
      errorBudget.consumedBudget = Math.min(errorBudget.totalBudget, errorBudget.consumedBudget + consumedInPeriod);
      errorBudget.remainingBudget = Math.max(0, errorBudget.totalBudget - errorBudget.consumedBudget);
      errorBudget.lastUpdated = new Date();

      // Calculate burn rate (consumption rate relative to budget)
      if (timeSinceLastUpdate > 0) {
        errorBudget.burnRate = consumedInPeriod / timeSinceLastUpdate;
      }

      // Update error budget metrics
      const remainingPercentage = (errorBudget.remainingBudget / errorBudget.totalBudget) * 100;
      sloErrorBudgetGauge.set(remainingPercentage, { slo_name: sloName, service });
      sloErrorBudgetBurnRateGauge.set(errorBudget.burnRate, { slo_name: sloName, service });

      // Check for SLO violations
      if (availability < targetAvailability) {
        const severity = getViolationSeverity(targetAvailability, availability);
        sloViolationsCounter.inc({ slo_name: sloName, service, severity });
        
        // Add span event for SLO violation
        const span = trace.getSpan(context.active());
        if (span) {
          span.addEvent('SLO Violation', {
            slo_name: sloName,
            service,
            current_availability: availability,
            target_availability: targetAvailability,
            severity
          });
          span.setStatus({ code: SpanStatusCode.ERROR });
        }
      }

      // Update latency metrics if provided
      if (latencyMs !== undefined && slo.metricType === 'latency' && slo.threshold) {
        const latencySeconds = latencyMs / 1000;
        sloLatencyHistogram.observe(latencySeconds, { slo_name: sloName, service, quantile: 'p95' });
        
        // Check latency SLO violation
        if (latencyMs > slo.threshold) {
          const severity = 'warning';
          sloViolationsCounter.inc({ slo_name: sloName, service, severity });
        }
      }

      // Check error budget depletion
      if (errorBudget.remainingBudget <= 0) {
        // Error budget exhausted - trigger alert
        const span = trace.getSpan(context.active());
        if (span) {
          span.addEvent('Error Budget Exhausted', {
            slo_name: sloName,
            service,
            remaining_budget: errorBudget.remainingBudget,
            total_budget: errorBudget.totalBudget
          });
          span.setStatus({ code: SpanStatusCode.ERROR, message: 'Error budget exhausted' });
        }
      }

    } catch (error) {
      const span = trace.getSpan(context.active());
      if (span) {
        span.recordException(error as Error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error instanceof Error ? error.message : 'Unknown error' });
      }
      console.error('Error updating SLO metrics:', error);
    } finally {
      const span = trace.getSpan(context.active());
      span?.end();
    }
  });
}

// Get violation severity based on how far from target
function getViolationSeverity(target: number, current: number): string {
  const difference = target - current;
  
  if (difference > 5) return 'critical'; // More than 5% below target
  if (difference > 2) return 'warning'; // 2-5% below target
  return 'minor'; // Less than 2% below target
}

// Get current error budget status
function getErrorBudgetStatus(sloName: string, service: string): ErrorBudget | null {
  const budgetKey = `${service}_${sloName}`;
  return errorBudgets[budgetKey] || null;
}

// Get all SLO definitions
function getAllSLODefinitions(): SLODefinition[] {
  return [...SLO_DEFINITIONS];
}

// Get SLO by name and service
function getSLODefinition(sloName: string, service: string): SLODefinition | null {
  return SLO_DEFINITIONS.find(s => s.name === sloName && s.service === service) || null;
}

// Calculate remaining time until error budget exhaustion
function calculateTimeToExhaustion(sloName: string, service: string): number {
  const budgetKey = `${service}_${sloName}`;
  const errorBudget = errorBudgets[budgetKey];
  
  if (!errorBudget || errorBudget.burnRate <= 0) {
    return Infinity;
  }
  
  return errorBudget.remainingBudget / errorBudget.burnRate;
}

// Reset error budgets (e.g., at start of new SLO window)
function resetErrorBudgets(): void {
  Object.keys(errorBudgets).forEach(key => {
    const errorBudget = errorBudgets[key];
    const slo = SLO_DEFINITIONS.find(s => s.name === errorBudget.sloName);
    
    if (slo) {
      errorBudget.consumedBudget = 0;
      errorBudget.remainingBudget = calculateTotalErrorBudget(slo);
      errorBudget.burnRate = 0;
      errorBudget.lastUpdated = new Date();
      
      // Update metrics
      sloErrorBudgetGauge.set(100, { slo_name: errorBudget.sloName, service: errorBudget.sloName.split('_')[0] });
      sloErrorBudgetBurnRateGauge.set(0, { slo_name: errorBudget.sloName, service: errorBudget.sloName.split('_')[0] });
    }
  });
}

// Check if error budget is depleted
function isErrorBudgetDepleted(sloName: string, service: string): boolean {
  const budgetKey = `${service}_${sloName}`;
  const errorBudget = errorBudgets[budgetKey];
  return errorBudget ? errorBudget.remainingBudget <= 0 : false;
}

// Get error budget consumption rate
function getErrorBudgetConsumptionRate(sloName: string, service: string): number {
  const budgetKey = `${service}_${sloName}`;
  const errorBudget = errorBudgets[budgetKey];
  return errorBudget ? errorBudget.burnRate : 0;
}

export {
  initializeSLOs,
  updateSLOMetrics,
  getErrorBudgetStatus,
  getAllSLODefinitions,
  getSLODefinition,
  calculateTimeToExhaustion,
  resetErrorBudgets,
  isErrorBudgetDepleted,
  getErrorBudgetConsumptionRate,
  SLO_DEFINITIONS
};