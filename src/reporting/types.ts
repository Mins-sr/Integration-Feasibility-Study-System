/**
 * Reporting Domain Types
 *
 * Type definitions for report generation and data aggregation
 */

import type { AnalyzerResult } from '@/types/domain-entities';

/**
 * Aggregated study result containing all analyzer outputs
 */
export interface AggregatedStudyResult {
  readonly analyzerResults: readonly AnalyzerResult[];
  readonly hasPerformanceData: boolean;
  readonly hasSecurityData: boolean;
  readonly hasCostData: boolean;
  readonly hasRiskData: boolean;
}

/**
 * Report generation error types
 */
export type ReportGenerationError =
  | { type: 'VALIDATION_ERROR'; message: string }
  | { type: 'TEMPLATE_NOT_FOUND'; templateName: string }
  | { type: 'GENERATION_FAILED'; cause: Error };

/**
 * OpenAPI 3.1.0 Specification types
 */
export interface OpenAPISpec {
  readonly openapi: '3.1.0';
  readonly info: OpenAPIInfo;
  readonly servers?: readonly OpenAPIServer[];
  readonly paths?: Record<string, OpenAPIPathItem>;
  readonly components?: OpenAPIComponents;
}

export interface OpenAPIInfo {
  readonly title: string;
  readonly version: string;
  readonly description?: string;
}

export interface OpenAPIServer {
  readonly url: string;
  readonly description?: string;
}

export interface OpenAPIPathItem {
  readonly summary?: string;
  readonly description?: string;
  readonly get?: OpenAPIOperation;
  readonly post?: OpenAPIOperation;
  readonly put?: OpenAPIOperation;
  readonly delete?: OpenAPIOperation;
  readonly patch?: OpenAPIOperation;
}

export interface OpenAPIOperation {
  readonly summary?: string;
  readonly description?: string;
  readonly operationId?: string;
  readonly parameters?: readonly OpenAPIParameter[];
  readonly responses?: Record<string, OpenAPIResponse>;
  readonly security?: readonly Record<string, string[]>[];
}

export interface OpenAPIParameter {
  readonly name: string;
  readonly in: 'query' | 'header' | 'path' | 'cookie';
  readonly description?: string;
  readonly required?: boolean;
  readonly schema?: Record<string, unknown>;
}

export interface OpenAPIResponse {
  readonly description: string;
  readonly content?: Record<string, OpenAPIMediaType>;
}

export interface OpenAPIMediaType {
  readonly schema?: Record<string, unknown>;
}

export interface OpenAPIComponents {
  readonly schemas?: Record<string, unknown>;
  readonly securitySchemes?: Record<string, OpenAPISecurityScheme>;
}

export type OpenAPISecurityScheme =
  | {
      readonly type: 'apiKey';
      readonly name: string;
      readonly in: 'query' | 'header' | 'cookie';
      readonly description?: string;
    }
  | {
      readonly type: 'http';
      readonly scheme: 'bearer' | 'basic';
      readonly bearerFormat?: string;
      readonly description?: string;
    }
  | {
      readonly type: 'oauth2';
      readonly flows: Record<string, OpenAPIOAuth2Flow>;
      readonly description?: string;
    };

export interface OpenAPIOAuth2Flow {
  readonly authorizationUrl?: string;
  readonly tokenUrl?: string;
  readonly refreshUrl?: string;
  readonly scopes?: Record<string, string>;
}

/**
 * OpenAPI generation configuration
 */
export interface OpenAPIGenerationConfig {
  readonly targetUrl: string;
  readonly apiTitle: string;
  readonly apiVersion: string;
  readonly apiDescription?: string;
}

/**
 * Markdown report generation configuration
 */
export interface MarkdownGenerationConfig {
  readonly studyId: string;
  readonly targetUrl: string;
  readonly generatedAt: Date;
}

/**
 * Report generation request
 */
export interface ReportGenerationRequest {
  readonly studyId: string;
  readonly targetUrl: string;
  readonly apiTitle: string;
  readonly apiVersion: string;
  readonly apiDescription?: string;
  readonly analyzerResults: readonly AnalyzerResult[];
  readonly outputDir?: string;
}

/**
 * Generated report metadata
 */
export interface GeneratedReport {
  readonly path: string;
  readonly content: string;
}

/**
 * Complete report generation result
 */
export interface GeneratedReports {
  readonly openApiSpec: {
    readonly path: string;
    readonly content: OpenAPISpec;
  };
  readonly markdownReport: GeneratedReport;
}
