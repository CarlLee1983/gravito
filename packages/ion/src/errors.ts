/**
 * Base error class for all Inertia-related operations in Gravito.
 */
export class InertiaError extends Error {
  constructor(
    public readonly code: string,
    public readonly httpStatus: number = 500,
    public readonly details?: Record<string, any>
  ) {
    super(code)
    this.name = 'InertiaError'
    Object.setPrototypeOf(this, new.target.prototype)
    Error.captureStackTrace?.(this, this.constructor)
  }

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

/**
 * Configuration errors - e.g., missing services.
 */
export class InertiaConfigError extends InertiaError {
  constructor(message: string, details?: Record<string, any>) {
    super('CONFIG_ERROR', 500, {
      ...details,
      message,
      hint:
        details?.hint ?? 'Check your OrbitIon configuration and ensure dependencies are loaded.',
    })
    this.name = 'InertiaConfigError'
  }
}

/**
 * Data/Serialization errors - e.g., circular references or resolution failure.
 */
export class InertiaDataError extends InertiaError {
  constructor(message: string, details?: Record<string, any>) {
    super('DATA_ERROR', 500, {
      ...details,
      message,
      hint:
        details?.hint ??
        'Ensure all props are JSON-serializable (no circular refs, BigInt, or functions).',
    })
    this.name = 'InertiaDataError'
  }
}

/**
 * Template/Rendering errors.
 */
export class InertiaTemplateError extends InertiaError {
  constructor(message: string, details?: Record<string, any>) {
    super('TEMPLATE_ERROR', 500, {
      ...details,
      message,
      hint: details?.hint ?? 'Check if the root view template exists and is properly configured.',
    })
    this.name = 'InertiaTemplateError'
  }
}
