/**
 * Vendor Lock-in Assessor
 *
 * Evaluates vendor lock-in risk based on proprietary dependencies,
 * data portability, and API coupling characteristics.
 */

import type { RiskAnalysisConfig, VendorLockInRisk } from './types';

/**
 * Known proprietary dependencies and their vendors
 */
const PROPRIETARY_DEPENDENCIES: Record<string, string> = {
  'aws-sdk': 'AWS',
  '@aws-sdk/client-s3': 'AWS',
  '@aws-sdk/client-dynamodb': 'AWS',
  'firebase-admin': 'Google Firebase',
  '@google-cloud/storage': 'Google Cloud',
  '@google-cloud/firestore': 'Google Cloud',
  '@azure/storage-blob': 'Microsoft Azure',
  'azure-storage': 'Microsoft Azure',
  jsforce: 'Salesforce',
  'salesforce-api': 'Salesforce',
  '@vercel/kv': 'Vercel',
  '@supabase/supabase-js': 'Supabase',
  '@planetscale/database': 'PlanetScale',
};

/**
 * Services with partial data portability (export features exist)
 */
const PARTIAL_PORTABILITY_SERVICES = new Set([
  'stripe-api',
  'stripe',
  'twilio',
  'sendgrid',
  'mailgun',
]);

/**
 * Open standard protocols and libraries (low lock-in risk)
 */
const OPEN_STANDARDS = new Set([
  'axios',
  'node-fetch',
  'graphql',
  'apollo-client',
  'mongodb',
  'pg', // PostgreSQL
  'mysql',
  'redis',
  'ioredis',
]);

export class VendorLockInAssessor {
  /**
   * Assess vendor lock-in risk for target integration
   *
   * @param config - Risk analysis configuration
   * @returns Vendor lock-in risk assessment
   */
  assessVendorLockIn(config: RiskAnalysisConfig): VendorLockInRisk {
    const { targetIntegration } = config;
    const proprietaryDeps: string[] = [];

    // Detect proprietary dependencies
    for (const dep of targetIntegration.requiredDependencies) {
      if (PROPRIETARY_DEPENDENCIES[dep]) {
        proprietaryDeps.push(dep);
      }
    }

    // Determine data portability
    const dataPortability = this.assessDataPortability(
      targetIntegration.service,
      targetIntegration.requiredDependencies,
      proprietaryDeps.length
    );

    // Determine API coupling
    const apiCoupling = this.assessApiCoupling(
      targetIntegration.requiredDependencies,
      proprietaryDeps.length
    );

    // Calculate overall risk level
    const riskLevel = this.calculateRiskLevel(
      proprietaryDeps.length,
      dataPortability,
      apiCoupling
    );

    // Generate assessment explanation
    const assessment = this.generateAssessment(
      riskLevel,
      proprietaryDeps,
      dataPortability,
      apiCoupling
    );

    return {
      riskLevel,
      proprietaryDependencies: proprietaryDeps,
      dataPortability,
      apiCoupling,
      assessment,
    };
  }

  /**
   * Assess data portability level
   */
  private assessDataPortability(
    service: string,
    dependencies: string[],
    proprietaryCount: number
  ): 'Full' | 'Partial' | 'None' {
    // Check if any dependency supports open standards
    const hasOpenStandard = dependencies.some(dep => OPEN_STANDARDS.has(dep));
    if (hasOpenStandard) {
      return 'Full';
    }

    // Check if service has partial portability
    if (PARTIAL_PORTABILITY_SERVICES.has(service) || dependencies.some(dep => PARTIAL_PORTABILITY_SERVICES.has(dep))) {
      return 'Partial';
    }

    // If multiple proprietary dependencies and no export features
    if (proprietaryCount > 0) {
      return 'None';
    }

    // Default: no dependencies or unknown service
    return 'Full';
  }

  /**
   * Assess API coupling level
   */
  private assessApiCoupling(
    dependencies: string[],
    proprietaryCount: number
  ): 'Tight' | 'Moderate' | 'Loose' {
    // Check for open standards
    const hasOpenStandard = dependencies.some(dep => OPEN_STANDARDS.has(dep));
    if (hasOpenStandard && proprietaryCount === 0) {
      return 'Loose';
    }

    // Multiple proprietary dependencies indicate tight coupling
    if (proprietaryCount >= 2) {
      return 'Tight';
    }

    // Single proprietary dependency
    if (proprietaryCount === 1) {
      return 'Tight';
    }

    // No dependencies or standard HTTP clients
    if (dependencies.length === 0 || dependencies.every(dep => OPEN_STANDARDS.has(dep))) {
      return 'Loose';
    }

    // Mixed or unknown dependencies
    return 'Moderate';
  }

  /**
   * Calculate overall vendor lock-in risk level
   */
  private calculateRiskLevel(
    proprietaryCount: number,
    dataPortability: 'Full' | 'Partial' | 'None',
    apiCoupling: 'Tight' | 'Moderate' | 'Loose'
  ): 'High' | 'Medium' | 'Low' {
    // High risk: Multiple proprietary dependencies OR tight coupling with no portability
    if (proprietaryCount >= 2 || (apiCoupling === 'Tight' && dataPortability === 'None')) {
      return 'High';
    }

    // Medium risk: Single proprietary dependency OR moderate coupling
    if (proprietaryCount === 1 || apiCoupling === 'Moderate' || dataPortability === 'Partial') {
      return 'Medium';
    }

    // Low risk: No proprietary dependencies AND good portability
    return 'Low';
  }

  /**
   * Generate assessment explanation
   */
  private generateAssessment(
    riskLevel: 'High' | 'Medium' | 'Low',
    proprietaryDeps: string[],
    dataPortability: 'Full' | 'Partial' | 'None',
    apiCoupling: 'Tight' | 'Moderate' | 'Loose'
  ): string {
    const parts: string[] = [];

    parts.push(`Vendor lock-in risk: ${riskLevel}.`);

    if (proprietaryDeps.length > 0) {
      const vendors = proprietaryDeps
        .map(dep => PROPRIETARY_DEPENDENCIES[dep])
        .filter((v, i, arr) => arr.indexOf(v) === i); // Unique vendors
      parts.push(
        `Proprietary dependencies detected: ${proprietaryDeps.join(', ')} (${vendors.join(', ')}).`
      );
    } else {
      parts.push('No proprietary dependencies detected.');
    }

    parts.push(`Data portability: ${dataPortability}.`);
    parts.push(`API coupling: ${apiCoupling}.`);

    if (riskLevel === 'High') {
      parts.push(
        'High vendor dependency may make migration difficult. Consider abstraction layers or multi-vendor strategies.'
      );
    } else if (riskLevel === 'Medium') {
      parts.push(
        'Moderate vendor dependency. Consider maintaining compatibility with open standards where possible.'
      );
    } else {
      parts.push(
        'Low vendor lock-in risk. Standard protocols enable flexibility in provider choice.'
      );
    }

    return parts.join(' ');
  }
}
