/**
 * Performance Analyzer Unit Tests
 *
 * Tests for performance metrics calculation and test orchestration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceAnalyzer } from '@/analysis/performance/performance-analyzer';
import type { PerformanceTestConfig } from '@/analysis/performance/types';
import type { JMeterBridge } from '@/analysis/performance/jmeter-bridge';

describe('PerformanceAnalyzer', () => {
  describe('calculateMetrics', () => {
    it('should calculate response time statistics from JTL data', () => {
      // Arrange: Sample latency data
      const analyzer = new PerformanceAnalyzer({} as JMeterBridge);
      const latencies = [100, 150, 200, 250, 300, 500, 1000];

      // Act: Calculate statistics
      const stats = analyzer.calculateResponseTimeStats(latencies);

      // Assert: Should calculate correct statistics
      expect(stats.mean).toBeCloseTo(357.14, 2); // (100+150+200+250+300+500+1000)/7
      expect(stats.min).toBe(100);
      expect(stats.max).toBe(1000);
      expect(stats.p50).toBe(250); // Median
      expect(stats.p95).toBe(1000); // 95th percentile
      expect(stats.p99).toBe(1000); // 99th percentile
    });

    it('should calculate throughput from timestamps', () => {
      // Arrange: Sample data with timestamps
      const analyzer = new PerformanceAnalyzer({} as JMeterBridge);
      const samples = [
        { timestamp: 1000, elapsed: 100, success: true },
        { timestamp: 2000, elapsed: 150, success: true },
        { timestamp: 3000, elapsed: 200, success: true },
        { timestamp: 4000, elapsed: 250, success: true },
        { timestamp: 5000, elapsed: 300, success: true },
      ];

      // Act: Calculate throughput
      const throughput = analyzer.calculateThroughput(samples);

      // Assert: 5 samples in 4 seconds = 1.25 rps
      expect(throughput).toBeCloseTo(1.25, 2);
    });

    it('should calculate error rate percentage', () => {
      // Arrange: Mixed success/failure samples
      const analyzer = new PerformanceAnalyzer({} as JMeterBridge);
      const samples = [
        { timestamp: 1000, elapsed: 100, success: true },
        { timestamp: 2000, elapsed: 150, success: true },
        { timestamp: 3000, elapsed: 200, success: false },
        { timestamp: 4000, elapsed: 250, success: true },
        { timestamp: 5000, elapsed: 300, success: false },
      ];

      // Act: Calculate error rate
      const errorRate = analyzer.calculateErrorRate(samples);

      // Assert: 2 failures out of 5 = 40%
      expect(errorRate).toBe(40);
    });

    it('should generate concurrency results for different load levels', () => {
      // Arrange: Concurrency test configuration
      const analyzer = new PerformanceAnalyzer({} as JMeterBridge);
      const concurrencyLevels = [1, 10, 50, 100];
      const samplesByLevel = {
        1: [
          { timestamp: 1000, elapsed: 100, success: true },
          { timestamp: 2000, elapsed: 110, success: true },
        ],
        10: [
          { timestamp: 1000, elapsed: 200, success: true },
          { timestamp: 2000, elapsed: 210, success: true },
        ],
        50: [
          { timestamp: 1000, elapsed: 400, success: true },
          { timestamp: 2000, elapsed: 450, success: false },
        ],
        100: [
          { timestamp: 1000, elapsed: 800, success: true },
          { timestamp: 2000, elapsed: 900, success: false },
        ],
      };

      // Act: Generate concurrency results
      const results = analyzer.generateConcurrencyResults(
        concurrencyLevels,
        samplesByLevel
      );

      // Assert: Should have results for each concurrency level
      expect(results).toHaveLength(4);
      expect(results[0]).toEqual({
        concurrency: 1,
        successRate: 100,
        avgLatency: 105,
      });
      expect(results[1]).toEqual({
        concurrency: 10,
        successRate: 100,
        avgLatency: 205,
      });
      expect(results[2]).toEqual({
        concurrency: 50,
        successRate: 50,
        avgLatency: 425,
      });
      expect(results[3]).toEqual({
        concurrency: 100,
        successRate: 50,
        avgLatency: 850,
      });
    });

    it('should handle empty sample data gracefully', () => {
      // Arrange: Empty samples
      const analyzer = new PerformanceAnalyzer({} as JMeterBridge);
      const emptySamples: Array<{
        timestamp: number;
        elapsed: number;
        success: boolean;
      }> = [];

      // Act: Calculate metrics with empty data
      const stats = analyzer.calculateResponseTimeStats([]);
      const throughput = analyzer.calculateThroughput(emptySamples);
      const errorRate = analyzer.calculateErrorRate(emptySamples);

      // Assert: Should return zero values
      expect(stats.mean).toBe(0);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(throughput).toBe(0);
      expect(errorRate).toBe(0);
    });

    it('should calculate p50, p95, p99 percentiles correctly', () => {
      // Arrange: 100 samples for precise percentile calculation
      const analyzer = new PerformanceAnalyzer({} as JMeterBridge);
      const latencies = Array.from({ length: 100 }, (_, i) => i + 1);

      // Act: Calculate percentiles
      const stats = analyzer.calculateResponseTimeStats(latencies);

      // Assert: Percentiles should match expected values
      expect(stats.p50).toBe(50); // 50th value
      expect(stats.p95).toBe(95); // 95th value
      expect(stats.p99).toBe(99); // 99th value
    });
  });

  describe('runPerformanceTest', () => {
    it('should orchestrate performance test with validation', async () => {
      // Arrange: Mock JMeter bridge
      const mockBridge = {
        verifyInstallation: vi.fn().mockResolvedValue({
          success: true,
          value: { installed: true, version: '5.6.3' },
        }),
        generateTestPlan: vi.fn().mockReturnValue('<jmx>test plan</jmx>'),
        saveTestPlan: vi.fn().mockResolvedValue({ success: true, value: undefined }),
        executeJMeter: vi.fn().mockResolvedValue({ success: true, value: undefined }),
        parseJTLOutput: vi.fn().mockResolvedValue({
          success: true,
          value: {
            responseTime: { mean: 150, min: 100, max: 300, p50: 140, p95: 280, p99: 295 },
            throughput: 10.5,
            errorRate: 2.5,
            concurrencyResults: [],
          },
        }),
      } as unknown as JMeterBridge;

      const analyzer = new PerformanceAnalyzer(mockBridge);
      const config: PerformanceTestConfig = {
        target: {
          url: 'https://api.example.com/test',
          method: 'GET',
        },
        concurrency: [1, 10],
        duration: 30,
        rampUp: 5,
      };

      // Act: Run performance test
      const result = await analyzer.runPerformanceTest(config);

      // Assert: Should succeed with metrics
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.responseTime.mean).toBeCloseTo(150);
        expect(result.value.throughput).toBeCloseTo(10.5);
        expect(mockBridge.verifyInstallation).toHaveBeenCalled();
        expect(mockBridge.generateTestPlan).toHaveBeenCalledWith(config);
        expect(mockBridge.executeJMeter).toHaveBeenCalled();
      }
    });

    it('should validate minimum test duration (10 seconds)', async () => {
      // Arrange: Invalid config with duration < 10s
      const mockBridge = {} as JMeterBridge;
      const analyzer = new PerformanceAnalyzer(mockBridge);
      const invalidConfig: PerformanceTestConfig = {
        target: {
          url: 'https://api.example.com/test',
          method: 'GET',
        },
        concurrency: [1],
        duration: 5, // Invalid: < 10 seconds
        rampUp: 2,
      };

      // Act: Attempt to run test
      const result = await analyzer.runPerformanceTest(invalidConfig);

      // Assert: Should fail with validation error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('TARGET_UNREACHABLE');
        expect(result.error.cause.message).toContain('duration');
        expect(result.error.cause.message).toContain('10');
      }
    });

    it('should validate positive concurrency levels', async () => {
      // Arrange: Invalid config with non-positive concurrency
      const mockBridge = {} as JMeterBridge;
      const analyzer = new PerformanceAnalyzer(mockBridge);
      const invalidConfig: PerformanceTestConfig = {
        target: {
          url: 'https://api.example.com/test',
          method: 'GET',
        },
        concurrency: [0, -1], // Invalid: non-positive values
        duration: 30,
        rampUp: 5,
      };

      // Act: Attempt to run test
      const result = await analyzer.runPerformanceTest(invalidConfig);

      // Assert: Should fail with validation error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('TARGET_UNREACHABLE');
        expect(result.error.cause.message).toContain('concurrency');
        expect(result.error.cause.message).toContain('positive');
      }
    });

    it('should handle JMeter not installed error', async () => {
      // Arrange: Mock JMeter not installed
      const mockBridge = {
        verifyInstallation: vi.fn().mockResolvedValue({
          success: false,
          error: {
            type: 'JMETER_NOT_FOUND',
            message: 'JMeter is not installed',
          },
        }),
      } as unknown as JMeterBridge;

      const analyzer = new PerformanceAnalyzer(mockBridge);
      const config: PerformanceTestConfig = {
        target: {
          url: 'https://api.example.com/test',
          method: 'GET',
        },
        concurrency: [1],
        duration: 30,
        rampUp: 5,
      };

      // Act: Attempt to run test
      const result = await analyzer.runPerformanceTest(config);

      // Assert: Should propagate JMeter installation error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('JMETER_NOT_FOUND');
      }
    });

    it('should support configurable test duration and concurrency levels', async () => {
      // Arrange: Custom configuration
      const testPlanContent = '<jmx>custom plan</jmx>';
      const mockBridge = {
        verifyInstallation: vi.fn().mockResolvedValue({
          success: true,
          value: { installed: true, version: '5.6.3' },
        }),
        generateTestPlan: vi.fn().mockReturnValue(testPlanContent),
        saveTestPlan: vi.fn().mockResolvedValue({ success: true, value: undefined }),
        executeJMeter: vi.fn().mockResolvedValue({ success: true, value: undefined }),
        parseJTLOutput: vi.fn().mockResolvedValue({
          success: true,
          value: {
            responseTime: { mean: 200, min: 150, max: 400, p50: 190, p95: 380, p99: 395 },
            throughput: 25.0,
            errorRate: 0,
            concurrencyResults: [],
          },
        }),
      } as unknown as JMeterBridge;

      const analyzer = new PerformanceAnalyzer(mockBridge);
      const config: PerformanceTestConfig = {
        target: {
          url: 'https://api.example.com/test',
          method: 'POST',
          body: { test: 'data' },
        },
        concurrency: [1, 10, 50, 100],
        duration: 120, // 2 minutes
        rampUp: 30, // 30 seconds ramp-up
      };

      // Act: Run test with custom config
      const result = await analyzer.runPerformanceTest(config);

      // Assert: Should pass config to test plan generator
      expect(result.success).toBe(true);
      expect(mockBridge.generateTestPlan).toHaveBeenCalledWith(config);
    });

    it('should implement staged ramp-up for concurrency simulation', async () => {
      // Arrange: Config with multiple concurrency levels
      const mockBridge = {
        verifyInstallation: vi.fn().mockResolvedValue({
          success: true,
          value: { installed: true, version: '5.6.3' },
        }),
        generateTestPlan: vi.fn().mockReturnValue('<jmx>test plan</jmx>'),
        saveTestPlan: vi.fn().mockResolvedValue({ success: true, value: undefined }),
        executeJMeter: vi.fn().mockResolvedValue({ success: true, value: undefined }),
        parseJTLOutput: vi.fn().mockResolvedValue({
          success: true,
          value: {
            responseTime: { mean: 150, min: 100, max: 300, p50: 140, p95: 280, p99: 295 },
            throughput: 10.5,
            errorRate: 2.5,
            concurrencyResults: [],
          },
        }),
      } as unknown as JMeterBridge;

      const analyzer = new PerformanceAnalyzer(mockBridge);
      const config: PerformanceTestConfig = {
        target: {
          url: 'https://api.example.com/test',
          method: 'GET',
        },
        concurrency: [1, 10, 50, 100],
        duration: 60,
        rampUp: 10,
      };

      // Act: Run performance test
      const result = await analyzer.runPerformanceTest(config);

      // Assert: Should generate test plan with ramp-up configuration
      expect(result.success).toBe(true);
      expect(mockBridge.generateTestPlan).toHaveBeenCalledWith(
        expect.objectContaining({
          rampUp: 10,
          concurrency: [1, 10, 50, 100],
        })
      );
    });
  });
});
