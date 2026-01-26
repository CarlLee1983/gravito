/**
 * Represents a structured log event within the Echo module.
 * Used to ensure consistency across different logging implementations.
 */
export interface EchoLogEvent {
  /** Severity level of the log entry. */
  level: 'debug' | 'info' | 'warn' | 'error'
  /** Human-readable message describing the event. */
  message: string
  /** Contextual metadata for better traceability. */
  context: {
    /** Always 'echo' to identify the source module. */
    module: 'echo'
    /** The specific sub-component triggering the log. */
    component: 'receiver' | 'dispatcher' | 'dlq' | 'replay'
    [key: string]: unknown
  }
}

/**
 * Defines the standard logging interface for the Echo module.
 * Implementations should handle structured data for observability.
 *
 * @example
 * ```typescript
 * const logger: EchoLogger = new ConsoleEchoLogger();
 * logger.info('Webhook received', { provider: 'stripe' });
 * ```
 */
export interface EchoLogger {
  /** Logs fine-grained informational events that are most useful to debug an application. */
  debug(message: string, context?: Record<string, unknown>): void
  /** Logs informational messages that highlight the progress of the application at coarse-grained level. */
  info(message: string, context?: Record<string, unknown>): void
  /** Logs potentially harmful situations. */
  warn(message: string, context?: Record<string, unknown>): void
  /** Logs error events that might still allow the application to continue running. */
  error(message: string, context?: Record<string, unknown>): void
}
