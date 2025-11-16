/**
 * Result Type - Railway Pattern for Type-Safe Error Handling
 *
 * Represents either a successful result with a value or an error.
 * This pattern avoids throwing exceptions and makes error handling explicit.
 */

export type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };

/**
 * Creates a successful Result
 */
export function ok<T, E = never>(value: T): Result<T, E> {
  return { success: true, value };
}

/**
 * Creates an error Result
 */
export function err<T = never, E = unknown>(error: E): Result<T, E> {
  return { success: false, error };
}

/**
 * Type guard to check if Result is success
 */
export function isOk<T, E>(result: Result<T, E>): result is { success: true; value: T } {
  return result.success === true;
}

/**
 * Type guard to check if Result is error
 */
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false;
}
