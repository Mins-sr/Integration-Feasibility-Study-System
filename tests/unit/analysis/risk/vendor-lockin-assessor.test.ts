/**
 * Vendor Lock-in Assessor Tests
 *
 * Test cases for vendor lock-in risk assessment functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { VendorLockInAssessor } from '@/analysis/risk/vendor-lockin-assessor';
import type { RiskAnalysisConfig, VendorLockInRisk } from '@/analysis/risk/types';

describe('VendorLockInAssessor', () => {
  let assessor: VendorLockInAssessor;

  beforeEach(() => {
    assessor = new VendorLockInAssessor();
  });

  describe('assessVendorLockIn', () => {
    it('should return Low risk for open standards with full data portability', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'rest-api',
          requiredDependencies: ['axios'], // Standard HTTP client
        },
      };

      const result = assessor.assessVendorLockIn(config);

      expect(result.riskLevel).toBe('Low');
      expect(result.proprietaryDependencies).toHaveLength(0);
      expect(result.dataPortability).toBe('Full');
      expect(result.apiCoupling).toBe('Loose');
    });

    it('should return High risk for proprietary dependencies with tight coupling', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'aws-dynamodb',
          requiredDependencies: ['aws-sdk'], // Proprietary SDK
        },
      };

      const result = assessor.assessVendorLockIn(config);

      expect(result.riskLevel).toBe('High');
      expect(result.proprietaryDependencies.length).toBeGreaterThan(0);
      expect(result.proprietaryDependencies).toContain('aws-sdk');
      expect(result.apiCoupling).toBe('Tight');
    });

    it('should return Medium risk for partial data portability', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'stripe-api',
          requiredDependencies: ['stripe'], // Has export features but proprietary
        },
      };

      const result = assessor.assessVendorLockIn(config);

      expect(result.riskLevel).toBe('Medium');
      expect(result.dataPortability).toBe('Partial');
      expect(result.apiCoupling).toBe('Moderate');
    });

    it('should detect multiple proprietary dependencies', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'multi-vendor-service',
          requiredDependencies: ['aws-sdk', 'firebase-admin', 'azure-storage'],
        },
      };

      const result = assessor.assessVendorLockIn(config);

      expect(result.riskLevel).toBe('High');
      expect(result.proprietaryDependencies).toHaveLength(3);
      expect(result.proprietaryDependencies).toContain('aws-sdk');
      expect(result.proprietaryDependencies).toContain('firebase-admin');
      expect(result.proprietaryDependencies).toContain('azure-storage');
    });

    it('should provide detailed assessment explanation', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'google-cloud-storage',
          requiredDependencies: ['@google-cloud/storage'],
        },
      };

      const result = assessor.assessVendorLockIn(config);

      expect(result.assessment).toBeDefined();
      expect(result.assessment.length).toBeGreaterThan(0);
      expect(result.assessment).toContain('vendor');
    });

    it('should handle GraphQL services with standard protocols', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'graphql-api',
          requiredDependencies: ['graphql', 'apollo-client'], // Standard GraphQL
        },
      };

      const result = assessor.assessVendorLockIn(config);

      expect(result.riskLevel).toBe('Low');
      expect(result.apiCoupling).toBe('Loose');
    });

    it('should evaluate data portability based on export capabilities', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'mongodb-atlas',
          requiredDependencies: ['mongodb'], // Standard driver, but proprietary service
        },
      };

      const result = assessor.assessVendorLockIn(config);

      // MongoDB uses standard protocol but service-specific features
      expect(result.dataPortability).toBe('Full');
      expect(result.riskLevel).toBe('Low'); // Standard MongoDB protocol
    });

    it('should assess API coupling based on abstraction level', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'salesforce-api',
          requiredDependencies: ['jsforce'], // Proprietary API wrapper
        },
      };

      const result = assessor.assessVendorLockIn(config);

      expect(result.apiCoupling).toBe('Tight');
      expect(result.riskLevel).toBe('High');
    });

    it('should return Low risk when no proprietary dependencies detected', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'custom-rest-api',
          requiredDependencies: [],
        },
      };

      const result = assessor.assessVendorLockIn(config);

      expect(result.riskLevel).toBe('Low');
      expect(result.proprietaryDependencies).toHaveLength(0);
    });
  });
});
