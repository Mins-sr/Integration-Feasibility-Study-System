/**
 * Error Discriminated Unions for Type-Safe Error Handling
 *
 * These error types are used with the Result type for explicit error handling.
 */

/**
 * Study-Level Errors
 */
export type StudyError =
  | { type: 'CONFIG_INVALID'; message: string; field: string }
  | { type: 'CONFIG_NOT_FOUND'; message: string }
  | { type: 'ANALYZER_FAILED'; analyzer: string; cause: Error }
  | { type: 'REPORT_GENERATION_FAILED'; cause: Error }
  | { type: 'CHECKPOINT_NOT_FOUND'; message: string }
  | { type: 'CHECKPOINT_INVALID'; message: string };

/**
 * HTTP Client Errors
 */
export type HttpError =
  | { type: 'RATE_LIMIT_EXCEEDED'; retryAfter: number }
  | { type: 'AUTH_FAILED'; reason: string }
  | { type: 'TIMEOUT'; duration: number }
  | { type: 'NETWORK_ERROR'; cause: Error }
  | { type: 'VALIDATION_ERROR'; message: string };

/**
 * Performance Test Errors
 */
export type TestError =
  | { type: 'JMETER_NOT_FOUND'; message: string }
  | { type: 'TEST_TIMEOUT'; duration: number }
  | { type: 'TARGET_UNREACHABLE'; cause: Error };

/**
 * Security Scan Errors
 */
export type ScanError =
  | { type: 'ZAP_NOT_RUNNING'; message: string }
  | { type: 'SCAN_TIMEOUT'; duration: number }
  | { type: 'TARGET_UNREACHABLE'; cause: Error };

/**
 * Analysis Errors (Cost and Risk)
 */
export type AnalysisError =
  | { type: 'PRICING_DATA_NOT_FOUND'; service: string }
  | { type: 'INVALID_TRAFFIC_ESTIMATE'; message: string };

/**
 * Report Generation Errors
 */
export type ReportError =
  | { type: 'TEMPLATE_NOT_FOUND'; templateName: string }
  | { type: 'GENERATION_FAILED'; cause: Error };
