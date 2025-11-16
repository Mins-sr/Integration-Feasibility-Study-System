/**
 * Domain Layer Index
 *
 * Central export point for all domain logic
 */

// Study Aggregate
export {
  createStudy,
  startStudy,
  completeStudy,
  failStudy,
  addAnalyzerResult,
  updateAnalyzerResult,
  getAnalyzerResult,
  addReport,
  updateStudyStatusFromResults,
  canGenerateReports,
} from './study-aggregate';

// AnalyzerResult Entity
export {
  createAnalyzerResult,
  startAnalyzer,
  completeAnalyzer,
  failAnalyzer,
  addError,
  setData,
  getDuration,
  hasErrors,
  isCompleted,
} from './analyzer-result';

// Report Entity
export {
  createReport,
  validateFormat,
  validateFilePath,
  getFileExtension,
  isValidFilePath,
  getReportMetadata,
} from './report-entity';
