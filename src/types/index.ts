/**
 * Type Definitions Index
 *
 * Central export point for all type definitions
 */

// Result Type and Helpers
export type { Result } from './result';
export { ok, err, isOk, isErr } from './result';

// Domain Entities
export type {
  Study,
  AnalyzerResult,
  Report,
  StudyStatus,
  AnalyzerType,
  AnalyzerStatus,
  ReportFormat,
} from './domain-entities';

// Configuration Types
export type {
  StudyConfig,
  TargetConfig,
  AnalyzerConfig,
  AuthConfig,
  OAuth2Config,
  ApiKeyConfig,
  JwtConfig,
  PerformanceAnalyzerConfig,
  SecurityAnalyzerConfig,
  CostAnalyzerConfig,
  RiskAnalyzerConfig,
  HttpMethod,
  AuthType,
} from './config-types';

// Error Types
export type {
  StudyError,
  HttpError,
  TestError,
  ScanError,
  AnalysisError,
  ReportError,
} from './error-types';
