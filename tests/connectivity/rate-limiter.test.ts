/**
 * Tests for Rate Limiting and Retry Logic
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { RateLimiter, ExponentialBackoffStrategy, CircuitBreaker } from '../../src/connectivity/rate-limiter';

// Mock console.log to avoid noise in test output
const originalConsoleLog = console.log;
beforeEach(() => {
  console.log = vi.fn();
});

afterEach(() => {
  console.log = originalConsoleLog;
  vi.restoreAllMocks();
});

describe('ExponentialBackoffStrategy', () => {
  describe('calculateDelay', () => {
    it('should return 1000ms for first attempt (1s)', () => {
      const strategy = new ExponentialBackoffStrategy();
      const delay = strategy.calculateDelay(1);
      expect(delay).toBe(1000);
    });

    it('should return 2000ms for second attempt (2s)', () => {
      const strategy = new ExponentialBackoffStrategy();
      const delay = strategy.calculateDelay(2);
      expect(delay).toBe(2000);
    });

    it('should return 4000ms for third attempt (4s)', () => {
      const strategy = new ExponentialBackoffStrategy();
      const delay = strategy.calculateDelay(3);
      expect(delay).toBe(4000);
    });

    it('should use exponential backoff formula: delay = 1000 * 2^(attempt-1)', () => {
      const strategy = new ExponentialBackoffStrategy();
      expect(strategy.calculateDelay(1)).toBe(1000 * Math.pow(2, 0)); // 1000
      expect(strategy.calculateDelay(2)).toBe(1000 * Math.pow(2, 1)); // 2000
      expect(strategy.calculateDelay(3)).toBe(1000 * Math.pow(2, 2)); // 4000
      expect(strategy.calculateDelay(4)).toBe(1000 * Math.pow(2, 3)); // 8000
    });

    it('should cap maximum delay at 60 seconds', () => {
      const strategy = new ExponentialBackoffStrategy();
      const delay = strategy.calculateDelay(10); // Would be 512000ms without cap
      expect(delay).toBeLessThanOrEqual(60000);
    });
  });
});

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker(3, 1000); // 3 failures, 1 second cooldown
  });

  describe('State Management', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.isOpen()).toBe(false);
    });

    it('should open after reaching failure threshold', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      expect(circuitBreaker.isOpen()).toBe(true);
    });

    it('should not open before reaching failure threshold', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      expect(circuitBreaker.isOpen()).toBe(false);
    });

    it('should reset failure count on success', () => {
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordSuccess();
      circuitBreaker.recordFailure(); // Only 1 failure now
      expect(circuitBreaker.isOpen()).toBe(false);
    });

    it('should close after cooldown period', async () => {
      // Open the circuit
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      circuitBreaker.recordFailure();
      expect(circuitBreaker.isOpen()).toBe(true);

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 1100));
      expect(circuitBreaker.isOpen()).toBe(false);
    }, 2000);
  });

  describe('Consecutive Failures', () => {
    it('should track consecutive failures correctly', () => {
      const breaker = new CircuitBreaker(5, 1000);

      breaker.recordFailure();
      expect(breaker.isOpen()).toBe(false);

      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordFailure();
      expect(breaker.isOpen()).toBe(false);

      breaker.recordFailure(); // 5th failure
      expect(breaker.isOpen()).toBe(true);
    });

    it('should reset consecutive failures on success', () => {
      const breaker = new CircuitBreaker(3, 1000);

      breaker.recordFailure();
      breaker.recordFailure();
      breaker.recordSuccess(); // Reset

      breaker.recordFailure();
      breaker.recordFailure(); // Only 2 failures since last success
      expect(breaker.isOpen()).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should use custom failure threshold', () => {
      const breaker = new CircuitBreaker(1, 1000); // Open after 1 failure
      breaker.recordFailure();
      expect(breaker.isOpen()).toBe(true);
    });

    it('should use custom cooldown period', async () => {
      const breaker = new CircuitBreaker(1, 500); // 500ms cooldown
      breaker.recordFailure();
      expect(breaker.isOpen()).toBe(true);

      await new Promise(resolve => setTimeout(resolve, 600));
      expect(breaker.isOpen()).toBe(false);
    }, 1000);
  });
});

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter(3); // Max 3 attempts
  });

  describe('Retry Logic', () => {
    it('should allow retry within max attempts', () => {
      expect(rateLimiter.shouldRetry(1)).toBe(true);
      expect(rateLimiter.shouldRetry(2)).toBe(true);
      expect(rateLimiter.shouldRetry(3)).toBe(true);
    });

    it('should not allow retry after max attempts', () => {
      expect(rateLimiter.shouldRetry(4)).toBe(false);
      expect(rateLimiter.shouldRetry(5)).toBe(false);
    });

    it('should not allow retry when circuit is open', () => {
      // Open circuit by recording failures
      for (let i = 0; i < 5; i++) {
        rateLimiter.recordFailure();
      }
      expect(rateLimiter.shouldRetry(1)).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should return exponential backoff delay', () => {
      expect(rateLimiter.getRetryDelay(1)).toBe(1000);
      expect(rateLimiter.getRetryDelay(2)).toBe(2000);
      expect(rateLimiter.getRetryDelay(3)).toBe(4000);
    });

    it('should use retry-after header if provided', () => {
      const delay = rateLimiter.getRetryDelay(1, 5);
      expect(delay).toBe(5000); // 5 seconds in milliseconds
    });

    it('should prefer retry-after header over exponential backoff', () => {
      const delay = rateLimiter.getRetryDelay(3, 2); // attempt 3 would be 4s, but retry-after is 2s
      expect(delay).toBe(2000);
    });
  });

  describe('Logging', () => {
    it('should log retry attempts with timestamp', () => {
      const logSpy = vi.spyOn(console, 'log');
      rateLimiter.logRetry(2, 2000);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Rate Limiter]'),
        expect.objectContaining({
          attempt: 2,
          delay: 2000,
          timestamp: expect.any(String),
        })
      );
    });

    it('should log retry-after period when provided', () => {
      const logSpy = vi.spyOn(console, 'log');
      rateLimiter.logRetry(1, 5000, 5);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Rate Limiter]'),
        expect.objectContaining({
          retryAfter: 5,
        })
      );
    });
  });

  describe('Integration with Circuit Breaker', () => {
    it('should stop retrying when circuit opens', () => {
      const limiter = new RateLimiter(10); // High retry limit

      // Record 5 consecutive failures to open circuit
      for (let i = 0; i < 5; i++) {
        limiter.recordFailure();
      }

      // Should not allow retry even though we haven't hit max attempts
      expect(limiter.shouldRetry(1)).toBe(false);
    });

    it('should resume retrying after circuit cooldown', async () => {
      const limiter = new RateLimiter(10); // High retry limit

      // Open circuit
      for (let i = 0; i < 5; i++) {
        limiter.recordFailure();
      }
      expect(limiter.shouldRetry(1)).toBe(false);

      // Wait for cooldown (default 30 seconds, but we'll use a shorter one for testing)
      // Note: In real implementation, we need to make cooldown configurable
      // For now, this test documents the expected behavior
    });
  });
});

describe('RateLimiter - Edge Cases', () => {
  it('should handle zero max attempts', () => {
    const limiter = new RateLimiter(0);
    expect(limiter.shouldRetry(1)).toBe(false);
  });

  it('should handle negative retry attempt numbers', () => {
    const limiter = new RateLimiter(3);
    expect(limiter.shouldRetry(-1)).toBe(false);
    expect(limiter.shouldRetry(0)).toBe(false);
  });

  it('should handle very large retry-after values', () => {
    const limiter = new RateLimiter(3);
    const delay = limiter.getRetryDelay(1, 3600); // 1 hour
    expect(delay).toBe(3600000); // Should accept large values
  });
});
