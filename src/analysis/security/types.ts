/**
 * Security Analysis Types
 *
 * Type definitions for security scanning and vulnerability assessment.
 */

import type { TargetConfig } from '@/types/config-types';

/**
 * Security Scan Configuration
 */
export interface SecurityScanConfig {
  readonly target: TargetConfig;
  readonly scanType: 'passive' | 'active'; // passive=non-intrusive, active=intrusive
  readonly complianceChecks: ReadonlyArray<'GDPR' | 'PCI-DSS' | 'HIPAA'>;
}

/**
 * Authentication Method Information
 */
export interface AuthMethod {
  readonly type: string; // e.g., 'OAuth2', 'API Key', 'JWT'
  readonly details: string;
}

/**
 * Vulnerability Finding
 */
export interface Vulnerability {
  readonly id: string; // OWASP ZAP vulnerability ID
  readonly name: string;
  readonly severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Info';
  readonly description: string;
  readonly recommendation: string;
  readonly falsePositiveRisk: 'High' | 'Medium' | 'Low';
}

/**
 * Vulnerability Report
 */
export interface VulnerabilityReport {
  readonly tlsVersion: string; // e.g., 'TLS 1.2', 'TLS 1.3'
  readonly authMethods: AuthMethod[];
  readonly vulnerabilities: Vulnerability[];
  readonly complianceStatus: Record<string, boolean>; // e.g., { 'GDPR': true, 'PCI-DSS': false }
}

/**
 * OWASP ZAP Installation Verification Result
 */
export interface ZAPInstallationInfo {
  readonly running: boolean;
  readonly version?: string;
  readonly apiUrl?: string;
}

/**
 * OWASP ZAP Scan Progress Information
 */
export interface ZAPScanProgress {
  readonly scanId: string;
  readonly progress: number; // percentage 0-100
  readonly status: 'running' | 'completed' | 'failed';
}
