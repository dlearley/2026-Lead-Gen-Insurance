export interface RetryStrategyConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  retryableErrors?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

export class RetryStrategy {
  constructor(private config: RetryStrategyConfig) {}

  async execute<T>(fn: (attempt: number) => Promise<T>): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        return await fn(attempt);
      } catch (error) {
        lastError = error;

        if (!this.isRetryable(error) || attempt === this.config.maxAttempts) {
          throw error;
        }

        const delay = this.calculateDelay(attempt);
        this.config.onRetry?.(attempt, error);
        
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private isRetryable(error: any): boolean {
    if (this.config.retryableErrors) {
      return this.config.retryableErrors(error);
    }

    const retryableCodes = [
      'ECONNREFUSED',
      'ETIMEDOUT',
      'ECONNRESET',
      'ENOTFOUND',
      'EAI_AGAIN',
      '57P01', // PostgreSQL admin shutdown
      '57P02', // PostgreSQL crash shutdown
      '57P03', // PostgreSQL cannot connect now
      '08006', // PostgreSQL connection failure
      '08001', // PostgreSQL SQL client unable to establish connection
    ];

    const errorCode = error?.code || error?.errno;
    return retryableCodes.includes(errorCode);
  }

  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.config.initialDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
    return Math.min(exponentialDelay, this.config.maxDelay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
