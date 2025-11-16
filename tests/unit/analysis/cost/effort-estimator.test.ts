/**
 * Development Effort Estimator Unit Tests
 *
 * Tests for development effort estimation based on integration complexity.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DevelopmentEffortEstimator } from '@/analysis/cost/effort-estimator';
import type { DevelopmentEffortEstimate } from '@/analysis/cost/types';

describe('DevelopmentEffortEstimator', () => {
  let estimator: DevelopmentEffortEstimator;

  beforeEach(() => {
    estimator = new DevelopmentEffortEstimator();
  });

  describe('estimateInitialDevelopment', () => {
    it('should estimate hours based on integration complexity', () => {
      // Arrange: Different complexity levels
      const simpleIntegration = { complexity: 'simple' as const };
      const moderateIntegration = { complexity: 'moderate' as const };
      const complexIntegration = { complexity: 'complex' as const };

      // Act: Estimate hours for each
      const simpleHours = estimator.estimateInitialDevelopment(simpleIntegration);
      const moderateHours = estimator.estimateInitialDevelopment(moderateIntegration);
      const complexHours = estimator.estimateInitialDevelopment(complexIntegration);

      // Assert: Complex should take more hours than moderate, which takes more than simple
      expect(simpleHours).toBeLessThan(moderateHours);
      expect(moderateHours).toBeLessThan(complexHours);
      expect(simpleHours).toBeGreaterThan(0);
    });

    it('should allow custom hours to override complexity estimate', () => {
      // Arrange: Custom hours provided
      const integration = {
        complexity: 'moderate' as const,
        customHours: 50,
      };

      // Act: Estimate with custom hours
      const hours = estimator.estimateInitialDevelopment(integration);

      // Assert: Should use custom hours
      expect(hours).toBe(50);
    });
  });

  describe('estimateTestingEffort', () => {
    it('should estimate testing hours as percentage of development', () => {
      // Arrange: Development hours
      const developmentHours = 100;
      const testingRatio = 0.4; // 40% of development time

      // Act: Estimate testing hours
      const testingHours = estimator.estimateTestingEffort(developmentHours, testingRatio);

      // Assert: Should be 40 hours
      expect(testingHours).toBe(40);
    });

    it('should use default testing ratio if not provided', () => {
      // Arrange: Only development hours
      const developmentHours = 100;

      // Act: Estimate with default ratio
      const testingHours = estimator.estimateTestingEffort(developmentHours);

      // Assert: Should use default ratio (typically 30-50%)
      expect(testingHours).toBeGreaterThan(0);
      expect(testingHours).toBeLessThanOrEqual(developmentHours);
    });
  });

  describe('estimateMaintenanceEffort', () => {
    it('should estimate monthly maintenance hours', () => {
      // Arrange: Initial development hours
      const developmentHours = 100;
      const maintenanceRatio = 0.1; // 10% monthly

      // Act: Estimate maintenance
      const maintenanceHours = estimator.estimateMaintenanceEffort(developmentHours, maintenanceRatio);

      // Assert: Should be 10 hours/month
      expect(maintenanceHours).toBe(10);
    });
  });

  describe('calculateEffortCost', () => {
    it('should calculate cost using hourly rate', () => {
      // Arrange: Hours and rate
      const hours = 100;
      const hourlyRate = 75;

      // Act: Calculate cost
      const cost = estimator.calculateEffortCost(hours, hourlyRate);

      // Assert: Should be $7500
      expect(cost).toBe(7500);
    });

    it('should handle zero hours', () => {
      // Arrange: Zero hours
      const hours = 0;
      const hourlyRate = 100;

      // Act: Calculate cost
      const cost = estimator.calculateEffortCost(hours, hourlyRate);

      // Assert: Should be zero
      expect(cost).toBe(0);
    });
  });

  describe('generateFullEstimate', () => {
    it('should generate complete development effort estimate', () => {
      // Arrange: Integration details
      const integration = {
        complexity: 'moderate' as const,
      };
      const hourlyRate = 80;

      // Act: Generate full estimate
      const estimate = estimator.generateFullEstimate(integration, hourlyRate);

      // Assert: Should include all phases
      expect(estimate.initialDevelopment).toBeDefined();
      expect(estimate.initialDevelopment.hours).toBeGreaterThan(0);
      expect(estimate.initialDevelopment.cost).toBeGreaterThan(0);

      expect(estimate.testing).toBeDefined();
      expect(estimate.testing.hours).toBeGreaterThan(0);

      expect(estimate.maintenance).toBeDefined();
      expect(estimate.maintenance.hoursPerMonth).toBeGreaterThan(0);

      expect(estimate.total).toBeDefined();
      expect(estimate.total.hours).toBeGreaterThan(0);
      expect(estimate.total.cost).toBeGreaterThan(0);
    });

    it('should break down effort by phase', () => {
      // Arrange: Integration
      const integration = {
        complexity: 'complex' as const,
      };
      const hourlyRate = 100;

      // Act: Generate estimate
      const estimate = estimator.generateFullEstimate(integration, hourlyRate);

      // Assert: Total should sum initial + testing
      const expectedTotalHours = estimate.initialDevelopment.hours + estimate.testing.hours;
      expect(estimate.total.hours).toBeCloseTo(expectedTotalHours, 1);
    });

    it('should calculate costs for each phase', () => {
      // Arrange: Integration with custom hours
      const integration = {
        complexity: 'simple' as const,
        customHours: 40,
      };
      const hourlyRate = 75;

      // Act: Generate estimate
      const estimate = estimator.generateFullEstimate(integration, hourlyRate);

      // Assert: Costs should match hours × rate
      expect(estimate.initialDevelopment.cost).toBe(estimate.initialDevelopment.hours * hourlyRate);
      expect(estimate.testing.cost).toBe(estimate.testing.hours * hourlyRate);
      expect(estimate.maintenance.costPerMonth).toBe(estimate.maintenance.hoursPerMonth * hourlyRate);
    });

    it('should include maintenance as separate from total (ongoing cost)', () => {
      // Arrange: Integration
      const integration = { complexity: 'moderate' as const };
      const hourlyRate = 80;

      // Act: Generate estimate
      const estimate = estimator.generateFullEstimate(integration, hourlyRate);

      // Assert: Total should not include maintenance (which is monthly recurring)
      expect(estimate.total.hours).toBe(
        estimate.initialDevelopment.hours + estimate.testing.hours
      );
    });
  });

  describe('complexity estimation', () => {
    it('should estimate simple integration as low hours', () => {
      // Arrange: Simple REST API integration
      const integration = { complexity: 'simple' as const };

      // Act: Estimate
      const hours = estimator.estimateInitialDevelopment(integration);

      // Assert: Should be reasonable for simple integration (e.g., 20-40 hours)
      expect(hours).toBeGreaterThanOrEqual(20);
      expect(hours).toBeLessThanOrEqual(40);
    });

    it('should estimate complex integration as high hours', () => {
      // Arrange: Complex multi-service integration
      const integration = { complexity: 'complex' as const };

      // Act: Estimate
      const hours = estimator.estimateInitialDevelopment(integration);

      // Assert: Should be higher (e.g., 80-160 hours)
      expect(hours).toBeGreaterThanOrEqual(80);
      expect(hours).toBeLessThanOrEqual(160);
    });
  });
});
