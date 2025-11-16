/**
 * AxiosConnector - Axios-based Implementation of ConnectorService
 *
 * Provides HTTP client functionality with automatic User-Agent injection,
 * request/response logging, and comprehensive error handling.
 */

import axios, { type AxiosInstance, type AxiosError, type AxiosResponse } from 'axios';
import type { ConnectorService, HttpRequest, HttpResponse, ConnectionTestResult } from './connector-service';
import type { Result } from '../types/result';
import { ok, err } from '../types/result';
import type { HttpError } from '../types/error-types';
import type { TargetConfig } from '../types/config-types';

/**
 * Default timeout for HTTP requests (30 seconds)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * User-Agent header value for all requests
 */
const USER_AGENT = 'Integration-Feasibility-Study/1.0.0';

/**
 * Sensitive header names that should be masked in logs
 */
const SENSITIVE_HEADERS = ['authorization', 'api-key', 'x-api-key', 'cookie', 'set-cookie'];

/**
 * Logger interface for request/response logging
 */
interface Logger {
  logRequest(method: string, url: string, headers: Record<string, string>): void;
  logResponse(status: number, latency: number): void;
}

/**
 * Simple console-based logger with header sanitization
 */
class ConsoleLogger implements Logger {
  private maskSensitiveHeaders(headers: Record<string, string>): Record<string, string> {
    const masked: Record<string, string> = {};
    for (const [key, value] of Object.entries(headers)) {
      if (SENSITIVE_HEADERS.includes(key.toLowerCase())) {
        masked[key] = '***MASKED***';
      } else {
        masked[key] = value;
      }
    }
    return masked;
  }

  logRequest(method: string, url: string, headers: Record<string, string>): void {
    const maskedHeaders = this.maskSensitiveHeaders(headers);
    console.log(`[HTTP Request] ${method} ${url}`, { headers: maskedHeaders });
  }

  logResponse(status: number, latency: number): void {
    console.log(`[HTTP Response] Status: ${status}, Latency: ${latency}ms`);
  }
}

/**
 * Axios-based ConnectorService implementation
 */
export class AxiosConnector implements ConnectorService {
  private readonly axiosInstance: AxiosInstance;
  private readonly logger: Logger;

  constructor(timeout: number = DEFAULT_TIMEOUT, logger: Logger = new ConsoleLogger()) {
    this.logger = logger;
    this.axiosInstance = axios.create({
      timeout,
      validateStatus: () => true, // Don't throw on any status code
    });

    // Add request interceptor for User-Agent injection and logging
    this.axiosInstance.interceptors.request.use((config) => {
      // Inject User-Agent header
      if (!config.headers) {
        config.headers = {} as any;
      }
      config.headers['User-Agent'] = USER_AGENT;

      // Log request
      this.logger.logRequest(
        config.method?.toUpperCase() || 'GET',
        config.url || '',
        config.headers as Record<string, string>
      );

      // Add start time for latency measurement
      (config as any).startTime = Date.now();

      return config;
    });

    // Add response interceptor for logging
    this.axiosInstance.interceptors.response.use(
      (response) => {
        const latency = Date.now() - ((response.config as any).startTime || Date.now());
        this.logger.logResponse(response.status, latency);
        (response as any).latency = latency;
        return response;
      },
      (error) => {
        // Even for errors, log if possible
        if (error.response) {
          const latency = Date.now() - ((error.config as any).startTime || Date.now());
          this.logger.logResponse(error.response.status, latency);
          (error.response as any).latency = latency;
        }
        return Promise.reject(error);
      }
    );
  }

  async sendRequest<T>(request: HttpRequest): Promise<Result<HttpResponse<T>, HttpError>> {
    // Validate URL
    if (!this.isValidUrl(request.url)) {
      return err({
        type: 'VALIDATION_ERROR',
        message: `Invalid URL: ${request.url}. Only HTTP and HTTPS protocols are allowed.`,
      });
    }

    try {
      const startTime = Date.now();
      const response: AxiosResponse<T> = await this.axiosInstance.request({
        method: request.method,
        url: request.url,
        headers: request.headers,
        data: request.body,
        timeout: request.timeout || DEFAULT_TIMEOUT,
      });

      const latency = (response as any).latency || Date.now() - startTime;

      // Handle error status codes
      if (response.status === 429) {
        const retryAfter = this.parseRetryAfter(response.headers['retry-after']);
        return err({
          type: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
        });
      }

      if (response.status === 401) {
        return err({
          type: 'AUTH_FAILED',
          reason: 'Authentication failed (HTTP 401)',
        });
      }

      return ok({
        status: response.status,
        headers: response.headers as Record<string, string>,
        data: response.data,
        latency,
      });
    } catch (error) {
      return this.handleAxiosError(error as AxiosError);
    }
  }

  async testConnection(target: TargetConfig): Promise<Result<ConnectionTestResult, HttpError>> {
    // Validate URL
    if (!this.isValidUrl(target.url)) {
      return err({
        type: 'VALIDATION_ERROR',
        message: `Invalid URL: ${target.url}. Only HTTP and HTTPS protocols are allowed.`,
      });
    }

    try {
      const startTime = Date.now();
      const response = await this.axiosInstance.get(target.url, {
        timeout: target.timeout || DEFAULT_TIMEOUT,
      });

      const latency = Date.now() - startTime;

      // Extract TLS information for HTTPS
      let tlsVersion: string | undefined;
      let certificateValid: boolean | undefined;

      if (target.url.startsWith('https')) {
        // TLS info would be available from the socket, but Axios doesn't expose it easily
        // For now, we just mark as valid if connection succeeded
        certificateValid = true;
        tlsVersion = 'TLS 1.2+'; // Assume modern TLS
      }

      return ok({
        reachable: response.status >= 200 && response.status < 500,
        latency,
        tlsVersion,
        certificateValid,
      });
    } catch (error) {
      const axiosError = error as AxiosError;

      // If it's a TLS error, mark certificate as invalid
      if (axiosError.code === 'CERT_HAS_EXPIRED' || axiosError.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        return ok({
          reachable: false,
          latency: 0,
          tlsVersion: undefined,
          certificateValid: false,
        });
      }

      return this.handleAxiosError(axiosError);
    }
  }

  /**
   * Validate URL format (only HTTP and HTTPS allowed)
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsedUrl = new URL(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Parse Retry-After header value
   */
  private parseRetryAfter(retryAfter: string | undefined): number {
    if (!retryAfter) {
      return 60; // Default 60 seconds
    }

    // Try to parse as seconds
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds;
    }

    // Try to parse as HTTP date
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
      return Math.max(0, Math.floor((date.getTime() - Date.now()) / 1000));
    }

    return 60; // Default fallback
  }

  /**
   * Handle Axios errors and convert to HttpError
   */
  private handleAxiosError(error: AxiosError): Result<never, HttpError> {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return err({
        type: 'TIMEOUT',
        duration: error.config?.timeout || DEFAULT_TIMEOUT,
      });
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.code === 'ENETUNREACH') {
      return err({
        type: 'NETWORK_ERROR',
        cause: error,
      });
    }

    // Generic network error
    return err({
      type: 'NETWORK_ERROR',
      cause: error,
    });
  }
}

/**
 * Factory function to create AxiosConnector instance
 */
export function createAxiosConnector(timeout?: number): ConnectorService {
  return new AxiosConnector(timeout);
}
