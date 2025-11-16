/**
 * CLI Integration E2E Tests
 *
 * Tests the complete CLI workflow including:
 * - study run command execution
 * - study resume command execution
 * - Error handling for invalid inputs
 * - Integration with PipelineOrchestrator
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { spawn } from 'child_process';
import { mkdir, writeFile, rm, access } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import type { StudyConfig } from '@/types';

describe('CLI Integration E2E', () => {
  let testDir: string;
  let configPath: string;

  beforeEach(async () => {
    // Create temporary directory for test files
    testDir = join(tmpdir(), `cli-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
    configPath = join(testDir, 'test-config.json');
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('study run command', () => {
    it('should execute study with valid configuration', async () => {
      // RED: Write the test first - it will fail since CLI is not wired yet
      const config: StudyConfig = {
        target: {
          url: 'https://api.example.com',
          auth: {
            type: 'none',
          },
        },
        analyzers: [
          {
            type: 'PERFORMANCE',
            enabled: false, // Disable to avoid external dependencies
          },
          {
            type: 'SECURITY',
            enabled: false, // Disable to avoid external dependencies
          },
          {
            type: 'COST',
            enabled: false, // Disable to avoid external dependencies
          },
          {
            type: 'RISK',
            enabled: false, // Disable to avoid external dependencies
          },
        ],
        reportFormats: ['MARKDOWN', 'OPENAPI'],
        parallelExecution: true,
      };

      await writeFile(configPath, JSON.stringify(config, null, 2));

      const { exitCode, stdout, stderr } = await runCLI([
        'run',
        '--target',
        'https://api.example.com',
        '--config',
        configPath,
      ]);

      // Should succeed with exit code 0 even with no analyzers enabled
      expect(exitCode).toBe(0);
      expect(stdout).toContain('Study completed successfully');
      expect(stderr).toBe('');
    });

    it('should fail with missing required arguments', async () => {
      // Test missing --target
      const { exitCode, stderr } = await runCLI(['run', '--config', configPath]);

      expect(exitCode).toBe(1);
      expect(stderr).toContain('required option');
      expect(stderr).toContain('--target');
    });

    it('should fail with invalid config file path', async () => {
      const { exitCode, stderr } = await runCLI([
        'run',
        '--target',
        'https://api.example.com',
        '--config',
        '/nonexistent/config.json',
      ]);

      expect(exitCode).toBe(1);
      expect(stderr).toContain('CONFIG_NOT_FOUND');
    });

    it('should handle analyzer failures gracefully', async () => {
      // Enable an analyzer but don't register it - should fail gracefully
      const config: StudyConfig = {
        target: {
          url: 'https://api.example.com',
          auth: {
            type: 'none',
          },
        },
        analyzers: [
          {
            type: 'PERFORMANCE',
            enabled: true, // Enable but won't be registered in test
          },
        ],
        reportFormats: ['MARKDOWN'],
        parallelExecution: false,
      };

      await writeFile(configPath, JSON.stringify(config, null, 2));

      const { exitCode, stderr } = await runCLI([
        'run',
        '--target',
        'https://api.example.com',
        '--config',
        configPath,
      ]);

      expect(exitCode).toBe(1);
      expect(stderr).toContain('Analyzer not registered');
    });
  });

  describe('study resume command', () => {
    it('should resume study from valid checkpoint', async () => {
      // RED: Write the test first - implementation will come later
      // First create a checkpoint by running a partial study
      const config: StudyConfig = {
        target: {
          url: 'https://api.example.com',
          auth: {
            type: 'none',
          },
        },
        analyzers: [
          {
            type: 'PERFORMANCE',
            enabled: false,
          },
        ],
        reportFormats: ['MARKDOWN'],
        parallelExecution: false,
      };

      await writeFile(configPath, JSON.stringify(config, null, 2));

      // Run initial study to create checkpoint
      const { exitCode: runExitCode } = await runCLI([
        'run',
        '--target',
        'https://api.example.com',
        '--config',
        configPath,
      ]);

      expect(runExitCode).toBe(0);

      // Note: Resume requires a real checkpoint ID
      // This test will be completed after checkpoint mechanism is fully implemented
    });

    it('should fail with missing checkpoint ID', async () => {
      const { exitCode, stderr } = await runCLI(['resume']);

      expect(exitCode).toBe(1);
      expect(stderr).toContain('required option');
      expect(stderr).toContain('--checkpoint');
    });

    it('should fail with invalid checkpoint ID', async () => {
      const { exitCode, stderr } = await runCLI([
        'resume',
        '--checkpoint',
        'nonexistent-checkpoint-id',
      ]);

      expect(exitCode).toBe(1);
      expect(stderr).toContain('CHECKPOINT_NOT_FOUND');
    });
  });

  describe('error handling', () => {
    it('should display help text with -h flag', async () => {
      const { exitCode, stdout } = await runCLI(['-h']);

      expect(exitCode).toBe(0);
      expect(stdout).toContain('Integration Feasibility Study System');
      expect(stdout).toContain('study run');
      expect(stdout).toContain('study resume');
    });

    it('should display version with -V flag', async () => {
      const { exitCode, stdout } = await runCLI(['-V']);

      expect(exitCode).toBe(0);
      expect(stdout).toMatch(/\d+\.\d+\.\d+/); // Should contain version number
    });
  });
});

/**
 * Helper function to run CLI commands and capture output
 *
 * @param args - CLI arguments
 * @returns Exit code, stdout, and stderr
 */
async function runCLI(args: string[]): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
  return new Promise((resolve) => {
    const cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');
    const child = spawn('node', [cliPath, ...args], {
      env: { ...process.env, NODE_ENV: 'test' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}
