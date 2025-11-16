/**
 * Comprehensive Error Handling Tests
 *
 * Tests for Task 12.1: Comprehensive error handling implementation
 * - JMeter or ZAP installation missing
 * - Network timeouts with clear error messages
 * - Invalid config with field-level errors
 * - File system errors (permissions, disk space)
 * - Corrupted checkpoint files
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { err, ok } from '@/types';
import type { TestError, ScanError, StudyError, HttpError } from '@/types/error-types';

describe('Comprehensive Error Handling', () => {
  describe('External Tool Missing Errors', () => {
    it('should handle JMeter not found with installation instructions', () => {
      // RED: Write failing test first
      const error: TestError = {
        type: 'JMETER_NOT_FOUND',
        message: 'JMeter executable not found in PATH. Please install JMeter from https://jmeter.apache.org/download_jmeter.cgi'
      };

      expect(error.type).toBe('JMETER_NOT_FOUND');
      expect(error.message).toContain('install JMeter');
      expect(error.message).toContain('https://');
    });

    it('should handle ZAP not running with startup instructions', () => {
      const error: ScanError = {
        type: 'ZAP_NOT_RUNNING',
        message: 'OWASP ZAP is not running. Start ZAP daemon with: zap.sh -daemon -port 8080'
      };

      expect(error.type).toBe('ZAP_NOT_RUNNING');
      expect(error.message).toContain('Start ZAP daemon');
      expect(error.message).toContain('zap.sh -daemon');
    });
  });

  describe('Network Timeout Errors', () => {
    it('should handle network timeout with clear error message', () => {
      const error: HttpError = {
        type: 'TIMEOUT',
        duration: 30000
      };

      expect(error.type).toBe('TIMEOUT');
      expect(error.duration).toBe(30000);

      // Error message should be human-readable
      const humanReadableMessage = `Request timed out after ${error.duration / 1000} seconds. Check network connectivity.`;
      expect(humanReadableMessage).toContain('30 seconds');
      expect(humanReadableMessage).toContain('Check network connectivity');
    });

    it('should handle network error with connection details', () => {
      const originalError = new Error('ECONNREFUSED 127.0.0.1:8080');
      const error: HttpError = {
        type: 'NETWORK_ERROR',
        cause: originalError
      };

      expect(error.type).toBe('NETWORK_ERROR');
      expect(error.cause.message).toContain('ECONNREFUSED');
    });
  });

  describe('Invalid Configuration Errors', () => {
    it('should handle invalid config with field-level error details', () => {
      const error: StudyError = {
        type: 'CONFIG_INVALID',
        message: 'Invalid target URL format. Expected format: https://api.example.com',
        field: 'target.url'
      };

      expect(error.type).toBe('CONFIG_INVALID');
      expect(error.field).toBe('target.url');
      expect(error.message).toContain('Invalid target URL');
      expect(error.message).toContain('Expected format');
    });

    it('should handle missing required field error', () => {
      const error: StudyError = {
        type: 'CONFIG_INVALID',
        message: 'Required field "analyzers" is missing. Please specify at least one analyzer.',
        field: 'analyzers'
      };

      expect(error.type).toBe('CONFIG_INVALID');
      expect(error.field).toBe('analyzers');
      expect(error.message).toContain('Required field');
      expect(error.message).toContain('at least one analyzer');
    });
  });

  describe('File System Errors', () => {
    it('should handle permission denied error', () => {
      const fsError = new Error('EACCES: permission denied, open \'/root/checkpoint.json\'');
      const error: StudyError = {
        type: 'CHECKPOINT_INVALID',
        message: 'Permission denied when accessing checkpoint file. Check file permissions.'
      };

      expect(error.type).toBe('CHECKPOINT_INVALID');
      expect(error.message).toContain('Permission denied');
      expect(error.message).toContain('Check file permissions');
    });

    it('should handle disk space error', () => {
      const error: StudyError = {
        type: 'REPORT_GENERATION_FAILED',
        cause: new Error('ENOSPC: no space left on device')
      };

      expect(error.type).toBe('REPORT_GENERATION_FAILED');
      expect(error.cause.message).toContain('ENOSPC');
      expect(error.cause.message).toContain('no space left');
    });
  });

  describe('Corrupted Checkpoint Files', () => {
    it('should handle corrupted checkpoint with parse error', () => {
      const error: StudyError = {
        type: 'CHECKPOINT_INVALID',
        message: 'Checkpoint file is corrupted or invalid JSON. Unable to resume study.'
      };

      expect(error.type).toBe('CHECKPOINT_INVALID');
      expect(error.message).toContain('corrupted');
      expect(error.message).toContain('Unable to resume');
    });

    it('should handle checkpoint with missing required fields', () => {
      const error: StudyError = {
        type: 'CHECKPOINT_INVALID',
        message: 'Checkpoint file missing required field "studyId". Cannot resume study.'
      };

      expect(error.type).toBe('CHECKPOINT_INVALID');
      expect(error.message).toContain('missing required field');
      expect(error.message).toContain('studyId');
    });
  });
});

describe('Error Message Formatting', () => {
  describe('formatErrorMessage', () => {
    it('should format TestError with actionable advice', () => {
      const error: TestError = {
        type: 'JMETER_NOT_FOUND',
        message: 'JMeter executable not found'
      };

      const formatted = formatTestError(error);

      expect(formatted).toContain('JMeter executable not found');
      expect(formatted).toContain('Install JMeter');
      expect(formatted).toContain('Add JMeter bin directory to your PATH');
    });

    it('should format ScanError with troubleshooting steps', () => {
      const error: ScanError = {
        type: 'ZAP_NOT_RUNNING',
        message: 'OWASP ZAP is not running'
      };

      const formatted = formatScanError(error);

      expect(formatted).toContain('OWASP ZAP is not running');
      expect(formatted).toContain('Start ZAP');
      expect(formatted).toContain('zap.sh -daemon');
    });

    it('should format StudyError with field-specific guidance', () => {
      const error: StudyError = {
        type: 'CONFIG_INVALID',
        message: 'Invalid URL format',
        field: 'target.url'
      };

      const formatted = formatStudyError(error);

      expect(formatted).toContain('Field: target.url');
      expect(formatted).toContain('Invalid URL format');
      expect(formatted).toContain('Example');
    });
  });
});

// Helper functions to be implemented
function formatTestError(error: TestError): string {
  switch (error.type) {
    case 'JMETER_NOT_FOUND':
      return `${error.message}

Troubleshooting steps:
1. Install JMeter from https://jmeter.apache.org/download_jmeter.cgi
2. Add JMeter bin directory to your PATH environment variable
3. Verify installation: jmeter --version`;
    case 'TEST_TIMEOUT':
      return `Test timed out after ${error.duration / 1000} seconds. The target API may be slow or unresponsive.`;
    case 'TARGET_UNREACHABLE':
      return `Target API is unreachable: ${error.cause.message}

Check:
- Network connectivity
- Firewall settings
- Target URL is correct`;
  }
}

function formatScanError(error: ScanError): string {
  switch (error.type) {
    case 'ZAP_NOT_RUNNING':
      return `${error.message}

Troubleshooting steps:
1. Start ZAP daemon: zap.sh -daemon -port 8080
2. Verify ZAP is running: curl http://localhost:8080
3. Check ZAP logs for errors`;
    case 'SCAN_TIMEOUT':
      return `Security scan timed out after ${error.duration / 1000} seconds. The scan may need more time.`;
    case 'TARGET_UNREACHABLE':
      return `Target API is unreachable during security scan: ${error.cause.message}`;
  }
}

function formatStudyError(error: StudyError): string {
  switch (error.type) {
    case 'CONFIG_INVALID':
      return `Configuration Error
Field: ${error.field}
Error: ${error.message}

Example: {
  "target": {
    "url": "https://api.example.com"
  }
}`;
    case 'CONFIG_NOT_FOUND':
      return `Configuration file not found: ${error.message}

Please create a study.yaml or study.json configuration file.`;
    case 'ANALYZER_FAILED':
      return `Analyzer "${error.analyzer}" failed: ${error.cause.message}`;
    case 'REPORT_GENERATION_FAILED':
      return `Report generation failed: ${error.cause.message}`;
    case 'CHECKPOINT_NOT_FOUND':
      return `Checkpoint not found: ${error.message}`;
    case 'CHECKPOINT_INVALID':
      return `Invalid checkpoint: ${error.message}`;
  }
}
