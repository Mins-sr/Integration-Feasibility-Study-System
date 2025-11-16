/**
 * Markdown Generator Tests
 *
 * Test cases for generating Markdown reports from study results.
 * Includes executive summary, comparison tables, and recommendations.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MarkdownGenerator } from '@/reporting/markdown-generator';
import type { AggregatedStudyResult } from '@/reporting/types';
import type { AnalyzerResult } from '@/types';
import type { PerformanceMetrics } from '@/analysis/performance/types';
import type { VulnerabilityReport } from '@/analysis/security/types';
import type { CostEstimationReport } from '@/analysis/cost/types';
import type { RiskAssessmentReport } from '@/analysis/risk/types';

describe('MarkdownGenerator', () => {
  let generator: MarkdownGenerator;

  beforeEach(() => {
    generator = new MarkdownGenerator();
  });

  describe('generate', () => {
    it('should generate markdown report with all sections', () => {
      // Arrange: Create full aggregated result
      const performanceResult: AnalyzerResult = {
        id: 'perf-1',
        studyId: 'study-123',
        analyzerType: 'PERFORMANCE',
        status: 'COMPLETED',
        startedAt: new Date('2025-11-16T00:00:00Z'),
        completedAt: new Date('2025-11-16T00:05:00Z'),
        data: {
          responseTime: {
            mean: 120,
            min: 80,
            max: 200,
            p50: 115,
            p95: 180,
            p99: 195,
          },
          throughput: 850,
          errorRate: 0.5,
          concurrencyResults: [],
        } as PerformanceMetrics,
        errors: [],
      };

      const securityResult: AnalyzerResult = {
        id: 'sec-1',
        studyId: 'study-123',
        analyzerType: 'SECURITY',
        status: 'COMPLETED',
        startedAt: new Date('2025-11-16T00:00:00Z'),
        completedAt: new Date('2025-11-16T00:03:00Z'),
        data: {
          tlsVersion: 'TLS 1.3',
          authMethods: [{ type: 'API Key', details: 'Header: X-API-Key' }],
          vulnerabilities: [
            {
              id: 'vuln-1',
              name: 'Missing Security Headers',
              severity: 'Medium',
              description: 'Security headers not set',
              recommendation: 'Add security headers',
              falsePositiveRisk: 'Low',
            },
          ],
          complianceStatus: { GDPR: true },
        } as VulnerabilityReport,
        errors: [],
      };

      const costResult: AnalyzerResult = {
        id: 'cost-1',
        studyId: 'study-123',
        analyzerType: 'COST',
        status: 'COMPLETED',
        startedAt: new Date('2025-11-16T00:00:00Z'),
        completedAt: new Date('2025-11-16T00:02:00Z'),
        data: {
          directCosts: { licensing: 100, usage: 200, infrastructure: 150 },
          indirectCosts: { maintenance: 50, support: 30 },
          totalCosts: 530,
          roi: 45.5,
          breakdown: [],
        } as CostEstimationReport,
        errors: [],
      };

      const riskResult: AnalyzerResult = {
        id: 'risk-1',
        studyId: 'study-123',
        analyzerType: 'RISK',
        status: 'COMPLETED',
        startedAt: new Date('2025-11-16T00:00:00Z'),
        completedAt: new Date('2025-11-16T00:04:00Z'),
        data: {
          compatibility: { compatible: true, conflicts: [], requiredUpgrades: [] },
          vendorLockIn: { risk: 'Low', factors: [] },
          scalability: { horizontalScaling: true, verticalScaling: true },
          learningCurve: { complexity: 'Medium', estimatedHours: 40 },
          mitigations: [
            {
              risk: 'Learning Curve',
              strategy: 'Provide training materials',
              effort: 'Medium',
            },
          ],
        } as RiskAssessmentReport,
        errors: [],
      };

      const aggregated: AggregatedStudyResult = {
        analyzerResults: [performanceResult, securityResult, costResult, riskResult],
        hasPerformanceData: true,
        hasSecurityData: true,
        hasCostData: true,
        hasRiskData: true,
      };

      // Act: Generate markdown
      const result = generator.generate(aggregated, {
        studyId: 'study-123',
        targetUrl: 'https://api.example.com',
        generatedAt: new Date('2025-11-16T00:10:00Z'),
      });

      // Assert: Should generate valid markdown
      expect(result.success).toBe(true);
      if (result.success) {
        const markdown = result.value;

        // Check for required sections
        expect(markdown).toContain('# Integration Feasibility Study Report');
        expect(markdown).toContain('## Executive Summary');
        expect(markdown).toContain('## Performance Analysis');
        expect(markdown).toContain('## Security Assessment');
        expect(markdown).toContain('## Cost Analysis');
        expect(markdown).toContain('## Risk Assessment');
        expect(markdown).toContain('## Recommendations');

        // Check for specific data
        expect(markdown).toContain('120'); // mean response time
        expect(markdown).toContain('TLS 1.3');
        expect(markdown).toContain('530'); // total cost
        expect(markdown).toContain('45.5'); // ROI
      }
    });

    it('should handle partial results gracefully', () => {
      // Arrange: Create result with only performance data
      const performanceResult: AnalyzerResult = {
        id: 'perf-1',
        studyId: 'study-123',
        analyzerType: 'PERFORMANCE',
        status: 'COMPLETED',
        startedAt: new Date('2025-11-16T00:00:00Z'),
        completedAt: new Date('2025-11-16T00:05:00Z'),
        data: {
          responseTime: { mean: 120, min: 80, max: 200, p50: 115, p95: 180, p99: 195 },
          throughput: 850,
          errorRate: 0.5,
          concurrencyResults: [],
        } as PerformanceMetrics,
        errors: [],
      };

      const aggregated: AggregatedStudyResult = {
        analyzerResults: [performanceResult],
        hasPerformanceData: true,
        hasSecurityData: false,
        hasCostData: false,
        hasRiskData: false,
      };

      // Act: Generate markdown
      const result = generator.generate(aggregated, {
        studyId: 'study-123',
        targetUrl: 'https://api.example.com',
        generatedAt: new Date('2025-11-16T00:10:00Z'),
      });

      // Assert: Should generate report with available data
      expect(result.success).toBe(true);
      if (result.success) {
        const markdown = result.value;
        expect(markdown).toContain('## Performance Analysis');
        expect(markdown).not.toContain('## Security Assessment');
        expect(markdown).not.toContain('## Cost Analysis');
      }
    });

    it('should fail when no analyzer results are available', () => {
      // Arrange: Empty aggregated result
      const aggregated: AggregatedStudyResult = {
        analyzerResults: [],
        hasPerformanceData: false,
        hasSecurityData: false,
        hasCostData: false,
        hasRiskData: false,
      };

      // Act: Try to generate markdown
      const result = generator.generate(aggregated, {
        studyId: 'study-123',
        targetUrl: 'https://api.example.com',
        generatedAt: new Date('2025-11-16T00:10:00Z'),
      });

      // Assert: Should return validation error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
      }
    });
  });
});
