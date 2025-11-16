/**
 * Checkpoint and Recovery Tests for Performance Analyzer
 *
 * Tests for Task 4.4: Implement checkpoint and recovery for performance tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PerformanceAnalyzer } from '@/analysis/performance/performance-analyzer';
import type { PerformanceTestConfig, PerformanceMetrics } from '@/analysis/performance/types';
import type { JMeterBridge } from '@/analysis/performance/jmeter-bridge';
import type { TargetConfig } from '@/types/config-types';
import { mkdir, writeFile, readFile, access } from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  readFile: vi.fn(),
  access: vi.fn(),
}));

describe('PerformanceAnalyzer - Checkpoint and Recovery', () => {
  let analyzer: PerformanceAnalyzer;
  let mockJMeterBridge: JMeterBridge;
  const testConfig: PerformanceTestConfig = {
    target: {
      url: 'https://api.example.com',
      method: 'GET',
    } as TargetConfig,
    concurrency: [1, 10, 50, 100],
    duration: 30,
    rampUp: 5,
  };

  beforeEach(() => {
    // Create mock JMeterBridge
    mockJMeterBridge = {
      verifyInstallation: vi.fn(),
      generateTestPlan: vi.fn(),
      saveTestPlan: vi.fn(),
      executeJMeter: vi.fn(),
      parseJTLOutput: vi.fn(),
    } as unknown as JMeterBridge;

    analyzer = new PerformanceAnalyzer(mockJMeterBridge);

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('saveCheckpoint', () => {
    it('should save partial results after each concurrency level completes', async () => {
      // Arrange: Partial metrics for concurrency level 1
      const studyId = 'test-study-123';
      const completedLevel = 1;
      const partialMetrics: Partial<PerformanceMetrics> = {
        responseTime: {
          mean: 150,
          min: 100,
          max: 200,
          p50: 145,
          p95: 180,
          p99: 195,
        },
        throughput: 10.5,
        errorRate: 0.5,
        concurrencyResults: [
          {
            concurrency: 1,
            successRate: 99.5,
            avgLatency: 150,
          },
        ],
      };

      // Act: Save checkpoint
      const result = await analyzer.saveCheckpoint(studyId, completedLevel, partialMetrics);

      // Assert: Should succeed and save to correct path
      expect(result.success).toBe(true);
      expect(mkdir).toHaveBeenCalledWith('.study-checkpoint', { recursive: true });

      const writeCallArgs = (writeFile as any).mock.calls[0];
      expect(writeCallArgs[0]).toBe(`.study-checkpoint/${studyId}.json`);
      expect(writeCallArgs[1]).toContain('"completedLevel": 1');
      expect(writeCallArgs[2]).toBe('utf-8');
    });

    it('should include timestamp in checkpoint data', async () => {
      // Arrange
      const studyId = 'test-study-456';
      const completedLevel = 10;
      const partialMetrics: Partial<PerformanceMetrics> = {
        concurrencyResults: [],
      };

      // Act
      await analyzer.saveCheckpoint(studyId, completedLevel, partialMetrics);

      // Assert: Checkpoint should have timestamp
      const writeCallArgs = (writeFile as any).mock.calls[0];
      const checkpointData = JSON.parse(writeCallArgs[1]);
      expect(checkpointData).toHaveProperty('timestamp');
      expect(checkpointData.timestamp).toBeTypeOf('number');
    });
  });

  describe('loadCheckpoint', () => {
    it('should load existing checkpoint and detect incomplete concurrency levels', async () => {
      // Arrange: Mock checkpoint file with completed level 1
      const studyId = 'test-study-789';
      const mockCheckpoint = {
        studyId,
        completedLevel: 1,
        timestamp: Date.now(),
        partialMetrics: {
          concurrencyResults: [
            {
              concurrency: 1,
              successRate: 99.5,
              avgLatency: 150,
            },
          ],
        },
      };

      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockCheckpoint));

      // Act: Load checkpoint
      const result = await analyzer.loadCheckpoint(studyId);

      // Assert: Should successfully load checkpoint
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.completedLevel).toBe(1);
        expect(result.value.partialMetrics.concurrencyResults).toHaveLength(1);
      }
    });

    it('should return error when checkpoint file does not exist', async () => {
      // Arrange: Mock file not found
      vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

      // Act
      const result = await analyzer.loadCheckpoint('nonexistent-study');

      // Assert: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('TARGET_UNREACHABLE');
      }
    });
  });

  describe('getIncompleteConcurrencyLevels', () => {
    it('should identify which concurrency levels are incomplete', () => {
      // Arrange: Config has [1, 10, 50, 100], completed level is 10
      const allLevels = [1, 10, 50, 100];
      const completedLevel = 10;

      // Act
      const incomplete = analyzer.getIncompleteConcurrencyLevels(allLevels, completedLevel);

      // Assert: Should return [50, 100]
      expect(incomplete).toEqual([50, 100]);
    });

    it('should return all levels when no checkpoint exists', () => {
      // Arrange
      const allLevels = [1, 10, 50, 100];
      const completedLevel = 0; // No checkpoint

      // Act
      const incomplete = analyzer.getIncompleteConcurrencyLevels(allLevels, completedLevel);

      // Assert: Should return all levels
      expect(incomplete).toEqual([1, 10, 50, 100]);
    });

    it('should return empty array when all levels are completed', () => {
      // Arrange
      const allLevels = [1, 10, 50, 100];
      const completedLevel = 100;

      // Act
      const incomplete = analyzer.getIncompleteConcurrencyLevels(allLevels, completedLevel);

      // Assert: Should return empty array
      expect(incomplete).toEqual([]);
    });
  });

  describe('runPerformanceTestWithResume', () => {
    it('should skip already-completed concurrency levels on retry', async () => {
      // Arrange: Mock checkpoint with completed level 1
      const studyId = 'test-study-resume';
      const mockCheckpoint = {
        studyId,
        completedLevel: 1,
        timestamp: Date.now(),
        partialMetrics: {
          responseTime: { mean: 150, min: 100, max: 200, p50: 145, p95: 180, p99: 195 },
          throughput: 10.5,
          errorRate: 0.5,
          concurrencyResults: [
            { concurrency: 1, successRate: 99.5, avgLatency: 150 },
          ],
        },
      };

      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockCheckpoint));

      // Mock JMeter operations for remaining levels [10, 50, 100]
      vi.mocked(mockJMeterBridge.verifyInstallation).mockResolvedValue({
        success: true,
        value: { installed: true, version: '5.6.3' },
      });
      vi.mocked(mockJMeterBridge.generateTestPlan).mockReturnValue('test-plan-xml');
      vi.mocked(mockJMeterBridge.saveTestPlan).mockResolvedValue({ success: true, value: undefined });
      vi.mocked(mockJMeterBridge.executeJMeter).mockResolvedValue({ success: true, value: undefined });
      vi.mocked(mockJMeterBridge.parseJTLOutput).mockResolvedValue({
        success: true,
        value: {
          responseTime: { mean: 200, min: 150, max: 300, p50: 195, p95: 280, p99: 295 },
          throughput: 8.0,
          errorRate: 1.0,
          concurrencyResults: [
            { concurrency: 10, successRate: 99.0, avgLatency: 200 },
          ],
        },
      });

      // Act: Run performance test with resume
      const result = await analyzer.runPerformanceTestWithResume(studyId, testConfig);

      // Assert: Should skip level 1 and only test [10, 50, 100]
      expect(result.success).toBe(true);
      // JMeter execution should be called 3 times (for levels 10, 50, 100)
      expect(mockJMeterBridge.executeJMeter).toHaveBeenCalledTimes(3);
    });

    it('should aggregate results from checkpoint and new execution', async () => {
      // Arrange: Checkpoint with level 1, new execution for level 10
      const studyId = 'test-study-aggregate';
      const mockCheckpoint = {
        studyId,
        completedLevel: 1,
        timestamp: Date.now(),
        partialMetrics: {
          responseTime: { mean: 150, min: 100, max: 200, p50: 145, p95: 180, p99: 195 },
          throughput: 10.5,
          errorRate: 0.5,
          concurrencyResults: [
            { concurrency: 1, successRate: 99.5, avgLatency: 150 },
          ],
        },
      };

      vi.mocked(access).mockResolvedValue(undefined);
      vi.mocked(readFile).mockResolvedValue(JSON.stringify(mockCheckpoint));

      // Mock new execution results
      vi.mocked(mockJMeterBridge.verifyInstallation).mockResolvedValue({
        success: true,
        value: { installed: true, version: '5.6.3' },
      });
      vi.mocked(mockJMeterBridge.generateTestPlan).mockReturnValue('test-plan-xml');
      vi.mocked(mockJMeterBridge.saveTestPlan).mockResolvedValue({ success: true, value: undefined });
      vi.mocked(mockJMeterBridge.executeJMeter).mockResolvedValue({ success: true, value: undefined });
      vi.mocked(mockJMeterBridge.parseJTLOutput).mockResolvedValue({
        success: true,
        value: {
          responseTime: { mean: 200, min: 150, max: 300, p50: 195, p95: 280, p99: 295 },
          throughput: 8.0,
          errorRate: 1.0,
          concurrencyResults: [
            { concurrency: 10, successRate: 99.0, avgLatency: 200 },
          ],
        },
      });

      // Act
      const result = await analyzer.runPerformanceTestWithResume(studyId, testConfig);

      // Assert: Results should include both checkpoint and new data
      expect(result.success).toBe(true);
      if (result.success) {
        const concurrencyResults = result.value.concurrencyResults;
        // Should have results for all 4 levels [1, 10, 50, 100]
        expect(concurrencyResults.length).toBe(4);
        // First result should be from checkpoint
        expect(concurrencyResults[0]).toEqual({
          concurrency: 1,
          successRate: 99.5,
          avgLatency: 150,
        });
      }
    });
  });
});
