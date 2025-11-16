/**
 * Configuration Loader Tests
 *
 * Test cases for configuration loading and validation functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { ConfigLoader } from '@/orchestration/config-loader';

describe('ConfigLoader', () => {
  let configLoader: ConfigLoader;
  let tempDir: string;

  beforeEach(async () => {
    configLoader = new ConfigLoader();
    // Create temp directory for test config files
    tempDir = join(tmpdir(), `config-test-${Date.now()}`);
    await mkdir(tempDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp files
    try {
      const fs = await import('fs/promises');
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('loadConfig', () => {
    it('should successfully load valid YAML configuration', async () => {
      const configPath = join(tempDir, 'study.yaml');
      const validYaml = `
target:
  url: https://api.example.com
  timeout: 30000

analyzers:
  - type: PERFORMANCE
    enabled: true
  - type: SECURITY
    enabled: true

reportFormats:
  - OPENAPI
  - MARKDOWN

parallelExecution: true
`;
      await writeFile(configPath, validYaml, 'utf-8');

      const result = await configLoader.loadConfig(configPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.target.url).toBe('https://api.example.com');
        expect(result.value.analyzers).toHaveLength(2);
        expect(result.value.parallelExecution).toBe(true);
      }
    });

    it('should successfully load valid JSON configuration', async () => {
      const configPath = join(tempDir, 'study.json');
      const validJson = {
        target: {
          url: 'https://api.example.com',
          timeout: 30000,
        },
        analyzers: [
          { type: 'PERFORMANCE', enabled: true },
          { type: 'SECURITY', enabled: true },
        ],
        reportFormats: ['OPENAPI', 'MARKDOWN'],
        parallelExecution: true,
      };
      await writeFile(configPath, JSON.stringify(validJson, null, 2), 'utf-8');

      const result = await configLoader.loadConfig(configPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.target.url).toBe('https://api.example.com');
        expect(result.value.analyzers).toHaveLength(2);
      }
    });

    it('should return error for non-existent file', async () => {
      const configPath = join(tempDir, 'non-existent.yaml');

      const result = await configLoader.loadConfig(configPath);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CONFIG_NOT_FOUND');
        expect(result.error.message).toContain('not found');
      }
    });

    it('should return error for invalid YAML syntax', async () => {
      const configPath = join(tempDir, 'invalid.yaml');
      const invalidYaml = `
target:
  url: https://api.example.com
  invalid: [unclosed
`;
      await writeFile(configPath, invalidYaml, 'utf-8');

      const result = await configLoader.loadConfig(configPath);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CONFIG_INVALID');
        expect(result.error.message).toContain('parse');
      }
    });

    it('should support environment variable substitution', async () => {
      // Set environment variable for testing
      process.env.TEST_API_URL = 'https://test.example.com';
      process.env.TEST_TIMEOUT = '60000';

      const configPath = join(tempDir, 'env-vars.yaml');
      const yamlWithEnv = `
target:
  url: \${TEST_API_URL}
  timeout: \${TEST_TIMEOUT}

analyzers:
  - type: PERFORMANCE
    enabled: true

reportFormats:
  - MARKDOWN

parallelExecution: false
`;
      await writeFile(configPath, yamlWithEnv, 'utf-8');

      const result = await configLoader.loadConfig(configPath);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.target.url).toBe('https://test.example.com');
        expect(result.value.target.timeout).toBe(60000);
      }

      // Clean up env vars
      delete process.env.TEST_API_URL;
      delete process.env.TEST_TIMEOUT;
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const validConfig = {
        target: {
          url: 'https://api.example.com',
        },
        analyzers: [
          { type: 'PERFORMANCE' as const, enabled: true },
        ],
        reportFormats: ['MARKDOWN' as const],
        parallelExecution: true,
      };

      const result = configLoader.validateConfig(validConfig);

      expect(result.success).toBe(true);
    });

    it('should reject configuration with missing target URL', () => {
      const invalidConfig = {
        target: {},
        analyzers: [{ type: 'PERFORMANCE' as const, enabled: true }],
        reportFormats: ['MARKDOWN' as const],
        parallelExecution: true,
      };

      const result = configLoader.validateConfig(invalidConfig as any);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CONFIG_INVALID');
        expect(result.error.field).toBe('target.url');
      }
    });

    it('should reject configuration with invalid URL scheme', () => {
      const invalidConfig = {
        target: {
          url: 'ftp://invalid.com',
        },
        analyzers: [{ type: 'PERFORMANCE' as const, enabled: true }],
        reportFormats: ['MARKDOWN' as const],
        parallelExecution: true,
      };

      const result = configLoader.validateConfig(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CONFIG_INVALID');
        expect(result.error.field).toBe('target.url');
        expect(result.error.message).toContain('http');
      }
    });

    it('should reject configuration with empty analyzers array', () => {
      const invalidConfig = {
        target: {
          url: 'https://api.example.com',
        },
        analyzers: [],
        reportFormats: ['MARKDOWN' as const],
        parallelExecution: true,
      };

      const result = configLoader.validateConfig(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CONFIG_INVALID');
        expect(result.error.field).toBe('analyzers');
        expect(result.error.message).toContain('at least one');
      }
    });

    it('should reject configuration with invalid analyzer type', () => {
      const invalidConfig = {
        target: {
          url: 'https://api.example.com',
        },
        analyzers: [
          { type: 'INVALID_TYPE' as any, enabled: true },
        ],
        reportFormats: ['MARKDOWN' as const],
        parallelExecution: true,
      };

      const result = configLoader.validateConfig(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('CONFIG_INVALID');
        expect(result.error.field).toBe('analyzers[0].type');
      }
    });

    it('should accept valid performance analyzer configuration with options', () => {
      const validConfig = {
        target: {
          url: 'https://api.example.com',
        },
        analyzers: [
          {
            type: 'PERFORMANCE' as const,
            enabled: true,
            options: {
              concurrency: [1, 10, 50],
              duration: 60,
              rampUp: 10,
            },
          },
        ],
        reportFormats: ['MARKDOWN' as const],
        parallelExecution: true,
      };

      const result = configLoader.validateConfig(validConfig);

      expect(result.success).toBe(true);
    });

    it('should reject performance analyzer with negative duration', () => {
      const invalidConfig = {
        target: {
          url: 'https://api.example.com',
        },
        analyzers: [
          {
            type: 'PERFORMANCE' as const,
            enabled: true,
            options: {
              duration: -10,
            },
          },
        ],
        reportFormats: ['MARKDOWN' as const],
        parallelExecution: true,
      };

      const result = configLoader.validateConfig(invalidConfig);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.field).toContain('duration');
      }
    });
  });
});
