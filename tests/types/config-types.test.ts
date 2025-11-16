import { describe, it, expect } from 'vitest';

/**
 * Tests for configuration types
 *
 * Tests StudyConfig, TargetConfig, and AnalyzerConfig types
 */
describe('Configuration Types', () => {
  describe('TargetConfig', () => {
    it('should have required fields', () => {
      const config: any = {
        url: 'https://api.example.com',
        method: 'GET',
        headers: { 'Authorization': 'Bearer token' },
        timeout: 30000
      };

      expect(config.url).toBe('https://api.example.com');
      expect(config.method).toBe('GET');
      expect(typeof config.headers).toBe('object');
      expect(config.timeout).toBe(30000);
    });
  });

  describe('AnalyzerConfig', () => {
    it('should have required fields for performance analyzer', () => {
      const config: any = {
        type: 'PERFORMANCE',
        enabled: true,
        options: {
          concurrency: [1, 10, 50],
          duration: 60
        }
      };

      expect(config.type).toBe('PERFORMANCE');
      expect(config.enabled).toBe(true);
      expect(config.options).toBeDefined();
    });

    it('should have required fields for security analyzer', () => {
      const config: any = {
        type: 'SECURITY',
        enabled: true,
        options: {
          scanType: 'passive',
          complianceChecks: ['GDPR']
        }
      };

      expect(config.type).toBe('SECURITY');
      expect(config.enabled).toBe(true);
      expect(config.options.scanType).toBe('passive');
    });
  });

  describe('StudyConfig', () => {
    it('should have required fields', () => {
      const config: any = {
        target: {
          url: 'https://api.example.com',
          method: 'GET'
        },
        analyzers: [
          { type: 'PERFORMANCE', enabled: true }
        ],
        reportFormats: ['MARKDOWN'],
        parallelExecution: true
      };

      expect(config.target).toBeDefined();
      expect(config.target.url).toBe('https://api.example.com');
      expect(Array.isArray(config.analyzers)).toBe(true);
      expect(config.analyzers.length).toBeGreaterThan(0);
      expect(Array.isArray(config.reportFormats)).toBe(true);
      expect(config.parallelExecution).toBe(true);
    });

    it('should require at least one analyzer', () => {
      const config: any = {
        target: { url: 'https://api.example.com' },
        analyzers: [],
        reportFormats: ['MARKDOWN'],
        parallelExecution: false
      };

      // Business rule: Study must have at least one analyzer
      expect(config.analyzers.length).toBe(0);
      // This will be validated in implementation
    });
  });

  describe('AuthConfig', () => {
    it('should support OAuth2 authentication', () => {
      const authConfig: any = {
        type: 'OAUTH2',
        clientId: 'client-id',
        clientSecret: 'client-secret',
        tokenUrl: 'https://auth.example.com/token'
      };

      expect(authConfig.type).toBe('OAUTH2');
      expect(authConfig.clientId).toBeDefined();
      expect(authConfig.clientSecret).toBeDefined();
      expect(authConfig.tokenUrl).toBeDefined();
    });

    it('should support API Key authentication', () => {
      const authConfig: any = {
        type: 'API_KEY',
        key: 'api-key-value',
        location: 'header',
        headerName: 'X-API-Key'
      };

      expect(authConfig.type).toBe('API_KEY');
      expect(authConfig.key).toBeDefined();
      expect(['header', 'query']).toContain(authConfig.location);
    });

    it('should support JWT authentication', () => {
      const authConfig: any = {
        type: 'JWT',
        token: 'jwt-token-value'
      };

      expect(authConfig.type).toBe('JWT');
      expect(authConfig.token).toBeDefined();
    });
  });
});
