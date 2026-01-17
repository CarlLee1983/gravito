import type { ProfileType } from './ProfileResolver'

/**
 * Represents the results of an environment detection scan.
 *
 * @public
 * @since 3.0.0
 */
export interface DetectedEnvironment {
  /** The detected cloud or hosting platform. */
  platform: 'aws' | 'gcp' | 'azure' | 'k8s' | 'vercel' | 'netlify' | 'unknown'
  /** The project profile most suitable for this environment. */
  suggestedProfile: ProfileType
  /** The degree of certainty in the detection. */
  confidence: 'high' | 'medium' | 'low'
  /** The reason or heuristic used for the detection. */
  reason: string
}

/**
 * EnvironmentDetector inspects environment variables to identify the hosting platform.
 *
 * It uses these heuristics to suggest the most appropriate project profile
 * (Core, Scale, or Enterprise) for the current environment.
 *
 * @public
 * @since 3.0.0
 */
export class EnvironmentDetector {
  detect(): DetectedEnvironment {
    // 1. Check for Kubernetes
    if (process.env.KUBERNETES_SERVICE_HOST) {
      return {
        platform: 'k8s',
        suggestedProfile: 'enterprise',
        confidence: 'high',
        reason: 'Kubernetes environment detected (KUBERNETES_SERVICE_HOST)',
      }
    }

    // 2. Check for AWS Lambda
    if (process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.AWS_EXECUTION_ENV) {
      return {
        platform: 'aws',
        suggestedProfile: 'scale',
        confidence: 'high',
        reason: 'AWS Lambda environment detected',
      }
    }

    // 3. Check for Vercel
    if (process.env.VERCEL) {
      return {
        platform: 'vercel',
        suggestedProfile: 'core',
        confidence: 'high',
        reason: 'Vercel environment detected',
      }
    }

    // 4. Check for Railway / Render (Generic container platforms often imply Scale)
    if (process.env.RAILWAY_ENVIRONMENT || process.env.RENDER) {
      return {
        platform: 'unknown', // Generic cloud
        suggestedProfile: 'scale',
        confidence: 'medium',
        reason: 'Cloud container environment detected',
      }
    }

    return {
      platform: 'unknown',
      suggestedProfile: 'core',
      confidence: 'low',
      reason: 'No specific cloud environment detected, defaulting to Core',
    }
  }
}
