/**
 * Learning Curve Evaluator
 *
 * Evaluates learning curve, documentation quality, community support,
 * skill availability, and adoption risk for technologies.
 */

import type { RiskAnalysisConfig, LearningCurveRisk } from './types';

/**
 * Low complexity technologies
 */
const LOW_COMPLEXITY_TECH = new Set([
  'axios',
  'node-fetch',
  'express',
  'rest-api',
  'json-api',
]);

/**
 * Medium complexity technologies
 */
const MEDIUM_COMPLEXITY_TECH = new Set([
  'graphql',
  'apollo-client',
  'apollo-server',
  'socket.io',
  'websocket-server',
  'redis',
  'mongodb',
]);

/**
 * High complexity technologies
 */
const HIGH_COMPLEXITY_TECH = new Set([
  'tensorflow',
  '@tensorflow/tfjs-node',
  'machine-learning-api',
  'blockchain-api',
  'web3',
  'ethers',
  'kubernetes-api',
  'distributed-systems',
]);

/**
 * Technologies with excellent documentation
 */
const EXCELLENT_DOCS = new Set([
  'stripe',
  'stripe-api',
  'express',
  'graphql',
  'apollo-client',
  'mongodb',
  'redis',
  'aws-sdk',
]);

/**
 * Technologies with good documentation
 */
const GOOD_DOCS = new Set([
  'socket.io',
  'axios',
  'node-fetch',
  'pg',
  'mysql',
]);

/**
 * Technologies with strong community support
 */
const STRONG_COMMUNITY = new Set([
  'express',
  'graphql',
  'apollo-server',
  'mongodb',
  'redis',
  'axios',
  'react',
  'vue',
]);

/**
 * Technologies with moderate community support
 */
const MODERATE_COMMUNITY = new Set([
  'socket.io',
  'fastify',
  'koa',
  'stripe',
  'twilio',
]);

/**
 * Technologies with high skill availability
 */
const HIGH_SKILL_AVAILABILITY = new Set([
  'express',
  'mongodb',
  'redis',
  'axios',
  'rest-api',
  'json-api',
]);

/**
 * Technologies with medium skill availability
 */
const MEDIUM_SKILL_AVAILABILITY = new Set([
  'graphql',
  'apollo-client',
  'socket.io',
  'web3',
  'ethers',
  'blockchain-api',
]);

export class LearningCurveEvaluator {
  /**
   * Evaluate learning curve and adoption risk
   *
   * @param config - Risk analysis configuration
   * @returns Learning curve risk assessment
   */
  evaluateLearningCurve(config: RiskAnalysisConfig): LearningCurveRisk {
    const { targetIntegration } = config;

    // Assess complexity
    const complexity = this.assessComplexity(
      targetIntegration.service,
      targetIntegration.requiredDependencies
    );

    // Estimate learning hours
    const estimatedLearningHours = this.estimateLearningHours(complexity);

    // Assess documentation quality
    const documentationQuality = this.assessDocumentationQuality(
      targetIntegration.service,
      targetIntegration.requiredDependencies
    );

    // Assess community support
    const communitySupport = this.assessCommunitySupport(
      targetIntegration.service,
      targetIntegration.requiredDependencies
    );

    // Assess skill availability
    const skillAvailability = this.assessSkillAvailability(
      targetIntegration.service,
      targetIntegration.requiredDependencies
    );

    // Calculate adoption risk
    const adoptionRisk = this.calculateAdoptionRisk(
      complexity,
      documentationQuality,
      communitySupport,
      skillAvailability
    );

    return {
      estimatedLearningHours,
      complexity,
      documentationQuality,
      communitySupport,
      skillAvailability,
      adoptionRisk,
    };
  }

  /**
   * Assess technology complexity
   */
  private assessComplexity(
    service: string,
    dependencies: string[]
  ): 'High' | 'Medium' | 'Low' {
    // Check for high complexity technologies
    if (HIGH_COMPLEXITY_TECH.has(service) || dependencies.some(dep => HIGH_COMPLEXITY_TECH.has(dep))) {
      return 'High';
    }

    // Check for medium complexity technologies
    if (MEDIUM_COMPLEXITY_TECH.has(service) || dependencies.some(dep => MEDIUM_COMPLEXITY_TECH.has(dep))) {
      return 'Medium';
    }

    // Check for low complexity technologies
    if (LOW_COMPLEXITY_TECH.has(service) || dependencies.some(dep => LOW_COMPLEXITY_TECH.has(dep))) {
      return 'Low';
    }

    // Default: Medium (unknown technologies assumed to have moderate complexity)
    return 'Medium';
  }

  /**
   * Estimate learning hours based on complexity
   */
  private estimateLearningHours(complexity: 'High' | 'Medium' | 'Low'): number {
    switch (complexity) {
      case 'Low':
        return 10; // ~1-2 days
      case 'Medium':
        return 30; // ~4-5 days
      case 'High':
        return 80; // ~2 weeks
      default:
        return 30;
    }
  }

  /**
   * Assess documentation quality
   */
  private assessDocumentationQuality(
    service: string,
    dependencies: string[]
  ): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    // Check for excellent documentation
    if (EXCELLENT_DOCS.has(service) || dependencies.some(dep => EXCELLENT_DOCS.has(dep))) {
      return 'Excellent';
    }

    // Check for good documentation
    if (GOOD_DOCS.has(service) || dependencies.some(dep => GOOD_DOCS.has(dep))) {
      return 'Good';
    }

    // Default: Fair (unknown technologies assumed to have fair documentation)
    return 'Fair';
  }

  /**
   * Assess community support
   */
  private assessCommunitySupport(
    service: string,
    dependencies: string[]
  ): 'Strong' | 'Moderate' | 'Weak' {
    // Check for strong community support
    if (STRONG_COMMUNITY.has(service) || dependencies.some(dep => STRONG_COMMUNITY.has(dep))) {
      return 'Strong';
    }

    // Check for moderate community support
    if (MODERATE_COMMUNITY.has(service) || dependencies.some(dep => MODERATE_COMMUNITY.has(dep))) {
      return 'Moderate';
    }

    // Default: Weak (unknown technologies assumed to have weak community support)
    return 'Weak';
  }

  /**
   * Assess skill availability in the market
   */
  private assessSkillAvailability(
    service: string,
    dependencies: string[]
  ): 'High' | 'Medium' | 'Low' {
    // Check for high skill availability
    if (HIGH_SKILL_AVAILABILITY.has(service) || dependencies.some(dep => HIGH_SKILL_AVAILABILITY.has(dep))) {
      return 'High';
    }

    // Check for medium skill availability
    if (MEDIUM_SKILL_AVAILABILITY.has(service) || dependencies.some(dep => MEDIUM_SKILL_AVAILABILITY.has(dep))) {
      return 'Medium';
    }

    // Default: Low (unknown technologies assumed to have low skill availability)
    return 'Low';
  }

  /**
   * Calculate adoption risk based on multiple factors
   */
  private calculateAdoptionRisk(
    complexity: 'High' | 'Medium' | 'Low',
    documentationQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor',
    communitySupport: 'Strong' | 'Moderate' | 'Weak',
    skillAvailability: 'High' | 'Medium' | 'Low'
  ): 'High' | 'Medium' | 'Low' {
    // Calculate risk score (higher = more risk)
    let riskScore = 0;

    // Complexity contributes most to risk
    if (complexity === 'High') riskScore += 3;
    else if (complexity === 'Medium') riskScore += 2;
    else riskScore += 1;

    // Documentation quality reduces risk
    if (documentationQuality === 'Poor') riskScore += 2;
    else if (documentationQuality === 'Fair') riskScore += 1;

    // Community support reduces risk
    if (communitySupport === 'Weak') riskScore += 2;
    else if (communitySupport === 'Moderate') riskScore += 1;

    // Skill availability reduces risk
    if (skillAvailability === 'Low') riskScore += 2;
    else if (skillAvailability === 'Medium') riskScore += 1;

    // Classify risk level
    if (riskScore >= 6) return 'High';
    if (riskScore >= 3) return 'Medium';
    return 'Low';
  }
}
