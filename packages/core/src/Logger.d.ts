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
export declare class ConsoleLogger implements Logger {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}
//# sourceMappingURL=Logger.d.ts.map
