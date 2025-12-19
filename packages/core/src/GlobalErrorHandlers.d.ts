import type { Logger } from './Logger'
import type { PlanetCore } from './PlanetCore'
export type GlobalProcessErrorKind = 'unhandledRejection' | 'uncaughtException'
export type GlobalProcessErrorHandlerContext = {
  core?: PlanetCore
  kind: GlobalProcessErrorKind
  error: unknown
  isProduction: boolean
  timestamp: number
  logLevel?: 'error' | 'warn' | 'info' | 'none'
  logMessage?: string
  exit?: boolean
  exitCode?: number
  gracePeriodMs?: number
}
export type GlobalErrorHandlersMode = 'log' | 'exit' | 'exitInProduction'
export type RegisterGlobalErrorHandlersOptions = {
  core?: PlanetCore
  logger?: Logger
  mode?: GlobalErrorHandlersMode
  exitCode?: number
  gracePeriodMs?: number
}
/**
 * Register process-level error handlers (`unhandledRejection` / `uncaughtException`).
 *
 * - `mode: "log"`: only log/report
 * - `mode: "exit"`: report then `process.exit(exitCode)`
 * - `mode: "exitInProduction"`: exit only when `NODE_ENV=production` (default)
 */
export declare function registerGlobalErrorHandlers(
  options?: RegisterGlobalErrorHandlersOptions
): () => void
//# sourceMappingURL=GlobalErrorHandlers.d.ts.map
