export interface CircuitBreakerConfig {
  threshold: number;
  timeout: number;
  name: string;
  onStateChange?: (state: CircuitBreakerState, reason: string) => void;
}

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open',
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private lastFailureTime?: number;
  private successCount = 0;

  constructor(private config: CircuitBreakerConfig) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionTo(CircuitBreakerState.HALF_OPEN, 'Timeout elapsed, attempting reset');
      } else {
        throw new Error(`Circuit breaker '${this.config.name}' is OPEN`);
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= 2) {
        this.reset();
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.transitionTo(CircuitBreakerState.OPEN, 'Failure in HALF_OPEN state');
      this.successCount = 0;
    } else if (this.failureCount >= this.config.threshold) {
      this.transitionTo(
        CircuitBreakerState.OPEN,
        `Failure count (${this.failureCount}) reached threshold (${this.config.threshold})`
      );
    }
  }

  private shouldAttemptReset(): boolean {
    if (!this.lastFailureTime) return false;
    return Date.now() - this.lastFailureTime > this.config.timeout;
  }

  private reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = undefined;
    this.config.onStateChange?.(this.state, 'Circuit breaker reset');
  }

  private transitionTo(state: CircuitBreakerState, reason: string): void {
    const previousState = this.state;
    this.state = state;
    this.config.onStateChange?.(state, reason);
  }

  getState(): CircuitBreakerState {
    return this.state;
  }

  isOpen(): boolean {
    return this.state === CircuitBreakerState.OPEN;
  }

  getFailureCount(): number {
    return this.failureCount;
  }

  resetManually(): void {
    this.reset();
  }
}
