/**
 * Pipeline Orchestrator Service
 *
 * Orchestrates the execution of multiple analyzers in parallel or sequential mode
 */

import type { Result, StudyConfig, AnalyzerResult, StudyError, AnalyzerType } from '@/types';
import { ok, err } from '@/types';
import { randomUUID } from 'crypto';
import { CheckpointManager, type StudyCheckpoint } from './checkpoint-manager';
import { Logger } from './logger';

/**
 * Analyzer Interface
 *
 * All analyzers must implement this interface
 */
export interface Analyzer {
  /**
   * Run the analyzer with the given configuration
   *
   * @param config - Study configuration
   * @returns Result with AnalyzerResult or error
   */
  run(config: StudyConfig): Promise<Result<AnalyzerResult, Error>>;
}

/**
 * Study Result
 *
 * Contains the aggregated results from all analyzers
 */
export interface StudyResult {
  readonly success: boolean;
  readonly results: AnalyzerResult[];
  readonly errors: StudyError[];
}

/**
 * Pipeline Orchestrator Service
 *
 * Responsible for:
 * - Managing analyzer registration
 * - Executing analyzers in parallel or sequential mode
 * - Collecting results and errors from all analyzers
 * - Preserving partial results when some analyzers fail
 * - Checkpoint management for long-running studies
 * - Progress tracking and logging
 */
export class PipelineOrchestrator {
  private analyzers: Map<AnalyzerType, Analyzer> = new Map();
  private checkpointManager: CheckpointManager;
  private logger: Logger;

  constructor(checkpointDir?: string) {
    this.checkpointManager = new CheckpointManager(checkpointDir);
    this.logger = new Logger('PipelineOrchestrator');
  }

  /**
   * Register an analyzer
   *
   * @param type - Analyzer type
   * @param analyzer - Analyzer implementation
   */
  registerAnalyzer(type: AnalyzerType, analyzer: Analyzer): void {
    this.analyzers.set(type, analyzer);
  }

  /**
   * Execute study with configured analyzers
   *
   * @param config - Study configuration
   * @returns Result with StudyResult or error
   */
  async executeStudy(config: StudyConfig): Promise<Result<StudyResult, StudyError>> {
    const studyId = randomUUID();
    const startTime = Date.now();
    const results: AnalyzerResult[] = [];
    const errors: StudyError[] = [];

    // Filter enabled analyzers
    const enabledAnalyzers = config.analyzers.filter((ac) => ac.enabled);

    // Log study initialization
    this.logger.logStudyInit(
      config.target.url,
      enabledAnalyzers.map((a) => a.type)
    );

    if (enabledAnalyzers.length === 0) {
      this.logger.warn('No enabled analyzers configured');
      return ok({
        success: true,
        results: [],
        errors: [],
      });
    }

    // Execute analyzers based on parallelExecution setting
    if (config.parallelExecution) {
      // Parallel execution
      const promises = enabledAnalyzers.map((analyzerConfig, index) =>
        this.runAnalyzerWithLogging(studyId, analyzerConfig.type, config, index, enabledAnalyzers.length)
      );

      const settledResults = await Promise.allSettled(promises);

      // Collect results and errors
      for (let i = 0; i < settledResults.length; i++) {
        const settled = settledResults[i];
        const analyzerType = enabledAnalyzers[i].type;

        if (settled.status === 'fulfilled') {
          const result = settled.value;
          if (result.success) {
            results.push(result.value);

            // Save checkpoint after each successful analyzer
            await this.saveCheckpoint(studyId, config, results, errors, [analyzerType]);
          } else {
            // Check if this is an unregistered analyzer error - return immediately
            if (result.error.message?.includes('not registered')) {
              this.logger.fatal(`Analyzer not registered: ${analyzerType}`);
              return err({
                type: 'ANALYZER_FAILED',
                analyzer: analyzerType,
                cause: result.error,
              });
            }
            errors.push({
              type: 'ANALYZER_FAILED',
              analyzer: analyzerType,
              cause: result.error,
            });

            // Save checkpoint with errors
            await this.saveCheckpoint(studyId, config, results, errors, [analyzerType]);
          }
        } else {
          // Promise rejected (should not happen with Result type, but handle anyway)
          errors.push({
            type: 'ANALYZER_FAILED',
            analyzer: analyzerType,
            cause: settled.reason,
          });
        }
      }
    } else {
      // Sequential execution
      for (let i = 0; i < enabledAnalyzers.length; i++) {
        const analyzerConfig = enabledAnalyzers[i];
        const result = await this.runAnalyzerWithLogging(
          studyId,
          analyzerConfig.type,
          config,
          i,
          enabledAnalyzers.length
        );

        if (result.success) {
          results.push(result.value);

          // Save checkpoint after each successful analyzer
          await this.saveCheckpoint(studyId, config, results, errors, [analyzerConfig.type]);
        } else {
          // Check if this is an unregistered analyzer error - return immediately
          if (result.error.message?.includes('not registered')) {
            this.logger.fatal(`Analyzer not registered: ${analyzerConfig.type}`);
            return err({
              type: 'ANALYZER_FAILED',
              analyzer: analyzerConfig.type,
              cause: result.error,
            });
          }
          errors.push({
            type: 'ANALYZER_FAILED',
            analyzer: analyzerConfig.type,
            cause: result.error,
          });

          // Save checkpoint with errors (partial results)
          await this.saveCheckpoint(studyId, config, results, errors, [analyzerConfig.type]);
        }
      }
    }

    // Study is successful only if all enabled analyzers succeeded
    const success = errors.length === 0;
    const totalDuration = Date.now() - startTime;

    // Log final summary
    this.logger.logStudySummary(success, totalDuration, results.length, errors.length, []);

    // Clean up checkpoint on successful completion
    if (success) {
      await this.checkpointManager.deleteCheckpoint(studyId);
    }

    return ok({
      success,
      results,
      errors,
    });
  }

  /**
   * Resume study from checkpoint
   *
   * @param checkpointId - Checkpoint ID (study ID)
   * @returns Result with StudyResult or error
   */
  async resumeStudy(checkpointId: string): Promise<Result<StudyResult, StudyError>> {
    this.logger.info(`Resuming study from checkpoint: ${checkpointId}`);

    // Load checkpoint
    const checkpointResult = await this.checkpointManager.loadCheckpoint(checkpointId);
    if (!checkpointResult.success) {
      this.logger.error('Failed to load checkpoint', {
        error: checkpointResult.error.message,
      });
      return err(checkpointResult.error);
    }

    const checkpoint = checkpointResult.value;
    const config = checkpoint.config as StudyConfig;
    const startTime = Date.now();

    // Filter to only pending analyzers
    const enabledAnalyzers = config.analyzers.filter((ac) => ac.enabled);
    const pendingAnalyzers = enabledAnalyzers.filter(
      (ac) => !checkpoint.completedAnalyzers.includes(ac.type)
    );

    this.logger.info('Checkpoint loaded', {
      totalAnalyzers: enabledAnalyzers.length,
      completedAnalyzers: checkpoint.completedAnalyzers.length,
      pendingAnalyzers: pendingAnalyzers.length,
    });

    const results = [...checkpoint.results];
    const errors = [...checkpoint.errors];

    // Execute pending analyzers
    for (let i = 0; i < pendingAnalyzers.length; i++) {
      const analyzerConfig = pendingAnalyzers[i];
      const result = await this.runAnalyzerWithLogging(
        checkpointId,
        analyzerConfig.type,
        config,
        checkpoint.completedAnalyzers.length + i,
        enabledAnalyzers.length
      );

      if (result.success) {
        results.push(result.value);
        await this.saveCheckpoint(checkpointId, config, results, errors, [
          ...checkpoint.completedAnalyzers,
          analyzerConfig.type,
        ]);
      } else {
        errors.push({
          type: 'ANALYZER_FAILED',
          analyzer: analyzerConfig.type,
          cause: result.error,
        });
        await this.saveCheckpoint(checkpointId, config, results, errors, [
          ...checkpoint.completedAnalyzers,
          analyzerConfig.type,
        ]);
      }
    }

    const success = errors.length === checkpoint.errors.length; // No new errors
    const totalDuration = Date.now() - startTime;

    this.logger.logStudySummary(success, totalDuration, results.length, errors.length, []);

    // Clean up checkpoint on successful completion
    if (success) {
      await this.checkpointManager.deleteCheckpoint(checkpointId);
    }

    return ok({
      success,
      results,
      errors,
    });
  }

  /**
   * Run analyzer with logging and progress tracking
   *
   * @param studyId - Study ID
   * @param type - Analyzer type
   * @param config - Study configuration
   * @param index - Current analyzer index
   * @param total - Total number of analyzers
   * @returns Result with AnalyzerResult or error
   */
  private async runAnalyzerWithLogging(
    studyId: string,
    type: AnalyzerType,
    config: StudyConfig,
    index: number,
    total: number
  ): Promise<Result<AnalyzerResult, Error>> {
    this.logger.logAnalyzerStart(type);
    this.logger.logProgress(index, total);

    const startTime = Date.now();
    const result = await this.runAnalyzer(studyId, type, config);
    const duration = Date.now() - startTime;

    if (result.success) {
      this.logger.logAnalyzerComplete(type, duration);
      this.logger.logProgress(index + 1, total);
    } else {
      this.logger.logAnalyzerFailure(type, result.error);
    }

    return result;
  }

  /**
   * Run a single analyzer
   *
   * @param studyId - Study ID
   * @param type - Analyzer type
   * @param config - Study configuration
   * @returns Result with AnalyzerResult or error
   */
  private async runAnalyzer(
    studyId: string,
    type: AnalyzerType,
    config: StudyConfig
  ): Promise<Result<AnalyzerResult, Error>> {
    const analyzer = this.analyzers.get(type);

    if (!analyzer) {
      return err(new Error(`Analyzer not registered: ${type}`));
    }

    try {
      return await analyzer.run(config);
    } catch (error) {
      return err(error as Error);
    }
  }

  /**
   * Save checkpoint to filesystem
   *
   * @param studyId - Study ID
   * @param config - Study configuration
   * @param results - Current analyzer results
   * @param errors - Current errors
   * @param completedAnalyzers - List of completed analyzer types
   */
  private async saveCheckpoint(
    studyId: string,
    config: StudyConfig,
    results: AnalyzerResult[],
    errors: StudyError[],
    completedAnalyzers: string[]
  ): Promise<void> {
    const checkpoint: StudyCheckpoint = {
      studyId,
      createdAt: new Date(),
      completedAnalyzers,
      results,
      errors,
      config,
    };

    const result = await this.checkpointManager.saveCheckpoint(checkpoint);
    if (!result.success) {
      this.logger.warn('Failed to save checkpoint', {
        error: result.error.message,
      });
    }
  }
}
