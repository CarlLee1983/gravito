/**
 * 標準日誌介面 (Logger Interface)
 * 遵循類 PSR-3 風格，讓外部可以輕鬆替換實作 (例如換成 Winston 或 Pino)
 */
export interface Logger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

/**
 * 預設的主控台日誌實作
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
