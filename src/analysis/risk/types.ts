/**
 * Risk Analysis Types
 *
 * Type definitions for technical risk assessment and compatibility checking.
 */

/**
 * Risk Analysis Configuration
 */
export interface RiskAnalysisConfig {
  readonly existingStack: {
    readonly language: string;
    readonly frameworks: string[];
    readonly libraries: Record<string, string>; // name -> version
  };
  readonly targetIntegration: {
    readonly service: string;
    readonly requiredDependencies: string[];
  };
}

/**
 * Compatibility Result
 */
export interface CompatibilityResult {
  readonly compatible: boolean;
  readonly conflicts: Conflict[];
  readonly requiredUpgrades: Upgrade[];
}

/**
 * Version Conflict
 */
export interface Conflict {
  readonly component: string;
  readonly current: string;
  readonly required: string;
  readonly severity: 'Blocking' | 'High' | 'Medium' | 'Low';
}

/**
 * Upgrade Recommendation
 */
export interface Upgrade {
  readonly component: string;
  readonly from: string;
  readonly to: string;
  readonly reason: string;
}

/**
 * Vendor Lock-in Risk
 */
export interface VendorLockInRisk {
  readonly riskLevel: 'High' | 'Medium' | 'Low';
  readonly proprietaryDependencies: string[];
  readonly dataPortability: 'Full' | 'Partial' | 'None';
  readonly apiCoupling: 'Tight' | 'Moderate' | 'Loose';
  readonly assessment: string;
}

/**
 * Scalability Assessment
 */
export interface ScalabilityAssessment {
  readonly horizontalScaling: 'Supported' | 'Limited' | 'Not Supported';
  readonly verticalScalingLimits: {
    readonly cpu?: string;
    readonly memory?: string;
    readonly connections?: number;
  };
  readonly extensionPoints: string[];
  readonly performanceAtScale: 'Excellent' | 'Good' | 'Fair' | 'Poor';
}

/**
 * Learning Curve Risk
 */
export interface LearningCurveRisk {
  readonly estimatedLearningHours: number;
  readonly complexity: 'High' | 'Medium' | 'Low';
  readonly documentationQuality: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  readonly communitySupport: 'Strong' | 'Moderate' | 'Weak';
  readonly skillAvailability: 'High' | 'Medium' | 'Low';
  readonly adoptionRisk: 'High' | 'Medium' | 'Low';
}

/**
 * Risk Mitigation Strategy
 */
export interface Mitigation {
  readonly risk: string;
  readonly strategy: string;
  readonly effort: 'High' | 'Medium' | 'Low';
  readonly priority: number; // 1 (highest) to 5 (lowest)
  readonly timeline?: string;
}

/**
 * Risk Assessment Report
 */
export interface RiskAssessmentReport {
  readonly compatibility: CompatibilityResult;
  readonly vendorLockIn: VendorLockInRisk;
  readonly scalability: ScalabilityAssessment;
  readonly learningCurve: LearningCurveRisk;
  readonly mitigations: Mitigation[];
  readonly generatedAt: string; // ISO 8601 timestamp
}

/**
 * Compatibility Database Entry
 */
export interface CompatibilityData {
  readonly service: string;
  readonly requiredDependencies: Array<{
    readonly name: string;
    readonly versionConstraint: string; // semver constraint
    readonly optional: boolean;
  }>;
  readonly supportedLanguages: Array<{
    readonly language: string;
    readonly minVersion: string;
  }>;
  readonly knownConflicts: Array<{
    readonly library: string;
    readonly version: string;
    readonly severity: 'Blocking' | 'High' | 'Medium' | 'Low';
    readonly reason: string;
  }>;
  readonly updatedAt: string; // ISO 8601 timestamp
}
