/**
 * @fileoverview ErrorHandler - Centralized Error Handling for Gravito Framework
 *
 * Extracted from PlanetCore to follow Single Responsibility Principle.
 * Handles HTTP errors, validation errors, and error rendering.
 *
 * @module @gravito/core
 * @since 1.3.0
 */
import type { HookManager } from './HookManager'
import type { GravitoContext } from './http/types'
import type { Logger } from './Logger'
/**
 * HTTP Status Code to Error Code mapping
 */
export declare function codeFromStatus(status: number): string
/**
 * HTTP Status Code to Message mapping
 */
export declare function messageFromStatus(status: number): string
/**
 * Dependencies injected into ErrorHandler
 * @public
 */
export interface ErrorHandlerDeps {
  logger: Logger
  hooks: HookManager
  getCore: () => unknown
}
/**
 * ErrorHandler - Centralized error handling logic
 *
 * @example
 * ```typescript
 * const handler = new ErrorHandler({ logger, hooks, getCore: () => core })
 * adapter.onError(handler.handleError.bind(handler))
 * adapter.onNotFound(handler.handleNotFound.bind(handler))
 * ```
 */
export declare class ErrorHandler {
  private deps
  constructor(deps: ErrorHandlerDeps)
  /**
   * Handle application errors
   *
   * Integrates RequestScope cleanup to ensure proper resource management
   * even when errors occur during request processing.
   */
  handleError(err: unknown, c: GravitoContext): Promise<Response>
  /**
   * Handle 404 Not Found errors
   */
  handleNotFound(c: GravitoContext): Promise<Response>
  /**
   * Handle validation error redirect for HTML requests
   */
  private handleValidationRedirect
  /**
   * Log error based on context settings
   */
  private logError
  /**
   * Render error response (HTML or JSON)
   */
  private renderErrorResponse
}
