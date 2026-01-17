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
 *
 * Uses `console.dir` with configurable depth and colors to provide a
 * readable representation of any value.
 *
 * @param values - One or more values to dump to the console.
 *
 * @example
 * ```typescript
 * dump(user, { meta: 'data' });
 * ```
 *
 * @public
 * @since 3.0.0
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
 *
 * Short for "Dump and Die". In a CLI environment, it exits the process.
 * In an HTTP context (like a web request), it throws a `DumpDieError`
 * which is caught by the exception handler to display the debug output.
 *
 * @param values - One or more values to dump and then die.
 * @throws {DumpDieError} Always throws this error to halt execution.
 *
 * @example
 * ```typescript
 * dd(user.permissions);
 * ```
 *
 * @public
 * @since 3.0.0
 */
export function dd(...values: unknown[]): never {
  dump(...values)
  throw new DumpDieError(values)
}

/**
 * Tap into a value, execute a callback, and return the value.
 *
 * This allows you to perform "side effects" on a value without breaking
 * the chain of operations.
 *
 * @param value - The value to tap into.
 * @param callback - A callback that receives the value.
 * @returns The original value.
 *
 * @example
 * ```typescript
 * const user = tap(new User(), (u) => {
 *   u.name = 'Alice';
 *   u.save();
 * });
 * ```
 *
 * @public
 * @since 3.0.0
 */
export function tap<T>(value: T, callback: (value: T) => unknown): T {
  callback(value)
  return value
}

/**
 * Return the default value of the given value.
 *
 * If the value is a function, it will be executed with the provided arguments
 * and its result will be returned. Otherwise, the value itself is returned.
 * This is useful for handling optional lazy-loaded values.
 *
 * @param valueOrFactory - The value or a factory function.
 * @param args - Arguments to pass to the factory function if it is a function.
 * @returns The resolved value.
 *
 * @example
 * ```typescript
 * value(10); // 10
 * value(() => 10); // 10
 * value((name) => `Hello ${name}`, 'World'); // "Hello World"
 * ```
 *
 * @public
 * @since 3.0.0
 */
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
 *
 * A value is considered blank if it is:
 * - `null` or `undefined`
 * - An empty string or a string containing only whitespace
 * - An empty array
 * - An empty object
 * - An empty Map or Set
 *
 * @param value - The value to check.
 * @returns `true` if the value is blank, `false` otherwise.
 *
 * @example
 * ```typescript
 * blank(''); // true
 * blank('  '); // true
 * blank([]); // true
 * blank({}); // true
 * blank(0); // false
 * ```
 *
 * @public
 * @since 3.0.0
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
 *
 * This is the inverse of `blank()`.
 *
 * @param value - The value to check.
 * @returns `true` if the value is not blank, `false` otherwise.
 *
 * @example
 * ```typescript
 * filled('hello'); // true
 * filled([1, 2, 3]); // true
 * filled(''); // false
 * ```
 *
 * @public
 * @since 3.0.0
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
 *
 * @param condition - The condition to evaluate.
 * @param error - The exception to throw, a factory function, or an error message string.
 * @throws {Error} If the condition evaluates to true.
 *
 * @example
 * ```typescript
 * throwIf(user.isBanned, 'User is banned from the system');
 * throwIf(count > 100, () => new ValidationError('Too many items'));
 * ```
 *
 * @public
 * @since 3.0.0
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
 *
 * @param condition - The condition to evaluate.
 * @param error - The exception to throw, a factory function, or an error message string.
 * @throws {Error} If the condition evaluates to false.
 *
 * @example
 * ```typescript
 * throwUnless(user.isAdmin, 'Unauthorized access');
 * ```
 *
 * @public
 * @since 3.0.0
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
 * Get the value of an environment variable.
 *
 * Automatically detects the runtime environment (Bun or Node.js) to retrieve
 * the variable.
 *
 * @param key - The environment variable name.
 * @param defaultValue - An optional default value to return if the variable is not defined.
 * @returns The environment variable value or the default value.
 *
 * @example
 * ```typescript
 * const debug = env('DEBUG', 'false');
 * const apiKey = env('API_KEY');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export function env<TDefault = string | undefined>(key: string, defaultValue?: TDefault) {
  const bunEnv = (globalThis as EnvShape).Bun?.env
  const value = bunEnv?.[key] ?? process.env[key]
  return (value ?? defaultValue) as string | TDefault
}

let currentApp: PlanetCore | undefined

/**
 * Set the global application instance.
 *
 * This is used internally during the bootstrap process to provide global
 * access to the application instance via the `app()` helper.
 *
 * @param core - The PlanetCore instance to set as global.
 * @internal
 */
export function setApp(core: PlanetCore | null): void {
  currentApp = core ?? undefined
}

/**
 * Check if the global application instance has been initialized and set.
 *
 * @returns `true` if the application instance is set, `false` otherwise.
 *
 * @public
 * @since 3.0.0
 */
export function hasApp(): boolean {
  return currentApp !== undefined
}

/**
 * Get the global application instance.
 *
 * Provides access to the core application container, configuration, and services.
 *
 * @returns The initialized PlanetCore instance.
 * @throws {Error} If the application has not been initialized.
 *
 * @example
 * ```typescript
 * const core = app();
 * console.log(core.version);
 * ```
 *
 * @public
 * @since 3.0.0
 */
export function app(): PlanetCore {
  if (!currentApp) {
    throw new Error('No app is bound. Call setApp(core) once during bootstrap.')
  }
  return currentApp
}

/**
 * Get a configuration value from the application.
 *
 * Supports dot notation for accessing nested configuration properties.
 *
 * @param key - The configuration key in dot notation (e.g., 'app.name').
 * @param defaultValue - An optional default value to return if the key is not found.
 * @returns The configuration value or the default value.
 *
 * @example
 * ```typescript
 * const appName = config('app.name');
 * const port = config('app.port', 3000);
 * ```
 *
 * @public
 * @since 3.0.0
 */
export function config<T = unknown>(key: string, defaultValue?: T): T {
  if (defaultValue === undefined) {
    return app().config.get<T>(key)
  }
  return app().config.get<T>(key, defaultValue)
}

/**
 * Get the global logger instance.
 *
 * Shortcut for `app().logger`.
 *
 * @returns The application's logger instance.
 *
 * @example
 * ```typescript
 * logger().info('Operation completed successfully');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export function logger() {
  return app().logger
}

/**
 * Get the application's primary router instance.
 *
 * Shortcut for `app().router`.
 *
 * @returns The router instance.
 *
 * @public
 * @since 3.0.0
 */
export function router(): Router {
  return app().router
}

/**
 * Abort the current request with an HTTP exception.
 *
 * Throws an `HttpException` with the specified status code and optional message.
 *
 * @param status - The HTTP status code to return.
 * @param message - An optional custom error message.
 * @throws {HttpException} Always throws this exception.
 *
 * @example
 * ```typescript
 * abort(403, 'You do not have permission to access this resource');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export function abort(status: ContentfulStatusCode, message?: string): never {
  if (message === undefined) {
    throw new HttpException(status)
  }
  throw new HttpException(status, { message })
}

/**
 * Abort the request if the given condition is true.
 *
 * @param condition - The condition to evaluate.
 * @param status - The HTTP status code to return.
 * @param message - An optional custom error message.
 * @throws {HttpException} If the condition is true.
 *
 * @example
 * ```typescript
 * abortIf(!user.isActive, 403, 'Account is deactivated');
 * ```
 *
 * @public
 * @since 3.0.0
 */
export function abortIf(condition: unknown, status: ContentfulStatusCode, message?: string): void {
  if (condition) {
    abort(status, message)
  }
}

/**
 * Abort the request unless the given condition is true.
 *
 * @param condition - The condition to evaluate.
 * @param status - The HTTP status code to return.
 * @param message - An optional custom error message.
 * @throws {HttpException} If the condition is false.
 *
 * @example
 * ```typescript
 * abortUnless(request.hasValidToken(), 401, 'Invalid authentication token');
 * ```
 *
 * @public
 * @since 3.0.0
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
