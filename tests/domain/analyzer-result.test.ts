import { describe, it, expect } from 'vitest';
import {
  createAnalyzerResult,
  startAnalyzer,
  completeAnalyzer,
  failAnalyzer,
  addError,
  setData,
  getDuration,
  hasErrors,
  isCompleted,
} from '../../src/domain/analyzer-result';

/**
 * Tests for AnalyzerResult with status tracking
 */
describe('AnalyzerResult Entity', () => {
  const studyId = 'study-123';

  describe('AnalyzerResult creation', () => {
    it('should create analyzer result with required fields', () => {
      const result = createAnalyzerResult(studyId, 'PERFORMANCE');

      expect(result.id).toBeDefined();
      expect(result.studyId).toBe(studyId);
      expect(result.analyzerType).toBe('PERFORMANCE');
      expect(result.status).toBe('PENDING');
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(result.completedAt).toBeUndefined();
      expect(result.errors).toEqual([]);
    });

    it('should generate UUID v4 for result ID', () => {
      const result = createAnalyzerResult(studyId, 'PERFORMANCE');

      // UUID v4 format
      expect(result.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should initialize with PENDING status', () => {
      const result = createAnalyzerResult(studyId, 'SECURITY');

      expect(result.status).toBe('PENDING');
    });

    it('should set startedAt timestamp on creation', () => {
      const result = createAnalyzerResult(studyId, 'COST');

      expect(result.startedAt).toBeInstanceOf(Date);
    });

    it('should not set completedAt on creation', () => {
      const result = createAnalyzerResult(studyId, 'RISK');

      expect(result.completedAt).toBeUndefined();
    });

    it('should initialize with empty errors array', () => {
      const result = createAnalyzerResult(studyId, 'PERFORMANCE');

      expect(result.errors).toEqual([]);
    });
  });

  describe('Status transitions', () => {
    it('should transition from PENDING to IN_PROGRESS', () => {
      const result = createAnalyzerResult(studyId, 'PERFORMANCE');
      const updated = startAnalyzer(result);

      expect(updated.status).toBe('IN_PROGRESS');
    });

    it('should transition from IN_PROGRESS to COMPLETED', () => {
      let result = createAnalyzerResult(studyId, 'PERFORMANCE');
      result = startAnalyzer(result);
      result = completeAnalyzer(result);

      expect(result.status).toBe('COMPLETED');
    });

    it('should transition from IN_PROGRESS to FAILED', () => {
      let result = createAnalyzerResult(studyId, 'PERFORMANCE');
      result = startAnalyzer(result);
      result = failAnalyzer(result);

      expect(result.status).toBe('FAILED');
    });

    it('should set completedAt timestamp when transitioning to COMPLETED', () => {
      let result = createAnalyzerResult(studyId, 'PERFORMANCE');
      result = completeAnalyzer(result);

      expect(result.completedAt).toBeInstanceOf(Date);
    });

    it('should set completedAt timestamp when transitioning to FAILED', () => {
      let result = createAnalyzerResult(studyId, 'PERFORMANCE');
      result = failAnalyzer(result);

      expect(result.completedAt).toBeInstanceOf(Date);
    });
  });

  describe('Error tracking', () => {
    it('should add error to errors array', () => {
      const result = createAnalyzerResult(studyId, 'PERFORMANCE');
      const error = new Error('Test error');
      const updated = addError(result, error);

      expect(updated.errors.length).toBe(1);
      expect(updated.errors[0]).toBe(error);
    });

    it('should maintain multiple errors', () => {
      let result = createAnalyzerResult(studyId, 'PERFORMANCE');
      const error1 = new Error('Error 1');
      const error2 = new Error('Error 2');

      result = addError(result, error1);
      result = addError(result, error2);

      expect(result.errors.length).toBe(2);
      expect(result.errors[0]).toBe(error1);
      expect(result.errors[1]).toBe(error2);
    });

    it('should automatically set status to FAILED when error is added', () => {
      const result = createAnalyzerResult(studyId, 'PERFORMANCE');
      const error = new Error('Test error');
      const updated = addError(result, error);

      expect(updated.status).toBe('FAILED');
    });
  });

  describe('Data management', () => {
    it('should allow setting analyzer-specific data', () => {
      const result = createAnalyzerResult(studyId, 'PERFORMANCE');
      const data = { metrics: { latency: 100 } };
      const updated = setData(result, data);

      expect(updated.data).toEqual(data);
    });

    it('should preserve data type safety', () => {
      const result = createAnalyzerResult(studyId, 'PERFORMANCE');
      const data = { foo: 'bar', num: 42 };
      const updated = setData(result, data);

      expect(updated.data).toEqual(data);
    });
  });

  describe('Duration calculation', () => {
    it('should calculate duration between startedAt and completedAt', () => {
      const result = createAnalyzerResult(studyId, 'PERFORMANCE');
      // Simulate some time passing
      const completed = completeAnalyzer(result);
      const duration = getDuration(completed);

      expect(duration).toBeGreaterThanOrEqual(0);
      expect(typeof duration).toBe('number');
    });

    it('should return null duration if not completed', () => {
      const result = createAnalyzerResult(studyId, 'PERFORMANCE');
      const duration = getDuration(result);

      expect(duration).toBeNull();
    });
  });

  describe('Helper functions', () => {
    it('should check if analyzer has errors', () => {
      let result = createAnalyzerResult(studyId, 'PERFORMANCE');

      expect(hasErrors(result)).toBe(false);

      result = addError(result, new Error('Test error'));
      expect(hasErrors(result)).toBe(true);
    });

    it('should check if analyzer is completed', () => {
      let result = createAnalyzerResult(studyId, 'PERFORMANCE');

      expect(isCompleted(result)).toBe(false);

      result = completeAnalyzer(result);
      expect(isCompleted(result)).toBe(true);
    });
  });
});
