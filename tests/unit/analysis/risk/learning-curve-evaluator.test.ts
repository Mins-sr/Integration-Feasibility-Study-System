/**
 * Learning Curve Evaluator Tests
 *
 * Test cases for learning curve and adoption risk evaluation functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { LearningCurveEvaluator } from '@/analysis/risk/learning-curve-evaluator';
import type {
  RiskAnalysisConfig,
  LearningCurveRisk,
} from '@/analysis/risk/types';

describe('LearningCurveEvaluator', () => {
  let evaluator: LearningCurveEvaluator;

  beforeEach(() => {
    evaluator = new LearningCurveEvaluator();
  });

  describe('evaluateLearningCurve', () => {
    it('should return Low complexity for simple REST APIs', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'rest-api',
          requiredDependencies: ['axios'],
        },
      };

      const result = evaluator.evaluateLearningCurve(config);

      expect(result.complexity).toBe('Low');
      expect(result.adoptionRisk).toBe('Low');
      expect(result.estimatedLearningHours).toBeLessThan(20);
    });

    it('should return High complexity for advanced technologies', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'machine-learning-api',
          requiredDependencies: ['tensorflow', '@tensorflow/tfjs-node'],
        },
      };

      const result = evaluator.evaluateLearningCurve(config);

      expect(result.complexity).toBe('High');
      expect(result.adoptionRisk).toBe('High');
      expect(result.estimatedLearningHours).toBeGreaterThan(40);
    });

    it('should return Medium complexity for GraphQL', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'graphql-api',
          requiredDependencies: ['graphql', 'apollo-client'],
        },
      };

      const result = evaluator.evaluateLearningCurve(config);

      expect(result.complexity).toBe('Medium');
      expect(result.estimatedLearningHours).toBeGreaterThanOrEqual(20);
      expect(result.estimatedLearningHours).toBeLessThanOrEqual(40);
    });

    it('should assess Excellent documentation for popular libraries', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'stripe-api',
          requiredDependencies: ['stripe'],
        },
      };

      const result = evaluator.evaluateLearningCurve(config);

      expect(result.documentationQuality).toBe('Excellent');
    });

    it('should assess Fair documentation for less popular libraries', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'niche-api',
          requiredDependencies: ['obscure-library'],
        },
      };

      const result = evaluator.evaluateLearningCurve(config);

      expect(result.documentationQuality).toBe('Fair');
    });

    it('should assess Strong community support for mainstream technologies', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'express-api',
          requiredDependencies: ['express'],
        },
      };

      const result = evaluator.evaluateLearningCurve(config);

      expect(result.communitySupport).toBe('Strong');
    });

    it('should assess Weak community support for proprietary solutions', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'proprietary-sdk',
          requiredDependencies: ['vendor-specific-lib'],
        },
      };

      const result = evaluator.evaluateLearningCurve(config);

      expect(result.communitySupport).toBe('Weak');
    });

    it('should assess High skill availability for popular stacks', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: ['express'],
          libraries: {},
        },
        targetIntegration: {
          service: 'mongodb-api',
          requiredDependencies: ['mongodb'],
        },
      };

      const result = evaluator.evaluateLearningCurve(config);

      expect(result.skillAvailability).toBe('High');
    });

    it('should assess Low skill availability for specialized technologies', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'blockchain-api',
          requiredDependencies: ['web3', 'ethers'],
        },
      };

      const result = evaluator.evaluateLearningCurve(config);

      expect(result.skillAvailability).toBe('Medium'); // Blockchain is growing but still specialized
    });

    it('should calculate Medium adoption risk for moderate complexity', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'websocket-server',
          requiredDependencies: ['socket.io'],
        },
      };

      const result = evaluator.evaluateLearningCurve(config);

      expect(result.complexity).toBe('Medium');
      expect(result.adoptionRisk).toBe('Medium');
    });
  });
});
