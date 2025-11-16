/**
 * Utilities Index
 *
 * Central export point for all utility modules
 */

// Error formatting utilities (Task 12.1)
export {
  formatTestError,
  formatScanError,
  formatStudyError,
  formatHttpError,
  formatAnalysisError,
  formatReportError,
  formatFileSystemError,
  formatError,
} from './error-formatter';

// Input validation utilities (Task 12.2)
export {
  validateUrl,
  sanitizeFilePath,
  validateConcurrency,
  validateDuration,
  escapeShellArg,
  validateTrafficEstimate,
  validateAnalyzerName,
  sanitizeEnvVarValue,
} from './input-validator';

export type {
  ValidationResult,
  SanitizationResult,
} from './input-validator';

// Security hardening utilities (Task 12.3)
export {
  maskCredentials,
  createSecureSpawnOptions,
  validateJMeterArgs,
  validateZAPArgs,
  detectPersonalInfo,
  maskSensitiveData,
  createPersonalInfoWarning,
  sanitizeReportContent,
} from './security-hardening';

export type {
  PersonalInfoDetection,
  MaskingOptions,
} from './security-hardening';
