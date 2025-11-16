#!/usr/bin/env node

/**
 * CLI Entry Point for Integration Feasibility Study System
 *
 * Provides command-line interface with subcommands:
 * - study run: Execute a new feasibility study
 * - study resume: Resume an interrupted study from checkpoint
 *
 * This CLI follows TDD best practices and type-safe error handling.
 */

import { Command } from 'commander';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

/**
 * Get package.json version for CLI version display
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageJsonPath = join(__dirname, '../../package.json');

interface PackageJson {
  version: string;
  [key: string]: unknown;
}

const packageJson = JSON.parse(
  readFileSync(packageJsonPath, 'utf-8')
) as PackageJson;

const program = new Command();

// Configure main program
program
  .name('study')
  .description('Integration Feasibility Study System - Multi-AI agent free-tier rotation for cost-efficient integration evaluation')
  .version(packageJson.version as string);

/**
 * Study run command: Execute a new feasibility study
 *
 * Evaluates an API or service integration across multiple dimensions:
 * - Performance (response time, throughput)
 * - Security (vulnerabilities, compliance)
 * - Cost (pricing, ROI)
 * - Risk (compatibility, vendor lock-in)
 */
program
  .command('run')
  .description('Execute a new feasibility study for API/service integration')
  .requiredOption('--target <url>', 'Target API URL to evaluate (e.g., https://api.example.com)')
  .requiredOption('--config <file>', 'Path to study configuration YAML/JSON file')
  .option(
    '--enable-load-test',
    'Enable performance load testing (WARNING: potentially intrusive to target service)',
    false
  )
  .action(async (options) => {
    try {
      // Import dynamically to avoid circular dependencies
      const { executeStudyWorkflow } = await import('./workflows/study-run');

      await executeStudyWorkflow({
        targetUrl: options.target,
        configPath: options.config,
        enableLoadTest: options.enableLoadTest ?? false,
      });

      console.log('Study completed successfully');
      process.exit(0);
    } catch (error) {
      handleError(error);
    }
  });

/**
 * Study resume command: Resume an interrupted study from checkpoint
 *
 * Continues a previously interrupted study by loading the checkpoint
 * and executing only the remaining analyzers.
 */
program
  .command('resume')
  .description('Resume an interrupted study from checkpoint')
  .requiredOption('--checkpoint <id>', 'Checkpoint ID to resume from (UUID)')
  .action(async (options) => {
    try {
      // Import dynamically to avoid circular dependencies
      const { resumeStudyWorkflow } = await import('./workflows/study-resume');

      await resumeStudyWorkflow({
        checkpointId: options.checkpoint,
      });

      console.log('Study resumed and completed successfully');
      process.exit(0);
    } catch (error) {
      handleError(error);
    }
  });

/**
 * Global error handler for CLI commands
 *
 * Provides consistent error messaging and debugging support.
 * In DEBUG mode, displays full stack traces.
 *
 * @param error - Error object or unknown error
 */
function handleError(error: unknown): void {
  if (error instanceof Error) {
    console.error('Error:', error.message);

    // Display stack trace in debug mode for troubleshooting
    if (process.env['DEBUG']) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
  } else {
    console.error('Unknown error occurred:', error);
  }

  // Exit with non-zero code to indicate failure
  process.exit(1);
}

/**
 * Handle uncaught exceptions globally
 *
 * Prevents the application from crashing silently and provides
 * clear error messages to users.
 */
process.on('uncaughtException', (error: Error) => {
  console.error('Uncaught Exception:', error.message);

  if (process.env['DEBUG']) {
    console.error('\nStack trace:');
    console.error(error.stack);
  }

  process.exit(1);
});

/**
 * Handle unhandled promise rejections globally
 *
 * Ensures async errors don't go unnoticed.
 */
process.on('unhandledRejection', (reason: unknown) => {
  console.error('Unhandled Promise Rejection:', reason);
  process.exit(1);
});

// Parse command line arguments and execute appropriate command
program.parse();
