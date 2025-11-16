/**
 * Configuration Types for Integration Feasibility Study
 *
 * These types define the configuration structure for studies, targets, and analyzers.
 */

import { AnalyzerType, ReportFormat } from './domain-entities';

/**
 * HTTP Method Type
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Target API Configuration
 */
export interface TargetConfig {
  readonly url: string;
  readonly method?: HttpMethod;
  readonly headers?: Record<string, string>;
  readonly body?: unknown;
  readonly timeout?: number;
}

/**
 * Authentication Type
 */
export type AuthType = 'OAUTH2' | 'API_KEY' | 'JWT';

/**
 * OAuth2 Authentication Configuration
 */
export interface OAuth2Config {
  readonly type: 'OAUTH2';
  readonly clientId: string;
  readonly clientSecret: string;
  readonly tokenUrl: string;
  readonly scope?: string;
}

/**
 * API Key Authentication Configuration
 */
export interface ApiKeyConfig {
  readonly type: 'API_KEY';
  readonly key: string;
  readonly location: 'header' | 'query';
  readonly headerName?: string;
  readonly queryParamName?: string;
}

/**
 * JWT Authentication Configuration
 */
export interface JwtConfig {
  readonly type: 'JWT';
  readonly token: string;
}

/**
 * Authentication Configuration Union Type
 */
export type AuthConfig = OAuth2Config | ApiKeyConfig | JwtConfig;

/**
 * Performance Analyzer Configuration
 */
export interface PerformanceAnalyzerConfig {
  readonly type: 'PERFORMANCE';
  readonly enabled: boolean;
  readonly options?: {
    readonly concurrency?: number[];
    readonly duration?: number;
    readonly rampUp?: number;
  };
}

/**
 * Security Analyzer Configuration
 */
export interface SecurityAnalyzerConfig {
  readonly type: 'SECURITY';
  readonly enabled: boolean;
  readonly options?: {
    readonly scanType?: 'passive' | 'active';
    readonly complianceChecks?: Array<'GDPR' | 'PCI-DSS' | 'HIPAA'>;
  };
}

/**
 * Cost Analyzer Configuration
 */
export interface CostAnalyzerConfig {
  readonly type: 'COST';
  readonly enabled: boolean;
  readonly options?: {
    readonly service?: string;
    readonly expectedTraffic?: {
      readonly requestsPerMonth: number;
      readonly dataTransferGB: number;
    };
  };
}

/**
 * Risk Analyzer Configuration
 */
export interface RiskAnalyzerConfig {
  readonly type: 'RISK';
  readonly enabled: boolean;
  readonly options?: {
    readonly existingStack?: {
      readonly language: string;
      readonly frameworks: string[];
      readonly libraries: Record<string, string>;
    };
  };
}

/**
 * Analyzer Configuration Union Type
 */
export type AnalyzerConfig =
  | PerformanceAnalyzerConfig
  | SecurityAnalyzerConfig
  | CostAnalyzerConfig
  | RiskAnalyzerConfig;

/**
 * Study Configuration
 */
export interface StudyConfig {
  readonly target: TargetConfig;
  readonly analyzers: AnalyzerConfig[];
  readonly reportFormats: ReportFormat[];
  readonly parallelExecution: boolean;
  readonly auth?: AuthConfig;
}
