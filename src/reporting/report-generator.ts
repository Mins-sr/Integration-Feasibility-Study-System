/**
 * Report Generator Service
 *
 * Orchestrates the complete report generation workflow:
 * 1. Data aggregation from analyzer results
 * 2. OpenAPI specification generation
 * 3. Markdown report generation
 * 4. File management (saving reports to disk)
 * 5. Template fallback mechanism (embedded defaults)
 */

import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import type { Result } from '@/types/result';
import { ok, err } from '@/types/result';
import type {
  ReportGenerationRequest,
  GeneratedReports,
  ReportGenerationError,
} from './types';
import { DataAggregator } from './data-aggregator';
import { OpenAPIGenerator } from './openapi-generator';
import { MarkdownGenerator } from './markdown-generator';

export class ReportGenerator {
  private readonly dataAggregator: DataAggregator;
  private readonly openApiGenerator: OpenAPIGenerator;
  private readonly markdownGenerator: MarkdownGenerator;
  private readonly defaultOutputDir: string;

  constructor() {
    this.dataAggregator = new DataAggregator();
    this.openApiGenerator = new OpenAPIGenerator();
    this.markdownGenerator = new MarkdownGenerator();
    this.defaultOutputDir = '.study-results/reports';
  }

  /**
   * Generate complete reports (OpenAPI + Markdown) from analyzer results
   *
   * This is the main entry point for report generation. It:
   * - Aggregates analyzer results
   * - Generates OpenAPI specification
   * - Generates Markdown report
   * - Saves both reports to filesystem
   *
   * @param request - Report generation request
   * @returns Generated reports with file paths or error
   */
  async generateReports(
    request: ReportGenerationRequest
  ): Promise<Result<GeneratedReports, ReportGenerationError>> {
    try {
      // Step 1: Aggregate analyzer results
      const aggregateResult = this.dataAggregator.aggregate(request.analyzerResults);
      if (!aggregateResult.success) {
        return aggregateResult;
      }

      const aggregated = aggregateResult.value;

      // Step 2: Generate OpenAPI specification
      const openApiResult = this.openApiGenerator.generate(aggregated, {
        targetUrl: request.targetUrl,
        apiTitle: request.apiTitle,
        apiVersion: request.apiVersion,
        apiDescription: request.apiDescription,
      });

      if (!openApiResult.success) {
        return openApiResult;
      }

      // Step 3: Serialize OpenAPI spec to JSON
      const openApiJsonResult = this.openApiGenerator.serialize(openApiResult.value);
      if (!openApiJsonResult.success) {
        return openApiJsonResult;
      }

      // Step 4: Generate Markdown report
      const markdownResult = this.markdownGenerator.generate(aggregated, {
        studyId: request.studyId,
        targetUrl: request.targetUrl,
        generatedAt: new Date(),
      });

      if (!markdownResult.success) {
        return markdownResult;
      }

      // Step 5: Determine output directory and file paths
      const outputDir = request.outputDir || this.defaultOutputDir;
      const studyOutputDir = join(outputDir, request.studyId);
      const openApiPath = join(studyOutputDir, `${request.studyId}.openapi.json`);
      const markdownPath = join(studyOutputDir, `${request.studyId}.md`);

      // Step 6: Create output directory
      await this.ensureDirectoryExists(studyOutputDir);

      // Step 7: Write reports to filesystem
      await this.writeReportFile(openApiPath, openApiJsonResult.value);
      await this.writeReportFile(markdownPath, markdownResult.value);

      // Step 8: Return generated reports
      const reports: GeneratedReports = {
        openApiSpec: {
          path: openApiPath,
          content: openApiResult.value,
        },
        markdownReport: {
          path: markdownPath,
          content: markdownResult.value,
        },
      };

      return ok(reports);
    } catch (error) {
      return err({
        type: 'GENERATION_FAILED',
        cause: error instanceof Error ? error : new Error(String(error)),
      });
    }
  }

  /**
   * Ensure directory exists, creating it recursively if necessary
   *
   * @param dirPath - Directory path to create
   */
  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Check if error is because directory already exists
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== 'EEXIST') {
        throw error;
      }
    }
  }

  /**
   * Write report content to file
   *
   * @param filePath - Target file path
   * @param content - Report content to write
   */
  private async writeReportFile(filePath: string, content: string): Promise<void> {
    try {
      // Ensure parent directory exists
      const parentDir = dirname(filePath);
      await this.ensureDirectoryExists(parentDir);

      // Write file
      await writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write report file ${filePath}: ${error}`);
    }
  }
}
