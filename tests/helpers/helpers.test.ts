import { describe, it, expect } from 'vitest';
import {
  createMockResult,
  createMockError,
  expectSuccess,
  expectError,
  createSpy,
  withTimeout,
} from './index';

describe('Test Helpers', () => {
  describe('Result helpers', () => {
    it('should create successful result', () => {
      const result = createMockResult('test-value');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('test-value');
      }
    });

    it('should create error result', () => {
      const result = createMockError('test-error');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('test-error');
      }
    });

    it('should extract value from successful result', () => {
      const result = createMockResult(42);
      const value = expectSuccess(result);
      expect(value).toBe(42);
    });

    it('should extract error from failed result', () => {
      const result = createMockError('test-error');
      const error = expectError(result);
      expect(error).toBe('test-error');
    });

    it('should throw when expecting success on error', () => {
      const result = createMockError('test-error');
      expect(() => expectSuccess(result)).toThrow();
    });

    it('should throw when expecting error on success', () => {
      const result = createMockResult('test-value');
      expect(() => expectError(result)).toThrow();
    });
  });

  describe('createSpy', () => {
    it('should track function calls', () => {
      const spy = createSpy((x: number) => x * 2);

      spy(1);
      spy(2);
      spy(3);

      expect(spy.callCount).toBe(3);
      expect(spy.calls).toEqual([[1], [2], [3]]);
    });

    it('should work without implementation', () => {
      const spy = createSpy();
      spy('test');
      expect(spy.callCount).toBe(1);
    });
  });

  describe('withTimeout', () => {
    it('should resolve when promise completes in time', async () => {
      const promise = Promise.resolve('success');
      const result = await withTimeout(promise, 1000);
      expect(result).toBe('success');
    });

    it('should reject when timeout exceeded', async () => {
      const promise = new Promise((resolve) => setTimeout(resolve, 2000));
      await expect(withTimeout(promise, 100)).rejects.toThrow('Operation timed out');
    });

    it('should use custom error message', async () => {
      const promise = new Promise((resolve) => setTimeout(resolve, 2000));
      await expect(withTimeout(promise, 100, 'Custom timeout')).rejects.toThrow(
        'Custom timeout'
      );
    });
  });
});
