/**
 * Cost Calculator Unit Tests
 *
 * Tests for cost calculation engine including direct costs, indirect costs, and validation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CostCalculator } from '@/analysis/cost/cost-calculator';
import type { CostAnalysisConfig, PricingData } from '@/analysis/cost/types';

describe('CostCalculator', () => {
  let calculator: CostCalculator;

  beforeEach(() => {
    calculator = new CostCalculator();
  });

  describe('calculateDirectCosts', () => {
    it('should calculate usage costs based on traffic and pricing', () => {
      // Arrange: AWS Lambda pricing
      const pricingData: PricingData = {
        service: 'AWS Lambda',
        pricingModel: 'pay-per-use',
        pricing: {
          requestCost: 0.0000002, // $0.20 per 1M requests
        },
        freeTier: {
          requestsPerMonth: 1000000, // 1M free requests
        },
        updatedAt: '2025-01-15T00:00:00Z',
      };

      const traffic = {
        requestsPerMonth: 5000000, // 5M requests
        dataTransferGB: 10,
      };

      // Act: Calculate direct costs
      const result = calculator.calculateDirectCosts(pricingData, traffic);

      // Assert: Should calculate billable requests after free tier
      expect(result.success).toBe(true);
      if (result.success) {
        // 5M - 1M free = 4M billable * $0.0000002 = $0.80
        expect(result.value.usage).toBeCloseTo(0.80, 2);
        expect(result.value.licensing).toBe(0);
        expect(result.value.infrastructure).toBe(0);
      }
    });

    it('should calculate zero cost when within free tier', () => {
      // Arrange: Service with free tier
      const pricingData: PricingData = {
        service: 'Test Service',
        pricingModel: 'pay-per-use',
        pricing: {
          requestCost: 0.001,
        },
        freeTier: {
          requestsPerMonth: 10000,
        },
        updatedAt: '2025-01-15T00:00:00Z',
      };

      const traffic = {
        requestsPerMonth: 5000, // Within free tier
        dataTransferGB: 0,
      };

      // Act: Calculate direct costs
      const result = calculator.calculateDirectCosts(pricingData, traffic);

      // Assert: Should be zero cost
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.usage).toBe(0);
      }
    });

    it('should calculate percentage-based costs (e.g., Stripe)', () => {
      // Arrange: Stripe pricing
      const pricingData: PricingData = {
        service: 'Stripe API',
        pricingModel: 'percentage',
        pricing: {
          transactionFee: 0.029, // 2.9%
          fixedFee: 0.30, // $0.30 per transaction
        },
        freeTier: null,
        updatedAt: '2025-01-15T00:00:00Z',
      };

      const traffic = {
        requestsPerMonth: 1000, // 1000 transactions
        dataTransferGB: 0,
      };

      // Assume average transaction value of $50
      const avgTransactionValue = 50;

      // Act: Calculate direct costs with custom calculation
      const result = calculator.calculateDirectCosts(pricingData, traffic, { avgTransactionValue });

      // Assert: Should calculate percentage + fixed fee
      expect(result.success).toBe(true);
      if (result.success) {
        // 1000 * ($50 * 0.029 + $0.30) = 1000 * $1.75 = $1750
        expect(result.value.usage).toBeCloseTo(1750, 0);
      }
    });

    it('should return error for invalid traffic estimate (negative)', () => {
      // Arrange: Valid pricing data but invalid traffic
      const pricingData: PricingData = {
        service: 'Test Service',
        pricingModel: 'pay-per-use',
        pricing: { requestCost: 0.001 },
        freeTier: null,
        updatedAt: '2025-01-15T00:00:00Z',
      };

      const traffic = {
        requestsPerMonth: -1000, // Invalid: negative
        dataTransferGB: 0,
      };

      // Act: Try to calculate with invalid traffic
      const result = calculator.calculateDirectCosts(pricingData, traffic);

      // Assert: Should return validation error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('INVALID_TRAFFIC_ESTIMATE');
        expect(result.error.message).toContain('positive');
      }
    });

    it('should warn when traffic estimate is unrealistically high', () => {
      // Arrange: Extremely high traffic
      const pricingData: PricingData = {
        service: 'Test Service',
        pricingModel: 'pay-per-use',
        pricing: { requestCost: 0.001 },
        freeTier: null,
        updatedAt: '2025-01-15T00:00:00Z',
      };

      const traffic = {
        requestsPerMonth: 1000000000000, // 1 trillion requests (unrealistic)
        dataTransferGB: 0,
      };

      // Act: Calculate with high traffic
      const result = calculator.calculateDirectCosts(pricingData, traffic);

      // Assert: Should succeed but include warning
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.warnings).toBeDefined();
        expect(result.value.warnings!.length).toBeGreaterThan(0);
        expect(result.value.warnings![0]).toContain('Traffic estimate');
      }
    });
  });

  describe('calculateIndirectCosts', () => {
    it('should calculate maintenance costs as percentage of total', () => {
      // Arrange: Direct costs
      const directCosts = {
        licensing: 100,
        usage: 500,
        infrastructure: 200,
      };

      const maintenanceRate = 0.15; // 15% of direct costs

      // Act: Calculate indirect costs
      const result = calculator.calculateIndirectCosts(directCosts, maintenanceRate);

      // Assert: Should calculate 15% of $800 = $120
      expect(result.maintenance).toBeCloseTo(120, 2);
      expect(result.support).toBe(0); // Default
    });

    it('should include support costs if provided', () => {
      // Arrange: Direct costs with support
      const directCosts = {
        licensing: 0,
        usage: 1000,
        infrastructure: 0,
      };

      const maintenanceRate = 0.10;
      const supportCost = 50; // Monthly support fee

      // Act: Calculate indirect costs with support
      const result = calculator.calculateIndirectCosts(directCosts, maintenanceRate, supportCost);

      // Assert: Should include both maintenance and support
      expect(result.maintenance).toBeCloseTo(100, 2); // 10% of $1000
      expect(result.support).toBe(50);
    });
  });

  describe('calculateTotalCosts', () => {
    it('should sum direct and indirect costs correctly', () => {
      // Arrange: All cost components
      const directCosts = {
        licensing: 100,
        usage: 500,
        infrastructure: 200,
      };

      const indirectCosts = {
        maintenance: 120,
        support: 50,
      };

      // Act: Calculate total
      const total = calculator.calculateTotalCosts(directCosts, indirectCosts);

      // Assert: Should sum all costs
      expect(total).toBe(970); // 100 + 500 + 200 + 120 + 50
    });

    it('should handle zero costs', () => {
      // Arrange: All zeros
      const directCosts = {
        licensing: 0,
        usage: 0,
        infrastructure: 0,
      };

      const indirectCosts = {
        maintenance: 0,
        support: 0,
      };

      // Act: Calculate total
      const total = calculator.calculateTotalCosts(directCosts, indirectCosts);

      // Assert: Should be zero
      expect(total).toBe(0);
    });
  });

  describe('validation', () => {
    it('should validate that traffic estimates are positive integers', () => {
      // Arrange: Zero traffic
      const pricingData: PricingData = {
        service: 'Test',
        pricingModel: 'pay-per-use',
        pricing: { requestCost: 0.001 },
        freeTier: null,
        updatedAt: '2025-01-15T00:00:00Z',
      };

      const traffic = {
        requestsPerMonth: 0,
        dataTransferGB: 0,
      };

      // Act: Validate
      const isValid = calculator.validateTrafficEstimate(traffic);

      // Assert: Zero should be valid (no usage)
      expect(isValid).toBe(true);
    });

    it('should reject negative traffic values', () => {
      // Arrange: Negative values
      const traffic = {
        requestsPerMonth: -100,
        dataTransferGB: 5,
      };

      // Act: Validate
      const isValid = calculator.validateTrafficEstimate(traffic);

      // Assert: Should be invalid
      expect(isValid).toBe(false);
    });
  });
});
