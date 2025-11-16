/**
 * Mitigation Generator
 *
 * Generates risk mitigation strategies based on identified risks in the assessment report.
 * Prioritizes mitigations by severity and provides effort estimates and timelines.
 */

import type { RiskAssessmentReport, Mitigation } from './types';

export class MitigationGenerator {
  /**
   * Generate risk mitigation strategies
   *
   * @param report - Complete risk assessment report
   * @returns Array of mitigations sorted by priority
   */
  generateMitigations(report: RiskAssessmentReport): Mitigation[] {
    const mitigations: Mitigation[] = [];

    // Generate compatibility mitigations
    if (!report.compatibility.compatible) {
      mitigations.push(...this.generateCompatibilityMitigations(report.compatibility));
    }

    // Generate vendor lock-in mitigations
    if (report.vendorLockIn.riskLevel === 'High' || report.vendorLockIn.riskLevel === 'Medium') {
      mitigations.push(...this.generateVendorLockInMitigations(report.vendorLockIn));
    }

    // Generate scalability mitigations
    if (report.scalability.horizontalScaling === 'Not Supported' || report.scalability.horizontalScaling === 'Limited') {
      mitigations.push(...this.generateScalabilityMitigations(report.scalability));
    }

    // Generate learning curve mitigations
    if (report.learningCurve.adoptionRisk === 'High' || report.learningCurve.complexity === 'High') {
      mitigations.push(...this.generateLearningCurveMitigations(report.learningCurve));
    }

    // Sort by priority (1 = highest priority)
    mitigations.sort((a, b) => a.priority - b.priority);

    return mitigations;
  }

  /**
   * Generate compatibility conflict mitigations
   */
  private generateCompatibilityMitigations(compatibility: RiskAssessmentReport['compatibility']): Mitigation[] {
    const mitigations: Mitigation[] = [];

    // Handle blocking conflicts
    const blockingConflicts = compatibility.conflicts.filter(c => c.severity === 'Blocking');
    if (blockingConflicts.length > 0) {
      const components = blockingConflicts.map(c => c.component).join(', ');
      mitigations.push({
        risk: `Blocking compatibility conflicts in: ${components}`,
        strategy: `Upgrade conflicting dependencies to meet version requirements. Review breaking changes in upgrade guides before proceeding.`,
        effort: 'Medium',
        priority: 1, // Highest priority
        timeline: '1-2 weeks',
      });
    }

    // Handle high severity conflicts
    const highConflicts = compatibility.conflicts.filter(c => c.severity === 'High');
    if (highConflicts.length > 0) {
      const components = highConflicts.map(c => c.component).join(', ');
      mitigations.push({
        risk: `High severity compatibility issues in: ${components}`,
        strategy: `Address high-priority compatibility issues. Consider using compatibility shims or polyfills if direct upgrade is not feasible.`,
        effort: 'Medium',
        priority: 2,
        timeline: '1 week',
      });
    }

    return mitigations;
  }

  /**
   * Generate vendor lock-in mitigations
   */
  private generateVendorLockInMitigations(vendorLockIn: RiskAssessmentReport['vendorLockIn']): Mitigation[] {
    const mitigations: Mitigation[] = [];

    if (vendorLockIn.riskLevel === 'High') {
      mitigations.push({
        risk: 'High vendor lock-in risk with tight coupling',
        strategy: `Implement abstraction layers (Repository pattern, Adapter pattern) to isolate vendor-specific code. Design for multi-vendor compatibility from the start.`,
        effort: 'High',
        priority: 2,
        timeline: '2-4 weeks',
      });

      if (vendorLockIn.dataPortability === 'None') {
        mitigations.push({
          risk: 'No data portability - difficult migration',
          strategy: `Implement custom data export/import pipelines. Maintain backups in vendor-neutral formats. Document data schemas for future migration.`,
          effort: 'Medium',
          priority: 3,
          timeline: '1-2 weeks',
        });
      }
    } else if (vendorLockIn.riskLevel === 'Medium') {
      mitigations.push({
        risk: 'Moderate vendor lock-in risk',
        strategy: `Maintain compatibility with open standards where possible. Avoid vendor-specific features unless critical. Document vendor dependencies for future migration planning.`,
        effort: 'Low',
        priority: 4,
        timeline: '1 week',
      });
    }

    return mitigations;
  }

  /**
   * Generate scalability mitigations
   */
  private generateScalabilityMitigations(scalability: RiskAssessmentReport['scalability']): Mitigation[] {
    const mitigations: Mitigation[] = [];

    if (scalability.horizontalScaling === 'Not Supported') {
      mitigations.push({
        risk: 'No horizontal scaling support limits growth',
        strategy: `Redesign architecture to support horizontal scaling. Consider migrating to stateless services, external session storage, and load-balanced infrastructure.`,
        effort: 'High',
        priority: 3,
        timeline: '3-6 weeks',
      });
    } else if (scalability.horizontalScaling === 'Limited') {
      mitigations.push({
        risk: 'Limited horizontal scaling due to stateful design',
        strategy: `Implement sticky sessions or migrate state to external storage (Redis, database). Consider event-driven architecture for better scalability.`,
        effort: 'Medium',
        priority: 4,
        timeline: '2-3 weeks',
      });
    }

    if (scalability.performanceAtScale === 'Poor' || scalability.performanceAtScale === 'Fair') {
      mitigations.push({
        risk: 'Poor performance at scale',
        strategy: `Implement caching strategies (CDN, application-level cache). Optimize database queries. Consider async processing for heavy operations.`,
        effort: 'Medium',
        priority: 3,
        timeline: '2-4 weeks',
      });
    }

    return mitigations;
  }

  /**
   * Generate learning curve mitigations
   */
  private generateLearningCurveMitigations(learningCurve: RiskAssessmentReport['learningCurve']): Mitigation[] {
    const mitigations: Mitigation[] = [];

    if (learningCurve.adoptionRisk === 'High') {
      mitigations.push({
        risk: 'High adoption risk due to complexity and skill gaps',
        strategy: `Allocate ${learningCurve.estimatedLearningHours} hours for training. Hire specialized consultants for initial implementation. Create internal documentation and knowledge base.`,
        effort: 'High',
        priority: 3,
        timeline: `${Math.ceil(learningCurve.estimatedLearningHours / 8)} working days`,
      });

      if (learningCurve.skillAvailability === 'Low') {
        mitigations.push({
          risk: 'Low skill availability in market',
          strategy: `Consider upskilling existing team members through courses and certifications. Budget for higher contractor rates. Plan for longer recruitment timeline.`,
          effort: 'High',
          priority: 4,
          timeline: '4-8 weeks',
        });
      }

      if (learningCurve.documentationQuality === 'Poor' || learningCurve.documentationQuality === 'Fair') {
        mitigations.push({
          risk: 'Poor documentation increases learning time',
          strategy: `Invest in creating internal documentation. Establish proof-of-concept projects. Engage with vendor support or community forums for guidance.`,
          effort: 'Medium',
          priority: 4,
          timeline: '2-3 weeks',
        });
      }
    }

    return mitigations;
  }
}
