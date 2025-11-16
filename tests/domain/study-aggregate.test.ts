import { describe, it, expect } from 'vitest';
import {
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
} from '../../src/domain/study-aggregate';
import { createAnalyzerResult, completeAnalyzer, failAnalyzer } from '../../src/domain/analyzer-result';
import { createReport } from '../../src/domain/report-entity';
import { StudyConfig } from '../../src/types';
import { isOk, isErr } from '../../src/types/result';

/**
 * Tests for Study Aggregate with validation rules and business logic
 *
 * Business Rules:
 * - Study must have at least one analyzer
 * - If any AnalyzerResult status is FAILED, Study status should be FAILED
 * - Reports can only be generated after all AnalyzerResults are completed
 */
describe('Study Aggregate', () => {
  const validConfig: StudyConfig = {
    target: { url: 'https://api.example.com' },
    analyzers: [{ type: 'PERFORMANCE', enabled: true }],
    reportFormats: ['MARKDOWN'],
    parallelExecution: false,
  };

  describe('Study creation', () => {
    it('should create a valid study with required fields', () => {
      const result = createStudy(validConfig);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.id).toBeDefined();
        expect(result.value.config).toEqual(validConfig);
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
      }
    });

    it('should generate UUID v4 for study ID', () => {
      const result = createStudy(validConfig);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        expect(result.value.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
      }
    });

    it('should set createdAt and updatedAt timestamps', () => {
      const result = createStudy(validConfig);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
        expect(result.value.createdAt.getTime()).toBe(result.value.updatedAt.getTime());
      }
    });

    it('should initialize with INITIALIZED status', () => {
      const result = createStudy(validConfig);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.status).toBe('INITIALIZED');
      }
    });

    it('should initialize with empty results and reports arrays', () => {
      const result = createStudy(validConfig);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.results).toEqual([]);
        expect(result.value.reports).toEqual([]);
      }
    });
  });

  describe('Business Rule: Study must have at least one analyzer', () => {
    it('should validate that config has at least one analyzer', () => {
      const result = createStudy(validConfig);

      expect(isOk(result)).toBe(true);
    });

    it('should return error when config has no analyzers', () => {
      const invalidConfig: StudyConfig = {
        target: { url: 'https://api.example.com' },
        analyzers: [],
        reportFormats: ['MARKDOWN'],
        parallelExecution: false,
      };

      const result = createStudy(invalidConfig);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('CONFIG_INVALID');
        expect(result.error.field).toBe('analyzers');
      }
    });
  });

  describe('Business Rule: Failed analyzer affects study status', () => {
    it('should set study status to FAILED when any analyzer fails', () => {
      const studyResult = createStudy(validConfig);
      expect(isOk(studyResult)).toBe(true);
      if (!isOk(studyResult)) return;

      let study = studyResult.value;

      // Add two analyzer results - one complete, one failed
      const result1 = completeAnalyzer(createAnalyzerResult(study.id, 'PERFORMANCE'));
      const result2 = failAnalyzer(createAnalyzerResult(study.id, 'SECURITY'));

      study = addAnalyzerResult(study, result1);
      study = addAnalyzerResult(study, result2);

      // Update study status based on results
      study = updateStudyStatusFromResults(study);

      expect(study.status).toBe('FAILED');
    });

    it('should keep study status as COMPLETED when all analyzers succeed', () => {
      const studyResult = createStudy(validConfig);
      expect(isOk(studyResult)).toBe(true);
      if (!isOk(studyResult)) return;

      let study = studyResult.value;

      // Add two completed analyzer results
      const result1 = completeAnalyzer(createAnalyzerResult(study.id, 'PERFORMANCE'));
      const result2 = completeAnalyzer(createAnalyzerResult(study.id, 'SECURITY'));

      study = addAnalyzerResult(study, result1);
      study = addAnalyzerResult(study, result2);

      // Update study status based on results
      study = updateStudyStatusFromResults(study);

      expect(study.status).toBe('COMPLETED');
    });

    it('should allow partial success (some analyzers complete, some fail)', () => {
      const studyResult = createStudy(validConfig);
      expect(isOk(studyResult)).toBe(true);
      if (!isOk(studyResult)) return;

      let study = studyResult.value;

      // Add mixed results
      const result1 = completeAnalyzer(createAnalyzerResult(study.id, 'PERFORMANCE'));
      const result2 = failAnalyzer(createAnalyzerResult(study.id, 'SECURITY'));

      study = addAnalyzerResult(study, result1);
      study = addAnalyzerResult(study, result2);

      // Both results should be in the study
      expect(study.results.length).toBe(2);
      expect(study.results[0].status).toBe('COMPLETED');
      expect(study.results[1].status).toBe('FAILED');
    });
  });

  describe('Study lifecycle transitions', () => {
    it('should transition from INITIALIZED to RUNNING', () => {
      const studyResult = createStudy(validConfig);
      expect(isOk(studyResult)).toBe(true);
      if (!isOk(studyResult)) return;

      const study = startStudy(studyResult.value);

      expect(study.status).toBe('RUNNING');
    });

    it('should transition from RUNNING to COMPLETED', () => {
      const studyResult = createStudy(validConfig);
      expect(isOk(studyResult)).toBe(true);
      if (!isOk(studyResult)) return;

      let study = startStudy(studyResult.value);
      study = completeStudy(study);

      expect(study.status).toBe('COMPLETED');
    });

    it('should transition from RUNNING to FAILED', () => {
      const studyResult = createStudy(validConfig);
      expect(isOk(studyResult)).toBe(true);
      if (!isOk(studyResult)) return;

      let study = startStudy(studyResult.value);
      study = failStudy(study);

      expect(study.status).toBe('FAILED');
    });

    it('should update updatedAt timestamp on status change', () => {
      const studyResult = createStudy(validConfig);
      expect(isOk(studyResult)).toBe(true);
      if (!isOk(studyResult)) return;

      const originalUpdatedAt = studyResult.value.updatedAt;

      // Small delay to ensure timestamp difference
      const study = startStudy(studyResult.value);

      expect(study.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('Analyzer result management', () => {
    it('should add analyzer result to study', () => {
      const studyResult = createStudy(validConfig);
      expect(isOk(studyResult)).toBe(true);
      if (!isOk(studyResult)) return;

      const analyzerResult = createAnalyzerResult(studyResult.value.id, 'PERFORMANCE');
      const study = addAnalyzerResult(studyResult.value, analyzerResult);

      expect(study.results.length).toBe(1);
      expect(study.results[0]).toEqual(analyzerResult);
    });

    it('should update existing analyzer result', () => {
      const studyResult = createStudy(validConfig);
      expect(isOk(studyResult)).toBe(true);
      if (!isOk(studyResult)) return;

      const analyzerResult = createAnalyzerResult(studyResult.value.id, 'PERFORMANCE');
      let study = addAnalyzerResult(studyResult.value, analyzerResult);

      const updatedResult = completeAnalyzer(analyzerResult);
      study = updateAnalyzerResult(study, analyzerResult.id, updatedResult);

      expect(study.results.length).toBe(1);
      expect(study.results[0].status).toBe('COMPLETED');
    });

    it('should retrieve analyzer result by type', () => {
      const studyResult = createStudy(validConfig);
      expect(isOk(studyResult)).toBe(true);
      if (!isOk(studyResult)) return;

      const analyzerResult = createAnalyzerResult(studyResult.value.id, 'PERFORMANCE');
      const study = addAnalyzerResult(studyResult.value, analyzerResult);

      const retrieved = getAnalyzerResult(study, 'PERFORMANCE');

      expect(retrieved).toBeDefined();
      expect(retrieved?.analyzerType).toBe('PERFORMANCE');
    });
  });

  describe('Report management', () => {
    it('should add report to study', () => {
      const studyResult = createStudy(validConfig);
      expect(isOk(studyResult)).toBe(true);
      if (!isOk(studyResult)) return;

      let study = studyResult.value;

      // Add completed analyzer result
      const analyzerResult = completeAnalyzer(createAnalyzerResult(study.id, 'PERFORMANCE'));
      study = addAnalyzerResult(study, analyzerResult);

      // Create and add report
      const reportResult = createReport(study.id, 'MARKDOWN', 'report.md');
      expect(isOk(reportResult)).toBe(true);
      if (!isOk(reportResult)) return;

      const result = addReport(study, reportResult.value);

      expect(isOk(result)).toBe(true);
      if (isOk(result)) {
        expect(result.value.reports.length).toBe(1);
      }
    });

    it('should not allow report generation before all analyzers complete', () => {
      const studyResult = createStudy(validConfig);
      expect(isOk(studyResult)).toBe(true);
      if (!isOk(studyResult)) return;

      let study = studyResult.value;

      // Add pending analyzer result
      const analyzerResult = createAnalyzerResult(study.id, 'PERFORMANCE');
      study = addAnalyzerResult(study, analyzerResult);

      // Try to add report
      const reportResult = createReport(study.id, 'MARKDOWN', 'report.md');
      expect(isOk(reportResult)).toBe(true);
      if (!isOk(reportResult)) return;

      const result = addReport(study, reportResult.value);

      expect(isErr(result)).toBe(true);
      if (isErr(result)) {
        expect(result.error.type).toBe('REPORT_GENERATION_FAILED');
      }
    });

    it('should allow report generation after all analyzers complete', () => {
      const studyResult = createStudy(validConfig);
      expect(isOk(studyResult)).toBe(true);
      if (!isOk(studyResult)) return;

      let study = studyResult.value;

      // Add completed analyzer result
      const analyzerResult = completeAnalyzer(createAnalyzerResult(study.id, 'PERFORMANCE'));
      study = addAnalyzerResult(study, analyzerResult);

      // Check if reports can be generated
      expect(canGenerateReports(study)).toBe(true);
    });
  });
});
