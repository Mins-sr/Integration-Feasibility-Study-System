/**
 * ConnectorService - HTTP Client for External API/Service Integration
 *
 * Provides a unified HTTP client interface with authentication, rate limiting,
 * and automatic retry logic for connecting to external APIs.
 */

import type { Result } from '../types/result';
import type { HttpError } from '../types/error-types';
import type { TargetConfig } from '../types/config-types';

/**
 * HTTP Request Configuration
 */
export interface HttpRequest {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly url: string;
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
  readonly timeout?: number;
}

/**
 * HTTP Response with Latency Measurement
 */
export interface HttpResponse<T> {
  readonly status: number;
  readonly headers: Record<string, string>;
  readonly data: T;
  readonly latency: number; // milliseconds
}

/**
 * Connection Test Result
 */
export interface ConnectionTestResult {
  readonly reachable: boolean;
  readonly latency: number; // milliseconds
  readonly tlsVersion?: string;
  readonly certificateValid?: boolean;
}

/**
 * ConnectorService Interface
 *
 * Responsible for all HTTP communication with external APIs.
 */
export interface ConnectorService {
  /**
   * Send HTTP request to target API
   *
   * @param request - HTTP request configuration
   * @returns HTTP response or error
   *
   * Preconditions:
   * - request.url must be a valid HTTP/HTTPS URL
   * - request.method must be a valid HTTP method
   *
   * Postconditions:
   * - Response includes latency measurement
   * - User-Agent header is automatically injected
   * - Request and response are logged (with sensitive headers masked)
   */
  sendRequest<T>(request: HttpRequest): Promise<Result<HttpResponse<T>, HttpError>>;

  /**
   * Test connection to target API
   *
   * @param target - Target API configuration
   * @returns Connection test result with latency
   *
   * Preconditions:
   * - target.url must be a valid HTTP/HTTPS URL
   *
   * Postconditions:
   * - For HTTPS endpoints, TLS certificate is verified
   * - Latency is measured (round-trip time)
   */
  testConnection(target: TargetConfig): Promise<Result<ConnectionTestResult, HttpError>>;
}
