/**
 * Pricing Database Loader
 *
 * Loads and caches pricing data from local JSON/YAML files.
 */

import { readFile } from 'fs/promises';
import { join } from 'path';
import type { Result } from '@/types/result';
import type { AnalysisError } from '@/types/error-types';
import type { PricingData } from './types';

/**
 * Pricing Database Loader
 * Loads pricing data from local files and caches in memory for performance
 */
export class PricingDatabaseLoader {
  private readonly databasePath: string;
  private readonly cache: Map<string, PricingData>;

  /**
   * Initialize pricing database loader
   * @param databasePath - Path to pricing database directory
   */
  constructor(databasePath: string = './data/pricing') {
    this.databasePath = databasePath;
    this.cache = new Map();
  }

  /**
   * Load pricing data for a specific service
   * @param serviceId - Service identifier (e.g., 'aws-lambda', 'stripe')
   * @returns Pricing data or error
   */
  async loadPricingData(
    serviceId: string
  ): Promise<Result<PricingData, AnalysisError>> {
    // Check cache first
    const cached = this.cache.get(serviceId);
    if (cached) {
      return {
        success: true,
        value: cached,
      };
    }

    try {
      // Construct file path
      const filePath = join(this.databasePath, `${serviceId}.json`);

      // Read pricing data file
      const fileContent = await readFile(filePath, 'utf-8');

      // Parse JSON
      const pricingData = JSON.parse(fileContent) as PricingData;

      // Cache for future requests
      this.cache.set(serviceId, pricingData);

      return {
        success: true,
        value: pricingData,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          type: 'PRICING_DATA_NOT_FOUND',
          service: serviceId,
        },
      };
    }
  }

  /**
   * Clear cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get number of cached entries
   * @returns Cache size
   */
  getCacheSize(): number {
    return this.cache.size;
  }
}
