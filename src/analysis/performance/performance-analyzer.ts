/**
 * Performance Analyzer
 *
 * Orchestrates performance testing and metrics calculation using JMeter.
 * Implements requirement 2: パフォーマンス要件の検証
 */

import type { Result } from '@/types/result';
import type { TestError } from '@/types/error-types';
import type {
  PerformanceTestConfig,
  PerformanceMetrics,
  ResponseTimeStats,
  ConcurrencyResult,
  PerformanceTestCheckpoint,
} from './types';
import type { JMeterBridge } from './jmeter-bridge';
import { mkdir, writeFile, readFile, access } from 'fs/promises';

/**
 * Sample data from JMeter JTL output
 */
interface Sample {
  readonly timestamp: number;
  readonly elapsed: number;
  readonly success: boolean;
}

/**
 * Performance Analyzer Service
 */
export class PerformanceAnalyzer {
  constructor(private readonly jmeterBridge: JMeterBridge) {}

  /**
   * Calculate response time statistics from latency data
   * Implements AC: Calculate response time statistics (mean, min, max, p50, p95, p99)
   */
  calculateResponseTimeStats(latencies: number[]): ResponseTimeStats {
    if (latencies.length === 0) {
      return { mean: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }

    // Sort latencies for percentile calculation
    const sorted = [...latencies].sort((a, b) => a - b);

    const sum = sorted.reduce((acc, val) => acc + val, 0);
    const mean = sum / sorted.length;
    const min = sorted[0] ?? 0;
    const max = sorted[sorted.length - 1] ?? 0;

    // Calculate percentiles
    const p50 = this.percentile(sorted, 0.5);
    const p95 = this.percentile(sorted, 0.95);
    const p99 = this.percentile(sorted, 0.99);

    return { mean, min, max, p50, p95, p99 };
  }

  /**
   * Calculate percentile from sorted array
   */
  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)] ?? 0;
  }

  /**
   * Calculate throughput (requests per second) from sample data
   * Implements AC: Calculate throughput (RPS)
   */
  calculateThroughput(samples: Sample[]): number {
    if (samples.length === 0) return 0;

    const firstTimestamp = samples[0]?.timestamp ?? 0;
    const lastTimestamp = samples[samples.length - 1]?.timestamp ?? 0;
    const durationSeconds = (lastTimestamp - firstTimestamp) / 1000;

    return durationSeconds > 0 ? samples.length / durationSeconds : 0;
  }

  /**
   * Calculate error rate percentage
   * Implements AC: Calculate error rate percentage
   */
  calculateErrorRate(samples: Sample[]): number {
    if (samples.length === 0) return 0;

    const successfulSamples = samples.filter((s) => s.success).length;
    const errorCount = samples.length - successfulSamples;

    return (errorCount / samples.length) * 100;
  }

  /**
   * Generate concurrency results for different load levels
   * Implements AC: Generate concurrency results for different load levels
   */
  generateConcurrencyResults(
    concurrencyLevels: number[],
    samplesByLevel: Record<number, Sample[]>
  ): ConcurrencyResult[] {
    return concurrencyLevels.map((concurrency) => {
      const samples = samplesByLevel[concurrency] ?? [];

      if (samples.length === 0) {
        return {
          concurrency,
          successRate: 0,
          avgLatency: 0,
        };
      }

      const successfulSamples = samples.filter((s) => s.success).length;
      const successRate = (successfulSamples / samples.length) * 100;

      const totalLatency = samples.reduce((acc, s) => acc + s.elapsed, 0);
      const avgLatency = totalLatency / samples.length;

      return {
        concurrency,
        successRate,
        avgLatency,
      };
    });
  }

  /**
   * Run performance test against target API
   * Implements requirement 2: パフォーマンス要件の検証
   * AC: runPerformanceTest method, validate config, support configurable duration/concurrency
   */
  async runPerformanceTest(
    config: PerformanceTestConfig
  ): Promise<Result<PerformanceMetrics, TestError>> {
    // Validate minimum test duration (10 seconds)
    if (config.duration < 10) {
      return {
        success: false,
        error: {
          type: 'TARGET_UNREACHABLE',
          cause: new Error(
            'Test duration must be at least 10 seconds for meaningful results'
          ),
        },
      };
    }

    // Validate positive concurrency levels
    const hasInvalidConcurrency = config.concurrency.some((c) => c <= 0);
    if (hasInvalidConcurrency) {
      return {
        success: false,
        error: {
          type: 'TARGET_UNREACHABLE',
          cause: new Error(
            'All concurrency levels must be positive integers'
          ),
        },
      };
    }

    // Verify JMeter installation
    const installationResult = await this.jmeterBridge.verifyInstallation();
    if (!installationResult.success) {
      return installationResult;
    }

    // Generate test plan
    const testPlan = this.jmeterBridge.generateTestPlan(config);

    // Save test plan to temporary file
    const testPlanPath = `/tmp/jmeter-test-plan-${Date.now()}.jmx`;
    const jtlPath = `/tmp/jmeter-results-${Date.now()}.jtl`;

    const saveResult = await this.jmeterBridge.saveTestPlan(
      testPlan,
      testPlanPath
    );
    if (!saveResult.success) {
      return saveResult;
    }

    // Execute JMeter
    const executionResult = await this.jmeterBridge.executeJMeter(
      testPlanPath,
      jtlPath
    );
    if (!executionResult.success) {
      return executionResult;
    }

    // Parse JTL output
    const parseResult = await this.jmeterBridge.parseJTLOutput(jtlPath);
    if (!parseResult.success) {
      return parseResult;
    }

    return {
      success: true,
      value: parseResult.value,
    };
  }

  /**
   * Save checkpoint after completing a concurrency level
   * Task 4.4: Save partial results after each concurrency level completes
   */
  async saveCheckpoint(
    studyId: string,
    completedLevel: number,
    partialMetrics: Partial<PerformanceMetrics>
  ): Promise<Result<void, TestError>> {
    try {
      // Ensure checkpoint directory exists
      await mkdir('.study-checkpoint', { recursive: true });

      const checkpoint: PerformanceTestCheckpoint = {
        studyId,
        completedLevel,
        timestamp: Date.now(),
        partialMetrics,
      };

      const checkpointPath = `.study-checkpoint/${studyId}.json`;
      await writeFile(checkpointPath, JSON.stringify(checkpoint, null, 2), 'utf-8');

      return { success: true, value: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'TARGET_UNREACHABLE',
          cause: error instanceof Error ? error : new Error('Failed to save checkpoint'),
        },
      };
    }
  }

  /**
   * Load checkpoint to resume performance test
   * Task 4.4: Detect incomplete concurrency levels during resume
   */
  async loadCheckpoint(
    studyId: string
  ): Promise<Result<PerformanceTestCheckpoint, TestError>> {
    try {
      const checkpointPath = `.study-checkpoint/${studyId}.json`;

      // Check if checkpoint file exists
      await access(checkpointPath);

      const content = await readFile(checkpointPath, 'utf-8');
      const checkpoint: PerformanceTestCheckpoint = JSON.parse(content);

      return { success: true, value: checkpoint };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'TARGET_UNREACHABLE',
          cause: error instanceof Error ? error : new Error('Checkpoint not found'),
        },
      };
    }
  }

  /**
   * Identify incomplete concurrency levels based on checkpoint
   * Task 4.4: Skip already-completed concurrency levels on retry
   */
  getIncompleteConcurrencyLevels(
    allLevels: number[],
    completedLevel: number
  ): number[] {
    if (completedLevel === 0) {
      // No checkpoint, all levels are incomplete
      return allLevels;
    }

    // Return levels greater than completed level
    return allLevels.filter((level) => level > completedLevel);
  }

  /**
   * Run performance test with checkpoint/resume support
   * Task 4.4: Aggregate results from multiple executions
   */
  async runPerformanceTestWithResume(
    studyId: string,
    config: PerformanceTestConfig
  ): Promise<Result<PerformanceMetrics, TestError>> {
    // Try to load checkpoint
    const checkpointResult = await this.loadCheckpoint(studyId);

    let partialMetrics: Partial<PerformanceMetrics> = {};
    let incompleteLevels = config.concurrency;

    if (checkpointResult.success) {
      // Resume from checkpoint
      const checkpoint = checkpointResult.value;
      partialMetrics = checkpoint.partialMetrics;
      incompleteLevels = this.getIncompleteConcurrencyLevels(
        config.concurrency,
        checkpoint.completedLevel
      );
    }

    // If all levels are complete, return checkpoint data
    if (incompleteLevels.length === 0) {
      return {
        success: true,
        value: partialMetrics as PerformanceMetrics,
      };
    }

    // Validate config
    if (config.duration < 10) {
      return {
        success: false,
        error: {
          type: 'TARGET_UNREACHABLE',
          cause: new Error('Test duration must be at least 10 seconds'),
        },
      };
    }

    // Verify JMeter installation
    const installationResult = await this.jmeterBridge.verifyInstallation();
    if (!installationResult.success) {
      return installationResult;
    }

    // Execute tests for each incomplete concurrency level
    const newConcurrencyResults: ConcurrencyResult[] = [];

    for (const level of incompleteLevels) {
      // Create config for this specific concurrency level
      const levelConfig: PerformanceTestConfig = {
        ...config,
        concurrency: [level],
      };

      const testPlan = this.jmeterBridge.generateTestPlan(levelConfig);
      const testPlanPath = `/tmp/jmeter-test-plan-${studyId}-${level}-${Date.now()}.jmx`;
      const jtlPath = `/tmp/jmeter-results-${studyId}-${level}-${Date.now()}.jtl`;

      const saveResult = await this.jmeterBridge.saveTestPlan(testPlan, testPlanPath);
      if (!saveResult.success) {
        return saveResult;
      }

      const executionResult = await this.jmeterBridge.executeJMeter(testPlanPath, jtlPath);
      if (!executionResult.success) {
        return executionResult;
      }

      const parseResult = await this.jmeterBridge.parseJTLOutput(jtlPath);
      if (!parseResult.success) {
        return parseResult;
      }

      // Collect results for this level
      newConcurrencyResults.push(...parseResult.value.concurrencyResults);

      // Save checkpoint after each level
      const updatedPartialMetrics: Partial<PerformanceMetrics> = {
        ...partialMetrics,
        concurrencyResults: [
          ...(partialMetrics.concurrencyResults ?? []),
          ...parseResult.value.concurrencyResults,
        ],
      };

      await this.saveCheckpoint(studyId, level, updatedPartialMetrics);
      partialMetrics = updatedPartialMetrics;
    }

    // Aggregate all results (from checkpoint + new execution)
    const allConcurrencyResults = [
      ...(partialMetrics.concurrencyResults ?? []),
    ];

    // Calculate overall metrics from all concurrency results
    const allLatencies = allConcurrencyResults.map((r) => r.avgLatency);
    const responseTime = this.calculateResponseTimeStats(allLatencies);

    // Calculate overall throughput (simple average for now)
    const totalThroughput = allConcurrencyResults.reduce(
      (sum, r) => sum + (r.successRate / 100) * r.concurrency,
      0
    );
    const throughput = totalThroughput / allConcurrencyResults.length;

    // Calculate overall error rate
    const totalErrorRate = allConcurrencyResults.reduce(
      (sum, r) => sum + (100 - r.successRate),
      0
    );
    const errorRate = totalErrorRate / allConcurrencyResults.length;

    return {
      success: true,
      value: {
        responseTime,
        throughput,
        errorRate,
        concurrencyResults: allConcurrencyResults,
      },
    };
  }
}
