/**
 * Rate Limiter and Retry Logic
 *
 * Implements exponential backoff retry strategy and circuit breaker pattern
 * for handling rate limits and preventing cascading failures.
 */

/**
 * Retry Delay Strategy Interface
 */
export interface RetryStrategy {
  /**
   * Calculate delay for a given retry attempt
   *
   * @param attempt - Retry attempt number (1-based)
   * @returns Delay in milliseconds
   */
  calculateDelay(attempt: number): number;
}

/**
 * Exponential Backoff Strategy
 *
 * Implements exponential backoff with the formula: delay = 1000 * 2^(attempt-1)
 * Maximum delay is capped at 60 seconds.
 */
export class ExponentialBackoffStrategy implements RetryStrategy {
  private readonly baseDelay = 1000; // 1 second
  private readonly maxDelay = 60000; // 60 seconds

  calculateDelay(attempt: number): number {
    // Formula: delay = baseDelay * 2^(attempt-1)
    const delay = this.baseDelay * Math.pow(2, attempt - 1);
    return Math.min(delay, this.maxDelay);
  }
}

/**
 * Circuit Breaker State
 */
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

/**
 * Circuit Breaker Pattern Implementation
 *
 * Opens circuit after consecutive failures exceed threshold,
 * preventing further requests until cooldown period expires.
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;

  /**
   * @param failureThreshold - Number of consecutive failures before opening circuit
   * @param cooldownPeriod - Time in milliseconds before attempting to close circuit
   */
  constructor(
    private readonly failureThreshold: number,
    private readonly cooldownPeriod: number
  ) {}

  /**
   * Check if circuit is open
   *
   * @returns true if circuit is open (blocking requests)
   */
  isOpen(): boolean {
    // Check if cooldown period has elapsed
    if (this.state === 'OPEN') {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.cooldownPeriod) {
        this.state = 'HALF_OPEN';
        this.failureCount = 0;
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record a successful request
   *
   * Resets failure count and closes circuit if in HALF_OPEN state
   */
  recordSuccess(): void {
    this.failureCount = 0;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
    }
  }

  /**
   * Record a failed request
   *
   * Increments failure count and opens circuit if threshold is reached
   */
  recordFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
    }
  }
}

/**
 * Rate Limiter with Retry Logic
 *
 * Combines retry strategy and circuit breaker to handle rate limiting
 * and prevent cascading failures.
 */
export class RateLimiter {
  private readonly retryStrategy: RetryStrategy;
  private readonly circuitBreaker: CircuitBreaker;

  /**
   * @param maxAttempts - Maximum number of retry attempts
   * @param failureThreshold - Number of consecutive failures before opening circuit (default: 5)
   * @param cooldownPeriod - Circuit breaker cooldown in milliseconds (default: 30 seconds)
   */
  constructor(
    private readonly maxAttempts: number,
    failureThreshold: number = 5,
    cooldownPeriod: number = 30000
  ) {
    this.retryStrategy = new ExponentialBackoffStrategy();
    this.circuitBreaker = new CircuitBreaker(failureThreshold, cooldownPeriod);
  }

  /**
   * Determine if retry should be attempted
   *
   * @param attempt - Current attempt number
   * @returns true if retry should be attempted
   *
   * Preconditions:
   * - attempt must be a positive integer
   *
   * Postconditions:
   * - Returns false if attempt exceeds maxAttempts
   * - Returns false if circuit breaker is open
   */
  shouldRetry(attempt: number): boolean {
    // Validate attempt number
    if (attempt <= 0) {
      return false;
    }

    // Check if circuit is open
    if (this.circuitBreaker.isOpen()) {
      return false;
    }

    // Check if max attempts exceeded
    if (attempt > this.maxAttempts) {
      return false;
    }

    return true;
  }

  /**
   * Get retry delay for a given attempt
   *
   * @param attempt - Retry attempt number
   * @param retryAfter - Optional retry-after value from HTTP header (in seconds)
   * @returns Delay in milliseconds
   *
   * Invariants:
   * - If retryAfter is provided, it takes precedence over exponential backoff
   */
  getRetryDelay(attempt: number, retryAfter?: number): number {
    if (retryAfter !== undefined) {
      // Convert seconds to milliseconds
      return retryAfter * 1000;
    }

    return this.retryStrategy.calculateDelay(attempt);
  }

  /**
   * Log retry attempt
   *
   * @param attempt - Retry attempt number
   * @param delay - Delay in milliseconds
   * @param retryAfter - Optional retry-after value (in seconds)
   */
  logRetry(attempt: number, delay: number, retryAfter?: number): void {
    const logData: Record<string, unknown> = {
      attempt,
      delay,
      timestamp: new Date().toISOString(),
    };

    if (retryAfter !== undefined) {
      logData.retryAfter = retryAfter;
    }

    console.log('[Rate Limiter] Retry scheduled', logData);
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.circuitBreaker.recordSuccess();
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.circuitBreaker.recordFailure();
  }
}
