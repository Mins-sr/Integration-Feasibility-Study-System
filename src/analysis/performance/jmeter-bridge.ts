/**
 * JMeter Integration Bridge
 *
 * Provides integration with Apache JMeter for performance testing.
 * Handles installation verification, test plan generation, execution,
 * and result parsing.
 */

import { exec, spawn } from 'child_process';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { promisify } from 'util';
import { dirname } from 'path';
import type { Result } from '@/types/result';
import type { TestError } from '@/types/error-types';
import type {
  PerformanceTestConfig,
  PerformanceMetrics,
  JMeterInstallationInfo,
  ResponseTimeStats,
} from './types';

const execAsync = promisify(exec);

/**
 * JMeter Bridge for Performance Testing
 */
export class JMeterBridge {
  /**
   * Verify JMeter installation by checking version
   */
  async verifyInstallation(): Promise<
    Result<JMeterInstallationInfo, TestError>
  > {
    try {
      const { stdout } = await execAsync('jmeter --version');

      // Extract version number from output (e.g., "Apache JMeter 5.6.3")
      const versionMatch = stdout.match(/Apache JMeter (\d+\.\d+(?:\.\d+)?)/);
      const version = versionMatch ? versionMatch[1] : undefined;

      return {
        success: true,
        value: {
          installed: true,
          version,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'JMETER_NOT_FOUND',
          message: `JMeter is not installed or not in PATH. Please install Apache JMeter. Error: ${(error as Error).message}`,
        },
      };
    }
  }

  /**
   * Generate JMeter test plan (.jmx) from configuration
   */
  generateTestPlan(config: PerformanceTestConfig): string {
    const { target, concurrency, duration, rampUp } = config;
    const method = target.method ?? 'GET';
    const body = target.body ? JSON.stringify(target.body) : '';

    // Extract URL components
    const url = new URL(target.url);
    const protocol = url.protocol.replace(':', '');
    const domain = url.hostname;
    const port = url.port || (protocol === 'https' ? '443' : '80');
    const path = url.pathname + url.search;

    // Max concurrency for thread group
    const maxConcurrency = Math.max(...concurrency);

    // Generate JMX XML
    const jmx = `<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2" properties="5.0" jmeter="5.6.3">
  <hashTree>
    <TestPlan guiclass="TestPlanGui" testclass="TestPlan" testname="Integration Feasibility Study Test Plan">
      <stringProp name="TestPlan.comments">Generated test plan for ${target.url}</stringProp>
      <boolProp name="TestPlan.functional_mode">false</boolProp>
      <boolProp name="TestPlan.serialize_threadgroups">false</boolProp>
      <elementProp name="TestPlan.user_defined_variables" elementType="Arguments">
        <collectionProp name="Arguments.arguments"/>
      </elementProp>
    </TestPlan>
    <hashTree>
      <ThreadGroup guiclass="ThreadGroupGui" testclass="ThreadGroup" testname="Thread Group">
        <stringProp name="ThreadGroup.num_threads">${maxConcurrency}</stringProp>
        <stringProp name="ThreadGroup.ramp_time">${rampUp}</stringProp>
        <stringProp name="ThreadGroup.duration">${duration}</stringProp>
        <boolProp name="ThreadGroup.scheduler">true</boolProp>
        <stringProp name="ThreadGroup.on_sample_error">continue</stringProp>
      </ThreadGroup>
      <hashTree>
        <HTTPSamplerProxy guiclass="HttpTestSampleGui" testclass="HTTPSamplerProxy" testname="HTTP Request">
          <elementProp name="HTTPsampler.Arguments" elementType="Arguments">
            <collectionProp name="Arguments.arguments">
${body ? `              <elementProp name="" elementType="HTTPArgument">
                <boolProp name="HTTPArgument.always_encode">false</boolProp>
                <stringProp name="Argument.value">${body.replace(/"/g, '&quot;')}</stringProp>
                <stringProp name="Argument.metadata">=</stringProp>
              </elementProp>` : ''}
            </collectionProp>
          </elementProp>
          <stringProp name="HTTPSampler.domain">${domain}</stringProp>
          <stringProp name="HTTPSampler.port">${port}</stringProp>
          <stringProp name="HTTPSampler.protocol">${protocol}</stringProp>
          <stringProp name="HTTPSampler.path">${path}</stringProp>
          <stringProp name="HTTPSampler.method">${method}</stringProp>
          <boolProp name="HTTPSampler.follow_redirects">true</boolProp>
          <boolProp name="HTTPSampler.use_keepalive">true</boolProp>
        </HTTPSamplerProxy>
        <hashTree>
${target.headers ? this.generateHeaderManager(target.headers) : ''}
        </hashTree>
      </hashTree>
    </hashTree>
  </hashTree>
</jmeterTestPlan>`;

    return jmx;
  }

  /**
   * Generate Header Manager XML for custom headers
   */
  private generateHeaderManager(headers: Record<string, string>): string {
    const headerElements = Object.entries(headers)
      .map(
        ([name, value]) => `            <elementProp name="" elementType="Header">
              <stringProp name="Header.name">${name}</stringProp>
              <stringProp name="Header.value">${value}</stringProp>
            </elementProp>`
      )
      .join('\n');

    return `          <HeaderManager guiclass="HeaderPanel" testclass="HeaderManager" testname="HTTP Header Manager">
            <collectionProp name="HeaderManager.headers">
${headerElements}
            </collectionProp>
          </HeaderManager>
          <hashTree/>`;
  }

  /**
   * Execute JMeter with test plan
   */
  async executeJMeter(
    testPlanPath: string,
    outputPath: string,
    heapSize: string = '2g'
  ): Promise<Result<void, TestError>> {
    return new Promise((resolve) => {
      // Ensure output directory exists
      const outputDir = dirname(outputPath);
      mkdir(outputDir, { recursive: true }).catch(() => {
        // Ignore if directory already exists
      });

      const args = [
        '-n', // Non-GUI mode
        '-t',
        testPlanPath,
        '-l',
        outputPath,
        `-Xmx${heapSize}`,
      ];

      const jmeterProcess = spawn('jmeter', args, { stdio: 'pipe' });

      let stderr = '';

      jmeterProcess.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      jmeterProcess.on('close', (code: number) => {
        if (code === 0) {
          resolve({ success: true, value: undefined });
        } else {
          resolve({
            success: false,
            error: {
              type: 'TARGET_UNREACHABLE',
              cause: new Error(`JMeter execution failed: ${stderr}`),
            },
          });
        }
      });
    });
  }

  /**
   * Parse JMeter .jtl output file to PerformanceMetrics
   */
  async parseJTLOutput(
    jtlPath: string
  ): Promise<Result<PerformanceMetrics, TestError>> {
    try {
      const content = await readFile(jtlPath, 'utf-8');
      const lines = content.trim().split('\n');

      // Skip header line
      const dataLines = lines.slice(1);

      if (dataLines.length === 0) {
        return {
          success: false,
          error: {
            type: 'TARGET_UNREACHABLE',
            cause: new Error('JTL file contains no data'),
          },
        };
      }

      // Parse CSV data
      const samples = dataLines.map((line) => {
        const [timestamp, elapsed, , , , success] = line.split(',');
        return {
          timestamp: parseInt(timestamp ?? '0', 10),
          elapsed: parseInt(elapsed ?? '0', 10),
          success: success?.trim() === 'true',
        };
      });

      // Calculate metrics
      const latencies = samples.map((s) => s.elapsed).sort((a, b) => a - b);
      const totalSamples = samples.length;
      const successfulSamples = samples.filter((s) => s.success).length;
      const errorCount = totalSamples - successfulSamples;

      const responseTime = this.calculateResponseTimeStats(latencies);
      const errorRate = (errorCount / totalSamples) * 100;

      // Calculate throughput (requests per second)
      const firstTimestamp = samples[0]?.timestamp ?? 0;
      const lastTimestamp = samples[samples.length - 1]?.timestamp ?? 0;
      const durationSeconds = (lastTimestamp - firstTimestamp) / 1000;
      const throughput = durationSeconds > 0 ? totalSamples / durationSeconds : 0;

      return {
        success: true,
        value: {
          responseTime,
          throughput,
          errorRate,
          concurrencyResults: [], // To be populated by analyzer
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'TARGET_UNREACHABLE',
          cause: error as Error,
        },
      };
    }
  }

  /**
   * Calculate response time statistics including percentiles
   */
  private calculateResponseTimeStats(
    latencies: number[]
  ): ResponseTimeStats {
    if (latencies.length === 0) {
      return { mean: 0, min: 0, max: 0, p50: 0, p95: 0, p99: 0 };
    }

    const sum = latencies.reduce((acc, val) => acc + val, 0);
    const mean = sum / latencies.length;
    const min = latencies[0] ?? 0;
    const max = latencies[latencies.length - 1] ?? 0;

    // Calculate percentiles
    const p50 = this.percentile(latencies, 0.5);
    const p95 = this.percentile(latencies, 0.95);
    const p99 = this.percentile(latencies, 0.99);

    return { mean, min, max, p50, p95, p99 };
  }

  /**
   * Calculate percentile value from sorted array
   */
  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = Math.ceil(sortedValues.length * percentile) - 1;
    return sortedValues[Math.max(0, index)] ?? 0;
  }

  /**
   * Save test plan to file
   */
  async saveTestPlan(
    testPlan: string,
    outputPath: string
  ): Promise<Result<void, TestError>> {
    try {
      const outputDir = dirname(outputPath);
      await mkdir(outputDir, { recursive: true });
      await writeFile(outputPath, testPlan, 'utf-8');
      return { success: true, value: undefined };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'TARGET_UNREACHABLE',
          cause: error as Error,
        },
      };
    }
  }
}
