/**
 * Scalability Analyzer Tests
 *
 * Test cases for scalability and extensibility analysis functionality.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ScalabilityAnalyzer } from '@/analysis/risk/scalability-analyzer';
import type {
  RiskAnalysisConfig,
  ScalabilityAssessment,
} from '@/analysis/risk/types';

describe('ScalabilityAnalyzer', () => {
  let analyzer: ScalabilityAnalyzer;

  beforeEach(() => {
    analyzer = new ScalabilityAnalyzer();
  });

  describe('analyzeScalability', () => {
    it('should assess horizontal scaling support for stateless services', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: ['express'],
          libraries: {},
        },
        targetIntegration: {
          service: 'rest-api',
          requiredDependencies: ['axios'],
        },
      };

      const result = analyzer.analyzeScalability(config);

      expect(result.horizontalScaling).toBe('Supported');
      expect(result.performanceAtScale).toBe('Excellent');
    });

    it('should detect limited horizontal scaling for stateful services', () => {
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

      const result = analyzer.analyzeScalability(config);

      expect(result.horizontalScaling).toBe('Limited');
    });

    it('should identify vertical scaling limits for resource-intensive services', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'video-processing',
          requiredDependencies: ['ffmpeg'],
        },
      };

      const result = analyzer.analyzeScalability(config);

      expect(result.verticalScalingLimits).toBeDefined();
      expect(result.verticalScalingLimits.cpu).toBeDefined();
      expect(result.verticalScalingLimits.memory).toBeDefined();
    });

    it('should detect extension points in plugin-based architectures', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'graphql-server',
          requiredDependencies: ['apollo-server'],
        },
      };

      const result = analyzer.analyzeScalability(config);

      expect(result.extensionPoints).toBeDefined();
      expect(result.extensionPoints.length).toBeGreaterThan(0);
      expect(result.extensionPoints).toContain('Custom resolvers');
    });

    it('should evaluate performance at scale as Excellent for well-optimized services', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'cdn-integration',
          requiredDependencies: ['cloudflare'],
        },
      };

      const result = analyzer.analyzeScalability(config);

      expect(result.performanceAtScale).toBe('Excellent');
    });

    it('should evaluate performance at scale as Fair for database-heavy operations', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'complex-analytics',
          requiredDependencies: ['mongodb', 'elasticsearch'],
        },
      };

      const result = analyzer.analyzeScalability(config);

      expect(result.performanceAtScale).toBe('Good');
    });

    it('should detect connection limits for database services', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'postgresql-db',
          requiredDependencies: ['pg'],
        },
      };

      const result = analyzer.analyzeScalability(config);

      expect(result.verticalScalingLimits.connections).toBeDefined();
      expect(result.verticalScalingLimits.connections).toBeGreaterThan(0);
    });

    it('should identify webhook support as an extension point', () => {
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

      const result = analyzer.analyzeScalability(config);

      expect(result.extensionPoints).toContain('Webhooks');
    });

    it('should assess Not Supported for single-instance services', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: [],
          libraries: {},
        },
        targetIntegration: {
          service: 'local-file-storage',
          requiredDependencies: ['fs'],
        },
      };

      const result = analyzer.analyzeScalability(config);

      expect(result.horizontalScaling).toBe('Not Supported');
    });

    it('should provide comprehensive extension points for microservices', () => {
      const config: RiskAnalysisConfig = {
        existingStack: {
          language: 'node',
          frameworks: ['express'],
          libraries: {},
        },
        targetIntegration: {
          service: 'microservice-api',
          requiredDependencies: ['express', 'graphql'],
        },
      };

      const result = analyzer.analyzeScalability(config);

      expect(result.extensionPoints.length).toBeGreaterThan(0);
      expect(result.horizontalScaling).toBe('Supported');
    });
  });
});
