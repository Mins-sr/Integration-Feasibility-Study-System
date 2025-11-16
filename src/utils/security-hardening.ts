/**
 * Security Hardening Utilities
 *
 * Implements Task 12.3: Security hardening
 * - Credential masking for logs and reports
 * - Secure child process spawning
 * - External tool argument validation
 * - Personal information detection
 * - Automatic sensitive data masking
 */

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Personal information detection result
 */
export interface PersonalInfoDetection {
  hasPersonalInfo: boolean;
  types: string[];
  count: number;
}

/**
 * Masking options for sensitive data
 */
export interface MaskingOptions {
  maskEmails?: boolean;
  maskIPs?: boolean;
  maskApiKeys?: boolean;
}

/**
 * Mask credentials in log messages
 *
 * Prevents leakage of sensitive information in logs and reports
 */
export function maskCredentials(message: string): string {
  let masked = message;

  // Mask API keys (pattern: sk_live_*, sk_test_*, etc.)
  masked = masked.replace(/sk_(live|test)_[a-zA-Z0-9]+/g, 'sk_$1_****');

  // Mask Bearer tokens
  masked = masked.replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer ****');

  // Mask passwords in URLs
  masked = masked.replace(/:([^:@\s]+)@/g, ':****@');

  // Mask generic credentials after '=' or ':'
  masked = masked.replace(/(api_key|token|password|secret|apikey|auth)[:=]\s*[^\s]+/gi, '$1=****');

  // Mask AWS-style access keys
  masked = masked.replace(/AKIA[A-Z0-9]{16}/g, 'AKIA****');

  // Mask JWT tokens
  masked = masked.replace(/eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, 'eyJ****');

  return masked;
}

/**
 * Create secure spawn options with shell disabled
 *
 * Prevents shell injection attacks when spawning external processes
 */
export function createSecureSpawnOptions(): { shell: boolean } {
  return { shell: false };
}

/**
 * Validate JMeter arguments against whitelist
 *
 * Only allows known-safe JMeter command-line flags
 */
export function validateJMeterArgs(args: string[]): ValidationResult {
  const allowedFlags = [
    '-n', // Non-GUI mode
    '-t', // Test plan
    '-l', // Log file
    '-j', // JMeter log file
    '-J', // Define property
    '-G', // Define global property
    '-D', // Define system property
    '-X', // Exit after test
    '-H', // Proxy host
    '-P', // Proxy port
    '-u', // Username
    '-p', // Password
    '-r', // Remote start
    '-R', // Remote start (specific)
    '-d', // JMeter home directory
  ];

  const allowedPatterns = /^[a-zA-Z0-9._\-/]+$/;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Check if it's a flag
    if (arg.startsWith('-')) {
      if (!allowedFlags.includes(arg)) {
        return {
          valid: false,
          error: `Invalid argument: ${arg} is not in whitelist`
        };
      }
    } else {
      // Check for dangerous characters in values
      if (!allowedPatterns.test(arg)) {
        return {
          valid: false,
          error: `Invalid argument: ${arg} contains forbidden characters`
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Validate ZAP arguments against whitelist
 *
 * Only allows known-safe OWASP ZAP command-line flags
 */
export function validateZAPArgs(args: string[]): ValidationResult {
  const allowedFlags = [
    '-daemon',
    '-port',
    '-host',
    '-config',
    '-dir',
    '-installdir',
    '-h',
    '-newsession',
  ];

  const dangerousPatterns = /[;&|`$()<>]/;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    // Check for command injection attempts
    if (dangerousPatterns.test(arg)) {
      return {
        valid: false,
        error: `Dangerous characters detected in argument: ${arg}`
      };
    }

    // Check if flag is allowed
    if (arg.startsWith('-') && !allowedFlags.includes(arg)) {
      return {
        valid: false,
        error: `Invalid flag: ${arg} is not in whitelist`
      };
    }
  }

  return { valid: true };
}

/**
 * Detect personal information in content
 *
 * Scans for:
 * - Email addresses
 * - IP addresses (IPv4 and IPv6)
 * - API keys
 */
export function detectPersonalInfo(content: string): PersonalInfoDetection {
  const types: string[] = [];
  let count = 0;

  // Email pattern
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emails = content.match(emailPattern);
  if (emails && emails.length > 0) {
    types.push('email');
    count += emails.length;
  }

  // IPv4 pattern
  const ipv4Pattern = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
  const ipv4s = content.match(ipv4Pattern);
  if (ipv4s && ipv4s.length > 0) {
    types.push('ipv4');
    count += ipv4s.length;
  }

  // IPv6 pattern (simplified)
  const ipv6Pattern = /\b(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}\b/g;
  const ipv6s = content.match(ipv6Pattern);
  if (ipv6s && ipv6s.length > 0) {
    types.push('ipv6');
    count += ipv6s.length;
  }

  // API key pattern
  const apiKeyPattern = /sk_(live|test)_[a-zA-Z0-9]+/g;
  const apiKeys = content.match(apiKeyPattern);
  if (apiKeys && apiKeys.length > 0) {
    types.push('apiKey');
    count += apiKeys.length;
  }

  return {
    hasPersonalInfo: types.length > 0,
    types,
    count
  };
}

/**
 * Mask sensitive data in content
 *
 * Supports selective masking based on options
 */
export function maskSensitiveData(content: string, options: MaskingOptions): string {
  let masked = content;

  if (options.maskEmails) {
    // Mask email addresses (keep domain for context)
    masked = masked.replace(/([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '***@$2');
  }

  if (options.maskIPs) {
    // Mask IPv4 addresses
    masked = masked.replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '***.***.***.***');

    // Mask IPv6 addresses
    masked = masked.replace(/\b(?:[a-fA-F0-9]{1,4}:){7}[a-fA-F0-9]{1,4}\b/g, '****:****:****:****');
  }

  if (options.maskApiKeys) {
    // Mask API keys
    masked = masked.replace(/sk_(live|test)_[a-zA-Z0-9]+/g, 'sk_$1_****');

    // Mask AWS keys
    masked = masked.replace(/AKIA[A-Z0-9]{16}/g, 'AKIA****');

    // Mask JWT tokens
    masked = masked.replace(/eyJ[a-zA-Z0-9_-]+\.eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, 'eyJ****');
  }

  return masked;
}

/**
 * Create warning message for detected personal information
 */
export function createPersonalInfoWarning(detection: PersonalInfoDetection): string {
  if (!detection.hasPersonalInfo) {
    return '';
  }

  const typeList = detection.types.join(', ');
  return `WARNING: Detected ${detection.count} instances of personal information (${typeList}) in report.
Consider using --mask-sensitive-data option to automatically mask this data.`;
}

/**
 * Sanitize report content for safe output
 *
 * Automatically detects and masks sensitive data if requested
 */
export function sanitizeReportContent(
  content: string,
  autoMask: boolean = false
): { sanitized: string; warning?: string } {
  const detection = detectPersonalInfo(content);

  if (!detection.hasPersonalInfo) {
    return { sanitized: content };
  }

  if (autoMask) {
    const masked = maskSensitiveData(content, {
      maskEmails: true,
      maskIPs: true,
      maskApiKeys: true
    });
    return {
      sanitized: masked,
      warning: `Automatically masked ${detection.count} sensitive data items.`
    };
  }

  return {
    sanitized: content,
    warning: createPersonalInfoWarning(detection)
  };
}
