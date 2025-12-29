// ========================================
// API ORCHESTRATION TYPES
// ========================================

export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type ExecutionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'RETRYING';

export type StepType =
  | 'HTTP_REQUEST'
  | 'DATA_TRANSFORM'
  | 'CONDITIONAL'
  | 'PARALLEL'
  | 'FOR_EACH'
  | 'WAIT'
  | 'WEBHOOK_CALL'
  | 'FUNCTION_CALL'
  | 'VALIDATION'
  | 'ERROR_HANDLER';

export type RetryStrategy = 'LINEAR' | 'EXPONENTIAL' | 'FIXED' | 'NONE';

// ========================================
// WORKFLOW TYPES
// ========================================

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: number;
  status: WorkflowStatus;
  category: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  errorHandlers?: ErrorHandler[];
  timeout?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkflowDto {
  name: string;
  description?: string;
  category: string;
  triggers: WorkflowTrigger[];
  steps: WorkflowStep[];
  errorHandlers?: ErrorHandler[];
  timeout?: number;
  metadata?: Record<string, unknown>;
}

export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
  version?: number;
  status?: WorkflowStatus;
  triggers?: WorkflowTrigger[];
  steps?: WorkflowStep[];
  errorHandlers?: ErrorHandler[];
  timeout?: number;
  metadata?: Record<string, unknown>;
}

export interface WorkflowTrigger {
  type: 'WEBHOOK' | 'SCHEDULE' | 'EVENT' | 'MANUAL' | 'API_CALL';
  config: Record<string, unknown>;
  isEnabled: boolean;
}

export interface WorkflowFilterParams {
  status?: WorkflowStatus;
  category?: string;
  triggerType?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ========================================
// WORKFLOW STEP TYPES
// ========================================

export interface WorkflowStep {
  id: string;
  name: string;
  type: StepType;
  order: number;
  config: StepConfig;
  retryPolicy?: RetryPolicy;
  timeout?: number;
  conditions?: Condition[];
  nextStepId?: string;
  metadata?: Record<string, unknown>;
}

export type StepConfig =
  | HttpRequestConfig
  | DataTransformConfig
  | ConditionalConfig
  | ParallelConfig
  | ForEachConfig
  | WaitConfig
  | WebhookCallConfig
  | FunctionCallConfig
  | ValidationConfig;

export interface HttpRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown> | string;
  query?: Record<string, string>;
  timeout?: number;
  expectedStatusCode?: number;
  extractResponse?: ResponseExtraction;
}

export interface ResponseExtraction {
  type: 'JSON_PATH' | 'REGEX' | 'XPATH';
  path: string;
  variableName: string;
}

export interface DataTransformConfig {
  inputVariable: string;
  outputVariable: string;
  transformations: Transformation[];
}

export interface Transformation {
  type: 'MAP' | 'FILTER' | 'RENAME' | 'CALCULATE' | 'FORMAT' | 'MERGE' | 'SPLIT';
  config: Record<string, unknown>;
}

export interface ConditionalConfig {
  conditions: Condition[];
  trueStepId?: string;
  falseStepId?: string;
}

export interface Condition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'not_in' | 'contains' | 'not_contains' | 'regex';
  value: unknown;
  logic?: 'AND' | 'OR';
}

export interface ParallelConfig {
  steps: string[];
  waitForAll: boolean;
  maxConcurrency?: number;
}

export interface ForEachConfig {
  inputVariable: string;
  itemVariable: string;
  steps: string[];
  maxConcurrency?: number;
}

export interface WaitConfig {
  duration: number;
  unit: 'MILLISECONDS' | 'SECONDS' | 'MINUTES' | 'HOURS';
}

export interface WebhookCallConfig {
  url: string;
  headers?: Record<string, string>;
  bodyVariable?: string;
  method?: 'POST' | 'PUT' | 'PATCH';
  timeout?: number;
}

export interface FunctionCallConfig {
  functionName: string;
  parameters?: Record<string, unknown>;
  timeout?: number;
}

export interface ValidationConfig {
  rules: ValidationRule[];
  failOnFirstError: boolean;
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'type' | 'range' | 'pattern' | 'custom';
  config: Record<string, unknown>;
  errorMessage?: string;
}

export interface RetryPolicy {
  maxAttempts: number;
  strategy: RetryStrategy;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: string[];
}

export interface ErrorHandler {
  stepId: string;
  errorTypes: string[];
  handlerStepId: string;
  shouldContinue: boolean;
}

// ========================================
// WORKFLOW EXECUTION TYPES
// ========================================

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  workflowVersion: number;
  status: ExecutionStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  currentStepId?: string;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  metadata?: Record<string, unknown>;
  stepsExecuted: StepExecution[];
}

export interface CreateWorkflowExecutionDto {
  workflowId: string;
  input: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface StepExecution {
  id: string;
  executionId: string;
  stepId: string;
  stepName: string;
  status: ExecutionStatus;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  attempt: number;
  error?: string;
  logs: ExecutionLog[];
}

export interface ExecutionLog {
  timestamp: Date;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  data?: Record<string, unknown>;
}

export interface WorkflowExecutionFilterParams {
  workflowId?: string;
  status?: ExecutionStatus;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ========================================
// WEBHOOK TYPES
// ========================================

export interface Webhook {
  id: string;
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  secret?: string;
  isActive: boolean;
  retryPolicy?: RetryPolicy;
  timeout?: number;
  events: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWebhookDto {
  name: string;
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  secret?: string;
  retryPolicy?: RetryPolicy;
  timeout?: number;
  events: string[];
  metadata?: Record<string, unknown>;
}

export interface UpdateWebhookDto {
  name?: string;
  url?: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  secret?: string;
  isActive?: boolean;
  retryPolicy?: RetryPolicy;
  timeout?: number;
  events?: string[];
  metadata?: Record<string, unknown>;
}

export interface WebhookEvent {
  id: string;
  webhookId: string;
  eventType: string;
  payload: Record<string, unknown>;
  statusCode?: number;
  response?: string;
  success: boolean;
  attempt: number;
  sentAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface WebhookFilterParams {
  isActive?: boolean;
  eventType?: string;
  page?: number;
  limit?: number;
}

// ========================================
// API ORCHESTRATION TYPES
// ========================================

export interface ApiOrchestrationRequest {
  requestId: string;
  workflowId?: string;
  steps: OrchestrationStep[];
  context: Record<string, unknown>;
  options: OrchestrationOptions;
}

export interface OrchestrationStep {
  id: string;
  name: string;
  type: StepType;
  config: StepConfig;
  dependsOn?: string[];
  retryPolicy?: RetryPolicy;
}

export interface OrchestrationOptions {
  timeout?: number;
  maxConcurrentSteps?: number;
  stopOnFirstError?: boolean;
  enableLogging?: boolean;
  saveResults?: boolean;
}

export interface OrchestrationResult {
  requestId: string;
  status: ExecutionStatus;
  steps: OrchestrationStepResult[];
  output: Record<string, unknown>;
  startedAt: Date;
  completedAt?: Date;
  duration?: number;
  error?: string;
}

export interface OrchestrationStepResult {
  stepId: string;
  stepName: string;
  status: ExecutionStatus;
  output?: unknown;
  duration?: number;
  attempt: number;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

// ========================================
// TRANSFORMATION ENGINE TYPES
// ========================================

export interface TransformationRule {
  id: string;
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  transformations: Transformation[];
  isActive: boolean;
  metadata?: Record<string, unknown>;
}

export interface CreateTransformationRuleDto {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  transformations: Transformation[];
  metadata?: Record<string, unknown>;
}

// ========================================
// MONITORING & HEALTH TYPES
// ========================================

export interface OrchestrationMetrics {
  workflowId: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
  averageStepExecutionTime: number;
  successRate: number;
  lastExecutionAt?: Date;
  lastExecutionStatus?: ExecutionStatus;
}

export interface CircuitBreakerState {
  serviceId: string;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  threshold: number;
  timeout: number;
  halfOpenMaxCalls: number;
  halfOpenCalls: number;
}

export interface CircuitBreakerConfig {
  threshold: number;
  timeout: number;
  halfOpenMaxCalls: number;
  monitoringPeriod?: number;
}

// ========================================
// WORKFLOW TEMPLATES
// ========================================

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  definition: CreateWorkflowDto;
  parameters: TemplateParameter[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TemplateParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: unknown;
  description?: string;
}

export interface CreateWorkflowFromTemplateDto {
  templateId: string;
  name: string;
  parameterValues: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

// ========================================
// PAGINATED RESPONSE
// ========================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
