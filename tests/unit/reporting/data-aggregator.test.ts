/**
 * Data Aggregator Tests
 *
 * Test cases for aggregating analyzer results into a unified StudyResult structure.
 * This module is responsible for collecting all analyzer outputs and preparing them
 * for report generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DataAggregator } from '@/reporting/data-aggregator';
import type { AnalyzerResult } from '@/types';
import type { PerformanceMetrics } from '@/analysis/performance/types';
import type { VulnerabilityReport } from '@/analysis/security/types';
import type { CostEstimationReport } from '@/analysis/cost/types';
import type { RiskAssessmentReport } from '@/analysis/risk/types';

describe('DataAggregator', () => {
  let aggregator: DataAggregator;

  beforeEach(() => {
    aggregator = new DataAggregator();
  });

  describe('aggregate', () => {
    it('should successfully aggregate results from all analyzers', () => {
      // Arrange: Create sample analyzer results
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
          concurrencyResults: [
            { concurrency: 10, successRate: 99.5, avgLatency: 120 },
            { concurrency: 50, successRate: 98.0, avgLatency: 135 },
          ],
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
          authMethods: [{ type: 'API_KEY', location: 'header' }],
          vulnerabilities: [],
          complianceStatus: { GDPR: true, 'PCI-DSS': false },
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
          breakdown: [
            { category: 'Licensing', amount: 100, unit: 'USD/month' },
            { category: 'Usage', amount: 200, unit: 'USD/month' },
          ],
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
          mitigations: [],
        } as RiskAssessmentReport,
        errors: [],
      };

      const analyzerResults = [performanceResult, securityResult, costResult, riskResult];

      // Act: Aggregate all results
      const result = aggregator.aggregate(analyzerResults);

      // Assert: Verify successful aggregation
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.analyzerResults).toHaveLength(4);
        expect(result.value.analyzerResults).toEqual(analyzerResults);
        expect(result.value.hasPerformanceData).toBe(true);
        expect(result.value.hasSecurityData).toBe(true);
        expect(result.value.hasCostData).toBe(true);
        expect(result.value.hasRiskData).toBe(true);
      }
    });

    it('should fail when no analyzer results are provided', () => {
      // Act: Try to aggregate empty results
      const result = aggregator.aggregate([]);

      // Assert: Should return validation error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('at least one');
      }
    });

    it('should successfully aggregate partial results (some analyzers failed)', () => {
      // Arrange: Create results with one failed analyzer
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
        status: 'FAILED',
        startedAt: new Date('2025-11-16T00:00:00Z'),
        completedAt: new Date('2025-11-16T00:03:00Z'),
        data: null,
        errors: [{ type: 'ZAP_NOT_RUNNING', message: 'OWASP ZAP is not running' }],
      };

      const analyzerResults = [performanceResult, securityResult];

      // Act: Aggregate partial results
      const result = aggregator.aggregate(analyzerResults);

      // Assert: Should succeed with partial data
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.analyzerResults).toHaveLength(2);
        expect(result.value.hasPerformanceData).toBe(true);
        expect(result.value.hasSecurityData).toBe(false); // Failed analyzer
        expect(result.value.hasCostData).toBe(false);
        expect(result.value.hasRiskData).toBe(false);
      }
    });

    it('should merge results from checkpoint and new results', () => {
      // Arrange: Create checkpoint results and new results
      const checkpointResults: AnalyzerResult[] = [
        {
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
        },
      ];

      const newResults: AnalyzerResult[] = [
        {
          id: 'sec-1',
          studyId: 'study-123',
          analyzerType: 'SECURITY',
          status: 'COMPLETED',
          startedAt: new Date('2025-11-16T00:10:00Z'),
          completedAt: new Date('2025-11-16T00:13:00Z'),
          data: {
            tlsVersion: 'TLS 1.3',
            authMethods: [],
            vulnerabilities: [],
            complianceStatus: {},
          } as VulnerabilityReport,
          errors: [],
        },
      ];

      // Act: Aggregate with checkpoint
      const result = aggregator.aggregateWithCheckpoint(checkpointResults, newResults);

      // Assert: Should merge both sets
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.analyzerResults).toHaveLength(2);
        expect(result.value.hasPerformanceData).toBe(true);
        expect(result.value.hasSecurityData).toBe(true);
      }
    });

    it('should detect and remove duplicate analyzer types when merging', () => {
      // Arrange: Create results with duplicate analyzer types
      const checkpointResults: AnalyzerResult[] = [
        {
          id: 'perf-1',
          studyId: 'study-123',
          analyzerType: 'PERFORMANCE',
          status: 'COMPLETED',
          startedAt: new Date('2025-11-16T00:00:00Z'),
          completedAt: new Date('2025-11-16T00:05:00Z'),
          data: {
            responseTime: {
              mean: 100,
              min: 70,
              max: 150,
              p50: 95,
              p95: 140,
              p99: 145,
            },
            throughput: 800,
            errorRate: 1.0,
            concurrencyResults: [],
          } as PerformanceMetrics,
          errors: [],
        },
      ];

      const newResults: AnalyzerResult[] = [
        {
          id: 'perf-2',
          studyId: 'study-123',
          analyzerType: 'PERFORMANCE',
          status: 'COMPLETED',
          startedAt: new Date('2025-11-16T00:10:00Z'),
          completedAt: new Date('2025-11-16T00:15:00Z'),
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
        },
      ];

      // Act: Aggregate with duplicate type
      const result = aggregator.aggregateWithCheckpoint(checkpointResults, newResults);

      // Assert: Should keep only the newer result (from newResults)
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.analyzerResults).toHaveLength(1);
        // Should keep the newer result (perf-2)
        expect(result.value.analyzerResults[0].id).toBe('perf-2');
        const data = result.value.analyzerResults[0].data as PerformanceMetrics;
        expect(data.responseTime.mean).toBe(120);
      }
    });
  });

  describe('getAnalyzerByType', () => {
    it('should retrieve analyzer result by type', () => {
      // Arrange: Create aggregated result
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

      const aggregateResult = aggregator.aggregate([performanceResult]);
      expect(aggregateResult.success).toBe(true);

      // Act: Get analyzer by type
      if (aggregateResult.success) {
        const perfData = aggregator.getAnalyzerByType(aggregateResult.value, 'PERFORMANCE');

        // Assert: Should find the performance result
        expect(perfData).toBeDefined();
        expect(perfData?.analyzerType).toBe('PERFORMANCE');
        expect(perfData?.id).toBe('perf-1');
      }
    });

    it('should return undefined for non-existent analyzer type', () => {
      // Arrange: Create aggregated result without security data
      const performanceResult: AnalyzerResult = {
        id: 'perf-1',
        studyId: 'study-123',
        analyzerType: 'PERFORMANCE',
        status: 'COMPLETED',
        startedAt: new Date('2025-11-16T00:00:00Z'),
        completedAt: new Date('2025-11-16T00:05:00Z'),
        data: {} as PerformanceMetrics,
        errors: [],
      };

      const aggregateResult = aggregator.aggregate([performanceResult]);
      expect(aggregateResult.success).toBe(true);

      // Act: Try to get non-existent analyzer type
      if (aggregateResult.success) {
        const secData = aggregator.getAnalyzerByType(aggregateResult.value, 'SECURITY');

        // Assert: Should return undefined
        expect(secData).toBeUndefined();
      }
    });
  });
});
