/**
 * AxiosConnectorWithRetry - Enhanced Axios Connector with Automatic Retry Logic
 *
 * Extends AxiosConnector with automatic retry on rate limits and transient failures,
 * using exponential backoff and circuit breaker pattern.
 */

import { AxiosConnector } from './axios-connector';
import type { ConnectorService, HttpRequest, HttpResponse, ConnectionTestResult } from './connector-service';
import type { Result } from '../types/result';
import type { HttpError } from '../types/error-types';
import type { TargetConfig } from '../types/config-types';
import { RateLimiter } from './rate-limiter';
import { isErr } from '../types/result';

/**
 * Errors that should trigger automatic retry
 */
const RETRYABLE_ERRORS: ReadonlySet<HttpError['type']> = new Set([
  'RATE_LIMIT_EXCEEDED',
  'TIMEOUT',
  'NETWORK_ERROR',
]);

/**
 * AxiosConnector with automatic retry logic
 *
 * Wraps AxiosConnector and adds retry functionality with exponential backoff
 * and circuit breaker pattern for handling rate limits and transient failures.
 */
export class AxiosConnectorWithRetry implements ConnectorService {
  private readonly connector: AxiosConnector;
  private readonly rateLimiter: RateLimiter;

  /**
   * @param timeout - HTTP request timeout in milliseconds (default: 30000)
   * @param maxRetries - Maximum number of retry attempts (default: 3)
   */
  constructor(timeout: number = 30000, maxRetries: number = 3) {
    this.connector = new AxiosConnector(timeout);
    this.rateLimiter = new RateLimiter(maxRetries);
  }

  /**
   * Send HTTP request with automatic retry on failures
   *
   * Implements retry logic:
   * 1. Attempt request
   * 2. If rate limit or transient error, retry with exponential backoff
   * 3. Respect retry-after header from server
   * 4. Stop after max attempts or if circuit is open
   *
   * @param request - HTTP request configuration
   * @returns HTTP response or error
   */
  async sendRequest<T>(request: HttpRequest): Promise<Result<HttpResponse<T>, HttpError>> {
    let attempt = 0;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      attempt++;

      // Attempt the request
      const result = await this.connector.sendRequest<T>(request);

      // If successful, record success and return
      if (!isErr(result)) {
        if (attempt > 1) {
          this.rateLimiter.recordSuccess();
        }
        return result;
      }

      // Check if error is retryable
      const error = result.error;
      const isRetryable = RETRYABLE_ERRORS.has(error.type);

      if (!isRetryable) {
        // Non-retryable error (e.g., VALIDATION_ERROR, AUTH_FAILED)
        return result;
      }

      // Record failure for circuit breaker
      this.rateLimiter.recordFailure();

      // Check if we should retry (this will return false if max attempts exceeded or circuit is open)
      if (!this.rateLimiter.shouldRetry(attempt)) {
        return result; // Return the current error result
      }

      // Calculate delay for next retry
      const retryAfter = error.type === 'RATE_LIMIT_EXCEEDED' ? error.retryAfter : undefined;
      const delay = this.rateLimiter.getRetryDelay(attempt, retryAfter);

      // Log retry attempt
      this.rateLimiter.logRetry(attempt, delay, retryAfter);

      // Wait before retrying
      await this.sleep(delay);
    }
  }

  /**
   * Test connection to target API
   *
   * Connection testing uses a single attempt without retry logic,
   * as it's meant to quickly verify reachability rather than ensure success.
   *
   * @param target - Target API configuration
   * @returns Connection test result with latency
   */
  async testConnection(target: TargetConfig): Promise<Result<ConnectionTestResult, HttpError>> {
    // Connection test does not retry - it's meant to be a quick check
    return this.connector.testConnection(target);
  }

  /**
   * Sleep utility for retry delays
   *
   * @param ms - Milliseconds to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create AxiosConnectorWithRetry instance
 *
 * @param timeout - HTTP request timeout in milliseconds
 * @param maxRetries - Maximum number of retry attempts
 * @returns ConnectorService with retry logic
 */
export function createAxiosConnectorWithRetry(timeout?: number, maxRetries?: number): ConnectorService {
  return new AxiosConnectorWithRetry(timeout, maxRetries);
}
