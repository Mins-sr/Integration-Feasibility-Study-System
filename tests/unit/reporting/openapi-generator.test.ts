/**
 * OpenAPI Generator Tests
 *
 * Test cases for generating OpenAPI 3.1.0 specifications from study results.
 * The generator creates machine-readable API documentation based on integration analysis.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OpenAPIGenerator } from '@/reporting/openapi-generator';
import type { AggregatedStudyResult } from '@/reporting/types';
import type { AnalyzerResult } from '@/types';
import type { VulnerabilityReport } from '@/analysis/security/types';

describe('OpenAPIGenerator', () => {
  let generator: OpenAPIGenerator;

  beforeEach(() => {
    generator = new OpenAPIGenerator();
  });

  describe('generate', () => {
    it('should generate valid OpenAPI 3.1.0 specification', () => {
      // Arrange: Create aggregated result with security data
      const securityResult: AnalyzerResult = {
        id: 'sec-1',
        studyId: 'study-123',
        analyzerType: 'SECURITY',
        status: 'COMPLETED',
        startedAt: new Date('2025-11-16T00:00:00Z'),
        completedAt: new Date('2025-11-16T00:03:00Z'),
        data: {
          tlsVersion: 'TLS 1.3',
          authMethods: [
            { type: 'API Key', details: 'Header: X-API-Key' },
            { type: 'Bearer Token', details: 'Header: Authorization' },
          ],
          vulnerabilities: [],
          complianceStatus: { GDPR: true },
        } as VulnerabilityReport,
        errors: [],
      };

      const aggregated: AggregatedStudyResult = {
        analyzerResults: [securityResult],
        hasPerformanceData: false,
        hasSecurityData: true,
        hasCostData: false,
        hasRiskData: false,
      };

      // Act: Generate OpenAPI spec
      const result = generator.generate(aggregated, {
        targetUrl: 'https://api.example.com',
        apiTitle: 'Example API',
        apiVersion: '1.0.0',
        apiDescription: 'Integration feasibility study for Example API',
      });

      // Assert: Should generate valid spec
      expect(result.success).toBe(true);
      if (result.success) {
        const spec = result.value;

        // Check OpenAPI version
        expect(spec.openapi).toBe('3.1.0');

        // Check info section
        expect(spec.info.title).toBe('Example API');
        expect(spec.info.version).toBe('1.0.0');
        expect(spec.info.description).toContain('Integration feasibility study');

        // Check servers
        expect(spec.servers).toHaveLength(1);
        expect(spec.servers[0].url).toBe('https://api.example.com');

        // Check security schemes
        expect(spec.components?.securitySchemes).toBeDefined();
        expect(spec.components?.securitySchemes?.apiKey).toBeDefined();
        expect(spec.components?.securitySchemes?.bearerAuth).toBeDefined();
      }
    });

    it('should include authentication methods from security analysis', () => {
      // Arrange: Create result with multiple auth methods
      const securityResult: AnalyzerResult = {
        id: 'sec-1',
        studyId: 'study-123',
        analyzerType: 'SECURITY',
        status: 'COMPLETED',
        startedAt: new Date('2025-11-16T00:00:00Z'),
        completedAt: new Date('2025-11-16T00:03:00Z'),
        data: {
          tlsVersion: 'TLS 1.3',
          authMethods: [
            { type: 'OAuth2', details: 'Authorization Code flow, Header: Authorization' },
            { type: 'API Key', details: 'Query parameter: api_key' },
          ],
          vulnerabilities: [],
          complianceStatus: {},
        } as VulnerabilityReport,
        errors: [],
      };

      const aggregated: AggregatedStudyResult = {
        analyzerResults: [securityResult],
        hasPerformanceData: false,
        hasSecurityData: true,
        hasCostData: false,
        hasRiskData: false,
      };

      // Act: Generate spec
      const result = generator.generate(aggregated, {
        targetUrl: 'https://api.example.com',
        apiTitle: 'Example API',
        apiVersion: '1.0.0',
      });

      // Assert: Should include all auth methods
      expect(result.success).toBe(true);
      if (result.success) {
        const schemes = result.value.components?.securitySchemes;
        expect(schemes?.oauth2).toBeDefined();
        expect(schemes?.apiKeyQuery).toBeDefined();

        // Check OAuth2 configuration
        expect(schemes?.oauth2.type).toBe('oauth2');

        // Check API Key configuration
        expect(schemes?.apiKeyQuery.type).toBe('apiKey');
        expect(schemes?.apiKeyQuery.in).toBe('query');
        expect(schemes?.apiKeyQuery.name).toBe('api_key');
      }
    });

    it('should handle missing security data gracefully', () => {
      // Arrange: Create result without security data
      const aggregated: AggregatedStudyResult = {
        analyzerResults: [],
        hasPerformanceData: false,
        hasSecurityData: false,
        hasCostData: false,
        hasRiskData: false,
      };

      // Act: Generate spec
      const result = generator.generate(aggregated, {
        targetUrl: 'https://api.example.com',
        apiTitle: 'Example API',
        apiVersion: '1.0.0',
      });

      // Assert: Should still generate valid spec without security schemes
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.openapi).toBe('3.1.0');
        expect(result.value.info.title).toBe('Example API');
        // No security schemes when no security data
        expect(result.value.components?.securitySchemes).toBeUndefined();
      }
    });

    it('should validate generated spec against OpenAPI 3.1.0 schema', () => {
      // Arrange: Create minimal aggregated result
      const aggregated: AggregatedStudyResult = {
        analyzerResults: [],
        hasPerformanceData: false,
        hasSecurityData: false,
        hasCostData: false,
        hasRiskData: false,
      };

      // Act: Generate spec
      const result = generator.generate(aggregated, {
        targetUrl: 'https://api.example.com',
        apiTitle: 'Example API',
        apiVersion: '1.0.0',
      });

      // Assert: Spec should be valid
      expect(result.success).toBe(true);
      if (result.success) {
        const spec = result.value;

        // Required fields per OpenAPI 3.1.0
        expect(spec).toHaveProperty('openapi');
        expect(spec).toHaveProperty('info');
        expect(spec.info).toHaveProperty('title');
        expect(spec.info).toHaveProperty('version');

        // Optional but expected fields
        expect(spec).toHaveProperty('servers');
        expect(Array.isArray(spec.servers)).toBe(true);
      }
    });

    it('should fail when targetUrl is invalid', () => {
      // Arrange: Create result with invalid URL
      const aggregated: AggregatedStudyResult = {
        analyzerResults: [],
        hasPerformanceData: false,
        hasSecurityData: false,
        hasCostData: false,
        hasRiskData: false,
      };

      // Act: Try to generate with invalid URL
      const result = generator.generate(aggregated, {
        targetUrl: 'not-a-valid-url',
        apiTitle: 'Example API',
        apiVersion: '1.0.0',
      });

      // Assert: Should return validation error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        expect(result.error.message.toLowerCase()).toContain('invalid');
      }
    });
  });

  describe('serialize', () => {
    it('should serialize spec to formatted JSON string', () => {
      // Arrange: Create a simple spec
      const aggregated: AggregatedStudyResult = {
        analyzerResults: [],
        hasPerformanceData: false,
        hasSecurityData: false,
        hasCostData: false,
        hasRiskData: false,
      };

      const specResult = generator.generate(aggregated, {
        targetUrl: 'https://api.example.com',
        apiTitle: 'Example API',
        apiVersion: '1.0.0',
      });

      expect(specResult.success).toBe(true);
      if (!specResult.success) return;

      // Act: Serialize to JSON
      const jsonResult = generator.serialize(specResult.value);

      // Assert: Should be valid JSON
      expect(jsonResult.success).toBe(true);
      if (jsonResult.success) {
        expect(() => JSON.parse(jsonResult.value)).not.toThrow();

        const parsed = JSON.parse(jsonResult.value);
        expect(parsed.openapi).toBe('3.1.0');
        expect(parsed.info.title).toBe('Example API');
      }
    });

    it('should format JSON with 2-space indentation', () => {
      // Arrange: Generate spec
      const aggregated: AggregatedStudyResult = {
        analyzerResults: [],
        hasPerformanceData: false,
        hasSecurityData: false,
        hasCostData: false,
        hasRiskData: false,
      };

      const specResult = generator.generate(aggregated, {
        targetUrl: 'https://api.example.com',
        apiTitle: 'Example API',
        apiVersion: '1.0.0',
      });

      expect(specResult.success).toBe(true);
      if (!specResult.success) return;

      // Act: Serialize
      const jsonResult = generator.serialize(specResult.value);

      // Assert: Should be formatted with indentation
      expect(jsonResult.success).toBe(true);
      if (jsonResult.success) {
        // Check for indentation (newlines and spaces)
        expect(jsonResult.value).toContain('\n');
        expect(jsonResult.value).toContain('  '); // 2-space indentation
      }
    });
  });
});
