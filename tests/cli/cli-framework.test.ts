import { describe, it, expect, vi, beforeEach } from 'vitest';
import { spawn } from 'child_process';
import { join } from 'path';

// CLI path for testing
const cliPath = join(process.cwd(), 'dist', 'cli', 'index.js');

describe('CLI Framework', () => {
  describe('Version Display', () => {
    it('should display version with --version flag', async () => {
      const { stdout } = await runCLI(['--version']);
      expect(stdout).toMatch(/^\d+\.\d+\.\d+$/);
    });

    it('should display version with -V flag', async () => {
      const { stdout } = await runCLI(['-V']);
      expect(stdout).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe('Help Text', () => {
    it('should display help with --help flag', async () => {
      const { stdout } = await runCLI(['--help']);

      // Should contain program description
      expect(stdout).toContain('Integration Feasibility Study System');

      // Should contain available commands
      expect(stdout).toContain('run');
      expect(stdout).toContain('resume');

      // Should contain usage information
      expect(stdout).toContain('Usage:');
      expect(stdout).toContain('Options:');
    });

    it('should display help with -h flag', async () => {
      const { stdout } = await runCLI(['-h']);
      expect(stdout).toContain('Integration Feasibility Study System');
    });

    it('should display help for study run command', async () => {
      const { stdout } = await runCLI(['run', '--help']);

      expect(stdout).toContain('run');
      expect(stdout).toContain('--target');
      expect(stdout).toContain('--config');
    });

    it('should display help for study resume command', async () => {
      const { stdout } = await runCLI(['resume', '--help']);

      expect(stdout).toContain('resume');
      expect(stdout).toContain('--checkpoint');
    });
  });

  describe('Subcommands', () => {
    it('should recognize study run command', async () => {
      // This will fail without required arguments, but should recognize the command
      const { stderr, exitCode } = await runCLI(['run']);

      // Should not show "unknown command" error
      expect(stderr).not.toContain('unknown command');

      // Should show missing required options error
      expect(stderr).toContain('required option');
    });

    it('should recognize study resume command', async () => {
      const { stderr, exitCode } = await runCLI(['resume']);

      expect(stderr).not.toContain('unknown command');
      expect(stderr).toContain('required option');
    });

    it('should show error for unknown command', async () => {
      const { stderr, exitCode } = await runCLI(['unknown-command']);

      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('unknown command');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid arguments gracefully', async () => {
      const { stderr, exitCode } = await runCLI([
        'run',
        '--target',
        'https://example.com',
        '--config',
        'config.yaml',
        '--invalid-option',
      ]);

      expect(exitCode).not.toBe(0);
      expect(stderr).toContain('unknown option');
    });

    it('should exit with non-zero code on error', async () => {
      const { exitCode } = await runCLI(['run']);

      expect(exitCode).not.toBe(0);
    });

    it('should provide clear error messages', async () => {
      const { stderr } = await runCLI(['run']);

      // Error message should be descriptive
      expect(stderr.length).toBeGreaterThan(0);
      expect(stderr).toContain('--target');
    });
  });
});

/**
 * Helper function to run CLI command and capture output
 */
async function runCLI(args: string[]): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve) => {
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
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        exitCode: code ?? 1,
      });
    });

    child.on('error', (error) => {
      resolve({
        stdout,
        stderr: error.message,
        exitCode: 1,
      });
    });
  });
}
