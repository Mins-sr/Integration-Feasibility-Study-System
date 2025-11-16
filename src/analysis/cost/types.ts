/**
 * Cost Analysis Types
 *
 * Type definitions for cost estimation and ROI calculation.
 */

import type { TargetConfig } from '@/types/config-types';

/**
 * Cost Analysis Configuration
 */
export interface CostAnalysisConfig {
  readonly service: string; // e.g., "AWS Lambda", "Stripe API"
  readonly expectedTraffic: {
    readonly requestsPerMonth: number;
    readonly dataTransferGB: number;
  };
  readonly implementation: {
    readonly initialDevelopmentHours: number;
    readonly hourlyRate: number;
  };
  readonly expectedBenefits?: number; // Optional: expected revenue or cost savings
}

/**
 * Pricing Data from Database
 */
export interface PricingData {
  readonly service: string;
  readonly pricingModel: 'pay-per-use' | 'monthly' | 'percentage' | 'tiered';
  readonly pricing: Record<string, number>; // Flexible pricing structure
  readonly freeTier: {
    readonly requestsPerMonth?: number;
    readonly gbSecondsPerMonth?: number;
    readonly dataTransferGB?: number;
  } | null;
  readonly updatedAt: string; // ISO 8601 timestamp
}

/**
 * Cost Breakdown by Category
 */
export interface CostBreakdown {
  readonly category: string;
  readonly amount: number;
  readonly unit: string; // e.g., "per month", "per request"
}

/**
 * Cost Estimation Report
 */
export interface CostEstimationReport {
  readonly directCosts: {
    readonly licensing: number;
    readonly usage: number;
    readonly infrastructure: number;
  };
  readonly indirectCosts: {
    readonly maintenance: number;
    readonly support: number;
  };
  readonly totalCosts: number;
  readonly roi: number; // percentage
  readonly breakdown: CostBreakdown[];
  readonly generatedAt: string; // ISO 8601 timestamp
}

/**
 * Development Effort Estimation
 */
export interface DevelopmentEffortEstimate {
  readonly initialDevelopment: {
    readonly hours: number;
    readonly cost: number;
  };
  readonly testing: {
    readonly hours: number;
    readonly cost: number;
  };
  readonly maintenance: {
    readonly hoursPerMonth: number;
    readonly costPerMonth: number;
  };
  readonly total: {
    readonly hours: number;
    readonly cost: number;
  };
}
