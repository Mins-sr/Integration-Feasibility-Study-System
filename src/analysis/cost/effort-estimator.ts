/**
 * Development Effort Estimator
 *
 * Estimates development effort based on integration complexity.
 */

import type { DevelopmentEffortEstimate } from './types';

/**
 * Integration complexity level
 */
type ComplexityLevel = 'simple' | 'moderate' | 'complex';

/**
 * Integration details for estimation
 */
interface IntegrationDetails {
  readonly complexity: ComplexityLevel;
  readonly customHours?: number;
}

/**
 * Development Effort Estimator
 * Estimates initial development, testing, and maintenance effort
 */
export class DevelopmentEffortEstimator {
  // Base hour estimates by complexity
  private readonly complexityHours: Record<ComplexityLevel, number> = {
    simple: 30, // Simple REST API integration
    moderate: 80, // Multiple endpoints with auth
    complex: 120, // Complex multi-service integration
  };

  // Default ratios
  private readonly defaultTestingRatio = 0.4; // 40% of development time
  private readonly defaultMaintenanceRatio = 0.1; // 10% monthly maintenance

  /**
   * Estimate initial development hours
   * @param integration - Integration details
   * @returns Estimated hours
   */
  estimateInitialDevelopment(integration: IntegrationDetails): number {
    // Use custom hours if provided, otherwise use complexity-based estimate
    return integration.customHours || this.complexityHours[integration.complexity];
  }

  /**
   * Estimate testing effort
   * @param developmentHours - Initial development hours
   * @param testingRatio - Testing as ratio of development (default: 0.4)
   * @returns Testing hours
   */
  estimateTestingEffort(developmentHours: number, testingRatio?: number): number {
    const ratio = testingRatio !== undefined ? testingRatio : this.defaultTestingRatio;
    return developmentHours * ratio;
  }

  /**
   * Estimate monthly maintenance effort
   * @param developmentHours - Initial development hours
   * @param maintenanceRatio - Maintenance as ratio of development (default: 0.1)
   * @returns Monthly maintenance hours
   */
  estimateMaintenanceEffort(developmentHours: number, maintenanceRatio?: number): number {
    const ratio = maintenanceRatio !== undefined ? maintenanceRatio : this.defaultMaintenanceRatio;
    return developmentHours * ratio;
  }

  /**
   * Calculate cost from hours and hourly rate
   * @param hours - Number of hours
   * @param hourlyRate - Cost per hour
   * @returns Total cost
   */
  calculateEffortCost(hours: number, hourlyRate: number): number {
    return hours * hourlyRate;
  }

  /**
   * Generate complete development effort estimate
   * @param integration - Integration details
   * @param hourlyRate - Hourly rate for cost calculation
   * @returns Complete effort estimate
   */
  generateFullEstimate(
    integration: IntegrationDetails,
    hourlyRate: number
  ): DevelopmentEffortEstimate {
    // Estimate hours for each phase
    const initialHours = this.estimateInitialDevelopment(integration);
    const testingHours = this.estimateTestingEffort(initialHours);
    const maintenanceHours = this.estimateMaintenanceEffort(initialHours);

    // Calculate costs
    const initialCost = this.calculateEffortCost(initialHours, hourlyRate);
    const testingCost = this.calculateEffortCost(testingHours, hourlyRate);
    const maintenanceCost = this.calculateEffortCost(maintenanceHours, hourlyRate);

    // Total hours and cost (initial + testing, excluding ongoing maintenance)
    const totalHours = initialHours + testingHours;
    const totalCost = initialCost + testingCost;

    return {
      initialDevelopment: {
        hours: initialHours,
        cost: initialCost,
      },
      testing: {
        hours: testingHours,
        cost: testingCost,
      },
      maintenance: {
        hoursPerMonth: maintenanceHours,
        costPerMonth: maintenanceCost,
      },
      total: {
        hours: totalHours,
        cost: totalCost,
      },
    };
  }
}
