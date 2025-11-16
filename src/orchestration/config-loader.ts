/**
 * Configuration Loader and Validator
 *
 * Loads study configuration from YAML/JSON files and validates against schema
 */

import { readFile } from 'fs/promises';
import { parse as parseYaml } from 'yaml';
import type { Result, StudyConfig, StudyError, AnalyzerType, ReportFormat } from '@/types';
import { ok, err } from '@/types';

/**
 * Configuration Loader Service
 *
 * Responsible for:
 * - Loading configuration from YAML/JSON files
 * - Validating configuration against schema
 * - Substituting environment variables
 */
export class ConfigLoader {
  /**
   * Load configuration from file
   *
   * @param filePath - Path to configuration file (YAML or JSON)
   * @returns Result with StudyConfig or error
   */
  async loadConfig(filePath: string): Promise<Result<StudyConfig, StudyError>> {
    try {
      // Read file content
      const content = await readFile(filePath, 'utf-8');

      // Parse based on file extension
      let parsed: unknown;
      if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
        parsed = parseYaml(content);
      } else if (filePath.endsWith('.json')) {
        parsed = JSON.parse(content);
      } else {
        return err({
          type: 'CONFIG_INVALID',
          message: 'Unsupported configuration file format. Use .yaml, .yml, or .json',
          field: 'file',
        });
      }

      // Substitute environment variables
      const substituted = this.substituteEnvVars(parsed);

      // Validate configuration
      return this.validateConfig(substituted);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return err({
          type: 'CONFIG_NOT_FOUND',
          message: `Configuration file not found: ${filePath}`,
        });
      }

      return err({
        type: 'CONFIG_INVALID',
        message: `Failed to parse configuration file: ${(error as Error).message}`,
        field: 'file',
      });
    }
  }

  /**
   * Validate configuration against schema
   *
   * @param config - Raw configuration object
   * @returns Result with validated StudyConfig or error
   */
  validateConfig(config: unknown): Result<StudyConfig, StudyError> {
    // Type guard to check if value is an object
    if (!this.isObject(config)) {
      return err({
        type: 'CONFIG_INVALID',
        message: 'Configuration must be an object',
        field: 'root',
      });
    }

    // Validate target
    const targetResult = this.validateTarget(config);
    if (!targetResult.success) {
      return targetResult;
    }

    // Validate analyzers
    const analyzersResult = this.validateAnalyzers(config);
    if (!analyzersResult.success) {
      return analyzersResult;
    }

    // Validate reportFormats
    const reportFormatsResult = this.validateReportFormats(config);
    if (!reportFormatsResult.success) {
      return reportFormatsResult;
    }

    // Validate parallelExecution
    if (!('parallelExecution' in config) || typeof config.parallelExecution !== 'boolean') {
      return err({
        type: 'CONFIG_INVALID',
        message: 'parallelExecution must be a boolean',
        field: 'parallelExecution',
      });
    }

    // Validate auth (optional)
    if ('auth' in config && config.auth !== undefined) {
      const authResult = this.validateAuth(config.auth);
      if (!authResult.success) {
        return authResult;
      }
    }

    // All validations passed
    return ok(config as StudyConfig);
  }

  /**
   * Validate target configuration
   */
  private validateTarget(config: Record<string, unknown>): Result<void, StudyError> {
    if (!('target' in config) || !this.isObject(config.target)) {
      return err({
        type: 'CONFIG_INVALID',
        message: 'target configuration is required',
        field: 'target',
      });
    }

    const target = config.target;

    // Validate URL
    if (!('url' in target) || typeof target.url !== 'string') {
      return err({
        type: 'CONFIG_INVALID',
        message: 'target.url is required and must be a string',
        field: 'target.url',
      });
    }

    // Validate URL scheme (only http/https allowed)
    if (!target.url.startsWith('http://') && !target.url.startsWith('https://')) {
      return err({
        type: 'CONFIG_INVALID',
        message: 'target.url must use http:// or https:// scheme',
        field: 'target.url',
      });
    }

    // Validate timeout (optional)
    if ('timeout' in target && target.timeout !== undefined) {
      if (typeof target.timeout !== 'number' || target.timeout <= 0) {
        return err({
          type: 'CONFIG_INVALID',
          message: 'target.timeout must be a positive number',
          field: 'target.timeout',
        });
      }
    }

    return ok(undefined);
  }

  /**
   * Validate analyzers array
   */
  private validateAnalyzers(config: Record<string, unknown>): Result<void, StudyError> {
    if (!('analyzers' in config) || !Array.isArray(config.analyzers)) {
      return err({
        type: 'CONFIG_INVALID',
        message: 'analyzers must be an array',
        field: 'analyzers',
      });
    }

    if (config.analyzers.length === 0) {
      return err({
        type: 'CONFIG_INVALID',
        message: 'analyzers must contain at least one analyzer',
        field: 'analyzers',
      });
    }

    const validAnalyzerTypes: AnalyzerType[] = ['PERFORMANCE', 'SECURITY', 'COST', 'RISK'];

    for (let i = 0; i < config.analyzers.length; i++) {
      const analyzer = config.analyzers[i];

      if (!this.isObject(analyzer)) {
        return err({
          type: 'CONFIG_INVALID',
          message: `Analyzer at index ${i} must be an object`,
          field: `analyzers[${i}]`,
        });
      }

      // Validate type
      if (!('type' in analyzer) || !validAnalyzerTypes.includes(analyzer.type as AnalyzerType)) {
        return err({
          type: 'CONFIG_INVALID',
          message: `Analyzer type must be one of: ${validAnalyzerTypes.join(', ')}`,
          field: `analyzers[${i}].type`,
        });
      }

      // Validate enabled
      if (!('enabled' in analyzer) || typeof analyzer.enabled !== 'boolean') {
        return err({
          type: 'CONFIG_INVALID',
          message: 'Analyzer must have enabled boolean property',
          field: `analyzers[${i}].enabled`,
        });
      }

      // Validate options for specific analyzer types
      if ('options' in analyzer && analyzer.options !== undefined) {
        const optionsResult = this.validateAnalyzerOptions(analyzer.type as AnalyzerType, analyzer.options, i);
        if (!optionsResult.success) {
          return optionsResult;
        }
      }
    }

    return ok(undefined);
  }

  /**
   * Validate analyzer-specific options
   */
  private validateAnalyzerOptions(
    type: AnalyzerType,
    options: unknown,
    index: number
  ): Result<void, StudyError> {
    if (!this.isObject(options)) {
      return err({
        type: 'CONFIG_INVALID',
        message: 'Analyzer options must be an object',
        field: `analyzers[${index}].options`,
      });
    }

    switch (type) {
      case 'PERFORMANCE':
        return this.validatePerformanceOptions(options, index);
      case 'SECURITY':
        return this.validateSecurityOptions(options, index);
      case 'COST':
        return this.validateCostOptions(options, index);
      case 'RISK':
        return this.validateRiskOptions(options, index);
      default:
        return ok(undefined);
    }
  }

  /**
   * Validate performance analyzer options
   */
  private validatePerformanceOptions(options: Record<string, unknown>, index: number): Result<void, StudyError> {
    if ('duration' in options && typeof options.duration === 'number') {
      if (options.duration < 10) {
        return err({
          type: 'CONFIG_INVALID',
          message: 'Performance test duration must be at least 10 seconds',
          field: `analyzers[${index}].options.duration`,
        });
      }
    }

    if ('concurrency' in options) {
      if (!Array.isArray(options.concurrency)) {
        return err({
          type: 'CONFIG_INVALID',
          message: 'Concurrency must be an array of numbers',
          field: `analyzers[${index}].options.concurrency`,
        });
      }

      for (const c of options.concurrency) {
        if (typeof c !== 'number' || c <= 0) {
          return err({
            type: 'CONFIG_INVALID',
            message: 'Concurrency values must be positive numbers',
            field: `analyzers[${index}].options.concurrency`,
          });
        }
      }
    }

    return ok(undefined);
  }

  /**
   * Validate security analyzer options
   */
  private validateSecurityOptions(options: Record<string, unknown>, index: number): Result<void, StudyError> {
    if ('scanType' in options) {
      if (options.scanType !== 'passive' && options.scanType !== 'active') {
        return err({
          type: 'CONFIG_INVALID',
          message: 'Security scan type must be "passive" or "active"',
          field: `analyzers[${index}].options.scanType`,
        });
      }
    }

    return ok(undefined);
  }

  /**
   * Validate cost analyzer options
   */
  private validateCostOptions(options: Record<string, unknown>, index: number): Result<void, StudyError> {
    if ('expectedTraffic' in options && this.isObject(options.expectedTraffic)) {
      const traffic = options.expectedTraffic;

      if ('requestsPerMonth' in traffic && typeof traffic.requestsPerMonth === 'number') {
        if (traffic.requestsPerMonth < 0) {
          return err({
            type: 'CONFIG_INVALID',
            message: 'Expected requests per month must be non-negative',
            field: `analyzers[${index}].options.expectedTraffic.requestsPerMonth`,
          });
        }
      }
    }

    return ok(undefined);
  }

  /**
   * Validate risk analyzer options
   */
  private validateRiskOptions(_options: Record<string, unknown>, _index: number): Result<void, StudyError> {
    // Risk analyzer options are flexible, no strict validation needed
    return ok(undefined);
  }

  /**
   * Validate report formats
   */
  private validateReportFormats(config: Record<string, unknown>): Result<void, StudyError> {
    if (!('reportFormats' in config) || !Array.isArray(config.reportFormats)) {
      return err({
        type: 'CONFIG_INVALID',
        message: 'reportFormats must be an array',
        field: 'reportFormats',
      });
    }

    const validFormats: ReportFormat[] = ['OPENAPI', 'MARKDOWN', 'JSON'];

    for (const format of config.reportFormats) {
      if (!validFormats.includes(format as ReportFormat)) {
        return err({
          type: 'CONFIG_INVALID',
          message: `Report format must be one of: ${validFormats.join(', ')}`,
          field: 'reportFormats',
        });
      }
    }

    return ok(undefined);
  }

  /**
   * Validate authentication configuration
   */
  private validateAuth(auth: unknown): Result<void, StudyError> {
    if (!this.isObject(auth)) {
      return err({
        type: 'CONFIG_INVALID',
        message: 'auth must be an object',
        field: 'auth',
      });
    }

    if (!('type' in auth)) {
      return err({
        type: 'CONFIG_INVALID',
        message: 'auth.type is required',
        field: 'auth.type',
      });
    }

    const validAuthTypes = ['OAUTH2', 'API_KEY', 'JWT'];
    if (!validAuthTypes.includes(auth.type as string)) {
      return err({
        type: 'CONFIG_INVALID',
        message: `auth.type must be one of: ${validAuthTypes.join(', ')}`,
        field: 'auth.type',
      });
    }

    return ok(undefined);
  }

  /**
   * Substitute environment variables in configuration
   *
   * Replaces ${VAR_NAME} with process.env.VAR_NAME
   */
  private substituteEnvVars(obj: unknown): unknown {
    if (typeof obj === 'string') {
      // Replace ${VAR_NAME} with environment variable
      const substituted = obj.replace(/\$\{([^}]+)\}/g, (_match, varName) => {
        const value = process.env[varName];
        return value ?? '';
      });

      // Try to convert to number if the entire string is a number
      if (substituted !== obj && /^\d+$/.test(substituted)) {
        return parseInt(substituted, 10);
      }

      return substituted;
    }

    if (Array.isArray(obj)) {
      return obj.map((item) => this.substituteEnvVars(item));
    }

    if (this.isObject(obj)) {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.substituteEnvVars(value);
      }
      return result;
    }

    return obj;
  }

  /**
   * Type guard to check if value is an object
   */
  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
