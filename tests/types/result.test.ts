import { describe, it, expect } from 'vitest';
import { Result, ok, err, isOk, isErr } from '../../src/types/result';

/**
 * Tests for Result<T, E> type (Railway Pattern)
 *
 * Result type is used for type-safe error handling throughout the application.
 * It represents either a success value or an error, avoiding exceptions.
 */
describe('Result<T, E> type', () => {
  describe('Result type structure', () => {
    it('should have success result with value', () => {
      const result: Result<number, string> = { success: true, value: 42 };

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(42);
      }
    });

    it('should have error result with error', () => {
      const result: Result<number, string> = { success: false, error: 'Something went wrong' };

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Something went wrong');
      }
    });
  });

  describe('Type safety', () => {
    it('should discriminate between success and error types', () => {
      const successResult: Result<string, string> = { success: true, value: 'data' };
      const errorResult: Result<string, string> = { success: false, error: 'error' };

      if (successResult.success) {
        expect(successResult.value).toBe('data');
      } else {
        // Should not reach here
        expect(true).toBe(false);
      }

      if (!errorResult.success) {
        expect(errorResult.error).toBe('error');
      } else {
        // Should not reach here
        expect(true).toBe(false);
      }
    });
  });

  describe('Helper functions', () => {
    it('should create success result with ok() helper', () => {
      const result = ok<number, string>(42);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe(42);
      }
    });

    it('should create error result with err() helper', () => {
      const result = err<number, string>('Failed');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Failed');
      }
    });

    it('should check if result is success with isOk() helper', () => {
      const successResult = ok<number, string>(100);
      const errorResult = err<number, string>('Error');

      expect(isOk(successResult)).toBe(true);
      expect(isOk(errorResult)).toBe(false);
    });

    it('should check if result is error with isErr() helper', () => {
      const successResult = ok<number, string>(100);
      const errorResult = err<number, string>('Error');

      expect(isErr(successResult)).toBe(false);
      expect(isErr(errorResult)).toBe(true);
    });
  });
});
