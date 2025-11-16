/**
 * Compatibility Checker
 *
 * Analyzes version compatibility between existing stack and target integration.
 * Uses semantic versioning (semver) for dependency constraint matching.
 */

import * as semver from 'semver';
import type {
  RiskAnalysisConfig,
  CompatibilityData,
  CompatibilityResult,
  Conflict,
  Upgrade,
} from './types';

export class CompatibilityChecker {
  constructor(private readonly compatibilityDatabase: Map<string, CompatibilityData>) {}

  /**
   * Check compatibility between existing stack and target integration
   *
   * @param config - Risk analysis configuration with existing stack and target integration
   * @returns Compatibility result with conflicts and upgrade recommendations
   */
  checkCompatibility(config: RiskAnalysisConfig): CompatibilityResult {
    const { existingStack, targetIntegration } = config;
    const compatData = this.compatibilityDatabase.get(targetIntegration.service);

    // If service not found in database, return compatible with no constraints
    if (!compatData) {
      return {
        compatible: true,
        conflicts: [],
        requiredUpgrades: [],
      };
    }

    const conflicts: Conflict[] = [];
    const requiredUpgrades: Upgrade[] = [];

    // Check language version compatibility
    this.checkLanguageCompatibility(existingStack.language, compatData, conflicts);

    // Check required dependencies
    for (const requiredDep of compatData.requiredDependencies) {
      if (requiredDep.optional) continue;

      const installedVersion = existingStack.libraries[requiredDep.name];

      // Missing dependency
      if (!installedVersion) {
        conflicts.push({
          component: requiredDep.name,
          current: 'not installed',
          required: requiredDep.versionConstraint,
          severity: 'Blocking',
        });
        continue;
      }

      // Check version constraint
      if (!semver.satisfies(installedVersion, requiredDep.versionConstraint)) {
        conflicts.push({
          component: requiredDep.name,
          current: installedVersion,
          required: requiredDep.versionConstraint,
          severity: 'Blocking',
        });
      } else {
        // Check if upgrade is recommended (not at latest compatible version)
        const minVersion = this.extractMinVersion(requiredDep.versionConstraint);
        if (minVersion && semver.eq(installedVersion, minVersion)) {
          // At minimum version, recommend upgrade
          const latestInRange = this.getLatestVersionInRange(requiredDep.versionConstraint);
          if (latestInRange && semver.gt(latestInRange, installedVersion)) {
            requiredUpgrades.push({
              component: requiredDep.name,
              from: installedVersion,
              to: latestInRange,
              reason: 'Running at minimum supported version, upgrade recommended for better stability',
            });
          }
        }
      }
    }

    // Check known conflicts
    for (const knownConflict of compatData.knownConflicts) {
      const installedVersion = existingStack.libraries[knownConflict.library];

      if (installedVersion) {
        try {
          if (semver.satisfies(installedVersion, knownConflict.version)) {
            conflicts.push({
              component: knownConflict.library,
              current: installedVersion,
              required: `not ${knownConflict.version}`,
              severity: knownConflict.severity,
            });
          }
        } catch (error) {
          // Invalid semver range, skip this conflict check
          continue;
        }
      }
    }

    // Sort conflicts by severity (Blocking > High > Medium > Low)
    const severityOrder: Record<string, number> = {
      Blocking: 0,
      High: 1,
      Medium: 2,
      Low: 3,
    };
    conflicts.sort((a, b) => (severityOrder[a.severity] ?? 99) - (severityOrder[b.severity] ?? 99));

    // Determine overall compatibility
    // Blocking or High severity conflicts mean incompatible
    const hasBlockingConflict = conflicts.some(
      c => c.severity === 'Blocking' || c.severity === 'High'
    );
    const compatible = !hasBlockingConflict;

    return {
      compatible,
      conflicts,
      requiredUpgrades,
    };
  }

  /**
   * Check language version compatibility
   */
  private checkLanguageCompatibility(
    currentLanguage: string,
    compatData: CompatibilityData,
    _conflicts: Conflict[]
  ): void {
    // Language check is simplified for this implementation
    // In a real implementation, this would check against supportedLanguages
    const languageSupport = compatData.supportedLanguages.find(
      sl => sl.language === currentLanguage
    );

    if (!languageSupport) {
      // Language not supported (simplified check - would need actual version)
      // For now, we assume language is compatible if it exists in the stack
      return;
    }

    // Additional language version checks would go here
  }

  /**
   * Extract minimum version from semver constraint
   */
  private extractMinVersion(constraint: string): string | null | undefined {
    // Parse constraint like ">=10.0.0 <15.0.0" to get minimum version
    const match = constraint.match(/>=?\s*([0-9.]+)/);
    return match ? match[1] : null;
  }

  /**
   * Get latest version that satisfies the constraint
   * Simplified implementation - in production would query npm registry
   */
  private getLatestVersionInRange(constraint: string): string | null | undefined {
    // Simplified: extract the upper bound and return a version just below it
    const upperMatch = constraint.match(/<\s*([0-9.]+)/);
    if (upperMatch) {
      const upperBound = upperMatch[1];
      const parsed = semver.parse(upperBound);
      if (parsed) {
        // Return previous major version
        return `${parsed.major - 1}.99.99`;
      }
    }

    // Fallback: suggest a higher patch version
    const minVersion = this.extractMinVersion(constraint);
    if (minVersion) {
      const parsed = semver.parse(minVersion);
      if (parsed) {
        return `${parsed.major}.${parsed.minor}.${parsed.patch + 10}`;
      }
    }

    return null;
  }
}
