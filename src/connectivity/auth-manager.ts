/**
 * AuthManager - Authentication Token Management
 *
 * Manages authentication tokens for OAuth2.0, API Key, and JWT authentication methods.
 * Handles token acquisition, caching, refresh, and secure credential storage.
 */

import type { Result } from '../types/result';
import type { HttpError } from '../types/error-types';
import type { AuthConfig, OAuth2Config, ApiKeyConfig, JwtConfig } from '../types/config-types';
import { ok, err } from '../types/result';

/**
 * Utility function to resolve environment variables in credential strings
 * @param value - String potentially containing ${VAR_NAME} patterns
 * @returns String with environment variables resolved
 */
function resolveEnvVars(value: string): string {
  // Match ${VAR_NAME} pattern
  const envVarPattern = /\$\{([^}]+)\}/g;
  return value.replace(envVarPattern, (_, varName) => {
    return process.env[varName] || '';
  });
}

/**
 * OAuth2 Token Response
 */
interface OAuth2TokenResponse {
  readonly access_token: string;
  readonly token_type: string;
  readonly expires_in: number;
  readonly refresh_token?: string;
}

/**
 * Cached Token with Expiration
 */
interface CachedToken {
  readonly token: string;
  readonly expiresAt: number; // Unix timestamp in milliseconds
}

/**
 * AuthManager Interface
 *
 * Responsible for managing authentication credentials and tokens.
 */
export interface AuthManager {
  /**
   * Get authentication token
   *
   * For OAuth2: Acquires or returns cached token, refreshes if expired
   * For API Key: Returns the API key
   * For JWT: Returns the JWT token
   *
   * @returns Authentication token or error
   */
  getToken(): Promise<Result<string, HttpError>>;

  /**
   * Get authentication headers for HTTP requests
   *
   * @returns Headers object with authentication information
   */
  getAuthHeaders(): Promise<Result<Record<string, string>, HttpError>>;
}

/**
 * OAuth2 Authentication Manager
 */
class OAuth2AuthManager implements AuthManager {
  private cachedToken: CachedToken | null = null;

  constructor(private readonly config: OAuth2Config) {}

  async getToken(): Promise<Result<string, HttpError>> {
    // Check if cached token is still valid
    if (this.cachedToken && this.isTokenValid(this.cachedToken)) {
      return ok(this.cachedToken.token);
    }

    // Acquire new token
    return this.acquireToken();
  }

  async getAuthHeaders(): Promise<Result<Record<string, string>, HttpError>> {
    const tokenResult = await this.getToken();
    if (!tokenResult.success) {
      return tokenResult;
    }

    return ok({
      Authorization: `Bearer ${tokenResult.value}`,
    });
  }

  private isTokenValid(cachedToken: CachedToken): boolean {
    const now = Date.now();
    // Add 60 second buffer to avoid using tokens that are about to expire
    return cachedToken.expiresAt > now + 60000;
  }

  private async acquireToken(): Promise<Result<string, HttpError>> {
    try {
      const body = new URLSearchParams();
      body.append('grant_type', 'client_credentials');
      body.append('client_id', this.config.clientId);
      body.append('client_secret', this.config.clientSecret);

      if (this.config.scope) {
        body.append('scope', this.config.scope);
      }

      const response = await fetch(this.config.tokenUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (!response.ok) {
        return err({
          type: 'AUTH_FAILED',
          reason: `OAuth2 token acquisition failed: ${response.status} ${response.statusText}`,
        });
      }

      const tokenResponse: OAuth2TokenResponse = await response.json();

      // Cache the token with expiration
      const expiresAt = Date.now() + tokenResponse.expires_in * 1000;
      this.cachedToken = {
        token: tokenResponse.access_token,
        expiresAt,
      };

      return ok(tokenResponse.access_token);
    } catch (error) {
      // Ensure credentials are not exposed in error messages
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return err({
        type: 'AUTH_FAILED',
        reason: `OAuth2 token acquisition failed: ${errorMessage}`,
      });
    }
  }
}

/**
 * API Key Authentication Manager
 */
class ApiKeyAuthManager implements AuthManager {
  private readonly resolvedKey: string;

  constructor(private readonly config: ApiKeyConfig) {
    // Resolve environment variables in API key
    this.resolvedKey = resolveEnvVars(config.key);
  }

  async getToken(): Promise<Result<string, HttpError>> {
    return ok(this.resolvedKey);
  }

  async getAuthHeaders(): Promise<Result<Record<string, string>, HttpError>> {
    if (this.config.location === 'query') {
      // For query parameter auth, headers are empty
      return ok({});
    }

    // For header-based auth
    const headerName = this.config.headerName || 'X-API-Key';
    return ok({
      [headerName]: this.resolvedKey,
    });
  }
}

/**
 * JWT Authentication Manager
 */
class JwtAuthManager implements AuthManager {
  private readonly resolvedToken: string;

  constructor(private readonly config: JwtConfig) {
    // Resolve environment variables in JWT token
    this.resolvedToken = resolveEnvVars(config.token);
  }

  async getToken(): Promise<Result<string, HttpError>> {
    return ok(this.resolvedToken);
  }

  async getAuthHeaders(): Promise<Result<Record<string, string>, HttpError>> {
    return ok({
      Authorization: `Bearer ${this.resolvedToken}`,
    });
  }
}

/**
 * Factory function to create appropriate AuthManager based on configuration
 *
 * @param config - Authentication configuration
 * @returns AuthManager instance
 */
export function createAuthManager(config: AuthConfig): AuthManager {
  switch (config.type) {
    case 'OAUTH2':
      return new OAuth2AuthManager(config);
    case 'API_KEY':
      return new ApiKeyAuthManager(config);
    case 'JWT':
      return new JwtAuthManager(config);
  }
}
