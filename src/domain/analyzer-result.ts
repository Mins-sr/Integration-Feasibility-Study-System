/**
 * AnalyzerResult Entity with Status Tracking
 *
 * Manages the lifecycle and status of individual analyzer executions
 */

import { randomUUID } from 'crypto';
import {
  AnalyzerResult,
  AnalyzerType,
  AnalyzerStatus,
} from '../types';

/**
 * Create a new AnalyzerResult
 */
export function createAnalyzerResult(
  studyId: string,
  analyzerType: AnalyzerType,
  data?: unknown
): AnalyzerResult {
  return {
    id: randomUUID(),
    studyId,
    analyzerType,
    status: 'PENDING',
    startedAt: new Date(),
    completedAt: undefined,
    data: data ?? null,
    errors: [],
  };
}

/**
 * Transition to IN_PROGRESS status
 */
export function startAnalyzer(result: AnalyzerResult): AnalyzerResult {
  return {
    ...result,
    status: 'IN_PROGRESS',
  };
}

/**
 * Transition to COMPLETED status with optional data
 */
export function completeAnalyzer(
  result: AnalyzerResult,
  data?: unknown
): AnalyzerResult {
  return {
    ...result,
    status: 'COMPLETED',
    completedAt: new Date(),
    data: data ?? result.data,
  };
}

/**
 * Transition to FAILED status
 */
export function failAnalyzer(
  result: AnalyzerResult,
  error?: Error
): AnalyzerResult {
  const errors = error ? [...result.errors, error] : result.errors;

  return {
    ...result,
    status: 'FAILED',
    completedAt: new Date(),
    errors,
  };
}

/**
 * Add error to analyzer result
 * Automatically sets status to FAILED
 */
export function addError(
  result: AnalyzerResult,
  error: Error
): AnalyzerResult {
  return {
    ...result,
    status: 'FAILED',
    completedAt: result.completedAt ?? new Date(),
    errors: [...result.errors, error],
  };
}

/**
 * Set analyzer-specific data
 */
export function setData(
  result: AnalyzerResult,
  data: unknown
): AnalyzerResult {
  return {
    ...result,
    data,
  };
}

/**
 * Calculate duration in milliseconds between startedAt and completedAt
 * Returns null if not completed
 */
export function getDuration(result: AnalyzerResult): number | null {
  if (!result.completedAt) {
    return null;
  }

  return result.completedAt.getTime() - result.startedAt.getTime();
}

/**
 * Check if analyzer has errors
 */
export function hasErrors(result: AnalyzerResult): boolean {
  return result.errors.length > 0;
}

/**
 * Check if analyzer is completed (either successfully or failed)
 */
export function isCompleted(result: AnalyzerResult): boolean {
  return result.status === 'COMPLETED' || result.status === 'FAILED';
}
