/**
 * AuthManager Unit Tests
 *
 * Tests for authentication token acquisition, refresh, and secure storage.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { AuthManager } from '../../src/connectivity/auth-manager';
import type { AuthConfig, OAuth2Config, ApiKeyConfig, JwtConfig } from '../../src/types/config-types';
import { ok, err } from '../../src/types/result';

// Mock fetch for OAuth2 token requests
global.fetch = vi.fn();

describe('AuthManager', () => {
  let authManager: AuthManager;

  beforeEach(() => {
    vi.clearAllMocks();
    // Will be initialized in each test with specific config
  });

  describe('OAuth2 Authentication', () => {
    describe('Client Credentials Flow', () => {
      it('should acquire OAuth2 token using client credentials', async () => {
        const oauth2Config: OAuth2Config = {
          type: 'OAUTH2',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          tokenUrl: 'https://auth.example.com/token',
          scope: 'read write',
        };

        const mockTokenResponse = {
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        // This will fail until we implement AuthManager
        const { createAuthManager } = await import('../../src/connectivity/auth-manager');
        authManager = createAuthManager(oauth2Config);

        const result = await authManager.getToken();

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value).toBe('mock-access-token');
        }

        expect(global.fetch).toHaveBeenCalledWith(
          'https://auth.example.com/token',
          expect.objectContaining({
            method: 'POST',
            headers: expect.objectContaining({
              'Content-Type': 'application/x-www-form-urlencoded',
            }),
          })
        );
      });

      it('should include scope in OAuth2 token request', async () => {
        const oauth2Config: OAuth2Config = {
          type: 'OAUTH2',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          tokenUrl: 'https://auth.example.com/token',
          scope: 'read write',
        };

        const mockTokenResponse = {
          access_token: 'mock-access-token',
          token_type: 'Bearer',
          expires_in: 3600,
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        const { createAuthManager } = await import('../../src/connectivity/auth-manager');
        authManager = createAuthManager(oauth2Config);

        await authManager.getToken();

        const fetchCall = (global.fetch as any).mock.calls[0];
        const body = fetchCall[1].body;

        expect(body).toContain('scope=read+write');
      });

      it('should handle OAuth2 token acquisition failure', async () => {
        const oauth2Config: OAuth2Config = {
          type: 'OAUTH2',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          tokenUrl: 'https://auth.example.com/token',
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
        });

        const { createAuthManager } = await import('../../src/connectivity/auth-manager');
        authManager = createAuthManager(oauth2Config);

        const result = await authManager.getToken();

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.type).toBe('AUTH_FAILED');
        }
      });
    });

    describe('Token Refresh', () => {
      it('should refresh expired OAuth2 token', async () => {
        const oauth2Config: OAuth2Config = {
          type: 'OAUTH2',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          tokenUrl: 'https://auth.example.com/token',
        };

        const initialTokenResponse = {
          access_token: 'initial-token',
          token_type: 'Bearer',
          expires_in: 1, // Expires in 1 second
        };

        const refreshedTokenResponse = {
          access_token: 'refreshed-token',
          token_type: 'Bearer',
          expires_in: 3600,
        };

        (global.fetch as any)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => initialTokenResponse,
          })
          .mockResolvedValueOnce({
            ok: true,
            json: async () => refreshedTokenResponse,
          });

        const { createAuthManager } = await import('../../src/connectivity/auth-manager');
        authManager = createAuthManager(oauth2Config);

        // Get initial token
        const initialResult = await authManager.getToken();
        expect(initialResult.success).toBe(true);
        if (initialResult.success) {
          expect(initialResult.value).toBe('initial-token');
        }

        // Wait for token to expire
        await new Promise((resolve) => setTimeout(resolve, 1100));

        // Get token again - should refresh
        const refreshedResult = await authManager.getToken();
        expect(refreshedResult.success).toBe(true);
        if (refreshedResult.success) {
          expect(refreshedResult.value).toBe('refreshed-token');
        }

        // Verify fetch was called twice (initial + refresh)
        expect(global.fetch).toHaveBeenCalledTimes(2);
      });

      it('should return cached token if not expired', async () => {
        const oauth2Config: OAuth2Config = {
          type: 'OAUTH2',
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          tokenUrl: 'https://auth.example.com/token',
        };

        const mockTokenResponse = {
          access_token: 'cached-token',
          token_type: 'Bearer',
          expires_in: 3600,
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => mockTokenResponse,
        });

        const { createAuthManager } = await import('../../src/connectivity/auth-manager');
        authManager = createAuthManager(oauth2Config);

        // Get token first time
        const firstResult = await authManager.getToken();
        expect(firstResult.success).toBe(true);

        // Get token second time - should use cache
        const secondResult = await authManager.getToken();
        expect(secondResult.success).toBe(true);

        // Verify fetch was called only once
        expect(global.fetch).toHaveBeenCalledTimes(1);

        if (firstResult.success && secondResult.success) {
          expect(firstResult.value).toBe(secondResult.value);
        }
      });
    });
  });

  describe('API Key Authentication', () => {
    it('should return API key for header-based auth', async () => {
      const apiKeyConfig: ApiKeyConfig = {
        type: 'API_KEY',
        key: 'test-api-key',
        location: 'header',
        headerName: 'X-API-Key',
      };

      const { createAuthManager } = await import('../../src/connectivity/auth-manager');
      authManager = createAuthManager(apiKeyConfig);

      const result = await authManager.getToken();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('test-api-key');
      }
    });

    it('should return API key for query parameter auth', async () => {
      const apiKeyConfig: ApiKeyConfig = {
        type: 'API_KEY',
        key: 'test-api-key',
        location: 'query',
        queryParamName: 'api_key',
      };

      const { createAuthManager } = await import('../../src/connectivity/auth-manager');
      authManager = createAuthManager(apiKeyConfig);

      const result = await authManager.getToken();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('test-api-key');
      }
    });

    it('should load API key from environment variable', async () => {
      process.env.TEST_API_KEY = 'env-api-key';

      const apiKeyConfig: ApiKeyConfig = {
        type: 'API_KEY',
        key: '${TEST_API_KEY}', // Environment variable reference
        location: 'header',
        headerName: 'X-API-Key',
      };

      const { createAuthManager } = await import('../../src/connectivity/auth-manager');
      authManager = createAuthManager(apiKeyConfig);

      const result = await authManager.getToken();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('env-api-key');
      }

      delete process.env.TEST_API_KEY;
    });
  });

  describe('JWT Authentication', () => {
    it('should return JWT token', async () => {
      const jwtConfig: JwtConfig = {
        type: 'JWT',
        token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token',
      };

      const { createAuthManager } = await import('../../src/connectivity/auth-manager');
      authManager = createAuthManager(jwtConfig);

      const result = await authManager.getToken();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token');
      }
    });

    it('should load JWT token from environment variable', async () => {
      process.env.TEST_JWT_TOKEN = 'env-jwt-token';

      const jwtConfig: JwtConfig = {
        type: 'JWT',
        token: '${TEST_JWT_TOKEN}',
      };

      const { createAuthManager } = await import('../../src/connectivity/auth-manager');
      authManager = createAuthManager(jwtConfig);

      const result = await authManager.getToken();

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('env-jwt-token');
      }

      delete process.env.TEST_JWT_TOKEN;
    });
  });

  describe('Authentication Headers', () => {
    it('should generate correct headers for OAuth2', async () => {
      const oauth2Config: OAuth2Config = {
        type: 'OAUTH2',
        clientId: 'test-client-id',
        clientSecret: 'test-client-secret',
        tokenUrl: 'https://auth.example.com/token',
      };

      const mockTokenResponse = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTokenResponse,
      });

      const { createAuthManager } = await import('../../src/connectivity/auth-manager');
      authManager = createAuthManager(oauth2Config);

      const headers = await authManager.getAuthHeaders();

      expect(headers.success).toBe(true);
      if (headers.success) {
        expect(headers.value).toEqual({
          Authorization: 'Bearer test-access-token',
        });
      }
    });

    it('should generate correct headers for API Key (header)', async () => {
      const apiKeyConfig: ApiKeyConfig = {
        type: 'API_KEY',
        key: 'test-api-key',
        location: 'header',
        headerName: 'X-API-Key',
      };

      const { createAuthManager } = await import('../../src/connectivity/auth-manager');
      authManager = createAuthManager(apiKeyConfig);

      const headers = await authManager.getAuthHeaders();

      expect(headers.success).toBe(true);
      if (headers.success) {
        expect(headers.value).toEqual({
          'X-API-Key': 'test-api-key',
        });
      }
    });

    it('should return empty headers for API Key (query)', async () => {
      const apiKeyConfig: ApiKeyConfig = {
        type: 'API_KEY',
        key: 'test-api-key',
        location: 'query',
        queryParamName: 'api_key',
      };

      const { createAuthManager } = await import('../../src/connectivity/auth-manager');
      authManager = createAuthManager(apiKeyConfig);

      const headers = await authManager.getAuthHeaders();

      expect(headers.success).toBe(true);
      if (headers.success) {
        expect(headers.value).toEqual({});
      }
    });

    it('should generate correct headers for JWT', async () => {
      const jwtConfig: JwtConfig = {
        type: 'JWT',
        token: 'test-jwt-token',
      };

      const { createAuthManager } = await import('../../src/connectivity/auth-manager');
      authManager = createAuthManager(jwtConfig);

      const headers = await authManager.getAuthHeaders();

      expect(headers.success).toBe(true);
      if (headers.success) {
        expect(headers.value).toEqual({
          Authorization: 'Bearer test-jwt-token',
        });
      }
    });
  });

  describe('Credential Security', () => {
    it('should not expose credentials in error messages', async () => {
      const oauth2Config: OAuth2Config = {
        type: 'OAUTH2',
        clientId: 'sensitive-client-id',
        clientSecret: 'sensitive-client-secret',
        tokenUrl: 'https://auth.example.com/token',
      };

      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

      const { createAuthManager } = await import('../../src/connectivity/auth-manager');
      authManager = createAuthManager(oauth2Config);

      const result = await authManager.getToken();

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('AUTH_FAILED');
        if (result.error.type === 'AUTH_FAILED') {
          // Verify that credentials are not exposed in error message
          expect(result.error.reason).not.toContain('sensitive-client-id');
          expect(result.error.reason).not.toContain('sensitive-client-secret');
        }
      }
    });
  });
});
