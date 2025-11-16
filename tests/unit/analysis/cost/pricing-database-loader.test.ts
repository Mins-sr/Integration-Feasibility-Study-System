/**
 * Pricing Database Loader Unit Tests
 *
 * Tests for loading and caching pricing data from local files.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile } from 'fs/promises';
import { PricingDatabaseLoader } from '@/analysis/cost/pricing-database-loader';
import type { PricingData } from '@/analysis/cost/types';

// Mock fs/promises
vi.mock('fs/promises');
const mockedReadFile = vi.mocked(readFile);

describe('PricingDatabaseLoader', () => {
  let loader: PricingDatabaseLoader;
  const mockDatabasePath = '/mock/pricing-db';

  beforeEach(() => {
    loader = new PricingDatabaseLoader(mockDatabasePath);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadPricingData', () => {
    it('should load pricing data from JSON file', async () => {
      // Arrange: Mock file read to return valid pricing data
      const mockPricingData: PricingData = {
        service: 'AWS Lambda',
        pricingModel: 'pay-per-use',
        pricing: {
          requestCost: 0.0000002, // $0.20 per 1M requests
          gbSecondCost: 0.0000166667, // $0.0000166667 per GB-second
        },
        freeTier: {
          requestsPerMonth: 1000000,
          gbSecondsPerMonth: 400000,
        },
        updatedAt: '2025-01-15T00:00:00Z',
      };

      mockedReadFile.mockResolvedValue(JSON.stringify(mockPricingData));

      // Act: Load pricing data for AWS Lambda
      const result = await loader.loadPricingData('aws-lambda');

      // Assert: Should return parsed pricing data
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.service).toBe('AWS Lambda');
        expect(result.value.pricingModel).toBe('pay-per-use');
        expect(result.value.pricing.requestCost).toBe(0.0000002);
        expect(result.value.updatedAt).toBe('2025-01-15T00:00:00Z');
      }

      // Verify file was read from correct path
      expect(mockedReadFile).toHaveBeenCalledWith(
        expect.stringContaining('aws-lambda'),
        'utf-8'
      );
    });

    it('should return error when pricing file does not exist', async () => {
      // Arrange: Mock file read to simulate missing file
      mockedReadFile.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      // Act: Try to load non-existent pricing data
      const result = await loader.loadPricingData('non-existent-service');

      // Assert: Should return PRICING_DATA_NOT_FOUND error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('PRICING_DATA_NOT_FOUND');
        expect(result.error.service).toBe('non-existent-service');
      }
    });

    it('should return error when pricing data has invalid JSON format', async () => {
      // Arrange: Mock file read to return malformed JSON
      mockedReadFile.mockResolvedValue('{ invalid json }');

      // Act: Try to load invalid pricing data
      const result = await loader.loadPricingData('invalid-service');

      // Assert: Should return parsing error
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.type).toBe('PRICING_DATA_NOT_FOUND');
      }
    });
  });

  describe('caching', () => {
    it('should cache pricing data in memory after first load', async () => {
      // Arrange: Mock file read for first call
      const mockPricingData: PricingData = {
        service: 'Stripe API',
        pricingModel: 'percentage',
        pricing: {
          transactionFee: 0.029, // 2.9%
          fixedFee: 0.30, // $0.30 per transaction
        },
        freeTier: null,
        updatedAt: '2025-01-15T00:00:00Z',
      };

      mockedReadFile.mockResolvedValue(JSON.stringify(mockPricingData));

      // Act: Load pricing data twice
      const result1 = await loader.loadPricingData('stripe');
      const result2 = await loader.loadPricingData('stripe');

      // Assert: File should only be read once (cached)
      expect(mockedReadFile).toHaveBeenCalledTimes(1);
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.value).toEqual(result2.value);
      }
    });

    it('should load different services separately', async () => {
      // Arrange: Mock different pricing data for different services
      const awsPricing: PricingData = {
        service: 'AWS Lambda',
        pricingModel: 'pay-per-use',
        pricing: { requestCost: 0.0000002 },
        freeTier: { requestsPerMonth: 1000000, gbSecondsPerMonth: 400000 },
        updatedAt: '2025-01-15T00:00:00Z',
      };

      const stripePricing: PricingData = {
        service: 'Stripe API',
        pricingModel: 'percentage',
        pricing: { transactionFee: 0.029, fixedFee: 0.30 },
        freeTier: null,
        updatedAt: '2025-01-15T00:00:00Z',
      };

      mockedReadFile
        .mockResolvedValueOnce(JSON.stringify(awsPricing))
        .mockResolvedValueOnce(JSON.stringify(stripePricing));

      // Act: Load different services
      const awsResult = await loader.loadPricingData('aws-lambda');
      const stripeResult = await loader.loadPricingData('stripe');

      // Assert: Should load both services and cache separately
      expect(mockedReadFile).toHaveBeenCalledTimes(2);
      expect(awsResult.success).toBe(true);
      expect(stripeResult.success).toBe(true);

      if (awsResult.success && stripeResult.success) {
        expect(awsResult.value.service).toBe('AWS Lambda');
        expect(stripeResult.value.service).toBe('Stripe API');
      }
    });
  });

  describe('metadata', () => {
    it('should include updatedAt timestamp in pricing data', async () => {
      // Arrange: Mock pricing data with timestamp
      const mockPricingData: PricingData = {
        service: 'Test Service',
        pricingModel: 'monthly',
        pricing: { monthlyCost: 99.99 },
        freeTier: null,
        updatedAt: '2025-01-15T10:30:00Z',
      };

      mockedReadFile.mockResolvedValue(JSON.stringify(mockPricingData));

      // Act: Load pricing data
      const result = await loader.loadPricingData('test-service');

      // Assert: Should include updatedAt timestamp
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.updatedAt).toBeDefined();
        expect(result.value.updatedAt).toBe('2025-01-15T10:30:00Z');
      }
    });
  });
});
