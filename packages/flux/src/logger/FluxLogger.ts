/**
 * @fileoverview Console Logger for FluxEngine
 *
 * Default logger implementation using console.
 *
 * @module @gravito/flux
 */

import type { FluxLogger } from '../types'

/**
 * Console Logger implementation for FluxEngine.
 *
 * Provides a standard way to output workflow execution logs to the system console
 * with a configurable prefix for easy filtering.
 *
 * @example
 * ```typescript
 * const logger = new FluxConsoleLogger('[OrderFlow]');
 * logger.info('Workflow started', { orderId: '123' });
 * ```
 */
export class FluxConsoleLogger implements FluxLogger {
  private prefix: string

  /**
   * Creates a new console logger instance.
   *
   * @param prefix - String prepended to every log message for identification.
   */
  constructor(prefix = '[Flux]') {
    this.prefix = prefix
  }

  /**
   * Logs fine-grained informational events that are most useful to debug an application.
   *
   * @param message - The primary log message.
   * @param args - Additional metadata or objects to include in the log output.
   */
  debug(message: string, ...args: unknown[]): void {
    console.debug(`${this.prefix} ${message}`, ...args)
  }

  /**
   * Logs informational messages that highlight the progress of the application at coarse-grained level.
   *
   * @param message - The primary log message.
   * @param args - Additional metadata or objects to include in the log output.
   */
  info(message: string, ...args: unknown[]): void {
    console.info(`${this.prefix} ${message}`, ...args)
  }

  /**
   * Logs potentially harmful situations that should be noted but don't stop execution.
   *
   * @param message - The primary log message.
   * @param args - Additional metadata or objects to include in the log output.
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(`${this.prefix} ${message}`, ...args)
  }

  /**
   * Logs error events that might still allow the application to continue running.
   *
   * @param message - The primary log message.
   * @param args - Additional metadata or objects to include in the log output.
   */
  error(message: string, ...args: unknown[]): void {
    console.error(`${this.prefix} ${message}`, ...args)
  }
}

/**
 * Silent Logger implementation that discards all log entries.
 *
 * Useful for production environments where logging is handled externally,
 * or for unit tests where console output should be suppressed.
 *
 * @example
 * ```typescript
 * const engine = new FluxEngine({
 *   logger: new FluxSilentLogger()
 * });
 * ```
 */
export class FluxSilentLogger implements FluxLogger {
  /** Discards debug logs. */
  debug(): void {}
  /** Discards info logs. */
  info(): void {}
  /** Discards warning logs. */
  warn(): void {}
  /** Discards error logs. */
  error(): void {}
}
