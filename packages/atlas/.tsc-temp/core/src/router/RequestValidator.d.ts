import type { GravitoMiddleware } from '../http/types'
import { type FormRequestClass } from '../Router'
/**
 * Handles validation of incoming requests using FormRequest classes.
 * Provides mechanisms to detect and convert FormRequest classes into Gravito middleware.
 */
export declare class RequestValidator {
  /**
   * Check if a value is a FormRequest class.
   * Optimized with Symbol check, prototype check, and caching.
   * @internal
   */
  static isFormRequestClass(value: unknown): value is FormRequestClass
  /**
   * Convert a FormRequest class to middleware.
   * Uses instance caching to avoid re-instantiation on every request.
   * @internal
   */
  static formRequestToMiddleware(RequestClass: FormRequestClass): GravitoMiddleware
}
