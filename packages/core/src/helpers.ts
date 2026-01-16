import { HttpException } from './exceptions/HttpException'
import type { ContentfulStatusCode } from './http/types'
import type { PlanetCore } from './PlanetCore'
import type { Router } from './Router'

export { Arr } from './helpers/Arr'
export * from './helpers/data'
export * from './helpers/errors'
export * from './helpers/response'
export { Str } from './helpers/Str'

/**
 * Error subclass used for dump and die functionality.
 * @internal
 */
export class DumpDieError extends Error {
  override name = 'DumpDieError'

  constructor(public readonly values: unknown[]) {
    super('Execution halted by dd()')
  }
}

/**
 * Options for dump output
 * @public
 */
export type DumpOptions = {
  depth?: number | null
  colors?: boolean
}

const defaultDumpOptions: Required<DumpOptions> = {
  depth: null,
  colors: true,
}

/**
 * Dump data to console for debugging.
 * @param values - Data to dump
 * @public
 */
export function dump(...values: unknown[]): void {
  for (const value of values) {
    console.dir(value, {
      depth: defaultDumpOptions.depth,
      colors: defaultDumpOptions.colors,
    })
  }
}

/**
 * Dump data to console and exit process (or throw in HTTP context).
 * @param values - Data to dump
 * @throws {DumpDieError}
 * @public
 */
export function dd(...values: unknown[]): never {
  dump(...values)
  throw new DumpDieError(values)
}

/**
 * Tap into a value, execute a callback, and return the value.
 * @param value - The value to tap
 * @param callback - The callback to execute with the value
 * @returns The original value
 * @public
 */
export function tap<T>(value: T, callback: (value: T) => unknown): T {
  callback(value)
  return value
}

/**
 * Return the default value of the given value.
 * @param valueOrFactory - The value or closure
 * @param args - Arguments to pass to the closure
 * @returns The resolved value
 * @public
 */
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

/**
 * Determine if the given value is "blank".
 * Blank values: null, undefined, false, empty string, empty array, empty object, whitespace-only string.
 * @param value - Value to check
 * @returns True if blank
 * @public
 */
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

/**
 * Determine if the given value is "filled" (not blank).
 * @param value - Value to check
 * @returns True if filled
 * @public
 */
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

/**
 * Throw an exception if the given condition is true.
 * @param condition - Boolean condition
 * @param error - Exception to throw (value or class constructor) or message string
 * @public
 */
export function throwIf(
  condition: unknown,
  error: Error | string | (() => Error) = 'Error.'
): void {
  if (condition) {
    throw toError(error)
  }
}

/**
 * Throw an exception unless the given condition is true.
 * @param condition - Boolean condition
 * @param error - Exception to throw (value or class constructor) or message string
 * @public
 */
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

/**
 * Get an environment variable.
 * @param key - Variable name
 * @param defaultValue - Default value if not found
 * @returns The environment variable value
 * @public
 */
export function env<TDefault = string | undefined>(key: string, defaultValue?: TDefault) {
  const bunEnv = (globalThis as EnvShape).Bun?.env
  const value = bunEnv?.[key] ?? process.env[key]
  return (value ?? defaultValue) as string | TDefault
}

let currentApp: PlanetCore | undefined

/**
 * Set the global application instance.
 * @param core - The PlanetCore instance
 * @internal
 */
export function setApp(core: PlanetCore | null): void {
  currentApp = core ?? undefined
}

/**
 * Check if the global application instance is set.
 * @returns True if set
 * @public
 */
export function hasApp(): boolean {
  return currentApp !== undefined
}

/**
 * Get the connection to the global application instance.
 * @returns The application instance
 * @throws {Error} If app is not initialized
 * @public
 */
export function app(): PlanetCore {
  if (!currentApp) {
    throw new Error('No app is bound. Call setApp(core) once during bootstrap.')
  }
  return currentApp
}

/**
 * Get a configuration value.
 * @param key - Config key (dot notation)
 * @param defaultValue - Default value
 * @returns Config value
 * @public
 */
export function config<T = unknown>(key: string): T
export function config<T>(key: string, defaultValue: T): T
export function config<T = unknown>(key: string, defaultValue?: T): T {
  if (defaultValue === undefined) {
    return app().config.get<T>(key)
  }
  return app().config.get<T>(key, defaultValue)
}

/**
 * Get the logger instance.
 * @public
 */
export function logger() {
  return app().logger
}

/**
 * Get the router instance.
 * @public
 */
export function router(): Router {
  return app().router
}

/**
 * Abort the request with an HTTP error.
 * @param status - HTTP status code
 * @param message - Error message
 * @throws {HttpException}
 * @public
 */
export function abort(status: ContentfulStatusCode, message?: string): never {
  if (message === undefined) {
    throw new HttpException(status)
  }
  throw new HttpException(status, { message })
}

/**
 * Abort if the condition is true.
 * @param condition - Boolean condition
 * @param status - HTTP status code
 * @param message - Error message
 * @public
 */
export function abortIf(condition: unknown, status: ContentfulStatusCode, message?: string): void {
  if (condition) {
    abort(status, message)
  }
}

/**
 * Abort unless the condition is true.
 * @param condition - Boolean condition
 * @param status - HTTP status code
 * @param message - Error message
 * @public
 */
export function abortUnless(
  condition: unknown,
  status: ContentfulStatusCode,
  message?: string
): void {
  if (!condition) {
    abort(status, message)
  }
}
