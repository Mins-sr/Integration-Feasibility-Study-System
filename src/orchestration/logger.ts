/**
 * Structured Logger for Study Execution
 *
 * Provides JSON-formatted logging with levels and context
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

/**
 * Log Entry Structure
 */
export interface LogEntry {
  readonly timestamp: string;
  readonly level: LogLevel;
  readonly component: string;
  readonly message: string;
  readonly context?: Record<string, unknown>;
}

/**
 * Logger Service
 *
 * Responsible for:
 * - Structured JSON logging
 * - Log level filtering
 * - Progress tracking
 * - Duration measurement
 */
export class Logger {
  private readonly component: string;
  private readonly minLevel: LogLevel;

  private readonly levelPriority: Record<LogLevel, number> = {
    DEBUG: 0,
    INFO: 1,
    WARN: 2,
    ERROR: 3,
    FATAL: 4,
  };

  constructor(component: string, minLevel: LogLevel = 'INFO') {
    this.component = component;
    this.minLevel = minLevel;
  }

  /**
   * Log debug message
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log('DEBUG', message, context);
  }

  /**
   * Log info message
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log('INFO', message, context);
  }

  /**
   * Log warning message
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log('WARN', message, context);
  }

  /**
   * Log error message
   */
  error(message: string, context?: Record<string, unknown>): void {
    this.log('ERROR', message, context);
  }

  /**
   * Log fatal error message
   */
  fatal(message: string, context?: Record<string, unknown>): void {
    this.log('FATAL', message, context);
  }

  /**
   * Log study initialization
   */
  logStudyInit(targetUrl: string, enabledAnalyzers: string[]): void {
    this.info('Study initialization', {
      targetUrl,
      enabledAnalyzers,
      totalAnalyzers: enabledAnalyzers.length,
    });
  }

  /**
   * Log analyzer start
   */
  logAnalyzerStart(analyzerType: string): void {
    this.info(`Starting analyzer: ${analyzerType}`, { analyzerType });
  }

  /**
   * Log analyzer completion
   */
  logAnalyzerComplete(analyzerType: string, duration: number): void {
    this.info(`Completed analyzer: ${analyzerType}`, {
      analyzerType,
      duration,
      durationMs: duration,
    });
  }

  /**
   * Log analyzer failure
   */
  logAnalyzerFailure(analyzerType: string, error: Error): void {
    this.error(`Failed analyzer: ${analyzerType}`, {
      analyzerType,
      error: error.message,
      stack: error.stack,
    });
  }

  /**
   * Log progress
   */
  logProgress(completed: number, total: number): void {
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    this.info(`Progress: ${completed}/${total} (${progress}%)`, {
      completed,
      total,
      progress,
    });
  }

  /**
   * Log study summary
   */
  logStudySummary(
    success: boolean,
    totalDuration: number,
    resultsCount: number,
    errorsCount: number,
    reportsGenerated: string[]
  ): void {
    this.info('Study summary', {
      success,
      totalDuration,
      totalDurationMs: totalDuration,
      resultsCount,
      errorsCount,
      reportsGenerated,
    });
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    // Check log level
    if (this.levelPriority[level] < this.levelPriority[this.minLevel]) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component: this.component,
      message,
      ...(context && { context }),
    };

    // Output as JSON
    console.log(JSON.stringify(entry));
  }
}
