/**
 * JMeter Bridge Unit Tests
 *
 * Tests for JMeter integration bridge focusing on test plan generation
 * and output parsing logic.
 */

import { describe, it, expect } from 'vitest';
import { JMeterBridge } from '@/analysis/performance/jmeter-bridge';
import type { PerformanceTestConfig } from '@/types/config-types';

describe('JMeterBridge', () => {
  let jmeterBridge: JMeterBridge;

  beforeEach(() => {
    jmeterBridge = new JMeterBridge();
  });

  describe('generateTestPlan', () => {
    it('should generate valid .jmx test plan from config', () => {
      // Arrange: Performance test configuration
      const config: PerformanceTestConfig = {
        target: {
          url: 'https://api.example.com/test',
          method: 'GET',
        },
        concurrency: [1, 10, 50],
        duration: 60,
        rampUp: 10,
      };

      // Act: Generate JMeter test plan
      const testPlan = jmeterBridge.generateTestPlan(config);

      // Assert: Test plan should contain required XML elements
      expect(testPlan).toContain('<?xml version="1.0"');
      expect(testPlan).toContain('<jmeterTestPlan');
      expect(testPlan).toContain('https://api.example.com/test');
      expect(testPlan).toContain(
        '<stringProp name="HTTPSampler.method">GET</stringProp>'
      );
      expect(testPlan).toContain(
        '<stringProp name="ThreadGroup.duration">60</stringProp>'
      );
      expect(testPlan).toContain(
        '<stringProp name="ThreadGroup.ramp_time">10</stringProp>'
      );
      expect(testPlan).toContain(
        '<stringProp name="ThreadGroup.num_threads">50</stringProp>'
      );
    });

    it('should handle POST requests with body in test plan', () => {
      // Arrange: POST request with JSON body
      const config: PerformanceTestConfig = {
        target: {
          url: 'https://api.example.com/create',
          method: 'POST',
          body: { name: 'test', value: 123 },
        },
        concurrency: [1],
        duration: 30,
        rampUp: 5,
      };

      // Act: Generate test plan
      const testPlan = jmeterBridge.generateTestPlan(config);

      // Assert: Should include POST method and body data (XML-escaped)
      expect(testPlan).toContain(
        '<stringProp name="HTTPSampler.method">POST</stringProp>'
      );
      expect(testPlan).toContain('&quot;name&quot;:&quot;test&quot;');
      expect(testPlan).toContain('&quot;value&quot;:123');
    });

    it('should handle custom headers in test plan', () => {
      // Arrange: Request with custom headers
      const config: PerformanceTestConfig = {
        target: {
          url: 'https://api.example.com/test',
          method: 'GET',
          headers: {
            Authorization: 'Bearer token123',
            'Content-Type': 'application/json',
          },
        },
        concurrency: [1],
        duration: 30,
        rampUp: 5,
      };

      // Act: Generate test plan
      const testPlan = jmeterBridge.generateTestPlan(config);

      // Assert: Should include header manager with custom headers
      expect(testPlan).toContain('HeaderManager');
      expect(testPlan).toContain('Authorization');
      expect(testPlan).toContain('Bearer token123');
      expect(testPlan).toContain('Content-Type');
      expect(testPlan).toContain('application/json');
    });

    it('should use max concurrency for thread group', () => {
      // Arrange: Config with multiple concurrency levels
      const config: PerformanceTestConfig = {
        target: {
          url: 'https://api.example.com/test',
          method: 'GET',
        },
        concurrency: [1, 10, 50, 100],
        duration: 60,
        rampUp: 10,
      };

      // Act: Generate test plan
      const testPlan = jmeterBridge.generateTestPlan(config);

      // Assert: Should use max concurrency (100)
      expect(testPlan).toContain(
        '<stringProp name="ThreadGroup.num_threads">100</stringProp>'
      );
    });

    it('should handle URLs with path and query parameters', () => {
      // Arrange: URL with path and query string
      const config: PerformanceTestConfig = {
        target: {
          url: 'https://api.example.com/v1/users?page=1&limit=10',
          method: 'GET',
        },
        concurrency: [1],
        duration: 30,
        rampUp: 5,
      };

      // Act: Generate test plan
      const testPlan = jmeterBridge.generateTestPlan(config);

      // Assert: Should include path with query parameters
      expect(testPlan).toContain(
        '<stringProp name="HTTPSampler.path">/v1/users?page=1&limit=10</stringProp>'
      );
      expect(testPlan).toContain(
        '<stringProp name="HTTPSampler.domain">api.example.com</stringProp>'
      );
    });
  });
});
