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

type GlobalState = {
  nextId: number
  sinks: Map<
    number,
    Required<Pick<RegisterGlobalErrorHandlersOptions, 'mode'>> & RegisterGlobalErrorHandlersOptions
  >
  listenersInstalled: boolean
  onUnhandledRejection: ((reason: unknown, promise: Promise<unknown>) => void) | undefined
  onUncaughtException: ((error: unknown) => void) | undefined
}

const stateKey = Symbol.for('gravito.core.globalErrorHandlers')

function getGlobalState(): GlobalState {
  const g = globalThis as unknown as Record<symbol, GlobalState | undefined>
  const existing = g[stateKey]
  if (existing) {
    return existing
  }

  const created: GlobalState = {
    nextId: 1,
    sinks: new Map(),
    listenersInstalled: false,
    onUnhandledRejection: undefined,
    onUncaughtException: undefined,
  }
  g[stateKey] = created
  return created
}

type ProcessEventListener = (...args: unknown[]) => void

function offProcess(event: string, listener: ProcessEventListener): void {
  const p = process as unknown as {
    off?: (event: string, listener: ProcessEventListener) => void
    removeListener?: (event: string, listener: ProcessEventListener) => void
  }
  if (typeof p.off === 'function') {
    p.off(event, listener)
    return
  }
  if (typeof p.removeListener === 'function') {
    p.removeListener(event, listener)
  }
}

function safeMessageFromUnknown(error: unknown): string {
  if (error instanceof Error) {
    return error.message || 'Error'
  }
  if (typeof error === 'string') {
    return error
  }
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

async function handleProcessError(kind: GlobalProcessErrorKind, error: unknown): Promise<void> {
  const state = getGlobalState()
  if (state.sinks.size === 0) {
    return
  }

  const isProduction = process.env.NODE_ENV === 'production'
  let shouldExit = false
  let exitCode = 1
  let exitTimer: ReturnType<typeof setTimeout> | undefined

  try {
    const sinks = Array.from(state.sinks.values())
    const prepared = await Promise.all(
      sinks.map(async (sink) => {
        const defaultExit =
          sink.mode === 'exit' || (sink.mode === 'exitInProduction' && isProduction)

        let ctx: GlobalProcessErrorHandlerContext = {
          ...(sink.core ? { core: sink.core } : {}),
          kind,
          error,
          isProduction,
          timestamp: Date.now(),
          exit: defaultExit,
          exitCode: sink.exitCode ?? 1,
          gracePeriodMs: sink.gracePeriodMs ?? 250,
        }

        if (sink.core) {
          ctx = await sink.core.hooks.applyFilters<GlobalProcessErrorHandlerContext>(
            'processError:context',
            ctx
          )
        }

        return { sink, ctx }
      })
    )

    const exitTargets = prepared
      .map((p) => p.ctx)
      .filter((ctx) => (ctx.exit ?? false) && (ctx.exitCode ?? 1) >= 0)
    shouldExit = exitTargets.length > 0
    const gracePeriodMs = Math.max(0, ...exitTargets.map((c) => c.gracePeriodMs ?? 250))
    exitCode = Math.max(0, ...exitTargets.map((c) => c.exitCode ?? 1))

    if (shouldExit) {
      exitTimer = setTimeout(() => {
        process.exit(exitCode)
      }, gracePeriodMs)
      exitTimer.unref?.()
    }

    await Promise.all(
      prepared.map(async ({ sink, ctx }) => {
        const logger = sink.logger ?? sink.core?.logger
        const logLevel = ctx.logLevel ?? 'error'
        if (logger && logLevel !== 'none') {
          const message = safeMessageFromUnknown(ctx.error)
          const msg = ctx.logMessage ?? `[${ctx.kind}] ${message}`
          if (logLevel === 'error') {
            logger.error(msg, ctx.error)
          } else if (logLevel === 'warn') {
            logger.warn(msg, ctx.error)
          } else {
            logger.info(msg, ctx.error)
          }
        }

        if (sink.core) {
          await sink.core.hooks.doAction('processError:report', ctx)
        }
      })
    )
  } catch (e) {
    console.error('[@gravito/core] Failed to handle process-level error:', e)
  } finally {
    if (shouldExit) {
      clearTimeout(exitTimer)
      process.exit(exitCode)
    }
  }
}

function ensureListenersInstalled(): void {
  const state = getGlobalState()
  if (state.listenersInstalled) {
    return
  }

  if (typeof process === 'undefined' || typeof process.on !== 'function') {
    return
  }

  state.onUnhandledRejection = (reason: unknown) => {
    void handleProcessError('unhandledRejection', reason)
  }
  state.onUncaughtException = (error: unknown) => {
    void handleProcessError('uncaughtException', error)
  }

  process.on('unhandledRejection', state.onUnhandledRejection)
  process.on('uncaughtException', state.onUncaughtException)

  state.listenersInstalled = true
}

function teardownListenersIfUnused(): void {
  const state = getGlobalState()
  if (!state.listenersInstalled || state.sinks.size > 0) {
    return
  }

  if (state.onUnhandledRejection) {
    offProcess('unhandledRejection', state.onUnhandledRejection as unknown as ProcessEventListener)
  }
  if (state.onUncaughtException) {
    offProcess('uncaughtException', state.onUncaughtException as unknown as ProcessEventListener)
  }

  state.onUnhandledRejection = undefined
  state.onUncaughtException = undefined
  state.listenersInstalled = false
}

/**
 * Register process-level error handlers (`unhandledRejection` / `uncaughtException`).
 *
 * - `mode: "log"`: only log/report
 * - `mode: "exit"`: report then `process.exit(exitCode)`
 * - `mode: "exitInProduction"`: exit only when `NODE_ENV=production` (default)
 */
export function registerGlobalErrorHandlers(
  options: RegisterGlobalErrorHandlersOptions = {}
): () => void {
  const state = getGlobalState()
  ensureListenersInstalled()

  const id = state.nextId++
  state.sinks.set(id, {
    ...options,
    mode: options.mode ?? 'exitInProduction',
  })

  return () => {
    state.sinks.delete(id)
    teardownListenersIfUnused()
  }
}
