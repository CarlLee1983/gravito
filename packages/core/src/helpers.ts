import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { PlanetCore } from './PlanetCore'
import type { Router } from './Router'

export { Arr } from './helpers/Arr'
export * from './helpers/data'
export * from './helpers/response'
export { Str } from './helpers/Str'

export class DumpDieError extends Error {
  override name = 'DumpDieError'

  constructor(public readonly values: unknown[]) {
    super('Execution halted by dd()')
  }
}

export type DumpOptions = {
  depth?: number | null
  colors?: boolean
}

const defaultDumpOptions: Required<DumpOptions> = {
  depth: null,
  colors: true,
}

export function dump(...values: unknown[]): void {
  for (const value of values) {
    console.dir(value, {
      depth: defaultDumpOptions.depth,
      colors: defaultDumpOptions.colors,
    })
  }
}

export function dd(...values: unknown[]): never {
  dump(...values)
  throw new DumpDieError(values)
}

export function tap<T>(value: T, callback: (value: T) => unknown): T {
  callback(value)
  return value
}

export function value<TArgs extends readonly unknown[], TResult>(
  value: (...args: TArgs) => TResult,
  ...args: TArgs
): TResult
export function value<TResult>(value: TResult): TResult
export function value<TArgs extends readonly unknown[], TResult>(
  valueOrFactory: TResult | ((...args: TArgs) => TResult),
  ...args: TArgs
): TResult
export function value<TArgs extends readonly unknown[], TResult>(
  valueOrFactory: TResult | ((...args: TArgs) => TResult),
  ...args: TArgs
): TResult {
  if (typeof valueOrFactory === 'function') {
    return (valueOrFactory as (...a: TArgs) => TResult)(...args)
  }
  return valueOrFactory
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') {
    return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

export function blank(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true
  }

  if (typeof value === 'string') {
    return value.trim().length === 0
  }
  if (Array.isArray(value)) {
    return value.length === 0
  }
  if (value instanceof Map) {
    return value.size === 0
  }
  if (value instanceof Set) {
    return value.size === 0
  }
  if (isPlainObject(value)) {
    return Object.keys(value).length === 0
  }

  return false
}

export function filled(value: unknown): boolean {
  return !blank(value)
}

function toError(error: Error | string | (() => Error)): Error {
  if (typeof error === 'string') {
    return new Error(error)
  }
  if (typeof error === 'function') {
    return error()
  }
  return error
}

export function throwIf(
  condition: unknown,
  error: Error | string | (() => Error) = 'Error.'
): void {
  if (condition) {
    throw toError(error)
  }
}

export function throwUnless(
  condition: unknown,
  error: Error | string | (() => Error) = 'Error.'
): void {
  if (!condition) {
    throw toError(error)
  }
}

type EnvShape = {
  Bun?: {
    env?: Record<string, string | undefined>
  }
}

export function env<TDefault = string | undefined>(key: string, defaultValue?: TDefault) {
  const bunEnv = (globalThis as EnvShape).Bun?.env
  const value = bunEnv?.[key] ?? process.env[key]
  return (value ?? defaultValue) as string | TDefault
}

let currentApp: PlanetCore | undefined

export function setApp(core: PlanetCore | null): void {
  currentApp = core ?? undefined
}

export function hasApp(): boolean {
  return currentApp !== undefined
}

export function app(): PlanetCore {
  if (!currentApp) {
    throw new Error('No app is bound. Call setApp(core) once during bootstrap.')
  }
  return currentApp
}

export function config<T = unknown>(key: string): T
export function config<T>(key: string, defaultValue: T): T
export function config<T = unknown>(key: string, defaultValue?: T): T {
  if (defaultValue === undefined) {
    return app().config.get<T>(key)
  }
  return app().config.get<T>(key, defaultValue)
}

export function logger() {
  return app().logger
}

export function router(): Router {
  return app().router
}

export function abort(status: ContentfulStatusCode, message?: string): never {
  if (message === undefined) {
    throw new HTTPException(status)
  }
  throw new HTTPException(status, { message })
}

export function abortIf(condition: unknown, status: ContentfulStatusCode, message?: string): void {
  if (condition) {
    abort(status, message)
  }
}

export function abortUnless(
  condition: unknown,
  status: ContentfulStatusCode,
  message?: string
): void {
  if (!condition) {
    abort(status, message)
  }
}
