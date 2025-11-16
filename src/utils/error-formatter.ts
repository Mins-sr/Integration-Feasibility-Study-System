/**
 * Error Formatter Utilities
 *
 * Provides human-readable error messages with actionable troubleshooting steps.
 * Implements Task 12.1: Comprehensive error handling.
 */

import type { TestError, ScanError, StudyError, HttpError, AnalysisError, ReportError } from '@/types/error-types';

/**
 * Format TestError with actionable troubleshooting steps
 */
export function formatTestError(error: TestError): string {
  switch (error.type) {
    case 'JMETER_NOT_FOUND':
      return `${error.message}

Troubleshooting steps:
1. Install JMeter from https://jmeter.apache.org/download_jmeter.cgi
2. Add JMeter bin directory to your PATH environment variable
3. Verify installation: jmeter --version`;

    case 'TEST_TIMEOUT':
      return `Test timed out after ${error.duration / 1000} seconds. The target API may be slow or unresponsive.

Possible solutions:
- Increase timeout duration in configuration
- Check target API performance
- Verify network connectivity`;

    case 'TARGET_UNREACHABLE':
      return `Target API is unreachable: ${error.cause.message}

Check:
- Network connectivity
- Firewall settings
- Target URL is correct
- API service is running`;
  }
}

/**
 * Format ScanError with troubleshooting steps
 */
export function formatScanError(error: ScanError): string {
  switch (error.type) {
    case 'ZAP_NOT_RUNNING':
      return `${error.message}

Troubleshooting steps:
1. Start ZAP daemon: zap.sh -daemon -port 8080
2. Verify ZAP is running: curl http://localhost:8080
3. Check ZAP logs for errors`;

    case 'SCAN_TIMEOUT':
      return `Security scan timed out after ${error.duration / 1000} seconds. The scan may need more time.

Possible solutions:
- Increase scan timeout duration
- Use passive scan instead of active scan
- Reduce scan scope`;

    case 'TARGET_UNREACHABLE':
      return `Target API is unreachable during security scan: ${error.cause.message}

Check:
- Target API is accessible
- Network connectivity
- ZAP can reach the target URL`;
  }
}

/**
 * Format StudyError with field-specific guidance
 */
export function formatStudyError(error: StudyError): string {
  switch (error.type) {
    case 'CONFIG_INVALID':
      return `Configuration Error
Field: ${error.field}
Error: ${error.message}

Example: {
  "target": {
    "url": "https://api.example.com"
  },
  "analyzers": ["performance", "security"]
}`;

    case 'CONFIG_NOT_FOUND':
      return `Configuration file not found: ${error.message}

Please create a study.yaml or study.json configuration file.
Example location: ./study-config.yaml`;

    case 'ANALYZER_FAILED':
      return `Analyzer "${error.analyzer}" failed: ${error.cause.message}

This analyzer has failed but other analyzers may continue.
Check logs for detailed error information.`;

    case 'REPORT_GENERATION_FAILED':
      return `Report generation failed: ${error.cause.message}

Possible causes:
- Disk space issues
- File permission errors
- Template rendering errors`;

    case 'CHECKPOINT_NOT_FOUND':
      return `Checkpoint not found: ${error.message}

Cannot resume study. Please run a new study instead.`;

    case 'CHECKPOINT_INVALID':
      return `Invalid checkpoint: ${error.message}

The checkpoint file may be corrupted or outdated.
Please run a new study instead of resuming.`;
  }
}

/**
 * Format HttpError with connection details
 */
export function formatHttpError(error: HttpError): string {
  switch (error.type) {
    case 'RATE_LIMIT_EXCEEDED':
      return `Rate limit exceeded. Retry after ${error.retryAfter} seconds.

The API has rate-limited this request.
Automatic retry will occur after the specified wait time.`;

    case 'AUTH_FAILED':
      return `Authentication failed: ${error.reason}

Check:
- API credentials are correct
- Token has not expired
- Correct authentication method is configured`;

    case 'TIMEOUT':
      return `Request timed out after ${error.duration / 1000} seconds. Check network connectivity.

Possible solutions:
- Increase timeout configuration
- Check target API responsiveness
- Verify network stability`;

    case 'NETWORK_ERROR':
      return `Network error: ${error.cause.message}

Check:
- Internet connection
- Firewall settings
- Proxy configuration
- DNS resolution`;

    case 'VALIDATION_ERROR':
      return `Request validation error: ${error.message}

The request does not meet API requirements.
Check API documentation for correct request format.`;
  }
}

/**
 * Format AnalysisError with context
 */
export function formatAnalysisError(error: AnalysisError): string {
  switch (error.type) {
    case 'PRICING_DATA_NOT_FOUND':
      return `Pricing data not found for service: ${error.service}

The pricing database does not contain information for this service.
Please update the pricing database or contact support.`;

    case 'INVALID_TRAFFIC_ESTIMATE':
      return `Invalid traffic estimate: ${error.message}

Traffic estimates must be:
- Positive numbers
- Within realistic ranges
- Specified in requests per month`;
  }
}

/**
 * Format ReportError with generation details
 */
export function formatReportError(error: ReportError): string {
  switch (error.type) {
    case 'TEMPLATE_NOT_FOUND':
      return `Report template not found: ${error.templateName}

Check:
- Template file exists in templates/ directory
- Template name is spelled correctly
- Default templates are available`;

    case 'GENERATION_FAILED':
      return `Report generation failed: ${error.cause.message}

Possible causes:
- Template rendering error
- Data format mismatch
- File system issues`;
  }
}

/**
 * Format file system errors with troubleshooting
 */
export function formatFileSystemError(fsError: Error): string {
  const message = fsError.message;

  if (message.includes('EACCES') || message.includes('EPERM')) {
    return `Permission denied when accessing file system.

Troubleshooting:
- Check file/directory permissions
- Run with appropriate user privileges
- Verify ownership of target files`;
  }

  if (message.includes('ENOSPC')) {
    return `No space left on device.

Solutions:
- Free up disk space
- Change output directory to a location with more space
- Clean up temporary files`;
  }

  if (message.includes('ENOENT')) {
    return `File or directory not found: ${message}

Check:
- Path exists and is spelled correctly
- Parent directories exist
- File has not been moved or deleted`;
  }

  // Generic file system error
  return `File system error: ${message}

Please check file system access and try again.`;
}

/**
 * Master error formatter that routes to specific formatters
 */
export function formatError(
  error: TestError | ScanError | StudyError | HttpError | AnalysisError | ReportError
): string {
  // Type narrowing based on error type property
  if ('type' in error) {
    switch (error.type) {
      // TestError types
      case 'JMETER_NOT_FOUND':
      case 'TEST_TIMEOUT':
        return formatTestError(error as TestError);

      // ScanError types
      case 'ZAP_NOT_RUNNING':
      case 'SCAN_TIMEOUT':
        return formatScanError(error as ScanError);

      // StudyError types
      case 'CONFIG_INVALID':
      case 'CONFIG_NOT_FOUND':
      case 'ANALYZER_FAILED':
      case 'REPORT_GENERATION_FAILED':
      case 'CHECKPOINT_NOT_FOUND':
      case 'CHECKPOINT_INVALID':
        return formatStudyError(error as StudyError);

      // HttpError types
      case 'RATE_LIMIT_EXCEEDED':
      case 'AUTH_FAILED':
      case 'TIMEOUT':
      case 'NETWORK_ERROR':
      case 'VALIDATION_ERROR':
        return formatHttpError(error as HttpError);

      // AnalysisError types
      case 'PRICING_DATA_NOT_FOUND':
      case 'INVALID_TRAFFIC_ESTIMATE':
        return formatAnalysisError(error as AnalysisError);

      // ReportError types
      case 'TEMPLATE_NOT_FOUND':
      case 'GENERATION_FAILED':
        return formatReportError(error as ReportError);

      // TARGET_UNREACHABLE can be both TestError and ScanError
      case 'TARGET_UNREACHABLE':
        // Try to infer which type based on error structure
        if ('duration' in error) {
          return formatScanError(error as ScanError);
        }
        return formatTestError(error as TestError);
    }
  }

  return 'Unknown error occurred';
}
