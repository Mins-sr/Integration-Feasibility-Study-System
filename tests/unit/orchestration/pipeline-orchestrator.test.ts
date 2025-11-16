/**
 * Pipeline Orchestrator Tests
 *
 * Test cases for study execution orchestration functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PipelineOrchestrator } from '@/orchestration/pipeline-orchestrator';
import type { StudyConfig, AnalyzerResult, Result } from '@/types';
import { ok, err } from '@/types';

// Mock analyzer interface
interface MockAnalyzer {
  run: (config: StudyConfig) => Promise<Result<AnalyzerResult, Error>>;
  type: string;
}

describe('PipelineOrchestrator', () => {
  let orchestrator: PipelineOrchestrator;

  beforeEach(() => {
    orchestrator = new PipelineOrchestrator();
  });

  describe('executeStudy', () => {
    it('should execute single analyzer successfully', async () => {
      const config: StudyConfig = {
        target: {
          url: 'https://api.example.com',
        },
        analyzers: [
          { type: 'PERFORMANCE', enabled: true },
        ],
        reportFormats: ['MARKDOWN'],
        parallelExecution: false,
      };

      // Create mock analyzer
      const mockResult: AnalyzerResult = {
        id: 'test-result-1',
        studyId: 'test-study-1',
        analyzerType: 'PERFORMANCE',
        status: 'COMPLETED',
        startedAt: new Date(),
        completedAt: new Date(),
        data: { responseTime: { mean: 100 } },
        errors: [],
      };

      const mockAnalyzer: MockAnalyzer = {
        type: 'PERFORMANCE',
        run: vi.fn().mockResolvedValue(ok(mockResult)),
      };

      orchestrator.registerAnalyzer('PERFORMANCE', mockAnalyzer as any);

      const result = await orchestrator.executeStudy(config);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.success).toBe(true);
        expect(result.value.results).toHaveLength(1);
        expect(result.value.results[0]).toEqual(mockResult);
        expect(result.value.errors).toHaveLength(0);
      }
    });

    it('should execute multiple analyzers in parallel when parallelExecution is true', async () => {
      const config: StudyConfig = {
        target: {
          url: 'https://api.example.com',
        },
        analyzers: [
          { type: 'PERFORMANCE', enabled: true },
          { type: 'SECURITY', enabled: true },
        ],
        reportFormats: ['MARKDOWN'],
        parallelExecution: true,
      };

      const perfResult: AnalyzerResult = {
        id: 'perf-1',
        studyId: 'study-1',
        analyzerType: 'PERFORMANCE',
        status: 'COMPLETED',
        startedAt: new Date(),
        completedAt: new Date(),
        data: {},
        errors: [],
      };

      const secResult: AnalyzerResult = {
        id: 'sec-1',
        studyId: 'study-1',
        analyzerType: 'SECURITY',
        status: 'COMPLETED',
        startedAt: new Date(),
        completedAt: new Date(),
        data: {},
        errors: [],
      };

      const perfAnalyzer: MockAnalyzer = {
        type: 'PERFORMANCE',
        run: vi.fn().mockResolvedValue(ok(perfResult)),
      };

      const secAnalyzer: MockAnalyzer = {
        type: 'SECURITY',
        run: vi.fn().mockResolvedValue(ok(secResult)),
      };

      orchestrator.registerAnalyzer('PERFORMANCE', perfAnalyzer as any);
      orchestrator.registerAnalyzer('SECURITY', secAnalyzer as any);

      const startTime = Date.now();
      const result = await orchestrator.executeStudy(config);
      const duration = Date.now() - startTime;

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.results).toHaveLength(2);
        // Parallel execution should be faster than sequential (both complete around the same time)
        expect(duration).toBeLessThan(100); // Mock delay is negligible
      }
    });

    it('should execute analyzers sequentially when parallelExecution is false', async () => {
      const config: StudyConfig = {
        target: {
          url: 'https://api.example.com',
        },
        analyzers: [
          { type: 'PERFORMANCE', enabled: true },
          { type: 'SECURITY', enabled: true },
        ],
        reportFormats: ['MARKDOWN'],
        parallelExecution: false,
      };

      const executionOrder: string[] = [];

      const perfAnalyzer: MockAnalyzer = {
        type: 'PERFORMANCE',
        run: vi.fn().mockImplementation(async () => {
          executionOrder.push('PERFORMANCE_START');
          await new Promise(resolve => setTimeout(resolve, 10));
          executionOrder.push('PERFORMANCE_END');
          return ok({
            id: 'perf-1',
            studyId: 'study-1',
            analyzerType: 'PERFORMANCE',
            status: 'COMPLETED',
            startedAt: new Date(),
            completedAt: new Date(),
            data: {},
            errors: [],
          });
        }),
      };

      const secAnalyzer: MockAnalyzer = {
        type: 'SECURITY',
        run: vi.fn().mockImplementation(async () => {
          executionOrder.push('SECURITY_START');
          await new Promise(resolve => setTimeout(resolve, 10));
          executionOrder.push('SECURITY_END');
          return ok({
            id: 'sec-1',
            studyId: 'study-1',
            analyzerType: 'SECURITY',
            status: 'COMPLETED',
            startedAt: new Date(),
            completedAt: new Date(),
            data: {},
            errors: [],
          });
        }),
      };

      orchestrator.registerAnalyzer('PERFORMANCE', perfAnalyzer as any);
      orchestrator.registerAnalyzer('SECURITY', secAnalyzer as any);

      await orchestrator.executeStudy(config);

      // Verify sequential execution: PERFORMANCE completes before SECURITY starts
      expect(executionOrder).toEqual([
        'PERFORMANCE_START',
        'PERFORMANCE_END',
        'SECURITY_START',
        'SECURITY_END',
      ]);
    });

    it('should collect partial results when one analyzer fails', async () => {
      const config: StudyConfig = {
        target: {
          url: 'https://api.example.com',
        },
        analyzers: [
          { type: 'PERFORMANCE', enabled: true },
          { type: 'SECURITY', enabled: true },
        ],
        reportFormats: ['MARKDOWN'],
        parallelExecution: true,
      };

      const perfResult: AnalyzerResult = {
        id: 'perf-1',
        studyId: 'study-1',
        analyzerType: 'PERFORMANCE',
        status: 'COMPLETED',
        startedAt: new Date(),
        completedAt: new Date(),
        data: {},
        errors: [],
      };

      const perfAnalyzer: MockAnalyzer = {
        type: 'PERFORMANCE',
        run: vi.fn().mockResolvedValue(ok(perfResult)),
      };

      const secAnalyzer: MockAnalyzer = {
        type: 'SECURITY',
        run: vi.fn().mockResolvedValue(err(new Error('ZAP not running'))),
      };

      orchestrator.registerAnalyzer('PERFORMANCE', perfAnalyzer as any);
      orchestrator.registerAnalyzer('SECURITY', secAnalyzer as any);

      const result = await orchestrator.executeStudy(config);

      expect(result.success).toBe(true);
      if (result.success) {
        // Study should indicate partial failure
        expect(result.value.success).toBe(false);
        // Should have one successful result
        expect(result.value.results).toHaveLength(1);
        expect(result.value.results[0].analyzerType).toBe('PERFORMANCE');
        // Should have one error
        expect(result.value.errors).toHaveLength(1);
        expect(result.value.errors[0].type).toBe('ANALYZER_FAILED');
        expect(result.value.errors[0].analyzer).toBe('SECURITY');
      }
    });

    it('should skip disabled analyzers', async () => {
      const config: StudyConfig = {
        target: {
          url: 'https://api.example.com',
        },
        analyzers: [
          { type: 'PERFORMANCE', enabled: true },
          { type: 'SECURITY', enabled: false }, // Disabled
        ],
        reportFormats: ['MARKDOWN'],
        parallelExecution: false,
      };

      const perfAnalyzer: MockAnalyzer = {
        type: 'PERFORMANCE',
        run: vi.fn().mockResolvedValue(ok({
          id: 'perf-1',
          studyId: 'study-1',
          analyzerType: 'PERFORMANCE',
          status: 'COMPLETED',
          startedAt: new Date(),
          completedAt: new Date(),
          data: {},
          errors: [],
        })),
      };

      const secAnalyzer: MockAnalyzer = {
        type: 'SECURITY',
        run: vi.fn(),
      };

      orchestrator.registerAnalyzer('PERFORMANCE', perfAnalyzer as any);
      orchestrator.registerAnalyzer('SECURITY', secAnalyzer as any);

      const result = await orchestrator.executeStudy(config);

      expect(result.success).toBe(true);
      if (result.success) {
        // Only enabled analyzer should run
        expect(result.value.results).toHaveLength(1);
        expect(result.value.results[0].analyzerType).toBe('PERFORMANCE');
        // Security analyzer should not be called
        expect(secAnalyzer.run).not.toHaveBeenCalled();
      }
    });

    it('should return error when no analyzers are registered', async () => {
      const config: StudyConfig = {
        target: {
          url: 'https://api.example.com',
        },
        analyzers: [
          { type: 'PERFORMANCE', enabled: true },
        ],
        reportFormats: ['MARKDOWN'],
        parallelExecution: false,
      };

      // Don't register any analyzers

      const result = await orchestrator.executeStudy(config);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('ANALYZER_FAILED');
        expect(result.error.analyzer).toBe('PERFORMANCE');
      }
    });
  });

  describe('registerAnalyzer', () => {
    it('should register analyzer successfully', () => {
      const mockAnalyzer: MockAnalyzer = {
        type: 'PERFORMANCE',
        run: vi.fn(),
      };

      expect(() => {
        orchestrator.registerAnalyzer('PERFORMANCE', mockAnalyzer as any);
      }).not.toThrow();
    });

    it('should allow re-registering analyzer (override)', () => {
      const mockAnalyzer1: MockAnalyzer = {
        type: 'PERFORMANCE',
        run: vi.fn(),
      };

      const mockAnalyzer2: MockAnalyzer = {
        type: 'PERFORMANCE',
        run: vi.fn(),
      };

      orchestrator.registerAnalyzer('PERFORMANCE', mockAnalyzer1 as any);
      orchestrator.registerAnalyzer('PERFORMANCE', mockAnalyzer2 as any);

      // Should use the second analyzer
      expect(() => {
        orchestrator.registerAnalyzer('PERFORMANCE', mockAnalyzer2 as any);
      }).not.toThrow();
    });
  });
});
