/**
 * OpenAPI Specification Generator
 *
 * Generates OpenAPI 3.1.0 specifications from integration study results.
 * Includes authentication methods, security schemes, and API documentation.
 */

import type { Result } from '@/types/result';
import { ok, err } from '@/types/result';
import type {
  AggregatedStudyResult,
  OpenAPISpec,
  OpenAPIGenerationConfig,
  OpenAPISecurityScheme,
  ReportGenerationError,
} from './types';
import type { VulnerabilityReport, AuthMethod } from '@/analysis/security/types';

export class OpenAPIGenerator {
  /**
   * Generate OpenAPI 3.1.0 specification from aggregated study results
   *
   * @param aggregated - Aggregated study results
   * @param config - OpenAPI generation configuration
   * @returns OpenAPI specification or generation error
   */
  generate(
    aggregated: AggregatedStudyResult,
    config: OpenAPIGenerationConfig
  ): Result<OpenAPISpec, ReportGenerationError> {
    // Validate target URL
    if (!this.isValidUrl(config.targetUrl)) {
      return err({
        type: 'VALIDATION_ERROR',
        message: `Invalid target URL: ${config.targetUrl}. Must be a valid HTTP or HTTPS URL.`,
      });
    }

    // Build OpenAPI spec
    const spec: OpenAPISpec = {
      openapi: '3.1.0',
      info: {
        title: config.apiTitle,
        version: config.apiVersion,
        description: config.apiDescription,
      },
      servers: [
        {
          url: config.targetUrl,
          description: 'Target API server for integration study',
        },
      ],
    };

    // Add security schemes if security data exists
    if (aggregated.hasSecurityData) {
      const securityResult = aggregated.analyzerResults.find(
        (r) => r.analyzerType === 'SECURITY' && r.status === 'COMPLETED'
      );

      if (securityResult && securityResult.data) {
        const vulnReport = securityResult.data as VulnerabilityReport;
        const securitySchemes = this.buildSecuritySchemes(vulnReport.authMethods);

        if (Object.keys(securitySchemes).length > 0) {
          spec.components = {
            securitySchemes,
          };
        }
      }
    }

    return ok(spec);
  }

  /**
   * Serialize OpenAPI spec to formatted JSON string
   *
   * @param spec - OpenAPI specification
   * @returns JSON string with 2-space indentation
   */
  serialize(spec: OpenAPISpec): Result<string, ReportGenerationError> {
    try {
      // Format with 2-space indentation
      const json = JSON.stringify(spec, null, 2);
      return ok(json);
    } catch (error) {
      return err({
        type: 'GENERATION_FAILED',
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Build security schemes from authentication methods
   *
   * @param authMethods - Authentication methods from security analysis
   * @returns Security schemes record
   */
  private buildSecuritySchemes(authMethods: readonly AuthMethod[]): Record<string, OpenAPISecurityScheme> {
    const schemes: Record<string, OpenAPISecurityScheme> = {};

    for (const method of authMethods) {
      const normalizedType = method.type.toLowerCase().replace(/\s+/g, '');

      if (normalizedType.includes('apikey') || normalizedType === 'api' || normalizedType.includes('key')) {
        // Determine location from details
        const isQuery = method.details.toLowerCase().includes('query');
        const isHeader = method.details.toLowerCase().includes('header');

        // Extract parameter name from details (e.g., "Header: X-API-Key" -> "X-API-Key")
        const nameMatch = method.details.match(/:\s*([^\s,]+)/);
        const paramName = nameMatch ? nameMatch[1] : 'api_key';

        const schemeName = isQuery ? 'apiKeyQuery' : 'apiKey';
        schemes[schemeName] = {
          type: 'apiKey',
          name: paramName,
          in: isQuery ? 'query' : 'header',
          description: method.details,
        };
      } else if (normalizedType.includes('bearer') || normalizedType.includes('jwt')) {
        schemes.bearerAuth = {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: normalizedType.includes('jwt') ? 'JWT' : undefined,
          description: method.details,
        };
      } else if (normalizedType.includes('oauth')) {
        // OAuth2 scheme
        const flows: Record<string, unknown> = {};

        // Detect flow type from details
        if (method.details.toLowerCase().includes('authorization code')) {
          flows.authorizationCode = {
            authorizationUrl: 'https://example.com/oauth/authorize',
            tokenUrl: 'https://example.com/oauth/token',
            scopes: {},
          };
        } else if (method.details.toLowerCase().includes('client credentials')) {
          flows.clientCredentials = {
            tokenUrl: 'https://example.com/oauth/token',
            scopes: {},
          };
        } else {
          // Default to authorization code
          flows.authorizationCode = {
            authorizationUrl: 'https://example.com/oauth/authorize',
            tokenUrl: 'https://example.com/oauth/token',
            scopes: {},
          };
        }

        schemes.oauth2 = {
          type: 'oauth2',
          flows,
          description: method.details,
        };
      }
    }

    return schemes;
  }

  /**
   * Validate URL format
   *
   * @param url - URL string to validate
   * @returns True if valid HTTP/HTTPS URL
   */
  private isValidUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
}
