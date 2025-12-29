import { PrismaClient, CircuitBreakerState, CircuitBreaker } from '@prisma/client';
import { CircuitBreakerConfig, CircuitBreakerState as ApiCircuitBreakerState } from '@insurance/types';
import { prisma } from '../prisma/client.js';
import logger from '../logger.js';

/**
 * Service for managing circuit breakers for external API calls
 */
export class CircuitBreakerService {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();

  /**
   * Get circuit breaker state for a service
   */
  async getCircuitBreaker(serviceId: string): Promise<CircuitBreakerState> {
    // Check in-memory cache first
    const cached = this.circuitBreakers.get(serviceId);
    if (cached) {
      return cached;
    }

    // Load from database
    const breaker = await prisma.circuitBreaker.findUnique({
      where: { serviceId },
    });

    if (!breaker) {
      // Create new circuit breaker
      const newBreaker = await prisma.circuitBreaker.create({
        data: {
          serviceId,
          state: CircuitBreakerState.CLOSED,
          failureCount: 0,
          threshold: 5,
          timeout: 60000,
          halfOpenMaxCalls: 3,
          halfOpenCalls: 0,
        },
      });

      const state = newBreaker.state;
      this.circuitBreakers.set(serviceId, state);
      return state;
    }

    const state = breaker.state;
    this.circuitBreakers.set(serviceId, state);
    return state;
  }

  /**
   * Check if a circuit breaker allows requests
   */
  async canRequest(serviceId: string): Promise<boolean> {
    const state = await this.getCircuitBreaker(serviceId);

    if (state === CircuitBreakerState.CLOSED) {
      return true;
    }

    if (state === CircuitBreakerState.OPEN) {
      // Check if we should transition to HALF_OPEN
      const breaker = await prisma.circuitBreaker.findUnique({
        where: { serviceId },
      });

      if (breaker && breaker.lastFailureTime) {
        const timeSinceLastFailure = Date.now() - breaker.lastFailureTime.getTime();
        if (timeSinceLastFailure > breaker.timeout) {
          // Transition to HALF_OPEN
          await prisma.circuitBreaker.update({
            where: { serviceId },
            data: {
              state: CircuitBreakerState.HALF_OPEN,
              halfOpenCalls: 0,
            },
          });
          this.circuitBreakers.set(serviceId, CircuitBreakerState.HALF_OPEN);
          return true;
        }
      }

      return false;
    }

    // HALF_OPEN state - allow limited calls
    return true;
  }

  /**
   * Record a successful request
   */
  async recordSuccess(serviceId: string): Promise<void> {
    const breaker = await prisma.circuitBreaker.findUnique({
      where: { serviceId },
    });

    if (!breaker) {
      return;
    }

    const updateData: Record<string, unknown> = {
      lastSuccessTime: new Date(),
    };

    if (breaker.state === CircuitBreakerState.HALF_OPEN) {
      updateData.halfOpenCalls = breaker.halfOpenCalls + 1;

      // Check if we should transition back to CLOSED
      if (breaker.halfOpenCalls + 1 >= breaker.halfOpenMaxCalls) {
        updateData.state = CircuitBreakerState.CLOSED;
        updateData.failureCount = 0;
        updateData.halfOpenCalls = 0;
        logger.info('Circuit breaker transitioned to CLOSED', { serviceId });
      }
    } else if (breaker.state === CircuitBreakerState.CLOSED) {
      updateData.failureCount = 0;
    }

    await prisma.circuitBreaker.update({
      where: { serviceId },
      data: updateData,
    });

    this.circuitBreakers.set(serviceId, (updateData.state as CircuitBreakerState) || breaker.state);
  }

  /**
   * Record a failed request
   */
  async recordFailure(serviceId: string): Promise<void> {
    const breaker = await prisma.circuitBreaker.findUnique({
      where: { serviceId },
    });

    if (!breaker) {
      return;
    }

    const updateData: Record<string, unknown> = {
      lastFailureTime: new Date(),
      failureCount: breaker.failureCount + 1,
    };

    if (breaker.state === CircuitBreakerState.HALF_OPEN) {
      // Transition back to OPEN immediately on any failure
      updateData.state = CircuitBreakerState.OPEN;
      updateData.halfOpenCalls = 0;
      logger.warn('Circuit breaker transitioned to OPEN', { serviceId });
    } else if (breaker.failureCount + 1 >= breaker.threshold) {
      // Transition to OPEN if threshold reached
      updateData.state = CircuitBreakerState.OPEN;
      logger.warn('Circuit breaker transitioned to OPEN', { serviceId, failureCount: breaker.failureCount + 1 });
    }

    await prisma.circuitBreaker.update({
      where: { serviceId },
      data: updateData,
    });

    const newState = (updateData.state as CircuitBreakerState) || breaker.state;
    this.circuitBreakers.set(serviceId, newState);
  }

  /**
   * Reset circuit breaker to CLOSED state
   */
  async resetCircuitBreaker(serviceId: string): Promise<void> {
    await prisma.circuitBreaker.update({
      where: { serviceId },
      data: {
        state: CircuitBreakerState.CLOSED,
        failureCount: 0,
        halfOpenCalls: 0,
        lastSuccessTime: new Date(),
      },
    });

    this.circuitBreakers.set(serviceId, CircuitBreakerState.CLOSED);
    logger.info('Circuit breaker reset', { serviceId });
  }

  /**
   * Update circuit breaker configuration
   */
  async updateConfig(serviceId: string, config: CircuitBreakerConfig): Promise<void> {
    const breaker = await prisma.circuitBreaker.findUnique({
      where: { serviceId },
    });

    if (breaker) {
      await prisma.circuitBreaker.update({
        where: { serviceId },
        data: {
          threshold: config.threshold,
          timeout: config.timeout,
          halfOpenMaxCalls: config.halfOpenMaxCalls,
        },
      });

      logger.info('Circuit breaker config updated', { serviceId, config });
    } else {
      // Create with config
      await prisma.circuitBreaker.create({
        data: {
          serviceId,
          state: CircuitBreakerState.CLOSED,
          failureCount: 0,
          threshold: config.threshold,
          timeout: config.timeout,
          halfOpenMaxCalls: config.halfOpenMaxCalls,
          halfOpenCalls: 0,
        },
      });

      logger.info('Circuit breaker created', { serviceId, config });
    }

    this.circuitBreakers.set(serviceId, CircuitBreakerState.CLOSED);
  }

  /**
   * Get all circuit breakers
   */
  async getAllCircuitBreakers(): Promise<CircuitBreaker[]> {
    return prisma.circuitBreaker.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Delete circuit breaker
   */
  async deleteCircuitBreaker(serviceId: string): Promise<void> {
    await prisma.circuitBreaker.delete({
      where: { serviceId },
    });

    this.circuitBreakers.delete(serviceId);
    logger.info('Circuit breaker deleted', { serviceId });
  }

  /**
   * Execute request with circuit breaker protection
   */
  async executeWithCircuitBreaker<T>(
    serviceId: string,
    requestFn: () => Promise<T>
  ): Promise<T> {
    const canRequest = await this.canRequest(serviceId);

    if (!canRequest) {
      throw new Error(`Circuit breaker is OPEN for service: ${serviceId}`);
    }

    try {
      const result = await requestFn();
      await this.recordSuccess(serviceId);
      return result;
    } catch (error) {
      await this.recordFailure(serviceId);
      throw error;
    }
  }
}
