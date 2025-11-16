import { expect } from 'vitest';

/**
 * Result type for Railway-oriented programming
 * Used throughout the application for type-safe error handling
 */
export type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Create a successful Result mock for testing
 */
export function createMockResult<T, E>(value: T): Result<T, E> {
  return { success: true, value };
}

/**
 * Create a failed Result mock for testing
 */
export function createMockError<T, E>(error: E): Result<T, E> {
  return { success: false, error };
}

/**
 * Assert that a Result is successful and return the value
 * Useful for testing functions that return Result types
 */
export function expectSuccess<T, E>(result: Result<T, E>): T {
  expect(result.success).toBe(true);
  if (result.success) {
    return result.value;
  }
  throw new Error('Expected success but got error');
}

/**
 * Assert that a Result is an error and return the error
 * Useful for testing error handling
 */
export function expectError<T, E>(result: Result<T, E>): E {
  expect(result.success).toBe(false);
  if (!result.success) {
    return result.error;
  }
  throw new Error('Expected error but got success');
}

/**
 * Create a spy function that tracks calls
 * Useful for testing function invocations
 */
export function createSpy<T extends (...args: unknown[]) => unknown>(
  implementation?: T
): T & { calls: unknown[][]; callCount: number } {
  const calls: unknown[][] = [];

  const spy = ((...args: unknown[]) => {
    calls.push(args);
    return implementation?.(...args);
  }) as T & { calls: unknown[][]; callCount: number };

  Object.defineProperty(spy, 'calls', {
    get: () => calls,
  });

  Object.defineProperty(spy, 'callCount', {
    get: () => calls.length,
  });

  return spy;
}

/**
 * Wait for a promise with timeout
 * Useful for testing async operations with time limits
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
}
