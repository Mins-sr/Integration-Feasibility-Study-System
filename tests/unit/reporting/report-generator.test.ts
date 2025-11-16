/**
 * Report Generator Tests
 *
 * Test cases for the complete report generation service including:
 * - Data aggregation
 * - OpenAPI spec generation
 * - Markdown report generation
 * - File management (saving reports to disk)
 * - Template fallback mechanism
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ReportGenerator } from '@/reporting/report-generator';
import type { AnalyzerResult } from '@/types';
import type { PerformanceMetrics } from '@/analysis/performance/types';
import { rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

describe('ReportGenerator', () => {
  let generator: ReportGenerator;
  const testOutputDir = '.test-study-results';

  beforeEach(async () => {
    generator = new ReportGenerator();
    // Create test output directory
    if (!existsSync(testOutputDir)) {
      await mkdir(testOutputDir, { recursive: true });
    }
  });

  afterEach(async () => {
    // Clean up test output directory
    if (existsSync(testOutputDir)) {
      await rm(testOutputDir, { recursive: true, force: true });
    }
  });

  describe('generateReports', () => {
    it('should generate both OpenAPI and Markdown reports', async () => {
      // Arrange: Create sample analyzer results
      const performanceResult: AnalyzerResult = {
        id: 'perf-1',
        studyId: 'test-study-123',
        analyzerType: 'PERFORMANCE',
        status: 'COMPLETED',
        startedAt: new Date('2025-11-16T00:00:00Z'),
        completedAt: new Date('2025-11-16T00:05:00Z'),
        data: {
          responseTime: { mean: 120, min: 80, max: 200, p50: 115, p95: 180, p99: 195 },
          throughput: 850,
          errorRate: 0.5,
          concurrencyResults: [],
        } as PerformanceMetrics,
        errors: [],
      };

      const analyzerResults = [performanceResult];

      // Act: Generate reports
      const result = await generator.generateReports({
        studyId: 'test-study-123',
        targetUrl: 'https://api.example.com',
        apiTitle: 'Test API',
        apiVersion: '1.0.0',
        analyzerResults,
        outputDir: testOutputDir,
      });

      // Assert: Should generate both reports successfully
      expect(result.success).toBe(true);
      if (result.success) {
        const reports = result.value;

        // Check OpenAPI report
        expect(reports.openApiSpec).toBeDefined();
        expect(reports.openApiSpec.path).toContain('test-study-123.openapi.json');
        expect(reports.openApiSpec.content.openapi).toBe('3.1.0');

        // Check Markdown report
        expect(reports.markdownReport).toBeDefined();
        expect(reports.markdownReport.path).toContain('test-study-123.md');
        expect(reports.markdownReport.content).toContain('# Integration Feasibility Study Report');
      }
    });

    it('should save reports to filesystem', async () => {
      // Arrange
      const performanceResult: AnalyzerResult = {
        id: 'perf-1',
        studyId: 'test-study-456',
        analyzerType: 'PERFORMANCE',
        status: 'COMPLETED',
        startedAt: new Date('2025-11-16T00:00:00Z'),
        completedAt: new Date('2025-11-16T00:05:00Z'),
        data: {
          responseTime: { mean: 120, min: 80, max: 200, p50: 115, p95: 180, p99: 195 },
          throughput: 850,
          errorRate: 0.5,
          concurrencyResults: [],
        } as PerformanceMetrics,
        errors: [],
      };

      // Act: Generate and save reports
      const result = await generator.generateReports({
        studyId: 'test-study-456',
        targetUrl: 'https://api.example.com',
        apiTitle: 'Test API',
        apiVersion: '1.0.0',
        analyzerResults: [performanceResult],
        outputDir: testOutputDir,
      });

      // Assert: Files should exist on disk
      expect(result.success).toBe(true);
      if (result.success) {
        const openApiPath = result.value.openApiSpec.path;
        const markdownPath = result.value.markdownReport.path;

        expect(existsSync(openApiPath)).toBe(true);
        expect(existsSync(markdownPath)).toBe(true);

        // Verify file contents
        const openApiContent = await readFile(openApiPath, 'utf-8');
        const markdownContent = await readFile(markdownPath, 'utf-8');

        expect(openApiContent).toContain('"openapi": "3.1.0"');
        expect(markdownContent).toContain('test-study-456');
      }
    });

    it('should fail when no analyzer results are provided', async () => {
      // Act: Try to generate reports with empty results
      const result = await generator.generateReports({
        studyId: 'test-study-789',
        targetUrl: 'https://api.example.com',
        apiTitle: 'Test API',
        apiVersion: '1.0.0',
        analyzerResults: [],
        outputDir: testOutputDir,
      });

      // Assert: Should return validation error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('VALIDATION_ERROR');
      }
    });

    it('should handle file write errors gracefully', async () => {
      // Arrange: Use an invalid output directory (read-only or non-existent parent)
      const performanceResult: AnalyzerResult = {
        id: 'perf-1',
        studyId: 'test-study-error',
        analyzerType: 'PERFORMANCE',
        status: 'COMPLETED',
        startedAt: new Date('2025-11-16T00:00:00Z'),
        completedAt: new Date('2025-11-16T00:05:00Z'),
        data: {
          responseTime: { mean: 120, min: 80, max: 200, p50: 115, p95: 180, p99: 195 },
          throughput: 850,
          errorRate: 0.5,
          concurrencyResults: [],
        } as PerformanceMetrics,
        errors: [],
      };

      // Act: Try to write to invalid location
      const result = await generator.generateReports({
        studyId: 'test-study-error',
        targetUrl: 'https://api.example.com',
        apiTitle: 'Test API',
        apiVersion: '1.0.0',
        analyzerResults: [performanceResult],
        outputDir: '/invalid/nonexistent/path',
      });

      // Assert: Should return file write error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('GENERATION_FAILED');
      }
    });
  });

  describe('template fallback mechanism', () => {
    it('should use embedded default template when custom template is missing', async () => {
      // This test verifies that the generator can work without external template files
      // The templates should be embedded in the code as fallback

      // Arrange
      const performanceResult: AnalyzerResult = {
        id: 'perf-1',
        studyId: 'test-study-fallback',
        analyzerType: 'PERFORMANCE',
        status: 'COMPLETED',
        startedAt: new Date('2025-11-16T00:00:00Z'),
        completedAt: new Date('2025-11-16T00:05:00Z'),
        data: {
          responseTime: { mean: 120, min: 80, max: 200, p50: 115, p95: 180, p99: 195 },
          throughput: 850,
          errorRate: 0.5,
          concurrencyResults: [],
        } as PerformanceMetrics,
        errors: [],
      };

      // Act: Generate reports (should use embedded templates)
      const result = await generator.generateReports({
        studyId: 'test-study-fallback',
        targetUrl: 'https://api.example.com',
        apiTitle: 'Test API',
        apiVersion: '1.0.0',
        analyzerResults: [performanceResult],
        outputDir: testOutputDir,
      });

      // Assert: Should succeed even without external templates
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.openApiSpec.content).toBeDefined();
        expect(result.value.markdownReport.content).toBeDefined();
      }
    });
  });
});
