export interface Logger {
  debug(message: string, context?: object): void
  info(message: string, context?: object): void
  warn(message: string, context?: object): void
  error(message: string, error?: Error | unknown, context?: object): void
}

export class ConsoleLogger implements Logger {
  debug(message: string, context?: object): void {
    console.debug(`[Quasar:DEBUG] ${message}`, context || '')
  }
  info(message: string, context?: object): void {
    console.info(`[Quasar:INFO] ${message}`, context || '')
  }
  warn(message: string, context?: object): void {
    console.warn(`[Quasar:WARN] ${message}`, context || '')
  }
  error(message: string, error?: Error | unknown, context?: object): void {
    console.error(`[Quasar:ERROR] ${message}`, error || '', context || '')
  }
}
