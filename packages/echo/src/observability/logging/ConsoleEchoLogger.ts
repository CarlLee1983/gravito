import type { EchoLogger } from './EchoLogger'

/**
 * A basic implementation of {@link EchoLogger} that outputs logs to the system console.
 * Logs are formatted as JSON strings to facilitate integration with log aggregators.
 *
 * @example
 * ```typescript
 * const logger = new ConsoleEchoLogger();
 * logger.info('Service started');
 * ```
 */
export class ConsoleEchoLogger implements EchoLogger {
  /**
   * Enriches the log context with default module information and timestamps.
   *
   * @param base - The base context object.
   * @param extra - Additional metadata to include.
   * @returns A merged context object.
   */
  private formatContext(
    base: Record<string, unknown>,
    extra?: Record<string, unknown>
  ): Record<string, unknown> {
    return {
      module: 'echo',
      timestamp: new Date().toISOString(),
      ...base,
      ...extra,
    }
  }

  /**
   * Outputs a debug-level log entry.
   */
  debug(message: string, context?: Record<string, unknown>): void {
    console.debug(
      JSON.stringify({
        level: 'debug',
        message,
        ...this.formatContext({}, context),
      })
    )
  }

  /**
   * Outputs an info-level log entry.
   */
  info(message: string, context?: Record<string, unknown>): void {
    console.info(
      JSON.stringify({
        level: 'info',
        message,
        ...this.formatContext({}, context),
      })
    )
  }

  /**
   * Outputs a warn-level log entry.
   */
  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(
      JSON.stringify({
        level: 'warn',
        message,
        ...this.formatContext({}, context),
      })
    )
  }

  /**
   * Outputs an error-level log entry.
   */
  error(message: string, context?: Record<string, unknown>): void {
    console.error(
      JSON.stringify({
        level: 'error',
        message,
        ...this.formatContext({}, context),
      })
    )
  }
}
