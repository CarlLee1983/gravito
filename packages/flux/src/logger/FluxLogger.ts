/**
 * @fileoverview Console Logger for FluxEngine
 *
 * Default logger implementation using console.
 *
 * @module @gravito/flux
 */

import type { FluxLogger } from '../types'

/**
 * Console Logger
 *
 * Default logger that outputs to console.
 *
 * @example
 * ```typescript
 * const engine = new FluxEngine({
 *   logger: new FluxConsoleLogger()
 * })
 * ```
 */
export class FluxConsoleLogger implements FluxLogger {
  private prefix: string

  constructor(prefix = '[Flux]') {
    this.prefix = prefix
  }

  debug(message: string, ...args: unknown[]): void {
    console.debug(`${this.prefix} ${message}`, ...args)
  }

  info(message: string, ...args: unknown[]): void {
    console.info(`${this.prefix} ${message}`, ...args)
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`${this.prefix} ${message}`, ...args)
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`${this.prefix} ${message}`, ...args)
  }
}

/**
 * Silent Logger
 *
 * Logger that outputs nothing (for testing or production).
 */
export class FluxSilentLogger implements FluxLogger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}
