/**
 * Data Aggregator
 *
 * Aggregates analyzer results from multiple sources (completed analyzers, checkpoints)
 * into a unified structure for report generation.
 */

import type { Result } from '@/types/result';
import type { AnalyzerResult, AnalyzerType } from '@/types/domain-entities';
import type { AggregatedStudyResult, ReportGenerationError } from './types';
import { ok, err } from '@/types/result';

export class DataAggregator {
  /**
   * Aggregate analyzer results into unified study result
   *
   * @param results - Array of analyzer results to aggregate
   * @returns Aggregated study result or validation error
   */
  aggregate(results: readonly AnalyzerResult[]): Result<AggregatedStudyResult, ReportGenerationError> {
    // Validate: At least one analyzer result must be present
    if (results.length === 0) {
      return err({
        type: 'VALIDATION_ERROR',
        message: 'Cannot aggregate results: at least one analyzer result is required',
      });
    }

    // Check which analyzer types have data
    const hasPerformanceData = this.hasAnalyzerData(results, 'PERFORMANCE');
    const hasSecurityData = this.hasAnalyzerData(results, 'SECURITY');
    const hasCostData = this.hasAnalyzerData(results, 'COST');
    const hasRiskData = this.hasAnalyzerData(results, 'RISK');

    // Create aggregated result
    const aggregated: AggregatedStudyResult = {
      analyzerResults: results,
      hasPerformanceData,
      hasSecurityData,
      hasCostData,
      hasRiskData,
    };

    return ok(aggregated);
  }

  /**
   * Aggregate results with checkpoint data
   *
   * Merges checkpoint results with new results, removing duplicates
   * (newer results override checkpoint results for same analyzer type)
   *
   * @param checkpointResults - Results from checkpoint
   * @param newResults - New analyzer results
   * @returns Aggregated study result
   */
  aggregateWithCheckpoint(
    checkpointResults: readonly AnalyzerResult[],
    newResults: readonly AnalyzerResult[]
  ): Result<AggregatedStudyResult, ReportGenerationError> {
    // Create a map of analyzer type to result (newer results override)
    const resultMap = new Map<AnalyzerType, AnalyzerResult>();

    // Add checkpoint results first
    for (const result of checkpointResults) {
      resultMap.set(result.analyzerType, result);
    }

    // Add new results (will override checkpoint results of same type)
    for (const result of newResults) {
      resultMap.set(result.analyzerType, result);
    }

    // Convert map back to array
    const mergedResults = Array.from(resultMap.values());

    // Aggregate the merged results
    return this.aggregate(mergedResults);
  }

  /**
   * Get analyzer result by type
   *
   * @param aggregated - Aggregated study result
   * @param type - Analyzer type to retrieve
   * @returns Analyzer result or undefined if not found
   */
  getAnalyzerByType(
    aggregated: AggregatedStudyResult,
    type: AnalyzerType
  ): AnalyzerResult | undefined {
    return aggregated.analyzerResults.find((result) => result.analyzerType === type);
  }

  /**
   * Check if analyzer type has valid data (completed successfully)
   *
   * @param results - Array of analyzer results
   * @param type - Analyzer type to check
   * @returns True if analyzer completed successfully with data
   */
  private hasAnalyzerData(results: readonly AnalyzerResult[], type: AnalyzerType): boolean {
    const result = results.find((r) => r.analyzerType === type);
    return result !== undefined && result.status === 'COMPLETED' && result.data !== null;
  }
}
