/**
 * ZAP Bridge Unit Tests
 *
 * Tests for OWASP ZAP integration, verification, and vulnerability scanning.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import type { SecurityScanConfig, VulnerabilityReport } from '@/analysis/security/types';
import { ZAPBridge } from '@/analysis/security/zap-bridge';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('ZAPBridge', () => {
  let zapBridge: ZAPBridge;
  const mockZapApiUrl = 'http://localhost:8080';

  beforeEach(() => {
    zapBridge = new ZAPBridge(mockZapApiUrl);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('verifyInstallation', () => {
    it('should return success when ZAP is running and reachable', async () => {
      // Arrange: Mock axios GET request to ZAP API version endpoint
      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: { version: '2.14.0' },
      });

      // Act: Verify ZAP installation
      const result = await zapBridge.verifyInstallation();

      // Assert: Should succeed with version info
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.running).toBe(true);
        expect(result.value.version).toBe('2.14.0');
        expect(result.value.apiUrl).toBe(mockZapApiUrl);
      }

      // Verify axios was called with correct endpoint
      expect(mockedAxios.get).toHaveBeenCalledWith(
        `${mockZapApiUrl}/JSON/core/view/version/`,
        expect.objectContaining({ timeout: expect.any(Number) })
      );
    });

    it('should return error when ZAP is not reachable', async () => {
      // Arrange: Mock axios to simulate connection failure
      mockedAxios.get = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      // Act: Verify ZAP installation
      const result = await zapBridge.verifyInstallation();

      // Assert: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('ZAP_NOT_RUNNING');
        expect(result.error.message).toContain('not reachable');
      }
    });

    it('should return error when ZAP API returns unexpected status', async () => {
      // Arrange: Mock axios to return non-200 status
      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 500,
        data: {},
      });

      // Act: Verify ZAP installation
      const result = await zapBridge.verifyInstallation();

      // Assert: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('ZAP_NOT_RUNNING');
      }
    });
  });

  describe('startPassiveScan', () => {
    it('should initiate passive scan and return scan ID', async () => {
      // Arrange: Mock axios POST request for passive scan
      mockedAxios.post = vi.fn().mockResolvedValue({
        status: 200,
        data: { scanId: 'scan-123' },
      });

      const targetUrl = 'https://api.example.com';

      // Act: Start passive scan
      const result = await zapBridge.startPassiveScan(targetUrl);

      // Assert: Should return scan ID
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.scanId).toBe('scan-123');
      }

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockZapApiUrl}/JSON/pscan/action/enableAllScanners/`,
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should return error when scan initiation fails', async () => {
      // Arrange: Mock axios to simulate scan failure
      mockedAxios.post = vi.fn().mockRejectedValue(new Error('Scan failed'));

      const targetUrl = 'https://api.example.com';

      // Act: Start passive scan
      const result = await zapBridge.startPassiveScan(targetUrl);

      // Assert: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('ZAP_NOT_RUNNING');
      }
    });
  });

  describe('startActiveScan', () => {
    it('should initiate active scan and return scan ID', async () => {
      // Arrange: Mock axios POST request for active scan
      mockedAxios.post = vi.fn().mockResolvedValue({
        status: 200,
        data: { scan: '456' },
      });

      const targetUrl = 'https://api.example.com';

      // Act: Start active scan
      const result = await zapBridge.startActiveScan(targetUrl);

      // Assert: Should return scan ID
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.scanId).toBe('456');
      }

      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${mockZapApiUrl}/JSON/ascan/action/scan/`,
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('getScanProgress', () => {
    it('should return scan progress percentage', async () => {
      // Arrange: Mock axios GET request for scan progress
      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: { status: '75' },
      });

      const scanId = 'scan-123';

      // Act: Get scan progress
      const result = await zapBridge.getScanProgress(scanId, 'passive');

      // Assert: Should return progress info
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.scanId).toBe(scanId);
        expect(result.value.progress).toBe(75);
        expect(result.value.status).toBe('running');
      }
    });

    it('should return completed status when progress reaches 100', async () => {
      // Arrange: Mock axios GET request for completed scan
      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: { status: '100' },
      });

      const scanId = 'scan-456';

      // Act: Get scan progress
      const result = await zapBridge.getScanProgress(scanId, 'active');

      // Assert: Should return completed status
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.progress).toBe(100);
        expect(result.value.status).toBe('completed');
      }
    });
  });

  describe('getVulnerabilities', () => {
    it('should retrieve and parse ZAP alerts into vulnerability report format', async () => {
      // Arrange: Mock axios GET request for alerts
      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: {
          alerts: [
            {
              id: '1',
              alert: 'SQL Injection',
              risk: 'High',
              description: 'SQL injection vulnerability detected',
              solution: 'Use prepared statements',
              confidence: 'Medium',
            },
            {
              id: '2',
              alert: 'Cross-Site Scripting (XSS)',
              risk: 'Medium',
              description: 'XSS vulnerability detected',
              solution: 'Sanitize user input',
              confidence: 'High',
            },
          ],
        },
      });

      const targetUrl = 'https://api.example.com';

      // Act: Get vulnerabilities
      const result = await zapBridge.getVulnerabilities(targetUrl);

      // Assert: Should return parsed vulnerabilities
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toHaveLength(2);
        expect(result.value[0].id).toBe('1');
        expect(result.value[0].name).toBe('SQL Injection');
        expect(result.value[0].severity).toBe('High');
        expect(result.value[0].description).toContain('SQL injection');
        expect(result.value[0].recommendation).toContain('prepared statements');
        expect(result.value[0].falsePositiveRisk).toBe('Medium');
      }

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/JSON/core/view/alerts/'),
        expect.any(Object)
      );
    });

    it('should map ZAP risk levels to standard severity levels', async () => {
      // Arrange: Mock axios with different risk levels
      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: {
          alerts: [
            { id: '1', alert: 'Critical Issue', risk: 'High', description: '', solution: '', confidence: 'High' },
            { id: '2', alert: 'Medium Issue', risk: 'Medium', description: '', solution: '', confidence: 'Medium' },
            { id: '3', alert: 'Low Issue', risk: 'Low', description: '', solution: '', confidence: 'Low' },
            { id: '4', alert: 'Info Issue', risk: 'Informational', description: '', solution: '', confidence: 'Low' },
          ],
        },
      });

      const targetUrl = 'https://api.example.com';

      // Act: Get vulnerabilities
      const result = await zapBridge.getVulnerabilities(targetUrl);

      // Assert: Should map risk levels correctly
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value[0].severity).toBe('High');
        expect(result.value[1].severity).toBe('Medium');
        expect(result.value[2].severity).toBe('Low');
        expect(result.value[3].severity).toBe('Info');
      }
    });
  });

  describe('getTLSInfo', () => {
    it('should extract TLS version from ZAP scan results', async () => {
      // Arrange: Mock axios GET request for TLS info
      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: {
          tlsVersion: 'TLSv1.3',
        },
      });

      const targetUrl = 'https://api.example.com';

      // Act: Get TLS info
      const result = await zapBridge.getTLSInfo(targetUrl);

      // Assert: Should return TLS version
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBe('TLSv1.3');
      }
    });

    it('should return error when TLS info is unavailable', async () => {
      // Arrange: Mock axios to return empty TLS info
      mockedAxios.get = vi.fn().mockResolvedValue({
        status: 200,
        data: {},
      });

      const targetUrl = 'https://api.example.com';

      // Act: Get TLS info
      const result = await zapBridge.getTLSInfo(targetUrl);

      // Assert: Should return error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('SCAN_TIMEOUT');
      }
    });
  });

  describe('generateVulnerabilityReport', () => {
    it('should aggregate all scan data into vulnerability report', async () => {
      // Arrange: Mock multiple axios calls
      mockedAxios.get = vi.fn()
        .mockResolvedValueOnce({
          status: 200,
          data: { tlsVersion: 'TLSv1.2' },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            alerts: [
              {
                id: '1',
                alert: 'Weak TLS',
                risk: 'Medium',
                description: 'TLS 1.0 detected',
                solution: 'Upgrade to TLS 1.2+',
                confidence: 'High',
              },
            ],
          },
        });

      const config: SecurityScanConfig = {
        target: { url: 'https://api.example.com', method: 'GET' },
        scanType: 'passive',
        complianceChecks: ['GDPR', 'PCI-DSS'],
      };

      // Act: Generate vulnerability report
      const result = await zapBridge.generateVulnerabilityReport(config);

      // Assert: Should return complete report
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.tlsVersion).toBe('TLSv1.2');
        expect(result.value.vulnerabilities).toHaveLength(1);
        expect(result.value.authMethods).toBeDefined();
        expect(result.value.complianceStatus).toHaveProperty('GDPR');
        expect(result.value.complianceStatus).toHaveProperty('PCI-DSS');
      }
    });
  });

  describe('requireActiveScanConfirmation', () => {
    it('should detect active scan mode from config', () => {
      // Arrange: Create config with active scan type
      const activeConfig: SecurityScanConfig = {
        target: { url: 'https://api.example.com', method: 'GET' },
        scanType: 'active',
        complianceChecks: ['GDPR'],
      };

      // Act: Check if confirmation is required
      const needsConfirmation = zapBridge.requiresConfirmation(activeConfig);

      // Assert: Should require confirmation for active scan
      expect(needsConfirmation).toBe(true);
    });

    it('should not require confirmation for passive scan', () => {
      // Arrange: Create config with passive scan type
      const passiveConfig: SecurityScanConfig = {
        target: { url: 'https://api.example.com', method: 'GET' },
        scanType: 'passive',
        complianceChecks: ['GDPR'],
      };

      // Act: Check if confirmation is required
      const needsConfirmation = zapBridge.requiresConfirmation(passiveConfig);

      // Assert: Should not require confirmation for passive scan
      expect(needsConfirmation).toBe(false);
    });

    it('should return warning message with target URL for active scan', () => {
      // Arrange: Create config with active scan type
      const activeConfig: SecurityScanConfig = {
        target: { url: 'https://api.example.com', method: 'GET' },
        scanType: 'active',
        complianceChecks: [],
      };

      // Act: Get warning message
      const message = zapBridge.getConfirmationMessage(activeConfig);

      // Assert: Should include warning about intrusive operations
      expect(message).toContain('WARNING');
      expect(message).toContain('active scan');
      expect(message.toLowerCase()).toContain('intrusive');
      expect(message).toContain('https://api.example.com');
    });

    it('should log user decision when confirmation is provided', () => {
      // Arrange: Create console.log spy
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const targetUrl = 'https://api.example.com';
      const decision = true; // User approved

      // Act: Log confirmation decision
      zapBridge.logConfirmationDecision(targetUrl, decision);

      // Assert: Should log timestamp and decision
      expect(consoleSpy).toHaveBeenCalled();
      const logArgs = consoleSpy.mock.calls[0][0];
      expect(logArgs).toContain(targetUrl);
      expect(logArgs).toContain(decision ? 'approved' : 'denied');
      expect(logArgs).toMatch(/\d{4}-\d{2}-\d{2}/); // ISO date format

      consoleSpy.mockRestore();
    });

    it('should log denial when user rejects active scan', () => {
      // Arrange: Create console.log spy
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const targetUrl = 'https://api.example.com';
      const decision = false; // User denied

      // Act: Log confirmation decision
      zapBridge.logConfirmationDecision(targetUrl, decision);

      // Assert: Should log denied decision
      expect(consoleSpy).toHaveBeenCalled();
      const logArgs = consoleSpy.mock.calls[0][0];
      expect(logArgs).toContain('denied');

      consoleSpy.mockRestore();
    });
  });
});
