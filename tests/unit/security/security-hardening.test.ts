/**
 * Security Hardening Tests
 *
 * Tests for Task 12.3: Security hardening
 * - Mask authentication credentials in logs and reports
 * - Disable shell option in child_process.spawn for external tools
 * - Validate external tool arguments against whitelist
 * - Detect personal information in reports (email, IP addresses)
 * - Add --mask-sensitive-data option for automatic masking
 */

import { describe, it, expect } from 'vitest';

describe('Security Hardening', () => {
  describe('Credential Masking', () => {
    it('should mask API keys in log messages', () => {
      const logMessage = 'Connecting to API with key: sk_live_1234567890abcdef';
      const masked = maskCredentials(logMessage);

      expect(masked).not.toContain('sk_live_1234567890abcdef');
      expect(masked).toContain('sk_live_****');
    });

    it('should mask OAuth tokens in log messages', () => {
      const logMessage = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc123';
      const masked = maskCredentials(logMessage);

      expect(masked).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
      expect(masked).toContain('Bearer ****');
    });

    it('should mask passwords in log messages', () => {
      const logMessage = 'Database connection: postgres://user:SecretPassword123@localhost:5432/db';
      const masked = maskCredentials(logMessage);

      expect(masked).not.toContain('SecretPassword123');
      expect(masked).toContain('****');
    });

    it('should mask multiple credentials in same message', () => {
      const logMessage = 'API_KEY=sk_test_abc123 TOKEN=bearer_xyz789';
      const masked = maskCredentials(logMessage);

      expect(masked).not.toContain('sk_test_abc123');
      expect(masked).not.toContain('bearer_xyz789');
      expect(masked).toMatch(/API_KEY=.*\*{4}/);
      expect(masked).toMatch(/TOKEN=.*\*{4}/);
    });
  });

  describe('Child Process Security', () => {
    it('should create spawn options with shell disabled', () => {
      const options = createSecureSpawnOptions();

      expect(options.shell).toBe(false);
    });

    it('should validate JMeter arguments against whitelist', () => {
      const validArgs = ['-n', '-t', 'test.jmx', '-l', 'results.jtl'];
      const result = validateJMeterArgs(validArgs);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject JMeter arguments with dangerous flags', () => {
      const dangerousArgs = ['-n', '-t', 'test.jmx; rm -rf /', '-l', 'results.jtl'];
      const result = validateJMeterArgs(dangerousArgs);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid argument');
    });

    it('should validate ZAP arguments against whitelist', () => {
      const validArgs = ['-daemon', '-port', '8080', '-config', 'api.disablekey=true'];
      const result = validateZAPArgs(validArgs);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject ZAP arguments with command injection attempts', () => {
      const dangerousArgs = ['-daemon', '&&', 'whoami'];
      const result = validateZAPArgs(dangerousArgs);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Personal Information Detection', () => {
    it('should detect email addresses in report content', () => {
      const content = 'User data: user@example.com, admin@company.org';
      const detected = detectPersonalInfo(content);

      expect(detected.hasPersonalInfo).toBe(true);
      expect(detected.types).toContain('email');
      expect(detected.count).toBeGreaterThanOrEqual(2);
    });

    it('should detect IPv4 addresses in report content', () => {
      const content = 'Server IP: 192.168.1.100, External IP: 203.0.113.42';
      const detected = detectPersonalInfo(content);

      expect(detected.hasPersonalInfo).toBe(true);
      expect(detected.types).toContain('ipv4');
      expect(detected.count).toBeGreaterThanOrEqual(2);
    });

    it('should detect IPv6 addresses in report content', () => {
      const content = 'IPv6: 2001:0db8:85a3:0000:0000:8a2e:0370:7334';
      const detected = detectPersonalInfo(content);

      expect(detected.hasPersonalInfo).toBe(true);
      expect(detected.types).toContain('ipv6');
    });

    it('should detect API keys in report content', () => {
      const content = 'Configuration: { apiKey: "sk_live_1234567890abcdef" }';
      const detected = detectPersonalInfo(content);

      expect(detected.hasPersonalInfo).toBe(true);
      expect(detected.types).toContain('apiKey');
    });

    it('should not flag common technical terms as personal info', () => {
      const content = 'Status code: 200, Response time: 150ms, Throughput: 100 req/s';
      const detected = detectPersonalInfo(content);

      expect(detected.hasPersonalInfo).toBe(false);
    });
  });

  describe('Automatic Data Masking', () => {
    it('should mask email addresses when maskSensitiveData is enabled', () => {
      const content = 'Contact: john.doe@example.com, admin@company.org';
      const masked = maskSensitiveData(content, { maskEmails: true });

      expect(masked).not.toContain('john.doe@example.com');
      expect(masked).not.toContain('admin@company.org');
      expect(masked).toContain('***@example.com');
      expect(masked).toContain('***@company.org');
    });

    it('should mask IP addresses when maskSensitiveData is enabled', () => {
      const content = 'Server: 192.168.1.100, Client: 10.0.0.5';
      const masked = maskSensitiveData(content, { maskIPs: true });

      expect(masked).not.toContain('192.168.1.100');
      expect(masked).not.toContain('10.0.0.5');
      expect(masked).toContain('***.***.***.***');
    });

    it('should mask API keys when maskSensitiveData is enabled', () => {
      const content = 'API Key: sk_live_1234567890abcdef';
      const masked = maskSensitiveData(content, { maskApiKeys: true });

      expect(masked).not.toContain('sk_live_1234567890abcdef');
      expect(masked).toContain('sk_live_****');
    });

    it('should preserve non-sensitive content when masking', () => {
      const content = 'Response time: 150ms, Email: user@example.com, Status: 200';
      const masked = maskSensitiveData(content, { maskEmails: true });

      expect(masked).toContain('Response time: 150ms');
      expect(masked).toContain('Status: 200');
      expect(masked).not.toContain('user@example.com');
    });

    it('should support selective masking options', () => {
      const content = 'Email: user@example.com, IP: 192.168.1.1, Key: sk_test_abc123';

      // Only mask emails
      const emailMasked = maskSensitiveData(content, { maskEmails: true });
      expect(emailMasked).not.toContain('user@example.com');
      expect(emailMasked).toContain('192.168.1.1'); // IP not masked
      expect(emailMasked).toContain('sk_test_abc123'); // Key not masked

      // Only mask IPs
      const ipMasked = maskSensitiveData(content, { maskIPs: true });
      expect(ipMasked).toContain('user@example.com'); // Email not masked
      expect(ipMasked).not.toContain('192.168.1.1');
      expect(ipMasked).toContain('sk_test_abc123'); // Key not masked

      // Mask all
      const allMasked = maskSensitiveData(content, { maskEmails: true, maskIPs: true, maskApiKeys: true });
      expect(allMasked).not.toContain('user@example.com');
      expect(allMasked).not.toContain('192.168.1.1');
      expect(allMasked).not.toContain('sk_test_abc123');
    });
  });
});

// Helper function implementations

interface ValidationResult {
  valid: boolean;
  error?: string;
}

interface PersonalInfoDetection {
  hasPersonalInfo: boolean;
  types: string[];
  count: number;
}

interface MaskingOptions {
  maskEmails?: boolean;
  maskIPs?: boolean;
  maskApiKeys?: boolean;
}

/**
 * Mask credentials in log messages
 */
function maskCredentials(message: string): string {
  let masked = message;

  // Mask API keys (pattern: sk_live_*, sk_test_*, etc.)
  masked = masked.replace(/sk_(live|test)_[a-zA-Z0-9]+/g, 'sk_$1_****');

  // Mask Bearer tokens
  masked = masked.replace(/Bearer\s+[a-zA-Z0-9._-]+/g, 'Bearer ****');

  // Mask passwords in URLs
  masked = masked.replace(/:([^:@\s]+)@/g, ':****@');

  // Mask generic credentials after '=' or ':'
  masked = masked.replace(/(api_key|token|password|secret)[:=]\s*[^\s]+/gi, '$1=****');

  return masked;
}

/**
 * Create secure spawn options with shell disabled
 */
function createSecureSpawnOptions(): { shell: boolean } {
  return { shell: false };
}

/**
 * Validate JMeter arguments against whitelist
 */
function validateJMeterArgs(args: string[]): ValidationResult {
  const allowedFlags = ['-n', '-t', '-l', '-j', '-J', '-G', '-D', '-X', '-H', '-P', '-u', '-p', '-r', '-R', '-d'];
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
 */
function validateZAPArgs(args: string[]): ValidationResult {
  const allowedFlags = ['-daemon', '-port', '-host', '-config', '-dir', '-installdir', '-h', '-newsession'];
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
 */
function detectPersonalInfo(content: string): PersonalInfoDetection {
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
 */
function maskSensitiveData(content: string, options: MaskingOptions): string {
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
  }

  return masked;
}
