import { describe, it, expect } from 'vitest';
import {
  createReport,
  validateFormat,
  validateFilePath,
  getFileExtension,
  isValidFilePath,
  getReportMetadata,
} from '../../src/domain/report-entity';
import { isOk, isErr } from '../../src/types/result';

/**
 * Tests for Report Entity
 */
describe('Report Entity', () => {
  const studyId = 'study-123';

  describe('Report creation', () => {
    it('should create report with required fields', () => {
      const result = createReport(studyId, 'MARKDOWN', 'report.md');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.id).toBeDefined();
        expect(result.value.studyId).toBe(studyId);
        expect(result.value.format).toBe('MARKDOWN');
        expect(result.value.filePath).toBe('report.md');
        expect(result.value.generatedAt).toBeInstanceOf(Date);
      }
    });

    it('should generate UUID v4 for report ID', () => {
      const result = createReport(studyId, 'MARKDOWN', 'report.md');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
      }
    });

    it('should set generatedAt timestamp on creation', () => {
      const result = createReport(studyId, 'OPENAPI', 'spec.json');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.generatedAt).toBeInstanceOf(Date);
      }
    });

    it('should associate report with study ID', () => {
      const result = createReport(studyId, 'JSON', 'data.json');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.studyId).toBe(studyId);
      }
    });
  });

  describe('Report format validation', () => {
    it('should accept OPENAPI format', () => {
      const result = validateFormat('OPENAPI');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('OPENAPI');
      }
    });

    it('should accept MARKDOWN format', () => {
      const result = validateFormat('MARKDOWN');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('MARKDOWN');
      }
    });

    it('should accept JSON format', () => {
      const result = validateFormat('JSON');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value).toBe('JSON');
      }
    });

    it('should reject invalid format', () => {
      const result = validateFormat('INVALID');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('GENERATION_FAILED');
      }
    });
  });

  describe('File path validation', () => {
    it('should validate file path format', () => {
      const result = validateFilePath('reports/study.md', 'MARKDOWN');

      expect(isOk(result)).toBe(true);
    });

    it('should ensure file extension matches format', () => {
      const result = validateFilePath('report.txt', 'MARKDOWN');

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('GENERATION_FAILED');
      }
    });

    it('should prevent directory traversal attacks', () => {
      const result1 = validateFilePath('../etc/passwd.md', 'MARKDOWN');
      const result2 = validateFilePath('~/secrets.md', 'MARKDOWN');

      expect(isErr(result1)).toBe(true);
      expect(isErr(result2)).toBe(true);
    });

    it('should get correct file extension for each format', () => {
      expect(getFileExtension('MARKDOWN')).toBe('.md');
      expect(getFileExtension('OPENAPI')).toBe('.json');
      expect(getFileExtension('JSON')).toBe('.json');
    });

    it('should validate basic file path requirements', () => {
      expect(isValidFilePath('report.md')).toBe(true);
      expect(isValidFilePath('reports/study.md')).toBe(true);
      expect(isValidFilePath('')).toBe(false);
      expect(isValidFilePath('   ')).toBe(false);
      expect(isValidFilePath('/absolute/path.md')).toBe(false);
    });
  });

  describe('Report metadata', () => {
    it('should include report format in metadata', () => {
      const result = createReport(studyId, 'MARKDOWN', 'report.md');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const metadata = getReportMetadata(result.value);
        expect(metadata.format).toBe('MARKDOWN');
      }
    });

    it('should include generation timestamp in metadata', () => {
      const result = createReport(studyId, 'OPENAPI', 'spec.json');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const metadata = getReportMetadata(result.value);
        expect(metadata.generatedAt).toBeInstanceOf(Date);
      }
    });

    it('should include study ID in metadata', () => {
      const result = createReport(studyId, 'JSON', 'data.json');

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        const metadata = getReportMetadata(result.value);
        expect(metadata.studyId).toBe(studyId);
      }
    });
  });
});
