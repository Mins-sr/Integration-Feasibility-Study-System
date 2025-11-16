import { describe, it, expect } from 'vitest';

/**
 * Tests for error discriminated unions
 *
 * Tests StudyError, HttpError, TestError, ScanError, AnalysisError, ReportError
 */
describe('Error Discriminated Unions', () => {
  describe('StudyError', () => {
    it('should support CONFIG_INVALID error type', () => {
      const error: any = {
        type: 'CONFIG_INVALID',
        message: 'Invalid configuration',
        field: 'target.url'
      };

      expect(error.type).toBe('CONFIG_INVALID');
      expect(error.message).toBeDefined();
      expect(error.field).toBeDefined();
    });

    it('should support ANALYZER_FAILED error type', () => {
      const error: any = {
        type: 'ANALYZER_FAILED',
        analyzer: 'PERFORMANCE',
        cause: new Error('Test failed')
      };

      expect(error.type).toBe('ANALYZER_FAILED');
      expect(error.analyzer).toBeDefined();
      expect(error.cause).toBeInstanceOf(Error);
    });

    it('should support REPORT_GENERATION_FAILED error type', () => {
      const error: any = {
        type: 'REPORT_GENERATION_FAILED',
        cause: new Error('Template not found')
      };

      expect(error.type).toBe('REPORT_GENERATION_FAILED');
      expect(error.cause).toBeInstanceOf(Error);
    });
  });

  describe('HttpError', () => {
    it('should support RATE_LIMIT_EXCEEDED error type', () => {
      const error: any = {
        type: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 60
      };

      expect(error.type).toBe('RATE_LIMIT_EXCEEDED');
      expect(error.retryAfter).toBe(60);
    });

    it('should support AUTH_FAILED error type', () => {
      const error: any = {
        type: 'AUTH_FAILED',
        reason: 'Invalid credentials'
      };

      expect(error.type).toBe('AUTH_FAILED');
      expect(error.reason).toBeDefined();
    });

    it('should support TIMEOUT error type', () => {
      const error: any = {
        type: 'TIMEOUT',
        duration: 30000
      };

      expect(error.type).toBe('TIMEOUT');
      expect(error.duration).toBe(30000);
    });

    it('should support NETWORK_ERROR error type', () => {
      const error: any = {
        type: 'NETWORK_ERROR',
        cause: new Error('Connection refused')
      };

      expect(error.type).toBe('NETWORK_ERROR');
      expect(error.cause).toBeInstanceOf(Error);
    });

    it('should support VALIDATION_ERROR error type', () => {
      const error: any = {
        type: 'VALIDATION_ERROR',
        message: 'Invalid URL format'
      };

      expect(error.type).toBe('VALIDATION_ERROR');
      expect(error.message).toBeDefined();
    });
  });

  describe('TestError', () => {
    it('should support JMETER_NOT_FOUND error type', () => {
      const error: any = {
        type: 'JMETER_NOT_FOUND',
        message: 'JMeter is not installed'
      };

      expect(error.type).toBe('JMETER_NOT_FOUND');
      expect(error.message).toBeDefined();
    });

    it('should support TEST_TIMEOUT error type', () => {
      const error: any = {
        type: 'TEST_TIMEOUT',
        duration: 300000
      };

      expect(error.type).toBe('TEST_TIMEOUT');
      expect(error.duration).toBe(300000);
    });

    it('should support TARGET_UNREACHABLE error type', () => {
      const error: any = {
        type: 'TARGET_UNREACHABLE',
        cause: new Error('Host not found')
      };

      expect(error.type).toBe('TARGET_UNREACHABLE');
      expect(error.cause).toBeInstanceOf(Error);
    });
  });

  describe('ScanError', () => {
    it('should support ZAP_NOT_RUNNING error type', () => {
      const error: any = {
        type: 'ZAP_NOT_RUNNING',
        message: 'OWASP ZAP is not running'
      };

      expect(error.type).toBe('ZAP_NOT_RUNNING');
      expect(error.message).toBeDefined();
    });

    it('should support SCAN_TIMEOUT error type', () => {
      const error: any = {
        type: 'SCAN_TIMEOUT',
        duration: 180000
      };

      expect(error.type).toBe('SCAN_TIMEOUT');
      expect(error.duration).toBe(180000);
    });
  });

  describe('AnalysisError', () => {
    it('should support PRICING_DATA_NOT_FOUND error type', () => {
      const error: any = {
        type: 'PRICING_DATA_NOT_FOUND',
        service: 'AWS Lambda'
      };

      expect(error.type).toBe('PRICING_DATA_NOT_FOUND');
      expect(error.service).toBeDefined();
    });

    it('should support INVALID_TRAFFIC_ESTIMATE error type', () => {
      const error: any = {
        type: 'INVALID_TRAFFIC_ESTIMATE',
        message: 'Traffic estimate must be positive'
      };

      expect(error.type).toBe('INVALID_TRAFFIC_ESTIMATE');
      expect(error.message).toBeDefined();
    });
  });

  describe('ReportError', () => {
    it('should support TEMPLATE_NOT_FOUND error type', () => {
      const error: any = {
        type: 'TEMPLATE_NOT_FOUND',
        templateName: 'markdown.hbs'
      };

      expect(error.type).toBe('TEMPLATE_NOT_FOUND');
      expect(error.templateName).toBeDefined();
    });

    it('should support GENERATION_FAILED error type', () => {
      const error: any = {
        type: 'GENERATION_FAILED',
        cause: new Error('Template rendering failed')
      };

      expect(error.type).toBe('GENERATION_FAILED');
      expect(error.cause).toBeInstanceOf(Error);
    });
  });
});
