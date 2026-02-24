/**
 * Xenon Error Classes
 * Comprehensive error hierarchy for FFI operations
 */

/**
 * Base Xenon error
 */
export class XenonError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'XenonError'
    Object.setPrototypeOf(this, XenonError.prototype)
  }
}

/**
 * Security-related FFI error
 * Thrown when:
 * - Library path blocked by policy
 * - Unsafe symbol types requested
 * - Dangerous library operations detected
 */
export class XenonSecurityError extends XenonError {
  constructor(message: string) {
    super(message)
    this.name = 'XenonSecurityError'
    Object.setPrototypeOf(this, XenonSecurityError.prototype)
  }
}

/**
 * Memory management error
 * Thrown when:
 * - Double-free detected
 * - Out of bounds access
 * - Memory leak detected
 * - Memory limit exceeded
 */
export class XenonMemoryError extends XenonError {
  constructor(message: string) {
    super(message)
    this.name = 'XenonMemoryError'
    Object.setPrototypeOf(this, XenonMemoryError.prototype)
  }
}

/**
 * Type validation error
 * Thrown when:
 * - Invalid FFIType used
 * - Type mismatch in function signature
 * - Callback type (not supported)
 */
export class XenonTypeError extends XenonError {
  constructor(message: string) {
    super(message)
    this.name = 'XenonTypeError'
    Object.setPrototypeOf(this, XenonTypeError.prototype)
  }
}

/**
 * Library operation error
 * Thrown when:
 * - dlopen fails (library not found)
 * - Symbol lookup fails
 * - Library already closed
 */
export class XenonLibraryError extends XenonError {
  constructor(message: string) {
    super(message)
    this.name = 'XenonLibraryError'
    Object.setPrototypeOf(this, XenonLibraryError.prototype)
  }
}

/**
 * Configuration error
 * Thrown when:
 * - Invalid configuration provided
 * - Missing required options
 */
export class XenonConfigError extends XenonError {
  constructor(message: string) {
    super(message)
    this.name = 'XenonConfigError'
    Object.setPrototypeOf(this, XenonConfigError.prototype)
  }
}
