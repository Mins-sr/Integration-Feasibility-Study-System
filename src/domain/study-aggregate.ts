/**
 * Study Aggregate Root
 *
 * Manages the lifecycle of an integration feasibility study with validation rules
 */

import { randomUUID } from 'crypto';
import {
  Study,
  AnalyzerResult,
  Report,
  StudyConfig,
  StudyStatus,
  AnalyzerType,
  Result,
  ok,
  err,
  StudyError,
} from '../types';

/**
 * Create a new Study with validation
 */
export function createStudy(config: StudyConfig): Result<Study, StudyError> {
  // Business Rule: Study must have at least one analyzer
  if (!config.analyzers || config.analyzers.length === 0) {
    return err({
      type: 'CONFIG_INVALID',
      message: 'Study must have at least one analyzer',
      field: 'analyzers',
    });
  }

  const now = new Date();
  const study: Study = {
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: 'INITIALIZED',
    config,
    results: [],
    reports: [],
  };

  return ok(study);
}

/**
 * Transition study to RUNNING status
 */
export function startStudy(study: Study): Study {
  return {
    ...study,
    status: 'RUNNING',
    updatedAt: new Date(),
  };
}

/**
 * Transition study to COMPLETED status
 */
export function completeStudy(study: Study): Study {
  return {
    ...study,
    status: 'COMPLETED',
    updatedAt: new Date(),
  };
}

/**
 * Transition study to FAILED status
 */
export function failStudy(study: Study): Study {
  return {
    ...study,
    status: 'FAILED',
    updatedAt: new Date(),
  };
}

/**
 * Add analyzer result to study
 */
export function addAnalyzerResult(
  study: Study,
  result: AnalyzerResult
): Study {
  return {
    ...study,
    results: [...study.results, result],
    updatedAt: new Date(),
  };
}

/**
 * Update existing analyzer result
 */
export function updateAnalyzerResult(
  study: Study,
  resultId: string,
  updatedResult: AnalyzerResult
): Study {
  return {
    ...study,
    results: study.results.map((r) =>
      r.id === resultId ? updatedResult : r
    ),
    updatedAt: new Date(),
  };
}

/**
 * Get analyzer result by type
 */
export function getAnalyzerResult(
  study: Study,
  analyzerType: AnalyzerType
): AnalyzerResult | undefined {
  return study.results.find((r) => r.analyzerType === analyzerType);
}

/**
 * Add report to study
 * Business Rule: Reports can only be generated after all analyzers complete
 */
export function addReport(
  study: Study,
  report: Report
): Result<Study, StudyError> {
  // Check if all analyzers are completed or failed
  const allComplete = study.results.every(
    (r) => r.status === 'COMPLETED' || r.status === 'FAILED'
  );

  if (!allComplete) {
    return err({
      type: 'REPORT_GENERATION_FAILED',
      cause: new Error('Cannot generate report before all analyzers complete'),
    });
  }

  return ok({
    ...study,
    reports: [...study.reports, report],
    updatedAt: new Date(),
  });
}

/**
 * Update study status based on analyzer results
 * Business Rule: If any AnalyzerResult status is FAILED, Study status should be FAILED
 */
export function updateStudyStatusFromResults(study: Study): Study {
  if (study.results.length === 0) {
    return study;
  }

  const hasFailedAnalyzer = study.results.some((r) => r.status === 'FAILED');
  const allComplete = study.results.every(
    (r) => r.status === 'COMPLETED' || r.status === 'FAILED'
  );

  if (hasFailedAnalyzer && allComplete) {
    return failStudy(study);
  } else if (allComplete && !hasFailedAnalyzer) {
    return completeStudy(study);
  }

  return study;
}

/**
 * Check if study can generate reports
 */
export function canGenerateReports(study: Study): boolean {
  if (study.results.length === 0) {
    return false;
  }

  return study.results.every(
    (r) => r.status === 'COMPLETED' || r.status === 'FAILED'
  );
}
