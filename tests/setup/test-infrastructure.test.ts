import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';

describe('Testing Infrastructure', () => {
  const rootDir = join(__dirname, '../..');
  const testsDir = join(rootDir, 'tests');

  describe('Directory Structure', () => {
    it('should have unit tests directory', () => {
      const unitDir = join(testsDir, 'unit');
      expect(existsSync(unitDir)).toBe(true);
    });

    it('should have integration tests directory', () => {
      const integrationDir = join(testsDir, 'integration');
      expect(existsSync(integrationDir)).toBe(true);
    });

    it('should have e2e tests directory', () => {
      const e2eDir = join(testsDir, 'e2e');
      expect(existsSync(e2eDir)).toBe(true);
    });

    it('should have setup directory for infrastructure tests', () => {
      const setupDir = join(testsDir, 'setup');
      expect(existsSync(setupDir)).toBe(true);
    });
  });

  describe('Test Utilities', () => {
    it('should have test helpers module', () => {
      const helpersPath = join(testsDir, 'helpers', 'index.ts');
      expect(existsSync(helpersPath)).toBe(true);
    });

    it('should export createMockResult helper', async () => {
      const { createMockResult } = await import('../helpers/index.js');
      expect(typeof createMockResult).toBe('function');
    });

    it('should export expectSuccess helper', async () => {
      const { expectSuccess } = await import('../helpers/index.js');
      expect(typeof expectSuccess).toBe('function');
    });

    it('should export expectError helper', async () => {
      const { expectError } = await import('../helpers/index.js');
      expect(typeof expectError).toBe('function');
    });
  });

  describe('Vitest Configuration', () => {
    it('should have vitest config file', () => {
      const vitestConfigPath = join(rootDir, 'vitest.config.ts');
      expect(existsSync(vitestConfigPath)).toBe(true);
    });

    it('should have coverage configuration', async () => {
      const vitestConfig = await import('../../vitest.config.js');
      expect(vitestConfig.default.test?.coverage).toBeDefined();
      expect(vitestConfig.default.test?.coverage?.provider).toBe('v8');
    });

    it('should have test scripts in package.json', () => {
      const packageJson = require('../../package.json');
      expect(packageJson.scripts.test).toBeDefined();
      expect(packageJson.scripts['test:coverage']).toBeDefined();
    });
  });

  describe('README Files', () => {
    it('should have README in unit tests directory', () => {
      const readmePath = join(testsDir, 'unit', 'README.md');
      expect(existsSync(readmePath)).toBe(true);
    });

    it('should have README in integration tests directory', () => {
      const readmePath = join(testsDir, 'integration', 'README.md');
      expect(existsSync(readmePath)).toBe(true);
    });

    it('should have README in e2e tests directory', () => {
      const readmePath = join(testsDir, 'e2e', 'README.md');
      expect(existsSync(readmePath)).toBe(true);
    });
  });
});
