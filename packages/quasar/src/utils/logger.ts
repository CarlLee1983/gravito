export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent'

const LogLevels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
}

export interface Logger {
  debug(message: string, context?: object): void
  info(message: string, context?: object): void
  warn(message: string, context?: object): void
  error(message: string, error?: Error | unknown, context?: object): void
}

export class ConsoleLogger implements Logger {
  private level: number

  constructor(level: LogLevel = 'info') {
    this.level = LogLevels[level]
  }

  debug(message: string, context?: object): void {
    if (this.level > LogLevels.debug) return
    console.debug(`[Quasar:DEBUG] ${message}`, context || '')
  }

  info(message: string, context?: object): void {
    if (this.level > LogLevels.info) return
    console.info(`[Quasar:INFO] ${message}`, context || '')
  }

  warn(message: string, context?: object): void {
    if (this.level > LogLevels.warn) return
    console.warn(`[Quasar:WARN] ${message}`, context || '')
  }

  error(message: string, error?: Error | unknown, context?: object): void {
    if (this.level > LogLevels.error) return
    console.error(`[Quasar:ERROR] ${message}`, error || '', context || '')
  }
}
