import {
  WorkflowStep,
  OrchestrationRequest,
  OrchestrationResult,
  OrchestrationStepResult,
  ExecutionStatus,
  StepType,
  StepConfig,
  HttpRequestConfig,
  ConditionalConfig,
  ParallelConfig,
  ForEachConfig,
  WaitConfig,
  RetryStrategy,
} from '@insurance/types';
import axios from 'axios';
import { logger } from '@insurance-lead-gen/core';

/**
 * Advanced API Orchestration Service
 * Handles complex multi-step API workflows with dependencies, conditions, and parallel execution
 */
export class OrchestrationService {
  private activeOrchestrations: Map<string, OrchestrationResult> = new Map();

  /**
   * Execute an orchestration request
   */
  async executeOrchestration(request: OrchestrationRequest): Promise<OrchestrationResult> {
    const startTime = Date.now();
    const result: OrchestrationResult = {
      requestId: request.requestId,
      status: ExecutionStatus.RUNNING,
      steps: [],
      output: { ...request.context },
      startedAt: new Date(),
    };

    this.activeOrchestrations.set(request.requestId, result);

    try {
      // Build execution graph
      const graph = this.buildExecutionGraph(request.steps);

      // Execute steps in topological order
      const sortedSteps = this.topologicalSort(graph);

      for (const step of sortedSteps) {
        const stepResult = await this.executeStep(
          step,
          result.output,
          request.options
        );

        result.steps.push(stepResult);
        result.output = { ...result.output, ...(stepResult.output as Record<string, unknown>) };

        // Check if step failed and we should stop
        if (stepResult.status !== ExecutionStatus.COMPLETED && request.options.stopOnFirstError) {
          result.status = ExecutionStatus.FAILED;
          result.error = `Step failed: ${step.name}`;
          break;
        }
      }

      // Set final status
      if (result.status === ExecutionStatus.RUNNING) {
        const allSuccessful = result.steps.every(s => s.status === ExecutionStatus.COMPLETED);
        result.status = allSuccessful ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED;
      }

      result.completedAt = new Date();
      result.duration = Date.now() - startTime;

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.status = ExecutionStatus.FAILED;
      result.error = errorMessage;
      result.completedAt = new Date();
      result.duration = Date.now() - startTime;
      return result;
    } finally {
      this.activeOrchestrations.delete(request.requestId);
    }
  }

  /**
   * Execute a single step with retry logic
   */
  private async executeStep(
    step: WorkflowStep,
    context: Record<string, unknown>,
    options: { maxConcurrentSteps?: number; stopOnFirstError?: boolean; enableLogging?: boolean }
  ): Promise<OrchestrationStepResult> {
    const startTime = Date.now();
    let attempt = 1;
    let lastError: string | undefined;
    const retryPolicy = step.retryPolicy || this.getDefaultRetryPolicy();

    while (attempt <= retryPolicy.maxAttempts) {
      try {
        if (options.enableLogging) {
          logger.info(`Executing step ${step.id}`, {
            stepId: step.id,
            stepName: step.name,
            stepType: step.type,
            attempt,
          });
        }

        let output: unknown;

        switch (step.type) {
          case 'HTTP_REQUEST':
            output = await this.executeHttpRequest(
              step.config as HttpRequestConfig,
              context
            );
            break;

          case 'CONDITIONAL':
            output = await this.executeConditional(
              step.config as ConditionalConfig,
              context
            );
            break;

          case 'PARALLEL':
            output = await this.executeParallel(
              step.config as ParallelConfig,
              context,
              options
            );
            break;

          case 'FOR_EACH':
            output = await this.executeForEach(
              step.config as ForEachConfig,
              context,
              options
            );
            break;

          case 'WAIT':
            output = await this.executeWait(step.config as WaitConfig);
            break;

          case 'DATA_TRANSFORM':
            output = await this.executeDataTransform(
              step.config as StepConfig,
              context
            );
            break;

          case 'WEBHOOK_CALL':
            output = await this.executeWebhook(
              step.config as StepConfig,
              context
            );
            break;

          default:
            throw new Error(`Unsupported step type: ${step.type}`);
        }

        const duration = Date.now() - startTime;

        return {
          stepId: step.id,
          stepName: step.name,
          status: ExecutionStatus.COMPLETED,
          output,
          duration,
          attempt,
          startedAt: new Date(startTime),
          completedAt: new Date(),
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        lastError = errorMessage;

        if (options.enableLogging) {
          logger.warn(`Step execution failed`, {
            stepId: step.id,
            stepName: step.name,
            attempt,
            error: errorMessage,
          });
        }

        if (attempt < retryPolicy.maxAttempts) {
          const delay = this.calculateRetryDelay(attempt, retryPolicy);
          await this.sleep(delay);
          attempt++;
        }
      }
    }

    return {
      stepId: step.id,
      stepName: step.name,
      status: ExecutionStatus.FAILED,
      error: lastError,
      attempt,
      startedAt: new Date(startTime),
      duration: Date.now() - startTime,
    };
  }

  /**
   * Execute HTTP request
   */
  private async executeHttpRequest(
    config: HttpRequestConfig,
    context: Record<string, unknown>
  ): Promise<unknown> {
    const { method, url, headers, body, query, timeout } = config;

    const substitutedUrl = this.substituteVariables(url, context);
    const substitutedHeaders: Record<string, string> = {};
    const substitutedBody = body ? this.substituteVariables(body as string, context) : undefined;
    const substitutedQuery: Record<string, string> = {};

    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        substitutedHeaders[key] = this.substituteVariables(value, context);
      }
    }

    if (query) {
      for (const [key, value] of Object.entries(query)) {
        substitutedQuery[key] = this.substituteVariables(value, context);
      }
    }

    const response = await axios({
      method,
      url: substitutedUrl,
      headers: substitutedHeaders,
      data: substitutedBody,
      params: substitutedQuery,
      timeout: timeout || 30000,
    });

    return response.data;
  }

  /**
   * Execute conditional step
   */
  private async executeConditional(
    config: ConditionalConfig,
    context: Record<string, unknown>
  ): Promise<unknown> {
    const { conditions } = config;
    let result = false;

    for (const condition of conditions) {
      const fieldValue = this.getFieldValue(context, condition.field);
      const matches = this.evaluateCondition(fieldValue, condition);

      if (condition.logic === 'OR') {
        if (matches) {
          result = true;
          break;
        }
      } else {
        // Default is AND
        if (!matches) {
          result = false;
          break;
        }
        result = matches;
      }
    }

    return { conditionMet: result };
  }

  /**
   * Execute parallel steps
   */
  private async executeParallel(
    config: ParallelConfig,
    context: Record<string, unknown>,
    options: { maxConcurrentSteps?: number }
  ): Promise<unknown> {
    const { steps, waitForAll = true, maxConcurrency } = config;

    const concurrency = maxConcurrency || options.maxConcurrentSteps || 5;
    const chunks: string[][] = [];

    for (let i = 0; i < steps.length; i += concurrency) {
      chunks.push(steps.slice(i, i + concurrency));
    }

    const results: Record<string, unknown> = {};

    for (const chunk of chunks) {
      if (waitForAll) {
        // Wait for all in chunk to complete
        const chunkResults = await Promise.all(
          chunk.map(async (stepId) => {
            // Execute step (placeholder - in real implementation, would execute the actual step)
            return { stepId, output: { completed: true } };
          })
        );

        chunkResults.forEach((r) => {
          results[r.stepId] = r.output;
        });
      } else {
        // Execute without waiting
        chunk.forEach((stepId) => {
          // Execute asynchronously
          process.nextTick(() => {
            // Placeholder execution
          });
          results[stepId] = { started: true };
        });
      }
    }

    return results;
  }

  /**
   * Execute for each step
   */
  private async executeForEach(
    config: ForEachConfig,
    context: Record<string, unknown>,
    options: { maxConcurrentSteps?: number }
  ): Promise<unknown> {
    const { inputVariable, itemVariable, steps, maxConcurrency } = config;

    const items = context[inputVariable] as unknown[];
    if (!Array.isArray(items)) {
      throw new Error(`Input variable ${inputVariable} is not an array`);
    }

    const concurrency = maxConcurrency || options.maxConcurrentSteps || 5;
    const results: unknown[] = [];

    for (let i = 0; i < items.length; i += concurrency) {
      const chunk = items.slice(i, i + concurrency);

      const chunkResults = await Promise.all(
        chunk.map((item) => {
          const itemContext = { ...context, [itemVariable]: item };
          // Execute steps for this item (placeholder)
          return Promise.resolve({ item, result: true });
        })
      );

      results.push(...chunkResults);
    }

    return { results };
  }

  /**
   * Execute wait step
   */
  private async executeWait(config: WaitConfig): Promise<unknown> {
    const { duration, unit = 'MILLISECONDS' } = config;
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
    return { waited: milliseconds };
  }

  /**
   * Execute data transform
   */
  private async executeDataTransform(
    config: StepConfig,
    context: Record<string, unknown>
  ): Promise<unknown> {
    // Placeholder for data transformation logic
    const transformed = { ...context };
    return { transformed };
  }

  /**
   * Execute webhook
   */
  private async executeWebhook(
    config: StepConfig,
    context: Record<string, unknown>
  ): Promise<unknown> {
    const webhookConfig = config as any;
    const { url, method = 'POST', headers, body } = webhookConfig;

    const substitutedUrl = this.substituteVariables(url, context);
    const substitutedBody = body ? this.substituteVariables(JSON.stringify(body), context) : undefined;

    const response = await axios({
      method: method as any,
      url: substitutedUrl,
      headers: headers || {},
      data: substitutedBody ? JSON.parse(substitutedBody) : undefined,
      timeout: 10000,
    });

    return response.data;
  }

  /**
   * Build execution graph from steps with dependencies
   */
  private buildExecutionGraph(steps: WorkflowStep[]): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const step of steps) {
      const deps = step.dependsOn || [];
      graph.set(step.id, deps);
    }

    return graph;
  }

  /**
   * Topological sort of execution graph
   */
  private topologicalSort(graph: Map<string, string[]>): string[] {
    const visited = new Set<string>();
    const tempVisited = new Set<string>();
    const result: string[] = [];

    const visit = (node: string): void => {
      if (tempVisited.has(node)) {
        throw new Error('Cycle detected in step dependencies');
      }
      if (visited.has(node)) {
        return;
      }

      tempVisited.add(node);

      const dependencies = graph.get(node) || [];
      for (const dep of dependencies) {
        visit(dep);
      }

      tempVisited.delete(node);
      visited.add(node);
      result.push(node);
    };

    for (const node of graph.keys()) {
      visit(node);
    }

    return result;
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(fieldValue: unknown, condition: any): boolean {
    const { operator, value } = condition;

    switch (operator) {
      case 'eq':
        return fieldValue === value;
      case 'ne':
        return fieldValue !== value;
      case 'gt':
        return typeof fieldValue === 'number' && fieldValue > (value as number);
      case 'lt':
        return typeof fieldValue === 'number' && fieldValue < (value as number);
      case 'gte':
        return typeof fieldValue === 'number' && fieldValue >= (value as number);
      case 'lte':
        return typeof fieldValue === 'number' && fieldValue <= (value as number);
      case 'in':
        return Array.isArray(value) && value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(fieldValue);
      case 'contains':
        return typeof fieldValue === 'string' && fieldValue.includes(value as string);
      case 'not_contains':
        return typeof fieldValue === 'string' && !fieldValue.includes(value as string);
      case 'regex':
        return typeof fieldValue === 'string' && new RegExp(value as string).test(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Get field value from context (supports nested paths)
   */
  private getFieldValue(context: Record<string, unknown>, field: string): unknown {
    const path = field.split('.');
    let value: unknown = context;

    for (const segment of path) {
      if (value && typeof value === 'object') {
        value = (value as Record<string, unknown>)[segment];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Substitute variables in a string
   */
  private substituteVariables(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getFieldValue(context, path);
      return value !== undefined ? String(value) : match;
    });
  }

  /**
   * Get default retry policy
   */
  private getDefaultRetryPolicy() {
    return {
      maxAttempts: 3,
      strategy: RetryStrategy.EXPONENTIAL,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffMultiplier: 2,
    };
  }

  /**
   * Calculate retry delay
   */
  private calculateRetryDelay(attempt: number, policy: any): number {
    switch (policy.strategy) {
      case RetryStrategy.LINEAR:
        return policy.initialDelay * attempt;
      case RetryStrategy.EXPONENTIAL:
        return Math.min(
          policy.initialDelay * Math.pow(policy.backoffMultiplier, attempt - 1),
          policy.maxDelay
        );
      case RetryStrategy.FIXED:
        return policy.initialDelay;
      default:
        return policy.initialDelay;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get active orchestration
   */
  getActiveOrchestration(requestId: string): OrchestrationResult | undefined {
    return this.activeOrchestrations.get(requestId);
  }

  /**
   * Get all active orchestrations
   */
  getAllActiveOrchestrations(): OrchestrationResult[] {
    return Array.from(this.activeOrchestrations.values());
  }
}
