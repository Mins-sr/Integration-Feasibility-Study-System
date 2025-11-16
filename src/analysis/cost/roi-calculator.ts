/**
 * ROI Calculator
 *
 * Calculates Return on Investment (ROI) and generates cost breakdowns.
 */

import type { CostBreakdown } from './types';

/**
 * ROI Calculator
 * Implements ROI formula: (Net Benefits / Total Costs) × 100
 */
export class ROICalculator {
  /**
   * Calculate ROI percentage
   * @param totalCosts - Total costs (direct + indirect)
   * @param expectedBenefits - Expected revenue or cost savings
   * @returns ROI as percentage
   */
  calculateROI(totalCosts: number, expectedBenefits: number): number {
    // Handle zero costs edge case
    if (totalCosts === 0) {
      return Infinity;
    }

    // ROI formula: ((Expected Benefits - Total Costs) / Total Costs) × 100
    const netBenefits = expectedBenefits - totalCosts;
    const roi = (netBenefits / totalCosts) * 100;

    return roi;
  }

  /**
   * Generate cost breakdown by category
   * @param directCosts - Direct costs
   * @param indirectCosts - Indirect costs
   * @returns Array of cost breakdowns
   */
  generateCostBreakdown(
    directCosts: { licensing: number; usage: number; infrastructure: number },
    indirectCosts: { maintenance: number; support: number }
  ): CostBreakdown[] {
    const breakdown: CostBreakdown[] = [];

    // Add direct costs
    if (directCosts.licensing > 0) {
      breakdown.push({
        category: 'Licensing',
        amount: directCosts.licensing,
        unit: 'per month',
      });
    }

    if (directCosts.usage > 0) {
      breakdown.push({
        category: 'Usage',
        amount: directCosts.usage,
        unit: 'per month',
      });
    }

    if (directCosts.infrastructure > 0) {
      breakdown.push({
        category: 'Infrastructure',
        amount: directCosts.infrastructure,
        unit: 'per month',
      });
    }

    // Add indirect costs
    if (indirectCosts.maintenance > 0) {
      breakdown.push({
        category: 'Maintenance',
        amount: indirectCosts.maintenance,
        unit: 'per month',
      });
    }

    if (indirectCosts.support > 0) {
      breakdown.push({
        category: 'Support',
        amount: indirectCosts.support,
        unit: 'per month',
      });
    }

    return breakdown;
  }

  /**
   * Format cost breakdown as human-readable string
   * @param breakdown - Cost breakdown array
   * @returns Formatted string
   */
  formatCostBreakdown(breakdown: CostBreakdown[]): string {
    return breakdown
      .map((item) => `${item.category}: $${item.amount.toFixed(2)} ${item.unit}`)
      .join('\n');
  }
}
