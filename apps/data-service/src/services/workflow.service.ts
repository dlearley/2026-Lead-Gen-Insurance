import {
  CreateWorkflowDto,
  UpdateWorkflowDto,
  CreateWorkflowExecutionDto,
  Workflow,
  WorkflowExecution,
  StepExecution,
  WorkflowFilterParams,
  WorkflowExecutionFilterParams,
  PaginatedResponse,
  OrchestrationResult,
  OrchestrationStepResult,
  WorkflowStep,
  StepConfig,
  HttpRequestConfig,
  RetryPolicy,
  RetryStrategy,
  WorkflowStatus,
  ExecutionStatus as ApiExecutionStatus,
} from '@insurance/types';
import { prisma } from '../prisma/client.js';
import { ApiClientService } from './api-client.service.js';
import { CircuitBreakerService } from './circuit-breaker.service.js';
import logger from '../logger.js';

/**
 * Service for managing workflows and orchestration
 */
export class WorkflowService {
  private apiClient: ApiClientService;
  private circuitBreaker: CircuitBreakerService;

  constructor() {
    this.apiClient = new ApiClientService();
    this.circuitBreaker = new CircuitBreakerService();
    this.apiClient.setCircuitBreakerService(this.circuitBreaker);
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(data: CreateWorkflowDto): Promise<Workflow> {
    logger.info('Creating workflow', { name: data.name, category: data.category });

    const workflow = await prisma.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        triggers: data.triggers as any,
        steps: data.steps as any,
        errorHandlers: data.errorHandlers as any,
        timeout: data.timeout,
        metadata: data.metadata as any,
      },
    });

    logger.info('Workflow created', { id: workflow.id, name: workflow.name });
    return workflow as unknown as Workflow;
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(id: string): Promise<Workflow | null> {
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 10,
        },
      },
    });

    return workflow as unknown as Workflow | null;
  }

  /**
   * Get all workflows with filtering and pagination
   */
  async getWorkflows(filters: WorkflowFilterParams = {}): Promise<PaginatedResponse<Workflow>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.status) {
      where.status = filters.status as WorkflowStatus;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [filters.sortBy ?? 'createdAt']: filters.sortOrder ?? 'desc',
        },
      }),
      prisma.workflow.count({ where }),
    ]);

    return {
      data: workflows as unknown as Workflow[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Update workflow
   */
  async updateWorkflow(id: string, data: UpdateWorkflowDto): Promise<Workflow> {
    logger.info('Updating workflow', { id });

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.status !== undefined) updateData.status = data.status as WorkflowStatus;
    if (data.category !== undefined) updateData.category = data.category;
    if (data.triggers !== undefined) updateData.triggers = data.triggers as any;
    if (data.steps !== undefined) updateData.steps = data.steps as any;
    if (data.errorHandlers !== undefined) updateData.errorHandlers = data.errorHandlers as any;
    if (data.timeout !== undefined) updateData.timeout = data.timeout;
    if (data.metadata !== undefined) updateData.metadata = data.metadata as any;

    if (Object.keys(updateData).length > 0) {
      updateData.version = { increment: 1 };
    }

    const workflow = await prisma.workflow.update({
      where: { id },
      data: updateData,
    });

    logger.info('Workflow updated', { id, version: workflow.version });
    return workflow as unknown as Workflow;
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    logger.info('Deleting workflow', { id });

    await prisma.workflow.delete({
      where: { id },
    });

    logger.info('Workflow deleted', { id });
  }

  /**
   * Execute a workflow
   */
  async executeWorkflow(request: CreateWorkflowExecutionDto): Promise<WorkflowExecution> {
    const { workflowId, input, metadata } = request;

    logger.info('Executing workflow', { workflowId, input });

    // Get workflow
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
    });

    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }

    if (workflow.status !== WorkflowStatus.ACTIVE) {
      throw new Error(`Workflow is not active: ${workflowId}`);
    }

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId,
        workflowVersion: workflow.version,
        status: ExecutionStatus.RUNNING,
        input: input as any,
        metadata: metadata as any,
      },
    });

    // Execute workflow asynchronously
    this.executeWorkflowAsync(execution.id, workflow as unknown as Workflow, input).catch((error) => {
      logger.error('Workflow execution failed', { executionId: execution.id, error });
    });

    return execution as unknown as WorkflowExecution;
  }

  /**
   * Internal async workflow execution
   */
  private async executeWorkflowAsync(
    executionId: string,
    workflow: Workflow,
    input: Record<string, unknown>
  ): Promise<void> {
    logger.info('Starting workflow execution', { executionId });

    const startTime = Date.now();
    let context = { ...input };
    let currentStepId: string | undefined;

    try {
      // Sort steps by order
      const steps = (workflow.steps as WorkflowStep[]).sort((a, b) => a.order - b.order);

      for (const step of steps) {
        currentStepId = step.id;

        // Update execution
        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: { currentStepId },
        });

        // Execute step
        const stepResult = await this.executeStep(executionId, step, context);

        if (stepResult.status !== ApiExecutionStatus.COMPLETED) {
          throw new Error(`Step failed: ${step.name} - ${stepResult.error}`);
        }

        // Update context with step output
        if (stepResult.output) {
          context = { ...context, ...stepResult.output };
        }
      }

      const duration = Date.now() - startTime;

      // Mark execution as completed
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.COMPLETED,
          output: context as any,
          completedAt: new Date(),
        },
      });

      // Update metrics
      await this.updateMetrics(workflow.id, true, duration);

      logger.info('Workflow execution completed', { executionId, duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Mark execution as failed
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.FAILED,
          error: errorMessage,
          completedAt: new Date(),
        },
      });

      // Update metrics
      await this.updateMetrics(workflow.id, false, duration);

      logger.error('Workflow execution failed', { executionId, error: errorMessage });
    }
  }

  /**
   * Execute a single workflow step
   */
  private async executeStep(
    executionId: string,
    step: WorkflowStep,
    context: Record<string, unknown>
  ): Promise<OrchestrationStepResult> {
    logger.info('Executing step', { executionId, stepId: step.id, stepName: step.name });

    const startTime = Date.now();
    let attempt = 1;
    let lastError: string | undefined;

    const retryPolicy = step.retryPolicy || this.getDefaultRetryPolicy();

    while (attempt <= retryPolicy.maxAttempts) {
      try {
        // Create step execution record
        const stepExecution = await prisma.stepExecution.create({
          data: {
            executionId,
            stepId: step.id,
            stepName: step.name,
            status: ExecutionStatus.RUNNING,
            input: context as any,
            attempt,
          },
        });

        // Execute step based on type
        let output: unknown;

        switch (step.type) {
          case 'HTTP_REQUEST':
            output = await this.executeHttpRequest(step.config as HttpRequestConfig, context);
            break;

          case 'DATA_TRANSFORM':
            output = await this.executeDataTransform(step.config as any, context);
            break;

          case 'WAIT':
            output = await this.executeWait(step.config as any);
            break;

          case 'WEBHOOK_CALL':
            output = await this.executeWebhookCall(step.config as any, context);
            break;

          case 'VALIDATION':
            output = await this.executeValidation(step.config as any, context);
            break;

          default:
            throw new Error(`Unsupported step type: ${step.type}`);
        }

        const duration = Date.now() - startTime;

        // Update step execution
        await prisma.stepExecution.update({
          where: { id: stepExecution.id },
          data: {
            status: ExecutionStatus.COMPLETED,
            output: output as any,
            duration,
            completedAt: new Date(),
          },
        });

        return {
          stepId: step.id,
          stepName: step.name,
          status: ApiExecutionStatus.COMPLETED,
          output,
          duration,
          attempt,
          startedAt: new Date(startTime),
          completedAt: new Date(),
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        lastError = errorMessage;
        logger.warn(`Step execution attempt ${attempt} failed`, {
          executionId,
          stepId: step.id,
          error: errorMessage,
        });

        // Check if we should retry
        if (attempt < retryPolicy.maxAttempts) {
          const delay = this.calculateRetryDelay(attempt, retryPolicy);
          await this.sleep(delay);
          attempt++;
        } else {
          throw error;
        }
      }
    }

    return {
      stepId: step.id,
      stepName: step.name,
      status: ApiExecutionStatus.FAILED,
      error: lastError,
      attempt,
      startedAt: new Date(startTime),
    };
  }

  /**
   * Execute HTTP request step
   */
  private async executeHttpRequest(
    config: HttpRequestConfig,
    context: Record<string, unknown>
  ): Promise<unknown> {
    const { method, url, headers, body, query, timeout, extractResponse } = config;

    // Substitute variables in URL
    const substitutedUrl = this.substituteVariables(url, context);

    // Substitute variables in headers
    const substitutedHeaders: Record<string, string> = {};
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        substitutedHeaders[key] = this.substituteVariables(value, context);
      }
    }

    // Execute HTTP request
    const response = await this.apiClient.request(
      {
        method,
        url: substitutedUrl,
        headers: substitutedHeaders,
        body: body ? this.substituteVariables(body as string, context) : undefined,
        query: query ? this.substituteVariables(query as string, context) : undefined,
        timeout,
      },
      context.serviceId ? context.serviceId as string : undefined
    );

    if (!response.success) {
      throw new Error(response.error?.message || 'HTTP request failed');
    }

    // Extract specific data from response if configured
    if (extractResponse && response.data) {
      return this.extractData(response.data, extractResponse);
    }

    return response.data;
  }

  /**
   * Execute data transformation step
   */
  private async executeDataTransform(
    config: any,
    context: Record<string, unknown>
  ): Promise<unknown> {
    const { inputVariable, outputVariable, transformations } = config;

    let data = context[inputVariable];

    for (const transform of transformations) {
      switch (transform.type) {
        case 'MAP':
          data = this.transformMap(data, transform.config);
          break;
        case 'RENAME':
          data = this.transformRename(data, transform.config);
          break;
        case 'CALCULATE':
          data = this.transformCalculate(data, transform.config);
          break;
        case 'FORMAT':
          data = this.transformFormat(data, transform.config);
          break;
        case 'MERGE':
          data = this.transformMerge(data, transform.config, context);
          break;
        default:
          logger.warn('Unknown transformation type', { type: transform.type });
      }
    }

    return { [outputVariable]: data };
  }

  /**
   * Execute wait step
   */
  private async executeWait(config: any): Promise<unknown> {
    const { duration, unit } = config;
    let milliseconds = duration;

    switch (unit) {
      case 'MILLISECONDS':
        milliseconds = duration;
        break;
      case 'SECONDS':
        milliseconds = duration * 1000;
        break;
      case 'MINUTES':
        milliseconds = duration * 60 * 1000;
        break;
      case 'HOURS':
        milliseconds = duration * 60 * 60 * 1000;
        break;
    }

    await this.sleep(milliseconds);
    return {};
  }

  /**
   * Execute webhook call step
   */
  private async executeWebhookCall(
    config: any,
    context: Record<string, unknown>
  ): Promise<unknown> {
    const { url, headers, bodyVariable, method = 'POST', timeout } = config;

    const body = bodyVariable ? context[bodyVariable] : undefined;
    const substitutedUrl = this.substituteVariables(url, context);

    const response = await this.apiClient.request(
      {
        method: method as any,
        url: substitutedUrl,
        headers: headers || {},
        body: body as any,
        timeout,
      },
      context.serviceId ? context.serviceId as string : undefined
    );

    if (!response.success) {
      throw new Error(response.error?.message || 'Webhook call failed');
    }

    return response.data;
  }

  /**
   * Execute validation step
   */
  private async executeValidation(
    config: any,
    context: Record<string, unknown>
  ): Promise<unknown> {
    const { rules, failOnFirstError = false } = config;
    const errors: string[] = [];

    for (const rule of rules) {
      const value = context[rule.field];
      let isValid = true;

      switch (rule.type) {
        case 'required':
          isValid = value !== undefined && value !== null && value !== '';
          break;
        case 'type':
          isValid = typeof value === rule.config.expectedType;
          break;
        case 'range':
          if (typeof value === 'number') {
            const min = rule.config.min;
            const max = rule.config.max;
            isValid = (min === undefined || value >= min) && (max === undefined || value <= max);
          } else {
            isValid = false;
          }
          break;
        case 'pattern':
          if (typeof value === 'string') {
            isValid = new RegExp(rule.config.pattern).test(value);
          } else {
            isValid = false;
          }
          break;
      }

      if (!isValid) {
        errors.push(rule.errorMessage || `Validation failed for field: ${rule.field}`);
        if (failOnFirstError) {
          throw new Error(errors[0]);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Validation failed: ${errors.join(', ')}`);
    }

    return { valid: true };
  }

  /**
   * Get execution by ID
   */
  async getExecutionById(id: string): Promise<WorkflowExecution | null> {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id },
      include: {
        workflow: true,
        stepsExecuted: {
          orderBy: { startedAt: 'asc' },
        },
      },
    });

    return execution as unknown as WorkflowExecution | null;
  }

  /**
   * Get executions with filtering
   */
  async getExecutions(filters: WorkflowExecutionFilterParams = {}): Promise<PaginatedResponse<WorkflowExecution>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (filters.workflowId) {
      where.workflowId = filters.workflowId;
    }

    if (filters.status) {
      where.status = filters.status as ExecutionStatus;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.startedAt = {};
      if (filters.dateFrom) {
        (where.startedAt as Record<string, Date>).gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        (where.startedAt as Record<string, Date>).lte = filters.dateTo;
      }
    }

    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [filters.sortBy ?? 'startedAt']: filters.sortOrder ?? 'desc',
        },
        include: {
          workflow: true,
        },
      }),
      prisma.workflowExecution.count({ where }),
    ]);

    return {
      data: executions as unknown as WorkflowExecution[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrevious: page > 1,
      },
    };
  }

  /**
   * Get workflow metrics
   */
  async getWorkflowMetrics(workflowId: string) {
    const metrics = await prisma.orchestrationMetrics.findUnique({
      where: { workflowId },
    });

    return metrics;
  }

  /**
   * Update metrics after execution
   */
  private async updateMetrics(workflowId: string, success: boolean, duration: number): Promise<void> {
    const existing = await prisma.orchestrationMetrics.findUnique({
      where: { workflowId },
    });

    const now = new Date();

    if (existing) {
      const totalExecutions = existing.totalExecutions + 1;
      const successfulExecutions = success ? existing.successfulExecutions + 1 : existing.successfulExecutions;
      const failedExecutions = success ? existing.failedExecutions : existing.failedExecutions + 1;
      const successRate = successfulExecutions / totalExecutions;
      const averageExecutionTime = (existing.averageExecutionTime * existing.totalExecutions + duration) / totalExecutions;

      await prisma.orchestrationMetrics.update({
        where: { workflowId },
        data: {
          totalExecutions,
          successfulExecutions,
          failedExecutions,
          successRate,
          averageExecutionTime,
          lastExecutionAt: now,
          lastExecutionStatus: success ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
          updatedAt: now,
        },
      });
    } else {
      await prisma.orchestrationMetrics.create({
        data: {
          workflowId,
          totalExecutions: 1,
          successfulExecutions: success ? 1 : 0,
          failedExecutions: success ? 0 : 1,
          successRate: success ? 1 : 0,
          averageExecutionTime: duration,
          averageStepExecutionTime: 0,
          lastExecutionAt: now,
          lastExecutionStatus: success ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED,
        },
      });
    }
  }

  /**
   * Get default retry policy
   */
  private getDefaultRetryPolicy(): RetryPolicy {
    return {
      maxAttempts: 3,
      strategy: RetryStrategy.EXPONENTIAL,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    };
  }

  /**
   * Calculate retry delay based on strategy
   */
  private calculateRetryDelay(attempt: number, policy: RetryPolicy): number {
    let delay: number;

    switch (policy.strategy) {
      case RetryStrategy.LINEAR:
        delay = policy.initialDelay * attempt;
        break;
      case RetryStrategy.EXPONENTIAL:
        delay = policy.initialDelay * Math.pow(policy.backoffMultiplier, attempt - 1);
        break;
      case RetryStrategy.FIXED:
        delay = policy.initialDelay;
        break;
      default:
        delay = policy.initialDelay;
    }

    return Math.min(delay, policy.maxDelay);
  }

  /**
   * Substitute variables in a string
   */
  private substituteVariables(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return String(context[key] ?? match);
    });
  }

  /**
   * Extract data from response
   */
  private extractData(data: any, extraction: any): unknown {
    // Simple JSON path implementation
    const path = extraction.path.split('.');
    let result = data;

    for (const segment of path) {
      if (result && typeof result === 'object') {
        result = result[segment];
      } else {
        return undefined;
      }
    }

    return result;
  }

  /**
   * Transformation: Map
   */
  private transformMap(data: any, config: any): any {
    // Map array items
    if (Array.isArray(data)) {
      return data.map((item: any) => this.applyMapping(item, config.mapping));
    }
    return data;
  }

  /**
   * Transformation: Rename fields
   */
  private transformRename(data: any, config: any): any {
    if (Array.isArray(data)) {
      return data.map((item: any) => this.renameFields(item, config.fields));
    }
    return this.renameFields(data, config.fields);
  }

  /**
   * Transformation: Calculate
   */
  private transformCalculate(data: any, config: any): any {
    if (Array.isArray(data)) {
      const { field, operation } = config;
      const values = data.map((item: any) => item[field]).filter((v: any) => typeof v === 'number');

      switch (operation) {
        case 'sum':
          return values.reduce((a: number, b: number) => a + b, 0);
        case 'avg':
          return values.length > 0 ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
        case 'min':
          return Math.min(...values);
        case 'max':
          return Math.max(...values);
        case 'count':
          return values.length;
        default:
          return data;
      }
    }
    return data;
  }

  /**
   * Transformation: Format
   */
  private transformFormat(data: any, config: any): any {
    const { field, format } = config;

    if (Array.isArray(data)) {
      return data.map((item: any) => {
        const value = item[field];
        switch (format) {
          case 'uppercase':
            return String(value).toUpperCase();
          case 'lowercase':
            return String(value).toLowerCase();
          case 'trim':
            return String(value).trim();
          default:
            return value;
        }
      });
    }
    return data;
  }

  /**
   * Transformation: Merge
   */
  private transformMerge(data: any, config: any, context: any): any {
    const { source } = config;
    const sourceData = context[source];
    return { ...data, ...sourceData };
  }

  /**
   * Apply field mapping
   */
  private applyMapping(item: any, mapping: any): any {
    const result: any = {};
    for (const [sourceField, targetField] of Object.entries(mapping)) {
      result[targetField] = item[sourceField];
    }
    return result;
  }

  /**
   * Rename fields
   */
  private renameFields(item: any, fields: any): any {
    const result = { ...item };
    for (const [oldName, newName] of Object.entries(fields)) {
      if (result[oldName] !== undefined) {
        result[newName] = result[oldName];
        delete result[oldName];
      }
    }
    return result;
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
