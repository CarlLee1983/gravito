/**
 * Error codes for @gravito/ion.
 * These codes provide a machine-readable way to identify specific Inertia-related failures.
 */
export const InertiaErrorCodes = {
  /** Thrown when the required ViewService (OrbitPrism) is not registered in the context. */
  CONFIG_VIEW_SERVICE_MISSING: 'inertia.config.view_service_missing',
  /** Thrown when component props cannot be serialized to JSON (e.g., circular references). */
  SERIALIZATION_FAILED: 'inertia.serialization.failed',
  /** Thrown when the root view template fails to render. */
  TEMPLATE_RENDER_FAILED: 'inertia.template.render_failed',
} as const

/**
 * Union type of all valid Inertia error codes.
 */
export type InertiaErrorCode = (typeof InertiaErrorCodes)[keyof typeof InertiaErrorCodes]

/**
 * Base error class for all Inertia-related operations in Gravito.
 *
 * It provides structured metadata including a unique error code, HTTP status,
 * and additional context details to assist in debugging and client-side error handling.
 *
 * @example
 * ```typescript
 * throw new InertiaError(InertiaErrorCodes.SERIALIZATION_FAILED, 500, { component: 'Home' });
 * ```
 */
export class InertiaError extends Error {
  /**
   * Creates a new InertiaError instance.
   *
   * @param code - Semantic error code for identification
   * @param httpStatus - Recommended HTTP status code for the response
   * @param details - Context-specific details about the failure
   */
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
   * Creates an error indicating that the ViewService is missing.
   *
   * This typically happens if OrbitPrism is not loaded before OrbitIon.
   * The ViewService is required for the initial HTML page load.
   *
   * @returns A structured InertiaError instance
   *
   * @example
   * ```typescript
   * const error = InertiaError.viewServiceMissing();
   * ```
   */
  static viewServiceMissing(): InertiaError {
    return new InertiaError(InertiaErrorCodes.CONFIG_VIEW_SERVICE_MISSING, 500, {
      hint: 'Ensure OrbitPrism is loaded before OrbitIon in your orbit configuration',
      requiredOrbit: 'OrbitPrism',
    })
  }

  /**
   * Creates an error indicating that prop serialization failed.
   *
   * Inertia requires all props to be JSON-serializable to pass them from the server to the client.
   *
   * @param component - The name of the component being rendered
   * @param cause - The underlying serialization error
   * @returns A structured InertiaError instance
   *
   * @example
   * ```typescript
   * const error = InertiaError.serializationFailed('Dashboard', originalError);
   * ```
   */
  static serializationFailed(component: string, cause: unknown): InertiaError {
    return new InertiaError(InertiaErrorCodes.SERIALIZATION_FAILED, 500, {
      component,
      cause,
      hint: 'Ensure all props are JSON-serializable (no circular refs, BigInt, or functions)',
    })
  }

  /**
   * Creates an error indicating that the root template failed to render.
   *
   * This occurs during the initial page load when the ViewService fails to process the root template.
   *
   * @param view - The name of the view template that failed
   * @param cause - The underlying rendering error
   * @returns A structured InertiaError instance
   *
   * @example
   * ```typescript
   * const error = InertiaError.templateRenderFailed('app', originalError);
   * ```
   */
  static templateRenderFailed(view: string, cause: unknown): InertiaError {
    return new InertiaError(InertiaErrorCodes.TEMPLATE_RENDER_FAILED, 500, {
      view,
      cause,
      hint: 'Check if the view template exists and is properly configured',
    })
  }

  /**
   * Serializes the error into a plain object for logging or API responses.
   *
   * @returns A JSON-serializable object representing the error
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
