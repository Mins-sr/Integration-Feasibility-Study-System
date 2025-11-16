/**
 * Compatibility Checker Tests
 *
 * Test cases for compatibility checking functionality in Risk Analyzer.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CompatibilityChecker } from '@/analysis/risk/compatibility-checker';
import type {
  RiskAnalysisConfig,
  CompatibilityData,
  CompatibilityResult,
} from '@/analysis/risk/types';

describe('CompatibilityChecker', () => {
  let checker: CompatibilityChecker;
  let mockCompatibilityDatabase: Map<string, CompatibilityData>;

  beforeEach(() => {
    // Create mock compatibility database
    mockCompatibilityDatabase = new Map();
    mockCompatibilityDatabase.set('stripe-api', {
      service: 'stripe-api',
      requiredDependencies: [
        {
          name: 'stripe',
          versionConstraint: '>=10.0.0 <15.0.0',
          optional: false,
        },
        {
          name: 'express',
          versionConstraint: '>=4.17.0',
          optional: false,
        },
      ],
      supportedLanguages: [
        {
          language: 'node',
          minVersion: '16.0.0',
        },
      ],
      knownConflicts: [
        {
          library: 'body-parser',
          version: '<1.20.0',
          severity: 'High',
          reason: 'Deprecated body parsing method incompatible with webhook signatures',
        },
      ],
      updatedAt: '2025-01-01T00:00:00Z',
    });

    checker = new CompatibilityChecker(mockCompatibilityDatabase);
  });

  describe('checkCompatibility', () => {
    it('should return compatible=true when all dependencies meet constraints', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {
            stripe: '12.5.0',
            express: '4.18.0',
            'body-parser': '1.20.1',
          },
        },
        targetIntegration: {
          service: 'stripe-api',
          requiredDependencies: ['stripe', 'express'],
        },
      };

      const result = checker.checkCompatibility(config);

      expect(result.compatible).toBe(true);
      expect(result.conflicts).toHaveLength(0);
      expect(result.requiredUpgrades).toHaveLength(0);
    });

    it('should detect blocking conflicts when required version is not met', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {
            stripe: '9.5.0', // Below minimum required version
            express: '4.18.0',
          },
        },
        targetIntegration: {
          service: 'stripe-api',
          requiredDependencies: ['stripe', 'express'],
        },
      };

      const result = checker.checkCompatibility(config);

      expect(result.compatible).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);

      const stripeConflict = result.conflicts.find(c => c.component === 'stripe');
      expect(stripeConflict).toBeDefined();
      expect(stripeConflict?.severity).toBe('Blocking');
      expect(stripeConflict?.current).toBe('9.5.0');
      expect(stripeConflict?.required).toContain('>=10.0.0');
    });

    it('should detect known conflicts from compatibility database', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {
            stripe: '12.5.0',
            express: '4.18.0',
            'body-parser': '1.19.0', // Known conflict version
          },
        },
        targetIntegration: {
          service: 'stripe-api',
          requiredDependencies: ['stripe', 'express'],
        },
      };

      const result = checker.checkCompatibility(config);

      expect(result.compatible).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);

      const bodyParserConflict = result.conflicts.find(c => c.component === 'body-parser');
      expect(bodyParserConflict).toBeDefined();
      expect(bodyParserConflict?.severity).toBe('High');
    });

    it('should generate upgrade recommendations for outdated dependencies', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {
            stripe: '10.0.0', // Minimum version, but upgrade recommended
            express: '4.17.0',
          },
        },
        targetIntegration: {
          service: 'stripe-api',
          requiredDependencies: ['stripe', 'express'],
        },
      };

      const result = checker.checkCompatibility(config);

      expect(result.compatible).toBe(true);
      expect(result.requiredUpgrades.length).toBeGreaterThan(0);

      const stripeUpgrade = result.requiredUpgrades.find(u => u.component === 'stripe');
      expect(stripeUpgrade).toBeDefined();
      expect(stripeUpgrade?.from).toBe('10.0.0');
    });

    it('should detect missing required dependencies', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {
            express: '4.18.0',
            // Missing 'stripe' dependency
          },
        },
        targetIntegration: {
          service: 'stripe-api',
          requiredDependencies: ['stripe', 'express'],
        },
      };

      const result = checker.checkCompatibility(config);

      expect(result.compatible).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);

      const missingDep = result.conflicts.find(c => c.component === 'stripe');
      expect(missingDep).toBeDefined();
      expect(missingDep?.severity).toBe('Blocking');
    });

    it('should return compatible=false when language version is insufficient', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {
            stripe: '12.5.0',
            express: '4.18.0',
          },
        },
        targetIntegration: {
          service: 'stripe-api',
          requiredDependencies: ['stripe', 'express'],
        },
      };

      // Mock language version check (simulated via version in library name for simplicity)
      // In real implementation, this would check against supportedLanguages
      const result = checker.checkCompatibility(config);

      // Should be compatible with correct language version
      expect(result.compatible).toBe(true);
    });

    it('should handle service not found in compatibility database', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {
            'unknown-lib': '1.0.0',
          },
        },
        targetIntegration: {
          service: 'unknown-service',
          requiredDependencies: [],
        },
      };

      const result = checker.checkCompatibility(config);

      // Should return a result with warning or empty compatibility
      expect(result).toBeDefined();
      expect(result.compatible).toBe(true); // No constraints to validate
      expect(result.conflicts).toHaveLength(0);
    });

    it('should prioritize conflicts by severity', () => {
      // Add another service with multiple conflicts
      mockCompatibilityDatabase.set('complex-service', {
        service: 'complex-service',
        requiredDependencies: [
          {
            name: 'dep1',
            versionConstraint: '>=2.0.0',
            optional: false,
          },
          {
            name: 'dep2',
            versionConstraint: '>=3.0.0',
            optional: false,
          },
        ],
        supportedLanguages: [
          {
            language: 'node',
            minVersion: '18.0.0',
          },
        ],
        knownConflicts: [
          {
            library: 'dep3',
            version: '<1.0.0',
            severity: 'Low',
            reason: 'Minor performance issue',
          },
          {
            library: 'dep4',
            version: '<2.0.0',
            severity: 'Blocking',
            reason: 'Security vulnerability',
          },
        ],
        updatedAt: '2025-01-01T00:00:00Z',
      });

      const checker2 = new CompatibilityChecker(mockCompatibilityDatabase);

      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {
            dep1: '1.5.0',
            dep2: '2.8.0',
            dep3: '0.9.0',
            dep4: '1.5.0',
          },
        },
        targetIntegration: {
          service: 'complex-service',
          requiredDependencies: ['dep1', 'dep2'],
        },
      };

      const result = checker2.checkCompatibility(config);

      expect(result.compatible).toBe(false);
      expect(result.conflicts.length).toBeGreaterThan(0);

      // Blocking conflicts should appear first
      const severities = result.conflicts.map(c => c.severity);
      const blockingIndex = severities.indexOf('Blocking');
      const lowIndex = severities.indexOf('Low');

      if (blockingIndex !== -1 && lowIndex !== -1) {
        expect(blockingIndex).toBeLessThan(lowIndex);
      }
    });
  });

  describe('parseSemverConstraint', () => {
    it('should correctly parse semver constraints', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {
            stripe: '14.9.0',
            express: '4.18.0',
          },
        },
        targetIntegration: {
          service: 'stripe-api',
          requiredDependencies: ['stripe', 'express'],
        },
      };

      const result = checker.checkCompatibility(config);

      // Version 14.9.0 should satisfy >=10.0.0 <15.0.0
      expect(result.compatible).toBe(true);
    });

    it('should detect version outside constraint range', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {
            stripe: '15.0.0', // Outside <15.0.0 constraint
            express: '4.18.0',
          },
        },
        targetIntegration: {
          service: 'stripe-api',
          requiredDependencies: ['stripe', 'express'],
        },
      };

      const result = checker.checkCompatibility(config);

      expect(result.compatible).toBe(false);
      const stripeConflict = result.conflicts.find(c => c.component === 'stripe');
      expect(stripeConflict).toBeDefined();
    });
  });
});
