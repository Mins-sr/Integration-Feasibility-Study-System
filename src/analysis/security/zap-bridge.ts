/**
 * OWASP ZAP Integration Bridge
 *
 * Provides integration with OWASP ZAP API for security vulnerability scanning.
 * Supports both passive (non-intrusive) and active (intrusive) scanning modes.
 */

import axios from 'axios';
import type { Result } from '@/types/result';
import type { ScanError } from '@/types/error-types';
import type {
  SecurityScanConfig,
  VulnerabilityReport,
  ZAPInstallationInfo,
  ZAPScanProgress,
  Vulnerability,
  AuthMethod,
} from './types';

/**
 * ZAP Bridge for security scanning operations
 */
export class ZAPBridge {
  private readonly zapApiUrl: string;
  private readonly defaultTimeout = 30000; // 30 seconds

  /**
   * Initialize ZAP Bridge with API URL
   * @param zapApiUrl - ZAP API base URL (e.g., 'http://localhost:8080')
   */
  constructor(zapApiUrl: string = 'http://localhost:8080') {
    this.zapApiUrl = zapApiUrl;
  }

  /**
   * Verify that OWASP ZAP is running and reachable via API
   * @returns Installation info with version if available
   */
  async verifyInstallation(): Promise<Result<ZAPInstallationInfo, ScanError>> {
    try {
      const response = await axios.get(
        `${this.zapApiUrl}/JSON/core/view/version/`,
        {
          timeout: 5000, // Quick check
        }
      );

      if (response.status !== 200) {
        return {
          success: false,
          error: {
            type: 'ZAP_NOT_RUNNING',
            message: `ZAP API returned status ${response.status}`,
          },
        };
      }

      const version = response.data.version || response.data;

      return {
        success: true,
        value: {
          running: true,
          version: typeof version === 'string' ? version : String(version),
          apiUrl: this.zapApiUrl,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'ZAP_NOT_RUNNING',
          message: `OWASP ZAP is not reachable at ${this.zapApiUrl}. Please ensure ZAP is running.`,
        },
      };
    }
  }

  /**
   * Start a passive scan (non-intrusive)
   * @param targetUrl - Target URL to scan
   * @returns Scan ID for tracking progress
   */
  async startPassiveScan(
    targetUrl: string
  ): Promise<Result<ZAPScanProgress, ScanError>> {
    try {
      // Enable all passive scanners
      const enableResponse = await axios.post(
        `${this.zapApiUrl}/JSON/pscan/action/enableAllScanners/`,
        {},
        { params: {} }
      );

      // The scanId is returned in the response data
      const scanId = enableResponse.data.scanId || `scan-${Date.now()}`;

      return {
        success: true,
        value: {
          scanId,
          progress: 0,
          status: 'running',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'ZAP_NOT_RUNNING',
          message: `Failed to start passive scan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  }

  /**
   * Start an active scan (intrusive)
   * @param targetUrl - Target URL to scan
   * @returns Scan ID for tracking progress
   */
  async startActiveScan(
    targetUrl: string
  ): Promise<Result<ZAPScanProgress, ScanError>> {
    try {
      const response = await axios.post(
        `${this.zapApiUrl}/JSON/ascan/action/scan/`,
        {},
        { params: { url: targetUrl } }
      );

      const scanId = response.data.scan || String(Date.now());

      return {
        success: true,
        value: {
          scanId,
          progress: 0,
          status: 'running',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'ZAP_NOT_RUNNING',
          message: `Failed to start active scan: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      };
    }
  }

  /**
   * Get scan progress percentage
   * @param scanId - Scan ID returned from startActiveScan or startPassiveScan
   * @param scanType - Type of scan (passive or active)
   * @returns Current scan progress
   */
  async getScanProgress(
    scanId: string,
    scanType: 'passive' | 'active'
  ): Promise<Result<ZAPScanProgress, ScanError>> {
    try {
      const endpoint =
        scanType === 'passive'
          ? `${this.zapApiUrl}/JSON/pscan/view/recordsToScan/`
          : `${this.zapApiUrl}/JSON/ascan/view/status/`;

      const params = scanType === 'active' ? { scanId } : {};

      const response = await axios.get(endpoint, { params });

      const statusValue = response.data.status || '0';
      const progress = parseInt(statusValue, 10);

      return {
        success: true,
        value: {
          scanId,
          progress,
          status: progress >= 100 ? 'completed' : 'running',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'SCAN_TIMEOUT',
          duration: this.defaultTimeout,
        },
      };
    }
  }

  /**
   * Retrieve vulnerabilities from ZAP alerts
   * @param targetUrl - Target URL that was scanned
   * @returns List of vulnerabilities found
   */
  async getVulnerabilities(
    targetUrl: string
  ): Promise<Result<Vulnerability[], ScanError>> {
    try {
      const response = await axios.get(
        `${this.zapApiUrl}/JSON/core/view/alerts/`,
        {
          params: { baseurl: targetUrl },
        }
      );

      const alerts = response.data.alerts || [];

      const vulnerabilities: Vulnerability[] = alerts.map(
        (alert: {
          id: string;
          alert: string;
          risk: string;
          description: string;
          solution: string;
          confidence: string;
        }) => ({
          id: alert.id,
          name: alert.alert,
          severity: this.mapRiskToSeverity(alert.risk),
          description: alert.description || 'No description available',
          recommendation: alert.solution || 'No recommendation available',
          falsePositiveRisk: this.mapConfidenceToFalsePositiveRisk(
            alert.confidence
          ),
        })
      );

      return {
        success: true,
        value: vulnerabilities,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'TARGET_UNREACHABLE',
          cause: error instanceof Error ? error : new Error('Unknown error'),
        },
      };
    }
  }

  /**
   * Get TLS version information
   * @param targetUrl - Target URL to check
   * @returns TLS version string
   */
  async getTLSInfo(targetUrl: string): Promise<Result<string, ScanError>> {
    try {
      const response = await axios.get(
        `${this.zapApiUrl}/JSON/core/view/alerts/`,
        {
          params: { baseurl: targetUrl },
        }
      );

      // Extract TLS version from ZAP data or use default
      const tlsVersion = response.data.tlsVersion;

      if (!tlsVersion) {
        return {
          success: false,
          error: {
            type: 'SCAN_TIMEOUT',
            duration: this.defaultTimeout,
          },
        };
      }

      return {
        success: true,
        value: tlsVersion,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'SCAN_TIMEOUT',
          duration: this.defaultTimeout,
        },
      };
    }
  }

  /**
   * Generate complete vulnerability report from scan results
   * @param config - Security scan configuration
   * @returns Complete vulnerability report
   */
  async generateVulnerabilityReport(
    config: SecurityScanConfig
  ): Promise<Result<VulnerabilityReport, ScanError>> {
    try {
      const targetUrl =
        typeof config.target === 'string' ? config.target : config.target.url;

      // Get TLS info
      const tlsResult = await this.getTLSInfo(targetUrl);
      const tlsVersion = tlsResult.success ? tlsResult.value : 'Unknown';

      // Get vulnerabilities
      const vulnResult = await this.getVulnerabilities(targetUrl);
      if (!vulnResult.success) {
        return {
          success: false,
          error: vulnResult.error,
        };
      }

      // Generate compliance status (simplified for now)
      const complianceStatus: Record<string, boolean> = {};
      for (const compliance of config.complianceChecks) {
        // Check if any critical vulnerabilities exist
        const hasCriticalIssues = vulnResult.value.some(
          (v) => v.severity === 'Critical' || v.severity === 'High'
        );
        complianceStatus[compliance] = !hasCriticalIssues;
      }

      // Extract auth methods (simplified - would need deeper analysis in production)
      const authMethods: AuthMethod[] = [];

      const report: VulnerabilityReport = {
        tlsVersion,
        authMethods,
        vulnerabilities: vulnResult.value,
        complianceStatus,
      };

      return {
        success: true,
        value: report,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'TARGET_UNREACHABLE',
          cause: error instanceof Error ? error : new Error('Unknown error'),
        },
      };
    }
  }

  /**
   * Check if active scan requires user confirmation
   * @param config - Security scan configuration
   * @returns True if confirmation is required (active scan mode)
   */
  requiresConfirmation(config: SecurityScanConfig): boolean {
    return config.scanType === 'active';
  }

  /**
   * Get confirmation warning message for active scan
   * @param config - Security scan configuration
   * @returns Warning message about intrusive operations
   */
  getConfirmationMessage(config: SecurityScanConfig): string {
    const targetUrl =
      typeof config.target === 'string' ? config.target : config.target.url;

    return `
⚠️  WARNING: Active Scan Mode Detected ⚠️

You are about to initiate an active scan on: ${targetUrl}

Active scans are INTRUSIVE and may:
- Modify data on the target system
- Trigger security alerts or rate limits
- Impact system performance
- Create audit log entries

Please ensure you have explicit authorization to perform active security testing on this target.

Do you wish to continue? (yes/no)
`.trim();
  }

  /**
   * Log user's confirmation decision with timestamp
   * @param targetUrl - Target URL being scanned
   * @param decision - User's decision (true=approved, false=denied)
   */
  logConfirmationDecision(targetUrl: string, decision: boolean): void {
    const timestamp = new Date().toISOString();
    const action = decision ? 'approved' : 'denied';

    console.log(
      `[${timestamp}] Active scan ${action} for target: ${targetUrl}`
    );
  }

  /**
   * Map ZAP risk level to standard severity
   * @param risk - ZAP risk level
   * @returns Standard severity level
   */
  private mapRiskToSeverity(
    risk: string
  ): 'Critical' | 'High' | 'Medium' | 'Low' | 'Info' {
    const riskLower = risk.toLowerCase();

    if (riskLower.includes('high')) return 'High';
    if (riskLower.includes('medium')) return 'Medium';
    if (riskLower.includes('low')) return 'Low';
    if (riskLower.includes('info')) return 'Info';

    return 'Info'; // Default
  }

  /**
   * Map ZAP confidence to false positive risk
   * @param confidence - ZAP confidence level
   * @returns False positive risk level
   */
  private mapConfidenceToFalsePositiveRisk(
    confidence: string
  ): 'High' | 'Medium' | 'Low' {
    const confLower = confidence.toLowerCase();

    if (confLower.includes('high')) return 'Low'; // High confidence = Low false positive risk
    if (confLower.includes('medium')) return 'Medium';
    if (confLower.includes('low')) return 'High'; // Low confidence = High false positive risk

    return 'Medium'; // Default
  }
}
