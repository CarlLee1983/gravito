/**
 * Supported log levels for Ripple.
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Structured log context containing metadata for logs.
 */
export interface LogContext {
  /** ISO 8601 timestamp */
  timestamp: string
  /** Log level */
  level: LogLevel
  /** Module name where the log originated */
  module: string
  /** Unique client identifier if applicable */
  clientId?: string
  /** Channel name if applicable */
  channel?: string
  /** Event name if applicable */
  event?: string
  /** Error code if applicable */
  errorCode?: string
  /** Additional dynamic metadata */
  [key: string]: unknown
}

/**
 * Interface for Ripple logging implementations.
 *
 * Developers can implement this interface to integrate Ripple with their
 * preferred logging systems (e.g., Winston, Pino, Datadog).
 *
 * @example
 * ```typescript
 * const myLogger: RippleLogger = {
 *   debug: (msg, ctx) => console.log('[DEBUG]', msg, ctx),
 *   info: (msg, ctx) => console.log('[INFO]', msg, ctx),
 *   warn: (msg, ctx) => console.warn('[WARN]', msg, ctx),
 *   error: (msg, ctx) => console.error('[ERROR]', msg, ctx)
 * }
 * ```
 */
export interface RippleLogger {
  /** Log a debug message */
  debug(message: string, context?: Partial<LogContext>): void
  /** Log an info message */
  info(message: string, context?: Partial<LogContext>): void
  /** Log a warning message */
  warn(message: string, context?: Partial<LogContext>): void
  /** Log an error message */
  error(message: string, context?: Partial<LogContext>): void
}

/**
 * Default JSON-based console logger for Ripple.
 *
 * Formats logs as JSON strings to the console, suitable for cloud log aggregators.
 */
export class ConsoleLogger implements RippleLogger {
  /**
   * Create a new ConsoleLogger.
   *
   * @param module - Module name for identification
   * @param minLevel - Minimum level to log (default: 'info')
   */
  constructor(
    private readonly module: string,
    private readonly minLevel: LogLevel = 'info'
  ) {}

  /**
   * Check if a message should be logged based on its level.
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.minLevel)
  }

  /**
   * Format the log context with standard metadata.
   */
  private formatContext(level: LogLevel, context?: Partial<LogContext>): LogContext {
    return {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      ...context,
    }
  }

  /**
   * Log a debug message as JSON.
   */
  debug(message: string, context?: Partial<LogContext>): void {
    if (this.shouldLog('debug')) {
      console.debug(
        JSON.stringify({
          message,
          ...this.formatContext('debug', context),
        })
      )
    }
  }

  /**
   * Log an info message as JSON.
   */
  info(message: string, context?: Partial<LogContext>): void {
    if (this.shouldLog('info')) {
      console.info(
        JSON.stringify({
          message,
          ...this.formatContext('info', context),
        })
      )
    }
  }

  /**
   * Log a warning message as JSON.
   */
  warn(message: string, context?: Partial<LogContext>): void {
    if (this.shouldLog('warn')) {
      console.warn(
        JSON.stringify({
          message,
          ...this.formatContext('warn', context),
        })
      )
    }
  }

  /**
   * Log an error message as JSON.
   */
  error(message: string, context?: Partial<LogContext>): void {
    if (this.shouldLog('error')) {
      console.error(
        JSON.stringify({
          message,
          ...this.formatContext('error', context),
        })
      )
    }
  }
}

/**
 * Utility function to create a new ConsoleLogger.
 *
 * @param module - Module name
 * @param minLevel - Minimum log level
 * @returns A new RippleLogger instance
 */
export function createLogger(module: string, minLevel?: LogLevel): RippleLogger {
  return new ConsoleLogger(module, minLevel)
}
