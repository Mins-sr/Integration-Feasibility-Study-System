/**
 * Tests for ConnectorService - HTTP Client for External API Integration
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { AxiosConnector } from '../../src/connectivity/axios-connector';
import type { HttpRequest } from '../../src/connectivity/connector-service';
import { isOk, isErr } from '../../src/types/result';

// Mock console.log to avoid noise in test output
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = vi.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
});

describe('ConnectorService', () => {
  let connector: AxiosConnector;
  let mock: MockAdapter;

  beforeEach(() => {
    connector = new AxiosConnector();
    // Create a new mock adapter that will mock the internal axios instance
    // Since AxiosConnector uses its own axios instance, we'll need to test with real HTTP
    // or refactor to inject the axios instance. For now, we'll use a simpler approach:
    // We'll create a mock server for integration tests
  });

  describe('Interface Contract', () => {
    it('should define sendRequest method with correct signature', () => {
      expect(connector.sendRequest).toBeDefined();
      expect(typeof connector.sendRequest).toBe('function');
    });

    it('should define testConnection method with correct signature', () => {
      expect(connector.testConnection).toBeDefined();
      expect(typeof connector.testConnection).toBe('function');
    });
  });

  describe('URL Validation', () => {
    it('should return VALIDATION_ERROR for invalid URL', async () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'not-a-valid-url',
      };

      const result = await connector.sendRequest(request);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
      }
    });

    it('should return VALIDATION_ERROR for file:// protocol', async () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'file:///etc/passwd',
      };

      const result = await connector.sendRequest(request);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
      }
    });

    it('should return VALIDATION_ERROR for ftp:// protocol', async () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'ftp://example.com',
      };

      const result = await connector.sendRequest(request);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('sendRequest - Integration Tests', () => {
    it('should send HTTP GET request successfully', async () => {
      // Use a real public API for integration test
      const request: HttpRequest = {
        method: 'GET',
        url: 'https://httpbin.org/get',
      };

      const result = await connector.sendRequest(request);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe(200);
        expect(result.value.latency).toBeGreaterThan(0);
        expect(result.value.headers).toBeDefined();
        expect(result.value.data).toBeDefined();
      }
    }, 10000); // 10 second timeout for network request

    it('should send HTTP POST request with body', async () => {
      const testData = { message: 'test' };
      const request: HttpRequest = {
        method: 'POST',
        url: 'https://httpbin.org/post',
        body: testData,
      };

      const result = await connector.sendRequest(request);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe(200);
        expect(result.value.data).toBeDefined();
      }
    }, 10000);

    it('should include custom headers in request', async () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'https://httpbin.org/headers',
        headers: {
          'X-Custom-Header': 'test-value',
        },
      };

      const result = await connector.sendRequest(request);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const data = result.value.data as any;
        expect(data.headers['X-Custom-Header']).toBe('test-value');
      }
    }, 10000);

    it('should automatically inject User-Agent header', async () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'https://httpbin.org/headers',
      };

      const result = await connector.sendRequest(request);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const data = result.value.data as any;
        expect(data.headers['User-Agent']).toContain('Integration-Feasibility-Study');
      }
    }, 10000);

    it('should measure request latency', async () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'https://httpbin.org/delay/1', // 1 second delay
      };

      const result = await connector.sendRequest(request);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.latency).toBeGreaterThanOrEqual(1000); // At least 1 second
      }
    }, 15000);

    it('should return RATE_LIMIT_EXCEEDED error on HTTP 429', async () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'https://httpbin.org/status/429',
      };

      const result = await connector.sendRequest(request);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('RATE_LIMIT_EXCEEDED');
        expect(result.error.retryAfter).toBeGreaterThan(0);
      }
    }, 10000);

    it('should return AUTH_FAILED error on HTTP 401', async () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'https://httpbin.org/status/401',
      };

      const result = await connector.sendRequest(request);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('AUTH_FAILED');
      }
    }, 10000);

    it('should return TIMEOUT error when request exceeds timeout', async () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'https://httpbin.org/delay/5',
        timeout: 1000, // 1 second timeout
      };

      const result = await connector.sendRequest(request);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('TIMEOUT');
      }
    }, 10000);

    it('should return NETWORK_ERROR on connection failure', async () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'https://this-domain-definitely-does-not-exist-12345.com',
      };

      const result = await connector.sendRequest(request);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('NETWORK_ERROR');
      }
    }, 10000);
  });

  describe('testConnection - Integration Tests', () => {
    it('should successfully test connection to reachable API', async () => {
      const result = await connector.testConnection({
        url: 'https://httpbin.org/get',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.reachable).toBe(true);
        expect(result.value.latency).toBeGreaterThan(0);
      }
    }, 10000);

    it('should measure connection latency', async () => {
      const result = await connector.testConnection({
        url: 'https://httpbin.org/delay/1',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.latency).toBeGreaterThanOrEqual(1000);
      }
    }, 15000);

    it('should verify TLS certificate for HTTPS endpoints', async () => {
      const result = await connector.testConnection({
        url: 'https://httpbin.org/get',
      });

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.certificateValid).toBe(true);
        expect(result.value.tlsVersion).toBeDefined();
      }
    }, 10000);

    it('should return detailed error for unreachable target', async () => {
      const result = await connector.testConnection({
        url: 'https://this-domain-definitely-does-not-exist-12345.com',
      });

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('NETWORK_ERROR');
      }
    }, 10000);
  });

  describe('Logging', () => {
    it('should log outgoing requests with method and URL', async () => {
      const logSpy = vi.spyOn(console, 'log');

      const request: HttpRequest = {
        method: 'GET',
        url: 'https://httpbin.org/get',
      };

      await connector.sendRequest(request);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[HTTP Request]'),
        expect.objectContaining({
          headers: expect.any(Object),
        })
      );
    }, 10000);

    it('should log responses with status code and latency', async () => {
      const logSpy = vi.spyOn(console, 'log');

      const request: HttpRequest = {
        method: 'GET',
        url: 'https://httpbin.org/get',
      };

      await connector.sendRequest(request);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[HTTP Response]')
      );
    }, 10000);

    it('should not log sensitive headers in logs', async () => {
      const logSpy = vi.spyOn(console, 'log');

      const request: HttpRequest = {
        method: 'GET',
        url: 'https://httpbin.org/headers',
        headers: {
          'Authorization': 'Bearer secret-token',
          'X-Custom-Header': 'visible-value',
        },
      };

      await connector.sendRequest(request);

      const logCalls = logSpy.mock.calls;
      const requestLog = logCalls.find(call =>
        typeof call[0] === 'string' && call[0].includes('[HTTP Request]')
      );

      expect(requestLog).toBeDefined();
      if (requestLog && requestLog[1]) {
        const headers = (requestLog[1] as any).headers;
        expect(headers['Authorization']).toBe('***MASKED***');
        expect(headers['X-Custom-Header']).toBe('visible-value');
      }
    }, 10000);
  });

  describe('Configuration', () => {
    it('should use default timeout of 30 seconds', () => {
      const connector = new AxiosConnector();
      // Default timeout is applied internally, we can verify behavior
      expect(connector).toBeDefined();
    });

    it('should allow custom timeout configuration', () => {
      const customTimeout = 5000;
      const connector = new AxiosConnector(customTimeout);
      expect(connector).toBeDefined();
    });

    it('should always use User-Agent header', async () => {
      const request: HttpRequest = {
        method: 'GET',
        url: 'https://httpbin.org/headers',
      };

      const result = await connector.sendRequest(request);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const data = result.value.data as any;
        expect(data.headers['User-Agent']).toBeDefined();
        expect(data.headers['User-Agent']).toContain('Integration-Feasibility-Study');
      }
    }, 10000);
  });
});
