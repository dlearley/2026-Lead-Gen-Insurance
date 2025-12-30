import { Counter, Histogram, Gauge } from 'prom-client';
import { logger } from '../logger.js';

/**
 * Business KPI Metrics for Insurance Lead Generation Platform
 * Tracks key performance indicators across the entire insurance lifecycle
 */

export class BusinessMetrics {
  // Lead Generation Metrics
  static readonly leadsReceived = new Counter({
    name: 'insurance_leads_received_total',
    help: 'Total number of leads received',
    labelNames: ['source', 'type', 'carrier'],
  });

  static readonly leadsQualified = new Counter({
    name: 'insurance_leads_qualified_total',
    help: 'Total number of leads qualified',
    labelNames: ['source', 'type', 'carrier', 'qualification_score'],
  });

  static readonly leadsConverted = new Counter({
    name: 'insurance_leads_converted_total',
    help: 'Total number of leads converted to policies',
    labelNames: ['source', 'type', 'carrier', 'policy_type'],
  });

  static readonly leadConversionRate = new Gauge({
    name: 'insurance_lead_conversion_rate',
    help: 'Current lead conversion rate percentage',
    labelNames: ['timeframe', 'source'],
  });

  static readonly leadResponseTime = new Histogram({
    name: 'insurance_lead_response_time_seconds',
    help: 'Time from lead receipt to first response',
    labelNames: ['priority', 'source'],
    buckets: [0.5, 1, 2, 5, 10, 30, 60, 300],
  });

  // Agent/Broker Metrics
  static readonly agentAssignments = new Counter({
    name: 'insurance_agent_assignments_total',
    help: 'Total number of lead assignments to agents',
    labelNames: ['agent_id', 'agent_tier', 'assignment_type'],
  });

  static readonly agentConversions = new Counter({
    name: 'insurance_agent_conversions_total',
    help: 'Total conversions by agent',
    labelNames: ['agent_id', 'agent_tier', 'policy_type'],
  });

  static readonly agentResponseTime = new Histogram({
    name: 'insurance_agent_response_time_seconds',
    help: 'Agent response time to assigned leads',
    labelNames: ['agent_id', 'agent_tier'],
    buckets: [0.5, 1, 2, 5, 10, 30, 60, 300, 600],
  });

  static readonly agentPerformanceScore = new Gauge({
    name: 'insurance_agent_performance_score',
    help: 'Agent performance score (0-100)',
    labelNames: ['agent_id', 'agent_tier'],
  });

  // Policy Metrics
  static readonly policiesCreated = new Counter({
    name: 'insurance_policies_created_total',
    help: 'Total policies created',
    labelNames: ['policy_type', 'carrier', 'coverage_amount_tier'],
  });

  static readonly policiesPremium = new Histogram({
    name: 'insurance_policy_premium_amount',
    help: 'Policy premium amounts',
    labelNames: ['policy_type', 'carrier'],
    buckets: [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000],
  });

  static readonly policyProcessingTime = new Histogram({
    name: 'insurance_policy_processing_time_seconds',
    help: 'Time from quote to policy issuance',
    labelNames: ['policy_type', 'carrier'],
    buckets: [300, 600, 1800, 3600, 7200, 14400, 86400],
  });

  // Revenue Metrics
  static readonly revenueTotal = new Counter({
    name: 'insurance_revenue_total',
    help: 'Total revenue generated',
    labelNames: ['source', 'policy_type', 'payment_type'],
  });

  static readonly revenueMonthly = new Gauge({
    name: 'insurance_revenue_monthly',
    help: 'Monthly revenue',
    labelNames: ['month', 'year'],
  });

  static readonly commissionGenerated = new Counter({
    name: 'insurance_commission_generated_total',
    help: 'Total commission generated',
    labelNames: ['agent_id', 'policy_type'],
  });

  // Claims Metrics
  static readonly claimsFiled = new Counter({
    name: 'insurance_claims_filed_total',
    help: 'Total claims filed',
    labelNames: ['policy_type', 'claim_type', 'severity'],
  });

  static readonly claimsApproved = new Counter({
    name: 'insurance_claims_approved_total',
    help: 'Total claims approved',
    labelNames: ['policy_type', 'claim_type'],
  });

  static readonly claimsProcessingTime = new Histogram({
    name: 'insurance_claims_processing_time_seconds',
    help: 'Time from claim filing to resolution',
    labelNames: ['policy_type', 'claim_type'],
    buckets: [3600, 7200, 14400, 43200, 86400, 172800, 604800],
  });

  static readonly claimAmount = new Histogram({
    name: 'insurance_claim_amount',
    help: 'Claim amounts',
    labelNames: ['policy_type', 'claim_type'],
    buckets: [100, 500, 1000, 5000, 10000, 25000, 50000, 100000],
  });

  // Customer Metrics
  static readonly customersOnboarded = new Counter({
    name: 'insurance_customers_onboarded_total',
    help: 'Total customers onboarded',
    labelNames: ['onboarding_method', 'policy_type'],
  });

  static readonly customerSatisfactionScore = new Gauge({
    name: 'insurance_customer_satisfaction_score',
    help: 'Customer satisfaction score (1-10)',
    labelNames: ['touchpoint', 'agent_id'],
  });

  static readonly customerRetentionRate = new Gauge({
    name: 'insurance_customer_retention_rate',
    help: 'Customer retention rate percentage',
    labelNames: ['policy_type', 'timeframe'],
  });

  // AI/ML Metrics
  static readonly aiPredictions = new Counter({
    name: 'insurance_ai_predictions_total',
    help: 'Total AI predictions made',
    labelNames: ['model_type', 'prediction_type'],
  });

  static readonly aiModelAccuracy = new Gauge({
    name: 'insurance_ai_model_accuracy',
    help: 'AI model accuracy percentage',
    labelNames: ['model_type'],
  });

  static readonly aiProcessingTime = new Histogram({
    name: 'insurance_ai_processing_time_seconds',
    help: 'AI model processing time',
    labelNames: ['model_type', 'task_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  });

  static readonly aiModelCost = new Counter({
    name: 'insurance_ai_model_cost_total',
    help: 'Total AI model API cost',
    labelNames: ['model_type'],
  });

  // Processing Metrics
  static readonly documentsProcessed = new Counter({
    name: 'insurance_documents_processed_total',
    help: 'Total documents processed',
    labelNames: ['document_type', 'processing_method'],
  });

  static readonly documentProcessingTime = new Histogram({
    name: 'insurance_document_processing_time_seconds',
    help: 'Document processing time',
    labelNames: ['document_type', 'processing_method'],
    buckets: [1, 5, 10, 30, 60, 180, 300],
  });

  static readonly verificationChecks = new Counter({
    name: 'insurance_verification_checks_total',
    help: 'Total verification checks performed',
    labelNames: ['check_type', 'status'],
  });

  // Underwriting Metrics
  static readonly underwritingDecisions = new Counter({
    name: 'insurance_underwriting_decisions_total',
    help: 'Total underwriting decisions',
    labelNames: ['decision_type', 'policy_type'],
  });

  static readonly underwritingTime = new Histogram({
    name: 'insurance_underwriting_time_seconds',
    help: 'Time for underwriting decision',
    labelNames: ['policy_type', 'complexity'],
    buckets: [60, 300, 600, 1800, 3600, 7200],
  });

  // Queue Metrics
  static readonly queueDepth = new Gauge({
    name: 'insurance_queue_depth',
    help: 'Current queue depth',
    labelNames: ['queue_name', 'priority'],
  });

  static readonly queueProcessingRate = new Gauge({
    name: 'insurance_queue_processing_rate',
    help: 'Queue processing rate per second',
    labelNames: ['queue_name'],
  });

  static readonly jobFailures = new Counter({
    name: 'insurance_job_failures_total',
    help: 'Total job failures',
    labelNames: ['queue_name', 'error_type'],
  });

  // Integration Metrics
  static readonly apiCalls = new Counter({
    name: 'insurance_api_calls_total',
    help: 'Total API calls to third-party services',
    labelNames: ['service', 'endpoint', 'status'],
  });

  static readonly apiLatency = new Histogram({
    name: 'insurance_api_latency_seconds',
    help: 'API call latency',
    labelNames: ['service', 'endpoint'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
  });

  // Business Process Metrics
  static readonly quoteRequests = new Counter({
    name: 'insurance_quote_requests_total',
    help: 'Total quote requests',
    labelNames: ['policy_type', 'carrier'],
  });

  static readonly quotesIssued = new Counter({
    name: 'insurance_quotes_issued_total',
    help: 'Total quotes issued',
    labelNames: ['policy_type', 'carrier'],
  });

  static readonly paymentSuccess = new Counter({
    name: 'insurance_payment_success_total',
    help: 'Total successful payments',
    labelNames: ['payment_method', 'policy_type'],
  });

  static readonly paymentFailure = new Counter({
    name: 'insurance_payment_failure_total',
    help: 'Total failed payments',
    labelNames: ['payment_method', 'policy_type', 'failure_reason'],
  });

  /**
   * Records a lead conversion event
   */
  static recordLeadConversion(
    source: string,
    type: string,
    carrier: string,
    policyType: string,
    responseTime: number
  ): void {
    this.leadsConverted.inc({ source, type, carrier, policy_type: policyType });
    this.leadResponseTime.observe({ source, priority: 'normal' }, responseTime);
    
    logger.info('Lead conversion recorded', {
      source,
      type,
      carrier,
      policyType,
      responseTime,
    });
  }

  /**
   * Records policy creation with premium amount
   */
  static recordPolicyCreation(
    policyType: string,
    carrier: string,
    premiumAmount: number,
    processingTime: number
  ): void {
    this.policiesCreated.inc({ policy_type: policyType, carrier, coverage_amount_tier: this.getCoverageTier(premiumAmount) });
    this.policiesPremium.observe({ policy_type: policyType, carrier }, premiumAmount);
    this.policyProcessingTime.observe({ policy_type: policyType, carrier }, processingTime);
    this.revenueTotal.inc({ source: 'policy', policy_type: policyType, payment_type: 'initial' }, premiumAmount);
    
    logger.info('Policy creation recorded', {
      policyType,
      carrier,
      premiumAmount,
      processingTime,
    });
  }

  /**
   * Records agent performance
   */
  static recordAgentPerformance(
    agentId: string,
    tier: string,
    conversion: boolean,
    responseTime: number
  ): void {
    this.agentAssignments.inc({ agent_id: agentId, agent_tier: tier, assignment_type: 'lead' });
    this.agentResponseTime.observe({ agent_id: agentId, agent_tier: tier }, responseTime);
    
    if (conversion) {
      this.agentConversions.inc({ agent_id: agentId, agent_tier: tier, policy_type: 'auto' });
    }
    
    logger.info('Agent performance recorded', {
      agentId,
      tier,
      conversion,
      responseTime,
    });
  }

  /**
   * Records AI model prediction
   */
  static recordAIPrediction(
    modelType: string,
    predictionType: string,
    processingTime: number,
    cost: number
  ): void {
    this.aiPredictions.inc({ model_type: modelType, prediction_type: predictionType });
    this.aiProcessingTime.observe({ model_type: modelType, task_type: predictionType }, processingTime);
    this.aiModelCost.inc({ model_type: modelType }, cost);
    
    logger.info('AI prediction recorded', {
      modelType,
      predictionType,
      processingTime,
      cost,
    });
  }

  /**
   * Updates lead conversion rate gauge
   */
  static updateConversionRate(rate: number, timeframe: string = '24h', source: string = 'all'): void {
    this.leadConversionRate.set({ timeframe, source }, rate);
  }

  /**
   * Updates agent performance score
   */
  static updateAgentPerformanceScore(agentId: string, tier: string, score: number): void {
    this.agentPerformanceScore.set({ agent_id: agentId, agent_tier: tier }, score);
  }

  /**
   * Updates customer satisfaction score
   */
  static updateCustomerSatisfactionScore(touchpoint: string, agentId: string, score: number): void {
    this.customerSatisfactionScore.set({ touchpoint, agent_id: agentId }, score);
  }

  /**
   * Updates queue depth
   */
  static updateQueueDepth(queueName: string, priority: string, depth: number): void {
    this.queueDepth.set({ queue_name: queueName, priority }, depth);
  }

  /**
   * Records API call to external services
   */
  static recordAPICall(service: string, endpoint: string, status: string, latency: number): void {
    this.apiCalls.inc({ service, endpoint, status });
    this.apiLatency.observe({ service, endpoint }, latency);
  }

  /**
   * Records payment transaction
   */
  static recordPayment(
    success: boolean,
    paymentMethod: string,
    policyType: string,
    amount: number,
    failureReason?: string
  ): void {
    if (success) {
      this.paymentSuccess.inc({ payment_method: paymentMethod, policy_type: policyType });
      this.revenueTotal.inc({ source: 'payment', policy_type: policyType, payment_type: paymentMethod }, amount);
    } else {
      this.paymentFailure.inc({ 
        payment_method: paymentMethod, 
        policy_type: policyType, 
        failure_reason: failureReason || 'unknown' 
      });
    }
  }

  /**
   * Helper method to determine coverage tier based on premium amount
   */
  private static getCoverageTier(premium: number): string {
    if (premium < 100) return 'low';
    if (premium < 500) return 'medium';
    if (premium < 2000) return 'high';
    return 'premium';
  }

  /**
   * Records a claim
   */
  static recordClaim(
    policyType: string,
    claimType: string,
    severity: string,
    amount: number,
    approved: boolean,
    processingTime: number
  ): void {
    this.claimsFiled.inc({ policy_type: policyType, claim_type: claimType, severity });
    this.claimAmount.observe({ policy_type: policyType, claim_type: claimType }, amount);
    
    if (approved) {
      this.claimsApproved.inc({ policy_type: policyType, claim_type: claimType });
    }
    
    this.claimsProcessingTime.observe({ policy_type: policyType, claim_type: claimType }, processingTime);
  }

  /**
   * Records document processing
   */
  static recordDocumentProcessing(
    documentType: string,
    processingMethod: string,
    processingTime: number,
    success: boolean
  ): void {
    if (success) {
      this.documentsProcessed.inc({ document_type: documentType, processing_method: processingMethod });
      this.documentProcessingTime.observe({ document_type: documentType, processing_method: processingMethod }, processingTime);
    }
  }

  /**
   * Records a verification check
   */
  static recordVerificationCheck(checkType: string, success: boolean): void {
    this.verificationChecks.inc({ check_type: checkType, status: success ? 'success' : 'failure' });
  }

  /**
   * Records underwriting decision
   */
  static recordUnderwritingDecision(
    decisionType: string,
    policyType: string,
    complexity: string,
    processingTime: number
  ): void {
    this.underwritingDecisions.inc({ decision_type: decisionType, policy_type: policyType });
    this.underwritingTime.observe({ policy_type: policyType, complexity }, processingTime);
  }

  /**
   * Records quote generation
   */
  static recordQuote(
    policyType: string,
    carrier: string,
    generated: boolean,
    processingTime: number
  ): void {
    this.quoteRequests.inc({ policy_type: policyType, carrier });
    
    if (generated) {
      this.quotesIssued.inc({ policy_type: policyType, carrier });
    }
  }

  /**
   * Records job failure
   */
  static recordJobFailure(queueName: string, errorType: string): void {
    this.jobFailures.inc({ queue_name: queueName, error_type: errorType });
  }

  /**
   * Updates queue processing rate
   */
  static updateQueueProcessingRate(queueName: string, rate: number): void {
    this.queueProcessingRate.set({ queue_name: queueName }, rate);
  }

  /**
   * Updates AI model accuracy
   */
  static updateAIModelAccuracy(modelType: string, accuracy: number): void {
    this.aiModelAccuracy.set({ model_type: modelType }, accuracy);
  }

  /**
   * Updates customer retention rate
   */
  static updateCustomerRetentionRate(rate: number, policyType: string = 'auto', timeframe: string = '1y'): void {
    this.customerRetentionRate.set({ policy_type: policyType, timeframe }, rate);
  }

  /**
   * Records revenue for monthly reporting
   */
  static recordMonthlyRevenue(year: number, month: string, amount: number): void {
    this.revenueMonthly.set({ year: year.toString(), month }, amount);
  }

  /**
   * Records onboarding
   */
  static recordCustomerOnboarded(method: string, policyType: string): void {
    this.customersOnboarded.inc({ onboarding_method: method, policy_type: policyType });
  }

  /**
   * Records commission
   */
  static recordCommission(agentId: string, policyType: string, amount: number): void {
    this.commissionGenerated.inc({ agent_id: agentId, policy_type: policyType }, amount);
  }

  /**
   * Records lead qualification
   */
  static recordLeadQualification(
    source: string,
    type: string,
    carrier: string,
    qualified: boolean,
    score: number
  ): void {
    this.leadsReceived.inc({ source, type, carrier });
    
    if (qualified) {
      this.leadsQualified.inc({ source, type, carrier, qualification_score: this.getScoreTier(score) });
    }
  }

  /**
   * Helper method to convert score to tier
   */
  private static getScoreTier(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 80) return 'good';
    if (score >= 70) return 'fair';
    if (score >= 60) return 'poor';
    return 'bad';
  }
}

export const businessMetrics = BusinessMetrics;