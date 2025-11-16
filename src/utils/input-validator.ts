/**
 * Input Validation and Sanitization Utilities
 *
 * Implements Task 12.2: Input validation and sanitization
 * - URL format validation (HTTP/HTTPS only)
 * - File path sanitization to prevent directory traversal
 * - Numeric range validation
 * - Shell argument escaping
 */

/**
 * Validation result with error message
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Sanitization result with cleaned value
 */
export interface SanitizationResult {
  safe: boolean;
  sanitized?: string;
  error?: string;
}

/**
 * Validate URL format - only HTTP and HTTPS allowed
 *
 * Rejects:
 * - file:// URLs (security risk)
 * - ftp:// URLs (not needed for API testing)
 * - javascript: URLs (XSS risk)
 * - data: URLs (potential injection)
 */
export function validateUrl(url: string): ValidationResult {
  try {
    const parsed = new URL(url);

    // Only allow HTTP and HTTPS protocols
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

/**
 * Sanitize file path to prevent directory traversal attacks
 *
 * Rejects:
 * - Paths containing .. (directory traversal)
 * - Absolute paths to sensitive system directories
 */
export function sanitizeFilePath(path: string): SanitizationResult {
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

/**
 * Validate concurrency value
 *
 * Requirements:
 * - Must be a positive integer
 * - Greater than 0
 */
export function validateConcurrency(value: number): ValidationResult {
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

/**
 * Validate test duration
 *
 * Requirements:
 * - Must be an integer
 * - At least 10 seconds (minimum meaningful test duration)
 */
export function validateDuration(value: number): ValidationResult {
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

/**
 * Escape shell argument to prevent command injection
 *
 * Uses single-quote wrapping which prevents shell interpretation
 * of special characters like ; & | ` $ ( ) < >
 *
 * For single quotes within the argument, use '\'' sequence
 * which ends the quote, adds an escaped quote, and starts a new quote
 */
export function escapeShellArg(arg: string): string {
  // Wrap in single quotes and escape any single quotes in the string
  // This prevents shell interpretation of special characters
  return `'${arg.replace(/'/g, "'\\''")}'`;
}

/**
 * Validate traffic estimate for cost analysis
 *
 * Requirements:
 * - Must be a positive number
 * - Should be within realistic bounds
 */
export function validateTrafficEstimate(requestsPerMonth: number): ValidationResult {
  if (!Number.isFinite(requestsPerMonth)) {
    return {
      valid: false,
      error: 'Traffic estimate must be a finite number'
    };
  }

  if (requestsPerMonth < 0) {
    return {
      valid: false,
      error: 'Traffic estimate cannot be negative'
    };
  }

  // Warn if traffic estimate seems unrealistically high
  // 10 billion requests per month = ~3,858 requests/second sustained
  const UNREALISTIC_THRESHOLD = 10_000_000_000;
  if (requestsPerMonth > UNREALISTIC_THRESHOLD) {
    return {
      valid: false,
      error: `Traffic estimate (${requestsPerMonth}) exceeds realistic threshold. Please verify.`
    };
  }

  return { valid: true };
}

/**
 * Validate analyzer name
 *
 * Ensures analyzer name is one of the supported types
 */
export function validateAnalyzerName(name: string): ValidationResult {
  const validAnalyzers = ['performance', 'security', 'cost', 'risk'];

  if (!validAnalyzers.includes(name)) {
    return {
      valid: false,
      error: `Invalid analyzer name "${name}". Must be one of: ${validAnalyzers.join(', ')}`
    };
  }

  return { valid: true };
}

/**
 * Sanitize environment variable value
 *
 * Removes potentially dangerous characters from env var substitution
 */
export function sanitizeEnvVarValue(value: string): SanitizationResult {
  // Check for shell metacharacters that could be dangerous
  const dangerousPattern = /[;|&$`<>(){}[\]]/;

  if (dangerousPattern.test(value)) {
    return {
      safe: false,
      error: 'Environment variable contains potentially dangerous characters'
    };
  }

  return {
    safe: true,
    sanitized: value.trim()
  };
}
