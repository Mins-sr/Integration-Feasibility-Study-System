/**
 * Cost Calculator
 *
 * Calculates direct costs, indirect costs, and total costs for integration services.
 */

import type { Result } from '@/types/result';
import type { AnalysisError } from '@/types/error-types';
import type { PricingData } from './types';

/**
 * Direct costs calculation result
 */
interface DirectCostsResult {
  readonly licensing: number;
  readonly usage: number;
  readonly infrastructure: number;
  readonly warnings?: string[];
}

/**
 * Indirect costs
 */
interface IndirectCosts {
  readonly maintenance: number;
  readonly support: number;
}

/**
 * Cost Calculator
 * Handles cost calculation with support for different pricing models
 */
export class CostCalculator {
  private readonly UNREALISTIC_TRAFFIC_THRESHOLD = 100000000000; // 100 billion requests/month

  /**
   * Calculate direct costs based on pricing and traffic
   * @param pricingData - Service pricing information
   * @param traffic - Expected traffic estimates
   * @param options - Additional calculation options
   * @returns Direct costs or error
   */
  calculateDirectCosts(
    pricingData: PricingData,
    traffic: { requestsPerMonth: number; dataTransferGB: number },
    options?: { avgTransactionValue?: number }
  ): Result<DirectCostsResult, AnalysisError> {
    // Validate traffic estimate
    if (!this.validateTrafficEstimate(traffic)) {
      return {
        success: false,
        error: {
          type: 'INVALID_TRAFFIC_ESTIMATE',
          message: 'Traffic estimates must be positive numbers',
        },
      };
    }

    const warnings: string[] = [];

    // Check for unrealistically high traffic
    if (traffic.requestsPerMonth > this.UNREALISTIC_TRAFFIC_THRESHOLD) {
      warnings.push(
        `Traffic estimate (${traffic.requestsPerMonth} requests/month) is unusually high. Please verify.`
      );
    }

    let usageCost = 0;

    // Calculate usage cost based on pricing model
    switch (pricingData.pricingModel) {
      case 'pay-per-use': {
        const billableRequests = this.calculateBillableRequests(
          traffic.requestsPerMonth,
          pricingData.freeTier?.requestsPerMonth || 0
        );

        const requestCost = pricingData.pricing.requestCost || 0;
        usageCost = billableRequests * requestCost;
        break;
      }

      case 'percentage': {
        // For percentage-based pricing (e.g., Stripe)
        const transactionFee = pricingData.pricing.transactionFee || 0;
        const fixedFee = pricingData.pricing.fixedFee || 0;
        const avgValue = options?.avgTransactionValue || 0;

        usageCost = traffic.requestsPerMonth * (avgValue * transactionFee + fixedFee);
        break;
      }

      case 'monthly': {
        // Fixed monthly cost
        usageCost = pricingData.pricing.monthlyCost || 0;
        break;
      }

      case 'tiered': {
        // Tiered pricing (simplified - would need more complex logic in production)
        usageCost = traffic.requestsPerMonth * (pricingData.pricing.requestCost || 0);
        break;
      }
    }

    const result: DirectCostsResult = {
      licensing: 0, // To be calculated separately if needed
      usage: usageCost,
      infrastructure: 0, // To be calculated based on resource requirements
    };

    if (warnings.length > 0) {
      return {
        success: true,
        value: { ...result, warnings },
      };
    }

    return {
      success: true,
      value: result,
    };
  }

  /**
   * Calculate indirect costs (maintenance and support)
   * @param directCosts - Direct costs to base calculations on
   * @param maintenanceRate - Maintenance rate as percentage (e.g., 0.15 for 15%)
   * @param supportCost - Optional monthly support cost
   * @returns Indirect costs
   */
  calculateIndirectCosts(
    directCosts: { licensing: number; usage: number; infrastructure: number },
    maintenanceRate: number,
    supportCost: number = 0
  ): IndirectCosts {
    const totalDirectCosts = directCosts.licensing + directCosts.usage + directCosts.infrastructure;
    const maintenanceCost = totalDirectCosts * maintenanceRate;

    return {
      maintenance: maintenanceCost,
      support: supportCost,
    };
  }

  /**
   * Calculate total costs from direct and indirect costs
   * @param directCosts - Direct costs
   * @param indirectCosts - Indirect costs
   * @returns Total cost
   */
  calculateTotalCosts(
    directCosts: { licensing: number; usage: number; infrastructure: number },
    indirectCosts: { maintenance: number; support: number }
  ): number {
    return (
      directCosts.licensing +
      directCosts.usage +
      directCosts.infrastructure +
      indirectCosts.maintenance +
      indirectCosts.support
    );
  }

  /**
   * Validate traffic estimate
   * @param traffic - Traffic estimate to validate
   * @returns True if valid, false otherwise
   */
  validateTrafficEstimate(traffic: { requestsPerMonth: number; dataTransferGB: number }): boolean {
    // Traffic must be non-negative
    return traffic.requestsPerMonth >= 0 && traffic.dataTransferGB >= 0;
  }

  /**
   * Calculate billable requests after free tier deduction
   * @param totalRequests - Total requests
   * @param freeTierRequests - Free tier allowance
   * @returns Billable requests
   */
  private calculateBillableRequests(totalRequests: number, freeTierRequests: number): number {
    const billable = totalRequests - freeTierRequests;
    return Math.max(0, billable);
  }
}
