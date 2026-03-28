import { SystemException, type ExceptionOptions } from '@gravito/core'
import type { ZodSchema } from 'zod'
import type { AstralResource } from './types'

/**
 * Base class for all Astral-related errors.
 * Extends SystemException for unified error handling across Gravito.
 *
 * @public
 * @since 3.0.0
 */
export class AstralError extends SystemException {
  /**
   * Create a new AstralError.
   *
   * @param message - Error message.
   * @param code - Unique error code (e.g., 'ASTRAL_CONFIG_ERROR').
   * @param options - Optional exception options (status, cause, etc.)
   */
  constructor(
    message: string,
    code: string,
    options: ExceptionOptions & { status?: number } = {}
  ) {
    const status = options.status ?? 500
    super(status, code, { ...options, message })
    this.name = 'AstralError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/**
 * Thrown when the Astral configuration is invalid or missing required fields.
 *
 * @public
 * @since 3.0.0
 */
export class AstralConfigError extends AstralError {
  /**
   * Create a new AstralConfigError.
   *
   * @param message - Detailed error message.
   * @param field - The configuration field that caused the error.
   */
  constructor(
    message: string,
    public readonly field: string
  ) {
    super(
      `Astral configuration error at '${field}': ${message}`,
      'ASTRAL_CONFIG_ERROR',
      { status: 500 }
    )
    this.name = 'AstralConfigError'
    Object.setPrototypeOf(this, AstralConfigError.prototype)
  }
}

/**
 * Thrown when a Zod schema cannot be converted to an OpenAPI-compatible JSON Schema.
 *
 * @public
 * @since 3.0.0
 */
export class AstralSchemaError extends AstralError {
  /**
   * Create a new AstralSchemaError.
   *
   * @param message - Detailed error message.
   * @param schema - The schema that failed conversion.
   * @param cause - Optional original error that caused the failure.
   */
  constructor(
    message: string,
    public readonly schema: ZodSchema | any,
    cause?: Error
  ) {
    super(`Schema conversion error: ${message}`, 'ASTRAL_SCHEMA_ERROR', {
      status: 500,
      cause,
    })
    this.name = 'AstralSchemaError'
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`
    }
    Object.setPrototypeOf(this, AstralSchemaError.prototype)
  }
}

/**
 * Thrown when a resource contract definition is invalid.
 *
 * @public
 * @since 3.0.0
 */
export class AstralResourceError extends AstralError {
  /**
   * Create a new AstralResourceError.
   *
   * @param message - Detailed error message.
   * @param resource - The resource contract object.
   * @param field - The field within the resource that caused the error.
   */
  constructor(
    message: string,
    public readonly resource: AstralResource,
    public readonly field?: string
  ) {
    const location = field ? ` at field '${field}'` : ''
    super(
      `Resource '${resource.path}' validation error${location}: ${message}`,
      'ASTRAL_RESOURCE_ERROR',
      { status: 500 }
    )
    this.name = 'AstralResourceError'
    Object.setPrototypeOf(this, AstralResourceError.prototype)
  }
}

/**
 * Thrown when a route matching operation fails or is ambiguous.
 *
 * @public
 * @since 3.0.0
 */
export class AstralRouteError extends AstralError {
  /**
   * Create a new AstralRouteError.
   *
   * @param message - Detailed error message.
   * @param path - The route path.
   * @param method - Optional HTTP method.
   */
  constructor(
    message: string,
    public readonly path: string,
    public readonly method?: string
  ) {
    const methodStr = method ? ` [${method}]` : ''
    super(`Route error${methodStr} '${path}': ${message}`, 'ASTRAL_ROUTE_ERROR', { status: 500 })
    this.name = 'AstralRouteError'
    Object.setPrototypeOf(this, AstralRouteError.prototype)
  }
}

/**
 * Thrown during the final OpenAPI specification generation phase.
 *
 * @public
 * @since 3.0.0
 */
export class AstralGenerationError extends AstralError {
  /**
   * Create a new AstralGenerationError.
   *
   * @param message - Detailed error message.
   * @param context - Optional context data related to the generation failure.
   * @param cause - Optional original error.
   */
  constructor(
    message: string,
    public readonly context?: Record<string, any>,
    cause?: Error
  ) {
    super(`OpenAPI generation error: ${message}`, 'ASTRAL_GENERATION_ERROR', {
      status: 500,
      cause,
    })
    this.name = 'AstralGenerationError'
    if (cause) {
      this.stack = `${this.stack}\nCaused by: ${cause.stack}`
    }
    Object.setPrototypeOf(this, AstralGenerationError.prototype)
  }
}
