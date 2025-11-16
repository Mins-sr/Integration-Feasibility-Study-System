/**
 * Scalability Analyzer
 *
 * Analyzes horizontal scaling support, vertical scaling limits,
 * extension points, and performance at scale.
 */

import type { RiskAnalysisConfig, ScalabilityAssessment } from './types';

/**
 * Services with horizontal scaling support
 */
const HORIZONTALLY_SCALABLE_SERVICES = new Set([
  'rest-api',
  'graphql-server',
  'apollo-server',
  'microservice-api',
  'cdn-integration',
  'cloudflare',
]);

/**
 * Services with limited horizontal scaling (stateful)
 */
const LIMITED_SCALING_SERVICES = new Set([
  'websocket-server',
  'socket.io',
  'long-polling',
  'sse-server', // Server-Sent Events
]);

/**
 * Services that don't support horizontal scaling
 */
const NO_SCALING_SERVICES = new Set([
  'local-file-storage',
  'fs',
  'sqlite',
  'in-memory-cache',
]);

/**
 * Resource-intensive services (high vertical scaling limits)
 */
const RESOURCE_INTENSIVE_SERVICES = new Set([
  'video-processing',
  'ffmpeg',
  'image-processing',
  'machine-learning',
  'tensorflow',
]);

/**
 * Services with webhook support
 */
const WEBHOOK_SERVICES = new Set([
  'stripe',
  'stripe-api',
  'twilio',
  'sendgrid',
  'github-api',
  'gitlab-api',
]);

/**
 * Services with plugin/extension support
 */
const PLUGIN_SERVICES = new Set([
  'apollo-server',
  'graphql',
  'express',
  'fastify',
  'koa',
]);

/**
 * Database services with connection limits
 */
const DATABASE_SERVICES: Record<string, number> = {
  pg: 100, // PostgreSQL default max connections
  mysql: 151, // MySQL default max connections
  mongodb: 65536, // MongoDB default max connections
  redis: 10000, // Redis default max clients
  ioredis: 10000,
};

export class ScalabilityAnalyzer {
  /**
   * Analyze scalability and extensibility
   *
   * @param config - Risk analysis configuration
   * @returns Scalability assessment
   */
  analyzeScalability(config: RiskAnalysisConfig): ScalabilityAssessment {
    const { existingStack, targetIntegration } = config;

    // Assess horizontal scaling support
    const horizontalScaling = this.assessHorizontalScaling(
      targetIntegration.service,
      targetIntegration.requiredDependencies
    );

    // Identify vertical scaling limits
    const verticalScalingLimits = this.identifyVerticalLimits(
      targetIntegration.service,
      targetIntegration.requiredDependencies
    );

    // Identify extension points
    const extensionPoints = this.identifyExtensionPoints(
      targetIntegration.service,
      targetIntegration.requiredDependencies,
      existingStack.frameworks
    );

    // Evaluate performance at scale
    const performanceAtScale = this.evaluatePerformanceAtScale(
      targetIntegration.service,
      targetIntegration.requiredDependencies,
      horizontalScaling
    );

    return {
      horizontalScaling,
      verticalScalingLimits,
      extensionPoints,
      performanceAtScale,
    };
  }

  /**
   * Assess horizontal scaling support
   */
  private assessHorizontalScaling(
    service: string,
    dependencies: string[]
  ): 'Supported' | 'Limited' | 'Not Supported' {
    // Check if service is known to not scale horizontally
    if (NO_SCALING_SERVICES.has(service) || dependencies.some(dep => NO_SCALING_SERVICES.has(dep))) {
      return 'Not Supported';
    }

    // Check for limited scaling (stateful services)
    if (LIMITED_SCALING_SERVICES.has(service) || dependencies.some(dep => LIMITED_SCALING_SERVICES.has(dep))) {
      return 'Limited';
    }

    // Check for known horizontally scalable services
    if (HORIZONTALLY_SCALABLE_SERVICES.has(service) || dependencies.some(dep => HORIZONTALLY_SCALABLE_SERVICES.has(dep))) {
      return 'Supported';
    }

    // Default: assume supported for standard HTTP-based services
    const hasStandardHttp = dependencies.some(dep =>
      dep === 'axios' || dep === 'express' || dep === 'node-fetch'
    );
    return hasStandardHttp ? 'Supported' : 'Limited';
  }

  /**
   * Identify vertical scaling limits
   */
  private identifyVerticalLimits(
    service: string,
    dependencies: string[]
  ): {
    cpu?: string;
    memory?: string;
    connections?: number;
  } {
    const limits: {
      cpu?: string;
      memory?: string;
      connections?: number;
    } = {};

    // Check for resource-intensive services
    if (RESOURCE_INTENSIVE_SERVICES.has(service) || dependencies.some(dep => RESOURCE_INTENSIVE_SERVICES.has(dep))) {
      limits.cpu = 'High (multi-core recommended)';
      limits.memory = 'High (4GB+ recommended)';
    }

    // Check for database connection limits
    for (const dep of dependencies) {
      if (DATABASE_SERVICES[dep]) {
        limits.connections = DATABASE_SERVICES[dep];
        break;
      }
    }

    return limits;
  }

  /**
   * Identify extension points
   */
  private identifyExtensionPoints(
    service: string,
    dependencies: string[],
    frameworks: string[]
  ): string[] {
    const extensionPoints: Set<string> = new Set();

    // Check for webhook support
    if (WEBHOOK_SERVICES.has(service) || dependencies.some(dep => WEBHOOK_SERVICES.has(dep))) {
      extensionPoints.add('Webhooks');
    }

    // Check for plugin/middleware support
    if (PLUGIN_SERVICES.has(service) || dependencies.some(dep => PLUGIN_SERVICES.has(dep)) || frameworks.some(fw => PLUGIN_SERVICES.has(fw))) {
      extensionPoints.add('Middleware/Plugins');
    }

    // GraphQL-specific extension points
    if (service.includes('graphql') || dependencies.some(dep => dep.includes('graphql') || dep.includes('apollo'))) {
      extensionPoints.add('Custom resolvers');
      extensionPoints.add('GraphQL directives');
    }

    // REST API extension points
    if (service.includes('rest') || service.includes('api') || frameworks.some(fw => fw === 'express' || fw === 'fastify')) {
      extensionPoints.add('Custom routes');
      extensionPoints.add('Request/response interceptors');
    }

    // Microservices patterns
    if (service.includes('microservice') || frameworks.length > 0) {
      extensionPoints.add('Event-driven architecture');
      extensionPoints.add('Service composition');
    }

    return Array.from(extensionPoints);
  }

  /**
   * Evaluate performance at scale
   */
  private evaluatePerformanceAtScale(
    service: string,
    dependencies: string[],
    horizontalScaling: 'Supported' | 'Limited' | 'Not Supported'
  ): 'Excellent' | 'Good' | 'Fair' | 'Poor' {
    // CDN and edge services: Excellent
    if (service.includes('cdn') || dependencies.some(dep => dep.includes('cloudflare'))) {
      return 'Excellent';
    }

    // Well-optimized, horizontally scalable services: Excellent
    if (horizontalScaling === 'Supported' && (HORIZONTALLY_SCALABLE_SERVICES.has(service) || dependencies.some(dep => HORIZONTALLY_SCALABLE_SERVICES.has(dep)))) {
      return 'Excellent';
    }

    // Database-heavy operations: Good
    if (dependencies.some(dep => DATABASE_SERVICES[dep])) {
      return 'Good';
    }

    // Limited horizontal scaling: Fair
    if (horizontalScaling === 'Limited') {
      return 'Fair';
    }

    // No horizontal scaling: Poor
    if (horizontalScaling === 'Not Supported') {
      return 'Poor';
    }

    // Default: Good
    return 'Good';
  }
}
