/**
 * Standard logger interface.
 *
 * PSR-3 inspired API for easy swapping (e.g., Winston, Pino).
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

/**
 * Default console logger implementation.
 */
export class ConsoleLogger implements Logger {
  debug(message: string, ...args: unknown[]): void {
    console.debug(`[DEBUG] ${message}`, ...args)
  }

  info(message: string, ...args: unknown[]): void {
    console.info(`[INFO] ${message}`, ...args)
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args)
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args)
  }
}
