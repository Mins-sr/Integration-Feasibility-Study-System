/**
 * Report Entity
 *
 * Manages report generation and validation
 */

import { randomUUID } from 'crypto';
import { Report, ReportFormat, Result, ok, err, ReportError } from '../types';

/**
 * Valid file extensions for each report format
 */
const FORMAT_EXTENSIONS: Record<ReportFormat, string> = {
  OPENAPI: '.json',
  MARKDOWN: '.md',
  JSON: '.json',
};

/**
 * Create a new Report
 */
export function createReport(
  studyId: string,
  format: ReportFormat,
  filePath: string
): Result<Report, ReportError> {
  // Validate format
  const formatValidation = validateFormat(format);
  if (!formatValidation.success) {
    return formatValidation;
  }

  // Validate file path
  const pathValidation = validateFilePath(filePath, format);
  if (!pathValidation.success) {
    return pathValidation;
  }

  const report: Report = {
    id: randomUUID(),
    studyId,
    format,
    filePath,
    generatedAt: new Date(),
  };

  return ok(report);
}

/**
 * Validate report format
 */
export function validateFormat(
  format: string
): Result<ReportFormat, ReportError> {
  const validFormats: ReportFormat[] = ['OPENAPI', 'MARKDOWN', 'JSON'];

  if (!validFormats.includes(format as ReportFormat)) {
    return err({
      type: 'GENERATION_FAILED',
      cause: new Error(`Invalid format: ${format}. Must be one of: ${validFormats.join(', ')}`),
    });
  }

  return ok(format as ReportFormat);
}

/**
 * Validate file path
 * - Checks format matches expected extension
 * - Prevents directory traversal attacks
 */
export function validateFilePath(
  filePath: string,
  format: ReportFormat
): Result<string, ReportError> {
  // Check for directory traversal patterns
  if (filePath.includes('..') || filePath.includes('~')) {
    return err({
      type: 'GENERATION_FAILED',
      cause: new Error('Directory traversal patterns are not allowed in file paths'),
    });
  }

  // Check file extension matches format
  const expectedExtension = FORMAT_EXTENSIONS[format];
  if (!filePath.endsWith(expectedExtension)) {
    return err({
      type: 'GENERATION_FAILED',
      cause: new Error(
        `File path must end with ${expectedExtension} for ${format} format`
      ),
    });
  }

  return ok(filePath);
}

/**
 * Get expected file extension for a format
 */
export function getFileExtension(format: ReportFormat): string {
  return FORMAT_EXTENSIONS[format];
}

/**
 * Validate file path format (basic validation)
 */
export function isValidFilePath(filePath: string): boolean {
  // Basic check: should not be empty and should contain a file name
  if (!filePath || filePath.trim().length === 0) {
    return false;
  }

  // Should not start with /
  if (filePath.startsWith('/')) {
    return false;
  }

  return true;
}

/**
 * Get report metadata
 */
export function getReportMetadata(report: Report): {
  format: ReportFormat;
  generatedAt: Date;
  studyId: string;
} {
  return {
    format: report.format,
    generatedAt: report.generatedAt,
    studyId: report.studyId,
  };
}
