/**
 * Performance Analysis Types
 *
 * Type definitions for performance testing and metrics calculation.
 */

import type { TargetConfig } from '@/types/config-types';

/**
 * Performance Test Configuration
 */
export interface PerformanceTestConfig {
  readonly target: TargetConfig;
  readonly concurrency: number[]; // e.g., [1, 10, 50, 100]
  readonly duration: number; // seconds
  readonly rampUp: number; // seconds
}

/**
 * Response Time Statistics
 */
export interface ResponseTimeStats {
  readonly mean: number; // milliseconds
  readonly min: number;
  readonly max: number;
  readonly p50: number; // 50th percentile (median)
  readonly p95: number; // 95th percentile
  readonly p99: number; // 99th percentile
}

/**
 * Concurrency Test Result
 */
export interface ConcurrencyResult {
  readonly concurrency: number;
  readonly successRate: number; // percentage
  readonly avgLatency: number; // milliseconds
}

/**
 * Performance Metrics Result
 */
export interface PerformanceMetrics {
  readonly responseTime: ResponseTimeStats;
  readonly throughput: number; // requests per second
  readonly errorRate: number; // percentage
  readonly concurrencyResults: ConcurrencyResult[];
}

/**
 * JMeter Installation Verification Result
 */
export interface JMeterInstallationInfo {
  readonly installed: boolean;
  readonly version?: string;
}

/**
 * Checkpoint Data for Performance Test Recovery
 */
export interface PerformanceTestCheckpoint {
  readonly studyId: string;
  readonly completedLevel: number;
  readonly timestamp: number;
  readonly partialMetrics: Partial<PerformanceMetrics>;
}
