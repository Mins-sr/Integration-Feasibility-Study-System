/**
 * Mitigation Generator Tests
 *
 * Test cases for risk mitigation strategy generation functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MitigationGenerator } from '@/analysis/risk/mitigation-generator';
import type {
  RiskAssessmentReport,
  Mitigation,
} from '@/analysis/risk/types';

describe('MitigationGenerator', () => {
  let generator: MitigationGenerator;

  beforeEach(() => {
    generator = new MitigationGenerator();
  });

  describe('generateMitigations', () => {
    it('should generate mitigations for blocking compatibility conflicts', () => {
      const report: RiskAssessmentReport = {
        compatibility: {
          compatible: false,
          conflicts: [
            {
              component: 'stripe',
              current: '9.5.0',
              required: '>=10.0.0 <15.0.0',
              severity: 'Blocking',
            },
          ],
          requiredUpgrades: [],
        },
        vendorLockIn: {
          riskLevel: 'Low',
          proprietaryDependencies: [],
          dataPortability: 'Full',
          apiCoupling: 'Loose',
          assessment: 'Low risk',
        },
        scalability: {
          horizontalScaling: 'Supported',
          verticalScalingLimits: {},
          extensionPoints: [],
          performanceAtScale: 'Excellent',
        },
        learningCurve: {
          estimatedLearningHours: 10,
          complexity: 'Low',
          documentationQuality: 'Excellent',
          communitySupport: 'Strong',
          skillAvailability: 'High',
          adoptionRisk: 'Low',
        },
        mitigations: [],
        generatedAt: new Date().toISOString(),
      };

      const mitigations = generator.generateMitigations(report);

      expect(mitigations.length).toBeGreaterThan(0);
      const compatibilityMitigation = mitigations.find(m => m.risk.includes('compatibility'));
      expect(compatibilityMitigation).toBeDefined();
      expect(compatibilityMitigation?.strategy).toContain('Upgrade');
      expect(compatibilityMitigation?.effort).toBeDefined();
      expect(compatibilityMitigation?.priority).toBeGreaterThan(0);
    });

    it('should prioritize High vendor lock-in mitigations', () => {
      const report: RiskAssessmentReport = {
        compatibility: {
          compatible: true,
          conflicts: [],
          requiredUpgrades: [],
        },
        vendorLockIn: {
          riskLevel: 'High',
          proprietaryDependencies: ['aws-sdk', 'firebase-admin'],
          dataPortability: 'None',
          apiCoupling: 'Tight',
          assessment: 'High vendor lock-in risk',
        },
        scalability: {
          horizontalScaling: 'Supported',
          verticalScalingLimits: {},
          extensionPoints: [],
          performanceAtScale: 'Good',
        },
        learningCurve: {
          estimatedLearningHours: 30,
          complexity: 'Medium',
          documentationQuality: 'Good',
          communitySupport: 'Moderate',
          skillAvailability: 'Medium',
          adoptionRisk: 'Medium',
        },
        mitigations: [],
        generatedAt: new Date().toISOString(),
      };

      const mitigations = generator.generateMitigations(report);

      expect(mitigations.length).toBeGreaterThan(0);
      const lockInMitigation = mitigations.find(m => m.risk.includes('vendor lock-in'));
      expect(lockInMitigation).toBeDefined();
      expect(lockInMitigation?.priority).toBeLessThanOrEqual(2); // High priority
      expect(lockInMitigation?.strategy).toContain('abstraction');
    });

    it('should generate scalability mitigations for Not Supported horizontal scaling', () => {
      const report: RiskAssessmentReport = {
        compatibility: {
          compatible: true,
          conflicts: [],
          requiredUpgrades: [],
        },
        vendorLockIn: {
          riskLevel: 'Low',
          proprietaryDependencies: [],
          dataPortability: 'Full',
          apiCoupling: 'Loose',
          assessment: 'Low risk',
        },
        scalability: {
          horizontalScaling: 'Not Supported',
          verticalScalingLimits: {},
          extensionPoints: [],
          performanceAtScale: 'Poor',
        },
        learningCurve: {
          estimatedLearningHours: 10,
          complexity: 'Low',
          documentationQuality: 'Good',
          communitySupport: 'Strong',
          skillAvailability: 'High',
          adoptionRisk: 'Low',
        },
        mitigations: [],
        generatedAt: new Date().toISOString(),
      };

      const mitigations = generator.generateMitigations(report);

      expect(mitigations.length).toBeGreaterThan(0);
      const scalabilityMitigation = mitigations.find(m => m.risk.includes('horizontal scaling'));
      expect(scalabilityMitigation).toBeDefined();
      expect(scalabilityMitigation?.strategy).toBeDefined();
    });

    it('should generate learning curve mitigations for High complexity', () => {
      const report: RiskAssessmentReport = {
        compatibility: {
          compatible: true,
          conflicts: [],
          requiredUpgrades: [],
        },
        vendorLockIn: {
          riskLevel: 'Low',
          proprietaryDependencies: [],
          dataPortability: 'Full',
          apiCoupling: 'Loose',
          assessment: 'Low risk',
        },
        scalability: {
          horizontalScaling: 'Supported',
          verticalScalingLimits: {},
          extensionPoints: [],
          performanceAtScale: 'Good',
        },
        learningCurve: {
          estimatedLearningHours: 80,
          complexity: 'High',
          documentationQuality: 'Fair',
          communitySupport: 'Weak',
          skillAvailability: 'Low',
          adoptionRisk: 'High',
        },
        mitigations: [],
        generatedAt: new Date().toISOString(),
      };

      const mitigations = generator.generateMitigations(report);

      expect(mitigations.length).toBeGreaterThan(0);
      const learningMitigation = mitigations.find(m => m.risk.includes('learning') || m.risk.includes('training'));
      expect(learningMitigation).toBeDefined();
      expect(learningMitigation?.strategy).toBeDefined();
    });

    it('should sort mitigations by priority', () => {
      const report: RiskAssessmentReport = {
        compatibility: {
          compatible: false,
          conflicts: [
            {
              component: 'dep1',
              current: '1.0.0',
              required: '>=2.0.0',
              severity: 'Blocking',
            },
          ],
          requiredUpgrades: [],
        },
        vendorLockIn: {
          riskLevel: 'High',
          proprietaryDependencies: ['aws-sdk'],
          dataPortability: 'None',
          apiCoupling: 'Tight',
          assessment: 'High risk',
        },
        scalability: {
          horizontalScaling: 'Limited',
          verticalScalingLimits: {},
          extensionPoints: [],
          performanceAtScale: 'Fair',
        },
        learningCurve: {
          estimatedLearningHours: 30,
          complexity: 'Medium',
          documentationQuality: 'Good',
          communitySupport: 'Moderate',
          skillAvailability: 'Medium',
          adoptionRisk: 'Medium',
        },
        mitigations: [],
        generatedAt: new Date().toISOString(),
      };

      const mitigations = generator.generateMitigations(report);

      expect(mitigations.length).toBeGreaterThan(0);

      // Check that priorities are in ascending order (1 = highest)
      for (let i = 1; i < mitigations.length; i++) {
        expect(mitigations[i].priority).toBeGreaterThanOrEqual(mitigations[i - 1].priority);
      }
    });

    it('should provide timeline estimates for mitigations', () => {
      const report: RiskAssessmentReport = {
        compatibility: {
          compatible: false,
          conflicts: [
            {
              component: 'stripe',
              current: '9.5.0',
              required: '>=10.0.0',
              severity: 'Blocking',
            },
          ],
          requiredUpgrades: [],
        },
        vendorLockIn: {
          riskLevel: 'Low',
          proprietaryDependencies: [],
          dataPortability: 'Full',
          apiCoupling: 'Loose',
          assessment: 'Low risk',
        },
        scalability: {
          horizontalScaling: 'Supported',
          verticalScalingLimits: {},
          extensionPoints: [],
          performanceAtScale: 'Good',
        },
        learningCurve: {
          estimatedLearningHours: 10,
          complexity: 'Low',
          documentationQuality: 'Good',
          communitySupport: 'Strong',
          skillAvailability: 'High',
          adoptionRisk: 'Low',
        },
        mitigations: [],
        generatedAt: new Date().toISOString(),
      };

      const mitigations = generator.generateMitigations(report);

      expect(mitigations.length).toBeGreaterThan(0);
      const mitigationWithTimeline = mitigations.find(m => m.timeline);
      expect(mitigationWithTimeline).toBeDefined();
      expect(mitigationWithTimeline?.timeline).toBeDefined();
    });

    it('should return empty array when no risks detected', () => {
      const report: RiskAssessmentReport = {
        compatibility: {
          compatible: true,
          conflicts: [],
          requiredUpgrades: [],
        },
        vendorLockIn: {
          riskLevel: 'Low',
          proprietaryDependencies: [],
          dataPortability: 'Full',
          apiCoupling: 'Loose',
          assessment: 'Low risk',
        },
        scalability: {
          horizontalScaling: 'Supported',
          verticalScalingLimits: {},
          extensionPoints: [],
          performanceAtScale: 'Excellent',
        },
        learningCurve: {
          estimatedLearningHours: 10,
          complexity: 'Low',
          documentationQuality: 'Excellent',
          communitySupport: 'Strong',
          skillAvailability: 'High',
          adoptionRisk: 'Low',
        },
        mitigations: [],
        generatedAt: new Date().toISOString(),
      };

      const mitigations = generator.generateMitigations(report);

      expect(mitigations).toHaveLength(0);
    });
  });
});
