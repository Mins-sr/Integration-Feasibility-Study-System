/**
 * Markdown Report Generator
 *
 * Generates human-readable Markdown reports from integration study results.
 * Includes executive summary, performance metrics, security assessment, cost analysis,
 * risk evaluation, and recommendations.
 */

import type { Result } from '@/types/result';
import { ok, err } from '@/types/result';
import type { AggregatedStudyResult, MarkdownGenerationConfig, ReportGenerationError } from './types';
import type { PerformanceMetrics } from '@/analysis/performance/types';
import type { VulnerabilityReport } from '@/analysis/security/types';
import type { CostEstimationReport } from '@/analysis/cost/types';
import type { RiskAssessmentReport } from '@/analysis/risk/types';

export class MarkdownGenerator {
  /**
   * Generate Markdown report from aggregated study results
   *
   * @param aggregated - Aggregated study results
   * @param config - Markdown generation configuration
   * @returns Markdown report string or generation error
   */
  generate(
    aggregated: AggregatedStudyResult,
    config: MarkdownGenerationConfig
  ): Result<string, ReportGenerationError> {
    // Validate: At least one analyzer result must be present
    if (aggregated.analyzerResults.length === 0) {
      return err({
        type: 'VALIDATION_ERROR',
        message: 'Cannot generate report: at least one analyzer result is required',
      });
    }

    const sections: string[] = [];

    // Title and metadata
    sections.push(this.generateHeader(config));

    // Executive Summary
    sections.push(this.generateExecutiveSummary(aggregated, config));

    // Performance Analysis (if available)
    if (aggregated.hasPerformanceData) {
      const perfResult = aggregated.analyzerResults.find((r) => r.analyzerType === 'PERFORMANCE');
      if (perfResult && perfResult.data) {
        sections.push(this.generatePerformanceSection(perfResult.data as PerformanceMetrics));
      }
    }

    // Security Assessment (if available)
    if (aggregated.hasSecurityData) {
      const secResult = aggregated.analyzerResults.find((r) => r.analyzerType === 'SECURITY');
      if (secResult && secResult.data) {
        sections.push(this.generateSecuritySection(secResult.data as VulnerabilityReport));
      }
    }

    // Cost Analysis (if available)
    if (aggregated.hasCostData) {
      const costResult = aggregated.analyzerResults.find((r) => r.analyzerType === 'COST');
      if (costResult && costResult.data) {
        sections.push(this.generateCostSection(costResult.data as CostEstimationReport));
      }
    }

    // Risk Assessment (if available)
    if (aggregated.hasRiskData) {
      const riskResult = aggregated.analyzerResults.find((r) => r.analyzerType === 'RISK');
      if (riskResult && riskResult.data) {
        sections.push(this.generateRiskSection(riskResult.data as RiskAssessmentReport));
      }
    }

    // Recommendations
    sections.push(this.generateRecommendations(aggregated));

    // Join all sections with double newline
    const markdown = sections.join('\n\n');

    return ok(markdown);
  }

  /**
   * Generate report header with metadata
   */
  private generateHeader(config: MarkdownGenerationConfig): string {
    return `# Integration Feasibility Study Report

**Study ID**: ${config.studyId}
**Target URL**: ${config.targetUrl}
**Generated**: ${config.generatedAt.toISOString()}
`;
  }

  /**
   * Generate executive summary
   */
  private generateExecutiveSummary(aggregated: AggregatedStudyResult, config: MarkdownGenerationConfig): string {
    const completedAnalyzers = aggregated.analyzerResults.filter((r) => r.status === 'COMPLETED').length;
    const totalAnalyzers = aggregated.analyzerResults.length;

    return `## Executive Summary

This report presents the findings of an integration feasibility study for **${config.targetUrl}**.

**Analysis Coverage**:
- ${completedAnalyzers}/${totalAnalyzers} analyzers completed successfully
- Performance Analysis: ${aggregated.hasPerformanceData ? '✓' : '✗'}
- Security Assessment: ${aggregated.hasSecurityData ? '✓' : '✗'}
- Cost Analysis: ${aggregated.hasCostData ? '✓' : '✗'}
- Risk Assessment: ${aggregated.hasRiskData ? '✓' : '✗'}
`;
  }

  /**
   * Generate performance analysis section
   */
  private generatePerformanceSection(metrics: PerformanceMetrics): string {
    return `## Performance Analysis

### Response Time Metrics

| Metric | Value (ms) |
|--------|-----------|
| Mean | ${metrics.responseTime.mean} |
| Min | ${metrics.responseTime.min} |
| Max | ${metrics.responseTime.max} |
| P50 (Median) | ${metrics.responseTime.p50} |
| P95 | ${metrics.responseTime.p95} |
| P99 | ${metrics.responseTime.p99} |

### Throughput and Reliability

- **Throughput**: ${metrics.throughput} requests/second
- **Error Rate**: ${metrics.errorRate}%
${
  metrics.concurrencyResults.length > 0
    ? `
### Concurrency Results

| Concurrent Users | Success Rate | Avg Latency (ms) |
|-----------------|--------------|------------------|
${metrics.concurrencyResults.map((r) => `| ${r.concurrency} | ${r.successRate}% | ${r.avgLatency} |`).join('\n')}
`
    : ''
}`;
  }

  /**
   * Generate security assessment section
   */
  private generateSecuritySection(report: VulnerabilityReport): string {
    const criticalCount = report.vulnerabilities.filter((v) => v.severity === 'Critical').length;
    const highCount = report.vulnerabilities.filter((v) => v.severity === 'High').length;
    const mediumCount = report.vulnerabilities.filter((v) => v.severity === 'Medium').length;
    const lowCount = report.vulnerabilities.filter((v) => v.severity === 'Low').length;

    return `## Security Assessment

### TLS Configuration

- **TLS Version**: ${report.tlsVersion}

### Authentication Methods

${report.authMethods.map((auth) => `- **${auth.type}**: ${auth.details}`).join('\n')}

### Vulnerability Summary

| Severity | Count |
|----------|-------|
| Critical | ${criticalCount} |
| High | ${highCount} |
| Medium | ${mediumCount} |
| Low | ${lowCount} |

**Total Vulnerabilities**: ${report.vulnerabilities.length}
${
  report.vulnerabilities.length > 0
    ? `
### Detailed Findings

${report.vulnerabilities
  .map(
    (v) => `#### ${v.name} (${v.severity})

- **ID**: ${v.id}
- **Description**: ${v.description}
- **Recommendation**: ${v.recommendation}
- **False Positive Risk**: ${v.falsePositiveRisk}
`
  )
  .join('\n')}
`
    : ''
}
### Compliance Status

${Object.entries(report.complianceStatus)
  .map(([standard, status]) => `- **${standard}**: ${status ? '✓ Compliant' : '✗ Non-compliant'}`)
  .join('\n')}
`;
  }

  /**
   * Generate cost analysis section
   */
  private generateCostSection(report: CostEstimationReport): string {
    return `## Cost Analysis

### Cost Breakdown

#### Direct Costs

- **Licensing**: $${report.directCosts.licensing}
- **Usage**: $${report.directCosts.usage}
- **Infrastructure**: $${report.directCosts.infrastructure}

#### Indirect Costs

- **Maintenance**: $${report.indirectCosts.maintenance}
- **Support**: $${report.indirectCosts.support}

### Financial Summary

- **Total Costs**: $${report.totalCosts}
- **ROI**: ${report.roi}%
${
  report.breakdown.length > 0
    ? `
### Detailed Breakdown

| Category | Amount | Unit |
|----------|--------|------|
${report.breakdown.map((b) => `| ${b.category} | $${b.amount} | ${b.unit} |`).join('\n')}
`
    : ''
}`;
  }

  /**
   * Generate risk assessment section
   */
  private generateRiskSection(report: RiskAssessmentReport): string {
    return `## Risk Assessment

### Compatibility

- **Compatible**: ${report.compatibility.compatible ? '✓ Yes' : '✗ No'}
- **Conflicts**: ${report.compatibility.conflicts.length}
- **Required Upgrades**: ${report.compatibility.requiredUpgrades.length}
${
  report.compatibility.conflicts.length > 0
    ? `
#### Conflicts

${report.compatibility.conflicts
  .map(
    (c) => `- **${c.component}**: Current ${c.current}, Required ${c.required} (Severity: ${c.severity})`
  )
  .join('\n')}
`
    : ''
}
### Vendor Lock-in

- **Risk Level**: ${report.vendorLockIn.risk}

### Scalability

- **Horizontal Scaling**: ${report.scalability.horizontalScaling ? '✓ Supported' : '✗ Limited'}
- **Vertical Scaling**: ${report.scalability.verticalScaling ? '✓ Supported' : '✗ Limited'}

### Learning Curve

- **Complexity**: ${report.learningCurve.complexity}
- **Estimated Hours**: ${report.learningCurve.estimatedHours}
${
  report.mitigations.length > 0
    ? `
### Risk Mitigation Strategies

${report.mitigations
  .map(
    (m) => `#### ${m.risk}

- **Strategy**: ${m.strategy}
- **Effort**: ${m.effort}
`
  )
  .join('\n')}
`
    : ''
}`;
  }

  /**
   * Generate recommendations section
   */
  private generateRecommendations(aggregated: AggregatedStudyResult): string {
    const recommendations: string[] = [];

    // Performance recommendations
    if (aggregated.hasPerformanceData) {
      const perfResult = aggregated.analyzerResults.find((r) => r.analyzerType === 'PERFORMANCE');
      if (perfResult && perfResult.data) {
        const metrics = perfResult.data as PerformanceMetrics;
        if (metrics.errorRate > 1.0) {
          recommendations.push('- **Performance**: Error rate exceeds 1%. Investigate error causes and implement retry mechanisms.');
        }
        if (metrics.responseTime.mean > 200) {
          recommendations.push('- **Performance**: Mean response time exceeds 200ms. Consider caching or optimization strategies.');
        }
      }
    }

    // Security recommendations
    if (aggregated.hasSecurityData) {
      const secResult = aggregated.analyzerResults.find((r) => r.analyzerType === 'SECURITY');
      if (secResult && secResult.data) {
        const report = secResult.data as VulnerabilityReport;
        const criticalVulns = report.vulnerabilities.filter((v) => v.severity === 'Critical');
        if (criticalVulns.length > 0) {
          recommendations.push(`- **Security**: ${criticalVulns.length} critical vulnerabilities detected. Address immediately before production deployment.`);
        }
      }
    }

    // Cost recommendations
    if (aggregated.hasCostData) {
      const costResult = aggregated.analyzerResults.find((r) => r.analyzerType === 'COST');
      if (costResult && costResult.data) {
        const report = costResult.data as CostEstimationReport;
        if (report.roi < 20) {
          recommendations.push('- **Cost**: ROI is below 20%. Evaluate alternative solutions with better cost efficiency.');
        }
      }
    }

    // Risk recommendations
    if (aggregated.hasRiskData) {
      const riskResult = aggregated.analyzerResults.find((r) => r.analyzerType === 'RISK');
      if (riskResult && riskResult.data) {
        const report = riskResult.data as RiskAssessmentReport;
        if (!report.compatibility.compatible) {
          recommendations.push('- **Risk**: Compatibility issues detected. Review conflicts and plan necessary upgrades.');
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('- All analyzed aspects appear to be within acceptable ranges. Proceed with implementation planning.');
    }

    return `## Recommendations

${recommendations.join('\n')}

---

*This report was generated automatically by the Integration Feasibility Study System.*
*For questions or concerns, please review the detailed analysis sections above.*
`;
  }
}
