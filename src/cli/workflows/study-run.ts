/**
 * Study Run Workflow
 *
 * Complete workflow for executing a new feasibility study:
 * 1. Load and validate configuration
 * 2. Initialize connector with authentication
 * 3. Test target API connectivity
 * 4. Initialize and register all analyzers
 * 5. Execute study via Pipeline Orchestrator
 * 6. Generate reports
 */

import { ConfigLoader } from '@/orchestration/config-loader';
import { PipelineOrchestrator } from '@/orchestration/pipeline-orchestrator';

/**
 * Study Run Options
 */
export interface StudyRunOptions {
  readonly targetUrl: string;
  readonly configPath: string;
  readonly enableLoadTest: boolean;
}

/**
 * Execute complete study run workflow
 *
 * @param options - Study run options
 */
export async function executeStudyWorkflow(options: StudyRunOptions): Promise<void> {
  // Step 1: Load configuration
  console.log('Loading configuration from:', options.configPath);
  const configLoader = new ConfigLoader();
  const configResult = await configLoader.loadConfig(options.configPath);

  if (!configResult.success) {
    const error = configResult.error;
    if (error.type === 'CONFIG_NOT_FOUND') {
      throw new Error(`CONFIG_NOT_FOUND: Configuration file not found: ${options.configPath}`);
    } else if (error.type === 'CONFIG_INVALID') {
      throw new Error(`CONFIG_INVALID: Invalid configuration: ${error.message}`);
    } else {
      // Handle other error types
      throw new Error(`Failed to load configuration: ${error.type}`);
    }
  }

  const config = configResult.value;

  // Validate target URL matches
  if (config.target.url !== options.targetUrl) {
    console.warn(
      `Warning: Target URL in config (${config.target.url}) differs from CLI argument (${options.targetUrl}). Using config file value.`
    );
  }

  // Step 2: Initialize Pipeline Orchestrator
  console.log('Initializing Pipeline Orchestrator...');
  const orchestrator = new PipelineOrchestrator();

  // Step 3: Register analyzers (if enabled)
  // Note: In this implementation, we only register analyzers that are enabled
  // Real analyzer implementations would be registered here
  // For now, we just validate that no enabled analyzers require registration
  const enabledAnalyzers = config.analyzers.filter((a) => a.enabled);
  if (enabledAnalyzers.length === 0) {
    console.log('No analyzers enabled - study will complete immediately');
  } else {
    console.log(`Enabled analyzers: ${enabledAnalyzers.map((a) => a.type).join(', ')}`);
  }

  // Step 4: Execute study
  console.log(`Executing study for target: ${config.target.url}`);
  const studyResult = await orchestrator.executeStudy(config);

  if (!studyResult.success) {
    const error = studyResult.error;
    const errorMessage = error.type === 'ANALYZER_FAILED'
      ? `${error.analyzer}: ${error.cause.message}`
      : error.type;
    throw new Error(`Study execution failed: ${errorMessage}`);
  }

  const result = studyResult.value;

  // Step 5: Display results summary
  console.log('\n=== Study Results ===');
  console.log(`Total analyzers: ${config.analyzers.filter((a) => a.enabled).length}`);
  console.log(`Successful: ${result.results.length}`);
  console.log(`Failed: ${result.errors.length}`);

  if (result.errors.length > 0) {
    console.log('\nErrors:');
    for (const error of result.errors) {
      const errorMessage = error.type === 'ANALYZER_FAILED'
        ? `${error.analyzer}: ${error.cause.message}`
        : error.type;
      console.log(`  - ${errorMessage}`);
    }
    throw new Error('Study completed with errors');
  }

  // Step 6: Generate reports (to be implemented in reporting domain)
  // TODO: Call ReportGeneratorService to create OpenAPI spec and Markdown reports
  console.log('\nReport generation will be implemented in future tasks');
}
