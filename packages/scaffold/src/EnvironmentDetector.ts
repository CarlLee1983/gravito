import type { ProfileType } from './ProfileResolver'

export interface DetectedEnvironment {
  platform: 'aws' | 'gcp' | 'azure' | 'k8s' | 'vercel' | 'netlify' | 'unknown'
  suggestedProfile: ProfileType
  confidence: 'high' | 'medium' | 'low'
  reason: string
}

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
