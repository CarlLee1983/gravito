/**
 * Error codes for @gravito/ion
 * Following the pattern from @gravito/fortify/src/errors/FortifyError.ts
 */
export const InertiaErrorCodes = {
  CONFIG_VIEW_SERVICE_MISSING: 'inertia.config.view_service_missing',
  SERIALIZATION_FAILED: 'inertia.serialization.failed',
  TEMPLATE_RENDER_FAILED: 'inertia.template.render_failed',
} as const

export type InertiaErrorCode = (typeof InertiaErrorCodes)[keyof typeof InertiaErrorCodes]

/**
 * Base error class for Inertia-related errors
 * Provides structured error information for better debugging and error handling
 */
export class InertiaError extends Error {
  constructor(
    public readonly code: InertiaErrorCode,
    public readonly httpStatus: number = 500,
    public readonly details?: unknown
  ) {
    super(code)
    this.name = 'InertiaError'
    Error.captureStackTrace?.(this, this.constructor)
  }

  /**
   * Thrown when ViewService is not available in PlanetCore
   * This usually means OrbitPrism was not loaded before OrbitIon
   */
  static viewServiceMissing(): InertiaError {
    return new InertiaError(InertiaErrorCodes.CONFIG_VIEW_SERVICE_MISSING, 500, {
      hint: 'Ensure OrbitPrism is loaded before OrbitIon in your orbit configuration',
      requiredOrbit: 'OrbitPrism',
    })
  }

  /**
   * Thrown when props cannot be serialized to JSON
   * This can happen with circular references, BigInt, or unsupported types
   */
  static serializationFailed(component: string, cause: unknown): InertiaError {
    return new InertiaError(InertiaErrorCodes.SERIALIZATION_FAILED, 500, {
      component,
      cause,
      hint: 'Ensure all props are JSON-serializable (no circular refs, BigInt, or functions)',
    })
  }

  /**
   * Thrown when template rendering fails
   * This usually indicates a problem with the view template or ViewService
   */
  static templateRenderFailed(view: string, cause: unknown): InertiaError {
    return new InertiaError(InertiaErrorCodes.TEMPLATE_RENDER_FAILED, 500, {
      view,
      cause,
      hint: 'Check if the view template exists and is properly configured',
    })
  }

  /**
   * Convert error to JSON for logging/API responses
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      httpStatus: this.httpStatus,
      message: this.message,
      details: this.details,
    }
  }
}
