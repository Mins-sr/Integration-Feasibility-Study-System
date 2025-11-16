/**
 * Core Domain Entities for Integration Feasibility Study
 *
 * These types represent the main domain concepts in the study system.
 */

// Study Status Enumeration
export type StudyStatus = 'INITIALIZED' | 'RUNNING' | 'COMPLETED' | 'FAILED';

// Analyzer Type Enumeration
export type AnalyzerType = 'PERFORMANCE' | 'SECURITY' | 'COST' | 'RISK';

// Analyzer Status Enumeration
export type AnalyzerStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

// Report Format Enumeration
export type ReportFormat = 'OPENAPI' | 'MARKDOWN' | 'JSON';

/**
 * Study Entity (Aggregate Root)
 *
 * Represents a complete integration feasibility study session
 */
export interface Study {
  readonly id: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly status: StudyStatus;
  readonly config: unknown; // Will be replaced with StudyConfig type
  readonly results: AnalyzerResult[];
  readonly reports: Report[];
}

/**
 * AnalyzerResult Entity
 *
 * Represents the result of a single analyzer execution
 */
export interface AnalyzerResult {
  readonly id: string;
  readonly studyId: string;
  readonly analyzerType: AnalyzerType;
  readonly status: AnalyzerStatus;
  readonly startedAt: Date;
  readonly completedAt?: Date;
  readonly data: unknown; // Type depends on analyzer (PerformanceMetrics | VulnerabilityReport | ...)
  readonly errors: Error[];
}

/**
 * Report Entity
 *
 * Represents a generated report file
 */
export interface Report {
  readonly id: string;
  readonly studyId: string;
  readonly format: ReportFormat;
  readonly filePath: string;
  readonly generatedAt: Date;
}
