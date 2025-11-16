/**
 * ROI Calculator Unit Tests
 *
 * Tests for ROI calculation and cost breakdown generation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ROICalculator } from '@/analysis/cost/roi-calculator';
import type { CostBreakdown } from '@/analysis/cost/types';

describe('ROICalculator', () => {
  let calculator: ROICalculator;

  beforeEach(() => {
    calculator = new ROICalculator();
  });

  describe('calculateROI', () => {
    it('should calculate ROI using formula: (Net Benefits / Total Costs) × 100', () => {
      // Arrange: Total costs and expected benefits
      const totalCosts = 10000;
      const expectedBenefits = 15000;

      // Act: Calculate ROI
      const roi = calculator.calculateROI(totalCosts, expectedBenefits);

      // Assert: ROI = ((15000 - 10000) / 10000) × 100 = 50%
      expect(roi).toBeCloseTo(50, 2);
    });

    it('should return negative ROI when costs exceed benefits', () => {
      // Arrange: Benefits less than costs
      const totalCosts = 10000;
      const expectedBenefits = 8000;

      // Act: Calculate ROI
      const roi = calculator.calculateROI(totalCosts, expectedBenefits);

      // Assert: ROI = ((8000 - 10000) / 10000) × 100 = -20%
      expect(roi).toBeCloseTo(-20, 2);
    });

    it('should handle zero costs by returning Infinity', () => {
      // Arrange: Zero costs (edge case)
      const totalCosts = 0;
      const expectedBenefits = 5000;

      // Act: Calculate ROI
      const roi = calculator.calculateROI(totalCosts, expectedBenefits);

      // Assert: Division by zero -> Infinity
      expect(roi).toBe(Infinity);
    });

    it('should return zero ROI when benefits equal costs', () => {
      // Arrange: Break-even scenario
      const totalCosts = 10000;
      const expectedBenefits = 10000;

      // Act: Calculate ROI
      const roi = calculator.calculateROI(totalCosts, expectedBenefits);

      // Assert: ROI = 0%
      expect(roi).toBe(0);
    });
  });

  describe('generateCostBreakdown', () => {
    it('should generate breakdown by cost category', () => {
      // Arrange: Direct and indirect costs
      const directCosts = {
        licensing: 1000,
        usage: 5000,
        infrastructure: 2000,
      };

      const indirectCosts = {
        maintenance: 1200,
        support: 500,
      };

      // Act: Generate breakdown
      const breakdown = calculator.generateCostBreakdown(directCosts, indirectCosts);

      // Assert: Should include all categories
      expect(breakdown).toHaveLength(5);

      const licensing = breakdown.find((b) => b.category === 'Licensing');
      expect(licensing).toBeDefined();
      expect(licensing!.amount).toBe(1000);
      expect(licensing!.unit).toContain('month');

      const usage = breakdown.find((b) => b.category === 'Usage');
      expect(usage).toBeDefined();
      expect(usage!.amount).toBe(5000);

      const maintenance = breakdown.find((b) => b.category === 'Maintenance');
      expect(maintenance).toBeDefined();
      expect(maintenance!.amount).toBe(1200);
    });

    it('should include unit information for each cost item', () => {
      // Arrange: Costs
      const directCosts = {
        licensing: 100,
        usage: 500,
        infrastructure: 200,
      };

      const indirectCosts = {
        maintenance: 50,
        support: 25,
      };

      // Act: Generate breakdown
      const breakdown = calculator.generateCostBreakdown(directCosts, indirectCosts);

      // Assert: All items should have unit information
      breakdown.forEach((item) => {
        expect(item.unit).toBeDefined();
        expect(item.unit.length).toBeGreaterThan(0);
      });
    });

    it('should filter out zero-cost items', () => {
      // Arrange: Some costs are zero
      const directCosts = {
        licensing: 0,
        usage: 1000,
        infrastructure: 0,
      };

      const indirectCosts = {
        maintenance: 150,
        support: 0,
      };

      // Act: Generate breakdown
      const breakdown = calculator.generateCostBreakdown(directCosts, indirectCosts);

      // Assert: Should only include non-zero items
      expect(breakdown.length).toBe(2); // Only usage and maintenance
      expect(breakdown.find((b) => b.category === 'Usage')).toBeDefined();
      expect(breakdown.find((b) => b.category === 'Maintenance')).toBeDefined();
      expect(breakdown.find((b) => b.category === 'Licensing')).toBeUndefined();
    });
  });

  describe('customizable expected benefits', () => {
    it('should allow user to provide custom expected benefits', () => {
      // Arrange: Different benefit scenarios
      const totalCosts = 5000;

      // Act & Assert: Calculate ROI with different benefits
      const roi1 = calculator.calculateROI(totalCosts, 10000); // High benefit
      expect(roi1).toBeCloseTo(100, 2); // 100% ROI

      const roi2 = calculator.calculateROI(totalCosts, 6000); // Low benefit
      expect(roi2).toBeCloseTo(20, 2); // 20% ROI

      const roi3 = calculator.calculateROI(totalCosts, 5000); // Break-even
      expect(roi3).toBe(0); // 0% ROI
    });
  });

  describe('formatCostBreakdown', () => {
    it('should format breakdown with category labels and amounts', () => {
      // Arrange: Sample breakdown
      const breakdown: CostBreakdown[] = [
        { category: 'Licensing', amount: 1000, unit: 'per month' },
        { category: 'Usage', amount: 2500.50, unit: 'per month' },
      ];

      // Act: Format breakdown
      const formatted = calculator.formatCostBreakdown(breakdown);

      // Assert: Should return human-readable format
      expect(formatted).toContain('Licensing');
      expect(formatted).toContain('1000');
      expect(formatted).toContain('Usage');
      expect(formatted).toContain('2500.50');
      expect(formatted).toContain('per month');
    });
  });
});
