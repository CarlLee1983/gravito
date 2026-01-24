export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  timestamp: string
  level: LogLevel
  module: string
  clientId?: string
  channel?: string
  event?: string
  errorCode?: string
  [key: string]: unknown
}

export interface RippleLogger {
  debug(message: string, context?: Partial<LogContext>): void
  info(message: string, context?: Partial<LogContext>): void
  warn(message: string, context?: Partial<LogContext>): void
  error(message: string, context?: Partial<LogContext>): void
}

export class ConsoleLogger implements RippleLogger {
  constructor(
    private readonly module: string,
    private readonly minLevel: LogLevel = 'info'
  ) {}

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.minLevel)
  }

  private formatContext(level: LogLevel, context?: Partial<LogContext>): LogContext {
    return {
      timestamp: new Date().toISOString(),
      level,
      module: this.module,
      ...context,
    }
  }

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

export function createLogger(module: string, minLevel?: LogLevel): RippleLogger {
  return new ConsoleLogger(module, minLevel)
}
